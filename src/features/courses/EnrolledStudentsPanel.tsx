import React from "react";
import { courseApi, type CourseStudentListItem } from "@/services/api";

function formatInstant(iso: string | undefined): string {
  if (iso == null || String(iso).trim() === "") return "—";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  return new Date(t).toLocaleString("ko-KR");
}

interface EnrolledStudentsPanelProps {
  courseId: number;
  isDarkMode: boolean;
}

export const EnrolledStudentsPanel: React.FC<EnrolledStudentsPanelProps> = ({
  courseId,
  isDarkMode,
}) => {
  const [page, setPage] = React.useState(0);
  const [rows, setRows] = React.useState<CourseStudentListItem[]>([]);
  const [totalPages, setTotalPages] = React.useState(1);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [selected, setSelected] = React.useState<Record<number, boolean>>({});
  const selectedIds = React.useMemo(
    () => rows.filter((r) => selected[r.studentId]).map((r) => r.studentId),
    [rows, selected],
  );

  const [acting, setActing] = React.useState<{
    kind: "remove" | "block";
    ids: number[];
  } | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await courseApi.getCourseStudents(courseId, {
        page,
        size: 20,
        sort: "createdAt,desc",
      });
      const content = Array.isArray(res.content) ? res.content : [];
      setRows(content);
      setTotalPages(Math.max(res.totalPages ?? 1, 1));
      setSelected({});
    } catch (e) {
      setError(e instanceof Error ? e.message : "수강 학생 목록을 불러오지 못했습니다.");
      setRows([]);
      setTotalPages(1);
      setSelected({});
    } finally {
      setLoading(false);
    }
  }, [courseId, page]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const toggleAll = (nextChecked: boolean) => {
    if (!nextChecked) {
      setSelected({});
      return;
    }
    const obj: Record<number, boolean> = {};
    for (const r of rows) obj[r.studentId] = true;
    setSelected(obj);
  };

  const runBulk = React.useCallback(
    async (kind: "remove" | "block") => {
      const ids = selectedIds;
      if (!ids.length) return;
      const label = kind === "remove" ? "제거" : "차단";
      const suffix =
        kind === "block" ? "\n차단하면 같은 강의실에 재가입 요청을 할 수 없습니다." : "";
      const ok = window.confirm(
        `선택된 ${ids.length}명 학생을 ${label}하시겠습니까?${suffix}`,
      );
      if (!ok) return;

      setActing({ kind, ids });
      const succeeded: number[] = [];
      const failed: { id: number; message: string }[] = [];

      for (const studentId of ids) {
        try {
          if (kind === "remove") {
            await courseApi.removeCourseStudent(courseId, studentId);
          } else {
            await courseApi.blockCourseStudent(courseId, studentId);
          }
          succeeded.push(studentId);
        } catch (e) {
          failed.push({
            id: studentId,
            message: e instanceof Error ? e.message : `${label}에 실패했습니다.`,
          });
        }
      }

      setRows((prev) => prev.filter((r) => !succeeded.includes(r.studentId)));
      setSelected({});
      setActing(null);

      if (failed.length) {
        const head = failed.slice(0, 3).map((f) => `- ${f.id}: ${f.message}`).join("\n");
        const more = failed.length > 3 ? `\n…외 ${failed.length - 3}건` : "";
        window.alert(`${label} 실패:\n${head}${more}`);
      }
    },
    [courseId, selectedIds],
  );

  const anySelected = selectedIds.length > 0;
  const allChecked = rows.length > 0 && selectedIds.length === rows.length;
  const busy = loading || acting != null;

  return (
    <div className="flex min-h-full flex-col pb-8">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <label className="inline-flex items-center gap-2 text-xs font-medium">
            <input
              type="checkbox"
              checked={allChecked}
              onChange={(e) => toggleAll(e.target.checked)}
              disabled={busy || rows.length === 0}
            />
            전체 선택
          </label>
          <span className="text-xs opacity-70">선택됨: {selectedIds.length}명</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void load()}
            disabled={busy}
            className={`rounded-full px-3 py-1.5 text-xs font-medium border cursor-pointer disabled:opacity-50 ${
              isDarkMode
                ? "border-[#2c5a50] text-zinc-200 hover:bg-white/10"
                : "border-[#d9d9dd] text-gray-700 hover:bg-[#eeece7]"
            }`}
          >
            새로고침
          </button>
          <button
            type="button"
            onClick={() => void runBulk("remove")}
            disabled={!anySelected || busy}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              isDarkMode
                ? "bg-zinc-700 text-white hover:bg-zinc-600"
                : "bg-gray-200 text-gray-800 hover:bg-gray-300"
            }`}
          >
            일괄 제거
          </button>
          <button
            type="button"
            onClick={() => void runBulk("block")}
            disabled={!anySelected || busy}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            일괄 차단
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm opacity-70 py-12 text-center">불러오는 중…</div>
      ) : error ? (
        <div className={`text-sm py-6 ${isDarkMode ? "text-red-400" : "text-red-600"}`}>
          {error}
        </div>
      ) : rows.length === 0 ? (
        <div className="text-sm opacity-60 py-12 text-center">등록된 수강 학생이 없습니다.</div>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => {
            const checked = !!selected[row.studentId];
            return (
              <li
                key={row.enrollmentId || row.studentId}
                className={`rounded-xl border px-4 py-3 ${
                  isDarkMode ? "border-[#1b4d44] bg-[#0b241f]" : "border-[#d9d9dd] bg-white"
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={checked}
                    onChange={(e) =>
                      setSelected((prev) => ({
                        ...prev,
                        [row.studentId]: e.target.checked,
                      }))
                    }
                    disabled={busy}
                    aria-label={`${row.studentName} 선택`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{row.studentName}</div>
                        <div className={`text-xs mt-0.5 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                          {row.studentEmail}
                        </div>
                        <div className="text-[11px] mt-1 opacity-70">
                          등록 시각: {formatInstant(row.enrolledAt)}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            setSelected((prev) => ({ ...prev, [row.studentId]: true }))
                          }
                          className={`rounded-lg px-2.5 py-1 text-xs font-medium border cursor-pointer disabled:opacity-50 ${
                            isDarkMode
                              ? "border-[#2c5a50] text-zinc-200 hover:bg-white/10"
                              : "border-[#d9d9dd] text-gray-700 hover:bg-[#eeece7]"
                          }`}
                          title="선택"
                        >
                          선택
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {totalPages > 1 ? (
        <div
          className={`mt-6 flex flex-wrap items-center justify-between gap-2 border-t pt-4 ${
            isDarkMode ? "border-[#1b3443]" : "border-[#d9d9dd]"
          }`}
        >
          <button
            type="button"
            disabled={page <= 0 || busy}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              page <= 0 || busy
                ? "opacity-40 cursor-not-allowed"
                : isDarkMode
                  ? "bg-zinc-800 text-gray-200 hover:bg-zinc-700"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            이전
          </button>
          <span className="text-xs opacity-70">
            {page + 1} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages - 1 || busy}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              page >= totalPages - 1 || busy
                ? "opacity-40 cursor-not-allowed"
                : isDarkMode
                  ? "bg-zinc-800 text-gray-200 hover:bg-zinc-700"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            다음
          </button>
        </div>
      ) : null}
    </div>
  );
};

