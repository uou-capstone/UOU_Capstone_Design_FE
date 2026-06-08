import type { AttendanceSessionPayload } from "@/services/api";

export type AutoAttendanceFormState = {
  enabled: boolean;
  sessionDate: string;
  startTime: string;
  endTime: string;
};

export const ATTENDANCE_SESSIONS_UPDATED_EVENT =
  "attendance-sessions-updated";

export type AttendanceSessionsUpdatedDetail = {
  courseId: number;
};

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function todayYmd(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

export function createAutoAttendanceForm(
  enabled = true,
): AutoAttendanceFormState {
  return {
    enabled,
    sessionDate: todayYmd(),
    startTime: "09:00",
    endTime: "10:00",
  };
}

export function timeInputToAttendanceRequestTime(value: string): string {
  const [hour = "0", minute = "0"] = value.split(":");
  return `${pad2(Number(hour) || 0)}:${pad2(Number(minute) || 0)}:00`;
}

export function validateAutoAttendanceForm(
  form: AutoAttendanceFormState,
): string | null {
  if (!form.enabled) return null;
  if (!form.sessionDate) return "출석 날짜를 선택해주세요.";
  if (!form.startTime || !form.endTime) {
    return "출석 시작 시간과 종료 시간을 입력해주세요.";
  }
  if (form.endTime <= form.startTime) {
    return "출석 종료 시간은 시작 시간보다 늦어야 합니다.";
  }
  return null;
}

export function buildAutoAttendancePayload(
  lectureTitle: string,
  lectureId: number,
  form: AutoAttendanceFormState,
): AttendanceSessionPayload {
  return {
    title: `${lectureTitle.trim() || "강의"} 출석`,
    sessionDate: form.sessionDate,
    startTime: timeInputToAttendanceRequestTime(form.startTime),
    endTime: timeInputToAttendanceRequestTime(form.endTime),
    lectureId,
  };
}

export function dispatchAttendanceSessionsUpdated(courseId: number): void {
  window.dispatchEvent(
    new CustomEvent<AttendanceSessionsUpdatedDetail>(
      ATTENDANCE_SESSIONS_UPDATED_EVENT,
      {
        detail: { courseId },
      },
    ),
  );
}
