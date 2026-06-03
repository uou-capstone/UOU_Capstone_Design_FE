import React, { useCallback, useEffect, useState } from "react";
import { RefreshIcon } from "@/components/common/Icons";
import { formatKoreanDateTime } from "@/utils/dateFormat";
import {
  courseApi,
  type CourseDetail,
  type CourseJoinRequestListItem,
} from "@/services/api";
import { AttendanceSessionsPanel } from "@/features/courses/AttendanceSessionsPanel";
import { EnrolledStudentsPanel } from "@/features/courses/EnrolledStudentsPanel";

function formatJoinRequestInstant(iso: string | undefined): string {
  return formatKoreanDateTime(iso);
}

function extractJoinRequestErrorCode(message: string): string | null {
  const patterns = [
    /"code"\s*:\s*"([A-Z_]+)"/,
    /\b(FORBIDDEN|COURSE_NOT_FOUND|JOIN_REQUEST_NOT_FOUND|JOIN_REQUEST_ALREADY_PROCESSED|INVALID_PARAMETER)\b/,
  ];
  for (const p of patterns) {
    const m = p.exec(message);
    if (m?.[1]) return m[1];
  }
  return null;
}

interface TeacherStudentManagementPanelProps {
  courseId: number;
  lectures?: CourseDetail["lectures"];
  isDarkMode: boolean;
}

export const TeacherStudentManagementPanel: React.FC<
  TeacherStudentManagementPanelProps
> = ({ courseId, lectures, isDarkMode }) => {
  const [listPage, setListPage] = useState(0);
  const [rows, setRows] = useState<CourseJoinRequestListItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<number | null>(null);
  const [selectedRequestIds, setSelectedRequestIds] = useState<Record<number, boolean>>({});

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const pageRes = await courseApi.getCourseJoinRequests(courseId, {
        status: "PENDING",
        page: listPage,
        size: 20,
        sort: "createdAt,desc",
      });
      setRows(pageRes.content ?? []);
      setTotalPages(Math.max(pageRes.totalPages ?? 1, 1));
      setSelectedRequestIds({});
    } catch (e) {
      const raw =
        e instanceof Error ? e.message : "가입 요청 목록을 불러오지 못했습니다.";
      setError(raw);
      setRows([]);
      setSelectedRequestIds({});
    } finally {
      setLoading(false);
    }
  }, [courseId, listPage]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const handleJoinRequestAction = useCallback(
    async (
      action: "approve" | "reject" | "block",
      row: CourseJoinRequestListItem,
    ) => {
      const actionLabel =
        action === "approve" ? "승인" : action === "reject" ? "거절" : "차단";
      const suffix =
        action === "block"
          ? "\n차단하면 같은 강의실에 재요청할 수 없습니다."
          : "";
      const ok = window.confirm(
        `${row.studentName}(${row.studentEmail}) 학생 요청을 ${actionLabel}하시겠습니까?${suffix}`,
      );
      if (!ok) return;

      setActingId(row.requestId);
      try {
        if (action === "approve") {
          await courseApi.approveJoinRequest(courseId, row.requestId);
        } else if (action === "reject") {
          await courseApi.rejectJoinRequest(courseId, row.requestId);
        } else {
          await courseApi.blockJoinRequest(courseId, row.requestId);
        }
        setRows((prev) => prev.filter((it) => it.requestId !== row.requestId));
        setSelectedRequestIds((prev) => {
          const next = { ...prev };
          delete next[row.requestId];
          return next;
        });
      } catch (e) {
        const raw = e instanceof Error ? e.message : `${actionLabel} 처리에 실패했습니다.`;
        const code = extractJoinRequestErrorCode(raw);
        if (code === "JOIN_REQUEST_ALREADY_PROCESSED") {
          window.alert("이미 처리된 요청입니다. 목록을 새로고침합니다.");
          void loadList();
        } else {
          window.alert(raw);
        }
      } finally {
        setActingId(null);
      }
    },
    [courseId, loadList],
  );

  const selectedIds = rows
    .filter((row) => selectedRequestIds[row.requestId])
    .map((row) => row.requestId);

  const allChecked = rows.length > 0 && selectedIds.length === rows.length;
  const busy = loading || actingId != null;

  const toggleAll = (checked: boolean) => {
    if (!checked) {
      setSelectedRequestIds({});
      return;
    }
    const next: Record<number, boolean> = {};
    for (const row of rows) next[row.requestId] = true;
    setSelectedRequestIds(next);
  };

  const handleBulkJoinAction = useCallback(
    async (action: "approve" | "reject") => {
      if (selectedIds.length === 0) return;
      const label = action === "approve" ? "승인" : "거절";
      const ok = window.confirm(`선택한 가입 요청 ${selectedIds.length}건을 ${label}할까요?`);
      if (!ok) return;
      setActingId(-1);
      try {
        const result =
          action === "approve"
            ? await courseApi.approveJoinRequestsBulk(courseId, selectedIds)
            : await courseApi.rejectJoinRequestsBulk(courseId, selectedIds);
        window.alert(`${label} 완료: 성공 ${result.successCount ?? 0}건, 실패 ${result.failureCount ?? 0}건`);
        await loadList();
      } catch (e) {
        window.alert(e instanceof Error ? e.message : `일괄 ${label}에 실패했습니다.`);
      } finally {
        setActingId(null);
      }
    },
    [courseId, loadList, selectedIds],
  );

  const surfaceClass = isDarkMode
    ? "border-[#2b2b2b] bg-[#202020] text-gray-100"
    : "border-[#dedbd5] bg-white text-gray-900";
  const headerRowClass = isDarkMode
    ? "border-[#2b2b2b] bg-[#181818] text-gray-400"
    : "border-[#dedbd5] bg-[#f7f5f1] text-gray-500";
  const bodyDivideClass = isDarkMode ? "divide-[#2b2b2b]" : "divide-[#dedbd5]";
  const bodyRowClass = isDarkMode ? "bg-[#202020] text-gray-100" : "bg-white text-[#212121]";
  const secondaryButtonClass = isDarkMode
    ? "bg-zinc-700 text-white hover:bg-zinc-600"
    : "bg-gray-200 text-gray-800 hover:bg-gray-300";

  return (
    <div className="flex min-h-full flex-col gap-4 pb-6">
      <section className={`mb-3 flex shrink-0 flex-col rounded-2xl border px-5 py-5 lg:px-6 ${surfaceClass}`}>
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <h2 className="text-2xl font-semibold leading-tight">학생·출석 관리</h2>
            </div>
          </div>
        </div>
      </section>

      <div className="grid min-h-0 gap-4 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
      <section className={`order-2 rounded-xl border px-4 py-4 lg:order-2 lg:row-span-2 ${surfaceClass}`}>
        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-base font-semibold">수강 학생</h3>
          </div>
        </div>
        <EnrolledStudentsPanel courseId={courseId} isDarkMode={isDarkMode} />
      </section>

      <section className={`order-1 rounded-xl border px-4 py-4 lg:order-1 ${surfaceClass}`}>
        <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className="text-base font-semibold">가입 요청</h3>
          </div>
          <div className="flex flex-wrap items-center justify-start gap-2">
            <button
              type="button"
              onClick={() => toggleAll(!allChecked)}
              disabled={busy || rows.length === 0}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${secondaryButtonClass}`}
            >
              {allChecked ? "전체 해제" : "전체 선택"}
            </button>
            <button
              type="button"
              disabled={selectedIds.length === 0 || actingId != null}
              onClick={() => void handleBulkJoinAction("approve")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                isDarkMode ? "bg-white text-[#141414]" : "bg-[#141414] text-white hover:bg-black"
              }`}
            >
              선택 승인
            </button>
            <button
              type="button"
              disabled={selectedIds.length === 0 || actingId != null}
              onClick={() => void handleBulkJoinAction("reject")}
              className="rounded-lg bg-zinc-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-zinc-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              선택 거절
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void loadList()}
              aria-label="가입 요청 새로고침"
              title="새로고침"
              className={`inline-flex h-8 w-8 items-center justify-center rounded-full border text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                isDarkMode
                  ? "border-[#343434] text-zinc-200 hover:bg-white/10"
                  : "border-[#dedbd5] text-gray-700 hover:bg-[#f7f5f1]"
              }`}
            >
              <RefreshIcon className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm opacity-70">
            불러오는 중…
          </div>
        ) : error ? (
          <div className={`py-6 text-sm ${isDarkMode ? "text-red-400" : "text-red-600"}`}>{error}</div>
        ) : rows.length === 0 ? (
          <div className="py-12 text-center text-sm opacity-60">
            대기 중인 가입 요청이 없습니다.
          </div>
        ) : (
          <div
            className={`overflow-x-auto rounded-xl border ${
              isDarkMode ? "border-[#2b2b2b]" : "border-[#dedbd5]"
            }`}
          >
            <div
              className={`grid min-w-[58rem] grid-cols-[2.5rem_minmax(10rem,1.1fr)_minmax(5rem,0.45fr)_minmax(14rem,1.3fr)_minmax(12rem,1fr)_minmax(11rem,0.85fr)] items-center gap-3 border-b px-4 py-2 text-xs font-semibold ${headerRowClass}`}
            >
              <span />
              <span>학생 이름</span>
              <span>ID</span>
              <span>이메일</span>
              <span>요청 시각</span>
              <span>작업</span>
            </div>
            <ul className={`min-w-[58rem] divide-y ${bodyDivideClass}`}>
              {rows.map((row) => {
                const checked = !!selectedRequestIds[row.requestId];
                return (
                  <li
                    key={row.requestId}
                    className={`grid grid-cols-[2.5rem_minmax(10rem,1.1fr)_minmax(5rem,0.45fr)_minmax(14rem,1.3fr)_minmax(12rem,1fr)_minmax(11rem,0.85fr)] items-center gap-3 px-4 py-3 text-sm ${bodyRowClass}`}
                  >
                    <span>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) =>
                          setSelectedRequestIds((prev) => ({
                            ...prev,
                            [row.requestId]: e.target.checked,
                          }))
                        }
                        disabled={busy}
                        aria-label={`${row.studentName} 요청 선택`}
                      />
                    </span>
                    <span className="min-w-0 truncate font-semibold">
                      {row.studentName || "이름 없음"}
                    </span>
                    <span className="min-w-0 truncate font-mono text-xs tabular-nums opacity-80">
                      {row.studentId}
                    </span>
                    <span className={`min-w-0 truncate ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                      {row.studentEmail || "이메일 없음"}
                    </span>
                    <span className="min-w-0 truncate text-xs opacity-75">
                      {formatJoinRequestInstant(row.requestedAt)}
                    </span>
                    <span className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        disabled={actingId === row.requestId}
                        onClick={() => void handleJoinRequestAction("approve", row)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                          isDarkMode ? "bg-white text-[#141414]" : "bg-[#141414] text-white hover:bg-black"
                        }`}
                      >
                        승인
                      </button>
                      <button
                        type="button"
                        disabled={actingId === row.requestId}
                        onClick={() => void handleJoinRequestAction("reject", row)}
                        className="rounded-lg bg-zinc-500 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-zinc-600 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        거절
                      </button>
                      <button
                        type="button"
                        disabled={actingId === row.requestId}
                        onClick={() => void handleJoinRequestAction("block", row)}
                        className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        차단
                      </button>
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
              isDarkMode ? "border-[#2b2b2b]" : "border-[#dedbd5]"
            }`}
          >
            <button
              type="button"
              disabled={listPage <= 0 || loading}
              onClick={() => setListPage((p) => Math.max(0, p - 1))}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                listPage <= 0 || loading
                  ? "cursor-not-allowed opacity-40"
                  : secondaryButtonClass
              }`}
            >
              이전
            </button>
            <span className="text-xs opacity-70">
              {listPage + 1} / {totalPages}
            </span>
            <button
              type="button"
              disabled={listPage + 1 >= totalPages || loading}
              onClick={() =>
                setListPage((p) =>
                  Math.min(totalPages - 1, p + 1),
                )
              }
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                listPage + 1 >= totalPages || loading
                  ? "cursor-not-allowed opacity-40"
                  : secondaryButtonClass
              }`}
            >
              다음
            </button>
          </div>
        ) : null}
      </section>
      <div className="order-3 lg:order-3">
        <AttendanceSessionsPanel
          courseId={courseId}
          lectures={lectures}
          isDarkMode={isDarkMode}
          isTeacher
          embedded
        />
      </div>
      </div>
    </div>
  );
};
