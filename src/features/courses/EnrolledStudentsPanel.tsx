import React from "react";
import { RefreshIcon } from "@/components/common/Icons";
import { formatKoreanDateTime } from "@/utils/dateFormat";
import { courseApi, type CourseStudentListItem } from "@/services/api";

function formatInstant(iso: string | undefined): string {
  return formatKoreanDateTime(iso);
}

function formatAttendanceRate(value: number | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${Math.round(value * 100)}%`;
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
  const [attendanceRates, setAttendanceRates] = React.useState<Record<number, number>>({});

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
      try {
        const matrix = await courseApi.getAttendanceMatrix(courseId, {
          page: 0,
          size: 100,
          sort: "name,asc",
        });
        const nextRates: Record<number, number> = {};
        for (const row of matrix.students.content ?? []) {
          if (row.presentRatio != null && Number.isFinite(row.presentRatio)) {
            nextRates[row.studentId] = row.presentRatio;
            continue;
          }
          const statuses = Object.values(row.records ?? {});
          if (statuses.length === 0) continue;
          const attended = statuses.filter(
            (status) =>
              status === "PRESENT" || status === "LATE" || status === "EXCUSED",
          ).length;
          nextRates[row.studentId] = attended / statuses.length;
        }
        setAttendanceRates(nextRates);
      } catch {
        setAttendanceRates({});
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "수강 학생 목록을 불러오지 못했습니다.");
      setRows([]);
      setTotalPages(1);
      setSelected({});
      setAttendanceRates({});
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
    <div className="flex min-h-0 flex-col">
      <div className="mb-3 flex flex-wrap items-center justify-start gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => toggleAll(true)}
            disabled={busy || rows.length === 0 || allChecked}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              isDarkMode
                ? "bg-zinc-700 text-white hover:bg-zinc-600"
                : "bg-gray-200 text-gray-800 hover:bg-gray-300"
            }`}
          >
            전체 선택
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
          <button
            type="button"
            onClick={() => void load()}
            disabled={busy}
            aria-label="새로고침"
            title="새로고침"
            className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium border cursor-pointer disabled:opacity-50 ${
              isDarkMode
                ? "border-[#2c5a50] text-zinc-200 hover:bg-white/10"
                : "border-[#d9d9dd] text-gray-700 hover:bg-[#eeece7]"
            }`}
          >
            <RefreshIcon className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
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
        <div
          className={`overflow-hidden rounded-xl border ${
            isDarkMode ? "border-[#2b2b2b]" : "border-[#dedbd5]"
          }`}
        >
          <div
            className={`grid grid-cols-[minmax(0,1.1fr)_minmax(0,1.25fr)_minmax(0,0.95fr)_3rem] items-center gap-2 border-b px-3 py-2 text-xs font-semibold ${
              isDarkMode
                ? "border-[#2b2b2b] bg-[#181818] text-gray-400"
                : "border-[#dedbd5] bg-[#f7f5f1] text-gray-500"
            }`}
          >
            <span className="text-center">학생 이름</span>
            <span className="text-center">이메일</span>
            <span className="text-center">등록시간</span>
            <span className="text-center">출석률</span>
          </div>
          <ul
            className={`divide-y ${
              isDarkMode ? "divide-[#2b2b2b]" : "divide-[#dedbd5]"
            }`}
          >
            {rows.map((row) => {
              const checked = !!selected[row.studentId];
              return (
                <li
                  key={row.enrollmentId || row.studentId}
                  className={`grid grid-cols-[minmax(0,1.1fr)_minmax(0,1.25fr)_minmax(0,0.95fr)_3rem] items-center gap-2 px-3 py-3 text-sm ${
                    isDarkMode ? "bg-[#202020] text-gray-100" : "bg-white text-[#212121]"
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <input
                      type="checkbox"
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
                    <span className="min-w-0 truncate font-semibold">
                      {row.studentName || "이름 없음"}
                    </span>
                  </span>
                  <span
                    className={`min-w-0 truncate ${
                      isDarkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    {row.studentEmail || "이메일 없음"}
                  </span>
                  <span className="min-w-0 truncate text-xs opacity-75">
                    {formatInstant(row.enrolledAt)}
                  </span>
                  <span className="min-w-0 truncate text-center text-sm font-semibold tabular-nums">
                    {formatAttendanceRate(attendanceRates[row.studentId])}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
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

