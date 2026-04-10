import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import {
  integratedLearningApi,
  parseIntegratedLearningQuizOverlayFromMessageTail,
  type IntegratedLearningMessage,
  type IntegratedQuizOverlayModel,
} from "../services/api";

const STREAM_REVEAL_INTERVAL_MS = 42;
const STREAM_REVEAL_CHARS_PER_TICK = 14;
const INTEGRATED_WELCOME_TEXT_RE =
  /학습\s*세션에\s*오신\s*것을\s*환영합니다|학습\s*세션에\s*오신것을\s*환영합니다/;
const INTEGRATED_QUIZ_REQUEST_RE =
  /(퀴즈|quiz|문제\s*만들|문제\s*내|시험\s*만들|시험\s*내)/i;

export interface IntegratedChatMessage {
  id: number;
  isUser: boolean;
  text?: string;
  markdown?: string;
  isLoading?: boolean;
  roleBadge?: string;
  assistantVariant?: "educational" | "orchestrator" | "system";
  streamingMarkdown?: boolean;
  thoughtSummary?: string;
  thoughtExpanded?: boolean;
  thoughtFinished?: boolean;
  file?: File;
  actionButtons?: {
    id: string;
    label: string;
    variant?: "primary" | "muted";
  }[];
  /** 구조화 퀴즈가 있을 때 채팅에서 오버레이를 다시 열 수 있는 버튼 */
  integratedQuizOpenButton?: boolean;
}

export function useIntegratedLearningChat(options: {
  enabled: boolean;
  lectureId: number | null;
  currentPage?: number | null;
}) {
  const { enabled, lectureId, currentPage } = options;
  const [messages, setMessages] = useState<IntegratedChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [quizOverlayModel, setQuizOverlayModel] =
    useState<IntegratedQuizOverlayModel | null>(null);
  const [quizOverlayOpen, setQuizOverlayOpen] = useState(false);
  const lastRequestedQuizTypeRef = useRef<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const messageIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const nextMessageId = useCallback(() => {
    messageIdRef.current += 1;
    return messageIdRef.current;
  }, []);

  const dismissQuizOverlay = useCallback(() => {
    setQuizOverlayOpen(false);
  }, []);

  const openQuizOverlay = useCallback(() => {
    if (quizOverlayModel) setQuizOverlayOpen(true);
  }, [quizOverlayModel]);

  const ensureSession = useCallback(async (): Promise<string> => {
    if (!lectureId) throw new Error("강의를 먼저 선택해 주세요.");
    if (sessionIdRef.current) return sessionIdRef.current;
    const opened = await integratedLearningApi.openSession(lectureId);
    sessionIdRef.current = opened.sessionId;
    return opened.sessionId;
  }, [lectureId]);

  const appendAgentMessages = useCallback(
    (
      events: IntegratedLearningMessage[],
      options?: { suppressWelcomeText?: boolean },
    ) => {
      const suppressWelcomeText = options?.suppressWelcomeText ?? false;
      let skippedOnlyWelcome = false;
      const visible = events.filter((e) => {
        if (e.type === "heartbeat") return false;
        if (
          suppressWelcomeText &&
          INTEGRATED_WELCOME_TEXT_RE.test(e.text.trim())
        ) {
          skippedOnlyWelcome = true;
          return false;
        }
        if (e.type === "done") return e.text.trim().length > 0;
        if (e.type === "error") return true;
        return e.text.trim().length > 0;
      });
      if (visible.length === 0) {
        if (skippedOnlyWelcome) return;
        setMessages((prev) => [
          ...prev,
          {
            id: nextMessageId(),
            isUser: false,
            assistantVariant: "system",
            text: "응답이 비어 있습니다. 다시 시도해 주세요.",
          },
        ]);
        return;
      }
      setMessages((prev) => [
        ...prev,
        ...visible.map(
          (e): IntegratedChatMessage => ({
            id: nextMessageId(),
            isUser: false,
            assistantVariant: e.type === "error" ? "system" : "orchestrator",
            roleBadge: e.type === "error" ? "SYSTEM" : "통합학습",
            markdown: e.text,
            integratedQuizOpenButton: e.integratedQuizOpenButton === true,
          }),
        ),
      ]);
    },
    [nextMessageId],
  );

  const appendQuizTypePicker = useCallback(() => {
    setMessages((prev) => [
      ...prev,
      {
        id: nextMessageId(),
        isUser: false,
        roleBadge: "통합학습",
        assistantVariant: "orchestrator",
        text: "퀴즈 유형을 선택해 주세요.",
        actionButtons: [
          { id: "quiz_type_flash_card", label: "플래시카드", variant: "primary" },
          { id: "quiz_type_ox_problem", label: "OX 문제", variant: "muted" },
          { id: "quiz_type_five_choice", label: "5지선다", variant: "muted" },
          { id: "quiz_type_short_answer", label: "단답/서술형", variant: "muted" },
        ],
      },
    ]);
  }, [nextMessageId]);

  const appendDecisionWidget = useCallback(
    (widget: string) => {
      if (widget === "START_EXPLANATION_DECISION") {
        setMessages((prev) => [
          ...prev,
          {
            id: nextMessageId(),
            isUser: false,
            roleBadge: "통합학습",
            assistantVariant: "orchestrator",
            text: "현재 페이지 설명을 시작할까요?",
            actionButtons: [
              { id: "start_explanation_accept", label: "설명 시작", variant: "primary" },
              { id: "start_explanation_reject", label: "나중에", variant: "muted" },
            ],
          },
        ]);
        return;
      }
      if (widget === "QUIZ_DECISION") {
        setMessages((prev) => [
          ...prev,
          {
            id: nextMessageId(),
            isUser: false,
            roleBadge: "통합학습",
            assistantVariant: "orchestrator",
            text: "이 페이지 내용을 퀴즈로 확인할까요?",
            actionButtons: [
              { id: "quiz_decision_accept", label: "퀴즈 진행", variant: "primary" },
              { id: "quiz_decision_reject", label: "건너뛰기", variant: "muted" },
            ],
          },
        ]);
        return;
      }
      if (widget === "NEXT_PAGE_DECISION") {
        setMessages((prev) => [
          ...prev,
          {
            id: nextMessageId(),
            isUser: false,
            roleBadge: "통합학습",
            assistantVariant: "orchestrator",
            text: "다음 페이지로 넘어갈까요?",
            actionButtons: [
              { id: "next_page_accept", label: "다음 페이지", variant: "primary" },
              { id: "next_page_reject", label: "현재 페이지 유지", variant: "muted" },
            ],
          },
        ]);
        return;
      }
      if (widget === "REVIEW_DECISION") {
        setMessages((prev) => [
          ...prev,
          {
            id: nextMessageId(),
            isUser: false,
            roleBadge: "통합학습",
            assistantVariant: "orchestrator",
            text: "복습 모드로 진행할까요?",
            actionButtons: [
              { id: "review_accept", label: "복습 시작", variant: "primary" },
              { id: "review_reject", label: "건너뛰기", variant: "muted" },
            ],
          },
        ]);
        return;
      }
      if (widget === "RETEST_DECISION") {
        setMessages((prev) => [
          ...prev,
          {
            id: nextMessageId(),
            isUser: false,
            roleBadge: "통합학습",
            assistantVariant: "orchestrator",
            text: "재시험을 진행할까요?",
            actionButtons: [
              { id: "retest_accept", label: "재시험 시작", variant: "primary" },
              { id: "retest_reject", label: "건너뛰기", variant: "muted" },
            ],
          },
        ]);
      }
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

  const runStreamingAgentTurn = useCallback(
    async (
      eventType: string,
      payload: Record<string, unknown>,
    ): Promise<void> => {
      if (!lectureId || !enabled) return;
      const sessionId = await ensureSession();

      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      let cancelled = false;
      ac.signal.addEventListener("abort", () => {
        cancelled = true;
      });

      let answerMessageId: number | null = null;
      let answerBuf = "";
      let answerPending = "";
      let answerRenderTimer: number | null = null;
      let streamCompleted = false;
      let drainResolver: (() => void) | null = null;
      let streamError: string | null = null;
      let gotThought = false;
      let gotBody = false;

      const notifyDrainIfDone = () => {
        if (
          streamCompleted &&
          answerPending.length === 0 &&
          answerRenderTimer == null &&
          drainResolver
        ) {
          const resolve = drainResolver;
          drainResolver = null;
          resolve();
        }
      };

      const stopAnswerRenderLoop = () => {
        if (answerRenderTimer != null) {
          window.clearInterval(answerRenderTimer);
          answerRenderTimer = null;
        }
        notifyDrainIfDone();
      };

      const startAnswerRenderLoop = () => {
        if (answerRenderTimer != null) return;
        answerRenderTimer = window.setInterval(() => {
          if (cancelled || answerMessageId == null) {
            stopAnswerRenderLoop();
            return;
          }
          if (answerPending.length === 0) {
            if (streamCompleted) {
              stopAnswerRenderLoop();
            }
            return;
          }
          const take = Math.min(
            STREAM_REVEAL_CHARS_PER_TICK,
            answerPending.length,
          );
          const delta = answerPending.slice(0, take);
          answerPending = answerPending.slice(take);
          answerBuf += delta;
          setMessages((p) =>
            p.map((m) =>
              m.id === answerMessageId
                ? { ...m, markdown: answerBuf, streamingMarkdown: true }
                : m,
            ),
          );
          if (answerPending.length === 0 && streamCompleted) {
            stopAnswerRenderLoop();
          }
        }, STREAM_REVEAL_INTERVAL_MS);
      };

      const waitForRenderedDrain = async () => {
        if (answerPending.length === 0 && answerRenderTimer == null) return;
        await new Promise<void>((resolve) => {
          drainResolver = resolve;
        });
      };

      const finalizeThought = () => {};

      try {
        const tail = await integratedLearningApi.sendEvent(
          lectureId,
          sessionId,
          eventType,
          payload,
          {
            signal: ac.signal,
            onThoughtDelta: (chunk) => {
              if (cancelled || !chunk) return;
              gotThought = true;
            },
            onAgentDelta: (chunk) => {
              if (cancelled || !chunk) return;
              gotBody = true;
              if (answerMessageId == null) {
                answerMessageId = nextMessageId();
                answerBuf = "";
                answerPending += chunk;
                flushSync(() => {
                  setMessages((p) => [
                    ...p,
                    {
                      id: answerMessageId!,
                      isUser: false,
                      roleBadge: "통합학습",
                      assistantVariant: "educational",
                      markdown: "",
                      streamingMarkdown: true,
                    },
                  ]);
                });
                startAnswerRenderLoop();
              } else {
                answerPending += chunk;
                startAnswerRenderLoop();
              }
            },
            onError: (msg) => {
              streamError = msg;
            },
          },
          { page: currentPage ?? undefined },
        );

        if (cancelled) return;

        streamCompleted = true;
        notifyDrainIfDone();
        await waitForRenderedDrain();

        const hasQuizPickerModal = tail.some((ev) => {
          const raw = ev.raw as Record<string, unknown> | undefined;
          const data =
            raw?.data != null && typeof raw.data === "object"
              ? (raw.data as Record<string, unknown>)
              : null;
          const ui =
            data?.ui != null && typeof data.ui === "object"
              ? (data.ui as Record<string, unknown>)
              : null;
          return ui?.modal === "QUIZ_TYPE_PICKER";
        });

        if (gotBody && answerMessageId != null) {
          const overlay = parseIntegratedLearningQuizOverlayFromMessageTail(tail);
          const streamText = answerBuf.trim();
          const finalMarkdown = overlay ? streamText : answerBuf;
          if (hasQuizPickerModal) {
            // 타입 선택 모달이 뜨는 단계에서는 줄글 본문을 숨기고 버튼 UI에 집중한다.
            setMessages((p) => p.filter((m) => m.id !== answerMessageId));
          } else {
            setMessages((p) =>
              p.map((m) =>
                m.id === answerMessageId
                  ? {
                      ...m,
                      markdown: finalMarkdown,
                      streamingMarkdown: false,
                      integratedQuizOpenButton: Boolean(overlay),
                    }
                  : m,
              ),
            );
          }
        }

        const overlayFromTail =
          parseIntegratedLearningQuizOverlayFromMessageTail(tail);
        if (overlayFromTail) {
          setQuizOverlayModel(overlayFromTail);
          setQuizOverlayOpen(true);
        }

        // 퀴즈 타입 전달/생성 품질 진단 로그:
        // - done.data.quiz_type 과 첫 문항 구조를 빠르게 확인
        // - FE에서 선택한 유형과 다르면 즉시 SYSTEM 경고
        const quizDoneRaw = [...tail]
          .reverse()
          .map((ev) => ev.raw)
          .find((raw) => {
            if (!raw || typeof raw !== "object") return false;
            const event = raw as Record<string, unknown>;
            const type = String(event.type ?? "").toLowerCase();
            if (type !== "done") return false;
            const data =
              event.data != null && typeof event.data === "object"
                ? (event.data as Record<string, unknown>)
                : null;
            return Boolean(data && (data.quiz != null || data.quiz_type != null));
          }) as Record<string, unknown> | undefined;
        if (quizDoneRaw) {
          const data =
            quizDoneRaw.data != null && typeof quizDoneRaw.data === "object"
              ? (quizDoneRaw.data as Record<string, unknown>)
              : {};
          const doneQuizType = String(data.quiz_type ?? data.quizType ?? "").trim();
          const quizPayload = data.quiz;
          let firstItemKeys: string[] = [];
          if (Array.isArray(quizPayload) && quizPayload.length > 0) {
            const first = quizPayload[0];
            if (first && typeof first === "object" && !Array.isArray(first)) {
              firstItemKeys = Object.keys(first as Record<string, unknown>).slice(0, 8);
            }
          }
          // 개발 중 빠른 원인 분리를 위한 콘솔 로그
          console.info("[integrated-quiz-done]", {
            requestedQuizType: lastRequestedQuizTypeRef.current,
            doneQuizType,
            firstItemKeys,
          });

          const requested = lastRequestedQuizTypeRef.current;
          if (
            requested &&
            doneQuizType &&
            requested.toLowerCase() !== doneQuizType.toLowerCase()
          ) {
            setMessages((prev) => [
              ...prev,
              {
                id: nextMessageId(),
                isUser: false,
                assistantVariant: "system",
                roleBadge: "SYSTEM",
                text: `선택한 유형(${requested})과 생성 결과 유형(${doneQuizType})이 다릅니다. 이벤트 전달/매핑 경로를 확인해 주세요.`,
              },
            ]);
          }
          // 한 번 결과를 받으면 진단 기준값 초기화
          lastRequestedQuizTypeRef.current = null;
        }

        if (!gotBody && !gotThought) {
          appendAgentMessages(tail, {
            suppressWelcomeText: eventType === "SESSION_ENTERED",
          });
        } else if (streamError) {
          const errText = streamError;
          setMessages((prev) => [
            ...prev,
            {
              id: nextMessageId(),
              isUser: false,
              assistantVariant: "system" as const,
              roleBadge: "SYSTEM",
              text: errText,
            },
          ]);
        } else {
          const errEv = tail.find((m) => m.type === "error");
          const errTxt = errEv?.text?.trim();
          if (errTxt) {
            setMessages((prev) => [
              ...prev,
              {
                id: nextMessageId(),
                isUser: false,
                assistantVariant: "system" as const,
                roleBadge: "SYSTEM",
                text: errTxt,
              },
            ]);
          }
        }

        if (hasQuizPickerModal) {
          appendQuizTypePicker();
        }
        const doneWidget = tail
          .map((ev) => {
            const raw = ev.raw as Record<string, unknown> | undefined;
            const data =
              raw?.data != null && typeof raw.data === "object"
                ? (raw.data as Record<string, unknown>)
                : null;
            const ui =
              data?.ui != null && typeof data.ui === "object"
                ? (data.ui as Record<string, unknown>)
                : null;
            return typeof ui?.widget === "string" ? ui.widget : null;
          })
          .find((w): w is string => !!w);
        if (doneWidget) {
          appendDecisionWidget(doneWidget);
        }
      } catch (e) {
        if (cancelled || (e instanceof Error && e.name === "AbortError")) {
          streamCompleted = true;
          stopAnswerRenderLoop();
          return;
        }
        streamCompleted = true;
        stopAnswerRenderLoop();
        setMessages((prev) => [
          ...prev,
          {
            id: nextMessageId(),
            isUser: false,
            assistantVariant: "system",
            text:
              e instanceof Error ? e.message : "통합학습 요청에 실패했습니다.",
          },
        ]);
      } finally {
        streamCompleted = true;
        stopAnswerRenderLoop();
        if (abortRef.current === ac) {
          abortRef.current = null;
        }
      }
    },
    [
      appendAgentMessages,
      appendDecisionWidget,
      appendQuizTypePicker,
      currentPage,
      enabled,
      ensureSession,
      lectureId,
      nextMessageId,
    ],
  );

  const sendUserText = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || !lectureId || !enabled || busy) return;
      setMessages((prev) => [...prev, { id: nextMessageId(), isUser: true, text }]);
      // 사용자가 퀴즈 생성을 요청하면, 즉시 생성하지 않고 유형 선택 UI를 먼저 노출한다.
      if (INTEGRATED_QUIZ_REQUEST_RE.test(text)) {
        appendQuizTypePicker();
        return;
      }
      setBusy(true);
      try {
        await runStreamingAgentTurn("USER_MESSAGE", { question: text });
      } finally {
        setBusy(false);
      }
    },
    [
      appendQuizTypePicker,
      busy,
      enabled,
      lectureId,
      nextMessageId,
      runStreamingAgentTurn,
    ],
  );

  const startOrContinue = useCallback(async () => {
    if (!lectureId || !enabled || busy) return;
    setBusy(true);
    try {
      await runStreamingAgentTurn("SESSION_ENTERED", {});
    } finally {
      setBusy(false);
    }
  }, [busy, enabled, lectureId, runStreamingAgentTurn]);

  const handleAction = useCallback(
    async (actionId: string) => {
      if (!lectureId || !enabled || busy) return;
      const quizTypeMap: Record<string, string> = {
        quiz_type_flash_card: "Flash_Card",
        quiz_type_ox_problem: "OX_Problem",
        quiz_type_five_choice: "Five_Choice",
        quiz_type_short_answer: "Short_Answer",
      };
      const quizType = quizTypeMap[actionId];
      const decisionEventMap: Record<string, string> = {
        start_explanation_accept: "START_EXPLANATION_DECISION",
        start_explanation_reject: "START_EXPLANATION_DECISION",
        quiz_decision_accept: "QUIZ_DECISION",
        quiz_decision_reject: "QUIZ_DECISION",
        next_page_accept: "NEXT_PAGE_DECISION",
        next_page_reject: "NEXT_PAGE_DECISION",
        review_accept: "REVIEW_DECISION",
        review_reject: "REVIEW_DECISION",
        retest_accept: "RETEST_DECISION",
        retest_reject: "RETEST_DECISION",
      };
      const decisionEvent = decisionEventMap[actionId];
      const decisionAcceptMap: Record<string, boolean> = {
        start_explanation_accept: true,
        start_explanation_reject: false,
        quiz_decision_accept: true,
        quiz_decision_reject: false,
        next_page_accept: true,
        next_page_reject: false,
        review_accept: true,
        review_reject: false,
        retest_accept: true,
        retest_reject: false,
      };
      const decisionAccept = decisionAcceptMap[actionId];
      if (!quizType && !decisionEvent) return;
      const actionLabelMap: Record<string, string> = {
        start_explanation_accept: "설명 시작",
        start_explanation_reject: "설명 보류",
        quiz_decision_accept: "퀴즈 진행",
        quiz_decision_reject: "퀴즈 건너뛰기",
        next_page_accept: "다음 페이지 이동",
        next_page_reject: "현재 페이지 유지",
        review_accept: "복습 시작",
        review_reject: "복습 건너뛰기",
        retest_accept: "재시험 시작",
        retest_reject: "재시험 건너뛰기",
      };
      setMessages((prev) => [
        ...prev,
        {
          id: nextMessageId(),
          isUser: true,
          text: quizType
            ? `퀴즈 유형 선택: ${quizType}`
            : `선택: ${actionLabelMap[actionId] ?? decisionEvent}`,
        },
      ]);
      setBusy(true);
      try {
        if (quizType) {
          lastRequestedQuizTypeRef.current = quizType;
          await runStreamingAgentTurn("QUIZ_TYPE_SELECTED", { quizType });
        } else if (decisionEvent) {
          await runStreamingAgentTurn(decisionEvent, { accept: decisionAccept });
        }
      } finally {
        setBusy(false);
      }
    },
    [busy, enabled, lectureId, nextMessageId, runStreamingAgentTurn],
  );

  const stop = useCallback(async () => {
    abortRef.current?.abort();
    abortRef.current = null;
    if (!lectureId) return;
    setBusy(false);
    try {
      await integratedLearningApi.closeSession(lectureId);
      sessionIdRef.current = null;
      setMessages((prev) => [
        ...prev,
        {
          id: nextMessageId(),
          isUser: false,
          assistantVariant: "system",
          text: "통합학습 세션을 종료했습니다.",
        },
      ]);
    } catch {
      // ignore
    }
  }, [lectureId, nextMessageId]);

  useEffect(() => {
    if (!enabled) {
      abortRef.current?.abort();
      abortRef.current = null;
      setBusy(false);
      setMessages([]);
      setQuizOverlayModel(null);
      setQuizOverlayOpen(false);
      sessionIdRef.current = null;
      messageIdRef.current = 0;
    }
  }, [enabled, lectureId]);

  return {
    messages,
    busy,
    quizOverlayModel,
    quizOverlayOpen,
    dismissQuizOverlay,
    openQuizOverlay,
    sendUserText,
    startOrContinue,
    stop,
    toggleThoughtExpanded,
    handleAction,
  };
}
