import React from "react";
import { RefreshIcon } from "@/components/common/Icons";
import {
  reportCriteriaApi,
  type AiAgentOperation,
  type ReportCriterion,
  type ReportCriterionPayload,
} from "@/services/api";
import {
  formatDataSourceHintLabel,
  formatFallbackPolicyLabel,
} from "@/utils/displayLabels";

interface ReportCriteriaPanelProps {
  courseId: number;
  isDarkMode: boolean;
}

type FormState = {
  label: string;
  description: string;
  weight: string;
};

function emptyForm(): FormState {
  return { label: "", description: "", weight: "10" };
}

type CriteriaChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

type AssistantCriterionDraft = {
  label: string;
  description?: string;
  weight?: number;
};

function recordOf(value: unknown): Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readString(raw: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === "string" && value.trim() !== "") return value;
  }
  return "";
}

function readNumber(raw: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
      return Number(value);
    }
  }
  return undefined;
}

function criterionPayloadFromOperation(operation: AiAgentOperation): ReportCriterionPayload {
  const payload = recordOf(operation.payload);
  const raw = recordOf(operation.raw);
  const merged = { ...raw, ...payload };
  return {
    label: readString(merged, ["label", "name", "title", "criterionName", "criterion_name"]) || undefined,
    description:
      readString(merged, ["description", "desc", "detail", "body", "content"]) || undefined,
    weight: readNumber(merged, ["weight", "scoreWeight", "score_weight"]),
  };
}

function criterionIdFromOperation(operation: AiAgentOperation): number | null {
  const payload = recordOf(operation.payload);
  const raw = recordOf(operation.raw);
  const id = readNumber(
    { ...raw, ...payload },
    ["criterionId", "criterion_id", "id", "targetId", "target_id"],
  );
  return id == null ? null : id;
}

function stripMarkdownPrefix(value: string): string {
  return value
    .replace(/^\s*[-*•]\s+/, "")
    .replace(/^\s*\d+[.)]\s+/, "")
    .replace(/^\s*#+\s+/, "")
    .replace(/\*\*/g, "")
    .trim();
}

function parseCriterionDraftsFromAssistantText(text: string): AssistantCriterionDraft[] {
  const rows = text
    .split(/\r?\n/)
    .map(stripMarkdownPrefix)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const drafts: AssistantCriterionDraft[] = [];

  for (const row of rows) {
    const lower = row.toLowerCase();
    if (
      lower.includes("추천") ||
      lower.includes("예시") ||
      lower.includes("아래") ||
      lower.includes("평가 기준") ||
      lower.includes("평가항목")
    ) {
      const directMatch = row.match(/(?:기준명|항목명|이름|label)\s*[:：]\s*(.+)$/i);
      if (!directMatch) continue;
    }

    const weightMatch = row.match(/(?:가중치|weight)\s*[:：]?\s*(\d+(?:\.\d+)?)/i);
    const weight = weightMatch ? Number(weightMatch[1]) : undefined;
    const withoutWeight = row
      .replace(/[\s,]*(?:가중치|weight)\s*[:：]?\s*\d+(?:\.\d+)?\s*(?:점|%)?/gi, "")
      .trim();

    const explicitLabel = withoutWeight.match(
      /(?:기준명|항목명|이름|label)\s*[:：]\s*([^:：\-–—]+)(?:\s*[-–—:：]\s*(.+))?$/i,
    );
    if (explicitLabel) {
      const label = explicitLabel[1]?.trim();
      if (label) {
        drafts.push({
          label,
          description: explicitLabel[2]?.trim() || undefined,
          weight,
        });
      }
      continue;
    }

    const colonIndex = withoutWeight.search(/[:：\-–—]/);
    if (colonIndex <= 0) continue;
    const label = withoutWeight.slice(0, colonIndex).trim();
    const description = withoutWeight.slice(colonIndex + 1).trim();
    if (
      label.length < 2 ||
      label.length > 36 ||
      /^(설명|description|desc|가중치|weight)$/i.test(label)
    ) {
      continue;
    }

    drafts.push({
      label,
      description: description || undefined,
      weight,
    });
  }

  const deduped = new Map<string, AssistantCriterionDraft>();
  drafts.forEach((draft) => {
    const key = draft.label.trim().toLowerCase();
    if (!key || deduped.has(key)) return;
    deduped.set(key, draft);
  });
  return Array.from(deduped.values()).slice(0, 8);
}

export const ReportCriteriaPanel: React.FC<ReportCriteriaPanelProps> = ({
  courseId,
  isDarkMode,
}) => {
  const [criteria, setCriteria] = React.useState<ReportCriterion[]>([]);
  const [form, setForm] = React.useState<FormState>(() => emptyForm());
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [assistantLoading, setAssistantLoading] = React.useState(false);
  const [assistantText, setAssistantText] = React.useState("");
  const [assistantDrafts, setAssistantDrafts] = React.useState<AssistantCriterionDraft[]>([]);
  const [chatInput, setChatInput] = React.useState("");
  const [chatLoading, setChatLoading] = React.useState(false);
  const [chatMessages, setChatMessages] = React.useState<CriteriaChatMessage[]>([]);
  const [pendingOperation, setPendingOperation] =
    React.useState<AiAgentOperation | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCriteria(await reportCriteriaApi.listAllCriteria(courseId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "평가 기준을 불러오지 못했습니다.");
      setCriteria([]);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const reset = () => {
    setForm(emptyForm());
    setEditingId(null);
  };

  const submit = React.useCallback(async () => {
    if (!form.label.trim()) {
      window.alert("평가 기준 이름을 입력해주세요.");
      return;
    }
    const payload: ReportCriterionPayload = {
      label: form.label.trim(),
      description: form.description.trim() || undefined,
      weight: Number.isFinite(Number(form.weight)) ? Number(form.weight) : undefined,
    };

    setSaving(true);
    setError(null);
    try {
      if (editingId == null) {
        await reportCriteriaApi.createCriterion(courseId, payload);
      } else {
        await reportCriteriaApi.updateCriterion(courseId, editingId, payload);
      }
      reset();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "평가 기준 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }, [courseId, editingId, form, load]);

  const remove = React.useCallback(
    async (criterion: ReportCriterion) => {
      if (!criterion.deletable || criterion.criterionId == null) {
        window.alert("기본 평가 기준은 삭제할 수 없습니다.");
        return;
      }
      const ok = window.confirm(`"${criterion.label}" 기준을 삭제할까요?`);
      if (!ok) return;
      setSaving(true);
      setError(null);
      try {
        await reportCriteriaApi.deleteCriterion(courseId, criterion.criterionId);
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "평가 기준 삭제에 실패했습니다.");
      } finally {
        setSaving(false);
      }
    },
    [courseId, load],
  );

  const runAssistant = React.useCallback(async () => {
    setAssistantLoading(true);
    setAssistantText("");
    setAssistantDrafts([]);
    setError(null);
    try {
      let streamedText = "";
      const finalText = await reportCriteriaApi.streamAssistant(
        courseId,
        { desiredCount: 5, language: "ko" },
        {
          onDelta: (chunk) => {
            streamedText += chunk;
            setAssistantText(streamedText);
          },
        },
      );
      const text = streamedText || finalText;
      setAssistantText(text);
      setAssistantDrafts(parseCriterionDraftsFromAssistantText(text));
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI 추천을 불러오지 못했습니다.");
    } finally {
      setAssistantLoading(false);
    }
  }, [courseId]);

  const saveAssistantDraft = React.useCallback(
    async (draft: AssistantCriterionDraft) => {
      if (!draft.label.trim()) return;
      setSaving(true);
      setError(null);
      try {
        await reportCriteriaApi.createCriterion(courseId, {
          label: draft.label.trim(),
          description: draft.description?.trim() || undefined,
          weight: draft.weight,
        });
        setAssistantDrafts((prev) =>
          prev.filter((item) => item.label.trim() !== draft.label.trim()),
        );
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "AI 추천 항목 저장에 실패했습니다.");
      } finally {
        setSaving(false);
      }
    },
    [courseId, load],
  );

  const saveAllAssistantDrafts = React.useCallback(async () => {
    if (assistantDrafts.length === 0) return;
    const ok = window.confirm(`AI 추천 항목 ${assistantDrafts.length}개를 추가할까요?`);
    if (!ok) return;
    setSaving(true);
    setError(null);
    try {
      for (const draft of assistantDrafts) {
        await reportCriteriaApi.createCriterion(courseId, {
          label: draft.label.trim(),
          description: draft.description?.trim() || undefined,
          weight: draft.weight,
        });
      }
      setAssistantDrafts([]);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI 추천 항목 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }, [assistantDrafts, courseId, load]);

  const runOperationAssistant = React.useCallback(async () => {
    const message = chatInput.trim();
    if (!message || chatLoading) return;
    const userMessage: CriteriaChatMessage = {
      id: `criteria-user-${Date.now()}`,
      role: "user",
      text: message,
    };
    const assistantId = `criteria-assistant-${Date.now()}`;
    setChatMessages((prev) => [
      ...prev,
      userMessage,
      { id: assistantId, role: "assistant", text: "" },
    ]);
    setChatInput("");
    setPendingOperation(null);
    setChatLoading(true);
    setError(null);
    try {
      const result = await reportCriteriaApi.streamOperationAssistant(
        courseId,
        {
          message,
          criteria,
          currentDraft: {
            criterionId: editingId,
            label: form.label || undefined,
            description: form.description || undefined,
            weight: Number.isFinite(Number(form.weight))
              ? Number(form.weight)
              : undefined,
          },
          context: { locale: "ko" },
        },
        {
          onDelta: (chunk) =>
            setChatMessages((prev) =>
              prev.map((item) =>
                item.id === assistantId
                  ? { ...item, text: `${item.text}${chunk}` }
                  : item,
              ),
            ),
        },
      );

      const finalText = [
        result.text,
        ...(result.warnings.length ? [`주의: ${result.warnings.join(", ")}`] : []),
      ]
        .filter(Boolean)
        .join("\n");
      setChatMessages((prev) =>
        prev.map((item) =>
          item.id === assistantId
            ? { ...item, text: finalText || "작업 제안을 확인했습니다." }
            : item,
        ),
      );
      if (result.operation && result.operation.method !== "messageOnly") {
        setPendingOperation(result.operation);
      }
    } catch (err) {
      const messageText =
        err instanceof Error ? err.message : "평가항목 도우미 요청에 실패했습니다.";
      setChatMessages((prev) =>
        prev.map((item) =>
          item.id === assistantId ? { ...item, text: messageText } : item,
        ),
      );
      setError(messageText);
    } finally {
      setChatLoading(false);
    }
  }, [chatInput, chatLoading, courseId, criteria, editingId, form]);

  const applyPendingOperation = React.useCallback(async () => {
    if (!pendingOperation) return;
    const method = pendingOperation.method;
    const payload = criterionPayloadFromOperation(pendingOperation);
    const targetId = criterionIdFromOperation(pendingOperation) ?? editingId;
    const targetCriterion =
      targetId == null
        ? null
        : criteria.find(
            (criterion) =>
              criterion.criterionId === targetId || criterion.id === targetId,
          ) ?? null;
    const crudTargetId = targetCriterion?.criterionId ?? targetId;

    if (method === "draftCriterion" || method === "reviseCriterion") {
      setForm({
        label: payload.label ?? "",
        description: payload.description ?? "",
        weight: String(payload.weight ?? 10),
      });
      if (targetCriterion?.editable && targetCriterion.criterionId != null) {
        setEditingId(targetCriterion.criterionId);
      } else if (targetId != null && !targetCriterion?.builtIn) {
        setEditingId(targetId);
      }
      setPendingOperation(null);
      return;
    }

    if (method === "deleteCriterion") {
      if (crudTargetId == null || targetCriterion?.deletable === false) {
        setError("삭제할 평가항목을 특정할 수 없습니다.");
        return;
      }
      const ok = window.confirm("AI가 제안한 평가항목 삭제를 적용할까요?");
      if (!ok) return;
      setSaving(true);
      setError(null);
      try {
        await reportCriteriaApi.deleteCriterion(courseId, crudTargetId);
        setPendingOperation(null);
        reset();
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "평가 기준 삭제에 실패했습니다.");
      } finally {
        setSaving(false);
      }
      return;
    }

    if (!payload.label?.trim()) {
      setError("AI 제안에 평가 기준 이름이 없어 적용할 수 없습니다.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (method === "updateCriterion") {
        if (crudTargetId == null || targetCriterion?.editable === false) {
          setError("수정할 평가항목을 특정할 수 없습니다.");
          return;
        }
        await reportCriteriaApi.updateCriterion(courseId, crudTargetId, payload);
      } else {
        await reportCriteriaApi.createCriterion(courseId, payload);
      }
      setPendingOperation(null);
      reset();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI 제안 적용에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }, [courseId, criteria, editingId, load, pendingOperation]);

  const surfaceClass = isDarkMode
    ? "border-[#1b4d44] bg-[#0b241f] text-gray-100"
    : "border-[#d9d9dd] bg-white text-gray-900";
  const mutedClass = isDarkMode ? "text-gray-400" : "text-gray-500";
  const inputClass = `rounded-lg border px-3 py-2 text-sm outline-none focus:ring-1 ${
    isDarkMode
      ? "border-[#1b3443] bg-[#102a35] text-gray-100 placeholder:text-gray-500 focus:border-[#ffad9b] focus:ring-[#ffad9b]/20"
      : "border-[#d9d9dd] bg-white text-gray-900 placeholder:text-gray-400 focus:border-[#1863dc] focus:ring-[#1863dc]/20"
  }`;
  const builtInCriteria = criteria.filter((criterion) => criterion.builtIn);
  const customCriteria = criteria.filter((criterion) => !criterion.builtIn);
  const renderCriterionList = (
    rows: ReportCriterion[],
    emptyText: string,
  ) =>
    rows.length === 0 ? (
      <div className={`px-5 py-10 text-center text-sm ${mutedClass}`}>
        {emptyText}
      </div>
    ) : (
      <ul className="divide-y divide-inherit">
        {rows.map((criterion, index) => {
          const editable = !!criterion.editable && criterion.criterionId != null;
          const deletable = !!criterion.deletable && criterion.criterionId != null;
          return (
            <li
              key={`${criterion.builtIn ? "base" : "custom"}-${criterion.key ?? criterion.criterionId ?? criterion.id}-${index}`}
              className="px-5 py-4"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-semibold">{criterion.label}</h4>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        criterion.builtIn
                          ? isDarkMode
                            ? "bg-white/10 text-gray-200"
                            : "bg-gray-100 text-gray-700"
                          : "bg-[#ff824d]/15 text-[#ff824d]"
                      }`}
                    >
                      {criterion.builtIn ? "기본" : "추가"}
                    </span>
                    {!editable ? (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          isDarkMode ? "bg-white/5 text-gray-400" : "bg-gray-50 text-gray-500"
                        }`}
                      >
                        읽기 전용
                      </span>
                    ) : null}
                  </div>
                  <p className={`mt-1 text-sm ${mutedClass}`}>
                    {criterion.description || "설명 없음"}
                  </p>
                  {(criterion.dataSourceHint || criterion.fallbackPolicy) && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {criterion.dataSourceHint ? (
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                            isDarkMode
                              ? "border-[#343434] text-gray-300"
                              : "border-[#dedbd5] text-gray-700"
                          }`}
                        >
                          데이터: {formatDataSourceHintLabel(criterion.dataSourceHint)}
                        </span>
                      ) : null}
                      {criterion.fallbackPolicy ? (
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                            isDarkMode
                              ? "border-[#343434] text-gray-300"
                              : "border-[#dedbd5] text-gray-700"
                          }`}
                        >
                          부족 시: {formatFallbackPolicyLabel(criterion.fallbackPolicy)}
                        </span>
                      ) : null}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      isDarkMode ? "bg-white/10 text-gray-100" : "bg-gray-100 text-gray-900"
                    }`}
                  >
                    가중치 {criterion.weight ?? 0}
                  </span>
                  <button
                    type="button"
                    disabled={!editable}
                    onClick={() => {
                      if (!editable || criterion.criterionId == null) return;
                      setEditingId(criterion.criterionId);
                      setForm({
                        label: criterion.label,
                        description: criterion.description ?? "",
                        weight: String(criterion.weight ?? 0),
                      });
                    }}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${
                      isDarkMode ? "border-zinc-600" : "border-gray-300"
                    }`}
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    disabled={!deletable}
                    onClick={() => void remove(criterion)}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    삭제
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    );

  return (
    <div className="flex min-h-0 flex-col gap-3 pb-4">
      <section className={`rounded-2xl border px-5 py-5 lg:px-6 ${surfaceClass}`}>
        <div className="mb-4 flex min-h-10 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold leading-tight">리포트 평가 기준</h2>
            <p className={`mt-1 text-sm ${mutedClass}`}>
              학생 리포트 분석에 사용할 기준과 가중치를 관리합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void runAssistant()}
            disabled={assistantLoading}
            className={`rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-50 ${
              isDarkMode ? "border-zinc-600 text-gray-100" : "border-gray-300 text-gray-900"
            }`}
          >
            {assistantLoading ? "추천 중" : "AI 기준 추천"}
          </button>
        </div>

        <form
          className="grid gap-3 lg:grid-cols-[0.9fr_1.3fr_8rem_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <input
            className={inputClass}
            value={form.label}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, label: event.target.value }))
            }
            placeholder="기준명"
          />
          <input
            className={inputClass}
            value={form.description}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, description: event.target.value }))
            }
            placeholder="설명"
          />
          <input
            className={inputClass}
            type="number"
            min={0}
            value={form.weight}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, weight: event.target.value }))
            }
            placeholder="가중치"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className={`rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50 ${
                isDarkMode ? "bg-white text-[#141414]" : "bg-[#141414] text-white"
              }`}
            >
              {editingId == null ? "추가" : "저장"}
            </button>
            {editingId != null ? (
              <button
                type="button"
                onClick={reset}
                className={`rounded-xl border px-4 py-2 text-sm font-semibold ${
                  isDarkMode ? "border-zinc-600" : "border-gray-300"
                }`}
              >
                취소
              </button>
            ) : null}
          </div>
        </form>
      </section>

      {error ? (
        <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {assistantText ? (
        <section className={`rounded-xl border px-4 py-4 ${surfaceClass}`}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-sm font-semibold">AI 추천 초안</h3>
            {assistantDrafts.length ? (
              <button
                type="button"
                onClick={() => void saveAllAssistantDrafts()}
                disabled={saving}
                className={`rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-50 ${
                  isDarkMode ? "bg-white text-[#141414]" : "bg-[#141414] text-white"
                }`}
              >
                추천 전체 추가
              </button>
            ) : null}
          </div>
          <p className={`mt-3 whitespace-pre-wrap text-sm leading-7 ${mutedClass}`}>
            {assistantText}
          </p>
          {assistantDrafts.length ? (
            <div className="mt-4 space-y-2">
              {assistantDrafts.map((draft) => (
                <div
                  key={draft.label}
                  className={`rounded-lg border px-3 py-3 ${
                    isDarkMode
                      ? "border-[#343434] bg-[#181818]"
                      : "border-[#dedbd5] bg-[#fbfaf7]"
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold">{draft.label}</p>
                        {draft.weight != null ? (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              isDarkMode ? "bg-white/10 text-gray-200" : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            가중치 {draft.weight}
                          </span>
                        ) : null}
                      </div>
                      {draft.description ? (
                        <p className={`mt-1 text-xs leading-5 ${mutedClass}`}>
                          {draft.description}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setForm({
                            label: draft.label,
                            description: draft.description ?? "",
                            weight: String(draft.weight ?? 10),
                          })
                        }
                        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                          isDarkMode ? "border-zinc-600" : "border-gray-300"
                        }`}
                      >
                        입력폼에 넣기
                      </button>
                      <button
                        type="button"
                        onClick={() => void saveAssistantDraft(draft)}
                        disabled={saving}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${
                          isDarkMode ? "bg-white text-[#141414]" : "bg-[#141414] text-white"
                        }`}
                      >
                        저장
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className={`mt-3 text-xs ${mutedClass}`}>
              저장 가능한 항목을 자동으로 찾지 못했습니다. 필요한 기준명을 입력폼에 옮겨 저장하거나,
              아래 도우미에게 “질문 구성력 기준을 추가해줘”처럼 요청해 주세요.
            </p>
          )}
        </section>
      ) : null}

      <section className={`rounded-xl border px-4 py-4 ${surfaceClass}`}>
        <div className="flex flex-col gap-1">
          <h3 className="text-base font-semibold">평가항목 도우미</h3>
          <p className={`text-sm ${mutedClass}`}>
            자연어로 평가항목 생성, 수정, 삭제를 요청하면 적용 전 확인 카드로 제안합니다.
          </p>
        </div>
        <div
          className={`mt-3 max-h-56 overflow-y-auto rounded-lg border px-3 py-3 ${
            isDarkMode ? "border-[#343434] bg-[#181818]" : "border-[#dedbd5] bg-[#fbfaf7]"
          }`}
        >
          {chatMessages.length === 0 ? (
            <p className={`text-sm ${mutedClass}`}>
              예: 질문 구성력 기준을 가중치 15로 추가해줘.
            </p>
          ) : (
            <div className="space-y-2">
              {chatMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[86%] rounded-lg px-3 py-2 text-sm leading-6 ${
                      message.role === "user"
                        ? "bg-[#ff824d] text-white"
                        : isDarkMode
                          ? "border border-[#343434] bg-[#202020] text-gray-100"
                          : "border border-[#dedbd5] bg-white text-[#212121]"
                    }`}
                  >
                    <p className="mb-1 text-[11px] font-semibold opacity-70">
                      {message.role === "user" ? "나" : "AI 도우미"}
                    </p>
                    <p className="whitespace-pre-wrap">
                      {message.text || (message.role === "assistant" ? "응답 생성 중..." : "")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {pendingOperation ? (
          <div
            className={`mt-3 rounded-lg border px-3 py-3 text-sm ${
              isDarkMode
                ? "border-[#343434] bg-white/[0.04]"
                : "border-[#dedbd5] bg-[#fff8f3]"
            }`}
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold">AI 제안: {pendingOperation.method}</p>
                {pendingOperation.message ? (
                  <p className={`mt-1 ${mutedClass}`}>{pendingOperation.message}</p>
                ) : null}
                {pendingOperation.warnings.length ? (
                  <p className="mt-1 text-xs font-semibold text-[#ff824d]">
                    {pendingOperation.warnings.join(", ")}
                  </p>
                ) : null}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void applyPendingOperation()}
                  disabled={saving}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-50 ${
                    isDarkMode ? "bg-white text-[#141414]" : "bg-[#141414] text-white"
                  }`}
                >
                  적용
                </button>
                <button
                  type="button"
                  onClick={() => setPendingOperation(null)}
                  className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
                    isDarkMode ? "border-zinc-600" : "border-gray-300"
                  }`}
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        ) : null}
        <form
          className="mt-3 grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            void runOperationAssistant();
          }}
        >
          <input
            className={inputClass}
            value={chatInput}
            onChange={(event) => setChatInput(event.target.value)}
            placeholder="평가항목 도우미에게 요청하기"
          />
          <button
            type="submit"
            disabled={chatLoading || !chatInput.trim()}
            className={`rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50 ${
              isDarkMode ? "bg-white text-[#141414]" : "bg-[#141414] text-white"
            }`}
          >
            {chatLoading ? "처리 중" : "요청"}
          </button>
        </form>
      </section>

      <section className={`rounded-xl border ${surfaceClass}`}>
        <div className="flex items-center justify-between border-b border-inherit px-4 py-3">
          <div>
            <h3 className="text-base font-semibold">분석 기준 목록</h3>
            <p className={`mt-1 text-xs ${mutedClass}`}>
              기본 {builtInCriteria.length}개 · 추가 {customCriteria.length}개
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            aria-label="새로고침"
            title="새로고침"
            className={`inline-flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold ${
              isDarkMode ? "border-zinc-600" : "border-gray-300"
            }`}
          >
            <RefreshIcon className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
        {loading ? (
          <div className={`px-5 py-16 text-center text-sm ${mutedClass}`}>
            기준을 불러오는 중입니다.
          </div>
        ) : criteria.length === 0 ? (
          <div className={`px-5 py-16 text-center text-sm ${mutedClass}`}>
            등록된 평가 기준이 없습니다.
          </div>
        ) : (
          <div className="divide-y divide-inherit">
            <div>
              <div className="px-5 py-3">
                <h4 className="text-sm font-semibold">기본 기준</h4>
                <p className={`mt-1 text-xs ${mutedClass}`}>
                  시스템 기본 10개 항목이며 수정하거나 삭제할 수 없습니다.
                </p>
              </div>
              {renderCriterionList(builtInCriteria, "기본 기준이 없습니다.")}
            </div>
            <div>
              <div className="px-5 py-3">
                <h4 className="text-sm font-semibold">추가 기준</h4>
                <p className={`mt-1 text-xs ${mutedClass}`}>
                  교사가 수업 목적에 맞게 추가한 커스텀 기준입니다.
                </p>
              </div>
              {renderCriterionList(customCriteria, "추가된 커스텀 기준이 없습니다.")}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
