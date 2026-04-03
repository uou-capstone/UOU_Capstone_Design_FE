import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { lectureAiLegacyStreamApi } from "../services/api";

export type AssistantPhase =
  | "idle"
  | "streaming"
  | "await_next_page"
  | "followup_after_no"
  | "await_explain_confirm";

export interface LectureAssistantChatMessage {
  id: number;
  isUser: boolean;
  text?: string;
  markdown?: string;
  isLoading?: boolean;
  file?: File;
  roleBadge?: string;
  assistantVariant?: "educational" | "orchestrator" | "system";
  thoughtSummary?: string;
  thoughtExpanded?: boolean;
  thoughtFinished?: boolean;
  /** 스트리밍 중 — SSE/모델 청크를 받는 즉시 마크다운에 반영 */
  streamingMarkdown?: boolean;
  actionButtons?: {
    id: string;
    label: string;
    variant?: "primary" | "muted";
  }[];
}

/** PDF 툴바로 빠르게 넘김 판별 (문서 6-3) */
const SKIM_DEBOUNCE_MS = 1000;
/** 「아니오」 후 무반응 시 「다음 페이지로 넘어갈까요?」 재진입 (문서 4) */
const IDLE_AFTER_NO_MS = 10000;

export function useLectureAssistantChat(options: {
  enabled: boolean;
  lectureId: number | null;
  materialId: number | null;
  currentPdfPage: number | null;
  goToPdfPage: (page: number) => void;
  /** 사용자가 PDF 툴바/스와이프로 바꾼 뒤의 (page, at) — at이 바뀔 때마다 디바운스 처리 */
  userPdfNav: { page: number; at: number } | null;
}) {
  const {
    enabled,
    lectureId,
    materialId,
    currentPdfPage,
    goToPdfPage,
    userPdfNav,
  } = options;

  const [messages, setMessages] = useState<LectureAssistantChatMessage[]>([]);
  const [phase, setPhase] = useState<AssistantPhase>("idle");
  const [busy, setBusy] = useState(false);

  const streamingRef = useRef(false);
  const abortRef = useRef<(() => void) | null>(null);
  const pendingPageAfterStreamRef = useRef<number | null>(null);
  const pendingExplainPageRef = useRef<number | null>(null);
  const skimTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skimTargetRef = useRef<number | null>(null);
  const nudgedAfterNoRef = useRef(false);
  const idleAfterNoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phaseRef = useRef<AssistantPhase>("idle");
  /** Legacy `stream/initialize`는 세션당 1회만 — 이후 페이지·설명은 `next`만 사용 */
  const lectureLegacySessionInitializedRef = useRef(false);
  /** SSE `next`가 `waitingForAnswer`일 때만 — 그때는 `answer(aiQuestionId)` 후 `next` */
  const pendingAiQuestionIdRef = useRef<string | null>(null);
  const messageIdRef = useRef(0);
  const nextMessageId = useCallback(() => {
    messageIdRef.current += 1;
    return messageIdRef.current;
  }, []);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    lectureLegacySessionInitializedRef.current = false;
    pendingAiQuestionIdRef.current = null;
  }, [lectureId, materialId]);

  const clearIdleAfterNoTimer = useCallback(() => {
    if (idleAfterNoTimerRef.current) {
      clearTimeout(idleAfterNoTimerRef.current);
      idleAfterNoTimerRef.current = null;
    }
  }, []);

  const appendOrchestrator = useCallback(
    (
      text: string,
      buttons: { id: string; label: string; variant?: "primary" | "muted" }[],
    ) => {
      setMessages((prev) => [
        ...prev,
        {
          id: nextMessageId(),
          isUser: false,
          roleBadge: "ORCHESTRATOR",
          assistantVariant: "orchestrator",
          text,
          actionButtons: buttons,
        },
      ]);
    },
    [nextMessageId],
  );

  const appendSystem = useCallback(
    (text: string) => {
      setMessages((prev) => [
        ...prev,
        {
          id: nextMessageId(),
          isUser: false,
          roleBadge: "SYSTEM",
          assistantVariant: "system",
          text,
        },
      ]);
    },
    [nextMessageId],
  );

  const appendUserFile = useCallback(
    (file: File) => {
      setMessages((prev) => [
        ...prev,
        {
          id: nextMessageId(),
          isUser: true,
          file,
          text: file.name,
        },
      ]);
    },
    [nextMessageId],
  );

  const appendAssistantNotice = useCallback(
    (text: string) => {
      setMessages((prev) => [
        ...prev,
        {
          id: nextMessageId(),
          isUser: false,
          text,
        },
      ]);
    },
    [nextMessageId],
  );

  const toggleThoughtExpanded = useCallback((messageId: number) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? { ...m, thoughtExpanded: !m.thoughtExpanded }
          : m,
      ),
    );
  }, []);

  const addNextPagePrompt = useCallback(() => {
    setPhase("await_next_page");
    appendOrchestrator("다음 페이지로 넘어갈까요?", [
      { id: "assistant_next_yes", label: "예", variant: "primary" },
      { id: "assistant_next_no", label: "아니오", variant: "muted" },
    ]);
  }, [appendOrchestrator]);

  const finishStreamAndContinue = useCallback(() => {
    streamingRef.current = false;
    abortRef.current = null;
    setBusy(false);
    const pend = pendingPageAfterStreamRef.current;
    pendingPageAfterStreamRef.current = null;
    if (pend != null) {
      setPhase("await_explain_confirm");
      pendingExplainPageRef.current = pend;
      appendOrchestrator("해당 페이지에 대해서 설명할까요?", [
        { id: "assistant_explain_yes", label: "예", variant: "primary" },
        { id: "assistant_explain_no", label: "아니오", variant: "muted" },
      ]);
      return;
    }
    addNextPagePrompt();
  }, [addNextPagePrompt, appendOrchestrator]);

  const runStream = useCallback(
    (opts: { page: number; userMessage?: string | null }) => {
      if (!enabled || !lectureId || !materialId) return;
      if (streamingRef.current) return;

      clearIdleAfterNoTimer();
      nudgedAfterNoRef.current = false;
      streamingRef.current = true;
      setBusy(true);
      setPhase("streaming");

      const thoughtId = nextMessageId();
      const answerId = nextMessageId();
      let cancelled = false;
      let answerStarted = false;
      let answerBuf = "";

      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

      setMessages((prev) => [
        ...prev,
        {
          id: thoughtId,
          isUser: false,
          roleBadge: "강의 보조",
          assistantVariant: "orchestrator",
          text: "사고 요약",
          thoughtSummary: "",
          thoughtExpanded: true,
          thoughtFinished: false,
          isLoading: true,
        },
      ]);

      abortRef.current?.();
      const streamAbort = new AbortController();
      abortRef.current = () => {
        cancelled = true;
        streamAbort.abort();
        lectureLegacySessionInitializedRef.current = false;
        void lectureAiLegacyStreamApi.cancel(lectureId).catch(() => {});
      };

      const finalizeThoughtRow = () => {
        setMessages((p) =>
          p.map((m) =>
            m.id === thoughtId
              ? {
                  ...m,
                  isLoading: false,
                  thoughtFinished: true,
                  thoughtExpanded: false,
                  thoughtSummary: m.thoughtSummary || "",
                }
              : m,
          ),
        );
      };

      /** Gemini thinking / SSE `thought` 구간 — 토글 안에서 스트리밍 (문서 7.1) */
      const appendThoughtDelta = (chunk: string) => {
        if (cancelled || !chunk) return;
        flushSync(() => {
          setMessages((p) =>
            p.map((m) =>
              m.id === thoughtId
                ? {
                    ...m,
                    isLoading: false,
                    thoughtExpanded: true,
                    thoughtFinished: false,
                    thoughtSummary: (m.thoughtSummary ?? "") + chunk,
                  }
                : m,
            ),
          );
        });
      };

      /** 본문: SSE/모델 스트림 청크마다 즉시 UI 반영 (문서 7·Gemini 스트리밍과 동일한 UX) */
      const appendDeltaLive = (chunk: string) => {
        if (cancelled || !chunk) return;
        if (!answerStarted) {
          answerStarted = true;
          flushSync(() => {
            finalizeThoughtRow();
          });
          answerBuf = chunk;
          flushSync(() => {
            setMessages((p) => [
              ...p,
              {
                id: answerId,
                isUser: false,
                assistantVariant: "educational",
                markdown: chunk,
                streamingMarkdown: true,
              },
            ]);
          });
          return;
        }
        answerBuf += chunk;
        setMessages((p) =>
          p.map((m) =>
            m.id === answerId
              ? { ...m, markdown: answerBuf, streamingMarkdown: true }
              : m,
          ),
        );
      };

      void (async () => {
        const page = opts.page;
        const userMsg = opts.userMessage?.trim() ?? "";
        const isFollowup = userMsg.length > 0;
        /** 첫 `next` 한 번만(재시도·PROCESSING 루프와 무관) 사용자 메시지를 실어 보냄 */
        let attachUserToNext = isFollowup;

        try {
          if (!isFollowup) {
            pendingAiQuestionIdRef.current = null;
            if (!lectureLegacySessionInitializedRef.current) {
              await lectureAiLegacyStreamApi.initialize(lectureId, {
                pageNumber: page,
                materialId,
              });
              lectureLegacySessionInitializedRef.current = true;
            }
          } else {
            const structuredQ = pendingAiQuestionIdRef.current;
            if (structuredQ) {
              try {
                await lectureAiLegacyStreamApi.answer(lectureId, {
                  aiQuestionId: structuredQ,
                  answer: userMsg,
                });
                pendingAiQuestionIdRef.current = null;
                attachUserToNext = false;
              } catch {
                await lectureAiLegacyStreamApi.initialize(lectureId, {
                  pageNumber: page,
                  materialId,
                });
                lectureLegacySessionInitializedRef.current = true;
              }
            }
            /** else: orchestrator/자유 질문 — `answer(user-followup)` 없이 `next(userMessage)` 한 번만 */
          }

          const maxRounds = 96;
          let rounds = 0;
          while (rounds < maxRounds && !cancelled) {
            rounds += 1;
            const useUser = attachUserToNext;
            if (attachUserToNext) attachUserToNext = false;

            const res = await lectureAiLegacyStreamApi.next(lectureId, {
              pageNumber: page,
              materialId,
              ...(useUser ? { userMessage: userMsg } : {}),
              signal: streamAbort.signal,
              onThoughtDelta: appendThoughtDelta,
              onDelta: appendDeltaLive,
            });

            const st = (res.status || "").toUpperCase();
            if (st === "PROCESSING") {
              await sleep(2000);
              continue;
            }
            if (res.contentData?.trim() && !answerBuf.trim()) {
              appendDeltaLive(res.contentData);
            }
            if (!res.hasMore || st === "COMPLETED" || st === "DONE") {
              if (!res.waitingForAnswer) pendingAiQuestionIdRef.current = null;
              break;
            }
            if (res.waitingForAnswer) {
              if (res.aiQuestionId)
                pendingAiQuestionIdRef.current = res.aiQuestionId;
              break;
            }
          }

          if (!cancelled) {
            finalizeThoughtRow();
            if (answerStarted) {
              setMessages((p) =>
                p.map((m) =>
                  m.id === answerId
                    ? {
                        ...m,
                        markdown: answerBuf,
                        streamingMarkdown: false,
                      }
                    : m,
                ),
              );
            }
            finishStreamAndContinue();
          } else {
            streamingRef.current = false;
            setBusy(false);
            abortRef.current = null;
          }
        } catch (err) {
          streamingRef.current = false;
          abortRef.current = null;
          setBusy(false);
          if (
            cancelled ||
            (err instanceof Error && err.name === "AbortError")
          ) {
            setMessages((p) =>
              p.map((m) =>
                m.id === thoughtId
                  ? { ...m, isLoading: false }
                  : m.id === answerId
                    ? { ...m, streamingMarkdown: false }
                    : m,
              ),
            );
            setPhase("idle");
            return;
          }
          const msg =
            err instanceof Error ? err.message : "강의 보조 요청 실패";
          setMessages((p) => [
            ...p
              .filter((m) => !(m.id === thoughtId && m.isLoading))
              .map((m) =>
                m.id === answerId ? { ...m, streamingMarkdown: false } : m,
              ),
            {
              id: nextMessageId(),
              isUser: false,
              assistantVariant: "system",
              text:
                `오류: ${msg}\n\n` +
                "강의 AI Legacy API를 확인해 주세요: " +
                "POST .../stream/initialize, POST .../stream/next (SSE), .../stream/answer " +
                "(필요 시 GET .../stream/session)",
            },
          ]);
          setPhase("idle");
        }
      })();
    },
    [
      enabled,
      lectureId,
      materialId,
      nextMessageId,
      clearIdleAfterNoTimer,
      finishStreamAndContinue,
    ],
  );

  const beginExplainCurrentPage = useCallback(() => {
    const page = currentPdfPage ?? 1;
    runStream({ page });
  }, [currentPdfPage, runStream]);

  useEffect(() => {
    if (!enabled) {
      setMessages([]);
      setPhase("idle");
      setBusy(false);
      streamingRef.current = false;
      lectureLegacySessionInitializedRef.current = false;
      pendingAiQuestionIdRef.current = null;
      messageIdRef.current = 0;
      abortRef.current?.();
      abortRef.current = null;
      pendingPageAfterStreamRef.current = null;
      pendingExplainPageRef.current = null;
      clearIdleAfterNoTimer();
      if (skimTimerRef.current) {
        clearTimeout(skimTimerRef.current);
        skimTimerRef.current = null;
      }
    }
  }, [enabled, lectureId, materialId, clearIdleAfterNoTimer]);

  useEffect(() => {
    if (!enabled || !userPdfNav) return;

    if (skimTimerRef.current) clearTimeout(skimTimerRef.current);
    skimTargetRef.current = userPdfNav.page;
    skimTimerRef.current = setTimeout(() => {
      skimTimerRef.current = null;
      const settled = skimTargetRef.current;
      if (settled == null) return;

      if (streamingRef.current) {
        pendingPageAfterStreamRef.current = settled;
        return;
      }

      const ph = phaseRef.current;
      /** 오케스트레이터가 「다음 페이지」 버튼을 기다리는 중에는 PDF 스킴으로 끼어들지 않음 */
      if (ph === "await_next_page") {
        return;
      }
      if (ph === "await_explain_confirm") {
        pendingExplainPageRef.current = settled;
        return;
      }

      setPhase("await_explain_confirm");
      pendingExplainPageRef.current = settled;
      appendOrchestrator("현재 페이지에 대해서 설명할까요?", [
        { id: "assistant_explain_yes", label: "예", variant: "primary" },
        { id: "assistant_explain_no", label: "아니오", variant: "muted" },
      ]);
    }, SKIM_DEBOUNCE_MS);

    return () => {
      if (skimTimerRef.current) {
        clearTimeout(skimTimerRef.current);
        skimTimerRef.current = null;
      }
    };
  }, [enabled, userPdfNav, appendOrchestrator]);

  useEffect(() => {
    if (!enabled || phase !== "followup_after_no") return;
    nudgedAfterNoRef.current = false;
    clearIdleAfterNoTimer();
    idleAfterNoTimerRef.current = setTimeout(() => {
      idleAfterNoTimerRef.current = null;
      if (phaseRef.current !== "followup_after_no") return;
      if (nudgedAfterNoRef.current) return;
      nudgedAfterNoRef.current = true;
      appendOrchestrator("다음 페이지로 넘어갈까요?", [
        { id: "assistant_next_yes", label: "예", variant: "primary" },
        { id: "assistant_next_no", label: "아니오", variant: "muted" },
      ]);
      setPhase("await_next_page");
    }, IDLE_AFTER_NO_MS);
    return () => clearIdleAfterNoTimer();
  }, [enabled, phase, appendOrchestrator, clearIdleAfterNoTimer]);

  const handleAction = useCallback(
    (actionId: string) => {
      const page = currentPdfPage ?? 1;

      if (actionId === "assistant_next_yes") {
        clearIdleAfterNoTimer();
        goToPdfPage(page + 1);
        setPhase("streaming");
        runStream({ page: page + 1 });
        return;
      }
      if (actionId === "assistant_next_no") {
        clearIdleAfterNoTimer();
        setPhase("followup_after_no");
        appendOrchestrator("궁금한 점이 있으면 채팅으로 질문해 주세요.", []);
        return;
      }
      if (actionId === "assistant_explain_yes") {
        const target = pendingExplainPageRef.current ?? page;
        pendingExplainPageRef.current = null;
        runStream({ page: target });
        return;
      }
      if (actionId === "assistant_explain_no") {
        pendingExplainPageRef.current = null;
        setPhase("idle");
        appendSystem("알겠습니다. 필요할 때 다시 말씀해 주세요.");
        return;
      }
    },
    [
      appendOrchestrator,
      appendSystem,
      clearIdleAfterNoTimer,
      currentPdfPage,
      goToPdfPage,
      runStream,
    ],
  );

  const submitUserText = useCallback(
    (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed) return;
      clearIdleAfterNoTimer();
      nudgedAfterNoRef.current = true;
      setMessages((p) => [
        ...p,
        { id: nextMessageId(), isUser: true, text: trimmed },
      ]);
      const page = currentPdfPage ?? 1;
      setPhase("streaming");
      runStream({ page, userMessage: trimmed });
    },
    [clearIdleAfterNoTimer, currentPdfPage, nextMessageId, runStream],
  );

  const onEmptySubmit = useCallback(() => {
    if (!enabled || !lectureId || !materialId) return;
    if (streamingRef.current) return;
    if (phase === "await_next_page" || phase === "await_explain_confirm") return;
    if (phase === "followup_after_no") return;
    if (messages.length === 0 || phase === "idle") {
      beginExplainCurrentPage();
    }
  }, [
    beginExplainCurrentPage,
    enabled,
    lectureId,
    materialId,
    messages.length,
    phase,
  ]);

  const stop = useCallback(() => {
    abortRef.current?.();
    abortRef.current = null;
    streamingRef.current = false;
    setBusy(false);
    setMessages((p) => p.filter((m) => !m.isLoading));
    setPhase("idle");
    appendSystem("생성을 중단했습니다.");
  }, [appendSystem]);

  return {
    messages,
    phase,
    beginExplainCurrentPage,
    submitUserText,
    onEmptySubmit,
    handleAction,
    stop,
    busy,
    appendUserFile,
    appendAssistantNotice,
    toggleThoughtExpanded,
  };
}
