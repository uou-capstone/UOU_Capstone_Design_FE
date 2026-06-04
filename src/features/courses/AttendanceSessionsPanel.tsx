import React from "react";
import { RefreshIcon } from "@/components/common/Icons";
import { formatKoreanDateTime } from "@/utils/dateFormat";
import {
  courseApi,
  type AttendanceRecord,
  type AttendanceSession,
  type AttendanceSessionPayload,
  type AttendanceStatus,
  type CourseDetail,
  type CourseAttendanceMatrix,
  type LocalTimeDto,
  type StudentAttendanceSummary,
} from "@/services/api";

interface AttendanceSessionsPanelProps {
  courseId: number;
  lectures?: CourseDetail["lectures"];
  isDarkMode: boolean;
  isTeacher: boolean;
  embedded?: boolean;
}

type SessionFormState = {
  title: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  lectureId: string;
};

const PAGE_SIZE = 12;

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function todayYmd(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

function createEmptyForm(): SessionFormState {
  return {
    title: "",
    sessionDate: todayYmd(),
    startTime: "09:00",
    endTime: "10:00",
    lectureId: "",
  };
}

function localTimeToInput(time: LocalTimeDto | undefined): string {
  return `${pad2(Number(time?.hour ?? 0))}:${pad2(Number(time?.minute ?? 0))}`;
}

function timeInputToRequestTime(value: string): string {
  const [hour = "0", minute = "0"] = value.split(":");
  return `${pad2(Number(hour) || 0)}:${pad2(Number(minute) || 0)}:00`;
}

function formatDate(value: string): string {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

function formatInstant(value: string | undefined): string {
  return formatKoreanDateTime(value);
}

function formatTimeRange(session: AttendanceSession): string {
  return `${localTimeToInput(session.startTime)} - ${localTimeToInput(session.endTime)}`;
}

function lectureLabel(
  lectures: CourseDetail["lectures"] | undefined,
  lectureId: number | null | undefined,
): string {
  if (lectureId == null) return "강의 연결 없음";
  const lecture = lectures?.find((item) => item.lectureId === lectureId);
  if (!lecture) return `강의 ID ${lectureId}`;
  const week = Number.isFinite(lecture.weekNumber) ? `${lecture.weekNumber}주차` : "강의";
  return `${week} · ${lecture.title}`;
}

function formFromSession(session: AttendanceSession): SessionFormState {
  return {
    title: session.title,
    sessionDate: session.sessionDate || todayYmd(),
    startTime: localTimeToInput(session.startTime),
    endTime: localTimeToInput(session.endTime),
    lectureId: session.lectureId == null ? "" : String(session.lectureId),
  };
}

function formToPayload(form: SessionFormState): AttendanceSessionPayload {
  const parsedLectureId = form.lectureId === "" ? null : Number(form.lectureId);
  return {
    title: form.title.trim(),
    sessionDate: form.sessionDate,
    startTime: timeInputToRequestTime(form.startTime),
    endTime: timeInputToRequestTime(form.endTime),
    lectureId:
      typeof parsedLectureId === "number" &&
      Number.isFinite(parsedLectureId) &&
      parsedLectureId > 0
        ? parsedLectureId
        : null,
  };
}

export const AttendanceSessionsPanel: React.FC<AttendanceSessionsPanelProps> = ({
  courseId,
  isDarkMode,
  isTeacher,
  embedded = false,
  ...rest
}) => {
  if (!isTeacher) {
    return <StudentAttendanceSummaryPanel courseId={courseId} isDarkMode={isDarkMode} />;
  }
  return (
    <TeacherAttendanceSessionsPanel
      courseId={courseId}
      isDarkMode={isDarkMode}
      isTeacher={isTeacher}
      embedded={embedded}
      {...rest}
    />
  );
};

const TeacherAttendanceSessionsPanel: React.FC<AttendanceSessionsPanelProps> = ({
  courseId,
  lectures,
  isDarkMode,
  embedded = false,
}) => {
  const [page, setPage] = React.useState(0);
  const [sessions, setSessions] = React.useState<AttendanceSession[]>([]);
  const [totalPages, setTotalPages] = React.useState(1);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<number | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<SessionFormState>(() => createEmptyForm());
  const [editingSessionId, setEditingSessionId] = React.useState<number | null>(null);
  const [selectedSession, setSelectedSession] =
    React.useState<AttendanceSession | null>(null);
  const [records, setRecords] = React.useState<AttendanceRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = React.useState(false);
  const [recordsSaving, setRecordsSaving] = React.useState(false);
  const [matrix, setMatrix] = React.useState<CourseAttendanceMatrix | null>(null);
  const [matrixLoading, setMatrixLoading] = React.useState(false);

  const sortedLectures = React.useMemo(
    () =>
      [...(lectures ?? [])].sort((a, b) => {
        const weekDiff = (a.weekNumber ?? 0) - (b.weekNumber ?? 0);
        if (weekDiff !== 0) return weekDiff;
        return a.title.localeCompare(b.title, "ko-KR");
      }),
    [lectures],
  );

  const loadSessions = React.useCallback(
    async (targetPage: number) => {
      setLoading(true);
      setError(null);
      try {
        const res = await courseApi.getAttendanceSessions(courseId, {
          page: targetPage,
          size: PAGE_SIZE,
          sort: "sessionDate,desc",
        });
        setSessions(Array.isArray(res.content) ? res.content : []);
        setTotalPages(Math.max(res.totalPages ?? 1, 1));
      } catch (err) {
        setSessions([]);
        setTotalPages(1);
        setError(
          err instanceof Error
            ? err.message
            : "출석 회차 목록을 불러오지 못했습니다.",
        );
      } finally {
        setLoading(false);
      }
    },
    [courseId],
  );

  const loadMatrix = React.useCallback(async () => {
    setMatrixLoading(true);
    try {
      const res = await courseApi.getAttendanceMatrix(courseId, {
        page: 0,
        size: 20,
        sort: "name,asc",
      });
      setMatrix(res);
    } catch {
      setMatrix(null);
    } finally {
      setMatrixLoading(false);
    }
  }, [courseId]);

  const loadRecords = React.useCallback(
    async (sessionId: number) => {
      setRecordsLoading(true);
      setError(null);
      try {
        setRecords(await courseApi.getAttendanceRecords(courseId, sessionId));
      } catch (err) {
        setRecords([]);
        setError(
          err instanceof Error
            ? err.message
            : "출석 record를 불러오지 못했습니다.",
        );
      } finally {
        setRecordsLoading(false);
      }
    },
    [courseId],
  );

  React.useEffect(() => {
    void loadSessions(page);
  }, [loadSessions, page]);

  React.useEffect(() => {
    void loadMatrix();
  }, [loadMatrix]);

  React.useEffect(() => {
    setPage(0);
    setForm(createEmptyForm());
    setEditingSessionId(null);
    setSelectedSession(null);
    setRecords([]);
    setMatrix(null);
  }, [courseId]);

  const resetForm = React.useCallback(() => {
    setForm(createEmptyForm());
    setEditingSessionId(null);
  }, []);

  const handleSubmit = React.useCallback(async () => {
    if (!form.title.trim()) {
      window.alert("출석 회차 제목을 입력해주세요.");
      return;
    }
    if (!form.sessionDate) {
      window.alert("출석 날짜를 선택해주세요.");
      return;
    }
    if (!form.startTime || !form.endTime) {
      window.alert("시작 시간과 종료 시간을 입력해주세요.");
      return;
    }
    if (form.endTime <= form.startTime) {
      window.alert("종료 시간은 시작 시간보다 늦어야 합니다.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload = formToPayload(form);
      const saved =
        editingSessionId == null
          ? await courseApi.createAttendanceSession(courseId, payload)
          : await courseApi.updateAttendanceSession(courseId, editingSessionId, payload);
      setSelectedSession(saved);
      resetForm();
      if (editingSessionId == null && page !== 0) {
        setPage(0);
      } else {
        await loadSessions(editingSessionId == null ? 0 : page);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "출석 회차 저장에 실패했습니다.",
      );
    } finally {
      setSaving(false);
    }
  }, [courseId, editingSessionId, form, loadSessions, page, resetForm]);

  const handleInspect = React.useCallback(
    async (session: AttendanceSession) => {
      setSelectedSession(session);
      setDetailLoading(true);
      setError(null);
      try {
        const detail = await courseApi.getAttendanceSession(courseId, session.sessionId);
        setSelectedSession(detail);
        await loadRecords(detail.sessionId);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "출석 회차 상세를 불러오지 못했습니다.",
        );
      } finally {
        setDetailLoading(false);
      }
    },
    [courseId, loadRecords],
  );

  const handleEdit = React.useCallback((session: AttendanceSession) => {
    setEditingSessionId(session.sessionId);
    setForm(formFromSession(session));
    setSelectedSession(session);
  }, []);

  const handleDelete = React.useCallback(
    async (session: AttendanceSession) => {
      const ok = window.confirm(
        `"${session.title}" 출석 회차를 삭제할까요?\n연결된 출석 기록도 함께 삭제됩니다.`,
      );
      if (!ok) return;

      setDeletingId(session.sessionId);
      setError(null);
      try {
        await courseApi.deleteAttendanceSession(courseId, session.sessionId);
        if (selectedSession?.sessionId === session.sessionId) {
          setSelectedSession(null);
        }
        if (editingSessionId === session.sessionId) {
          resetForm();
        }
        const nextPage = sessions.length === 1 && page > 0 ? page - 1 : page;
        if (nextPage !== page) setPage(nextPage);
        await loadSessions(nextPage);
        await loadMatrix();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "출석 회차 삭제에 실패했습니다.",
        );
      } finally {
        setDeletingId(null);
      }
    },
    [
      courseId,
      editingSessionId,
      loadMatrix,
      loadSessions,
      page,
      resetForm,
      selectedSession?.sessionId,
      sessions.length,
    ],
  );

  const setRecordStatus = (studentId: number, status: AttendanceStatus) => {
    setRecords((prev) =>
      prev.map((record) =>
        record.studentId === studentId ? { ...record, status } : record,
      ),
    );
  };

  const setRecordNote = (studentId: number, note: string) => {
    setRecords((prev) =>
      prev.map((record) =>
        record.studentId === studentId ? { ...record, note } : record,
      ),
    );
  };

  const saveRecords = React.useCallback(async () => {
    if (!selectedSession) return;
    setRecordsSaving(true);
    setError(null);
    try {
      await courseApi.saveAttendanceRecords(
        courseId,
        selectedSession.sessionId,
        records.map((record) => ({
          studentId: record.studentId,
          status: record.status,
          note: record.note,
        })),
      );
      await loadRecords(selectedSession.sessionId);
      await loadMatrix();
    } catch (err) {
      setError(err instanceof Error ? err.message : "출석부 저장에 실패했습니다.");
    } finally {
      setRecordsSaving(false);
    }
  }, [courseId, loadMatrix, loadRecords, records, selectedSession]);

  const surfaceClass = isDarkMode
    ? "border-[#2b2b2b] bg-[#202020] text-gray-100"
    : "border-[#dedbd5] bg-white text-gray-900";
  const softSurfaceClass = isDarkMode
    ? "border-[#2b2b2b] bg-white/[0.04]"
    : "border-[#dedbd5] bg-[#fbfaf7]";
  const mutedTextClass = isDarkMode ? "text-gray-400" : "text-gray-500";
  const inputClass = `h-10 rounded-lg border px-3 text-sm outline-none transition-colors focus:ring-1 disabled:opacity-60 ${
    isDarkMode
      ? "border-[#343434] bg-[#181818] text-gray-100 placeholder:text-gray-500 focus:border-[#ffad9b] focus:ring-[#ffad9b]/20"
      : "border-[#dedbd5] bg-white text-gray-900 placeholder:text-gray-400 focus:border-[#ff824d] focus:ring-[#ff824d]/20"
  }`;
  const labelClass = `text-xs font-semibold ${mutedTextClass}`;
  const busy = loading || saving || detailLoading || deletingId != null;

  if (embedded) {
    return (
      <section className={`rounded-xl border ${surfaceClass}`}>
        <div className="flex flex-col gap-3 border-b border-inherit px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold">출석 관리</h3>
            <button
              type="button"
              onClick={() => void loadSessions(page)}
              disabled={busy}
              aria-label="새로고침"
              title="새로고침"
              className={`inline-flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold transition-colors disabled:opacity-50 ${
                isDarkMode
                  ? "border-[#343434] text-gray-200 hover:bg-white/10"
                  : "border-[#dedbd5] text-gray-700 hover:bg-[#f7f5f1]"
              }`}
            >
              <RefreshIcon className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
            </button>
          </div>

          <form
            className="grid gap-3 xl:grid-cols-[1.2fr_0.9fr_0.7fr_0.7fr_1fr_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSubmit();
            }}
          >
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className={labelClass}>회차 제목</span>
              <input
                className={inputClass}
                value={form.title}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, title: event.target.value }))
                }
                placeholder="예: 5주차 출석"
                disabled={saving}
              />
            </label>
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className={labelClass}>출석 날짜</span>
              <input
                className={inputClass}
                type="date"
                value={form.sessionDate}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, sessionDate: event.target.value }))
                }
                disabled={saving}
              />
            </label>
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className={labelClass}>시작</span>
              <input
                className={inputClass}
                type="time"
                value={form.startTime}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, startTime: event.target.value }))
                }
                disabled={saving}
              />
            </label>
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className={labelClass}>종료</span>
              <input
                className={inputClass}
                type="time"
                value={form.endTime}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, endTime: event.target.value }))
                }
                disabled={saving}
              />
            </label>
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className={labelClass}>연결 강의</span>
              <select
                className={inputClass}
                value={form.lectureId}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, lectureId: event.target.value }))
                }
                disabled={saving}
              >
                <option value="">강의 연결 안 함</option>
                {sortedLectures.map((lecture) => (
                  <option key={lecture.lectureId} value={lecture.lectureId}>
                    {lecture.weekNumber}주차 · {lecture.title}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end gap-2">
              <button
                type="submit"
                disabled={saving}
                className={`h-10 rounded-lg px-4 text-sm font-semibold transition-colors disabled:opacity-50 ${
                  isDarkMode ? "bg-white text-[#141414]" : "bg-[#141414] text-white hover:bg-black"
                }`}
              >
                {saving
                  ? "저장 중"
                  : editingSessionId == null
                    ? "회차 생성"
                    : "수정 저장"}
              </button>
              {editingSessionId != null ? (
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={saving}
                  className={`h-10 rounded-lg border px-4 text-sm font-semibold transition-colors disabled:opacity-50 ${
                    isDarkMode
                      ? "border-[#343434] text-gray-200 hover:bg-white/10"
                      : "border-[#dedbd5] text-gray-700 hover:bg-[#f7f5f1]"
                  }`}
                >
                  취소
                </button>
              ) : null}
            </div>
          </form>
        </div>

        {error ? (
          <div
            className={`border-b border-inherit px-4 py-3 text-sm ${
              isDarkMode ? "text-red-300" : "text-red-600"
            }`}
          >
            {error}
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-3 border-b border-inherit px-4 py-3">
          <h4 className="text-sm font-semibold">출석 회차 목록</h4>
          <span className={`text-xs ${mutedTextClass}`}>
            {page + 1} / {totalPages}
          </span>
        </div>

        {loading ? (
          <div className={`px-5 py-12 text-center text-sm ${mutedTextClass}`}>
            불러오는 중...
          </div>
        ) : sessions.length === 0 ? (
          <div className={`px-5 py-12 text-center text-sm ${mutedTextClass}`}>
            등록된 출석 회차가 없습니다.
          </div>
        ) : (
          <ul className="divide-y divide-inherit">
            {sessions.map((session) => {
              const selected = selectedSession?.sessionId === session.sessionId;
              const editing = editingSessionId === session.sessionId;
              return (
                <li
                  key={session.sessionId}
                  className={`px-4 py-3 transition-colors ${
                    selected
                      ? isDarkMode
                        ? "bg-white/[0.06]"
                        : "bg-gray-100"
                      : ""
                  }`}
                >
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                    <button
                      type="button"
                      onClick={() => setSelectedSession(session)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="truncate text-sm font-semibold">{session.title}</h4>
                        {editing ? (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              isDarkMode ? "bg-white/10 text-gray-100" : "bg-gray-100 text-gray-900"
                            }`}
                          >
                            수정 중
                          </span>
                        ) : null}
                      </div>
                      <div className={`mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs ${mutedTextClass}`}>
                        <span>{formatDate(session.sessionDate)}</span>
                        <span>{formatTimeRange(session)}</span>
                        <span>{lectureLabel(lectures, session.lectureId)}</span>
                      </div>
                      <div className={`mt-1 text-[11px] ${mutedTextClass}`}>
                        생성: {formatInstant(session.createdAt)}
                      </div>
                    </button>

                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <ActionButton
                        isDarkMode={isDarkMode}
                        onClick={() => handleEdit(session)}
                        disabled={saving}
                      >
                        수정
                      </ActionButton>
                      <ActionButton
                        isDarkMode={isDarkMode}
                        danger
                        onClick={() => void handleDelete(session)}
                        disabled={deletingId === session.sessionId}
                      >
                        {deletingId === session.sessionId ? "삭제 중" : "삭제"}
                      </ActionButton>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {totalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-inherit px-4 py-3">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(0, prev - 1))}
              disabled={page <= 0 || loading}
              className={`h-9 rounded-lg border px-4 text-xs font-semibold transition-colors disabled:opacity-50 ${
                isDarkMode
                  ? "border-[#343434] text-gray-200 hover:bg-white/10"
                  : "border-[#dedbd5] text-gray-700 hover:bg-[#f7f5f1]"
              }`}
            >
              이전
            </button>
            <span className={`text-xs ${mutedTextClass}`}>
              {page + 1} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(totalPages - 1, prev + 1))}
              disabled={page + 1 >= totalPages || loading}
              className={`h-9 rounded-lg border px-4 text-xs font-semibold transition-colors disabled:opacity-50 ${
                isDarkMode
                  ? "border-[#343434] text-gray-200 hover:bg-white/10"
                  : "border-[#dedbd5] text-gray-700 hover:bg-[#f7f5f1]"
              }`}
            >
              다음
            </button>
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <div className="flex min-h-0 flex-col gap-3 pb-4">
      <section className={`mb-3 flex shrink-0 flex-col rounded-2xl border px-5 py-5 lg:px-6 ${surfaceClass}`}>
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <h2 className="text-2xl font-semibold leading-tight">출석 회차 관리</h2>
            </div>
            <button
              type="button"
              onClick={() => void loadSessions(page)}
              disabled={busy}
              aria-label="새로고침"
              title="새로고침"
              className={`inline-flex h-9 w-9 items-center justify-center rounded-full border text-xs font-semibold transition-colors disabled:opacity-50 ${
                isDarkMode
                  ? "border-zinc-600 text-gray-200 hover:bg-white/10"
                  : "border-gray-300 text-gray-700 hover:bg-gray-100"
              }`}
            >
              <RefreshIcon className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
            </button>
          </div>

          <form
            className="grid gap-3 lg:grid-cols-[1.2fr_0.9fr_0.7fr_0.7fr_1fr_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSubmit();
            }}
          >
          <label className="flex min-w-0 flex-col gap-1.5">
            <span className={labelClass}>회차 제목</span>
            <input
              className={inputClass}
              value={form.title}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, title: event.target.value }))
              }
              placeholder="예: 5주차 출석"
              disabled={saving}
            />
          </label>
          <label className="flex min-w-0 flex-col gap-1.5">
            <span className={labelClass}>출석 날짜</span>
            <input
              className={inputClass}
              type="date"
              value={form.sessionDate}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, sessionDate: event.target.value }))
              }
              disabled={saving}
            />
          </label>
          <label className="flex min-w-0 flex-col gap-1.5">
            <span className={labelClass}>시작</span>
            <input
              className={inputClass}
              type="time"
              value={form.startTime}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, startTime: event.target.value }))
              }
              disabled={saving}
            />
          </label>
          <label className="flex min-w-0 flex-col gap-1.5">
            <span className={labelClass}>종료</span>
            <input
              className={inputClass}
              type="time"
              value={form.endTime}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, endTime: event.target.value }))
              }
              disabled={saving}
            />
          </label>
          <label className="flex min-w-0 flex-col gap-1.5">
            <span className={labelClass}>연결 강의</span>
            <select
              className={inputClass}
              value={form.lectureId}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, lectureId: event.target.value }))
              }
              disabled={saving}
            >
              <option value="">강의 연결 안 함</option>
              {sortedLectures.map((lecture) => (
                <option key={lecture.lectureId} value={lecture.lectureId}>
                  {lecture.weekNumber}주차 · {lecture.title}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end gap-2">
            <button
              type="submit"
              disabled={saving}
              className={`h-10 rounded-lg px-4 text-sm font-semibold transition-colors disabled:opacity-50 ${
                isDarkMode ? "bg-white text-[#141414]" : "bg-[#141414] text-white hover:bg-black"
              }`}
            >
              {saving
                ? "저장 중"
                : editingSessionId == null
                  ? "회차 생성"
                  : "수정 저장"}
            </button>
            {editingSessionId != null ? (
              <button
                type="button"
                onClick={resetForm}
                disabled={saving}
                className={`h-10 rounded-lg border px-4 text-sm font-semibold transition-colors disabled:opacity-50 ${
                  isDarkMode
                    ? "border-zinc-600 text-gray-200 hover:bg-white/10"
                    : "border-gray-300 text-gray-700 hover:bg-gray-100"
                }`}
              >
                취소
              </button>
            ) : null}
          </div>
        </form>

        <p className={`text-xs ${mutedTextClass}`}>
          회차를 생성하면 활성 수강생 전체에 결석 기록이 자동으로 생성됩니다.
        </p>
        </div>
      </section>

      {error ? (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            isDarkMode
              ? "border-red-500/30 bg-red-500/10 text-red-200"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {error}
        </div>
      ) : null}

      <section className={`rounded-xl border ${surfaceClass}`}>
        <div className="flex flex-col gap-2 border-b border-inherit px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold">출석 회차 목록</h3>
            <p className={`mt-1 text-xs ${mutedTextClass}`}>
              날짜 기준 최신 회차부터 표시됩니다.
            </p>
          </div>
          <span className={`text-xs ${mutedTextClass}`}>
            {page + 1} / {totalPages}
          </span>
        </div>

        {loading ? (
          <div className={`px-5 py-16 text-center text-sm ${mutedTextClass}`}>
            출석 회차를 불러오는 중입니다.
          </div>
        ) : sessions.length === 0 ? (
          <div className={`px-5 py-16 text-center text-sm ${mutedTextClass}`}>
            등록된 출석 회차가 없습니다.
          </div>
        ) : (
          <ul className="divide-y divide-inherit">
            {sessions.map((session) => {
              const selected = selectedSession?.sessionId === session.sessionId;
              const editing = editingSessionId === session.sessionId;
              return (
                <li
                  key={session.sessionId}
                  className={`px-4 py-3 transition-colors ${
                    selected
                      ? isDarkMode
                        ? "bg-white/[0.06]"
                        : "bg-gray-100"
                      : ""
                  }`}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <button
                      type="button"
                      onClick={() => void handleInspect(session)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="truncate text-sm font-semibold">{session.title}</h4>
                        {editing ? (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              isDarkMode ? "bg-white/10 text-gray-100" : "bg-gray-100 text-gray-900"
                            }`}
                          >
                            수정 중
                          </span>
                        ) : null}
                      </div>
                      <div className={`mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs ${mutedTextClass}`}>
                        <span>{formatDate(session.sessionDate)}</span>
                        <span>{formatTimeRange(session)}</span>
                        <span>{lectureLabel(lectures, session.lectureId)}</span>
                      </div>
                      <div className={`mt-1 text-[11px] ${mutedTextClass}`}>
                        생성: {formatInstant(session.createdAt)}
                      </div>
                    </button>

                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <ActionButton
                        isDarkMode={isDarkMode}
                        onClick={() => void handleInspect(session)}
                        disabled={detailLoading}
                      >
                        상세
                      </ActionButton>
                      <ActionButton
                        isDarkMode={isDarkMode}
                        onClick={() => handleEdit(session)}
                        disabled={saving}
                      >
                        수정
                      </ActionButton>
                      <ActionButton
                        isDarkMode={isDarkMode}
                        danger
                        onClick={() => void handleDelete(session)}
                        disabled={deletingId === session.sessionId}
                      >
                        {deletingId === session.sessionId ? "삭제 중" : "삭제"}
                      </ActionButton>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {totalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-inherit px-4 py-3">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(0, prev - 1))}
              disabled={page <= 0 || loading}
              className={`h-9 rounded-lg border px-4 text-xs font-semibold transition-colors disabled:opacity-50 ${
                isDarkMode
                  ? "border-zinc-600 text-gray-200 hover:bg-white/10"
                  : "border-gray-300 text-gray-700 hover:bg-gray-100"
              }`}
            >
              이전
            </button>
            <span className={`text-xs ${mutedTextClass}`}>
              {page + 1} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(totalPages - 1, prev + 1))}
              disabled={page + 1 >= totalPages || loading}
              className={`h-9 rounded-lg border px-4 text-xs font-semibold transition-colors disabled:opacity-50 ${
                isDarkMode
                  ? "border-zinc-600 text-gray-200 hover:bg-white/10"
                  : "border-gray-300 text-gray-700 hover:bg-gray-100"
              }`}
            >
              다음
            </button>
          </div>
        ) : null}
      </section>

      {selectedSession ? (
        <section className={`rounded-xl border px-4 py-4 ${softSurfaceClass}`}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className={`text-xs font-semibold uppercase tracking-wide ${mutedTextClass}`}>
                Selected Session
              </p>
              <h3 className="mt-1 text-base font-semibold">{selectedSession.title}</h3>
              <p className={`mt-2 text-sm ${mutedTextClass}`}>
                {formatDate(selectedSession.sessionDate)} · {formatTimeRange(selectedSession)}
              </p>
            </div>
            <div className={`grid gap-2 text-xs ${mutedTextClass} sm:grid-cols-2 lg:min-w-[28rem]`}>
              <span>연결 강의: {lectureLabel(lectures, selectedSession.lectureId)}</span>
              <span>회차 ID: {selectedSession.sessionId}</span>
              <span>생성: {formatInstant(selectedSession.createdAt)}</span>
              <span>수정: {formatInstant(selectedSession.updatedAt)}</span>
            </div>
          </div>
          {detailLoading ? (
            <p className={`mt-3 text-xs ${mutedTextClass}`}>상세 정보를 갱신하는 중입니다.</p>
          ) : null}
        </section>
      ) : null}

      {selectedSession ? (
        <section className={`rounded-xl border ${surfaceClass}`}>
          <div className="flex flex-col gap-2 border-b border-inherit px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-semibold">회차별 출석부</h3>
              <p className={`mt-1 text-xs ${mutedTextClass}`}>
                학생별 출석 상태와 메모를 일괄 저장합니다.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void loadRecords(selectedSession.sessionId)}
                disabled={recordsLoading}
                aria-label="새로고침"
                title="새로고침"
                className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-semibold ${
                  isDarkMode ? "border-zinc-600" : "border-gray-300"
                }`}
              >
                <RefreshIcon className={`h-4 w-4 ${recordsLoading ? "animate-spin" : ""}`} />
              </button>
              <button
                type="button"
                onClick={() => void saveRecords()}
                disabled={recordsSaving || recordsLoading || records.length === 0}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${
                  isDarkMode ? "bg-white text-[#141414]" : "bg-[#141414] text-white"
                }`}
              >
                {recordsSaving ? "저장 중" : "출석부 저장"}
              </button>
            </div>
          </div>
          {recordsLoading ? (
            <div className={`px-5 py-12 text-center text-sm ${mutedTextClass}`}>
              출석부를 불러오는 중입니다.
            </div>
          ) : records.length === 0 ? (
            <div className={`px-5 py-12 text-center text-sm ${mutedTextClass}`}>
              이 회차의 출석 record가 없습니다.
            </div>
          ) : (
            <ul className="divide-y divide-inherit">
              {records.map((record) => (
                <li key={record.studentId} className="px-4 py-3">
                  <div className="grid gap-3 lg:grid-cols-[1fr_11rem_1.4fr] lg:items-center">
                    <div>
                      <p className="text-sm font-semibold">{record.studentName}</p>
                      <p className={`mt-1 text-xs ${mutedTextClass}`}>
                        student #{record.studentId} · {record.markedAt ? formatInstant(record.markedAt) : "미기록"}
                      </p>
                    </div>
                    <select
                      className={inputClass}
                      value={record.status}
                      onChange={(event) =>
                        setRecordStatus(record.studentId, event.target.value as AttendanceStatus)
                      }
                    >
                      <option value="PRESENT">출석</option>
                      <option value="LATE">지각</option>
                      <option value="ABSENT">결석</option>
                      <option value="EXCUSED">공결</option>
                    </select>
                    <input
                      className={inputClass}
                      value={record.note ?? ""}
                      onChange={(event) => setRecordNote(record.studentId, event.target.value)}
                      placeholder="메모"
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <section className={`rounded-xl border ${surfaceClass}`}>
        <div className="flex items-center justify-between border-b border-inherit px-4 py-3">
          <div>
            <h3 className="text-base font-semibold">출석 매트릭스</h3>
            <p className={`mt-1 text-xs ${mutedTextClass}`}>
              회차별 전체 학생 출석 현황입니다.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadMatrix()}
            disabled={matrixLoading}
            aria-label="새로고침"
            title="새로고침"
            className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-semibold ${
              isDarkMode ? "border-zinc-600" : "border-gray-300"
            }`}
          >
            <RefreshIcon className={`h-4 w-4 ${matrixLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
        {matrixLoading ? (
          <div className={`px-5 py-12 text-center text-sm ${mutedTextClass}`}>
            출석 매트릭스를 불러오는 중입니다.
          </div>
        ) : matrix == null || matrix.students.content.length === 0 ? (
          <div className={`px-5 py-12 text-center text-sm ${mutedTextClass}`}>
            표시할 출석 매트릭스가 없습니다.
          </div>
        ) : (
          <div className="overflow-x-auto px-4 py-3">
            <table className="min-w-full text-left text-xs">
              <thead className={mutedTextClass}>
                <tr>
                  <th className="min-w-36 py-2 pr-4 font-semibold">학생</th>
                  {matrix.sessions.map((session) => (
                    <th key={session.sessionId} className="min-w-28 px-3 py-2 font-semibold">
                      <span className="block truncate">{session.title}</span>
                      <span className="block text-[11px] opacity-70">{session.sessionDate}</span>
                    </th>
                  ))}
                  <th className="min-w-20 px-3 py-2 font-semibold">출석률</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-inherit">
                {matrix.students.content.map((row) => (
                  <tr key={row.studentId}>
                    <td className="py-3 pr-4 font-semibold">{row.name}</td>
                    {matrix.sessions.map((session) => (
                      <td key={session.sessionId} className="px-3 py-3">
                        <AttendanceStatusPill status={row.records[String(session.sessionId)]} />
                      </td>
                    ))}
                    <td className="px-3 py-3 font-semibold">
                      {Math.round((row.presentRatio ?? 0) * 100)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

function ActionButton({
  isDarkMode,
  danger = false,
  disabled,
  onClick,
  children,
}: {
  isDarkMode: boolean;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const normalClass = isDarkMode
    ? "border-zinc-600 text-gray-200 hover:bg-white/10"
    : "border-gray-300 text-gray-700 hover:bg-gray-100";
  const dangerClass = isDarkMode
    ? "border-red-500/40 text-red-300 hover:bg-red-500/10"
    : "border-red-200 text-red-600 hover:bg-red-50";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`h-9 rounded-lg border px-3 text-xs font-semibold transition-colors disabled:opacity-50 ${
        danger ? dangerClass : normalClass
      }`}
    >
      {children}
    </button>
  );
}

function AttendanceStatusPill({ status }: { status: AttendanceStatus | undefined }) {
  const value = status ?? "ABSENT";
  const label: Record<AttendanceStatus, string> = {
    PRESENT: "출석",
    LATE: "지각",
    ABSENT: "결석",
    EXCUSED: "공결",
  };
  const color: Record<AttendanceStatus, string> = {
    PRESENT: "bg-emerald-500/15 text-emerald-500",
    LATE: "bg-amber-500/15 text-amber-500",
    ABSENT: "bg-red-500/15 text-red-500",
    EXCUSED: "bg-sky-500/15 text-sky-500",
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${color[value]}`}>
      {label[value]}
    </span>
  );
}

function StudentAttendanceSummaryPanel({
  courseId,
  isDarkMode,
}: {
  courseId: number;
  isDarkMode: boolean;
}) {
  const [summary, setSummary] = React.useState<StudentAttendanceSummary | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSummary(await courseApi.getMyAttendanceSummary(courseId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "내 출석 요약을 불러오지 못했습니다.");
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const surfaceClass = isDarkMode
    ? "border-zinc-800 bg-[#171b20] text-gray-100"
    : "border-gray-200 bg-white text-gray-900";
  const mutedClass = isDarkMode ? "text-gray-400" : "text-gray-500";
  const ratio = Math.round((summary?.presentRatio ?? 0) * 100);

  return (
    <div className="flex min-h-0 flex-col gap-3 pb-4">
      <section className={`mb-3 flex shrink-0 flex-col rounded-2xl border px-5 py-5 lg:px-6 ${surfaceClass}`}>
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <h2 className="text-2xl font-semibold leading-tight">내 출석 요약</h2>
            </div>
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              aria-label="새로고침"
              title="새로고침"
              className={`inline-flex h-9 w-9 items-center justify-center rounded-full border text-xs font-semibold ${
                isDarkMode ? "border-zinc-600" : "border-gray-300"
              }`}
            >
              <RefreshIcon className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <section className={`rounded-xl border px-4 py-12 text-center text-sm ${surfaceClass} ${mutedClass}`}>
          출석 요약을 불러오는 중입니다.
        </section>
      ) : summary == null ? (
        <section className={`rounded-xl border px-4 py-12 text-center text-sm ${surfaceClass} ${mutedClass}`}>
          표시할 출석 정보가 없습니다.
        </section>
      ) : (
        <>
          <section className={`rounded-xl border px-4 py-4 ${surfaceClass}`}>
            <div className="grid gap-4 sm:grid-cols-5">
              <SummaryMetric label="출석률" value={`${ratio}%`} />
              <SummaryMetric label="전체" value={`${summary.totalSessions}`} />
              <SummaryMetric label="출석" value={`${summary.presentCount}`} />
              <SummaryMetric label="지각" value={`${summary.lateCount}`} />
              <SummaryMetric label="결석" value={`${summary.absentCount}`} />
            </div>
          </section>
          <section className={`rounded-xl border ${surfaceClass}`}>
            <div className="border-b border-inherit px-4 py-3">
              <h3 className="text-base font-semibold">회차별 기록</h3>
            </div>
            {summary.sessions.length === 0 ? (
              <div className={`px-4 py-10 text-center text-sm ${mutedClass}`}>
                출석 회차가 없습니다.
              </div>
            ) : (
              <ul className="divide-y divide-inherit">
                {summary.sessions.map((session) => (
                  <li key={session.sessionId} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold">{session.title}</p>
                      <p className={`mt-1 text-xs ${mutedClass}`}>{session.sessionDate}</p>
                    </div>
                    <AttendanceStatusPill status={session.status} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs opacity-60">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
