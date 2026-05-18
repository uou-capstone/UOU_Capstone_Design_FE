import React from "react";
import {
  reportCriteriaApi,
  type ReportCriterion,
  type ReportCriterionPayload,
} from "@/services/api";

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
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCriteria(await reportCriteriaApi.listCriteria(courseId));
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
      const ok = window.confirm(`"${criterion.label}" 기준을 삭제할까요?`);
      if (!ok) return;
      setSaving(true);
      setError(null);
      try {
        await reportCriteriaApi.deleteCriterion(courseId, criterion.id);
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
    setError(null);
    try {
      await reportCriteriaApi.streamAssistant(
        courseId,
        { desiredCount: 5, language: "ko" },
        {
          onDelta: (chunk) => setAssistantText((prev) => `${prev}${chunk}`),
        },
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI 추천을 불러오지 못했습니다.");
    } finally {
      setAssistantLoading(false);
    }
  }, [courseId]);

  const surfaceClass = isDarkMode
    ? "border-zinc-800 bg-[#171b20] text-gray-100"
    : "border-gray-200 bg-white text-gray-900";
  const mutedClass = isDarkMode ? "text-gray-400" : "text-gray-500";
  const inputClass = `rounded-xl border px-3 py-2 text-sm outline-none focus:border-[#ff824d] ${
    isDarkMode
      ? "border-zinc-700 bg-[#111418] text-gray-100 placeholder:text-gray-500"
      : "border-gray-200 bg-white text-gray-900 placeholder:text-gray-400"
  }`;

  return (
    <div className="flex min-h-full flex-col gap-5 pb-8">
      <section className={`rounded-2xl border px-5 py-5 ${surfaceClass}`}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className={`text-xs font-semibold uppercase tracking-wide ${mutedClass}`}>
              Report Criteria
            </p>
            <h2 className="mt-1 text-xl font-semibold">리포트 평가 기준</h2>
            <p className={`mt-2 text-sm ${mutedClass}`}>
              학생 리포트 분석에 사용할 기준과 가중치를 관리합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void runAssistant()}
            disabled={assistantLoading}
            className="rounded-xl border border-[#ff824d]/40 px-4 py-2 text-sm font-semibold text-[#ff824d] disabled:opacity-50"
          >
            {assistantLoading ? "추천 중" : "AI 기준 추천"}
          </button>
        </div>

        <form
          className="mt-5 grid gap-3 lg:grid-cols-[0.9fr_1.3fr_8rem_auto]"
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
              className="rounded-xl bg-[#ff824d] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
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
        <section className={`rounded-2xl border px-5 py-4 ${surfaceClass}`}>
          <h3 className="text-sm font-semibold">AI 추천 초안</h3>
          <p className={`mt-3 whitespace-pre-wrap text-sm leading-7 ${mutedClass}`}>
            {assistantText}
          </p>
        </section>
      ) : null}

      <section className={`rounded-2xl border ${surfaceClass}`}>
        <div className="flex items-center justify-between border-b border-inherit px-5 py-4">
          <h3 className="text-base font-semibold">기준 목록</h3>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
              isDarkMode ? "border-zinc-600" : "border-gray-300"
            }`}
          >
            새로고침
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
          <ul className="divide-y divide-inherit">
            {criteria.map((criterion) => (
              <li key={criterion.id} className="px-5 py-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h4 className="text-sm font-semibold">{criterion.label}</h4>
                    <p className={`mt-1 text-sm ${mutedClass}`}>
                      {criterion.description || "설명 없음"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-[#ff824d]/15 px-3 py-1 text-xs font-semibold text-[#ff824d]">
                      weight {criterion.weight ?? 0}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(criterion.id);
                        setForm({
                          label: criterion.label,
                          description: criterion.description ?? "",
                          weight: String(criterion.weight ?? 0),
                        });
                      }}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                        isDarkMode ? "border-zinc-600" : "border-gray-300"
                      }`}
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      onClick={() => void remove(criterion)}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};
