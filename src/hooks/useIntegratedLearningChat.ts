import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import {
  integratedLearningApi,
  type IntegratedLearningMessage,
} from "../services/api";

const STREAM_REVEAL_INTERVAL_MS = 42;
const STREAM_REVEAL_CHARS_PER_TICK = 14;
const INTEGRATED_WELCOME_TEXT_RE =
  /학습\s*세션에\s*오신\s*것을\s*환영합니다|학습\s*세션에\s*오신것을\s*환영합니다/;

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
}

export function useIntegratedLearningChat(options: {
  enabled: boolean;
  lectureId: number | null;
}) {
  const { enabled, lectureId } = options;
  const [messages, setMessages] = useState<IntegratedChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const sessionIdRef = useRef<string | null>(null);
  const messageIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const nextMessageId = useCallback(() => {
    messageIdRef.current += 1;
    return messageIdRef.current;
  }, []);

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
          }),
        ),
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

      let thoughtMessageId: number | null = null;
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

      const finalizeThought = () => {
        if (thoughtMessageId == null) return;
        const id = thoughtMessageId;
        thoughtMessageId = null;
        flushSync(() =>
          setMessages((p) =>
            p.map((m) =>
              m.id === id
                ? {
                    ...m,
                    thoughtFinished: true,
                    thoughtExpanded: false,
                    isLoading: false,
                  }
                : m,
            ),
          ),
        );
      };

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
              flushSync(() => {
                setMessages((prev) => {
                  if (thoughtMessageId == null) {
                    const id = nextMessageId();
                    thoughtMessageId = id;
                    return [
                      ...prev,
                      {
                        id,
                        isUser: false,
                        roleBadge: "통합학습",
                        assistantVariant: "orchestrator",
                        text: "사고 요약",
                        thoughtSummary: chunk,
                        thoughtExpanded: true,
                        thoughtFinished: false,
                        isLoading: false,
                      },
                    ];
                  }
                  return prev.map((m) =>
                    m.id === thoughtMessageId
                      ? {
                          ...m,
                          thoughtSummary: (m.thoughtSummary ?? "") + chunk,
                        }
                      : m,
                  );
                });
              });
            },
            onAgentDelta: (chunk) => {
              if (cancelled || !chunk) return;
              gotBody = true;
              if (thoughtMessageId != null) {
                finalizeThought();
              }
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
        );

        if (cancelled) return;

        if (thoughtMessageId != null) {
          finalizeThought();
        }

        streamCompleted = true;
        notifyDrainIfDone();
        await waitForRenderedDrain();

        if (gotBody && answerMessageId != null) {
          setMessages((p) =>
            p.map((m) =>
              m.id === answerMessageId
                ? { ...m, markdown: answerBuf, streamingMarkdown: false }
                : m,
            ),
          );
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
      setBusy(true);
      try {
        await runStreamingAgentTurn("USER_MESSAGE", { text });
      } finally {
        setBusy(false);
      }
    },
    [busy, enabled, lectureId, nextMessageId, runStreamingAgentTurn],
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
      sessionIdRef.current = null;
      messageIdRef.current = 0;
    }
  }, [enabled, lectureId]);

  return {
    messages,
    busy,
    sendUserText,
    startOrContinue,
    stop,
    toggleThoughtExpanded,
  };
}
