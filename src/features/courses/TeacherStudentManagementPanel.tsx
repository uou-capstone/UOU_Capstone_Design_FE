import React, { useCallback, useEffect, useState } from "react";
import {
  courseApi,
  type CourseJoinRequestListItem,
  type CourseJoinRequestStatus,
} from "@/services/api";
import { EnrolledStudentsPanel } from "@/features/courses/EnrolledStudentsPanel";

function formatJoinRequestInstant(iso: string | undefined): string {
  if (iso == null || String(iso).trim() === "") return "—";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  return new Date(t).toLocaleString("ko-KR");
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

export type TeacherStudentMgmtTab = "enrolled" | "pending";

const LIST_STATUS: Record<TeacherStudentMgmtTab, CourseJoinRequestStatus> = {
  enrolled: "APPROVED",
  pending: "PENDING",
};

interface TeacherStudentManagementPanelProps {
  courseId: number;
  isDarkMode: boolean;
}

export const TeacherStudentManagementPanel: React.FC<
  TeacherStudentManagementPanelProps
> = ({ courseId, isDarkMode }) => {
  const [tab, setTab] = useState<TeacherStudentMgmtTab>("enrolled");
  const [listPage, setListPage] = useState(0);
  const [rows, setRows] = useState<CourseJoinRequestListItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<number | null>(null);

  const loadList = useCallback(async () => {
    if (tab === "enrolled") {
      setLoading(false);
      setError(null);
      setRows([]);
      setTotalPages(1);
      return;
    }
    setLoading(true);
    setError(null);
    const status = LIST_STATUS[tab];
    try {
      const pageRes = await courseApi.getCourseJoinRequests(courseId, {
        status,
        page: listPage,
        size: 20,
        sort: "createdAt,desc",
      });
      setRows(pageRes.content ?? []);
      setTotalPages(Math.max(pageRes.totalPages ?? 1, 1));
    } catch (e) {
      const raw =
        e instanceof Error ? e.message : "가입 요청 목록을 불러오지 못했습니다.";
      setError(raw);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [courseId, tab, listPage]);

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

  return (
    <div className="flex min-h-full flex-col pb-8">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button
          isDarkMode={isDarkMode}
          active={tab === "enrolled"}
          onClick={() => {
            setTab("enrolled");
            setListPage(0);
          }}
        >
          수강 학생
        </Button>
        <Button
          isDarkMode={isDarkMode}
          active={tab === "pending"}
          onClick={() => {
            setTab("pending");
            setListPage(0);
          }}
        >
          가입 요청
        </Button>
        <button
          type="button"
          disabled={loading}
          onClick={() => void loadList()}
          className={`rounded-full px-3 py-1.5 text-xs font-medium border cursor-pointer disabled:opacity-50 ${
            isDarkMode
              ? "border-zinc-600 text-zinc-200 hover:bg-zinc-800"
              : "border-gray-300 text-gray-700 hover:bg-gray-100"
          }`}
        >
          새로고침
        </button>
      </div>

      {tab === "enrolled" ? (
        <EnrolledStudentsPanel courseId={courseId} isDarkMode={isDarkMode} />
      ) : loading ? (
        <div className="text-sm opacity-70 py-12 text-center">
          불러오는 중…
        </div>
      ) : error ? (
        <div className={`text-sm py-6 ${isDarkMode ? "text-red-400" : "text-red-600"}`}>{error}</div>
      ) : rows.length === 0 ? (
        <div className="text-sm opacity-60 py-12 text-center">
          {tab === "enrolled" ? "등록된 수강 학생이 없습니다." : "대기 중인 가입 요청이 없습니다."}
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li
              key={row.requestId}
              className={`rounded-xl border px-4 py-3 ${
                isDarkMode ? "border-zinc-600 bg-zinc-800/60" : "border-gray-200 bg-white"
              }`}
            >
              <div className="text-sm font-medium">{row.studentName}</div>
              <div className={`text-xs mt-0.5 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                {row.studentEmail}
              </div>
              <div className={`text-xs mt-1 opacity-70`}>
                요청 시각: {formatJoinRequestInstant(row.requestedAt)}
              </div>
              {tab === "pending" ? (
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    disabled={actingId === row.requestId}
                    onClick={() => void handleJoinRequestAction("approve", row)}
                    className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-50 cursor-pointer"
                  >
                    승인
                  </button>
                  <button
                    type="button"
                    disabled={actingId === row.requestId}
                    onClick={() => void handleJoinRequestAction("reject", row)}
                    className="rounded-lg bg-zinc-500 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-50 cursor-pointer"
                  >
                    거절
                  </button>
                  <button
                    type="button"
                    disabled={actingId === row.requestId}
                    onClick={() => void handleJoinRequestAction("block", row)}
                    className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-50 cursor-pointer"
                  >
                    차단
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 ? (
        <div
          className={`mt-6 flex flex-wrap items-center justify-between gap-2 border-t pt-4 ${
            isDarkMode ? "border-zinc-700" : "border-gray-200"
          }`}
        >
          <button
            type="button"
            disabled={listPage <= 0 || loading}
            onClick={() => setListPage((p) => Math.max(0, p - 1))}
            className="rounded-lg border px-3 py-1.5 text-xs disabled:opacity-50 cursor-pointer"
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
            className="rounded-lg border px-3 py-1.5 text-xs disabled:opacity-50 cursor-pointer"
          >
            다음
          </button>
        </div>
      ) : null}
    </div>
  );
};

const Button = ({
  isDarkMode,
  active,
  onClick,
  children,
}: {
  isDarkMode: boolean;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
      active
        ? isDarkMode
          ? "bg-[#FFFFFF] text-[#141414]"
          : "bg-[#141414] text-white"
        : isDarkMode
          ? "bg-white/10 text-gray-300 hover:bg-white/15"
          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
    }`}
  >
    {children}
  </button>
);
