import { useCallback, useEffect, useRef, useState } from "react";
import {
  integratedLearningApi,
  type IntegratedLearningMessage,
} from "../services/api";

export interface IntegratedChatMessage {
  id: number;
  isUser: boolean;
  text?: string;
  markdown?: string;
  isLoading?: boolean;
  roleBadge?: string;
  assistantVariant?: "educational" | "orchestrator" | "system";
}

export function useIntegratedLearningChat(options: {
  enabled: boolean;
  lectureId: number | null;
}) {
  const { enabled, lectureId } = options;
  const [messages, setMessages] = useState<IntegratedChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const sessionIdRef = useRef<string | null>(null);

  const ensureSession = useCallback(async (): Promise<string> => {
    if (!lectureId) throw new Error("강의를 먼저 선택해 주세요.");
    if (sessionIdRef.current) return sessionIdRef.current;
    const opened = await integratedLearningApi.openSession(lectureId);
    sessionIdRef.current = opened.sessionId;
    return opened.sessionId;
  }, [lectureId]);

  const appendAgentMessages = useCallback((events: IntegratedLearningMessage[]) => {
    const visible = events.filter((e) => {
      if (e.type === "heartbeat") return false;
      if (e.type === "done") return e.text.trim().length > 0;
      if (e.type === "error") return true;
      return e.text.trim().length > 0;
    });
    if (visible.length === 0) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          isUser: false,
          assistantVariant: "system",
          text: "응답이 비어 있습니다. 다시 시도해 주세요.",
        },
      ]);
      return;
    }
    setMessages((prev) => [
      ...prev,
      ...visible.map((e, idx) => ({
        id: Date.now() + idx,
        isUser: false,
        assistantVariant: e.type === "error" ? "system" : "orchestrator",
        roleBadge: e.type === "error" ? "SYSTEM" : "통합학습",
        markdown: e.text,
      })),
    ]);
  }, []);

  const sendUserText = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || !lectureId || !enabled || busy) return;
      setMessages((prev) => [...prev, { id: Date.now(), isUser: true, text }]);
      setBusy(true);
      try {
        const sessionId = await ensureSession();
        const events = await integratedLearningApi.sendEvent(
          lectureId,
          sessionId,
          "USER_MESSAGE",
          { text },
        );
        appendAgentMessages(events);
      } catch (e) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            isUser: false,
            assistantVariant: "system",
            text: e instanceof Error ? e.message : "통합학습 요청에 실패했습니다.",
          },
        ]);
      } finally {
        setBusy(false);
      }
    },
    [appendAgentMessages, busy, enabled, ensureSession, lectureId],
  );

  const startOrContinue = useCallback(async () => {
    if (!lectureId || !enabled || busy) return;
    setBusy(true);
    try {
      const sessionId = await ensureSession();
      const events = await integratedLearningApi.sendEvent(
        lectureId,
        sessionId,
        "SESSION_ENTERED",
        {},
      );
      appendAgentMessages(events);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          isUser: false,
          assistantVariant: "system",
          text: e instanceof Error ? e.message : "통합학습 시작에 실패했습니다.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }, [appendAgentMessages, busy, enabled, ensureSession, lectureId]);

  const stop = useCallback(async () => {
    if (!lectureId) return;
    setBusy(false);
    try {
      await integratedLearningApi.closeSession(lectureId);
      sessionIdRef.current = null;
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          isUser: false,
          assistantVariant: "system",
          text: "통합학습 세션을 종료했습니다.",
        },
      ]);
    } catch {
      // ignore
    }
  }, [lectureId]);

  useEffect(() => {
    if (!enabled) {
      setBusy(false);
      setMessages([]);
      sessionIdRef.current = null;
    }
  }, [enabled, lectureId]);

  return {
    messages,
    busy,
    sendUserText,
    startOrContinue,
    stop,
  };
}

