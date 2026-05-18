import { sanitizePostLoginNext } from "../utils/sanitizePostLoginNext";

const BACKEND_URL = 'https://dev.uouaitutor.duckdns.org';
// 일부 TS 설정에서는 import.meta.env 타입 선언이 없어 오류가 나므로 any 캐스트로 우회한다.
const META_ENV = (import.meta as any)?.env ?? {};
export const API_BASE_URL = META_ENV.VITE_API_URL || BACKEND_URL;
const AI_SERVICE_URL = META_ENV.VITE_AI_SERVICE_URL || API_BASE_URL;

// API 응답 타입
export interface ApiResponse<T = any> {
  code: string;
  message: string;
  data?: T;
}

export interface TokenResponseDto {
  accessToken: string;
  refreshToken: string;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface PageQueryParams {
  page?: number;
  size?: number;
  sort?: string;
}

export interface NotificationItem {
  notificationId: number;
  type: string;
  title: string;
  body: string;
  resourceType?: string;
  resourceId?: number;
  read: boolean;
  createdAt: string;
}

export interface UnreadCountResponse {
  count: number;
}

export interface User {
  userId: number;
  email: string;
  fullName: string;
  role: 'STUDENT' | 'TEACHER';
  profileImageUrl?: string;
  phoneNumber?: string;
  birthDate?: string;
}

export interface Course {
  courseId: number;
  title: string;
  teacherName: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CourseListQueryParams extends PageQueryParams {}

export type StudentReportStatusFilter =
  | 'all'
  | 'excelling'
  | 'on_track'
  | 'needs_attention'
  | 'insufficient_data';

export interface StudentReportListQueryParams extends PageQueryParams {
  q?: string;
  status?: StudentReportStatusFilter;
}

export interface StudentReportListItem {
  studentId: number;
  userId: number;
  name: string;
  email?: string;
  averageScorePercent?: number;
  reportStatus: StudentReportStatusFilter | string;
  latestActivityAt?: string;
  courseProgressPercent?: number;
  examAttemptCount?: number;
  submissionCount?: number;
  topStrengthLabel?: string;
  topImprovementLabel?: string;
}

export interface StudentReportCompetency {
  competencyId?: number;
  competencyName: string;
  scorePercent?: number;
  level?: string;
  feedback?: string;
}

export interface StudentReportDetailResponse {
  studentId: number;
  userId: number;
  name: string;
  email?: string;
  reportStatus: StudentReportStatusFilter | string;
  averageScorePercent?: number;
  narrativeReport?: string;
  competencies: StudentReportCompetency[];
  latestActivityAt?: string;
}

/** GET /api/courses/{courseId}/reports/classroom */
export interface ClassroomReportResponse {
  courseId: number;
  summaryMarkdown: string;
  highlights: Record<string, unknown>[];
  risks: Record<string, unknown>[];
  coachingPriorities: Record<string, unknown>[];
  source?: string;
  fallbackUsed?: boolean;
  reason?: string;
  confidence?: string;
  generatedAt?: string;
}

/** GET …/reports/students/{studentId}/ai-context */
export interface StudentReportAiContextCourse {
  courseId?: number;
  courseName?: string;
  teacherId?: number;
}

export interface StudentReportAiContextStudentInfo {
  studentId?: number;
  studentName?: string;
  enrollmentStatus?: string;
}

export interface StudentReportAiContextActivity {
  totalAssessments?: number;
  submittedCount?: number;
  missingCount?: number;
  latestSubmittedAt?: string;
}

export interface StudentReportAiContextScore {
  averageScoreRatio?: number;
  averageScore?: number;
  highestScore?: number;
  lowestScore?: number;
  recentTrend?: number[];
  trend?: string;
}

export interface StudentReportAiContextResponse {
  course?: StudentReportAiContextCourse;
  student?: StudentReportAiContextStudentInfo;
  activitySummary?: StudentReportAiContextActivity;
  scoreSummary?: StudentReportAiContextScore;
}

function normalizeNotificationItem(raw: Record<string, unknown>): NotificationItem {
  const n = (v: unknown): number | undefined => {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)))
      return Number(v);
    return undefined;
  };

  const id = n(raw.notificationId ?? raw.notification_id) ?? 0;
  const type = String(raw.type ?? raw.notificationType ?? raw.notification_type ?? "");
  const title = String(raw.title ?? "");
  const body = String(raw.body ?? raw.message ?? raw.content ?? "");
  const resourceType =
    typeof raw.resourceType === "string"
      ? raw.resourceType
      : typeof raw.resource_type === "string"
        ? (raw.resource_type as string)
        : undefined;
  const resourceId = n(raw.resourceId ?? raw.resource_id);
  const read =
    typeof raw.read === "boolean"
      ? raw.read
      : typeof raw.isRead === "boolean"
        ? (raw.isRead as boolean)
        : typeof raw.readAt === "string"
          ? String(raw.readAt).trim() !== ""
          : typeof raw.read_at === "string"
            ? String(raw.read_at).trim() !== ""
            : false;
  const createdAt = String(raw.createdAt ?? raw.created_at ?? "");

  return {
    notificationId: id,
    type,
    title,
    body,
    resourceType,
    resourceId,
    read,
    createdAt,
  };
}

function normalizeStudentReportListItem(
  raw: Record<string, unknown>,
): StudentReportListItem {
  const n = (v: unknown): number | undefined => {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)))
      return Number(v);
    return undefined;
  };

  const studentObj =
    raw.student != null && typeof raw.student === "object" && !Array.isArray(raw.student)
      ? (raw.student as Record<string, unknown>)
      : null;

  const name =
    String(
      raw.name ??
        raw.studentName ??
        raw.student_name ??
        studentObj?.name ??
        studentObj?.studentName ??
        studentObj?.student_name ??
        "",
    ) || "";

  const email =
    (raw.email ??
      raw.studentEmail ??
      raw.student_email ??
      studentObj?.email ??
      studentObj?.studentEmail ??
      studentObj?.student_email) as unknown;

  const reportStatus =
    String(raw.reportStatus ?? raw.report_status ?? raw.status ?? "") || "all";

  const activityObj =
    raw.activitySummary != null &&
    typeof raw.activitySummary === "object" &&
    !Array.isArray(raw.activitySummary)
      ? (raw.activitySummary as Record<string, unknown>)
      : null;

  const latestActivityAt =
    (raw.latestActivityAt ??
      raw.latest_activity_at ??
      raw.latestActivity ??
      raw.latest_activity ??
      activityObj?.latestActivityAt ??
      activityObj?.latest_activity_at) as unknown;

  const scoreObj =
    raw.scoreSummary != null &&
    typeof raw.scoreSummary === "object" &&
    !Array.isArray(raw.scoreSummary)
      ? (raw.scoreSummary as Record<string, unknown>)
      : null;

  const avg =
    raw.averageScorePercent ??
    raw.average_score_percent ??
    raw.averageScore ??
    raw.average_score ??
    scoreObj?.averageScorePercent ??
    scoreObj?.average_score_percent ??
    raw.averageScorePercent;

  return {
    studentId: Number(raw.studentId ?? raw.student_id ?? studentObj?.studentId ?? 0),
    userId: Number(raw.userId ?? raw.user_id ?? studentObj?.userId ?? 0),
    name,
    email: typeof email === "string" && email.trim() !== "" ? email : undefined,
    averageScorePercent: n(avg),
    reportStatus,
    latestActivityAt:
      typeof latestActivityAt === "string" && latestActivityAt.trim() !== ""
        ? latestActivityAt
        : undefined,
    courseProgressPercent: n(raw.courseProgressPercent ?? raw.course_progress_percent),
    examAttemptCount: n(
      raw.examAttemptCount ??
        raw.exam_attempt_count ??
        activityObj?.examAttemptCount ??
        activityObj?.exam_attempt_count,
    ),
    submissionCount: n(
      raw.submissionCount ??
        raw.submission_count ??
        activityObj?.submissionCount ??
        activityObj?.submission_count,
    ),
    topStrengthLabel:
      typeof raw.topStrengthLabel === "string" && raw.topStrengthLabel.trim() !== ""
        ? raw.topStrengthLabel
        : typeof raw.top_strength_label === "string" && raw.top_strength_label.trim() !== ""
          ? raw.top_strength_label
          : undefined,
    topImprovementLabel:
      typeof raw.topImprovementLabel === "string" && raw.topImprovementLabel.trim() !== ""
        ? raw.topImprovementLabel
        : typeof raw.top_improvement_label === "string" && raw.top_improvement_label.trim() !== ""
          ? raw.top_improvement_label
          : undefined,
  };
}

function normalizeStudentReportDetail(
  raw: Record<string, unknown>,
): StudentReportDetailResponse {
  const studentObj =
    raw.student != null && typeof raw.student === "object" && !Array.isArray(raw.student)
      ? (raw.student as Record<string, unknown>)
      : null;

  const activityObj =
    raw.activitySummary != null &&
    typeof raw.activitySummary === "object" &&
    !Array.isArray(raw.activitySummary)
      ? (raw.activitySummary as Record<string, unknown>)
      : null;

  const scoreObj =
    raw.scoreSummary != null &&
    typeof raw.scoreSummary === "object" &&
    !Array.isArray(raw.scoreSummary)
      ? (raw.scoreSummary as Record<string, unknown>)
      : null;

  const name =
    String(
      raw.name ??
        raw.studentName ??
        raw.student_name ??
        studentObj?.name ??
        studentObj?.studentName ??
        studentObj?.student_name ??
        "",
    ) || "";

  const email =
    (raw.email ??
      raw.studentEmail ??
      raw.student_email ??
      studentObj?.email ??
      studentObj?.studentEmail ??
      studentObj?.student_email) as unknown;

  const reportStatus =
    String(raw.reportStatus ?? raw.report_status ?? raw.status ?? "") || "all";

  const latestActivityAt =
    (raw.latestActivityAt ??
      raw.latest_activity_at ??
      activityObj?.latestActivityAt ??
      activityObj?.latest_activity_at) as unknown;

  const avg =
    raw.averageScorePercent ??
    raw.average_score_percent ??
    scoreObj?.averageScorePercent ??
    scoreObj?.average_score_percent;

  const n = (v: unknown): number | undefined => {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)))
      return Number(v);
    return undefined;
  };

  const competenciesRaw =
    raw.competencies ??
    raw.competencyList ??
    raw.competency_list ??
    raw.competency ??
    null;

  const competencies: StudentReportCompetency[] = Array.isArray(competenciesRaw)
    ? competenciesRaw
        .map((c) => {
          if (c == null || typeof c !== "object" || Array.isArray(c)) return null;
          const obj = c as Record<string, unknown>;
          const competencyName = String(
            obj.competencyName ??
              obj.competency_name ??
              obj.name ??
              obj.key ??
              obj.label ??
              "",
          ).trim();
          if (!competencyName) return null;
          return {
            competencyId:
              typeof obj.competencyId === "number" ? obj.competencyId : undefined,
            competencyName,
            scorePercent: n(obj.scorePercent ?? obj.score_percent ?? obj.score),
            level:
              typeof obj.level === "string" && obj.level.trim() !== ""
                ? obj.level
                : undefined,
            feedback:
              typeof obj.feedback === "string" && obj.feedback.trim() !== ""
                ? obj.feedback
                : undefined,
          };
        })
        .filter((x): x is StudentReportCompetency => x != null)
    : [];

  return {
    studentId: Number(raw.studentId ?? raw.student_id ?? studentObj?.studentId ?? 0),
    userId: Number(raw.userId ?? raw.user_id ?? studentObj?.userId ?? 0),
    name,
    email: typeof email === "string" && email.trim() !== "" ? email : undefined,
    reportStatus,
    averageScorePercent: n(avg),
    narrativeReport:
      typeof raw.narrativeReport === "string" && raw.narrativeReport.trim() !== ""
        ? raw.narrativeReport
        : typeof raw.narrative_report === "string" &&
            String(raw.narrative_report).trim() !== ""
          ? String(raw.narrative_report)
          : undefined,
    competencies,
    latestActivityAt:
      typeof latestActivityAt === "string" && latestActivityAt.trim() !== ""
        ? latestActivityAt
        : undefined,
  };
}

function asInsightRecordArray(v: unknown): Record<string, unknown>[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x) => x != null && typeof x === "object" && !Array.isArray(x))
    .map((x) => x as Record<string, unknown>);
}

function normalizeClassroomReport(raw: Record<string, unknown>): ClassroomReportResponse {
  return {
    courseId: Number(raw.courseId ?? raw.course_id ?? 0),
    summaryMarkdown: String(raw.summaryMarkdown ?? raw.summary_markdown ?? ""),
    highlights: asInsightRecordArray(raw.highlights),
    risks: asInsightRecordArray(raw.risks),
    coachingPriorities: asInsightRecordArray(raw.coachingPriorities ?? raw.coaching_priorities),
    source: typeof raw.source === "string" ? raw.source : undefined,
    fallbackUsed:
      typeof raw.fallbackUsed === "boolean"
        ? raw.fallbackUsed
        : typeof raw.fallback_used === "boolean"
          ? raw.fallback_used
          : undefined,
    reason: typeof raw.reason === "string" ? raw.reason : undefined,
    confidence: typeof raw.confidence === "string" ? raw.confidence : undefined,
    generatedAt:
      typeof raw.generatedAt === "string"
        ? raw.generatedAt
        : typeof raw.generated_at === "string"
          ? raw.generated_at
          : undefined,
  };
}

function normalizeStudentReportAiContext(raw: Record<string, unknown>): StudentReportAiContextResponse {
  const n = (v: unknown): number | undefined => {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
    return undefined;
  };

  const courseRaw = raw.course;
  let course: StudentReportAiContextCourse | undefined;
  if (courseRaw != null && typeof courseRaw === "object" && !Array.isArray(courseRaw)) {
    const c = courseRaw as Record<string, unknown>;
    const courseName = String(c.courseName ?? c.course_name ?? "").trim();
    course = {
      courseId: n(c.courseId ?? c.course_id),
      courseName: courseName || undefined,
      teacherId: n(c.teacherId ?? c.teacher_id),
    };
    if (course.courseId == null && !course.courseName && course.teacherId == null) course = undefined;
  }

  const studentRaw = raw.student;
  let student: StudentReportAiContextStudentInfo | undefined;
  if (studentRaw != null && typeof studentRaw === "object" && !Array.isArray(studentRaw)) {
    const s = studentRaw as Record<string, unknown>;
    const studentName = String(s.studentName ?? s.student_name ?? "").trim();
    student = {
      studentId: n(s.studentId ?? s.student_id),
      studentName: studentName || undefined,
      enrollmentStatus:
        typeof s.enrollmentStatus === "string"
          ? s.enrollmentStatus
          : typeof s.enrollment_status === "string"
            ? s.enrollment_status
            : undefined,
    };
    if (student.studentId == null && !student.studentName && !student.enrollmentStatus) student = undefined;
  }

  const actRaw = raw.activitySummary ?? raw.activity_summary;
  let activitySummary: StudentReportAiContextActivity | undefined;
  if (actRaw != null && typeof actRaw === "object" && !Array.isArray(actRaw)) {
    const a = actRaw as Record<string, unknown>;
    activitySummary = {
      totalAssessments: n(a.totalAssessments ?? a.total_assessments),
      submittedCount: n(a.submittedCount ?? a.submitted_count),
      missingCount: n(a.missingCount ?? a.missing_count),
      latestSubmittedAt:
        typeof a.latestSubmittedAt === "string"
          ? a.latestSubmittedAt
          : typeof a.latest_submitted_at === "string"
            ? a.latest_submitted_at
            : undefined,
    };
  }

  const scoreRaw = raw.scoreSummary ?? raw.score_summary;
  let scoreSummary: StudentReportAiContextScore | undefined;
  if (scoreRaw != null && typeof scoreRaw === "object" && !Array.isArray(scoreRaw)) {
    const s = scoreRaw as Record<string, unknown>;
    const trendArr = s.recentTrend ?? s.recent_trend;
    const recentTrend = Array.isArray(trendArr)
      ? trendArr
          .map((x) => (typeof x === "number" ? x : Number(x)))
          .filter((x) => Number.isFinite(x))
      : undefined;
    scoreSummary = {
      averageScoreRatio: n(s.averageScoreRatio ?? s.average_score_ratio),
      averageScore: n(s.averageScore ?? s.average_score),
      highestScore: n(s.highestScore ?? s.highest_score),
      lowestScore: n(s.lowestScore ?? s.lowest_score),
      recentTrend: recentTrend && recentTrend.length > 0 ? recentTrend : undefined,
      trend:
        typeof s.trend === "string" && s.trend.trim() !== ""
          ? s.trend
          : typeof s.scoreTrend === "string"
            ? s.scoreTrend
            : undefined,
    };
  }

  return { course, student, activitySummary, scoreSummary };
}

export interface CourseDetail extends Course {
  lectures?: Lecture[];
  invitationCode?: string;
}

export interface CourseContentsDeleteRequest {
  materialIds: number[];
  examSessionIds: number[];
  generationSessionIds: number[];
}

export interface AiContentCallbackItem {
  contentType?: string;
  contentData?: string;
  materialReferences?: string;
  aiQuestionId?: string;
}

export type CourseJoinRequestStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'BLOCKED';

export interface CourseJoinRequestCreateResponse {
  requestId: number;
  courseId: number;
  courseTitle: string;
  status: CourseJoinRequestStatus;
  requestedAt: string;
}

export interface CourseJoinRequestListItem {
  requestId: number;
  studentId: number;
  studentName: string;
  studentEmail: string;
  status: CourseJoinRequestStatus;
  requestedAt: string;
}

export interface CourseStudentListItem {
  enrollmentId: number;
  studentId: number;
  studentName: string;
  studentEmail: string;
  enrolledAt: string;
}

export interface LocalTimeDto {
  hour: number;
  minute: number;
  second?: number;
  nano?: number;
}

export interface AttendanceSession {
  sessionId: number;
  courseId: number;
  lectureId?: number | null;
  title: string;
  sessionDate: string;
  startTime: LocalTimeDto;
  endTime: LocalTimeDto;
  createdByTeacherId?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface AttendanceSessionPayload {
  title: string;
  sessionDate: string;
  startTime: LocalTimeDto;
  endTime: LocalTimeDto;
  lectureId?: number | null;
}

export interface AttendanceSessionListQueryParams extends PageQueryParams {}

export type AttendanceStatus = "PRESENT" | "LATE" | "ABSENT" | "EXCUSED";

export interface AttendanceRecord {
  recordId: number;
  sessionId: number;
  studentId: number;
  studentName: string;
  status: AttendanceStatus;
  markedAt?: string;
  markedByTeacherId?: number;
  note?: string;
}

export interface AttendanceRecordUpsertItem {
  studentId: number;
  status: AttendanceStatus;
  note?: string;
}

export interface AttendanceSessionHeader {
  sessionId: number;
  title: string;
  sessionDate: string;
}

export interface StudentAttendanceMatrixRow {
  studentId: number;
  name: string;
  records: Record<string, AttendanceStatus>;
  presentRatio?: number;
}

export interface CourseAttendanceMatrix {
  sessions: AttendanceSessionHeader[];
  students: PageResponse<StudentAttendanceMatrixRow>;
}

export interface StudentAttendanceSummary {
  courseId: number;
  totalSessions: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  excusedCount: number;
  presentRatio?: number;
  sessions: Array<{
    sessionId: number;
    title: string;
    sessionDate: string;
    status: AttendanceStatus;
  }>;
}

export type NoticeCategory = "GENERAL" | "EXAM" | "MATERIAL" | "ASSIGNMENT";
export type NoticePriority = "NORMAL" | "IMPORTANT";
export type DiscussionCategory = "QUESTION" | "FREE" | "RESOURCE";

export interface NoticeListItem {
  noticeId: number;
  authorUserId?: number;
  authorName: string;
  title: string;
  category: NoticeCategory;
  priority: NoticePriority;
  pinned: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface NoticeDetail extends NoticeListItem {
  courseId: number;
  authorTeacherId?: number;
  contentMarkdown: string;
}

export interface NoticePayload {
  title: string;
  contentMarkdown: string;
  category?: NoticeCategory;
  priority?: NoticePriority;
  pinned?: boolean;
}

export interface NoticeComment {
  commentId: number;
  noticeId: number;
  authorUserId?: number;
  authorName: string;
  parentCommentId?: number | null;
  contentMarkdown: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DiscussionListItem {
  discussionId: number;
  authorUserId?: number;
  authorName: string;
  title: string;
  category: DiscussionCategory;
  pinned: boolean;
  allowComments: boolean;
  viewCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface DiscussionDetail extends DiscussionListItem {
  courseId: number;
  contentMarkdown: string;
}

export interface DiscussionPayload {
  title: string;
  contentMarkdown: string;
  category?: DiscussionCategory;
  pinned?: boolean;
  allowComments?: boolean;
}

export interface DiscussionComment {
  commentId: number;
  discussionId: number;
  authorUserId?: number;
  authorName: string;
  parentCommentId?: number | null;
  contentMarkdown: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ReportCriterion {
  id: number;
  label: string;
  description?: string;
  weight?: number;
}

export interface ReportCriterionPayload {
  label?: string;
  description?: string;
  weight?: number;
}

export interface TeacherNotificationPreference {
  includeSelfActionNotifications: boolean;
}

export interface JoinRequestBulkResult {
  successCount: number;
  failureCount: number;
  results?: unknown[];
}

export interface MyCourseJoinRequestListItem {
  requestId: number;
  courseId: number;
  courseTitle: string;
  status: CourseJoinRequestStatus;
  requestedAt: string;
  updatedAt?: string;
}

export interface CourseJoinRequestListQueryParams extends PageQueryParams {
  status?: CourseJoinRequestStatus;
}

/** 교사용 가입 요청 페이지: BE가 requestedAt 외에 createdAt·snake_case만 줄 수 있어 통일 */
function pickFirstNonEmptyString(
  raw: Record<string, unknown>,
  keys: string[],
): string {
  for (const k of keys) {
    const v = raw[k];
    if (v == null) continue;
    if (typeof v === "number" && Number.isFinite(v)) {
      const ms = v < 1e12 ? v * 1000 : v;
      const d = new Date(ms);
      if (!Number.isNaN(d.getTime())) return d.toISOString();
      continue;
    }
    const s = String(v).trim();
    if (s !== "") return s;
  }
  return "";
}

function normalizeCourseJoinRequestListItem(
  raw: Record<string, unknown>,
): CourseJoinRequestListItem {
  return {
    requestId: Number(raw.requestId ?? raw.request_id ?? 0),
    studentId: Number(raw.studentId ?? raw.student_id ?? 0),
    studentName: String(raw.studentName ?? raw.student_name ?? ""),
    studentEmail: String(raw.studentEmail ?? raw.student_email ?? ""),
    status: String(raw.status ?? "PENDING") as CourseJoinRequestStatus,
    requestedAt: pickFirstNonEmptyString(raw, [
      "requestedAt",
      "requested_at",
      "requestedDateTime",
      "requested_date_time",
      "createdAt",
      "created_at",
      "createdDate",
      "created_date",
      "appliedAt",
      "applied_at",
      "registeredAt",
      "registered_at",
      "requestedTime",
      "requested_time",
    ]),
  };
}

function normalizeMyCourseJoinRequestListItem(
  raw: Record<string, unknown>,
): MyCourseJoinRequestListItem {
  return {
    requestId: Number(raw.requestId ?? raw.request_id ?? 0),
    courseId: Number(raw.courseId ?? raw.course_id ?? 0),
    courseTitle: String(raw.courseTitle ?? raw.course_title ?? ""),
    status: String(raw.status ?? "PENDING") as CourseJoinRequestStatus,
    requestedAt: pickFirstNonEmptyString(raw, [
      "requestedAt",
      "requested_at",
      "createdAt",
      "created_at",
    ]),
    updatedAt: pickFirstNonEmptyString(raw, ["updatedAt", "updated_at"]) || undefined,
  };
}

function normalizeCourseStudentListItem(
  raw: Record<string, unknown>,
): CourseStudentListItem {
  return {
    enrollmentId: Number(raw.enrollmentId ?? raw.enrollment_id ?? 0),
    studentId: Number(raw.studentId ?? raw.student_id ?? 0),
    studentName: String(raw.studentName ?? raw.student_name ?? ""),
    studentEmail: String(raw.studentEmail ?? raw.student_email ?? ""),
    enrolledAt: pickFirstNonEmptyString(raw, ["enrolledAt", "enrolled_at", "createdAt", "created_at"]),
  };
}

function normalizeLocalTime(raw: unknown): LocalTimeDto {
  if (raw != null && typeof raw === "object" && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    return {
      hour: Number(obj.hour ?? 0),
      minute: Number(obj.minute ?? 0),
      second: Number(obj.second ?? 0),
      nano: Number(obj.nano ?? 0),
    };
  }
  if (typeof raw === "string") {
    const [hour = "0", minute = "0", second = "0"] = raw.split(":");
    return {
      hour: Number(hour) || 0,
      minute: Number(minute) || 0,
      second: Number(second) || 0,
      nano: 0,
    };
  }
  return { hour: 0, minute: 0, second: 0, nano: 0 };
}

function normalizeAttendanceSession(
  raw: Record<string, unknown>,
): AttendanceSession {
  const lectureRaw = raw.lectureId ?? raw.lecture_id;
  const lectureId =
    lectureRaw == null || lectureRaw === ""
      ? null
      : Number(lectureRaw);
  return {
    sessionId: Number(raw.sessionId ?? raw.session_id ?? 0),
    courseId: Number(raw.courseId ?? raw.course_id ?? 0),
    lectureId:
      typeof lectureId === "number" && Number.isFinite(lectureId)
        ? lectureId
        : null,
    title: String(raw.title ?? ""),
    sessionDate: String(raw.sessionDate ?? raw.session_date ?? ""),
    startTime: normalizeLocalTime(raw.startTime ?? raw.start_time),
    endTime: normalizeLocalTime(raw.endTime ?? raw.end_time),
    createdByTeacherId:
      raw.createdByTeacherId == null && raw.created_by_teacher_id == null
        ? undefined
        : Number(raw.createdByTeacherId ?? raw.created_by_teacher_id),
    createdAt: pickFirstNonEmptyString(raw, ["createdAt", "created_at"]) || undefined,
    updatedAt: pickFirstNonEmptyString(raw, ["updatedAt", "updated_at"]) || undefined,
  };
}

function buildPageSearchParams(
  params: PageQueryParams | undefined,
  defaultSort: string,
): URLSearchParams {
  const searchParams = new URLSearchParams();
  searchParams.set("page", String(params?.page ?? 0));
  searchParams.set("size", String(Math.min(params?.size ?? 20, 100)));
  searchParams.set("sort", params?.sort ?? defaultSort);
  return searchParams;
}

function attendanceSessionPayloadToRequest(
  payload: AttendanceSessionPayload,
): Record<string, unknown> {
  return {
    title: payload.title,
    sessionDate: payload.sessionDate,
    startTime: {
      hour: payload.startTime.hour,
      minute: payload.startTime.minute,
      second: payload.startTime.second ?? 0,
      nano: payload.startTime.nano ?? 0,
    },
    endTime: {
      hour: payload.endTime.hour,
      minute: payload.endTime.minute,
      second: payload.endTime.second ?? 0,
      nano: payload.endTime.nano ?? 0,
    },
    lectureId: payload.lectureId ?? null,
  };
}

function normalizeAttendanceStatus(raw: unknown): AttendanceStatus {
  const value = String(raw ?? "ABSENT").toUpperCase();
  if (value === "PRESENT" || value === "LATE" || value === "EXCUSED") return value;
  return "ABSENT";
}

function normalizeAttendanceRecord(raw: Record<string, unknown>): AttendanceRecord {
  return {
    recordId: Number(raw.recordId ?? raw.record_id ?? 0),
    sessionId: Number(raw.sessionId ?? raw.session_id ?? 0),
    studentId: Number(raw.studentId ?? raw.student_id ?? 0),
    studentName: String(raw.studentName ?? raw.student_name ?? raw.name ?? ""),
    status: normalizeAttendanceStatus(raw.status),
    markedAt: pickFirstNonEmptyString(raw, ["markedAt", "marked_at"]) || undefined,
    markedByTeacherId:
      raw.markedByTeacherId == null && raw.marked_by_teacher_id == null
        ? undefined
        : Number(raw.markedByTeacherId ?? raw.marked_by_teacher_id),
    note:
      typeof raw.note === "string"
        ? raw.note
        : typeof raw.memo === "string"
          ? raw.memo
          : undefined,
  };
}

function normalizeAttendanceSessionHeader(
  raw: Record<string, unknown>,
): AttendanceSessionHeader {
  return {
    sessionId: Number(raw.sessionId ?? raw.session_id ?? 0),
    title: String(raw.title ?? ""),
    sessionDate: String(raw.sessionDate ?? raw.session_date ?? ""),
  };
}

function normalizeStudentAttendanceMatrixRow(
  raw: Record<string, unknown>,
): StudentAttendanceMatrixRow {
  const recordsRaw = raw.records;
  const records: Record<string, AttendanceStatus> = {};
  if (recordsRaw != null && typeof recordsRaw === "object" && !Array.isArray(recordsRaw)) {
    for (const [key, value] of Object.entries(recordsRaw as Record<string, unknown>)) {
      records[key] = normalizeAttendanceStatus(value);
    }
  }
  return {
    studentId: Number(raw.studentId ?? raw.student_id ?? 0),
    name: String(raw.name ?? raw.studentName ?? raw.student_name ?? ""),
    records,
    presentRatio:
      raw.presentRatio == null && raw.present_ratio == null
        ? undefined
        : Number(raw.presentRatio ?? raw.present_ratio),
  };
}

function normalizeCourseAttendanceMatrix(
  raw: Record<string, unknown>,
): CourseAttendanceMatrix {
  const studentsRaw =
    raw.students != null && typeof raw.students === "object" && !Array.isArray(raw.students)
      ? (raw.students as PageResponse<Record<string, unknown>>)
      : ({
          content: [],
          page: 0,
          size: 0,
          totalElements: 0,
          totalPages: 1,
          first: true,
          last: true,
        } as PageResponse<Record<string, unknown>>);

  return {
    sessions: Array.isArray(raw.sessions)
      ? raw.sessions.map((item) =>
          normalizeAttendanceSessionHeader(item as Record<string, unknown>),
        )
      : [],
    students: {
      ...(studentsRaw as unknown as PageResponse<StudentAttendanceMatrixRow>),
      content: Array.isArray(studentsRaw.content)
        ? studentsRaw.content.map((item) => normalizeStudentAttendanceMatrixRow(item))
        : [],
    },
  };
}

function normalizeStudentAttendanceSummary(
  raw: Record<string, unknown>,
): StudentAttendanceSummary {
  return {
    courseId: Number(raw.courseId ?? raw.course_id ?? 0),
    totalSessions: Number(raw.totalSessions ?? raw.total_sessions ?? 0),
    presentCount: Number(raw.presentCount ?? raw.present_count ?? 0),
    lateCount: Number(raw.lateCount ?? raw.late_count ?? 0),
    absentCount: Number(raw.absentCount ?? raw.absent_count ?? 0),
    excusedCount: Number(raw.excusedCount ?? raw.excused_count ?? 0),
    presentRatio:
      raw.presentRatio == null && raw.present_ratio == null
        ? undefined
        : Number(raw.presentRatio ?? raw.present_ratio),
    sessions: Array.isArray(raw.sessions)
      ? raw.sessions.map((item) => {
          const obj = item as Record<string, unknown>;
          return {
            sessionId: Number(obj.sessionId ?? obj.session_id ?? 0),
            title: String(obj.title ?? ""),
            sessionDate: String(obj.sessionDate ?? obj.session_date ?? ""),
            status: normalizeAttendanceStatus(obj.status),
          };
        })
      : [],
  };
}

function normalizeNoticeListItem(raw: Record<string, unknown>): NoticeListItem {
  return {
    noticeId: Number(raw.noticeId ?? raw.notice_id ?? 0),
    authorUserId:
      raw.authorUserId == null && raw.author_user_id == null
        ? undefined
        : Number(raw.authorUserId ?? raw.author_user_id),
    authorName: String(raw.authorName ?? raw.author_name ?? ""),
    title: String(raw.title ?? ""),
    category: String(raw.category ?? "GENERAL") as NoticeCategory,
    priority: String(raw.priority ?? "NORMAL") as NoticePriority,
    pinned: Boolean(raw.pinned ?? false),
    createdAt: pickFirstNonEmptyString(raw, ["createdAt", "created_at"]) || undefined,
    updatedAt: pickFirstNonEmptyString(raw, ["updatedAt", "updated_at"]) || undefined,
  };
}

function normalizeNoticeDetail(raw: Record<string, unknown>): NoticeDetail {
  return {
    ...normalizeNoticeListItem(raw),
    courseId: Number(raw.courseId ?? raw.course_id ?? 0),
    authorTeacherId:
      raw.authorTeacherId == null && raw.author_teacher_id == null
        ? undefined
        : Number(raw.authorTeacherId ?? raw.author_teacher_id),
    contentMarkdown: String(raw.contentMarkdown ?? raw.content_markdown ?? ""),
  };
}

function normalizeNoticeComment(raw: Record<string, unknown>): NoticeComment {
  return {
    commentId: Number(raw.commentId ?? raw.comment_id ?? 0),
    noticeId: Number(raw.noticeId ?? raw.notice_id ?? 0),
    authorUserId:
      raw.authorUserId == null && raw.author_user_id == null
        ? undefined
        : Number(raw.authorUserId ?? raw.author_user_id),
    authorName: String(raw.authorName ?? raw.author_name ?? ""),
    parentCommentId:
      raw.parentCommentId == null && raw.parent_comment_id == null
        ? null
        : Number(raw.parentCommentId ?? raw.parent_comment_id),
    contentMarkdown: String(raw.contentMarkdown ?? raw.content_markdown ?? ""),
    createdAt: pickFirstNonEmptyString(raw, ["createdAt", "created_at"]) || undefined,
    updatedAt: pickFirstNonEmptyString(raw, ["updatedAt", "updated_at"]) || undefined,
  };
}

function normalizeDiscussionListItem(raw: Record<string, unknown>): DiscussionListItem {
  return {
    discussionId: Number(raw.discussionId ?? raw.discussion_id ?? 0),
    authorUserId:
      raw.authorUserId == null && raw.author_user_id == null
        ? undefined
        : Number(raw.authorUserId ?? raw.author_user_id),
    authorName: String(raw.authorName ?? raw.author_name ?? ""),
    title: String(raw.title ?? ""),
    category: String(raw.category ?? "FREE") as DiscussionCategory,
    pinned: Boolean(raw.pinned ?? false),
    allowComments: raw.allowComments == null ? true : Boolean(raw.allowComments),
    viewCount: Number(raw.viewCount ?? raw.view_count ?? 0),
    createdAt: pickFirstNonEmptyString(raw, ["createdAt", "created_at"]) || undefined,
    updatedAt: pickFirstNonEmptyString(raw, ["updatedAt", "updated_at"]) || undefined,
  };
}

function normalizeDiscussionDetail(raw: Record<string, unknown>): DiscussionDetail {
  return {
    ...normalizeDiscussionListItem(raw),
    courseId: Number(raw.courseId ?? raw.course_id ?? 0),
    contentMarkdown: String(raw.contentMarkdown ?? raw.content_markdown ?? ""),
  };
}

function normalizeDiscussionComment(raw: Record<string, unknown>): DiscussionComment {
  return {
    commentId: Number(raw.commentId ?? raw.comment_id ?? 0),
    discussionId: Number(raw.discussionId ?? raw.discussion_id ?? 0),
    authorUserId:
      raw.authorUserId == null && raw.author_user_id == null
        ? undefined
        : Number(raw.authorUserId ?? raw.author_user_id),
    authorName: String(raw.authorName ?? raw.author_name ?? ""),
    parentCommentId:
      raw.parentCommentId == null && raw.parent_comment_id == null
        ? null
        : Number(raw.parentCommentId ?? raw.parent_comment_id),
    contentMarkdown: String(raw.contentMarkdown ?? raw.content_markdown ?? ""),
    createdAt: pickFirstNonEmptyString(raw, ["createdAt", "created_at"]) || undefined,
    updatedAt: pickFirstNonEmptyString(raw, ["updatedAt", "updated_at"]) || undefined,
  };
}

function normalizeReportCriterion(raw: Record<string, unknown>): ReportCriterion {
  return {
    id: Number(raw.id ?? raw.criterionId ?? raw.criterion_id ?? 0),
    label: String(raw.label ?? ""),
    description:
      typeof raw.description === "string" && raw.description.trim() !== ""
        ? raw.description
        : undefined,
    weight: raw.weight == null ? undefined : Number(raw.weight),
  };
}

export interface Lecture {
  lectureId: number;
  title: string;
  weekNumber: number;
  description?: string;
  aiGeneratedStatus?: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  contents?: LectureContent[];
}

export interface LectureContent {
  contentId: number;
  contentType: 'SCRIPT' | 'SUMMARY' | 'VISUAL_AID';
  contentData: string;
  materialReferences?: string[];
}

export interface LectureDetailResponseDto {
  lectureId: number;
  title: string;
  weekNumber: number;
  description?: string;
  aiGeneratedStatus: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  contents: LectureContent[];
}

export interface LectureResponseDto {
  lectureId: number;
  title: string;
  weekNumber: number;
  aiGeneratedStatus: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
}

export interface LectureMaterial {
  materialId: number;
  displayName: string;
  materialType: 'FILE' | 'LINK';
  url: string;
}

/** POST /api/lectures/{lectureId}/materials 응답 (materialId, fileUrl/url, displayName 등) */
export interface LectureMaterialUploadResult {
  materialId?: number;
  fileUrl: string;
  displayName?: string;
}

// 강의실 전체 n주차별 리소스 조회 응답 (/api/courses/{courseId}/contents)
export interface CourseContentsLectureMaterial {
  materialId: number;
  displayName: string;
  materialType: string;
  filePath: string;
  url: string;
}

export interface CourseContentsLectureExamSession {
  examSessionId: number;
  examType: string;
  status: string;
  targetCount: number;
  createdAt: string;
  /** 목록 표시 이름. 없으면 FE에서 `${examType} · N문항`으로 표시 */
  displayName?: string | null;
  /** 시험 출제 기준 업로드 PDF(material). BE가 내려주면 자료별 목록 필터에 사용 */
  sourceMaterialId?: number | null;
  sourceGenerationSessionId?: number | null;
}

/** GET /courses/.../contents 시험 항목에서 자료 식별자 추출 (camelCase·snake_case·구 필드 호환) */
export function readCourseExamSessionResourceIds(
  raw: CourseContentsLectureExamSession & Record<string, unknown>,
): {
  sourceMaterialId?: number;
  sourceGenerationSessionId?: number;
} {
  const num = (x: unknown): number | undefined =>
    typeof x === "number" && Number.isFinite(x) ? x : undefined;
  const mid =
    num(raw.sourceMaterialId) ??
    num(raw.source_material_id) ??
    num(raw.materialId) ??
    num(raw.material_id);
  const gid =
    num(raw.sourceGenerationSessionId) ??
    num(raw.source_generation_session_id) ??
    num(raw.materialGenerationSessionId) ??
    num(raw.material_generation_session_id) ??
    num(raw.generationSessionId) ??
    num(raw.generation_session_id);
  const out: {
    sourceMaterialId?: number;
    sourceGenerationSessionId?: number;
  } = {};
  if (mid != null) out.sourceMaterialId = mid;
  if (gid != null) out.sourceGenerationSessionId = gid;
  return out;
}

export interface CourseContentsLecture {
  lectureId: number;
  title: string;
  weekNumber: number;
  materials: CourseContentsLectureMaterial[];
  examSessions: CourseContentsLectureExamSession[];
}

export interface CourseContentsResponse {
  courseId: number;
  courseTitle: string;
  lectures: CourseContentsLecture[];
}

export interface Inquiry {
  inquiryText: string;
}

/** 이전: answerText 단일 필드. 이후: status + explanation + steps (POST /api/inquiries/answer 응답) */
export interface InquiryResponse {
  answerText: string;
}

/** POST /api/inquiries/answer 응답 — AI 강의 질문에 대한 학생 답변 피드백 */
export interface RemedialStep {
  concept: string;
  explanation: string;
  question: string;
}

export interface InquiryAnswerResponse {
  status: 'GOOD' | 'BAD';
  explanation: string | null;
  steps: RemedialStep[] | null;
}

export interface QuizQuestion {
  questionText: string;
  questionType: 'ESSAY' | 'OX' | 'MULTIPLE_CHOICE';
}

export interface AssessmentOption {
  optionText: string;
  isCorrect: boolean;
}

export interface AssessmentQuestion {
  questionText: string;
  questionType: 'MCQ' | 'OX' | 'ESSAY';
  options?: AssessmentOption[];
}

export interface Assessment {
  assessmentId?: number;
  title: string;
  type: 'QUIZ' | 'ASSIGNMENT';
  dueDate: string;
  questions: AssessmentQuestion[];
}

export interface AssessmentSimpleDto {
  assessmentId: number;
  title: string;
  type: 'QUIZ' | 'ASSIGNMENT';
  dueDate: string;
}

export interface AssessmentDetailDto {
  assessmentId: number;
  title: string;
  type: 'QUIZ' | 'ASSIGNMENT';
  dueDate: string;
  questions: QuestionResponseDto[];
}

export interface QuestionResponseDto {
  questionId: number;
  text: string;
  type: 'FLASHCARD' | 'OX' | 'MULTICHOICE' | 'ESSAY';
  options?: OptionResponseDto[];
}

export interface OptionResponseDto {
  optionId: number;
  text: string;
}

export interface AssessmentSubmission {
  submissionId: number;
  studentId: number;
  studentName: string;
  submittedAt: string;
  status: 'SUBMITTED' | 'GRADED';
}

export interface SubmissionStatusDto {
  submissionId: number;
  studentId: number;
  studentName: string;
  submittedAt: string;
  status: 'SUBMITTED' | 'GRADED';
}

export interface StudentAnswerRequestDto {
  questionId: number;
  choiceOptionId?: number;
  descriptiveAnswer?: string;
}

export interface SubmissionRequestDto {
  answers: StudentAnswerRequestDto[];
}

export interface StudentAnswerResponseDto {
  questionId: number;
  questionText: string;
  questionType: 'FLASHCARD' | 'OX' | 'MULTICHOICE' | 'ESSAY';
  choiceOptionId?: number;
  choiceOptionText?: string;
  descriptiveAnswer?: string;
  isCorrect?: boolean;
  score?: number;
  teacherComment?: string;
}

export interface SubmissionResponseDto {
  submissionId: number;
  assessmentId: number;
  assessmentTitle: string;
  submittedAt: string;
  status: 'SUBMITTED' | 'GRADED';
  answers: StudentAnswerResponseDto[];
}

// 토큰 관리
export const getAuthToken = (): string | null => {
  return localStorage.getItem('accessToken');
};

export const setAuthToken = (token: string): void => {
  localStorage.setItem('accessToken', token);
};

export const removeAuthToken = (): void => {
  localStorage.removeItem('accessToken');
};

export const getRefreshToken = (): string | null => {
  return localStorage.getItem('refreshToken');
};

export const setRefreshToken = (token: string): void => {
  localStorage.setItem('refreshToken', token);
};

export const removeRefreshToken = (): void => {
  localStorage.removeItem('refreshToken');
};

export const clearStoredAuth = (): void => {
  removeAuthToken();
  removeRefreshToken();
};

const getCurrentAppPath = (): string => {
  if (typeof window === 'undefined') return '/';
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
};

export const redirectToLogin = (options?: {
  preserveNext?: boolean;
  replace?: boolean;
}): void => {
  if (typeof window === 'undefined') return;
  const preserveNext = options?.preserveNext ?? true;
  const replace = options?.replace ?? true;
  const loginUrl = new URL('/login', window.location.origin);
  if (preserveNext) {
    const next = getCurrentAppPath();
    if (next && next !== '/login' && next !== '/auth/callback') {
      const safeNext = sanitizePostLoginNext(next);
      if (safeNext !== '/') {
        loginUrl.searchParams.set('next', safeNext);
      }
    }
  }
  if (replace) {
    window.location.replace(loginUrl.toString());
    return;
  }
  window.location.assign(loginUrl.toString());
};

const isDevHost = (): boolean =>
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const resolveApiEndpointUrl = (endpoint: string): string => {
  const shouldUseViteProxy = isDevHost() && endpoint.startsWith('/api');
  return shouldUseViteProxy ? endpoint : (API_BASE_URL ? `${String(API_BASE_URL).replace(/\/$/, '')}${endpoint}` : endpoint);
};

const AUTH_REFRESH_ENDPOINT = '/api/auth/refresh';
let refreshRequestPromise: Promise<TokenResponseDto> | null = null;

const parseResponseBody = async (response: Response): Promise<{ json: Record<string, unknown> | null; text: string }> => {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      const json = (await response.json()) as unknown;
      if (json != null && typeof json === 'object' && !Array.isArray(json)) {
        return { json: json as Record<string, unknown>, text: JSON.stringify(json) };
      }
      return { json: null, text: JSON.stringify(json) };
    } catch {
      return { json: null, text: '' };
    }
  }

  try {
    const text = await response.text();
    return { json: null, text };
  } catch {
    return { json: null, text: '' };
  }
};

const invalidateSessionAndRedirect = (preserveNext: boolean): void => {
  clearStoredAuth();
  redirectToLogin({ preserveNext });
};

const SSE_RECONNECT_DELAYS_MS = [1000, 2000, 5000] as const;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => window.setTimeout(resolve, ms));

const isRecoverableTransportError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  if (error.name === 'AbortError') return false;
  const message = error.message.toLowerCase();
  return (
    message.includes('fetch') ||
    message.includes('network') ||
    message.includes('networkerror') ||
    message.includes('network request failed') ||
    message.includes('stream')
  );
};

const performTokenRefresh = async (options?: {
  preserveNext?: boolean;
}): Promise<TokenResponseDto> => {
  if (refreshRequestPromise) return refreshRequestPromise;

  const currentRefreshToken = getRefreshToken();
  if (!currentRefreshToken) {
    invalidateSessionAndRedirect(options?.preserveNext ?? true);
    throw new Error('리프레시 토큰이 없습니다. 다시 로그인해주세요.');
  }

  refreshRequestPromise = (async () => {
    const response = await fetch(resolveApiEndpointUrl(AUTH_REFRESH_ENDPOINT), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: currentRefreshToken }),
      mode: 'cors',
      credentials: 'omit',
      redirect: 'manual',
    });

    const { json, text } = await parseResponseBody(response);
    if (!response.ok) {
      const code = typeof json?.code === 'string' ? json.code : '';
      const message =
        (typeof json?.message === 'string' && json.message) ||
        (typeof json?.detail === 'string' && json.detail) ||
        text ||
        `토큰 갱신 실패 (${response.status})`;

      if (
        response.status === 401 ||
        code === 'INVALID_TOKEN' ||
        code === 'TOKEN_EXPIRED' ||
        code === 'UNAUTHORIZED'
      ) {
        invalidateSessionAndRedirect(options?.preserveNext ?? true);
      }
      throw new Error(code ? `[${code}] ${message}` : message);
    }

    const parsed = (json ?? {}) as Partial<TokenResponseDto>;
    if (!parsed.accessToken || !parsed.refreshToken) {
      invalidateSessionAndRedirect(options?.preserveNext ?? true);
      throw new Error('토큰 갱신 응답이 올바르지 않습니다.');
    }

    setAuthToken(parsed.accessToken);
    setRefreshToken(parsed.refreshToken);
    return {
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
    };
  })().finally(() => {
    refreshRequestPromise = null;
  });

  return refreshRequestPromise;
};

// API 요청 헤더 생성
const createHeaders = (includeAuth: boolean = true, isFormData: boolean = false): HeadersInit => {
  const headers: HeadersInit = {};

  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  if (includeAuth) {
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  return headers;
};

// API 요청 래퍼
const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {},
  includeAuth: boolean = true
): Promise<T> => {
  const requestEndpoint = endpoint;
  const url = resolveApiEndpointUrl(endpoint);
  const isFormData = options.body instanceof FormData;
  const shouldHandleAuthFailure =
    includeAuth &&
    requestEndpoint !== AUTH_REFRESH_ENDPOINT &&
    requestEndpoint !== '/api/auth/login' &&
    requestEndpoint !== '/api/auth/signup' &&
    requestEndpoint !== '/api/auth/logout';

  try {
    let retried = false;
    while (true) {
      const config: RequestInit = {
        ...options,
        headers: {
          ...createHeaders(includeAuth, isFormData),
          ...options.headers,
        },
      };

      const finalHeaders: Record<string, string> = {
        ...(config.headers as Record<string, string>),
      };

      if (isFormData) {
        delete finalHeaders['Content-Type'];
        delete finalHeaders['content-type'];
      }

      const hasAuthHeader = !!finalHeaders['Authorization'];
      const token = getAuthToken();
      const finalConfig: RequestInit = {
        ...config,
        headers: finalHeaders,
        mode: 'cors',
        credentials: 'omit',
      };

      let response: Response;
      try {
        response = await fetch(url, {
          ...finalConfig,
          redirect: 'manual',
        });
      } catch (fetchError) {
        throw fetchError;
      }

      // 리다이렉트 응답 처리
      if (response.type === 'opaqueredirect' || response.status === 302 || response.status === 301 || response.status === 307 || response.status === 308) {
        const location = response.headers.get('location');
        
        if (requestEndpoint.includes('/api/auth/login') || requestEndpoint.includes('/api/auth/signup')) {
          const errorMsg = `백엔드 설정 문제: 로그인/회원가입 API가 리다이렉트를 반환하고 있습니다.\n\n` +
            `해결 방법 (백엔드):\n` +
            `1. /api/auth/login, /api/auth/signup 엔드포인트를 Security 필터에서 제외\n` +
            `2. permitAll() 설정 추가\n` +
            `3. OPTIONS 요청(CORS preflight)에 대해 리다이렉트 대신 200 OK 반환\n\n` +
            `현재 요청: ${requestEndpoint}`;
          throw new Error(errorMsg);
        }
        
        if (response.type === 'opaqueredirect' && !location) {
          console.warn('CORS preflight 요청에서 리다이렉트가 발생했습니다. 백엔드 CORS 설정을 확인해주세요.', {
            endpoint: requestEndpoint,
            hasToken: !!token,
            hasAuthHeader,
            responseType: response.type,
            responseStatus: response.status,
            url: response.url,
          });
          
          if (token && hasAuthHeader) {
            const errorMsg = `백엔드 CORS 설정 문제로 인해 요청이 실패했습니다.\n\n` +
              `해결 방법:\n` +
              `1. 백엔드에서 OPTIONS 요청에 대해 리다이렉트 대신 200 OK를 반환하도록 설정\n` +
              `2. CORS 설정에서 Authorization 헤더를 허용하도록 설정\n` +
              `3. Access-Control-Allow-Headers에 "Authorization" 포함\n` +
              `4. CORS 필터가 Security 필터보다 먼저 실행되도록 설정\n\n` +
              `현재 요청: ${requestEndpoint}`;
            throw new Error(errorMsg);
          } else {
            throw new Error('로그인이 필요합니다. 로그인 페이지로 이동해주세요.');
          }
        }
        
        if (location && location.includes('/oauth2/authorization/')) {
          if (!token || !hasAuthHeader) {
            throw new Error('로그인이 필요합니다. 로그인 페이지로 이동해주세요.');
          } else {
            console.warn('인증 토큰이 헤더에 포함되었지만 백엔드가 인증을 요구합니다.', {
              endpoint: requestEndpoint,
              hasToken: !!token,
              hasAuthHeader,
              location,
              responseType: response.type,
              responseStatus: response.status,
            });
            throw new Error('백엔드 인증 오류가 발생했습니다. 토큰은 유지되며, 잠시 후 다시 시도하거나 브라우저를 새로고침해주세요.');
          }
        }
        
        if (!token || !hasAuthHeader) {
          throw new Error('로그인이 필요합니다. 로그인 페이지로 이동해주세요.');
        } else {
          console.warn('인증 토큰이 헤더에 포함되었지만 백엔드가 인증을 요구합니다.', {
            endpoint: requestEndpoint,
            hasToken: !!token,
            hasAuthHeader,
            location,
            responseType: response.type,
            responseStatus: response.status,
          });
          throw new Error('백엔드 인증 오류가 발생했습니다. 토큰은 유지되며, 잠시 후 다시 시도하거나 브라우저를 새로고침해주세요.');
        }
      }
      
      if (response.status === 0) {
        throw new Error('네트워크 연결 실패');
      }
      
      if (response.status === 201) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          return data;
        } else {
          const text = await response.text();
          return text as T;
        }
      }
      
      if (!response.ok) {
        let errorText = '';
        let errorJson: any = null;
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            errorJson = await response.json();
            errorText = JSON.stringify(errorJson, null, 2);
          } else {
            errorText = await response.text();
          }
        } catch (e) {
          errorText = '응답 본문을 읽을 수 없습니다';
        }

        if (
          response.status === 401 &&
          shouldHandleAuthFailure &&
          !retried &&
          getRefreshToken()
        ) {
          retried = true;
          await performTokenRefresh({ preserveNext: true });
          continue;
        }
        
        if (response.status === 401) {
          const fallback =
            errorJson?.message ||
            errorJson?.title ||
            errorText ||
            "인증이 필요합니다. (응답 본문의 code를 백엔드에 전달해 주세요.)";
          const obj =
            errorJson != null && typeof errorJson === "object" && !Array.isArray(errorJson)
              ? (errorJson as Record<string, unknown>)
              : null;

          if (shouldHandleAuthFailure) {
            invalidateSessionAndRedirect(true);
          }
          throw new Error(formatSpring401ForDisplay(obj, String(fallback)));
        }
        
        if (response.status === 409) {
          const backendMessage = errorJson?.message || errorJson?.title || errorText || '이미 존재하는 이메일입니다.';
          throw new Error(backendMessage);
        }

        if (response.status === 502 || response.status === 503 || response.status === 504) {
          const baseUrl = API_BASE_URL || BACKEND_URL;
          const isDevHost =
            typeof window !== "undefined" &&
            (window.location.hostname === "localhost" ||
              window.location.hostname === "127.0.0.1");
          const hint = isDevHost ? ` (백엔드: ${baseUrl})` : "";
          throw new Error(
            `서버가 일시적으로 응답하지 않습니다 (${response.status}). 잠시 후 다시 시도해 주세요.${hint}`,
          );
        }
        
        if (errorText.includes('ERR_NGROK') || errorText.includes('ngrok') || errorText.includes('<!DOCTYPE html>')) {
          if (errorText.includes('ERR_NGROK_3200') || errorText.includes('is offline')) {
            throw new Error(
              'ngrok 터널이 오프라인 상태입니다. 터널이 종료되었거나 연결이 끊어진 것 같습니다.',
            );
          }
          throw new Error('ngrok 관련 오류가 발생했습니다. 터널 상태를 확인해주세요.');
        }

        const backendMessage = errorJson?.message || errorJson?.title || errorText;
        const detail =
          typeof backendMessage === 'string'
            ? backendMessage.trim()
            : String(backendMessage ?? '').trim();
        throw new Error(detail || `요청에 실패했습니다. (${response.status})`);
      }

      if (response.status === 204) {
        return {} as T;
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        try {
          const data = await response.json();
          return data;
        } catch {
          return {} as T;
        }
      } else {
        const text = await response.text();
        return text as T;
      }
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (error instanceof TypeError && (msg === 'Failed to fetch' || msg.includes('fetch'))) {
      throw new Error('네트워크 연결 실패. 백엔드 서버가 켜져 있는지 확인해주세요.');
    }
    if (msg.includes('ERR_EMPTY_RESPONSE') || msg.includes('EMPTY_RESPONSE')) {
      throw new Error('서버에서 응답이 없습니다. 백엔드 서버 상태와 프록시 설정을 확인해주세요.');
    }
    throw error;
  }
};

// 서버 상태 확인
const tryFetch = async (baseUrl: string, path: string, signal: AbortSignal): Promise<Response | null> => {
  try {
    const res = await fetch(`${baseUrl}${path}`, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
      signal,
    });
    return res;
  } catch {
    return null;
  }
};

export const checkServerStatus = async (): Promise<{ online: boolean; message?: string }> => {
  const baseUrl = API_BASE_URL || BACKEND_URL;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const paths = ['/api/health', '/actuator/health', '/'];
    for (const path of paths) {
      const response = await tryFetch(baseUrl, path, controller.signal);
      clearTimeout(timeoutId);
      if (response != null && response.status < 500) {
        return { online: true };
      }
      if (response != null) {
        return { online: false, message: '서버 오류' };
      }
    }

    clearTimeout(timeoutId);
    return {
      online: false,
      message: '연결 실패. CORS 설정 또는 /api/health 엔드포인트를 확인해 주세요.',
    };
  } catch (e) {
    clearTimeout(timeoutId);
    if (e instanceof Error && e.name === 'AbortError') {
      return { online: false, message: '서버 응답 시간 초과' };
    }
    return { online: false, message: '서버 상태 확인 실패' };
  }
};

// 인증 API
export const authApi = {
  // 회원가입
  signup: async (userData: {
    email: string;
    password: string;
    fullName: string;
    role: 'STUDENT' | 'TEACHER';
    phoneNumber?: string;
    birthDate?: string;
    grade?: string;
    classNumber?: string;
    schoolName?: string;
    department?: string;
  }): Promise<string> => {
    return apiRequest<string>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(userData),
    }, false);
  },

  // 로그인
  login: async (credentials: {
    email: string;
    password: string;
  }): Promise<TokenResponseDto> => {
    const response = await apiRequest<TokenResponseDto>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }, false);

    if (response.accessToken) {
      setAuthToken(response.accessToken);
    }
    if (response.refreshToken) {
      setRefreshToken(response.refreshToken);
    }

    return response;
  },

  // 토큰 갱신
  refresh: async (): Promise<TokenResponseDto> => {
    return performTokenRefresh({ preserveNext: true });
  },

  exchangeOAuthCode: async (code: string): Promise<TokenResponseDto> => {
    const response = await apiRequest<TokenResponseDto>(
      '/api/auth/oauth/exchange',
      {
        method: 'POST',
        body: JSON.stringify({ code }),
      },
      false,
    );

    if (!response.accessToken || !response.refreshToken) {
      throw new Error('OAuth 로그인 응답이 올바르지 않습니다.');
    }

    setAuthToken(response.accessToken);
    setRefreshToken(response.refreshToken);
    return response;
  },

  // 로그아웃
  logout: async (): Promise<void> => {
    try {
      await apiRequest<void>('/api/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      // 인증이 이미 만료된 경우 등은 무시
      console.warn('logout API 호출 실패 (무시 가능):', error);
    }
  },

  // 내 정보 조회
  getMe: async (): Promise<User> => {
    return apiRequest<User>('/api/users/me');
  },
};

// 사용자 API
export const userApi = {
  // 프로필 수정
  updateProfile: async (payload: {
    fullName?: string;
    phoneNumber?: string;
    birthDate?: string;
  }): Promise<User> => {
    return apiRequest<User>('/api/users/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  // 비밀번호 변경
  changePassword: async (payload: {
    currentPassword: string;
    newPassword: string;
    confirmNewPassword: string;
  }): Promise<void> => {
    await apiRequest<void>('/api/users/password', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  // 이메일 중복 확인
  checkEmail: async (email: string): Promise<{ email: string; available: boolean; message: string }> => {
    return apiRequest<{ email: string; available: boolean; message: string }>(
      `/api/auth/check-email?email=${encodeURIComponent(email)}`,
      {
        method: 'GET',
      },
      false,
    );
  },

  // 회원 탈퇴
  deleteAccount: async (password: string): Promise<void> => {
    await apiRequest<void>('/api/users/account', {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    });
  },
};

export const notificationsApi = {
  getNotifications: async (params?: PageQueryParams): Promise<PageResponse<NotificationItem>> => {
    const searchParams = new URLSearchParams();
    searchParams.set("page", String(params?.page ?? 0));
    searchParams.set("size", String(Math.min(params?.size ?? 20, 100)));
    searchParams.set("sort", params?.sort ?? "createdAt,desc");
    const res = await apiRequest<PageResponse<Record<string, unknown>>>(
      `/api/notifications?${searchParams.toString()}`,
    );
    const content = Array.isArray(res.content)
      ? res.content.map((it) => normalizeNotificationItem(it))
      : [];
    return { ...(res as unknown as PageResponse<NotificationItem>), content };
  },

  getUnreadCount: async (): Promise<number> => {
    const res = await apiRequest<UnreadCountResponse>(`/api/notifications/unread-count`, {
      method: "GET",
    });
    const c =
      res && typeof res === "object" && typeof (res as any).count === "number"
        ? (res as any).count
        : 0;
    return Number.isFinite(c) ? c : 0;
  },

  markRead: async (notificationId: number): Promise<void> => {
    await apiRequest<void>(
      `/api/notifications/${encodeURIComponent(notificationId)}/read`,
      { method: "POST" },
    );
  },

  markReadAll: async (): Promise<void> => {
    await apiRequest<void>(`/api/notifications/read-all`, { method: "POST" });
  },

  getTeacherPreferences: async (): Promise<TeacherNotificationPreference> => {
    return apiRequest<TeacherNotificationPreference>(
      `/api/notifications/teacher-preferences`,
    );
  },

  updateTeacherPreferences: async (
    payload: TeacherNotificationPreference,
  ): Promise<TeacherNotificationPreference> => {
    return apiRequest<TeacherNotificationPreference>(
      `/api/notifications/teacher-preferences`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
    );
  },

  subscribeNotificationsStream: (callbacks: {
    signal?: AbortSignal;
    onMessage?: (item: NotificationItem) => void;
    onError?: (err: Error) => void;
  }): (() => void) => {
    const endpoint = `/api/notifications/stream`;
    let cancelled = false;
    const abortController = new AbortController();

    const connect = async (attemptIndex: number): Promise<void> => {
      const token = getAuthToken();
      if (!token) {
        callbacks.onError?.(new Error("로그인이 필요합니다."));
        return;
      }

      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        Accept: "text/event-stream",
      };

      try {
        const res = await fetch(resolveApiEndpointUrl(endpoint), {
          method: "GET",
          headers,
          mode: "cors",
          credentials: "omit",
          signal: abortController.signal,
        });
        if (!res.ok) {
          throw new Error(`알림 스트림 요청 실패: ${res.status}`);
        }
        const contentType = (res.headers.get("Content-Type") || "").toLowerCase();
        if (!contentType.includes("text/event-stream")) {
          throw new Error("알림 스트림 응답이 SSE가 아닙니다.");
        }

        for await (const eventData of iterateSseDataPayloadsFromResponse(res, {
          signal: abortController.signal,
        })) {
          if (cancelled || callbacks.signal?.aborted) return;
          const text = (eventData ?? "").trim();
          if (!text) continue;
          try {
            const parsed = JSON.parse(text) as Record<string, unknown>;
            if (parsed && typeof parsed === "object" && Object.keys(parsed).length === 0) {
              continue; // heartbeat {}
            }
            callbacks.onMessage?.(normalizeNotificationItem(parsed));
          } catch {
            // non-json line ignore
          }
        }
      } catch (e) {
        if (cancelled || callbacks.signal?.aborted) return;
        const err = e instanceof Error ? e : new Error(String(e));
        if (isRecoverableTransportError(err) && attemptIndex < SSE_RECONNECT_DELAYS_MS.length) {
          await sleep(SSE_RECONNECT_DELAYS_MS[attemptIndex]);
          await connect(attemptIndex + 1);
          return;
        }
        callbacks.onError?.(err);
        return;
      }

      if (!cancelled && !callbacks.signal?.aborted && attemptIndex < SSE_RECONNECT_DELAYS_MS.length) {
        await sleep(SSE_RECONNECT_DELAYS_MS[attemptIndex]);
        await connect(attemptIndex + 1);
      }
    };

    void connect(0);

    return () => {
      cancelled = true;
      abortController.abort();
    };
  },
};

// 강의실 API
export const courseApi = {
  // 강의실 생성 (선생님 전용)
  createCourse: async (courseData: {
    title: string;
    description: string;
  }): Promise<CourseDetail> => {
    return apiRequest<CourseDetail>('/api/courses', {
      method: 'POST',
      body: JSON.stringify(courseData),
    });
  },

  // 강의실 전체 조회
  getAllCourses: async (params?: CourseListQueryParams): Promise<PageResponse<Course>> => {
    const searchParams = new URLSearchParams();
    searchParams.set('page', String(params?.page ?? 0));
    searchParams.set('size', String(Math.min(params?.size ?? 20, 100)));
    searchParams.set('sort', params?.sort ?? 'updatedAt,desc');
    const qs = searchParams.toString();
    const res = await apiRequest<unknown>(`/api/courses${qs ? `?${qs}` : ''}`);
    if (Array.isArray(res)) {
      const content = res as Course[];
      return {
        content,
        page: 0,
        size: content.length,
        totalElements: content.length,
        totalPages: 1,
        first: true,
        last: true,
      };
    }
    return res as PageResponse<Course>;
  },

  // 강의실 상세 조회
  getCourseDetail: async (courseId: number): Promise<CourseDetail> => {
    return apiRequest<CourseDetail>(`/api/courses/${courseId}`);
  },

  // 강의실 수정 (선생님)
  updateCourse: async (courseId: number, courseData: {
    title: string;
    description: string;
  }): Promise<CourseDetail> => {
    return apiRequest<CourseDetail>(`/api/courses/${courseId}`, {
      method: 'PUT',
      body: JSON.stringify(courseData),
    });
  },

  // 강의실 삭제 (선생님)
  deleteCourse: async (courseId: number): Promise<void> => {
    return apiRequest<void>(`/api/courses/${courseId}`, {
      method: 'DELETE',
    });
  },

  deleteCourseContents: async (
    courseId: number,
    payload: CourseContentsDeleteRequest,
  ): Promise<void> => {
    await apiRequest<void>(
      `/api/courses/${encodeURIComponent(courseId)}/contents/delete`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },

  // 학생 가입 요청 생성 (승인 대기 모델)
  requestJoinByInvitationCode: async (
    invitationCode: string,
  ): Promise<CourseJoinRequestCreateResponse> => {
    return apiRequest<CourseJoinRequestCreateResponse>(`/api/courses/join-requests`, {
      method: 'POST',
      body: JSON.stringify({ invitationCode }),
    });
  },

  joinCourseByInvitationCodeDeprecated: async (code: string): Promise<string> => {
    return apiRequest<string>(
      `/api/courses/join?code=${encodeURIComponent(code)}`,
      { method: "POST" },
    );
  },

  // 학생: 내 강의실 가입 요청 목록
  getMyCourseJoinRequests: async (
    params?: PageQueryParams,
  ): Promise<PageResponse<MyCourseJoinRequestListItem>> => {
    const searchParams = new URLSearchParams();
    searchParams.set("page", String(params?.page ?? 0));
    searchParams.set("size", String(Math.min(params?.size ?? 20, 100)));
    // Swagger: 정렬 허용 필드 createdAt/updatedAt. 응답에는 requestedAt이 내려옴.
    searchParams.set("sort", params?.sort ?? "createdAt,desc");
    const res = await apiRequest<PageResponse<Record<string, unknown>>>(
      `/api/courses/join-requests/me?${searchParams.toString()}`,
    );
    const content = Array.isArray(res.content)
      ? res.content.map((item) =>
          normalizeMyCourseJoinRequestListItem(item as Record<string, unknown>),
        )
      : [];
    return { ...(res as unknown as PageResponse<MyCourseJoinRequestListItem>), content };
  },

  // 교사: 강의실 수강 학생 목록
  getCourseStudents: async (
    courseId: number,
    params?: PageQueryParams,
  ): Promise<PageResponse<CourseStudentListItem>> => {
    const searchParams = new URLSearchParams();
    searchParams.set("page", String(params?.page ?? 0));
    searchParams.set("size", String(Math.min(params?.size ?? 20, 100)));
    searchParams.set("sort", params?.sort ?? "createdAt,desc");
    const res = await apiRequest<PageResponse<Record<string, unknown>>>(
      `/api/courses/${encodeURIComponent(courseId)}/students?${searchParams.toString()}`,
    );
    const content = Array.isArray(res.content)
      ? res.content.map((it) => normalizeCourseStudentListItem(it))
      : [];
    return { ...(res as unknown as PageResponse<CourseStudentListItem>), content };
  },

  // 교사: 수강 학생 제거
  removeCourseStudent: async (courseId: number, studentId: number): Promise<void> => {
    await apiRequest<void>(
      `/api/courses/${encodeURIComponent(courseId)}/students/${encodeURIComponent(studentId)}`,
      { method: "DELETE" },
    );
  },

  // 교사: 수강 학생 차단(수강관계 제거 + 재가입 차단)
  blockCourseStudent: async (courseId: number, studentId: number): Promise<void> => {
    await apiRequest<void>(
      `/api/courses/${encodeURIComponent(courseId)}/students/${encodeURIComponent(studentId)}/block`,
      { method: "POST" },
    );
  },

  // 교사 가입 요청 목록 조회
  getCourseJoinRequests: async (
    courseId: number,
    params?: CourseJoinRequestListQueryParams,
  ): Promise<PageResponse<CourseJoinRequestListItem>> => {
    const searchParams = new URLSearchParams();
    searchParams.set('status', params?.status ?? 'PENDING');
    searchParams.set('page', String(params?.page ?? 0));
    searchParams.set('size', String(Math.min(params?.size ?? 20, 100)));
    searchParams.set('sort', params?.sort ?? 'createdAt,desc');
    const res = await apiRequest<
      PageResponse<Record<string, unknown>>
    >(
      `/api/courses/${encodeURIComponent(courseId)}/join-requests?${searchParams.toString()}`,
    );
    const content = Array.isArray(res.content)
      ? res.content.map((item) =>
          normalizeCourseJoinRequestListItem(item as Record<string, unknown>),
        )
      : [];
    return { ...res, content };
  },

  approveJoinRequest: async (courseId: number, requestId: number): Promise<void> => {
    await apiRequest<void>(
      `/api/courses/${encodeURIComponent(courseId)}/join-requests/${encodeURIComponent(requestId)}/approve`,
      { method: 'POST' },
    );
  },

  rejectJoinRequest: async (courseId: number, requestId: number): Promise<void> => {
    await apiRequest<void>(
      `/api/courses/${encodeURIComponent(courseId)}/join-requests/${encodeURIComponent(requestId)}/reject`,
      { method: 'POST' },
    );
  },

  blockJoinRequest: async (courseId: number, requestId: number): Promise<void> => {
    await apiRequest<void>(
      `/api/courses/${encodeURIComponent(courseId)}/join-requests/${encodeURIComponent(requestId)}/block`,
      { method: 'POST' },
    );
  },

  approveJoinRequestsBulk: async (
    courseId: number,
    requestIds: number[],
  ): Promise<JoinRequestBulkResult> => {
    return apiRequest<JoinRequestBulkResult>(
      `/api/courses/${encodeURIComponent(courseId)}/join-requests/bulk/approve`,
      {
        method: "POST",
        body: JSON.stringify({ requestIds }),
      },
    );
  },

  rejectJoinRequestsBulk: async (
    courseId: number,
    requestIds: number[],
  ): Promise<JoinRequestBulkResult> => {
    return apiRequest<JoinRequestBulkResult>(
      `/api/courses/${encodeURIComponent(courseId)}/join-requests/bulk/reject`,
      {
        method: "POST",
        body: JSON.stringify({ requestIds }),
      },
    );
  },

  getAttendanceSessions: async (
    courseId: number,
    params?: AttendanceSessionListQueryParams,
  ): Promise<PageResponse<AttendanceSession>> => {
    const searchParams = new URLSearchParams();
    searchParams.set("page", String(params?.page ?? 0));
    searchParams.set("size", String(Math.min(params?.size ?? 20, 100)));
    searchParams.set("sort", params?.sort ?? "sessionDate,desc");
    const res = await apiRequest<PageResponse<Record<string, unknown>> | Record<string, unknown>[]>(
      `/api/courses/${encodeURIComponent(courseId)}/attendance/sessions?${searchParams.toString()}`,
    );

    if (Array.isArray(res)) {
      const content = res.map((item) => normalizeAttendanceSession(item));
      return {
        content,
        page: 0,
        size: content.length,
        totalElements: content.length,
        totalPages: 1,
        first: true,
        last: true,
      };
    }

    const content = Array.isArray(res.content)
      ? res.content.map((item) =>
          normalizeAttendanceSession(item as Record<string, unknown>),
        )
      : [];
    return { ...(res as unknown as PageResponse<AttendanceSession>), content };
  },

  createAttendanceSession: async (
    courseId: number,
    payload: AttendanceSessionPayload,
  ): Promise<AttendanceSession> => {
    const res = await apiRequest<Record<string, unknown>>(
      `/api/courses/${encodeURIComponent(courseId)}/attendance/sessions`,
      {
        method: "POST",
        body: JSON.stringify(attendanceSessionPayloadToRequest(payload)),
      },
    );
    return normalizeAttendanceSession(res);
  },

  getAttendanceSession: async (
    courseId: number,
    sessionId: number,
  ): Promise<AttendanceSession> => {
    const res = await apiRequest<Record<string, unknown>>(
      `/api/courses/${encodeURIComponent(courseId)}/attendance/sessions/${encodeURIComponent(sessionId)}`,
    );
    return normalizeAttendanceSession(res);
  },

  updateAttendanceSession: async (
    courseId: number,
    sessionId: number,
    payload: AttendanceSessionPayload,
  ): Promise<AttendanceSession> => {
    const res = await apiRequest<Record<string, unknown>>(
      `/api/courses/${encodeURIComponent(courseId)}/attendance/sessions/${encodeURIComponent(sessionId)}`,
      {
        method: "PATCH",
        body: JSON.stringify(attendanceSessionPayloadToRequest(payload)),
      },
    );
    return normalizeAttendanceSession(res);
  },

  deleteAttendanceSession: async (
    courseId: number,
    sessionId: number,
  ): Promise<void> => {
    await apiRequest<void>(
      `/api/courses/${encodeURIComponent(courseId)}/attendance/sessions/${encodeURIComponent(sessionId)}`,
      { method: "DELETE" },
    );
  },

  getAttendanceRecords: async (
    courseId: number,
    sessionId: number,
  ): Promise<AttendanceRecord[]> => {
    const res = await apiRequest<Record<string, unknown>[]>(
      `/api/courses/${encodeURIComponent(courseId)}/attendance/sessions/${encodeURIComponent(sessionId)}/records`,
    );
    return Array.isArray(res)
      ? res.map((item) => normalizeAttendanceRecord(item))
      : [];
  },

  saveAttendanceRecords: async (
    courseId: number,
    sessionId: number,
    items: AttendanceRecordUpsertItem[],
  ): Promise<void> => {
    await apiRequest<void>(
      `/api/courses/${encodeURIComponent(courseId)}/attendance/sessions/${encodeURIComponent(sessionId)}/records`,
      {
        method: "PUT",
        body: JSON.stringify({ items }),
      },
    );
  },

  getAttendanceMatrix: async (
    courseId: number,
    params?: PageQueryParams,
  ): Promise<CourseAttendanceMatrix> => {
    const searchParams = buildPageSearchParams(params, "name,asc");
    const raw = await apiRequest<Record<string, unknown>>(
      `/api/courses/${encodeURIComponent(courseId)}/attendance/summary?${searchParams.toString()}`,
    );
    return normalizeCourseAttendanceMatrix(raw);
  },

  getMyAttendanceSummary: async (courseId: number): Promise<StudentAttendanceSummary> => {
    const raw = await apiRequest<Record<string, unknown>>(
      `/api/courses/${encodeURIComponent(courseId)}/attendance/me`,
    );
    return normalizeStudentAttendanceSummary(raw);
  },
};

function extractSseTextChunk(payload: Record<string, unknown>): string | undefined {
  for (const key of ["delta", "text", "content", "chunk", "message", "draft"]) {
    const value = payload[key];
    if (typeof value === "string" && value !== "") return value;
  }
  return undefined;
}

async function postJsonSseStream(
  endpoint: string,
  body: Record<string, unknown>,
  options?: {
    signal?: AbortSignal;
    onDelta?: (chunk: string) => void;
    onEvent?: (payload: Record<string, unknown>) => void;
  },
): Promise<string> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    Accept: "text/event-stream",
    "Content-Type": "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(resolveApiEndpointUrl(endpoint), {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    mode: "cors",
    credentials: "omit",
    signal: options?.signal,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text.trim() || `스트림 요청 실패 (${res.status})`);
  }

  let accumulated = "";
  for await (const eventData of iterateSseDataPayloadsFromResponse(res, {
    signal: options?.signal,
  })) {
    const text = eventData.trim();
    if (!text || text === "[DONE]") continue;
    try {
      const parsed = JSON.parse(text) as Record<string, unknown>;
      options?.onEvent?.(parsed);
      const chunk = extractSseTextChunk(parsed);
      if (chunk) {
        accumulated += chunk;
        options?.onDelta?.(chunk);
      }
    } catch {
      accumulated += text;
      options?.onDelta?.(text);
    }
  }
  return accumulated;
}

export const noticeApi = {
  listNotices: async (
    courseId: number,
    params?: PageQueryParams,
  ): Promise<PageResponse<NoticeListItem>> => {
    const searchParams = buildPageSearchParams(params, "pinned,desc");
    const res = await apiRequest<PageResponse<Record<string, unknown>>>(
      `/api/courses/${encodeURIComponent(courseId)}/notices?${searchParams.toString()}`,
    );
    const content = Array.isArray(res.content)
      ? res.content.map((item) => normalizeNoticeListItem(item))
      : [];
    return { ...(res as unknown as PageResponse<NoticeListItem>), content };
  },

  createNotice: async (
    courseId: number,
    payload: NoticePayload,
  ): Promise<NoticeDetail> => {
    const raw = await apiRequest<Record<string, unknown>>(
      `/api/courses/${encodeURIComponent(courseId)}/notices`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
    return normalizeNoticeDetail(raw);
  },

  getNotice: async (courseId: number, noticeId: number): Promise<NoticeDetail> => {
    const raw = await apiRequest<Record<string, unknown>>(
      `/api/courses/${encodeURIComponent(courseId)}/notices/${encodeURIComponent(noticeId)}`,
    );
    return normalizeNoticeDetail(raw);
  },

  updateNotice: async (
    courseId: number,
    noticeId: number,
    payload: Partial<NoticePayload>,
  ): Promise<NoticeDetail> => {
    const raw = await apiRequest<Record<string, unknown>>(
      `/api/courses/${encodeURIComponent(courseId)}/notices/${encodeURIComponent(noticeId)}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
    );
    return normalizeNoticeDetail(raw);
  },

  deleteNotice: async (courseId: number, noticeId: number): Promise<void> => {
    await apiRequest<void>(
      `/api/courses/${encodeURIComponent(courseId)}/notices/${encodeURIComponent(noticeId)}`,
      { method: "DELETE" },
    );
  },

  listComments: async (
    courseId: number,
    noticeId: number,
    params?: PageQueryParams,
  ): Promise<PageResponse<NoticeComment>> => {
    const searchParams = buildPageSearchParams(params, "createdAt,asc");
    const res = await apiRequest<PageResponse<Record<string, unknown>>>(
      `/api/courses/${encodeURIComponent(courseId)}/notices/${encodeURIComponent(noticeId)}/comments?${searchParams.toString()}`,
    );
    const content = Array.isArray(res.content)
      ? res.content.map((item) => normalizeNoticeComment(item))
      : [];
    return { ...(res as unknown as PageResponse<NoticeComment>), content };
  },

  createComment: async (
    courseId: number,
    noticeId: number,
    payload: { contentMarkdown: string; parentCommentId?: number | null },
  ): Promise<NoticeComment> => {
    const raw = await apiRequest<Record<string, unknown>>(
      `/api/courses/${encodeURIComponent(courseId)}/notices/${encodeURIComponent(noticeId)}/comments`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
    return normalizeNoticeComment(raw);
  },

  updateComment: async (
    courseId: number,
    noticeId: number,
    commentId: number,
    contentMarkdown: string,
  ): Promise<NoticeComment> => {
    const raw = await apiRequest<Record<string, unknown>>(
      `/api/courses/${encodeURIComponent(courseId)}/notices/${encodeURIComponent(noticeId)}/comments/${encodeURIComponent(commentId)}`,
      {
        method: "PATCH",
        body: JSON.stringify({ contentMarkdown }),
      },
    );
    return normalizeNoticeComment(raw);
  },

  deleteComment: async (
    courseId: number,
    noticeId: number,
    commentId: number,
  ): Promise<void> => {
    await apiRequest<void>(
      `/api/courses/${encodeURIComponent(courseId)}/notices/${encodeURIComponent(noticeId)}/comments/${encodeURIComponent(commentId)}`,
      { method: "DELETE" },
    );
  },
};

export const discussionApi = {
  listDiscussions: async (
    courseId: number,
    params?: PageQueryParams,
  ): Promise<PageResponse<DiscussionListItem>> => {
    const searchParams = buildPageSearchParams(params, "pinned,desc");
    const res = await apiRequest<PageResponse<Record<string, unknown>>>(
      `/api/courses/${encodeURIComponent(courseId)}/discussions?${searchParams.toString()}`,
    );
    const content = Array.isArray(res.content)
      ? res.content.map((item) => normalizeDiscussionListItem(item))
      : [];
    return { ...(res as unknown as PageResponse<DiscussionListItem>), content };
  },

  createDiscussion: async (
    courseId: number,
    payload: DiscussionPayload,
  ): Promise<DiscussionDetail> => {
    const raw = await apiRequest<Record<string, unknown>>(
      `/api/courses/${encodeURIComponent(courseId)}/discussions`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
    return normalizeDiscussionDetail(raw);
  },

  getDiscussion: async (
    courseId: number,
    discussionId: number,
  ): Promise<DiscussionDetail> => {
    const raw = await apiRequest<Record<string, unknown>>(
      `/api/courses/${encodeURIComponent(courseId)}/discussions/${encodeURIComponent(discussionId)}`,
    );
    return normalizeDiscussionDetail(raw);
  },

  updateDiscussion: async (
    courseId: number,
    discussionId: number,
    payload: Partial<DiscussionPayload>,
  ): Promise<DiscussionDetail> => {
    const raw = await apiRequest<Record<string, unknown>>(
      `/api/courses/${encodeURIComponent(courseId)}/discussions/${encodeURIComponent(discussionId)}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
    );
    return normalizeDiscussionDetail(raw);
  },

  deleteDiscussion: async (
    courseId: number,
    discussionId: number,
  ): Promise<void> => {
    await apiRequest<void>(
      `/api/courses/${encodeURIComponent(courseId)}/discussions/${encodeURIComponent(discussionId)}`,
      { method: "DELETE" },
    );
  },

  listComments: async (
    courseId: number,
    discussionId: number,
    params?: PageQueryParams,
  ): Promise<PageResponse<DiscussionComment>> => {
    const searchParams = buildPageSearchParams(params, "createdAt,asc");
    const res = await apiRequest<PageResponse<Record<string, unknown>>>(
      `/api/courses/${encodeURIComponent(courseId)}/discussions/${encodeURIComponent(discussionId)}/comments?${searchParams.toString()}`,
    );
    const content = Array.isArray(res.content)
      ? res.content.map((item) => normalizeDiscussionComment(item))
      : [];
    return { ...(res as unknown as PageResponse<DiscussionComment>), content };
  },

  createComment: async (
    courseId: number,
    discussionId: number,
    payload: { contentMarkdown: string; parentCommentId?: number | null },
  ): Promise<DiscussionComment> => {
    const raw = await apiRequest<Record<string, unknown>>(
      `/api/courses/${encodeURIComponent(courseId)}/discussions/${encodeURIComponent(discussionId)}/comments`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
    return normalizeDiscussionComment(raw);
  },

  updateComment: async (
    courseId: number,
    discussionId: number,
    commentId: number,
    contentMarkdown: string,
  ): Promise<DiscussionComment> => {
    const raw = await apiRequest<Record<string, unknown>>(
      `/api/courses/${encodeURIComponent(courseId)}/discussions/${encodeURIComponent(discussionId)}/comments/${encodeURIComponent(commentId)}`,
      {
        method: "PATCH",
        body: JSON.stringify({ contentMarkdown }),
      },
    );
    return normalizeDiscussionComment(raw);
  },

  deleteComment: async (
    courseId: number,
    discussionId: number,
    commentId: number,
  ): Promise<void> => {
    await apiRequest<void>(
      `/api/courses/${encodeURIComponent(courseId)}/discussions/${encodeURIComponent(discussionId)}/comments/${encodeURIComponent(commentId)}`,
      { method: "DELETE" },
    );
  },

  streamAssistant: async (
    courseId: number,
    payload: {
      topic: string;
      category?: DiscussionCategory;
      previousDraft?: string;
    },
    options?: { signal?: AbortSignal; onDelta?: (chunk: string) => void },
  ): Promise<string> => {
    return postJsonSseStream(
      `/api/courses/${encodeURIComponent(courseId)}/discussions/assistant/stream`,
      payload,
      options,
    );
  },
};

export const reportCriteriaApi = {
  listCriteria: async (courseId: number): Promise<ReportCriterion[]> => {
    const raw = await apiRequest<Record<string, unknown>[]>(
      `/api/courses/${encodeURIComponent(courseId)}/reports/criteria`,
    );
    return Array.isArray(raw) ? raw.map((item) => normalizeReportCriterion(item)) : [];
  },

  createCriterion: async (
    courseId: number,
    payload: ReportCriterionPayload,
  ): Promise<ReportCriterion> => {
    const raw = await apiRequest<Record<string, unknown>>(
      `/api/courses/${encodeURIComponent(courseId)}/reports/criteria`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
    return normalizeReportCriterion(raw);
  },

  updateCriterion: async (
    courseId: number,
    criterionId: number,
    payload: ReportCriterionPayload,
  ): Promise<ReportCriterion> => {
    const raw = await apiRequest<Record<string, unknown>>(
      `/api/courses/${encodeURIComponent(courseId)}/reports/criteria/${encodeURIComponent(criterionId)}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
    );
    return normalizeReportCriterion(raw);
  },

  deleteCriterion: async (courseId: number, criterionId: number): Promise<void> => {
    await apiRequest<void>(
      `/api/courses/${encodeURIComponent(courseId)}/reports/criteria/${encodeURIComponent(criterionId)}`,
      { method: "DELETE" },
    );
  },

  streamAssistant: async (
    courseId: number,
    payload?: { desiredCount?: number; language?: string },
    options?: { signal?: AbortSignal; onDelta?: (chunk: string) => void },
  ): Promise<string> => {
    return postJsonSseStream(
      `/api/courses/${encodeURIComponent(courseId)}/reports/criteria/assistant/stream`,
      payload ?? {},
      options,
    );
  },
};

function extractReportSseDoneText(payload: Record<string, unknown>): string | undefined {
  for (const k of ["content", "text", "message", "answer", "markdown", "summaryMarkdown"]) {
    const v = payload[k];
    if (typeof v === "string" && v.trim() !== "") return v;
  }
  return undefined;
}

export const studentReportApi = {
  getStudentReports: async (
    courseId: number,
    params?: StudentReportListQueryParams,
  ): Promise<PageResponse<StudentReportListItem>> => {
    const searchParams = new URLSearchParams();
    searchParams.set('page', String(params?.page ?? 0));
    searchParams.set('size', String(Math.min(params?.size ?? 20, 100)));
    searchParams.set('sort', params?.sort ?? 'name,asc');
    if (params?.q) searchParams.set('q', params.q);
    if (params?.status && params.status !== 'all') {
      searchParams.set('status', params.status);
    }
    const res = await apiRequest<PageResponse<Record<string, unknown>>>(
      `/api/courses/${encodeURIComponent(courseId)}/reports/students?${searchParams.toString()}`,
    );
    const content = Array.isArray(res.content)
      ? res.content.map((it) => normalizeStudentReportListItem(it))
      : [];
    return { ...(res as unknown as PageResponse<StudentReportListItem>), content };
  },

  getStudentReportDetail: async (
    courseId: number,
    studentId: number,
  ): Promise<StudentReportDetailResponse> => {
    const raw = await apiRequest<Record<string, unknown>>(
      `/api/courses/${encodeURIComponent(courseId)}/reports/students/${encodeURIComponent(studentId)}`,
    );
    return normalizeStudentReportDetail(raw);
  },

  /** 저장된 강의실 종합 리포트. 미생성 시 204 → `null` */
  getClassroomReport: async (courseId: number): Promise<ClassroomReportResponse | null> => {
    const url = resolveApiEndpointUrl(
      `/api/courses/${encodeURIComponent(courseId)}/reports/classroom`,
    );
    const token = getAuthToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(url, { method: "GET", headers, mode: "cors", credentials: "omit" });
    if (res.status === 204) return null;
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(t.trim() || `강의실 리포트 조회 실패 (${res.status})`);
    }
    const json = (await res.json()) as Record<string, unknown>;
    return normalizeClassroomReport(json);
  },

  analyzeClassroomSync: async (courseId: number): Promise<Record<string, unknown>> => {
    return apiRequest<Record<string, unknown>>(
      `/api/courses/${encodeURIComponent(courseId)}/reports/classroom/analyze`,
      { method: "POST", body: "{}" },
    );
  },

  streamClassroomAnalyze: async (
    courseId: number,
    options?: {
      signal?: AbortSignal;
      onDelta?: (chunk: string) => void;
      onDone?: (payload: Record<string, unknown>) => void;
    },
  ): Promise<void> => {
    const url = resolveApiEndpointUrl(
      `/api/courses/${encodeURIComponent(courseId)}/reports/classroom/analyze/stream`,
    );
    const token = getAuthToken();
    const headers: Record<string, string> = {
      Accept: "text/event-stream",
      "Content-Type": "application/json",
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: "{}",
      mode: "cors",
      credentials: "omit",
      signal: options?.signal,
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(t.trim() || `강의실 분석 스트림 실패 (${res.status})`);
    }
    for await (const ev of iterateLegacyLectureNextSse(res, { signal: options?.signal })) {
      if (ev.kind === "delta" || ev.kind === "thought_delta") {
        if (ev.text) options?.onDelta?.(ev.text);
      } else if (ev.kind === "done") {
        options?.onDone?.(ev.payload);
        return;
      } else if (ev.kind === "error") {
        throw new Error(ev.message);
      }
    }
  },

  getStudentAiContext: async (
    courseId: number,
    studentId: number,
  ): Promise<StudentReportAiContextResponse> => {
    const raw = await apiRequest<Record<string, unknown>>(
      `/api/courses/${encodeURIComponent(courseId)}/reports/students/${encodeURIComponent(studentId)}/ai-context`,
    );
    return normalizeStudentReportAiContext(raw);
  },

  /**
   * 학생 리포트 팔로업 챗봇(SSE). `model`은 전송하지 않음(백엔드 기본 LLM).
   */
  streamStudentReportChat: async (
    courseId: number,
    studentId: number,
    payload: { question: string; messages?: Array<Record<string, unknown>> },
    options?: {
      signal?: AbortSignal;
      onDelta?: (chunk: string) => void;
    },
  ): Promise<string> => {
    const url = resolveApiEndpointUrl(
      `/api/courses/${encodeURIComponent(courseId)}/reports/students/${encodeURIComponent(studentId)}/chat/stream`,
    );
    const token = getAuthToken();
    const headers: Record<string, string> = {
      Accept: "text/event-stream",
      "Content-Type": "application/json",
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    const bodyObj: Record<string, unknown> = { question: payload.question };
    if (payload.messages != null && payload.messages.length > 0) {
      bodyObj.messages = payload.messages;
    }
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(bodyObj),
      mode: "cors",
      credentials: "omit",
      signal: options?.signal,
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(t.trim() || `리포트 챗봇 요청 실패 (${res.status})`);
    }
    let accumulated = "";
    let lastDone: Record<string, unknown> | null = null;
    for await (const ev of iterateLegacyLectureNextSse(res, { signal: options?.signal })) {
      if (ev.kind === "delta" || ev.kind === "thought_delta") {
        if (ev.text) {
          accumulated += ev.text;
          options?.onDelta?.(ev.text);
        }
      } else if (ev.kind === "done") {
        lastDone = ev.payload;
        break;
      } else if (ev.kind === "error") {
        throw new Error(ev.message);
      }
    }
    const fromDone = lastDone ? extractReportSseDoneText(lastDone) : undefined;
    if (!accumulated.trim() && fromDone) {
      accumulated = fromDone;
      options?.onDelta?.(fromDone);
    }
    return accumulated;
  },
};

// 강의실 전체 n주차별 리소스 조회 API
export const courseContentsApi = {
  getCourseContents: async (courseId: number): Promise<CourseContentsResponse> => {
    return apiRequest<CourseContentsResponse>(`/api/courses/${encodeURIComponent(courseId)}/contents`, {
      method: 'GET',
    });
  },
};

// 강의 API
export const lectureApi = {
  // 강의 생성 (선생님)
  createLecture: async (courseId: number, lectureData: {
    title: string;
    weekNumber: number;
    description?: string;
  }): Promise<LectureResponseDto> => {
    return apiRequest<LectureResponseDto>(`/api/courses/${courseId}/lectures`, {
      method: 'POST',
      body: JSON.stringify(lectureData),
    });
  },

  // 강의 상세 조회
  getLectureDetail: async (lectureId: number): Promise<LectureDetailResponseDto> => {
    return apiRequest<LectureDetailResponseDto>(`/api/lectures/${lectureId}`);
  },

  // 강의 정보 수정 (선생님)
  updateLecture: async (lectureId: number, lectureData: {
    title?: string;
    weekNumber?: number;
    description?: string;
  }): Promise<LectureResponseDto> => {
    return apiRequest<LectureResponseDto>(`/api/lectures/${lectureId}`, {
      method: 'PUT',
      body: JSON.stringify(lectureData),
    });
  },

  // 강의 삭제 (선생님)
  deleteLecture: async (lectureId: number): Promise<void> => {
    return apiRequest<void>(`/api/lectures/${lectureId}`, {
      method: 'DELETE',
    });
  },

  // AI 강의 콘텐츠 생성 (선생님) — PDF 업로드 후 강의 생성
  generateContent: async (lectureId: number, body?: { pdfPath?: string }): Promise<void> => {
    return apiRequest<void>(`/api/lectures/${lectureId}/generate-content`, {
      method: 'POST',
      body: body ? JSON.stringify(body) : '{}',
    });
  },

  // AI 콘텐츠 생성 상태 조회
  getAiStatus: async (lectureId: number): Promise<{ status: string; progress?: number; message?: string }> => {
    return apiRequest<{ status: string; progress?: number; message?: string }>(`/api/lectures/${lectureId}/ai-status`, { method: 'GET' });
  },

  /** 강의 자료 삭제 - DELETE /api/lectures/{lectureId}/materials/{materialId} (BE에서 이 경로로 로그 수신 확인) */
  deleteMaterial: async (lectureId: number, materialId: number): Promise<void> => {
    return apiRequest<void>(`/api/lectures/${lectureId}/materials/${materialId}`, {
      method: 'DELETE',
    });
  },

  // 강의 자료 업로드 (PDF) (선생님) - POST /api/lectures/{lectureId}/materials, multipart/form-data file
  // 응답: { materialId, displayName, materialType, url, fileUrl } (Swagger 명세)
  uploadMaterial: async (lectureId: number, file: File): Promise<LectureMaterialUploadResult> => {
    const formData = new FormData();
    formData.append("file", file);

    const rawResponse = await apiRequest<unknown>(
      `/api/lectures/${lectureId}/materials`,
      {
        method: "POST",
        body: formData,
      },
      true
    );

    let materialId: number | undefined;
    let fileUrl: string | null = null;
    let displayName: string | undefined;

    if (typeof rawResponse === "string") {
      fileUrl = rawResponse;
    } else if (rawResponse && typeof rawResponse === "object") {
      const anyResp = rawResponse as {
        materialId?: unknown;
        fileUrl?: unknown;
        url?: unknown;
        displayName?: unknown;
        data?: unknown;
      };

      if (typeof anyResp.materialId === "number") {
        materialId = anyResp.materialId;
      }
      if (typeof anyResp.displayName === "string") {
        displayName = anyResp.displayName;
      }
      if (typeof anyResp.fileUrl === "string") {
        fileUrl = anyResp.fileUrl;
      } else if (typeof anyResp.url === "string") {
        fileUrl = anyResp.url;
      }

      if (!fileUrl && anyResp.data != null) {
        const data = anyResp.data as Record<string, unknown> | string;
        if (typeof data === "string") {
          fileUrl = data;
        } else if (data && typeof data === "object") {
          if (typeof (data as { materialId?: unknown }).materialId === "number") {
            materialId = (data as { materialId: number }).materialId;
          }
          if (typeof (data as { displayName?: unknown }).displayName === "string") {
            displayName = (data as { displayName: string }).displayName;
          }
          const urlVal = (data as { fileUrl?: unknown; url?: unknown }).fileUrl ?? (data as { url?: unknown }).url;
          if (typeof urlVal === "string") {
            fileUrl = urlVal;
          }
        }
      }
    }

    if (!fileUrl && materialId == null) {
      console.warn("uploadMaterial: 업로드 응답에서 fileUrl/materialId를 찾지 못했습니다.", rawResponse);
      return { materialId: undefined, fileUrl: "", displayName: displayName ?? file.name };
    }

    if (fileUrl && !/^https?:\/\//i.test(fileUrl)) {
      const baseUrl = API_BASE_URL || BACKEND_URL;
      fileUrl = fileUrl.startsWith("/") ? `${baseUrl}${fileUrl}` : `${baseUrl}/${fileUrl}`;
    }

    return {
      materialId,
      fileUrl: fileUrl ?? "",
      displayName: displayName ?? file.name,
    };
  },
};

// 강의 자료 API
export const materialApi = {
  deleteMaterial: async (materialId: number): Promise<void> => {
    return apiRequest<void>(`/api/materials/${materialId}`, {
      method: 'DELETE',
    });
  },

  /** 강의 자료(PDF) 다운로드/미리보기 - application/pdf 바이트 반환, 인증 필요 */
  getMaterialFile: async (materialId: number): Promise<Blob> => {
    const isDevHost =
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const endpoint = `/api/materials/${materialId}/file`;
    const baseUrl = API_BASE_URL || BACKEND_URL;
    const url = isDevHost && endpoint.startsWith('/api')
      ? endpoint
      : `${baseUrl}${endpoint}`;
    const token = getAuthToken();
    const doFetch = (targetUrl: string) =>
      fetch(targetUrl, {
        method: 'GET',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'omit',
        mode: 'cors',
      });

    let res = await doFetch(url);

    // 개발 환경: 프록시 경유 시 502면 백엔드 직접 URL로 한 번 재시도
    if (!res.ok && res.status === 502 && isDevHost && url === endpoint) {
      const directUrl = `${baseUrl}${endpoint}`;
      res = await doFetch(directUrl);
    }

    if (!res.ok) {
      const status = res.status;
      if (status === 401) {
        throw new Error('접근 권한이 없습니다.');
      }
      if (status === 502 || status === 503 || status === 504) {
        const hint = isDevHost
          ? ` 백엔드(${baseUrl})가 켜져 있는지 확인해 주세요.`
          : '';
        throw new Error(
          `서버가 일시적으로 응답하지 않습니다 (${status}). 잠시 후 다시 시도해 주세요.${hint}`
        );
      }
      const text = await res.text();
      throw new Error(text || `파일을 불러올 수 없습니다. (${status})`);
    }
    return res.blob();
  },
};

/** AI 강의 질문 답변 요청 (POST /api/inquiries/answer) */
export interface InquiryAnswerRequest {
  aiQuestionId: string;
  answerText: string;
}

// 학습활동 API
export const learningActivityApi = {
  // 손들 질문 제출 (학생)
  submitInquiry: async (lectureId: number, inquiry: Inquiry): Promise<InquiryResponse> => {
    return apiRequest<InquiryResponse>(`/api/lectures/${lectureId}/inquiries`, {
      method: 'POST',
      body: JSON.stringify(inquiry),
    });
  },

  /** AI 강의 질문에 학생 답변 후 정답/오답·해설·하위 개념 질문 수신 (POST /api/inquiries/answer) */
  answerInquiry: async (payload: InquiryAnswerRequest): Promise<InquiryAnswerResponse> => {
    return apiRequest<InquiryAnswerResponse>('/api/inquiries/answer', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // 자가 진단 퀴즈 생성 (학생)
  generateSelfDiagnosisQuiz: async (lectureId: number): Promise<QuizQuestion[]> => {
    return apiRequest<QuizQuestion[]>(`/api/lectures/${lectureId}/self-diagnosis-quiz`, {
      method: 'POST',
      body: JSON.stringify([]),
    });
  },
};

// 평가 및 제출 API
export const assessmentApi = {
  // 강의실별 평가 목록 조회
  getAssessmentsForCourse: async (courseId: number): Promise<AssessmentSimpleDto[]> => {
    return apiRequest<AssessmentSimpleDto[]>(`/api/assessments/courses/${courseId}`);
  },

  // 평가 생성 (선생님)
  createAssessment: async (courseId: number, assessment: {
    title: string;
    type: 'QUIZ' | 'ASSIGNMENT';
    dueDate: string;
    questions: Array<{
      text: string;
      type: 'FLASHCARD' | 'OX' | 'MULTICHOICE' | 'ESSAY';
      createdBy?: 'TEACHER' | 'AI';
      choiceOptions?: Array<{
        text: string;
        correct: boolean;
      }>;
    }>;
  }): Promise<string> => {
    return apiRequest<string>(`/api/assessments/courses/${courseId}`, {
      method: 'POST',
      body: JSON.stringify(assessment),
    });
  },

  // 평가 상세 조회 (문제 포함)
  getAssessmentDetail: async (assessmentId: number): Promise<AssessmentDetailDto> => {
    return apiRequest<AssessmentDetailDto>(`/api/assessments/${assessmentId}`);
  },

  // 답안 제출 현황 조회 (선생님)
  getSubmissionsForAssessment: async (assessmentId: number): Promise<SubmissionStatusDto[]> => {
    return apiRequest<SubmissionStatusDto[]>(`/api/assessments/${assessmentId}/submissions`);
  },

  // 답안 제출 (학생)
  createSubmission: async (assessmentId: number, submission: SubmissionRequestDto): Promise<string> => {
    return apiRequest<string>(`/api/assessments/${assessmentId}/submissions`, {
      method: 'POST',
      body: JSON.stringify(submission),
    });
  },

  // 제출 결과 조회 (학생)
  getSubmissionResult: async (submissionId: number): Promise<SubmissionResponseDto> => {
    return apiRequest<SubmissionResponseDto>(`/api/submissions/${submissionId}`);
  },
};

// 강의 자료 생성 API (파일 업로드 및 AI 에이전트 처리)
export interface LectureMaterialResponse {
  markdown: string;
  fileUrl: string;
  fileName: string;
}

// 강의 자료 생성 v2 Phase 응답 타입 (필요 부분만 최소 정의)
export interface MaterialsPhase1Request {
  lectureId: number;
  keyword: string;
  pdfPath?: string;
}

export interface MaterialsPhase1Response {
  sessionId: number;
  draftPlan: Record<string, unknown>;
  progressPercentage: number;
  message?: string;
}

export interface MaterialsPhase2Request {
  sessionId: number;
  // BE 스펙: action은 "confirm" 또는 "feedback"만 허용
  action: "confirm" | "feedback";
  feedback?: string;
}

/** Phase 2 응답: draftPlan(기본), updatedPlan(수정 요청 후 갱신된 기획안), finalizedBrief(확정 시) */
export interface MaterialsPhase2Response {
  sessionId: number;
  draftPlan?: Record<string, unknown>;
  updatedPlan?: Record<string, unknown>;
  finalizedBrief?: Record<string, unknown>;
  progressPercentage: number;
  message?: string;
}

export interface MaterialsPhase3Request {
  sessionId: number;
}

export interface MaterialsPhase3Response {
  sessionId: number;
  chapterContentList: Record<string, unknown>;
  totalChapters?: number;
  progressPercentage: number;
  message?: string;
}

export interface MaterialsPhase4Request {
  sessionId: number;
}

export interface MaterialsPhase4Response {
  sessionId: number;
  verifiedContent: Record<string, unknown>;
  progressPercentage: number;
  message?: string;
}

export interface MaterialsPhase5Request {
  sessionId: number;
}

export interface MaterialsPhase5Response {
  sessionId: number;
  finalDocument: string;
  documentUrl?: string;
  progressPercentage: number;
  message?: string;
}

// 최근 세션 조회 / 세션 복구 응답 (latest-session, recover 공통)
export interface MaterialsLatestSessionResponse {
  sessionId: number;
  lectureId: number;
  currentPhase: string;
  progressPercentage: number;
  draftPlan?: Record<string, unknown>;
  finalizedBrief?: Record<string, unknown>;
  chapterContentList?: Record<string, unknown>;
  verifiedContent?: Record<string, unknown>;
  finalDocument?: string;
  documentUrl?: string;
  errorMessage?: string;
  // 그 외 추가 필드는 자유 형식
  [key: string]: unknown;
}

// Phase 3~5 비동기 실행 (한 번에 실행)
export interface MaterialsGenerationAsyncRequest {
  sessionId: number;
}

export interface MaterialsGenerationAsyncResponse {
  taskId: string;
  status: string;
  message?: string;
  statusUrl?: string;
}

export interface TaskStatusResponse {
  taskId?: string;
  status: string;
  documentUrl?: string;
  progressPercentage?: number;
  message?: string;
  [key: string]: unknown;
}

// 모니터링 API 타입 (필수 필드만 최소 정의, 나머지는 자유형)
export interface MonitoringOverview {
  timestamp?: string;
  status?: string;
  [key: string]: unknown;
}

export interface RateLimitStats {
  [key: string]: unknown;
}

export interface CacheStats {
  [key: string]: unknown;
}

export interface AgentStats {
  [key: string]: unknown;
}

// 스트리밍 러닝 세션 타입
export interface StreamSessionState {
  status: string;
  lectureId: number;
  serviceStatus?: string;
  chapters?: Record<string, unknown>;
  questions?: Record<string, unknown>;
  /** 스웨거 session 응답 확장 필드 */
  job?: Record<string, unknown>;
  logs?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
  error?: Record<string, unknown> | null;
}

export interface StreamInitializeResponse {
  status: string;
  lectureId: number;
  totalChapters: number;
  chapters: Array<{
    title: string;
    startPage: number;
    endPage: number;
  }>;
}

export type ContentType = 'CONCEPT' | 'QUESTION' | 'SUPPLEMENTARY' | 'SCRIPT';

export interface StreamNextResponse {
  status: string;
  lectureId: number;
  contentType: ContentType | string;
  contentData: string;
  chapterTitle?: string;
  hasMore: boolean;
  waitingForAnswer: boolean;
  aiQuestionId?: string;
}

export interface StreamAnswerRequest {
  aiQuestionId: string;
  answer: string;
}

export interface StreamAnswerResponse {
  status: string;
  lectureId: number;
  aiQuestionId: string;
  question?: string;
  chapterTitle?: string;
  canContinue: boolean;
  supplementary?: string;
}

interface LearningSessionState {
  sessionId: string;
  lectureId: number;
}

export interface IntegratedLearningMessage {
  type: string;
  text: string;
  waitingForAnswer?: boolean;
  questionId?: string;
  final?: boolean;
  raw?: Record<string, unknown>;
  /** 구조화 퀴즈(done+오버레이)가 있을 때 채팅에 오버레이 열기 버튼 표시 */
  integratedQuizOpenButton?: boolean;
}

/** 통합학습 SSE 퀴즈 오버레이 UI용 정규화 문항 */
export type IntegratedQuizDisplayKind = "flash" | "mcq" | "ox" | "short" | "unknown";

export interface IntegratedQuizDisplayItem {
  id: string;
  kind: IntegratedQuizDisplayKind;
  front?: string;
  back?: string;
  stem?: string;
  options?: { key: string; content: string }[];
  /** O/X·객관식 정답(원문). OX는 O/X, 객관식은 보기 key 또는 A·1 등 */
  correctAnswer?: string;
  explanation?: string;
  /** 주관식 참고 답안(채점 후 표시) */
  referenceAnswer?: string;
}

export interface IntegratedQuizOverlayModel {
  title: string;
  quizTypeRaw: string;
  items: IntegratedQuizDisplayItem[];
}

/** 통합 학습 v3 `.../event` SSE — 청크 단위 UI (사고 요약 / 본문) */
export type LearningSseStreamCallbacks = {
  onThoughtDelta?: (text: string, raw: Record<string, unknown>) => void;
  onAgentDelta?: (text: string, raw: Record<string, unknown>) => void;
  onDone?: (payload: Record<string, unknown>) => void;
  onError?: (message: string, raw?: Record<string, unknown>) => void;
  signal?: AbortSignal;
};

const LEARNING_THOUGHT_TYPE_NAMES = new Set([
  "thought",
  "thinking",
  "reasoning",
  "thought_summary",
  "internal",
  "think",
]);

function isLearningThoughtSseEvent(ev: Record<string, unknown>): boolean {
  const t = String(ev.type ?? ev.event ?? "").toLowerCase();
  const phase = String(
    pickFirstString(ev, ["phase", "streamPhase", "stream_phase"]) ?? "",
  ).toLowerCase();
  const role = String(pickFirstString(ev, ["role"]) ?? "").toLowerCase();
  const ct = String(ev.contentType ?? ev.content_type ?? "").toUpperCase();
  return (
    LEARNING_THOUGHT_TYPE_NAMES.has(t) ||
    phase === "thought" ||
    phase === "thinking" ||
    role === "thinking" ||
    ct === "THOUGHT"
  );
}

function learningSseEventDeltaText(ev: Record<string, unknown>): string {
  const payload = (ev.payload as Record<string, unknown> | undefined) ?? {};
  return (
    pickFirstString(ev, [
      "delta",
      "content",
      "message",
      "text",
      "answer",
      "main",
      "thought",
    ]) ??
    pickFirstString(payload, [
      "delta",
      "content",
      "message",
      "text",
      "answer",
      "main",
      "thought",
    ]) ??
    ""
  );
}

export const lectureMaterialApi = {
  // 파일 업로드 및 강의 자료 생성
  uploadAndGenerate: async (file: File): Promise<LectureMaterialResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    
    return apiRequest<LectureMaterialResponse>('/api/lecture-materials/generate', {
      method: 'POST',
      body: formData,
    }, true); // includeAuth = true
  },
};

// 강의 자료 생성 v2 Phase API
export const materialGenerationApi = {
  phase1: async (payload: MaterialsPhase1Request): Promise<MaterialsPhase1Response> => {
    return apiRequest<MaterialsPhase1Response>("/api/materials/generation/phase1", {
      method: "POST",
      body: JSON.stringify({
        keyword: payload.keyword ?? (payload as unknown as { topic?: string }).topic ?? "",
        lectureId: payload.lectureId,
        pdfPath: payload.pdfPath ?? "",
      }),
    });
  },

  phase2: async (payload: MaterialsPhase2Request): Promise<MaterialsPhase2Response> => {
    return apiRequest<MaterialsPhase2Response>("/api/materials/generation/phase2", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  phase3: async (payload: MaterialsPhase3Request): Promise<MaterialsPhase3Response> => {
    return apiRequest<MaterialsPhase3Response>("/api/materials/generation/phase3", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  phase4: async (payload: MaterialsPhase4Request): Promise<MaterialsPhase4Response> => {
    return apiRequest<MaterialsPhase4Response>("/api/materials/generation/phase4", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  phase5: async (payload: MaterialsPhase5Request): Promise<MaterialsPhase5Response> => {
    return apiRequest<MaterialsPhase5Response>("/api/materials/generation/phase5", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // 특정 강의의 최근 세션 조회
  getLatestSessionForLecture: async (lectureId: number): Promise<MaterialsLatestSessionResponse> => {
    return apiRequest<MaterialsLatestSessionResponse>(
      `/api/materials/generation/lectures/${lectureId}/latest-session`,
      { method: "GET" }
    );
  },

  // 세션 복구 (에러 메시지 제거 후 재시도 가능 상태로 변경)
  recoverSession: async (sessionId: number): Promise<MaterialsLatestSessionResponse> => {
    return apiRequest<MaterialsLatestSessionResponse>(
      `/api/materials/generation/${sessionId}/recover`,
      { method: "POST" }
    );
  },

  /** Phase 3~5 한 번에 비동기 실행. taskId 반환 후 /api/tasks/{taskId}/status 로 진행 조회 */
  runAsync: async (payload: MaterialsGenerationAsyncRequest): Promise<MaterialsGenerationAsyncResponse> => {
    return apiRequest<MaterialsGenerationAsyncResponse>("/api/materials/generation/async", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /** [삭제] 생성 세션 전체 삭제 (Phase 1~5). 해당 강의 소유 교사만 삭제 가능 */
  deleteSession: async (sessionId: number): Promise<void> => {
    return apiRequest<void>(`/api/materials/generation/${sessionId}`, { method: "DELETE" });
  },

  /** [삭제] Phase 5 산출물(최종 문서)만 삭제. 세션은 유지, Phase 4 상태로 되돌아감 */
  deleteSessionDocument: async (sessionId: number): Promise<void> => {
    return apiRequest<void>(`/api/materials/generation/${sessionId}/document`, { method: "DELETE" });
  },

  /** [미구현→추가] 최종 문서 다운로드/조회. 완료된 세션의 문서 URL 또는 메타 정보 반환 */
  getDocument: async (sessionId: number): Promise<{ documentUrl?: string; url?: string; [key: string]: unknown }> => {
    return apiRequest<{ documentUrl?: string; url?: string; [key: string]: unknown }>(
      `/api/materials/generation/${sessionId}/document`,
      { method: "GET" }
    );
  },

  /** [미구현→추가] 생성 상태 조회 (세션 단위) */
  getSessionStatus: async (sessionId: number): Promise<{ status: string; documentUrl?: string; progressPercentage?: number; message?: string; [key: string]: unknown }> => {
    return apiRequest(
      `/api/materials/generation/${sessionId}/status`,
      { method: "GET" }
    );
  },

  /** [미구현→추가] 실시간 진행 상황 조회 */
  getProgress: async (sessionId: number): Promise<{ progressPercentage?: number; message?: string; [key: string]: unknown }> => {
    return apiRequest(
      `/api/materials/generation/${sessionId}/progress`,
      { method: "GET" }
    );
  },

  /** [미구현→추가] Phase 3~5 삭제 후 기획안(Phase 2)으로 되돌리기 */
  rollbackToPhase2: async (sessionId: number): Promise<{ sessionId: number; [key: string]: unknown }> => {
    return apiRequest(
      `/api/materials/generation/${sessionId}/rollback-to-phase2`,
      { method: "POST" }
    );
  },

  /**
   * Phase N 스트리밍 (GET /api/materials/generation/phaseN/stream?sessionId=...)
   * 인증이 필요하므로 SSE도 EventSource가 아닌 fetch + ReadableStream(`iterateSseDataPayloadsFromResponse`)로 수신.
   * 비-SSE 응답은 동일하게 fetch 본문을 reader로 읽는다.
   */
  streamPhase: (
    sessionId: number,
    phase: 1 | 2 | 3 | 4 | 5,
    callbacks: {
      onProgress?: (data: { progressPercentage?: number; message?: string; currentPhase?: string }) => void;
      onContent?: (chunk: string) => void;
      onDone?: (data: { finalDocument?: string; documentUrl?: string }) => void;
      onError?: (err: Error) => void;
    }
  ): (() => void) => {
    const endpoint = `/api/materials/generation/phase${phase}/stream?sessionId=${encodeURIComponent(sessionId)}`;
    let cancelled = false;
    const abortController = new AbortController();
    let completed = false;

    const connect = async (attemptIndex: number): Promise<void> => {
      const token = getAuthToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      try {
        const res = await fetch(resolveApiEndpointUrl(endpoint), {
          method: "GET",
          headers,
          mode: "cors",
          credentials: "omit",
          signal: abortController.signal,
        });
        if (!res.ok) {
          throw new Error(`스트림 요청 실패: ${res.status}`);
        }
        const contentType = (res.headers.get("Content-Type") || "").toLowerCase();
        const isSSE = contentType.includes("text/event-stream");
        if (isSSE) {
          try {
            for await (const eventData of iterateSseDataPayloadsFromResponse(res, {
              signal: abortController.signal,
            })) {
              if (cancelled) return;
              try {
                const data = eventData ? (JSON.parse(eventData) as Record<string, unknown>) : {};
                const type = String(data.type ?? data.event ?? "").toLowerCase();
                if (type === "heartbeat") continue;
                if (type === "timeout") {
                  if (attemptIndex < SSE_RECONNECT_DELAYS_MS.length) {
                    callbacks.onProgress?.({
                      message: `연결 재시도 중... (${attemptIndex + 1}/${SSE_RECONNECT_DELAYS_MS.length})`,
                    });
                    await sleep(SSE_RECONNECT_DELAYS_MS[attemptIndex]);
                    await connect(attemptIndex + 1);
                    return;
                  }
                  callbacks.onError?.(new Error("스트림 재연결에 실패했습니다. 다시 시도해주세요."));
                  return;
                }
                if (type === "error") {
                  callbacks.onError?.(new Error(String(data.message ?? "스트림 오류")));
                  return;
                }
                if (data.finalDocument != null || data.documentUrl != null || type === "done") {
                  completed = true;
                  callbacks.onDone?.({
                    finalDocument: typeof data.finalDocument === "string" ? data.finalDocument : undefined,
                    documentUrl: typeof data.documentUrl === "string" ? data.documentUrl : undefined,
                  });
                  return;
                } else if (data.progressPercentage != null || data.message != null || data.currentPhase != null) {
                  callbacks.onProgress?.({
                    progressPercentage: typeof data.progressPercentage === "number" ? data.progressPercentage : undefined,
                    message: typeof data.message === "string" ? data.message : undefined,
                    currentPhase: typeof data.currentPhase === "string" ? data.currentPhase : undefined,
                  });
                } else if (typeof data.chunk === "string") {
                  callbacks.onContent?.(data.chunk);
                }
              } catch {
                /* ignore parse error for non-JSON lines */
              }
            }
          } catch (e) {
            if (!cancelled && isRecoverableTransportError(e) && attemptIndex < SSE_RECONNECT_DELAYS_MS.length) {
              callbacks.onProgress?.({
                message: `연결 재시도 중... (${attemptIndex + 1}/${SSE_RECONNECT_DELAYS_MS.length})`,
              });
              await sleep(SSE_RECONNECT_DELAYS_MS[attemptIndex]);
              await connect(attemptIndex + 1);
              return;
            }
            if (!cancelled && e instanceof Error && e.name !== "AbortError") {
              callbacks.onError?.(e);
            }
          }
          if (!completed && !cancelled && attemptIndex < SSE_RECONNECT_DELAYS_MS.length) {
            callbacks.onProgress?.({
              message: `연결 재시도 중... (${attemptIndex + 1}/${SSE_RECONNECT_DELAYS_MS.length})`,
            });
            await sleep(SSE_RECONNECT_DELAYS_MS[attemptIndex]);
            await connect(attemptIndex + 1);
          }
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) {
          callbacks.onError?.(new Error("스트림 본문을 읽을 수 없습니다."));
          return;
        }
        const decoder = new TextDecoder();
        let buffer = "";
        while (!cancelled) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          callbacks.onContent?.(buffer);
          buffer = "";
        }
        if (buffer.trim()) callbacks.onContent?.(buffer);
      } catch (e) {
        if (!cancelled && isRecoverableTransportError(e) && attemptIndex < SSE_RECONNECT_DELAYS_MS.length) {
          callbacks.onProgress?.({
            message: `연결 재시도 중... (${attemptIndex + 1}/${SSE_RECONNECT_DELAYS_MS.length})`,
          });
          await sleep(SSE_RECONNECT_DELAYS_MS[attemptIndex]);
          await connect(attemptIndex + 1);
          return;
        }
        if (!cancelled && e instanceof Error && e.name !== "AbortError") callbacks.onError?.(e);
      }
    };

    void connect(0);

    return () => {
      cancelled = true;
      abortController.abort();
    };
  },
};

export const tasksApi = {
  getStatus: async (taskId: string): Promise<TaskStatusResponse> => {
    return apiRequest<TaskStatusResponse>(`/api/tasks/${encodeURIComponent(taskId)}/status`, { method: "GET" });
  },
};

// 모니터링 API
export const monitoringApi = {
  getOverview: async (): Promise<MonitoringOverview> => {
    return apiRequest<MonitoringOverview>("/api/monitoring");
  },
  getRateLimit: async (): Promise<RateLimitStats> => {
    return apiRequest<RateLimitStats>("/api/monitoring/rate-limit");
  },
  getCache: async (): Promise<CacheStats> => {
    return apiRequest<CacheStats>("/api/monitoring/cache");
  },
  getAgents: async (): Promise<AgentStats> => {
    return apiRequest<AgentStats>("/api/monitoring/agents");
  },
};

const learningSessionByLecture = new Map<number, LearningSessionState>();

/**
 * 인증(Authorization) 헤더가 필요한 SSE는 브라우저 `EventSource`로 설정할 수 없다.
 * `fetch` 후 `Response.body`(ReadableStream)에서 `getReader()`로 읽고 `data:` 줄만 파싱한다.
 */
async function* iterateSseDataPayloadsFromResponse(
  response: Response,
  options?: { signal?: AbortSignal },
): AsyncGenerator<string, void, undefined> {
  const stream = response.body;
  if (!stream) return;

  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      if (options?.signal?.aborted) {
        await reader.cancel();
        return;
      }
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n");
      buffer = parts.pop() ?? "";
      for (const rawLine of parts) {
        const line = rawLine.replace(/\r$/, "").trimEnd();
        if (!line.startsWith("data:")) continue;
        yield line.slice("data:".length).trimStart();
      }
    }

    const tail = buffer.replace(/\r$/, "").trimEnd();
    if (tail.startsWith("data:")) {
      yield tail.slice("data:".length).trimStart();
    }
  } finally {
    reader.releaseLock();
  }
}

/** Spring `Flux<ServerSentEvent>` / 표준 SSE: `event:` + `data:` 블록이 빈 줄(`\\n\\n`)로 구분됨 */
type LegacyLectureNextSseYield =
  | { kind: "thought_delta"; text: string; raw: Record<string, unknown> }
  | { kind: "delta"; text: string; raw: Record<string, unknown> }
  | { kind: "done"; payload: Record<string, unknown> }
  | { kind: "error"; message: string; raw?: Record<string, unknown> };

const LEGACY_SSE_THOUGHT_NAMES = new Set([
  "thought",
  "thinking",
  "reasoning",
  "thought_summary",
  "internal",
  "think",
]);

function consumeDoubleNewlineBlock(buffer: string): { block: string; rest: string } | null {
  const rn = buffer.indexOf("\r\n\r\n");
  const n = buffer.indexOf("\n\n");
  let end = -1;
  let sep = 2;
  if (rn !== -1 && (n === -1 || rn <= n)) {
    end = rn;
    sep = 4;
  } else if (n !== -1) {
    end = n;
    sep = 2;
  } else {
    return null;
  }
  return { block: buffer.slice(0, end), rest: buffer.slice(end + sep) };
}

function mapLegacyNextSseBlock(eventName: string, dataJoined: string): LegacyLectureNextSseYield[] {
  const ev = eventName.trim().toLowerCase();
  let parsed: Record<string, unknown> | null = null;
  if (dataJoined.trim()) {
    try {
      parsed = JSON.parse(dataJoined) as Record<string, unknown>;
    } catch {
      if (ev === "error") {
        return [{ kind: "error", message: dataJoined.trim() }];
      }
      return [{ kind: "delta", text: dataJoined, raw: { type: "delta", delta: dataJoined } }];
    }
  } else {
    parsed = {};
  }

  const t = String(parsed?.type ?? "").toLowerCase();
  if (ev === "error" || t === "error") {
    const msg =
      pickFirstString(parsed ?? {}, ["message", "error"]) ?? "스트림 오류";
    return [{ kind: "error", message: msg, raw: parsed ?? undefined }];
  }
  if (ev === "done" || t === "done") {
    return [{ kind: "done", payload: parsed ?? {} }];
  }

  const phaseRaw = String(
    pickFirstString(parsed ?? {}, ["phase", "streamPhase", "stream_phase"]) ?? "",
  ).toLowerCase();
  const roleRaw = String(pickFirstString(parsed ?? {}, ["role"]) ?? "").toLowerCase();
  const contentTypeRaw = String(
    parsed?.contentType ?? parsed?.content_type ?? "",
  ).toUpperCase();
  const isThoughtChunk =
    LEGACY_SSE_THOUGHT_NAMES.has(ev) ||
    LEGACY_SSE_THOUGHT_NAMES.has(t) ||
    phaseRaw === "thought" ||
    phaseRaw === "thinking" ||
    roleRaw === "thinking" ||
    contentTypeRaw === "THOUGHT";

  const delta =
    pickFirstString(parsed ?? {}, ["delta", "text", "content", "chunk"]) ?? "";
  if (delta) {
    return [
      isThoughtChunk
        ? { kind: "thought_delta", text: delta, raw: parsed ?? {} }
        : { kind: "delta", text: delta, raw: parsed ?? {} },
    ];
  }
  if (t === "delta") {
    return [
      isThoughtChunk
        ? { kind: "thought_delta", text: "", raw: parsed ?? {} }
        : { kind: "delta", text: "", raw: parsed ?? {} },
    ];
  }
  return [];
}

async function* iterateLegacyLectureNextSse(
  response: Response,
  options?: { signal?: AbortSignal },
): AsyncGenerator<LegacyLectureNextSseYield, void, undefined> {
  const stream = response.body;
  if (!stream) return;

  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const flushBlock = function* (block: string): Generator<LegacyLectureNextSseYield, void, undefined> {
    let ev = "";
    const dataLines: string[] = [];
    for (const rawLine of block.split(/\r?\n/)) {
      const line = rawLine.replace(/\r$/, "");
      if (line.startsWith("event:")) {
        ev = line.slice("event:".length).trim();
        continue;
      }
      if (line.startsWith("data:")) {
        dataLines.push(line.slice("data:".length).trimStart());
        continue;
      }
    }
    const dataJoined = dataLines.join("\n");
    for (const y of mapLegacyNextSseBlock(ev, dataJoined)) {
      yield y;
    }
  };

  try {
    while (true) {
      if (options?.signal?.aborted) {
        await reader.cancel();
        return;
      }
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      for (;;) {
        const consumed = consumeDoubleNewlineBlock(buffer);
        if (!consumed) break;
        buffer = consumed.rest;
        if (consumed.block.trim()) {
          for (const y of flushBlock(consumed.block)) {
            yield y;
          }
        }
      }
    }
    const tail = buffer.trim();
    if (tail) {
      for (const y of flushBlock(buffer)) {
        yield y;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

const normalizeSseData = (value: unknown): Record<string, unknown> | null => {
  if (value == null) return null;
  if (typeof value === "object") return value as Record<string, unknown>;
  if (typeof value !== "string") return null;
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const toBool = (value: unknown): boolean | undefined => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const lowered = value.toLowerCase();
    if (lowered === "true") return true;
    if (lowered === "false") return false;
  }
  return undefined;
};

const pickFirstString = (obj: Record<string, unknown>, keys: string[]): string | undefined => {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === "string" && v.trim().length > 0) return v;
  }
  return undefined;
};

/** 브라우저에서 /api 프록시(로컬) vs 절대 백엔드 URL */
const resolveBrowserApiUrl = (endpoint: string): string => {
  const isDevHost =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
  const shouldUseViteProxy = isDevHost && endpoint.startsWith("/api");
  if (shouldUseViteProxy) return endpoint;
  return API_BASE_URL ? `${String(API_BASE_URL).replace(/\/$/, "")}${endpoint}` : endpoint;
};

/** Spring 401 JSON (`RestAuthenticationEntryPoint` 등): code·message 파싱 */
const parseSpringErrorJsonFromText = (text: string): Record<string, unknown> | null => {
  const t = text.trim();
  if (!t) return null;
  try {
    const o = JSON.parse(t) as unknown;
    if (o != null && typeof o === "object" && !Array.isArray(o)) {
      return o as Record<string, unknown>;
    }
  } catch {
    /* ignore */
  }
  return null;
};

const formatSpring401ForDisplay = (
  parsed: Record<string, unknown> | null | undefined,
  fallback: string,
): string => {
  if (!parsed) return fallback;
  const code = parsed.code != null ? String(parsed.code).trim() : "";
  const msg =
    (typeof parsed.message === "string" && parsed.message.trim()) ||
    (typeof parsed.detail === "string" && parsed.detail.trim()) ||
    fallback;
  return code ? `[${code}] ${msg}` : msg;
};

/** Spring 공통 래핑 `{ data: { ... } }` / 중첩 data 병합 */
const unwrapSpringSessionJson = (raw: Record<string, unknown>): Record<string, unknown> => {
  let cur: Record<string, unknown> = { ...raw };
  const d1 = cur.data;
  if (d1 != null && typeof d1 === "object" && !Array.isArray(d1)) {
    cur = { ...cur, ...(d1 as Record<string, unknown>) };
  }
  return cur;
};

/**
 * 통합 학습 v3 — POST /api/learning/sessions/{lectureId}
 * 쿼리: pdfPath, sessionId(선택, 기존 세션 재사용)
 * 401 시 refreshToken이 있으면 1회 갱신 후 재시도.
 */
const ensureLearningSession = async (
  lectureId: number,
  pdfPath?: string,
  opts?: { sessionId?: string },
): Promise<LearningSessionState> => {
  if (!opts?.sessionId) {
    const cached = learningSessionByLecture.get(lectureId);
    if (cached) return cached;
  }

  const sp = new URLSearchParams();
  if (pdfPath) sp.set("pdfPath", pdfPath);
  if (opts?.sessionId) sp.set("sessionId", opts.sessionId);
  const qs = sp.toString();
  const path = `/api/learning/sessions/${encodeURIComponent(lectureId)}${qs ? `?${qs}` : ""}`;

  const postOnce = (bearer: string) =>
    fetch(resolveBrowserApiUrl(path), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${bearer.trim()}`,
      },
      body: JSON.stringify({}),
      mode: "cors",
      credentials: "omit",
    });

  let bearer = getAuthToken();
  if (!bearer?.trim()) {
    throw new Error("로그인이 필요합니다. 통합학습을 쓰려면 먼저 로그인해 주세요.");
  }

  const throwIfFailed = (
    res: Response,
    parsed: Record<string, unknown>,
    text: string,
  ): never => {
    const flat = unwrapSpringSessionJson(parsed);
    const rawMsg =
      (typeof flat.message === "string" && flat.message) ||
      (typeof flat.detail === "string" && flat.detail) ||
      (typeof parsed.message === "string" && parsed.message) ||
      text ||
      `학습 세션 요청 실패 (${res.status})`;
    const msg = formatSpring401ForDisplay(flat, rawMsg);
    if (res.status === 401) {
      const code = String(flat.code ?? parsed.code ?? "").trim();
      const hint =
        code === "TOKEN_EXPIRED"
          ? "토큰이 만료된 경우입니다. 다시 로그인한 뒤 시도해 주세요."
          : code === "INVALID_TOKEN"
            ? "JWT 검증 실패입니다. 재로그인 후에도 동일하면 백엔드(키·인스턴스)를 확인해 주세요."
            : code === "UNAUTHORIZED"
              ? "서버가 인증 헤더를 받지 못한 경우입니다. Network 탭에서 Authorization 전송 여부를 확인해 주세요."
              : code === "4010"
                ? "백엔드 애플리케이션 전용 code로 보입니다. (RestAuthenticationEntryPoint의 TOKEN_EXPIRED 등과 다를 수 있음.) " +
                  "동일 Bearer로 GET /api/users/me가 200인지 Network에서 확인한 뒤, 4010을 내는 컨트롤러/필터/글로벌 핸들러 위치를 백엔드에 문의해 주세요."
                : "Bearer를 보냈는데도 401이면, 같은 토큰으로 GET /api/users/me 성공 여부와 응답 code 전체 JSON을 백엔드에 전달해 주세요.";
      throw new Error(`${msg}\n\n${hint}`);
    }
    throw new Error(msg);
  };

  for (let attempt = 0; attempt < 2; attempt++) {
    bearer = getAuthToken();
    if (!bearer?.trim()) {
      throw new Error("로그인이 필요합니다. 통합학습을 쓰려면 먼저 로그인해 주세요.");
    }

    const res = await postOnce(bearer);
    const text = await res.text();
    let parsed: Record<string, unknown> = {};
    if (text.trim()) {
      try {
        parsed = JSON.parse(text) as Record<string, unknown>;
      } catch {
        parsed = {};
      }
    }

    if (!res.ok) {
      if (
        res.status === 401 &&
        attempt === 0 &&
        getRefreshToken()
      ) {
        try {
          await authApi.refresh();
          continue;
        } catch {
          /* 첫 응답 기준으로 실패 처리 */
        }
      }
      throwIfFailed(res, parsed, text);
    }

    const merged = unwrapSpringSessionJson(parsed);
    const rawSessionId = merged.session_id ?? merged.sessionId;
    if (rawSessionId == null) {
      throw new Error("학습 세션 생성 응답에 session_id가 없습니다.");
    }
    const session = { sessionId: String(rawSessionId), lectureId };
    learningSessionByLecture.set(lectureId, session);
    return session;
  }

  throw new Error("학습 세션을 열 수 없습니다.");
};

/** 요청 바디: { type, …필드 } 평탄화 (payload 중첩 제거). lectureId는 쿼리로만 전달 */
const flattenLearningEventBody = (eventBody: {
  type: string;
  payload?: Record<string, unknown>;
}): Record<string, unknown> => {
  const flat: Record<string, unknown> = { type: eventBody.type };
  const p = eventBody.payload;
  if (p != null && typeof p === "object" && !Array.isArray(p)) {
    Object.assign(flat, p);
  }
  return flat;
};

/**
 * 통합 학습 v3 — POST /api/learning/sessions/{sessionId}/event (+ SSE)
 * Accept: text/event-stream. data: JSON — heartbeat 무시, agent_delta 누적 렌더는 매퍼에서 처리.
 * `streamCallbacks`가 있으면 각 JSON 이벤트마다 사고/본문 델타를 즉시 전달 (실시간 스트리밍).
 */
const postLearningEventAndCollect = async (
  sessionId: string,
  eventBody: {
    type: string;
    lectureId?: number;
    page?: number;
    payload?: Record<string, unknown>;
  },
  lectureId?: number,
  streamCallbacks?: LearningSseStreamCallbacks,
): Promise<Record<string, unknown>[]> => {
  const lectureIdForQuery = eventBody.lectureId ?? lectureId;
  const qs = new URLSearchParams();
  /* BE: page 동기화 — page / pageNumber / currentPage 중 수용하는 컨트롤러 대비 동일 값 전달 */
  if (eventBody.page != null && Number.isFinite(eventBody.page)) {
    const p = String(eventBody.page);
    qs.set("page", p);
    qs.set("pageNumber", p);
    qs.set("currentPage", p);
  }
  if (lectureIdForQuery != null) {
    qs.set("lectureId", String(lectureIdForQuery));
  }
  const query = qs.toString().length > 0 ? `?${qs.toString()}` : "";
  const endpoint = `/api/learning/sessions/${encodeURIComponent(sessionId)}/event${query}`;
  const token = getAuthToken();
  if (!token?.trim()) {
    throw new Error("로그인이 필요합니다. 학습 이벤트(SSE) 요청에는 Bearer 토큰이 필요합니다.");
  }
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "text/event-stream",
    Authorization: `Bearer ${token.trim()}`,
  };

  const requestBody = flattenLearningEventBody({
    type: eventBody.type,
    payload: eventBody.payload ?? {},
  });
  for (let reconnectAttempt = 0; reconnectAttempt <= SSE_RECONNECT_DELAYS_MS.length; reconnectAttempt++) {
    const fetchEvent = () =>
      fetch(resolveBrowserApiUrl(endpoint), {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
        mode: "cors",
        credentials: "omit",
        signal: streamCallbacks?.signal,
      });

    try {
      let res = await fetchEvent();

      if (!res.ok && res.status === 401 && getRefreshToken()) {
        try {
          await authApi.refresh();
          const t2 = getAuthToken();
          if (t2?.trim()) {
            headers.Authorization = `Bearer ${t2.trim()}`;
            res = await fetchEvent();
          }
        } catch {
          /* 아래 동일 에러 처리 */
        }
      }

      if (!res.ok) {
        const text = await res.text();
        const ep = parseSpringErrorJsonFromText(text);
        const merged401 = ep ? unwrapSpringSessionJson(ep) : null;
        const base = text || "학습 이벤트 요청 실패";
        const line =
          res.status === 401
            ? formatSpring401ForDisplay(merged401 ?? ep, base)
            : base;
        throw new Error(`API Error (${res.status}): ${line}`);
      }

      const reader = res.body?.getReader();
      if (!reader) return [];
      const decoder = new TextDecoder();
      const events: Record<string, unknown>[] = [];
      let buffer = "";
      let shouldReconnect = false;

      while (true) {
        if (streamCallbacks?.signal?.aborted) {
          try {
            await reader.cancel();
          } catch {
            /* ignore */
          }
          return events;
        }
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line) continue;
          const payload = line.startsWith("data:")
            ? line.slice(5).trim()
            : line;
          const parsed = normalizeSseData(payload);
          if (!parsed) continue;
          const eventType = String(parsed.type ?? "");
          if (eventType === "heartbeat") continue;
          if (eventType === "timeout") {
            shouldReconnect = true;
            break;
          }
          events.push(parsed);
          if (eventType === "error") {
            const errMsg =
              pickFirstString(parsed, ["message", "error", "detail"]) ??
              "스트림 오류";
            streamCallbacks?.onError?.(errMsg, parsed);
            return events;
          }
          if (eventType === "done" || toBool(parsed.final) === true) {
            streamCallbacks?.onDone?.(parsed);
            return events;
          }
          const deltaText = learningSseEventDeltaText(parsed);
          if (deltaText && streamCallbacks) {
            if (isLearningThoughtSseEvent(parsed)) {
              streamCallbacks.onThoughtDelta?.(deltaText, parsed);
            } else {
              streamCallbacks.onAgentDelta?.(deltaText, parsed);
            }
          }
        }
        if (shouldReconnect) break;
      }

      if (!shouldReconnect) {
        const tail = buffer.trim();
        if (tail.length > 0) {
          const payload = tail.startsWith("data:") ? tail.slice(5).trim() : tail;
          const parsed = normalizeSseData(payload);
          if (parsed) {
            events.push(parsed);
            const t = String(parsed.type ?? "");
            if (t === "error") {
              const errMsg =
                pickFirstString(parsed, ["message", "error", "detail"]) ??
                "스트림 오류";
              streamCallbacks?.onError?.(errMsg, parsed);
            } else if (t === "done" || toBool(parsed.final) === true) {
              streamCallbacks?.onDone?.(parsed);
            } else if (t !== "heartbeat") {
              const deltaText = learningSseEventDeltaText(parsed);
              if (deltaText && streamCallbacks) {
                if (isLearningThoughtSseEvent(parsed)) {
                  streamCallbacks.onThoughtDelta?.(deltaText, parsed);
                } else {
                  streamCallbacks.onAgentDelta?.(deltaText, parsed);
                }
              }
            }
          }
        }
        return events;
      }
    } catch (error) {
      if (!isRecoverableTransportError(error) || reconnectAttempt >= SSE_RECONNECT_DELAYS_MS.length) {
        throw error;
      }
    }

    if (reconnectAttempt >= SSE_RECONNECT_DELAYS_MS.length) {
      throw new Error("스트림 재연결에 실패했습니다. 다시 시도해주세요.");
    }
    await sleep(SSE_RECONNECT_DELAYS_MS[reconnectAttempt]);
  }

  throw new Error("스트림 재연결에 실패했습니다. 다시 시도해주세요.");
};

/** 연속 agent_delta 청크를 하나로 합쳐 스트림 표시와 매핑을 단순화 */
const coalesceLearningStreamEvents = (
  events: Record<string, unknown>[],
): Record<string, unknown>[] => {
  const out: Record<string, unknown>[] = [];
  let acc = "";
  const flushDelta = () => {
    if (acc.length === 0) return;
    out.push({ type: "agent_delta", delta: acc });
    acc = "";
  };
  const deltaPiece = (ev: Record<string, unknown>): string => {
    const payload = (ev.payload as Record<string, unknown> | undefined) ?? {};
    return (
      pickFirstString(ev, ["delta", "content", "message", "text"]) ??
      pickFirstString(payload, ["delta", "content", "message", "text"]) ??
      ""
    );
  };
  for (const ev of events) {
    const t = String(ev.type ?? "").toLowerCase();
    if (t === "heartbeat") continue;
    if (t === "agent_delta") {
      acc += deltaPiece(ev);
      continue;
    }
    flushDelta();
    out.push(ev);
  }
  flushDelta();
  return out;
};

const mapLearningEventsToNextResponse = (
  lectureId: number,
  events: Record<string, unknown>[]
): StreamNextResponse => {
  const merged = coalesceLearningStreamEvents(events);
  let waitingForAnswer = false;
  let aiQuestionId: string | undefined;
  let hasMore = true;
  let status = "COMPLETED";
  let contentType: ContentType | string = "CONCEPT";
  const chunks: string[] = [];

  for (const event of merged) {
    const type = String(event.type ?? "").toLowerCase();
    const message =
      pickFirstString(event, ["delta", "content", "message", "text", "main", "thought"]) ??
      pickFirstString((event.payload as Record<string, unknown>) ?? {}, ["delta", "content", "message", "text"]);
    if (message) chunks.push(message);

    const boolWaiting = toBool(event.waiting_for_answer ?? event.waitingForAnswer);
    if (boolWaiting != null) waitingForAnswer = boolWaiting;
    const qid = pickFirstString(event, ["ai_question_id", "aiQuestionId", "question_id", "questionId"]);
    if (qid) aiQuestionId = qid;

    if (type === "agent_delta") {
      contentType = "SCRIPT";
    } else if (type.includes("question") || boolWaiting === true || qid) {
      contentType = "QUESTION";
    } else if (type.includes("supplement")) {
      contentType = "SUPPLEMENTARY";
    }

    if (type === "error") {
      status = "ERROR";
      hasMore = false;
      break;
    }
    if (type === "done" || toBool(event.final) === true) {
      hasMore = false;
      status = "COMPLETED";
      break;
    }
  }

  return {
    status,
    lectureId,
    contentType,
    contentData: chunks.join("\n").trim(),
    hasMore,
    waitingForAnswer,
    ...(aiQuestionId ? { aiQuestionId } : {}),
  };
};

/**
 * 통합학습(v3) 퀴즈는 별도 GET 없이 SSE `done`에만 온다.
 * 한 줄 요약: POST /api/learning/sessions/{sessionId}/event 스트림에서 type=done 이고
 * agent=quiz(또는 tool=GENERATE_QUIZ 계열)일 때 data.quiz / data.quiz_type 을 파싱하면 된다.
 */
function isIntegratedLearningQuizDoneSseEvent(event: Record<string, unknown>): boolean {
  const type = String(event.type ?? "").toLowerCase();
  if (type !== "done") return false;
  const agent = String(event.agent ?? "").toLowerCase();
  if (agent === "quiz") return true;
  const tool = String(event.tool ?? "");
  if (/generate_quiz/i.test(tool)) return true;
  const data = event.data;
  if (data != null && typeof data === "object" && !Array.isArray(data)) {
    const d = data as Record<string, unknown>;
    if (d.quiz != null) return true;
  }
  return false;
}

function mergeIntegratedQuizItemRecord(item: Record<string, unknown>): Record<string, unknown> {
  const nested = item.card ?? item.flashCard ?? item.flashcard ?? item.payload;
  if (nested != null && typeof nested === "object" && !Array.isArray(nested)) {
    return { ...item, ...(nested as Record<string, unknown>) };
  }
  return item;
}

/** 단일 퀴즈/플래시카드 항목 → 마크다운 (BE 스키마 차이 흡수) */
function formatIntegratedLearningQuizItem(
  item: Record<string, unknown>,
  idx: number,
  quizTypeHint: string,
): string {
  const qid = item.questionId ?? item.question_id ?? item.id;
  const idSuffix =
    qid != null && String(qid).length > 0 ? ` (문항 ID: ${qid})` : "";

  const o = mergeIntegratedQuizItemRecord(item);

  const front =
    pickFirstString(o, [
      "front",
      "term",
      "cue",
      "cardFront",
      "face",
      "keyword",
    ]) ?? "";
  const back =
    pickFirstString(o, [
      "back",
      "definition",
      "response",
      "cardBack",
      "answer",
      "explanation",
      "meaning",
    ]) ?? "";

  const typeHint = String(quizTypeHint ?? "");
  const isFlashish =
    /flash/i.test(typeHint) ||
    front.length > 0 ||
    back.length > 0;

  if (isFlashish && (front.length > 0 || back.length > 0)) {
    const lines = [`### ${idx + 1}${idSuffix}`];
    if (front) lines.push(`- **앞면:** ${front}`);
    if (back) lines.push(`- **뒷면:** ${back}`);
    return lines.join("\n");
  }

  const stem =
    pickFirstString(o, [
      "question_content",
      "question",
      "stem",
      "text",
      "prompt",
      "title",
      "body",
    ]) ?? "";
  const opts = o.options ?? o.choices ?? o.option_list;
  const hasOptions = Array.isArray(opts) && opts.length > 0;

  if (stem.length > 0) {
    const lines: string[] = [`### ${idx + 1}. ${stem}${idSuffix}`];
    if (hasOptions) {
      (opts as unknown[]).forEach((opt, j) => {
        const label = j < 26 ? String.fromCharCode(65 + j) : String(j + 1);
        if (typeof opt === "string") {
          lines.push(`- **${label}.** ${opt}`);
        } else if (opt && typeof opt === "object") {
          const oo = opt as Record<string, unknown>;
          const t =
            pickFirstString(oo, ["label", "text", "content"]) ?? JSON.stringify(oo);
          lines.push(`- **${label}.** ${t}`);
        } else {
          lines.push(`- **${label}.** ${String(opt)}`);
        }
      });
    } else {
      const onlyBack =
        pickFirstString(o, [
          "answer",
          "correctAnswer",
          "correct_answer",
          "solution",
        ]) ?? "";
      if (onlyBack.length > 0) {
        lines.push(`- **참고(뒷면):** ${onlyBack}`);
      }
    }
    return lines.join("\n");
  }

  /* 알 수 있는 문자열 필드만 나열 (플래시/BE 커스텀 키 대비) */
  const skip = new Set([
    "questionId",
    "question_id",
    "id",
    "type",
    "quizType",
    "options",
    "choices",
    "option_list",
  ]);
  const entries = Object.entries(o).filter(
    ([k, v]) =>
      !skip.has(k) &&
      v != null &&
      (typeof v === "string" || typeof v === "number" || typeof v === "boolean"),
  );
  if (entries.length > 0) {
    const lines = [`### ${idx + 1}${idSuffix}`];
    for (const [k, v] of entries) {
      lines.push(`- **${k}:** ${String(v)}`);
    }
    return lines.join("\n");
  }

  const fallbackTitle =
    qid != null ? `문항 ${qid}` : `문항 ${idx + 1}`;
  return `### ${idx + 1}. ${fallbackTitle}${idSuffix}\n\n*이 문항은 알려진 필드 형식이 아닙니다. BE 스키마를 확인해 주세요.*\n\n\`\`\`json\n${JSON.stringify(o, null, 2)}\n\`\`\``;
}

function extractIntegratedLearningQuizItems(raw: unknown): Record<string, unknown>[] {
  const visit = (value: unknown): Record<string, unknown>[] => {
    if (value == null) return [];
    if (Array.isArray(value)) {
      const directObjects = value.filter(
        (v): v is Record<string, unknown> =>
          v != null && typeof v === "object" && !Array.isArray(v),
      );
      if (directObjects.length > 0) return directObjects;
      return value.flatMap((v) => visit(v));
    }
    if (typeof value === "object") {
      const obj = value as Record<string, unknown>;
      const candidateArrayKeys = [
        "questions",
        "mcq_problems",
        "ox_problems",
        "short_answer_problems",
        "flash_cards",
        "question_list",
        "quiz_items",
        "items",
        "cards",
        "card_list",
        "problems",
        "list",
        "data",
      ];
      for (const key of candidateArrayKeys) {
        if (Array.isArray(obj[key])) {
          return visit(obj[key]);
        }
      }
      const candidateContainerKeys = [
        "problems",
        "question_bank",
        "quiz_data",
        "quiz",
        "payload",
        "result",
        "content",
        "body",
      ];
      for (const key of candidateContainerKeys) {
        const nested = obj[key];
        if (nested != null && typeof nested === "object") {
          const nestedItems = visit(nested);
          if (nestedItems.length > 0) return nestedItems;
        }
      }
      for (const [k, v] of Object.entries(obj)) {
        if (!Array.isArray(v) || v.length === 0) continue;
        if (
          /problem|question|card|item|list/i.test(k) &&
          v.some((it) => it != null && typeof it === "object" && !Array.isArray(it))
        ) {
          return visit(v);
        }
      }
      const nestedObjectKeys = ["quiz", "payload", "result", "content", "body"];
      for (const key of nestedObjectKeys) {
        const nested = obj[key];
        if (nested != null && typeof nested === "object") {
          const nestedItems = visit(nested);
          if (nestedItems.length > 0) return nestedItems;
        }
      }
      return [obj];
    }
    return [];
  };

  return visit(raw);
}

/** 통합학습 SSE `done.data.quiz`(JSON 문자열·배열·객체) → 채팅용 마크다운 */
function formatIntegratedLearningQuizPayload(
  quiz: unknown,
  quizTypeHint = "",
): string {
  if (quiz == null) return "";
  let parsed: unknown = quiz;
  if (typeof quiz === "string") {
    const t = quiz.trim();
    if (!t) return "";
    try {
      parsed = JSON.parse(t) as unknown;
    } catch {
      return t;
    }
  }
  const items = extractIntegratedLearningQuizItems(parsed);
  if (items.length === 0) return "";

  return items
    .map((item, idx) => {
      return formatIntegratedLearningQuizItem(item, idx, quizTypeHint);
    })
    .filter(Boolean)
    .join("\n\n");
}

function integratedLearningQuizTypeLabel(data: Record<string, unknown>): string {
  const raw = pickFirstString(data, ["quiz_type", "quizType"]) ?? "";
  if (!raw) return "";
  return raw.replace(/_/g, " ");
}

/** 통합학습 SSE 이벤트 객체에서 퀴즈 전용 `done`만 골라 마크다운으로 변환 (FE 병합용) */
export function formatIntegratedLearningQuizFromSseEvent(
  event: Record<string, unknown> | null | undefined,
): string {
  if (!event || !isIntegratedLearningQuizDoneSseEvent(event)) return "";
  const data =
    event.data != null && typeof event.data === "object" && !Array.isArray(event.data)
      ? (event.data as Record<string, unknown>)
      : {};
  const quiz = data.quiz ?? data.quiz_json ?? data.quizPayload;
  const typeRaw = pickFirstString(data, ["quiz_type", "quizType"]) ?? "";
  const body = formatIntegratedLearningQuizPayload(quiz, typeRaw);
  if (!body.trim()) return "";
  const typeLine = integratedLearningQuizTypeLabel(data);
  const header = typeLine ? `## 생성된 퀴즈 · ${typeLine}\n\n` : "## 생성된 퀴즈\n\n";
  return `${header}${body}`;
}

function integratedQuizGradableMeta(
  o: Record<string, unknown>,
  kind: IntegratedQuizDisplayKind,
): Pick<
  IntegratedQuizDisplayItem,
  "correctAnswer" | "explanation" | "referenceAnswer"
> {
  const explanation =
    pickFirstString(o, ["explanation", "intentDiagnosis", "rationale"])?.trim() ||
    undefined;

  if (kind === "short") {
    const referenceAnswer =
      pickFirstString(o, [
        "model_answer",
        "reference_answer",
        "expected_answer",
        "sample_answer",
        "correct_answer",
        "answer",
        "solution",
        "back",
      ])?.trim() || undefined;
    return { explanation, referenceAnswer };
  }

  if (kind === "ox" || kind === "mcq" || kind === "unknown") {
    const correctAnswer =
      pickFirstString(o, [
        "correct_answer",
        "correctAnswer",
        "correct_key",
        "answer_key",
        "correct_option",
        "answer",
      ])?.trim() || undefined;
    return { explanation, correctAnswer };
  }

  return { explanation };
}

function looksLikeOxAnswer(raw: string): boolean {
  const t = raw.trim().toUpperCase();
  if (!t) return false;
  if (t === "O" || t === "X" || t === "TRUE" || t === "FALSE") return true;
  if (t === "1" || t === "0" || t === "YES" || t === "NO") return true;
  return false;
}

function rawIntegratedQuizItemToDisplayItem(
  item: Record<string, unknown>,
  index: number,
  quizTypeHint: string,
): IntegratedQuizDisplayItem {
  const o = mergeIntegratedQuizItemRecord(item);
  const idVal = o.questionId ?? o.question_id ?? o.id ?? index + 1;
  const id = String(idVal);

  const front = (
    pickFirstString(o, ["front", "term", "cue", "cardFront", "face", "keyword"]) ?? ""
  ).trim();
  const back = (
    pickFirstString(o, [
      "back",
      "definition",
      "response",
      "cardBack",
      "answer",
      "explanation",
      "meaning",
    ]) ?? ""
  ).trim();
  const stem = (
    pickFirstString(o, [
      "question_content",
      "question",
      "stem",
      "text",
      "prompt",
      "title",
      "body",
    ]) ?? ""
  ).trim();

  const optsRaw = o.options ?? o.choices ?? o.option_list;
  const optionsArray = Array.isArray(optsRaw) ? (optsRaw as unknown[]) : [];

  const hint = String(quizTypeHint ?? "").toLowerCase();
  const correctAnswerRaw =
    pickFirstString(o, [
      "correct_answer",
      "correctAnswer",
      "correct_key",
      "answer_key",
      "correct_option",
      "answer",
    ])?.trim() ?? "";
  const mappedOptions = optionsArray.map((opt, j) => {
    if (typeof opt === "string") return { key: String(j + 1), content: opt };
    if (opt && typeof opt === "object") {
      const oo = opt as Record<string, unknown>;
      const key = pickFirstString(oo, ["id", "key"]) ?? String(j + 1);
      const content =
        pickFirstString(oo, ["content", "text"]) ??
        pickFirstString(oo, ["label", "value"]) ??
        JSON.stringify(oo);
      return { key: String(key), content };
    }
    return { key: String(j + 1), content: String(opt) };
  });

  if (/flash/i.test(hint)) {
    return {
      id,
      kind: "flash",
      front: front || undefined,
      back: back || undefined,
      ...integratedQuizGradableMeta(o, "flash"),
    };
  }

  if (stem && mappedOptions.length >= 2) {
    if (/ox/i.test(hint) && mappedOptions.length === 2) {
      return {
        id,
        kind: "ox",
        stem,
        options: mappedOptions,
        ...integratedQuizGradableMeta(o, "ox"),
      };
    }
    return {
      id,
      kind: "mcq",
      stem,
      options: mappedOptions,
      ...integratedQuizGradableMeta(o, "mcq"),
    };
  }

  // OX 타입인데 옵션이 누락된 경우에도 OX로 강제 분류한다.
  // (서버가 question+correct_answer만 주는 케이스 방어)
  if (/ox/i.test(hint) && stem) {
    const oxOptions =
      mappedOptions.length >= 2
        ? mappedOptions
        : [
            { key: "O", content: "O" },
            { key: "X", content: "X" },
          ];
    const normalizedCorrectAnswer = looksLikeOxAnswer(correctAnswerRaw)
      ? correctAnswerRaw
      : undefined;
    return {
      id,
      kind: "ox",
      stem,
      options: oxOptions,
      ...integratedQuizGradableMeta(o, "ox"),
      ...(normalizedCorrectAnswer ? { correctAnswer: normalizedCorrectAnswer } : {}),
    };
  }

  if (stem) {
    return {
      id,
      kind: "short",
      stem,
      ...integratedQuizGradableMeta(o, "short"),
    };
  }

  if (front || back) {
    return {
      id,
      kind: "flash",
      front: front || undefined,
      back: back || undefined,
      ...integratedQuizGradableMeta(o, "flash"),
    };
  }

  return {
    id,
    kind: "unknown",
    stem: `문항 ${id}`,
    ...integratedQuizGradableMeta(o, "unknown"),
  };
}

/** SSE `done`에서 퀴즈를 구조화해 중앙 오버레이에 표시 */
export function parseIntegratedLearningQuizOverlayFromSseEvent(
  event: Record<string, unknown> | null | undefined,
): IntegratedQuizOverlayModel | null {
  if (!event || !isIntegratedLearningQuizDoneSseEvent(event)) return null;
  const data =
    event.data != null && typeof event.data === "object" && !Array.isArray(event.data)
      ? (event.data as Record<string, unknown>)
      : {};
  const quiz = data.quiz ?? data.quiz_json ?? data.quizPayload;
  let parsed: unknown = quiz;
  if (typeof quiz === "string") {
    const t = quiz.trim();
    if (!t) return null;
    try {
      parsed = JSON.parse(t) as unknown;
    } catch {
      return null;
    }
  }
  const typeRaw = pickFirstString(data, ["quiz_type", "quizType"]) ?? "";
  const rawItems = extractIntegratedLearningQuizItems(parsed);
  if (rawItems.length === 0) return null;
  const items = rawItems.map((it, i) =>
    rawIntegratedQuizItemToDisplayItem(it, i, typeRaw),
  );
  const title = typeRaw
    ? `생성된 퀴즈 · ${typeRaw.replace(/_/g, " ")}`
    : "생성된 퀴즈";
  return { title, quizTypeRaw: typeRaw, items };
}

export function parseIntegratedLearningQuizOverlayFromMessageTail(
  tail: IntegratedLearningMessage[],
): IntegratedQuizOverlayModel | null {
  for (let i = tail.length - 1; i >= 0; i--) {
    const ev = tail[i];
    if (String(ev.type).toLowerCase() !== "done" || !ev.raw) continue;
    const parsed = parseIntegratedLearningQuizOverlayFromSseEvent(ev.raw);
    if (parsed && parsed.items.length > 0) return parsed;
  }
  return null;
}

const mapLearningEventsToIntegratedMessages = (
  events: Record<string, unknown>[],
): IntegratedLearningMessage[] => {
  const merged = coalesceLearningStreamEvents(events);
  const out: IntegratedLearningMessage[] = [];
  for (const event of merged) {
    const type = String(event.type ?? event.event ?? "message").toLowerCase();
    if (type === "heartbeat") continue;
    const payload =
      (event.payload as Record<string, unknown> | undefined) ?? {};
    const text =
      pickFirstString(event, [
        "delta",
        "content",
        "message",
        "text",
        "answer",
        "main",
        "thought",
      ]) ??
      pickFirstString(payload, [
        "delta",
        "content",
        "message",
        "text",
        "answer",
        "main",
        "thought",
      ]) ??
      "";
    const doneData =
      event.data != null && typeof event.data === "object"
        ? (event.data as Record<string, unknown>)
        : {};
    const doneUi =
      doneData.ui != null && typeof doneData.ui === "object"
        ? (doneData.ui as Record<string, unknown>)
        : {};
    const widget = pickFirstString(doneUi, ["widget"]);
    const modal = pickFirstString(doneUi, ["modal"]);
    const modalDisplayText =
      modal === "QUIZ_TYPE_PICKER"
        ? "퀴즈 유형을 선택해 주세요. (예: 객관식, OX, 단답형)"
        : modal != null
          ? `선택 필요: ${modal}`
          : "";
    const doneUiText =
      widget != null
        ? `다음 단계: ${widget}`
        : modalDisplayText;
    const quizOverlayModel =
      type === "done"
        ? parseIntegratedLearningQuizOverlayFromSseEvent(event as Record<string, unknown>)
        : null;
    let displayText = text.trim();
    if (!quizOverlayModel) {
      const quizMd =
        type === "done"
          ? formatIntegratedLearningQuizFromSseEvent(event as Record<string, unknown>)
          : "";
      if (quizMd) {
        displayText = displayText ? `${displayText}\n\n${quizMd}` : quizMd;
      }
    }
    if (!displayText) {
      displayText = doneUiText;
    } else if (doneUiText) {
      displayText = `${displayText}\n\n${doneUiText}`;
    }
    out.push({
      type,
      text: displayText,
      waitingForAnswer:
        toBool(event.waiting_for_answer ?? event.waitingForAnswer) ?? false,
      questionId: pickFirstString(event, [
        "ai_question_id",
        "aiQuestionId",
        "question_id",
        "questionId",
      ]),
      final: toBool(event.final) ?? type === "done",
      raw: event,
      ...(quizOverlayModel ? { integratedQuizOpenButton: true } : {}),
    });
  }
  return out;
};

const unwrapLegacyLecturePayload = (raw: unknown): Record<string, unknown> => {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  if (o.data != null && typeof o.data === "object" && !Array.isArray(o.data)) {
    return { ...o, ...(o.data as Record<string, unknown>) };
  }
  return o;
};

const normalizeLegacyStreamNext = (raw: unknown, lectureId: number): StreamNextResponse => {
  const r = unwrapLegacyLecturePayload(raw);
  return {
    status: String(r.status ?? "OK"),
    lectureId: Number(r.lectureId ?? r.lecture_id ?? lectureId),
    contentType: String(r.contentType ?? r.content_type ?? "SCRIPT") as ContentType | string,
    contentData: String(r.contentData ?? r.content_data ?? r.message ?? r.text ?? ""),
    chapterTitle: pickFirstString(r, ["chapterTitle", "chapter_title"]),
    hasMore: toBool(r.hasMore ?? r.has_more) ?? false,
    waitingForAnswer: toBool(r.waitingForAnswer ?? r.waiting_for_answer) ?? false,
    aiQuestionId: pickFirstString(r, ["aiQuestionId", "ai_question_id", "questionId", "question_id"]),
  };
};

/** POST /stream/next SSE 마지막 `done` 이벤트 + 누적 delta → StreamNextResponse */
const legacySseDoneToStreamNext = (
  done: Record<string, unknown>,
  lectureId: number,
  accumulatedDelta: string,
): StreamNextResponse => {
  const waiting = toBool(done.waitingForAnswer ?? done.waiting_for_answer) ?? false;
  const statusRaw = String(done.status ?? "").toUpperCase();
  const status =
    statusRaw === "WAITING_FOR_ANSWER" || waiting
    ? "WAITING_FOR_ANSWER"
    : String(done.status ?? "COMPLETED");
  return {
    status,
    lectureId: Number(done.lectureId ?? done.lecture_id ?? lectureId),
    contentType: String(done.contentType ?? done.content_type ?? "SCRIPT") as ContentType | string,
    contentData:
      accumulatedDelta.trim().length > 0
        ? accumulatedDelta
        : String(done.contentData ?? done.content_data ?? ""),
    chapterTitle: pickFirstString(done, ["chapterTitle", "chapter_title"]),
    hasMore: toBool(done.hasMore ?? done.has_more) ?? false,
    waitingForAnswer: waiting,
    aiQuestionId: pickFirstString(done, ["aiQuestionId", "ai_question_id", "questionId", "question_id"]),
  };
};

function buildLectureLegacyStreamNextUrl(
  lectureId: number,
  query: {
    pageNumber?: string;
    page?: string;
    userMessage?: string;
    materialId?: string;
  },
): string {
  const path = `/api/lectures/${encodeURIComponent(lectureId)}/stream/next`;
  const sp = new URLSearchParams();
  if (query.pageNumber != null && query.pageNumber !== "") {
    sp.set("pageNumber", query.pageNumber);
  }
  if (query.page != null && query.page !== "") {
    sp.set("page", query.page);
  }
  if (query.userMessage != null && query.userMessage !== "") {
    sp.set("userMessage", query.userMessage);
  }
  if (query.materialId != null && query.materialId !== "") {
    sp.set("materialId", query.materialId);
  }
  const qs = sp.toString();
  const withQuery = qs ? `${path}?${qs}` : path;
  const isDevHost =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
  if (isDevHost && withQuery.startsWith("/api")) return withQuery;
  return `${String(API_BASE_URL).replace(/\/$/, "")}${withQuery}`;
}

/**
 * 강의 AI Legacy (`/api/lectures/{lectureId}/stream/*`).
 * - `stream/next`: POST + `text/event-stream` (SSE `message`·`done`·`error`, FastAPI NDJSON 릴레이), fetch+ReadableStream
 * - 그 외: initialize/answer/cancel 등
 */
export const lectureAiLegacyStreamApi = {
  getSession: async (lectureId: number): Promise<StreamSessionState> => {
    const raw = await apiRequest<Record<string, unknown>>(
      `/api/lectures/${encodeURIComponent(lectureId)}/stream/session`,
      { method: "GET" },
    );
    const r = unwrapLegacyLecturePayload(raw);
    const chaptersRaw = r.chapters;
    const chapters =
      chaptersRaw != null && typeof chaptersRaw === "object" && !Array.isArray(chaptersRaw)
        ? (chaptersRaw as Record<string, unknown>)
        : undefined;
    const questionsRaw = r.questions;
    const questions =
      questionsRaw != null && typeof questionsRaw === "object" && !Array.isArray(questionsRaw)
        ? (questionsRaw as Record<string, unknown>)
        : undefined;
    const jobRaw = r.job;
    const job =
      jobRaw != null && typeof jobRaw === "object" && !Array.isArray(jobRaw)
        ? (jobRaw as Record<string, unknown>)
        : undefined;
    const logsRaw = r.logs;
    const logs =
      logsRaw != null && typeof logsRaw === "object" && !Array.isArray(logsRaw)
        ? (logsRaw as Record<string, unknown>)
        : undefined;
    return {
      status: String(r.status ?? "ACTIVE"),
      lectureId: Number(r.lectureId ?? r.lecture_id ?? lectureId),
      serviceStatus: String(r.serviceStatus ?? r.service_status ?? "LEGACY_STREAM"),
      chapters,
      questions,
      job,
      logs,
      createdAt:
        typeof r.createdAt === "string"
          ? r.createdAt
          : typeof r.created_at === "string"
            ? r.created_at
            : undefined,
      updatedAt:
        typeof r.updatedAt === "string"
          ? r.updatedAt
          : typeof r.updated_at === "string"
            ? r.updated_at
            : undefined,
      error:
        (r.error as Record<string, unknown> | null | undefined) === undefined
          ? null
          : (r.error as Record<string, unknown> | null),
    };
  },
  initialize: async (
    lectureId: number,
    options?: { pageNumber?: number; materialId?: number },
  ): Promise<StreamInitializeResponse> => {
    const body: Record<string, unknown> = {};
    if (options?.pageNumber != null) {
      body.pageNumber = options.pageNumber;
      body.page = options.pageNumber;
    }
    if (options?.materialId != null) {
      body.materialId = options.materialId;
    }
    const raw = await apiRequest<unknown>(
      `/api/lectures/${encodeURIComponent(lectureId)}/stream/initialize`,
      { method: "POST", body: JSON.stringify(body) },
    );
    const r = unwrapLegacyLecturePayload(raw);
    const chaptersRaw = r.chapters;
    const chapters = Array.isArray(chaptersRaw)
      ? (chaptersRaw as Array<Record<string, unknown>>).map((c) => ({
          title: String(c.title ?? ""),
          startPage: Number(c.startPage ?? c.start_page ?? 0),
          endPage: Number(c.endPage ?? c.end_page ?? 0),
        }))
      : [];
    return {
      status: String(r.status ?? "ACTIVE"),
      lectureId: Number(r.lectureId ?? r.lecture_id ?? lectureId),
      totalChapters: Number(r.totalChapters ?? r.total_chapters ?? chapters.length),
      chapters,
    };
  },
  /**
   * POST `text/event-stream` — SSE(`message`/`done`/`error`).
   * 쿼리: pageNumber, page, userMessage, materialId (스웨거와 동일). GET 엔은 미사용.
   */
  next: async (
    lectureId: number,
    options?: {
      pageNumber?: number;
      materialId?: number | null;
      userMessage?: string | null;
      signal?: AbortSignal;
      /** 사고 요약(Thinking) SSE — 본문 `onDelta`와 분리 */
      onThoughtDelta?: (chunk: string) => void;
      /** 본문 답변 청크마다 호출 → 스트리밍 UX */
      onDelta?: (chunk: string) => void;
    },
  ): Promise<StreamNextResponse> => {
    const page = options?.pageNumber;
    const mid = options?.materialId;
    const um = options?.userMessage?.trim();
    const url = buildLectureLegacyStreamNextUrl(lectureId, {
      ...(page != null ? { page: String(page), pageNumber: String(page) } : {}),
      ...(um ? { userMessage: um } : {}),
      ...(mid != null && mid > 0 ? { materialId: String(mid) } : {}),
    });
    const token = getAuthToken();
    const headers: Record<string, string> = {
      Accept: "text/event-stream",
      "Content-Type": "application/json",
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({}),
      mode: "cors",
      credentials: "omit",
      signal: options?.signal,
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`API Error (${res.status}): ${t || "stream/next 요청 실패"}`);
    }
    let accumulated = "";
    let lastDone: Record<string, unknown> | null = null;
    for await (const ev of iterateLegacyLectureNextSse(res, { signal: options?.signal })) {
      if (ev.kind === "thought_delta") {
        if (ev.text) {
          options?.onThoughtDelta?.(ev.text);
        }
      } else if (ev.kind === "delta") {
        if (ev.text) {
          accumulated += ev.text;
          options?.onDelta?.(ev.text);
        }
      } else if (ev.kind === "done") {
        lastDone = ev.payload;
        break;
      } else {
        throw new Error(ev.message);
      }
    }
    if (lastDone) {
      return legacySseDoneToStreamNext(lastDone, lectureId, accumulated);
    }
    return normalizeLegacyStreamNext(
      {
        status: "COMPLETED",
        type: "done",
        lectureId,
        contentData: accumulated,
        hasMore: false,
        waitingForAnswer: false,
      },
      lectureId,
    );
  },
  answer: async (
    lectureId: number,
    payload: StreamAnswerRequest,
  ): Promise<StreamAnswerResponse> => {
    const raw = await apiRequest<unknown>(
      `/api/lectures/${encodeURIComponent(lectureId)}/stream/answer`,
      { method: "POST", body: JSON.stringify(payload) },
    );
    const r = unwrapLegacyLecturePayload(raw);
    return {
      status: String(r.status ?? "COMPLETED"),
      lectureId: Number(r.lectureId ?? r.lecture_id ?? lectureId),
      aiQuestionId: String(r.aiQuestionId ?? r.ai_question_id ?? payload.aiQuestionId),
      question: pickFirstString(r, ["question", "questionText", "question_text"]),
      chapterTitle: pickFirstString(r, ["chapterTitle", "chapter_title"]),
      canContinue: toBool(r.canContinue ?? r.can_continue) ?? true,
      supplementary:
        typeof r.supplementary === "string"
          ? r.supplementary
          : typeof r.supplementaryContent === "string"
            ? r.supplementaryContent
            : undefined,
    };
  },
  cancel: async (lectureId: number): Promise<void> => {
    await apiRequest(`/api/lectures/${encodeURIComponent(lectureId)}/stream/cancel`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  },
};

/** 강의 학습 탭 — Spring `POST /api/learning/sessions` + `.../event` SSE */
export const streamingApi = {
  getSession: async (lectureId: number): Promise<StreamSessionState> => {
    const session = await ensureLearningSession(lectureId);
    return {
      status: "ACTIVE",
      lectureId,
      serviceStatus: "LEARNING_SESSION_V3",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      chapters: { sessionId: session.sessionId },
    };
  },
  initialize: async (lectureId: number, _options?: { pageNumber?: number }): Promise<StreamInitializeResponse> => {
    const session = await ensureLearningSession(lectureId);
    await postLearningEventAndCollect(
      session.sessionId,
      {
        type: "SESSION_ENTERED",
        lectureId,
        payload: {},
      },
      lectureId
    );
    return {
      status: "ACTIVE",
      lectureId,
      totalChapters: 0,
      chapters: [],
    };
  },
  next: async (lectureId: number, options?: { pageNumber?: number }): Promise<StreamNextResponse> => {
    const session = await ensureLearningSession(lectureId);
    const eventType = options?.pageNumber != null ? "PAGE_CHANGED" : "NEXT_PAGE_DECISION";
    const payload: Record<string, unknown> = {};
    if (options?.pageNumber != null) {
      payload.page = options.pageNumber;
    } else {
      payload.accept = true;
    }
    const events = await postLearningEventAndCollect(
      session.sessionId,
      { type: eventType, lectureId, payload },
      lectureId,
    );
    return mapLearningEventsToNextResponse(lectureId, events);
  },
  answer: async (lectureId: number, payload: StreamAnswerRequest): Promise<StreamAnswerResponse> => {
    const session = await ensureLearningSession(lectureId);
    await postLearningEventAndCollect(
      session.sessionId,
      {
        type: "QUIZ_SUBMITTED",
        lectureId,
        payload: {
          aiQuestionId: payload.aiQuestionId,
          answer: payload.answer,
        },
      },
      lectureId
    );
    return {
      status: "COMPLETED",
      lectureId,
      aiQuestionId: payload.aiQuestionId,
      canContinue: true,
    };
  },
  cancel: async (lectureId: number): Promise<void> => {
    const session = learningSessionByLecture.get(lectureId);
    if (!session) return;
    try {
      await postLearningEventAndCollect(
        session.sessionId,
        { type: "SAVE_AND_EXIT", lectureId, payload: {} },
        lectureId,
      );
    } finally {
      learningSessionByLecture.delete(lectureId);
    }
  },
};

export const integratedLearningApi = {
  openSession: async (
    lectureId: number,
    options?: { pdfPath?: string; sessionId?: string },
  ): Promise<{ sessionId: string; lectureId: number }> => {
    const s = await ensureLearningSession(lectureId, options?.pdfPath, {
      sessionId: options?.sessionId,
    });
    return { sessionId: s.sessionId, lectureId: s.lectureId };
  },
  sendEvent: async (
    lectureId: number,
    sessionId: string,
    eventType: string,
    payload?: Record<string, unknown>,
    streamCallbacks?: LearningSseStreamCallbacks,
    options?: { page?: number },
  ): Promise<IntegratedLearningMessage[]> => {
    const events = await postLearningEventAndCollect(
      sessionId,
      {
        type: eventType,
        lectureId,
        page: options?.page,
        payload: payload ?? {},
      },
      lectureId,
      streamCallbacks,
    );
    return mapLearningEventsToIntegratedMessages(events);
  },
  closeSession: async (lectureId: number): Promise<void> => {
    const session = learningSessionByLecture.get(lectureId);
    if (!session) return;
    try {
      await postLearningEventAndCollect(
        session.sessionId,
        { type: "SAVE_AND_EXIT", lectureId, payload: {} },
        lectureId,
      );
    } finally {
      learningSessionByLecture.delete(lectureId);
    }
  },
};

// AI 서비스 전용 요청 (시험 생성 등 - ai-service URL 사용)
const aiServiceRequest = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
  const url = `${AI_SERVICE_URL.replace(/\/$/, '')}${endpoint}`;
  const headers: HeadersInit = { 'Content-Type': 'application/json', ...(options.headers as object) };
  const token = getAuthToken();
  if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { ...options, headers, mode: 'cors', credentials: 'omit' });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API Error (${res.status}): ${text}`);
  }
  if (res.status === 204) return {} as T;
  return res.json();
};

/** 시험 생성 API 요청 (문서: camelCase, lectureId/targetCount/lectureContent 등) */
export interface ExamLearningGoal {
  focusAreas: string[];
  targetDepth: "Concept" | "Application" | "Derivation" | "Deep Understanding";
  questionModality: "Mathematical" | "Theoretical" | "Balance";
}

export interface ExamUserStatus {
  proficiencyLevel: "Beginner" | "Intermediate" | "Advanced";
  weaknessFocus: boolean;
}

export interface ExamInteractionStyle {
  languagePreference: "Korean_with_English_Terms" | "Korean_with_Korean_Terms" | "Only_English";
  scenarioBased: boolean;
}

export interface ExamFeedbackPreference {
  strictness: "Strict" | "Lenient";
  explanationDepth: "Answer_Only" | "Detailed_with_Examples";
}

export interface ExamUserProfile {
  learningGoal: ExamLearningGoal;
  userStatus: ExamUserStatus;
  interactionStyle: ExamInteractionStyle;
  feedbackPreference: ExamFeedbackPreference;
  scopeBoundary: "Lecture_Material_Only" | "Allow_External_Knowledge";
}

export interface ExamGenerationRequest {
  lectureId: number;
  examType: string;
  targetCount: number;
  lectureContent: string;
  topic?: string;
  userProfile?: ExamUserProfile;
  /** 출제 기준 업로드 PDF (선택). BE가 저장·목록 필터에 반영 */
  sourceMaterialId?: number;
  /** 출제 기준 AI 생성 문서 세션 (선택) */
  sourceGenerationSessionId?: number;
}

export interface ExamGenerationResponse {
  examSessionId: string;
  status: string;
  progress?: number;
  exam?: { topic: string; questionCount?: number; questions?: unknown[] };
}

// 시험 생성 비동기 요청/응답 (Swagger: /api/exams/generation/async)
export interface ExamGenerationAsyncRequest {
  lectureId: number;
  examType: string;
  targetCount: number;
  lectureContent: string;
  topic?: string;
  userProfile?: ExamUserProfile;
  /** 시험 목록 표시용 이름(선택). 미전달 시 BE 기본 규칙에 따름 */
  displayName?: string;
  sourceMaterialId?: number;
  sourceGenerationSessionId?: number;
  /**
   * 업로드 PDF 미리보기 기준 출제 시: 사용자가 보고 있는 페이지(1-based).
   * BE가 해당 필드를 지원하면 이 페이지 범위만 출제에 사용할 수 있음.
   */
  sourcePdfPage?: number;
}

export interface ExamGenerationAsyncResponse {
  taskId: string;
  message?: string;
  status: string;
  statusUrl?: string;
}

// 시험 사전 프로필 대화 요청/응답 (/api/exams/generation/profile)
export interface ExamProfileGenerationRequest {
  lectureContent: string;
  examType?: string;
  existingProfile?: ExamUserProfile;
  userMessage?: string;
}

export interface ExamProfileGenerationResponse {
  status: string; // "INCOMPLETE" | "COMPLETE" 등
  agentMessage: string;
  missingInfo?: string[];
  updatedProfile?: ExamUserProfile;
}

// 시험 세션 상세 조회 응답 (/api/exams/generation/{examSessionId})
export interface ExamFlashCard {
  categoryTag: string;
  frontContent: string;
  backContent: string;
  complexityLevel: string;
}

export interface ExamOxProblem {
  questionContent: string;
  correctAnswer: string;
  explanation: string;
  intentType: string;
}

export interface ExamFiveChoiceOption {
  id: string;
  content: string;
  intent: string;
  isCorrect: boolean;
}

export interface ExamFiveChoiceProblem {
  questionContent: string;
  options: ExamFiveChoiceOption[];
  correctAnswer: string;
  intentDiagnosis: string;
}

export interface ExamShortAnswerProblem {
  questionContent: string;
  relatedKeywords: string[];
  bestAnswer: string;
  evaluationCriteria: string;
  /** 백엔드가 내려주는 경우 출제 의도(진단) 텍스트 */
  intentDiagnosis?: string;
}

export interface ExamDebateTopic {
  topic: string;
  context: string;
  proSideStand: string;
  conSideStand: string;
  evaluationCriteria: string[];
}

export interface ExamUsedProfile {
  learningGoal?: {
    focusAreas?: string[];
    targetDepth?: string;
    questionModality?: string;
  };
  userStatus?: {
    proficiencyLevel?: string;
    weaknessFocus?: string[];
  };
  interactionStyle?: {
    languagePreference?: string;
    scenarioBased?: boolean;
  };
  feedbackPreference?: {
    strictness?: string;
    explanationDepth?: string;
  };
  scopeBoundary?: string;
}

export interface ExamSessionDetailResponse {
  examSessionId: number;
  examType: string;
  flashCards: ExamFlashCard[];
  oxProblems: ExamOxProblem[];
  fiveChoiceProblems: ExamFiveChoiceProblem[];
  shortAnswerProblems: ExamShortAnswerProblem[];
  debateTopics: ExamDebateTopic[];
  usedProfile?: ExamUsedProfile;
  totalCount: number;
}

/** BE가 snake_case로 보낼 수 있으므로 camelCase로 정규화 */
function normalizeExamSessionDetail(raw: Record<string, unknown>): ExamSessionDetailResponse {
  const arr = (key: string, alt: string) => {
    const v = raw[key] ?? raw[alt];
    return Array.isArray(v) ? v : [];
  };
  return {
    examSessionId: Number(raw.examSessionId ?? raw.exam_session_id ?? 0),
    examType: String(raw.examType ?? raw.exam_type ?? ''),
    flashCards: arr('flashCards', 'flash_cards') as ExamFlashCard[],
    oxProblems: arr('oxProblems', 'ox_problems') as ExamOxProblem[],
    fiveChoiceProblems: arr('fiveChoiceProblems', 'five_choice_problems') as ExamFiveChoiceProblem[],
    shortAnswerProblems: arr('shortAnswerProblems', 'short_answer_problems') as ExamShortAnswerProblem[],
    debateTopics: arr('debateTopics', 'debate_topics') as ExamDebateTopic[],
    usedProfile: (raw.usedProfile ?? raw.used_profile) as ExamUsedProfile | undefined,
    totalCount: Number(raw.totalCount ?? raw.total_count ?? 0),
  };
}

// 시험 세션 복구 응답 (/api/exams/generation/{examSessionId}/recover) - Swagger가 key/value 임의 맵을 사용
export interface ExamSessionRecoverResponse {
  [key: string]: string;
}

export interface ExamAnswerSubmission {
  questionId: number;
  answerText?: string;
  selectedOptionId?: string;
  additionalData?: Record<string, unknown>;
}

export interface ExamSubmissionRequest {
  examSessionId: number;
  answers: ExamAnswerSubmission[];
}

export interface ExamSubmissionResponse {
  examResultId: number;
  examSessionId: number;
  totalScore?: number;
  maxScore?: number;
  overallFeedback?: string;
  gradingDetails?: Record<string, unknown>;
}

export interface DebateStartRequest {
  examSessionId: number;
  mode?: string;
  topic?: string;
}

export interface DebateStartResponse {
  examSessionId: number;
  phase?: string;
  topic?: string;
  settings?: Record<string, unknown>;
  message?: string;
}

export interface DebateRespondRequest {
  examSessionId: number;
  userInput: string;
}

export interface DebateRespondResponse {
  examSessionId: number;
  phase?: string;
  debaterResponse?: string;
  score?: number;
  evaluation?: Record<string, unknown>;
  isCompleted?: boolean;
  message?: string;
}

export interface ExamStudioPdfContextRequest {
  materialId: number;
}

export interface ExamStudioPdfContextResponse {
  contextId?: string;
  [key: string]: unknown;
}

export interface ExamStudioChatRequest {
  contextId: string;
  messages?: Array<Record<string, unknown>>;
  message?: string;
  currentDraft?: Record<string, unknown>;
  currentKstIso?: string;
  timeZone?: string;
  sourceText?: string;
  model?: string;
}

/** 단답형 Gemini 채점 요청 — 문제별 입력(JSON). BE는 lectureId/materialId로 강의자료 PDF 경로를 해석 */
export interface ExamShortAnswerGradeProblemPayload {
  problemNumber: number;
  questionContent: string;
  keyKeywords: string[];
  gradingIntent: string;
  userAnswer: string;
}

export interface ExamShortAnswerGradeRequest {
  lectureId?: number;
  materialId?: number | null;
  problems: ExamShortAnswerGradeProblemPayload[];
}

export interface ExamShortAnswerGradeResultItem {
  problemNumber: number;
  /** 0~1, 0.1 단위 권장 */
  score: number;
  gradingReason: string;
  feedback: string;
  pointsDeducted?: boolean;
  deductionReason?: string;
}

export interface ExamShortAnswerGradeResponse {
  results: ExamShortAnswerGradeResultItem[];
}

function normalizeExamShortAnswerGradeResponse(
  raw: Record<string, unknown>,
): ExamShortAnswerGradeResponse {
  const pickArray = (): unknown[] => {
    const v =
      raw.results ??
      raw.gradingResults ??
      raw.grading_results ??
      (raw.data as Record<string, unknown> | undefined)?.results ??
      (raw.data as Record<string, unknown> | undefined)?.gradingResults;
    return Array.isArray(v) ? v : [];
  };
  const results: ExamShortAnswerGradeResultItem[] = pickArray().map((item) => {
    const o = item as Record<string, unknown>;
    const scoreRaw = Number(o.score ?? 0);
    const score = Math.min(1, Math.max(0, Number.isFinite(scoreRaw) ? scoreRaw : 0));
    return {
      problemNumber: Number(o.problemNumber ?? o.problem_number ?? 0),
      score,
      gradingReason: String(o.gradingReason ?? o.grading_reason ?? ""),
      feedback: String(o.feedback ?? ""),
      pointsDeducted:
        o.pointsDeducted === true ||
        o.points_deducted === true ||
        o.pointsDeducted === "true",
      deductionReason:
        o.deductionReason != null
          ? String(o.deductionReason)
          : o.deduction_reason != null
            ? String(o.deduction_reason)
            : undefined,
    };
  });
  return { results };
}

/** 시험 생성 API 요청 본문: API 문서 기준 camelCase */
function buildExamGenerationBody(payload: ExamGenerationRequest): string {
  const body: Record<string, unknown> = {
    lectureId: payload.lectureId,
    examType: payload.examType,
    targetCount: payload.targetCount,
    lectureContent: payload.lectureContent,
  };
  if (payload.topic != null && payload.topic !== '') body.topic = payload.topic;
  if (payload.userProfile != null) body.userProfile = payload.userProfile;
  if (payload.sourceMaterialId != null) {
    body.sourceMaterialId = payload.sourceMaterialId;
    body.source_material_id = payload.sourceMaterialId;
  }
  if (payload.sourceGenerationSessionId != null) {
    body.sourceGenerationSessionId = payload.sourceGenerationSessionId;
    body.source_generation_session_id = payload.sourceGenerationSessionId;
  }
  return JSON.stringify(body);
}

/**
 * 시험 생성/조회/삭제는 메인 백엔드만 호출(apiRequest → VITE_API_URL 또는 /api 프록시).
 * 응답에 ai-service/bridge 등이 보이면 그건 BE 내부 호출 실패 메시지이며, FE에서 bridge URL을 쓰지 않음.
 */
export const examGenerationApi = {
  createExam: async (payload: ExamGenerationRequest): Promise<ExamGenerationResponse> => {
    return apiRequest<ExamGenerationResponse>('/api/exams/generation', {
      method: 'POST',
      body: buildExamGenerationBody(payload),
    });
  },
  runAsync: async (payload: ExamGenerationAsyncRequest): Promise<ExamGenerationAsyncResponse> => {
    const body: Record<string, unknown> = { ...payload };
    if (payload.sourceMaterialId != null) {
      body.source_material_id = payload.sourceMaterialId;
    }
    if (payload.sourceGenerationSessionId != null) {
      body.source_generation_session_id = payload.sourceGenerationSessionId;
    }
    if (
      payload.sourcePdfPage != null &&
      Number.isFinite(payload.sourcePdfPage) &&
      payload.sourcePdfPage >= 1
    ) {
      const p = Math.floor(payload.sourcePdfPage);
      body.sourcePdfPage = p;
      body.source_pdf_page = p;
      body.pageNumber = p;
      body.page_number = p;
      body.page = p;
    }
    /** 목록 표시명: snake_case 바인딩만 쓰는 BE 대비 (camelCase는 spread로 이미 포함) */
    if (payload.displayName != null && String(payload.displayName).trim() !== "") {
      body.display_name = String(payload.displayName).trim();
    }
    return apiRequest<ExamGenerationAsyncResponse>('/api/exams/generation/async', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
  generateProfile: async (payload: ExamProfileGenerationRequest): Promise<ExamProfileGenerationResponse> => {
    return apiRequest<ExamProfileGenerationResponse>('/api/exams/generation/profile', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  recoverSession: async (examSessionId: number): Promise<ExamSessionRecoverResponse> => {
    return apiRequest<ExamSessionRecoverResponse>(`/api/exams/generation/${encodeURIComponent(examSessionId)}/recover`, {
      method: 'POST',
    });
  },
  getSession: async (examSessionId: number): Promise<ExamSessionDetailResponse> => {
    const raw = await apiRequest<Record<string, unknown>>(`/api/exams/generation/${encodeURIComponent(examSessionId)}`, {
      method: 'GET',
    });
    return normalizeExamSessionDetail(raw as Record<string, unknown>);
  },
  /** [삭제] 시험 세션 삭제. 해당 강의 소유 교사만 삭제 가능. DELETE /api/exams/generation/{examSessionId} */
  deleteExamSession: async (examSessionId: number): Promise<void> => {
    return apiRequest<void>(`/api/exams/generation/${encodeURIComponent(examSessionId)}`, {
      method: 'DELETE',
    });
  },
  /**
   * 단답형/서술형 Gemini 채점. POST /api/exams/generation/{examSessionId}/short-answer/grade
   * BE가 다른 경로를 쓰면 이 메서드만 수정하면 됨.
   */
  gradeShortAnswers: async (
    examSessionId: number,
    payload: ExamShortAnswerGradeRequest,
  ): Promise<ExamShortAnswerGradeResponse> => {
    const raw = await apiRequest<unknown>(
      `/api/exams/generation/${encodeURIComponent(examSessionId)}/short-answer/grade`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
    const obj =
      raw && typeof raw === 'object'
        ? (raw as Record<string, unknown>)
        : {};
    const inner =
      obj.data != null && typeof obj.data === 'object' && !Array.isArray(obj.data)
        ? (obj.data as Record<string, unknown>)
        : obj;
    return normalizeExamShortAnswerGradeResponse(inner);
  },

  submitExam: async (
    payload: ExamSubmissionRequest,
  ): Promise<ExamSubmissionResponse> => {
    return apiRequest<ExamSubmissionResponse>('/api/exams/submission', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getExamResult: async (examResultId: number): Promise<ExamSubmissionResponse> => {
    return apiRequest<ExamSubmissionResponse>(
      `/api/exams/submission/${encodeURIComponent(examResultId)}`,
    );
  },

  streamExamGeneration: async (
    examSessionId: number,
    options?: { signal?: AbortSignal; onDelta?: (chunk: string) => void },
  ): Promise<string> => {
    const token = getAuthToken();
    const headers: Record<string, string> = { Accept: "text/event-stream" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(
      resolveApiEndpointUrl(
        `/api/exams/generation/stream?examSessionId=${encodeURIComponent(examSessionId)}`,
      ),
      {
        method: "GET",
        headers,
        mode: "cors",
        credentials: "omit",
        signal: options?.signal,
      },
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text.trim() || `시험 생성 스트림 요청 실패 (${res.status})`);
    }
    let accumulated = "";
    for await (const eventData of iterateSseDataPayloadsFromResponse(res, {
      signal: options?.signal,
    })) {
      const text = eventData.trim();
      if (!text || text === "[DONE]") continue;
      try {
        const parsed = JSON.parse(text) as Record<string, unknown>;
        const chunk = extractSseTextChunk(parsed);
        if (chunk) {
          accumulated += chunk;
          options?.onDelta?.(chunk);
        }
      } catch {
        accumulated += text;
        options?.onDelta?.(text);
      }
    }
    return accumulated;
  },

  startDebate: async (
    payload: DebateStartRequest,
  ): Promise<DebateStartResponse> => {
    return apiRequest<DebateStartResponse>('/api/exams/debate/start', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  respondToDebate: async (
    payload: DebateRespondRequest,
  ): Promise<DebateRespondResponse> => {
    return apiRequest<DebateRespondResponse>('/api/exams/debate/respond', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

export const examStudioApi = {
  issuePdfContext: async (
    courseId: number,
    payload: ExamStudioPdfContextRequest,
  ): Promise<ExamStudioPdfContextResponse> => {
    return apiRequest<ExamStudioPdfContextResponse>(
      `/api/courses/${encodeURIComponent(courseId)}/exam-studio/pdf-context`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },

  streamChat: async (
    courseId: number,
    payload: ExamStudioChatRequest,
    options?: { signal?: AbortSignal; onDelta?: (chunk: string) => void },
  ): Promise<string> => {
    return postJsonSseStream(
      `/api/courses/${encodeURIComponent(courseId)}/exam-studio/chat/stream`,
      payload,
      options,
    );
  },
};

export const aiCallbackApi = {
  sendLectureGeneratedCallback: async (
    lectureId: number,
    payload: AiContentCallbackItem[],
  ): Promise<string> => {
    return apiRequest<string>(
      `/api/ai/callback/lectures/${encodeURIComponent(lectureId)}`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },
};

/** 강의 보조 SSE — 레거시 BE에는 없을 수 있음. 프론트는 `lectureAiLegacyStreamApi` 사용 권장. */
export type LectureAssistantStreamMode = "explain_page" | "answer_followup";

export interface LectureAssistantStreamRequestBody {
  materialId: number;
  pageNumber: number;
  mode: LectureAssistantStreamMode;
  userMessage?: string | null;
}

export interface LectureAssistantStreamCallbacks {
  onThoughtDelta?: (chunk: string) => void;
  onThoughtComplete?: () => void;
  onAnswerDelta?: (chunk: string) => void;
  onDone?: () => void;
  onError?: (err: Error) => void;
}

function dispatchAssistantSsePayload(
  parsed: Record<string, unknown>,
  cbs: LectureAssistantStreamCallbacks,
): "done" | "error" | "continue" {
  const type = String(parsed.type ?? parsed.event ?? "").toLowerCase();
  const delta = pickFirstString(parsed, ["delta", "text", "content", "chunk"]) ?? "";

  if (type === "error" || typeof parsed.error === "string") {
    const msg = pickFirstString(parsed, ["message", "error"]) ?? "스트림 오류";
    cbs.onError?.(new Error(msg));
    return "error";
  }
  if (type === "done" || toBool(parsed.final) === true) {
    cbs.onDone?.();
    return "done";
  }
  if (
    type === "thought_done" ||
    type === "thinking_complete" ||
    type === "thought_complete" ||
    (type.includes("thought") && type.includes("complete"))
  ) {
    cbs.onThoughtComplete?.();
    return "continue";
  }
  if (
    (type === "thought" ||
      type === "thinking" ||
      type === "thought_delta" ||
      type.includes("thought")) &&
    delta
  ) {
    cbs.onThoughtDelta?.(delta);
    return "continue";
  }
  if (
    delta &&
    (type === "answer" ||
      type === "content" ||
      type === "message" ||
      type === "delta" ||
      type === "")
  ) {
    cbs.onAnswerDelta?.(delta);
    return "continue";
  }
  if (delta) {
    cbs.onAnswerDelta?.(delta);
  }
  return "continue";
}

/**
 * 강의 보조 SSE — `EventSource` 대신 `fetch`(Authorization 가능) +
 * `iterateSseDataPayloadsFromResponse`(ReadableStream)로 수신한다.
 * `data: {...json}` 줄 단위. type: thought|thought_done|answer|done|error, delta 권장.
 */
export const streamLectureAssistant = (
  lectureId: number,
  body: LectureAssistantStreamRequestBody,
  callbacks: LectureAssistantStreamCallbacks,
): (() => void) => {
  const path = `/api/lectures/${encodeURIComponent(lectureId)}/assistant/stream`;
  const ac = new AbortController();
  let cancelled = false;

  void (async () => {
    try {
      for (let reconnectAttempt = 0; reconnectAttempt <= SSE_RECONNECT_DELAYS_MS.length; reconnectAttempt++) {
        const token = getAuthToken();
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        };
        if (token) headers.Authorization = `Bearer ${token}`;

        try {
          const res = await fetch(resolveApiEndpointUrl(path), {
            method: "POST",
            headers,
            body: JSON.stringify(body),
            mode: "cors",
            credentials: "omit",
            signal: ac.signal,
          });
          if (!res.ok) {
            const t = await res.text();
            throw new Error(
              `API Error (${res.status}): ${t || "강의 보조 스트림 요청 실패"}`,
            );
          }
          let shouldReconnect = false;
          for await (const payload of iterateSseDataPayloadsFromResponse(res, {
            signal: ac.signal,
          })) {
            if (cancelled) return;
            if (!payload) continue;
            if (payload === "[DONE]") {
              callbacks.onDone?.();
              return;
            }
            let parsed: Record<string, unknown>;
            try {
              parsed = JSON.parse(payload) as Record<string, unknown>;
            } catch {
              callbacks.onAnswerDelta?.(payload);
              continue;
            }
            const type = String(parsed.type ?? parsed.event ?? "").toLowerCase();
            if (type === "heartbeat") continue;
            if (type === "timeout") {
              shouldReconnect = true;
              break;
            }
            const r = dispatchAssistantSsePayload(parsed, callbacks);
            if (r === "done" || r === "error") return;
          }
          if (!shouldReconnect) {
            if (!cancelled) callbacks.onDone?.();
            return;
          }
        } catch (e) {
          if (cancelled || (e instanceof Error && e.name === "AbortError")) return;
          if (!isRecoverableTransportError(e) || reconnectAttempt >= SSE_RECONNECT_DELAYS_MS.length) {
            callbacks.onError?.(e instanceof Error ? e : new Error(String(e)));
            return;
          }
        }
        await sleep(SSE_RECONNECT_DELAYS_MS[reconnectAttempt]);
      }
      callbacks.onError?.(new Error("스트림 재연결에 실패했습니다. 다시 시도해주세요."));
    } catch (e) {
      if (cancelled || (e instanceof Error && e.name === "AbortError")) return;
      callbacks.onError?.(e instanceof Error ? e : new Error(String(e)));
    }
  })();

  return () => {
    cancelled = true;
    ac.abort();
  };
};
