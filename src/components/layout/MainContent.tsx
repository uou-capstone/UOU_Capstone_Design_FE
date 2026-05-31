import React from "react";
import { useSearchParams } from "react-router-dom";
import { MarkdownContent } from "../common/MarkdownContent";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import {
  courseApi,
  lectureApi,
  assessmentApi,
  materialApi,
  materialGenerationApi,
  studentReportApi,
  reportCriteriaApi,
  tasksApi,
  examGenerationApi,
  courseContentsApi,
  getAuthToken,
  API_BASE_URL,
  type Course,
  type CourseDetail,
  type PageResponse,
  type MyCourseJoinRequestListItem,
  type CourseJoinRequestStatus,
  type LectureResponseDto,
  type AssessmentSimpleDto,
  type StudentReportDetailResponse,
  type StudentReportListItem,
  type StudentReportStatusFilter,
  type ClassroomReportResponse,
  type StudentReportAiContextResponse,
  type ExamSessionDetailResponse,
  type ExamAnswerSubmission,
  type ExamSubmissionResponse,
  type ExamUserProfile,
  type CourseContentsResponse,
  type CourseContentsLectureExamSession,
  readCourseExamSessionResourceIds,
} from "../../services/api";
import { TeacherStudentManagementPanel } from "@/features/courses/TeacherStudentManagementPanel";
import { AttendanceSessionsPanel } from "@/features/courses/AttendanceSessionsPanel";
import { CourseBoardsPanel } from "@/features/courses/CourseBoardsPanel";
import { CourseMaterialsMetaCard } from "@/features/courses/CourseMaterialsMetaCard";
import { ReportCriteriaPanel } from "@/features/courses/ReportCriteriaPanel";
import RightSidebar, { type RightSidebarExamProps } from "./RightSidebar";

function reportInsightPrimaryText(row: Record<string, unknown>): string {
  for (const k of ["title", "headline", "label", "name", "summary", "text", "description"]) {
    const v = row[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "항목";
}

/** PDF 미리보기 분할 뷰: 학생은 시험 UI 없이 강의 학습·통합학습 탭만 쓸 때 사용하는 고정 스텁 */
const STUDENT_PDF_SIDEBAR_EXAM_PROPS: RightSidebarExamProps = {
  examMode: false,
  onExamModeChange: () => {},
  isTeacher: false,
  examType: "FLASH_CARD",
  setExamType: () => {},
  examCount: 10,
  setExamCount: () => {},
  examFormKey: 0,
  profileProficiencyLevel: "Beginner",
  setProfileProficiencyLevel: () => {},
  profileTargetDepth: "Concept",
  setProfileTargetDepth: () => {},
  profileQuestionModality: "Balance",
  setProfileQuestionModality: () => {},
  onCreateExam: () => {},
  submitting: false,
  onRecoverSession: () => {},
  recoverOpen: false,
  recoverSelectedId: "",
  setRecoverSelectedId: () => {},
  recoverExams: [],
  onRecoverSubmit: () => {},
  setRecoverOpen: () => {},
};
import SettingsPage from "@/pages/dashboard/SettingsPage";
import UpdatesPage from "@/pages/dashboard/UpdatesPage";
import PdfViewer, { type PdfViewerHandle } from "../common/PdfViewer";
import {
  CheckIcon,
  ClipboardIcon,
  CloseIcon,
  EditIcon,
  RefreshIcon,
  SparklesIcon,
  TrashIcon,
  UploadTrayIcon,
  UsersIcon,
} from "../common/Icons";

type ViewMode = "course-list" | "course-detail";
// 메인 메뉴는 강의/설정/업데이트 사용
type MenuItem = "lectures" | "settings" | "updates";

const courseCardIconPalette = [
  {
    color: "text-[#ff824d]",
    bg: "bg-[#ff824d]/10",
    border: "border-black/15",
    path: "M12 4v16m8-8H4",
  },
  {
    color: "text-[#ff824d]",
    bg: "bg-white",
    border: "border-black/15",
    path: "M4 7h16M7 4h10l1 3H6l1-3Zm-1 3 1.25 13h9.5L18 7",
  },
  {
    color: "text-[#ff824d]",
    bg: "bg-[#ff824d]/10",
    border: "border-black/15",
    path: "M12 4 4 8l8 4 8-4-8-4Zm-8 8 8 4 8-4M4 16l8 4 8-4",
  },
  {
    color: "text-[#ff824d]",
    bg: "bg-white",
    border: "border-black/15",
    path: "M5 5v14m0-13h12l-2 4 2 4H5",
  },
  {
    color: "text-[#ff824d]",
    bg: "bg-[#ff824d]/10",
    border: "border-black/15",
    path: "M7 8h10M7 12h7M7 16h10M5 4h14v16H5z",
  },
  {
    color: "text-black",
    bg: "bg-white",
    border: "border-black/15",
    path: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 0c2.5 2.4 3.75 5.4 3.75 9S14.5 18.6 12 21M12 3C9.5 5.4 8.25 8.4 8.25 12S9.5 18.6 12 21M3.6 9h16.8M3.6 15h16.8",
  },
  {
    color: "text-[#ff824d]",
    bg: "bg-[#ff824d]/10",
    border: "border-black/15",
    path: "M5 7c0-1.7 3.1-3 7-3s7 1.3 7 3-3.1 3-7 3-7-1.3-7-3Zm0 0v10c0 1.7 3.1 3 7 3s7-1.3 7-3V7M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3",
  },
  {
    color: "text-[#ff824d]",
    bg: "bg-white",
    border: "border-black/15",
    path: "M12 4v5m0 6v5M4 12h5m6 0h5M7.8 7.8l3.5 3.5m1.4 1.4 3.5 3.5m0-8.4-3.5 3.5m-1.4 1.4-3.5 3.5",
  },
] as const;

function CourseCardVisualIcon({ index }: { index: number }) {
  const item = courseCardIconPalette[index % courseCardIconPalette.length];
  return (
    <div
      className={`flex h-16 w-16 items-center justify-center rounded-xl border ${item.bg} ${item.border} ${item.color}`}
      aria-hidden="true"
    >
      <svg
        className="h-8 w-8"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          d={item.path}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
        />
      </svg>
    </div>
  );
}

type ItemType = "material" | "exam" | "assessment";
type CenterItem = {
  id: string;
  type: ItemType;
  title: string;
  meta: string;
  createdAt: string;
  fileUrl?: string;
  materialId?: number;
  /** 강의자료 생성(Phase 1~5) 세션 ID — DELETE /api/materials/generation/{sessionId} 삭제 시 사용 */
  generationSessionId?: number;
  /** latest-session 응답의 finalDocument(마크다운 본문). 있으면 fetch 없이 이 값만 표시 */
  finalDocument?: string;
  assessmentId?: number;
  examSessionId?: string;
  /** 시험 항목: 자동 이름 (2),(3) 부여·중복 검사에 사용 */
  examType?: string;
  targetCount?: number;
  /** 시험만: 출제 기준 업로드 PDF materialId (강의실 자료 카드의 materialId와 동일 개념) */
  sourceMaterialId?: number;
  /** 시험만: 출제 기준 AI 생성 문서 세션 ID */
  sourceGenerationSessionId?: number;
};

function formatIsoInstantForKo(iso: string | undefined): string {
  if (iso == null || String(iso).trim() === "") return "—";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  return new Date(t).toLocaleString("ko-KR");
}

function formatActivityMonthForKo(value: string | undefined): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "-";
  const t = Date.parse(raw);
  if (Number.isNaN(t)) return raw;
  const date = new Date(t);
  return `${date.getFullYear()}년 ${String(date.getMonth() + 1).padStart(2, "0")}월 ${String(date.getDate()).padStart(2, "0")}일 ${String(date.getHours()).padStart(2, "0")}시 ${String(date.getMinutes()).padStart(2, "0")}분`;
}

function formatReportPercent(value: number | undefined): string {
  if (value == null || !Number.isFinite(value)) return "-";
  return `${Math.round(value)}%`;
}

function formatReportCount(value: number | undefined, suffix = "회"): string {
  if (value == null || !Number.isFinite(value)) return "-";
  return `${Math.round(value)}${suffix}`;
}

function clampReportScore(value: number | undefined): number {
  if (value == null || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function compactReportLines(value: string | undefined, fallback: string): string[] {
  const lines = String(value ?? "")
    .split(/\r?\n/)
    .map((line) => line.replace(/^[\s>*#\-•]+/, "").trim())
    .filter(Boolean);
  return lines.length > 0 ? lines.slice(0, 4) : [fallback];
}

function sanitizeDownloadFileName(name: string | null | undefined): string {
  const base = String(name ?? "ai-lecture-material")
    .replace(/\.[^/.]+$/, "")
    .replace(/[\\/:*?"<>|]/g, "-")
    .trim();
  return base || "ai-lecture-material";
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return char;
    }
  });
}

function joinRequestStatusLabel(status: CourseJoinRequestStatus | string): string {
  const s = String(status ?? "").toUpperCase();
  if (s === "PENDING") return "대기";
  if (s === "APPROVED") return "승인";
  if (s === "REJECTED") return "거절";
  if (s === "BLOCKED") return "차단";
  return s || "—";
}

const MAX_COURSE_TITLE_LEN = 100;
const MAX_COURSE_DESCRIPTION_LEN = 500;

/** 시험 뷰어 진입 직전 자료(PDF/마크다운) 미리보기 — 닫을 때 복원 */
type ResourcePreviewSnapshot = {
  previewFileUrl: string | null;
  previewMaterialId: number | null;
  previewFileName: string | null;
  previewIsAiGenerationDoc: boolean;
  previewLinkedGenerationSessionId: number | null;
};

/** 현재 미리보기 중인 자료와 일치하는 시험만 시험 메뉴에 표시 */
type ExamResourceFilter =
  | { kind: "material"; materialId: number }
  | { kind: "generation"; sessionId: number };

type PendingMaterialGenTask = {
  taskId: string;
  sessionId: number;
  courseId: number;
  lectureId: number;
  keyword: string;
  savedAt: number;
};

const MATERIAL_GEN_PENDING_STORAGE_KEY = "pending_material_gen_tasks_v1";
const STUDENT_REPORT_STATUS_OPTIONS: {
  value: StudentReportStatusFilter;
  label: string;
}[] = [
  { value: "all", label: "전체" },
  { value: "excelling", label: "우수" },
  { value: "on_track", label: "정상" },
  { value: "needs_attention", label: "주의 필요" },
  { value: "insufficient_data", label: "데이터 부족" },
];

const studentReportStatusLabel = (status: string): string => {
  const matched = STUDENT_REPORT_STATUS_OPTIONS.find((option) => option.value === status);
  return matched?.label ?? status;
};

function ReportDashboardStatIcon({ name }: { name: string }) {
  const path =
    name === "users"
      ? "M17 20h5v-2a3 3 0 0 0-5.36-1.86M17 20H7m10 0v-2a5 5 0 0 0-10 0v2m10-13a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM7 10a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z"
      : name === "selected"
        ? "M9 12l2 2 4-5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
        : name === "alert"
          ? "M12 9v4m0 4h.01M10.3 4.3 2.2 18h15L13.7 4.3a2 2 0 0 0-3.4 0Z"
          : "M7 4h7l3 3v13H7V4Zm7 0v4h4M9 13h6M9 17h4";
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        d={path}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      />
    </svg>
  );
}

/** 강의 리소스 그리드: PDF·마크다운(인라인) 및 동일 취급 API 경로만 노출 */
function isPdfOrMarkdownResourceItem(item: CenterItem): boolean {
  if (item.type !== "material") return false;
  if (
    typeof item.finalDocument === "string" &&
    item.finalDocument.trim().length > 0
  ) {
    return true;
  }
  const url = (item.fileUrl ?? "").trim();
  if (!url) return false;
  const lower = url.toLowerCase();
  const path = lower.split("?")[0].split("#")[0];
  if (path.endsWith(".pdf") || path.endsWith(".md")) return true;
  if (/\/api\/materials\/\d+\/file\b/i.test(url)) return true;
  if (/\/materials\/\d+\/file\b/i.test(url)) return true;
  if (/\/materials\/generation\/\d+\/document\b/i.test(url)) return true;
  return false;
}

function parseGenerationSessionIdFromMaterialItem(item: CenterItem): number | null {
  if (item.generationSessionId != null) return item.generationSessionId;
  const m = /^material-session-(\d+)$/.exec(item.id);
  if (m) return Number(m[1]);
  const url = item.fileUrl ?? "";
  const m2 = /\/materials\/generation\/(\d+)\//.exec(url);
  if (m2) return Number(m2[1]);
  return null;
}

function buildActiveExamResourceFilter(
  previewMaterialId: number | null,
  previewLinkedGenerationSessionId: number | null,
): ExamResourceFilter | null {
  if (previewMaterialId != null)
    return { kind: "material", materialId: previewMaterialId };
  if (previewLinkedGenerationSessionId != null)
    return { kind: "generation", sessionId: previewLinkedGenerationSessionId };
  return null;
}

/** 사이드바/스토리지 fileUrl에서 업로드 자료 materialId 추출 (시험 생성 sourceMaterialId 복구) */
function parseMaterialIdFromMaterialFileUrl(fileUrl: string): number | null {
  if (!fileUrl || typeof fileUrl !== "string") return null;
  if (fileUrl.startsWith("blob:")) return null;
  const m =
    /\/api\/materials\/(\d+)(?:\/file)?(?:\?|#|$)/i.exec(fileUrl) ??
    /\/materials\/(\d+)(?:\/file)?(?:\?|#|$)/i.exec(fileUrl);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function resolveMaterialIdFromSidebarSync(
  lectureId: number | null | undefined,
  fileUrl: string,
  fileName: string,
  localMaterials: Record<number, CenterItem[]>,
  explicitMaterialId?: number | null,
): number | null {
  if (
    explicitMaterialId != null &&
    Number.isFinite(explicitMaterialId) &&
    explicitMaterialId > 0
  ) {
    return explicitMaterialId;
  }
  const parsed = parseMaterialIdFromMaterialFileUrl(fileUrl);
  if (parsed != null) return parsed;
  if (lectureId == null) return null;
  const mats = localMaterials[lectureId] ?? [];
  const nameTrim = (fileName || "").trim();
  for (const mat of mats) {
    if (mat.materialId == null) continue;
    if (fileUrl && mat.fileUrl && mat.fileUrl === fileUrl) return mat.materialId;
  }
  // 제목만으로는 동일 제목 자료가 여러 개일 때 첫 항목이 잘못 선택될 수 있어, 유일할 때만 매칭
  if (nameTrim) {
    const byTitle = mats.filter(
      (mat) =>
        mat.materialId != null && (mat.title || "").trim() === nameTrim,
    );
    if (byTitle.length === 1) return byTitle[0].materialId!;
  }
  return null;
}

function examCenterItemMatchesResource(
  item: CenterItem,
  filter: ExamResourceFilter | null,
): boolean {
  if (item.type !== "exam") return true;
  if (filter == null) return false;
  const sm = item.sourceMaterialId;
  const sg = item.sourceGenerationSessionId;
  if (sm == null && sg == null) return false;
  if (filter.kind === "material") return sm === filter.materialId;
  return sg === filter.sessionId;
}

function formatAutoExamBaseTitle(examType: string, targetCount: number): string {
  return `${examType} · ${targetCount}문항`;
}

/** 자동 이름 계열: "TYPE · N문항" 또는 "TYPE · N문항 (k)" */
function isAutoFamilyTitle(title: string, base: string): boolean {
  if (title === base) return true;
  const prefix = `${base} (`;
  if (!title.startsWith(prefix) || !title.endsWith(")")) return false;
  const inner = title.slice(prefix.length, -1);
  return /^\d+$/.test(inner);
}

function centerItemMatchesExamKeyForAuto(
  e: CenterItem,
  examType: string,
  targetCount: number,
  base: string,
): boolean {
  if (e.type !== "exam") return false;
  if (e.examType != null && e.targetCount != null) {
    return e.examType === examType && e.targetCount === targetCount;
  }
  return isAutoFamilyTitle(e.title, base);
}

function extractJoinRequestErrorCode(message: string): string | null {
  const patterns = [
    /"code"\s*:\s*"([A-Z_]+)"/,
    /\b(INVALID_INVITATION_CODE|JOIN_REQUEST_BLOCKED|JOIN_REQUEST_PENDING_EXISTS|ENROLLMENT_ALREADY_EXISTS|JOIN_REQUEST_ALREADY_PROCESSED)\b/,
  ];
  for (const p of patterns) {
    const m = p.exec(message);
    if (m?.[1]) return m[1];
  }
  return null;
}

function mapJoinRequestErrorMessage(raw: string): string {
  const code = extractJoinRequestErrorCode(raw);
  if (code === "INVALID_INVITATION_CODE") return "초대 코드가 올바르지 않습니다.";
  if (code === "JOIN_REQUEST_BLOCKED") return "해당 강의실 가입이 차단되었습니다. 교사에게 문의하세요.";
  if (code === "JOIN_REQUEST_PENDING_EXISTS") return "이미 대기 중인 요청이 있습니다.";
  if (code === "ENROLLMENT_ALREADY_EXISTS") return "이미 수강 중인 강의실입니다.";
  if (code === "JOIN_REQUEST_ALREADY_PROCESSED") return "이미 처리된 요청입니다. 목록을 새로고침해 주세요.";
  return raw;
}

function readExamSessionDisplayName(
  s: CourseContentsLectureExamSession & { display_name?: string | null },
): string | undefined {
  const raw =
    (typeof s.displayName === "string" ? s.displayName : null) ??
    (typeof s.display_name === "string" ? s.display_name : null);
  if (raw == null) return undefined;
  const t = raw.trim();
  return t.length > 0 ? t : undefined;
}

function courseExamSessionToCenterItem(
  s: CourseContentsLectureExamSession,
): CenterItem {
  const base = formatAutoExamBaseTitle(s.examType, s.targetCount);
  const custom = readExamSessionDisplayName(s);
  const title = custom ?? base;
  const src = readCourseExamSessionResourceIds(
    s as CourseContentsLectureExamSession & Record<string, unknown>,
  );
  return {
    id: String(s.examSessionId),
    type: "exam",
    title,
    meta: "시험",
    createdAt: s.createdAt,
    examSessionId: String(s.examSessionId),
    examType: s.examType,
    targetCount: s.targetCount,
    ...(src.sourceMaterialId != null
      ? { sourceMaterialId: src.sourceMaterialId }
      : {}),
    ...(src.sourceGenerationSessionId != null
      ? { sourceGenerationSessionId: src.sourceGenerationSessionId }
      : {}),
  };
}

function resolveNewExamDisplayName(
  customInput: string,
  examType: string,
  targetCount: number,
  existingItems: CenterItem[],
): { title: string } | { error: "duplicate-custom" } {
  const exams = existingItems.filter((e) => e.type === "exam");
  const trimmed = customInput.trim();
  if (trimmed.length > 0) {
    const dup = exams.some((e) => e.title === trimmed);
    if (dup) return { error: "duplicate-custom" };
    return { title: trimmed };
  }
  const base = formatAutoExamBaseTitle(examType, targetCount);
  const sameKey = exams.filter((e) =>
    centerItemMatchesExamKeyForAuto(e, examType, targetCount, base),
  );
  const used = new Set(sameKey.map((e) => e.title));
  if (!used.has(base)) return { title: base };
  let n = 2;
  while (used.has(`${base} (${n})`)) n += 1;
  return { title: `${base} (${n})` };
}

type FiveChoiceResultStatus = "Correct" | "Incorrect";

interface FiveChoiceEvaluationItem {
  questionId: number;
  resultStatus: FiveChoiceResultStatus;
  questionContent: string;
  userResponse: string;
  relatedTopic?: string;
  feedbackMessage?: string;
}

interface FiveChoiceLogData {
  evaluationItems: FiveChoiceEvaluationItem[];
}

interface ShortAnswerEvaluationItem {
  questionId: number;
  questionContent: string;
  userResponse: string;
  /** 0~1 (백엔드 Gemini 채점) */
  score: number;
  gradingReason: string;
  feedback: string;
  pointsDeducted?: boolean;
  deductionReason?: string;
}

interface ShortAnswerLogData {
  evaluationItems: ShortAnswerEvaluationItem[];
}

function getShortAnswerKeywordsFromProblem(q: {
  relatedKeywords?: string[];
  keyKeywords?: string[];
}): string[] {
  if (Array.isArray(q.relatedKeywords) && q.relatedKeywords.length > 0) {
    return q.relatedKeywords;
  }
  const kk = q.keyKeywords;
  if (Array.isArray(kk) && kk.length > 0) return kk;
  return [];
}

function getShortAnswerIntentText(q: {
  evaluationCriteria?: string;
  intentDiagnosis?: string;
}): string {
  const parts = [q.intentDiagnosis, q.evaluationCriteria].filter(
    (s): s is string => typeof s === "string" && s.trim().length > 0,
  );
  return parts.join("\n\n").trim();
}

type OxUserChoice = "O" | "X";

/** 시험 API의 correctAnswer 문자열을 O/X로 정규화 (인식 불가 시 null) */
function normalizeExamOxCorrectAnswer(raw: string): OxUserChoice | null {
  const t = raw.trim();
  const u = t.toUpperCase();
  if (
    u === "O" ||
    u === "TRUE" ||
    u === "T" ||
    u === "1" ||
    u === "YES" ||
    u === "Y"
  ) {
    return "O";
  }
  if (
    u === "X" ||
    u === "FALSE" ||
    u === "F" ||
    u === "0" ||
    u === "NO" ||
    u === "N"
  ) {
    return "X";
  }
  const k = t.replace(/\s/g, "");
  if (k === "맞음" || k === "참" || k === "옳음" || k === "○") return "O";
  if (k === "틀림" || k === "거짓" || k === "×" || k === "✕") return "X";
  if (t.length === 1) {
    const c = t.toUpperCase();
    if (c === "O") return "O";
    if (c === "X") return "X";
  }
  return null;
}

function isOxAnswerCorrect(userChoice: OxUserChoice, correctRaw: string): boolean {
  const canonical = normalizeExamOxCorrectAnswer(correctRaw);
  if (canonical !== null) return userChoice === canonical;
  const one = correctRaw.trim().slice(0, 1).toUpperCase();
  if (one === "O" || one === "X") return userChoice === one;
  return false;
}

function areAllFiveChoiceAnswered(
  problems: { options?: { id: string }[] }[],
  answers: Record<string, string>,
): boolean {
  return problems.every((q, idx) => {
    const id = answers[String(idx)];
    const opts = q.options ?? [];
    return id != null && id !== "" && opts.some((o) => o.id === id);
  });
}

/** 5지선다 보기 행: 선택·채점 후 정오답에 따른 테두리·배경 */
function fiveChoiceOptionLabelClass(
  selected: boolean,
  mcGraded: boolean,
  optIsCorrect: boolean,
  isDarkMode: boolean,
): string {
  let c =
    "flex items-start gap-2 w-full rounded-lg border text-left transition-colors px-2.5 py-2 ";
  if (mcGraded) {
    if (optIsCorrect) {
      c += isDarkMode
        ? "border-emerald-500/90 bg-emerald-950/35"
        : "border-emerald-500 bg-emerald-50";
    } else if (selected) {
      c += isDarkMode
        ? "border-red-500/80 bg-red-950/30"
        : "border-red-400 bg-red-50";
    } else {
      c += isDarkMode
        ? "border-zinc-800/80 bg-transparent opacity-55"
        : "border-gray-100 bg-transparent opacity-65";
    }
    c += " cursor-default";
  } else if (selected) {
    c += isDarkMode
      ? "border-emerald-500 bg-emerald-950/40 ring-1 ring-emerald-500/30"
      : "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500/25";
    c += " cursor-pointer";
  } else {
    c += isDarkMode
      ? "border-zinc-600 hover:border-zinc-500 hover:bg-zinc-800/40"
      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50";
    c += " cursor-pointer";
  }
  return c;
}

/** O/X 선택 버튼: 선택·채점 후 정오답 표시 */
function oxChoiceButtonClass(opts: {
  letter: OxUserChoice;
  choice: OxUserChoice | undefined;
  correctCanonical: OxUserChoice | null;
  graded: boolean;
  isDarkMode: boolean;
}): string {
  const { letter, choice, correctCanonical, graded, isDarkMode } = opts;
  const selected = choice === letter;
  const isCorrectAnswer = correctCanonical === letter;
  let base =
    "inline-flex items-center justify-center min-w-[3rem] px-4 py-2 rounded-lg border text-sm font-semibold transition-colors ";

  if (graded) {
    if (isCorrectAnswer) {
      return (
        base +
        (isDarkMode
          ? "border-emerald-500 bg-emerald-950/40 text-emerald-300 cursor-default"
          : "border-emerald-500 bg-emerald-50 text-emerald-800 cursor-default")
      );
    }
    if (selected) {
      return (
        base +
        (isDarkMode
          ? "border-red-500 bg-red-950/35 text-red-300 cursor-default"
          : "border-red-400 bg-red-50 text-red-700 cursor-default")
      );
    }
    return (
      base +
      (isDarkMode
        ? "border-zinc-700 text-zinc-500 opacity-45 cursor-default"
        : "border-gray-200 text-gray-400 opacity-55 cursor-default")
    );
  }
  if (selected) {
    return (
      base +
      (isDarkMode
        ? "border-emerald-500 bg-emerald-950/45 text-emerald-200 ring-1 ring-emerald-500/35 cursor-pointer"
        : "border-emerald-500 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-500/25 cursor-pointer")
    );
  }
  return (
    base +
    (isDarkMode
      ? "border-zinc-600 text-zinc-200 hover:border-zinc-500 hover:bg-zinc-800/50 cursor-pointer"
      : "border-gray-300 text-gray-800 hover:border-gray-400 hover:bg-gray-50 cursor-pointer")
  );
}

type ExamProblemViewMode = "single" | "all";

/** OX / 5지선다: 한 개씩 보기 ↔ 전체 보기 (클릭마다 전환) */
function ExamSectionViewModeToggle(props: {
  mode: ExamProblemViewMode;
  onChange: (mode: ExamProblemViewMode) => void;
  isDarkMode: boolean;
}) {
  const { mode, onChange, isDarkMode } = props;
  const nextMode: ExamProblemViewMode =
    mode === "single" ? "all" : "single";
  const btnClass = `inline-flex items-center justify-center rounded-md border p-1.5 transition-colors shrink-0 ${
    isDarkMode
      ? "border-emerald-500/80 bg-emerald-950/40 text-emerald-200 hover:bg-emerald-950/60"
      : "border-emerald-500 bg-emerald-50 text-emerald-900 hover:bg-emerald-100"
  }`;
  const singleIcon = (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden
    >
      <rect x="6" y="4" width="12" height="16" rx="1.5" strokeWidth="2" />
      <path d="M9 9h6M9 12h4" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
  const allIcon = (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden
    >
      <circle cx="5" cy="7" r="1.25" fill="currentColor" />
      <circle cx="5" cy="12" r="1.25" fill="currentColor" />
      <circle cx="5" cy="17" r="1.25" fill="currentColor" />
      <path
        d="M9 7h10M9 12h10M9 17h10"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
  return (
    <button
      type="button"
      className={btnClass}
      onClick={() => onChange(nextMode)}
      title={
        mode === "single"
          ? "한 개씩 보기 — 클릭하면 전체 보기"
          : "전체 보기 — 클릭하면 한 개씩 보기"
      }
      aria-label={
        mode === "single"
          ? "한 개씩 보기. 클릭하면 전체 보기로 전환합니다."
          : "전체 보기. 클릭하면 한 개씩 보기로 전환합니다."
      }
      aria-pressed={mode === "single"}
    >
      {mode === "single" ? singleIcon : allIcon}
    </button>
  );
}

/** 플래시카드와 동일: 카드 영역 양옆에 절반 겹침 원형 이전·다음 */
function ExamFlashStyleSideArrows(props: {
  show: boolean;
  isDarkMode: boolean;
  prevDisabled: boolean;
  nextDisabled: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  const {
    show,
    isDarkMode,
    prevDisabled,
    nextDisabled,
    onPrev,
    onNext,
  } = props;
  if (!show) return null;
  const base =
    "absolute top-1/2 z-10 flex h-9 w-9 items-center justify-center rounded-full border disabled:opacity-40 disabled:cursor-not-allowed";
  const skin = isDarkMode
    ? "border-zinc-700 bg-zinc-900/90 text-gray-200"
    : "border-gray-300 bg-white/95 text-gray-700";
  return (
    <>
      <button
        type="button"
        onClick={onPrev}
        disabled={prevDisabled}
        className={`${base} ${skin} left-0 -translate-x-1/2 -translate-y-1/2`}
        aria-label="이전 문항"
        title="이전"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          aria-hidden
        >
          <path
            d="M15 18l-6-6 6-6"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled}
        className={`${base} ${skin} right-0 translate-x-1/2 -translate-y-1/2`}
        aria-label="다음 문항"
        title="다음"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          aria-hidden
        >
          <path
            d="M9 6l6 6-6 6"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </>
  );
}

function examSingleFlashCardShellClass(isDarkMode: boolean): string {
  return `flex w-full min-h-[min(20rem,45dvh)] flex-col rounded-xl border p-5 text-left transition-colors ${
    isDarkMode
      ? "border-zinc-700 bg-zinc-900/70"
      : "border-gray-200 bg-white"
  }`;
}

function examModalFlashCardShellClass(isDarkMode: boolean): string {
  return `flex w-full min-h-[min(15rem,36dvh)] flex-col rounded-xl border p-4 text-left transition-colors ${
    isDarkMode
      ? "border-zinc-700 bg-zinc-900/70"
      : "border-gray-200 bg-white"
  }`;
}

/** 문항별 응답 여부·현재 문항(한 개씩 보기) 미니 표시 */
function ExamQuestionProgressDots(props: {
  total: number;
  currentIndex: number | null;
  isAnswered: (index: number) => boolean;
  onSelect?: (index: number) => void;
  isDarkMode: boolean;
}) {
  const { total, currentIndex, isAnswered, onSelect, isDarkMode } = props;
  return (
    <div
      className="flex flex-wrap items-center justify-center gap-2 py-1.5"
      role="list"
      aria-label="문항별 응답 상태"
    >
      {Array.from({ length: total }, (_, i) => {
        const answered = isAnswered(i);
        const current = currentIndex === i;
        const base =
          "h-2 w-2 rounded-full transition-all shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500";
        let cls = `${base} `;
        if (answered) {
          cls += isDarkMode ? "bg-emerald-500" : "bg-emerald-600";
        } else {
          cls += isDarkMode
            ? "border border-zinc-500 bg-transparent"
            : "border border-gray-300 bg-transparent";
        }
        if (current) {
          cls += isDarkMode
            ? " ring-2 ring-zinc-200 ring-offset-2 ring-offset-[#141414]"
            : " ring-2 ring-gray-800 ring-offset-2 ring-offset-white";
        }
        const label = `문항 ${i + 1}${answered ? ", 응답함" : ", 미응답"}`;
        if (onSelect) {
          return (
            <button
              key={i}
              type="button"
              className={cls}
              title={label}
              aria-label={label}
              aria-current={current ? "step" : undefined}
              onClick={() => onSelect(i)}
            />
          );
        }
        return (
          <span
            key={i}
            className={cls}
            title={label}
            role="listitem"
            aria-label={label}
          />
        );
      })}
    </div>
  );
}

interface MainContentProps {
  viewMode: ViewMode;
  /** 강의(주차)/리소스 편집(수정/삭제) 모드 토글 */
  lectureEditMode?: boolean;
  onLectureEditModeChange?: (v: boolean) => void;
  courses: Course[];
  coursesPage?: PageResponse<Course> | null;
  courseListPage?: number;
  courseListSortOrder?: "recent" | "name";
  isCoursesLoading: boolean;
  onCourseListPageChange?: (page: number) => void;
  onCourseListSortOrderChange?: (sortOrder: "recent" | "name") => void;
  onSelectCourse: (courseId: number) => void;
  onBackToCourses: () => void;
  courseDetail: CourseDetail | null;
  isCourseDetailLoading: boolean;
  courseDetailError: string | null;
  selectedLectureId?: number | null;
  onSelectLecture?: (lectureId: number) => void;
  selectedMenu?: MenuItem;
  onEditCourse?: (course: Course) => void;
  /** 강의 상세에서 메타데이터 저장 시 — 사이드바 목록 동기화용(useCourses의 updateCourse 등) */
  onUpdateCourse?: (
    courseId: number,
    data: { title: string; description: string },
  ) => Promise<{ success: boolean; error?: string }>;
  onReloadCourseDetail?: () => Promise<void>;
  onDeleteCourse?: (course: Course, options?: { skipConfirm?: boolean }) => void;
  onEditLecture?: (lecture: NonNullable<CourseDetail["lectures"]>[number]) => void;
  onDeleteLecture?: (lectureId: number, options?: { skipAlert?: boolean }) => void;
  onCourseCreated?: (course: CourseDetail) => void;
  onLectureCreated?: (lecture: LectureResponseDto) => void;
  onPreviewStateChange?: (fileName: string | null) => void;
  /** TopNav 미리보기 뒤로가기 → MainContent가 동기적으로 미리보기/시험만 닫도록 연결 */
  registerViewerBackHandler?: (fn: (() => void) | null) => void;
}

const MainContent: React.FC<MainContentProps> = ({
  viewMode,
  lectureEditMode: externalLectureEditMode,
  onLectureEditModeChange,
  courses,
  coursesPage,
  courseListPage = 0,
  courseListSortOrder = "recent",
  isCoursesLoading,
  onCourseListPageChange,
  onCourseListSortOrderChange,
  onSelectCourse,
  onBackToCourses,
  courseDetail,
  isCourseDetailLoading,
  courseDetailError,
  selectedLectureId,
  onSelectLecture,
  onEditCourse,
  onUpdateCourse,
  onReloadCourseDetail,
  onDeleteCourse,
  onEditLecture,
  onDeleteLecture,
  onCourseCreated,
  onLectureCreated,
  selectedMenu = "lectures",
  onPreviewStateChange,
  registerViewerBackHandler,
}) => {
  const { isDarkMode } = useTheme();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const isTeacher = user?.role === "TEACHER";
  const isStudent = user?.role === "STUDENT";
  const [addMenuOpen, setAddMenuOpen] = React.useState(false);
  const addMenuRef = React.useRef<HTMLDivElement>(null);
  const [assessments, setAssessments] = React.useState<AssessmentSimpleDto[]>(
    [],
  );
  const [assessmentsLoading, setAssessmentsLoading] = React.useState(false);
  const [localMaterials, setLocalMaterials] = React.useState<
    Record<number, CenterItem[]>
  >({});
  const [localExams, setLocalExams] = React.useState<
    Record<number, CenterItem[]>
  >({});
  const [uploadModalOpen, setUploadModalOpen] = React.useState(false);
  const [materialGenModalOpen, setMaterialGenModalOpen] = React.useState(false);
  /** 오른쪽 패널 시험 만들기 모드 (강의 선택 후 PDF 미리보기 옆 채팅창에서 프로필 설정) */
  const [rightSidebarExamMode, setRightSidebarExamMode] = React.useState(false);
  const [assessmentModalOpen, setAssessmentModalOpen] = React.useState(false);
  const [uploadFile, setUploadFile] = React.useState<File | null>(null);
  const [uploadDragOver, setUploadDragOver] = React.useState(false);
  const [materialKeyword, setMaterialKeyword] = React.useState("");
  const [materialGenStep, setMaterialGenStep] = React.useState<
    1 | 2 | 3 | 4 | 5
  >(1);
  const [materialSessionId, setMaterialSessionId] = React.useState<
    number | null
  >(null);
  const [materialDraftPlan, setMaterialDraftPlan] = React.useState<Record<
    string,
    unknown
  > | null>(null);
  const [materialPhase2Feedback, setMaterialPhase2Feedback] =
    React.useState("");
  const [materialPhase2UpdateMode, setMaterialPhase2UpdateMode] =
    React.useState(false);
  const [materialChapterSummary, setMaterialChapterSummary] = React.useState<
    string | null
  >(null);
  const [materialVerifiedSummary, setMaterialVerifiedSummary] = React.useState<
    string | null
  >(null);
  const [materialFinalUrl, setMaterialFinalUrl] = React.useState<string | null>(
    null,
  );
  /** 화면에 띄울 문서 본문 — latest-session/status/phase5의 finalDocument만 사용 */
  const [materialFinalDocument, setMaterialFinalDocument] = React.useState<
    string | null
  >(null);
  const [materialAsyncTaskId, setMaterialAsyncTaskId] = React.useState<
    string | null
  >(null);
  const [materialCompletedViaAsync, setMaterialCompletedViaAsync] =
    React.useState(false);
  /** Phase 5 스트리밍: 실시간 렌더링용 내용·진행 메시지 */
  const [streamedMaterialContent, setStreamedMaterialContent] =
    React.useState("");
  const [streamedMaterialProgress, setStreamedMaterialProgress] =
    React.useState("");
  const materialStreamAbortRef = React.useRef<(() => void) | null>(null);
  const getMaterialPendingTaskKey = React.useCallback(() => {
    if (user?.userId == null || courseDetail?.courseId == null || selectedLectureId == null) {
      return null;
    }
    return `${user.userId}:${courseDetail.courseId}:${selectedLectureId}`;
  }, [user?.userId, courseDetail?.courseId, selectedLectureId]);
  const saveMaterialPendingTask = React.useCallback(
    (task: PendingMaterialGenTask) => {
      const scopedKey = getMaterialPendingTaskKey();
      if (!scopedKey) return;
      try {
        const raw = localStorage.getItem(MATERIAL_GEN_PENDING_STORAGE_KEY);
        const parsed = raw ? (JSON.parse(raw) as Record<string, PendingMaterialGenTask>) : {};
        parsed[scopedKey] = task;
        localStorage.setItem(MATERIAL_GEN_PENDING_STORAGE_KEY, JSON.stringify(parsed));
      } catch {
        // ignore storage errors
      }
    },
    [getMaterialPendingTaskKey],
  );
  const loadMaterialPendingTask = React.useCallback((): PendingMaterialGenTask | null => {
    const scopedKey = getMaterialPendingTaskKey();
    if (!scopedKey) return null;
    try {
      const raw = localStorage.getItem(MATERIAL_GEN_PENDING_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Record<string, PendingMaterialGenTask>;
      return parsed[scopedKey] ?? null;
    } catch {
      return null;
    }
  }, [getMaterialPendingTaskKey]);
  const clearMaterialPendingTask = React.useCallback(() => {
    const scopedKey = getMaterialPendingTaskKey();
    if (!scopedKey) return;
    try {
      const raw = localStorage.getItem(MATERIAL_GEN_PENDING_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, PendingMaterialGenTask>;
      if (!(scopedKey in parsed)) return;
      delete parsed[scopedKey];
      localStorage.setItem(MATERIAL_GEN_PENDING_STORAGE_KEY, JSON.stringify(parsed));
    } catch {
      // ignore storage errors
    }
  }, [getMaterialPendingTaskKey]);
  const [examType, setExamType] = React.useState("FLASH_CARD");
  const [examCount, setExamCount] = React.useState(10);
  /** 시험 폼(이름·주제) 초기화 시 증가 — 입력은 RightSidebar 로컬 state로만 두어 MainContent 리렌더 감소 */
  const [examFormKey, setExamFormKey] = React.useState(0);
  // 시험 생성 프로파일 공통 상태
  const [profileFocusAreasInput, setProfileFocusAreasInput] =
    React.useState("");
  const [profileTargetDepth, setProfileTargetDepth] = React.useState<
    "Concept" | "Application" | "Derivation" | "Deep Understanding"
  >("Concept");
  const [profileQuestionModality, setProfileQuestionModality] = React.useState<
    "Mathematical" | "Theoretical" | "Balance"
  >("Balance");
  const [profileProficiencyLevel, setProfileProficiencyLevel] = React.useState<
    "Beginner" | "Intermediate" | "Advanced"
  >("Beginner");
  const [profileWeaknessFocus, setProfileWeaknessFocus] = React.useState(false);
  const [profileLanguagePreference, setProfileLanguagePreference] =
    React.useState<
      "Korean_with_English_Terms" | "Korean_with_Korean_Terms" | "Only_English"
    >("Korean_with_English_Terms");
  const [profileScenarioBased, setProfileScenarioBased] = React.useState(true);
  const [profileStrictness, setProfileStrictness] = React.useState<
    "Strict" | "Lenient"
  >("Strict");
  const [profileExplanationDepth, setProfileExplanationDepth] = React.useState<
    "Answer_Only" | "Detailed_with_Examples"
  >("Detailed_with_Examples");
  const [profileScopeBoundary, setProfileScopeBoundary] = React.useState<
    "Lecture_Material_Only" | "Allow_External_Knowledge"
  >("Lecture_Material_Only");
  const [assessmentTitle, setAssessmentTitle] = React.useState("");
  const [assessmentType, setAssessmentType] = React.useState<
    "QUIZ" | "ASSIGNMENT"
  >("QUIZ");
  const [assessmentDueDate, setAssessmentDueDate] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  /** 시험 생성 비동기 작업 폴링 중인 taskId (완료 시 자동 refetch) */
  const [examGenPollingTaskId, setExamGenPollingTaskId] = React.useState<string | null>(null);
  const [isCourseModalOpen, setIsCourseModalOpen] = React.useState(false);
  const [courseModalTitle, setCourseModalTitle] = React.useState("");
  const [courseModalDescription, setCourseModalDescription] =
    React.useState("");
  const [isJoinModalOpen, setIsJoinModalOpen] = React.useState(false);
  const [joinCode, setJoinCode] = React.useState("");
  const [addLectureModalOpen, setAddLectureModalOpen] = React.useState(false);
  const [addLectureWeekNumber, setAddLectureWeekNumber] = React.useState("");
  const [addLectureTitle, setAddLectureTitle] = React.useState("");
  const [addLectureSubmitting, setAddLectureSubmitting] = React.useState(false);
  const [editCourseMetaModalOpen, setEditCourseMetaModalOpen] =
    React.useState(false);
  const [editCourseMetaTitle, setEditCourseMetaTitle] = React.useState("");
  const [editCourseMetaDescription, setEditCourseMetaDescription] =
    React.useState("");
  const [editCourseMetaSaving, setEditCourseMetaSaving] = React.useState(false);
  const [joinError, setJoinError] = React.useState<string | null>(null);
  const [joinSuccess, setJoinSuccess] = React.useState<string | null>(null);
  const [isJoining, setIsJoining] = React.useState(false);
  const [myJoinRequestsOpen, setMyJoinRequestsOpen] = React.useState(false);
  const [myJoinRequestsPage, setMyJoinRequestsPage] = React.useState(0);
  const [myJoinRequestsTotalPages, setMyJoinRequestsTotalPages] = React.useState(1);
  const [myJoinRequestsLoading, setMyJoinRequestsLoading] = React.useState(false);
  const [myJoinRequestsError, setMyJoinRequestsError] = React.useState<string | null>(null);
  const [myJoinRequests, setMyJoinRequests] = React.useState<MyCourseJoinRequestListItem[]>([]);
  const [previewFileUrl, setPreviewFileUrl] = React.useState<string | null>(
    null,
  );
  const [previewMaterialId, setPreviewMaterialId] = React.useState<
    number | null
  >(null);
  const [previewFileName, setPreviewFileName] = React.useState<string | null>(
    null,
  );
  /** AI 생성 문서(세션/인라인 마크다운) 미리보기 — 뷰어 상단 제목바·TopNav 중복 제거용 */
  const [previewIsAiGenerationDoc, setPreviewIsAiGenerationDoc] =
    React.useState(false);
  /** AI 문서 미리보기 시 연결된 generation sessionId — 시험 목록을 해당 자료로 한정 */
  const [previewLinkedGenerationSessionId, setPreviewLinkedGenerationSessionId] =
    React.useState<number | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = React.useState<string | null>(
    null,
  );

  /** 시험 출처: materialId 상태 우선, 없으면 미리보기 URL(/api/materials/{id}/file)에서 복구 */
  const examSourceMaterialId = React.useMemo(() => {
    if (
      previewMaterialId != null &&
      Number.isFinite(previewMaterialId) &&
      previewMaterialId > 0
    ) {
      return previewMaterialId;
    }
    if (typeof previewFileUrl === "string" && previewFileUrl.length > 0) {
      const fromUrl = parseMaterialIdFromMaterialFileUrl(previewFileUrl);
      if (fromUrl != null) return fromUrl;
    }
    return null;
  }, [previewMaterialId, previewFileUrl]);

  const activeExamResourceFilter = React.useMemo(
    () =>
      buildActiveExamResourceFilter(
        examSourceMaterialId,
        previewLinkedGenerationSessionId,
      ),
    [examSourceMaterialId, previewLinkedGenerationSessionId],
  );

  const examsForActiveResource = React.useMemo(() => {
    const all = localExams[selectedLectureId ?? 0] ?? [];
    return all.filter((e) => examCenterItemMatchesResource(e, activeExamResourceFilter));
  }, [localExams, selectedLectureId, activeExamResourceFilter]);
  /** PDF 미리보기 시 사용자가 현재 보고 있는 페이지 (1-based, BE 전달용) */
  const [previewCurrentPdfPage, setPreviewCurrentPdfPage] = React.useState<
    number | null
  >(null);
  React.useEffect(() => {
    if (!previewBlobUrl) setPreviewCurrentPdfPage(null);
  }, [previewBlobUrl]);
  React.useEffect(() => {
    if (!previewBlobUrl) setUserPdfNav(null);
  }, [previewBlobUrl]);
  /** AI 강의자료 생성 문서는 MD로 불러와 마크다운 뷰로 표시 */
  const [previewMarkdownContent, setPreviewMarkdownContent] = React.useState<
    string | null
  >(null);
  const [previewLoading, setPreviewLoading] = React.useState(false);
  const [previewLoadError, setPreviewLoadError] = React.useState(false);
  const [previewErrorMessage, setPreviewErrorMessage] = React.useState<
    string | null
  >(null);
  const [previewRetryKey, setPreviewRetryKey] = React.useState(0);
  const previewMarkdownScrollRef = React.useRef<HTMLDivElement | null>(null);
  const pdfViewerRef = React.useRef<PdfViewerHandle | null>(null);
  const handleCopyAiDocument = React.useCallback(async () => {
    const content = previewMarkdownContent?.trim();
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      window.alert("AI 문서 내용을 복사했습니다.");
    } catch {
      window.alert("클립보드 복사에 실패했습니다.");
    }
  }, [previewMarkdownContent]);
  const handleDownloadAiDocumentMarkdown = React.useCallback(() => {
    const content = previewMarkdownContent ?? "";
    if (!content.trim()) return;
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sanitizeDownloadFileName(previewFileName)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [previewMarkdownContent, previewFileName]);
  const handlePrintAiDocumentAsPdf = React.useCallback(() => {
    const content = previewMarkdownContent?.trim();
    if (!content) return;
    const title = sanitizeDownloadFileName(previewFileName);
    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) {
      window.print();
      return;
    }
    printWindow.document.write(`<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      @page { margin: 18mm; }
      body {
        margin: 0;
        color: #111111;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        line-height: 1.65;
      }
      h1 {
        margin: 0 0 18px;
        font-size: 22px;
      }
      pre {
        white-space: pre-wrap;
        word-break: break-word;
        font: inherit;
        margin: 0;
      }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(title)}</h1>
    <pre>${escapeHtml(content)}</pre>
    <script>
      window.addEventListener("load", () => {
        window.focus();
        window.print();
      });
    </script>
  </body>
</html>`);
    printWindow.document.close();
  }, [previewMarkdownContent, previewFileName]);
  const [userPdfNav, setUserPdfNav] = React.useState<{
    page: number;
    at: number;
  } | null>(null);
  const RIGHT_SIDEBAR_DEFAULT_WIDTH = 384;
  const [rightSidebarWidth, setRightSidebarWidth] = React.useState(
    RIGHT_SIDEBAR_DEFAULT_WIDTH,
  );
  /** PDF/MD 자료 뷰: 좌측 뷰어 너비(논리 픽셀). null이면 flex로 50:50 */
  const [resourcePreviewViewerWidthPx, setResourcePreviewViewerWidthPx] =
    React.useState<number | null>(null);
  const resourcePreviewSplitRowRef = React.useRef<HTMLDivElement | null>(null);
  const resourcePreviewViewerPanelRef = React.useRef<HTMLDivElement | null>(
    null,
  );
  const resourcePreviewChatPanelRef = React.useRef<HTMLDivElement | null>(null);
  const lastResourcePreviewSidebarWidthRef = React.useRef<number | null>(null);

  // 시험 세션 상세 보기 모달 상태
  const [examDetailSessionId, setExamDetailSessionId] = React.useState<
    string | null
  >(null);
  /** TopNav 뒤로가기 등에서 최신 세션 ID를 읽기 위해 (effect 의존성에 넣으면 시험 열 때마다 재실행되는 버그 방지) */
  const examDetailSessionIdRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    examDetailSessionIdRef.current = examDetailSessionId;
  }, [examDetailSessionId]);
  /** X로 닫은 직후 URL 쿼리가 한박자 남았을 때 딥링크 복구가 시험을 다시 열지 않도록 */
  const suppressedExamSessionForUrlRestoreRef = React.useRef<string | null>(
    null,
  );
  const previewBeforeExamRef = React.useRef<ResourcePreviewSnapshot | null>(
    null,
  );
  const suppressResourcePreviewRestoreRef = React.useRef(false);
  const [examDetail, setExamDetail] =
    React.useState<ExamSessionDetailResponse | null>(null);
  const [examDetailLoading, setExamDetailLoading] = React.useState(false);
  const [examDetailError, setExamDetailError] = React.useState<string | null>(
    null,
  );
  const [examDetailFlipped, setExamDetailFlipped] = React.useState<
    Record<number, boolean>
  >({});
  const [flashCardIndex, setFlashCardIndex] = React.useState(0);
  const [fiveChoiceUserAnswers, setFiveChoiceUserAnswers] = React.useState<
    Record<string, string>
  >({});
  const [fiveChoiceLog, setFiveChoiceLog] =
    React.useState<FiveChoiceLogData | null>(null);
  const [shortAnswerUserAnswers, setShortAnswerUserAnswers] = React.useState<
    Record<string, string>
  >({});
  const [shortAnswerLog, setShortAnswerLog] =
    React.useState<ShortAnswerLogData | null>(null);
  const [shortAnswerKeywordOpen, setShortAnswerKeywordOpen] = React.useState<
    Record<string, boolean>
  >({});
  const [shortAnswerGrading, setShortAnswerGrading] = React.useState(false);
  const [shortAnswerGradeError, setShortAnswerGradeError] = React.useState<
    string | null
  >(null);
  const [examSubmissionLoading, setExamSubmissionLoading] = React.useState(false);
  const [examSubmissionError, setExamSubmissionError] = React.useState<
    string | null
  >(null);
  const [examSubmissionResult, setExamSubmissionResult] =
    React.useState<ExamSubmissionResponse | null>(null);
  const [oxUserAnswers, setOxUserAnswers] = React.useState<
    Record<string, OxUserChoice>
  >({});
  const [oxGraded, setOxGraded] = React.useState(false);
  const [oxExamViewMode, setOxExamViewMode] =
    React.useState<ExamProblemViewMode>("all");
  const [fiveChoiceExamViewMode, setFiveChoiceExamViewMode] =
    React.useState<ExamProblemViewMode>("all");
  const [oxExamSingleIndex, setOxExamSingleIndex] = React.useState(0);
  const [fiveChoiceSingleIndex, setFiveChoiceSingleIndex] =
    React.useState(0);
  const [examProfile, setExamProfile] = React.useState<ExamUserProfile | null>(
    null,
  );
  const [examProfileStatus, setExamProfileStatus] = React.useState<
    "IDLE" | "INCOMPLETE" | "COMPLETE"
  >("IDLE");
  const [lectureResourcesLoading, setLectureResourcesLoading] =
    React.useState(false);
  const [internalLectureEditMode, setInternalLectureEditMode] =
    React.useState(false);
  const lectureEditMode = externalLectureEditMode ?? internalLectureEditMode;
  const setLectureEditMode = onLectureEditModeChange ?? setInternalLectureEditMode;
  // 기존 코드 경로와 호환: bulkEditMode = 강의(주차) 편집 모드
  const bulkEditMode = lectureEditMode;
  const setBulkEditMode = setLectureEditMode;
  /** 교사 강의 상세: 메인 영역 = 자료 목록 | 학생 관리 */
  const [teacherMainPanel, setTeacherMainPanel] = React.useState<
    | "materials"
    | "studentManagement"
	    | "attendance"
	    | "notices"
	    | "discussions"
	    | "classroomReport"
  >("materials");
  const [weekBoardTab, setWeekBoardTab] = React.useState<
    "notices" | "discussions" | null
  >(null);
  /** 강의실 목록에서 수정/삭제 모드 (버튼 1개로 토글) */
  const [courseListEditMode, setCourseListEditMode] = React.useState(false);
  const [bulkSelectedCourseIds, setBulkSelectedCourseIds] = React.useState<
    Record<number, boolean>
  >({});
  const [selectedCenterItemIds, setSelectedCenterItemIds] = React.useState<
    Record<string, boolean>
  >({});
  const [resourceEditMode, setResourceEditMode] = React.useState(false);
  const [activeResourceActionItemId, setActiveResourceActionItemId] =
    React.useState<string | null>(null);
  const [courseContentsLoaded, setCourseContentsLoaded] = React.useState(false);
  React.useEffect(() => {
    if (teacherMainPanel !== "materials") {
      setWeekBoardTab(null);
    }
  }, [teacherMainPanel]);
  React.useEffect(() => {
    setWeekBoardTab(null);
  }, [selectedLectureId]);
  const [studentReportModalOpen, setStudentReportModalOpen] = React.useState(false);
  const [studentReportSearchInput, setStudentReportSearchInput] = React.useState("");
  const [studentReportQuery, setStudentReportQuery] = React.useState("");
  const [studentReportStatus, setStudentReportStatus] =
    React.useState<StudentReportStatusFilter>("all");
  const [studentReportPage, setStudentReportPage] = React.useState(0);
  const [studentReportList, setStudentReportList] =
    React.useState<PageResponse<StudentReportListItem> | null>(null);
  const [studentReportListLoading, setStudentReportListLoading] =
    React.useState(false);
  const [studentReportListError, setStudentReportListError] = React.useState<string | null>(
    null,
  );
  const [selectedStudentReportId, setSelectedStudentReportId] = React.useState<number | null>(
    null,
  );
  const [studentReportDetail, setStudentReportDetail] =
    React.useState<StudentReportDetailResponse | null>(null);
  const [studentReportDetailLoading, setStudentReportDetailLoading] =
    React.useState(false);
  const [studentReportDetailError, setStudentReportDetailError] =
    React.useState<string | null>(null);
  const [studentReportModalTab, setStudentReportModalTab] = React.useState<
    "students" | "classroom"
  >("students");
  const [classroomReport, setClassroomReport] = React.useState<
    ClassroomReportResponse | null | undefined
  >(undefined);
  const [classroomReportLoading, setClassroomReportLoading] = React.useState(false);
  const [classroomReportError, setClassroomReportError] = React.useState<string | null>(null);
  const [classroomAnalyzeSyncLoading, setClassroomAnalyzeSyncLoading] =
    React.useState(false);
  const [classroomAnalyzeStreaming, setClassroomAnalyzeStreaming] = React.useState(false);
  const [classroomStreamBuffer, setClassroomStreamBuffer] = React.useState("");
  const [reportCriteriaCount, setReportCriteriaCount] = React.useState<number | null>(null);
  const [studentAiContext, setStudentAiContext] =
    React.useState<StudentReportAiContextResponse | null>(null);
  const [studentAiContextLoading, setStudentAiContextLoading] = React.useState(false);
  const [studentAiContextError, setStudentAiContextError] = React.useState<string | null>(null);
  const [reportChatMessages, setReportChatMessages] = React.useState<
    { id: string; role: "user" | "assistant"; text: string }[]
  >([]);
  const [reportChatInput, setReportChatInput] = React.useState("");
  const [reportChatSending, setReportChatSending] = React.useState(false);
  const reportChatAbortRef = React.useRef<AbortController | null>(null);

  React.useLayoutEffect(() => {
    const isResourceDocPreview =
      (previewFileUrl != null || previewMaterialId != null) &&
      examDetailSessionId == null;
    if (!isResourceDocPreview) return;
    const id = requestAnimationFrame(() => {
      const w = resourcePreviewChatPanelRef.current?.getBoundingClientRect().width;
      if (w != null && Number.isFinite(w) && w > 0) {
        lastResourcePreviewSidebarWidthRef.current = Math.round(w);
      }
    });
    return () => cancelAnimationFrame(id);
  }, [previewFileUrl, previewMaterialId, examDetailSessionId, resourcePreviewViewerWidthPx]);

  const patchResourceInUrl = React.useCallback(
    (opts: { material?: number | null; gen?: number | null }) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          // 리소스/시험 URL 변경 시에도 현재 강의(주차) query는 항상 유지
          if (selectedLectureId != null) {
            next.set("lecture", String(selectedLectureId));
          }
          next.delete("exam");
          if (opts.material != null) {
            next.set("material", String(opts.material));
            next.delete("gen");
          } else if (opts.gen != null) {
            next.set("gen", String(opts.gen));
            next.delete("material");
          } else {
            next.delete("material");
            next.delete("gen");
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams, selectedLectureId],
  );

  const clearResourceParamsInUrl = React.useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (selectedLectureId != null) {
          next.set("lecture", String(selectedLectureId));
        }
        next.delete("material");
        next.delete("gen");
        next.delete("exam");
        return next;
      },
      { replace: true },
    );
  }, [setSearchParams, selectedLectureId]);

  const sortedCourses = React.useMemo(() => {
    if (courseListSortOrder !== "name") return courses;
    return [...courses].sort((a, b) => (a.title ?? "").localeCompare(b.title ?? ""));
  }, [courses, courseListSortOrder]);
  const classroomReportPageOpen = isTeacher && teacherMainPanel === "classroomReport";
  const studentReportWorkspaceOpen = studentReportModalOpen || classroomReportPageOpen;
  const studentReportListVisible =
    classroomReportPageOpen ||
    (studentReportModalOpen && studentReportModalTab === "students");
  const classroomReportVisible =
    classroomReportPageOpen ||
    (studentReportModalOpen && studentReportModalTab === "classroom");
  const studentReportDashboardStats = React.useMemo(() => {
    const rows = studentReportList?.content ?? [];
    const needsAttention = rows.filter(
      (item) => String(item.reportStatus).toLowerCase() === "needs_attention",
    ).length;
    const insufficient = rows.filter(
      (item) => String(item.reportStatus).toLowerCase() === "insufficient_data",
    ).length;
    return [
      {
        label: "참여 학생",
        value: `${studentReportList?.totalElements ?? rows.length}명`,
        helper: "리포트 대상",
        icon: "users",
      },
      {
        label: "선택 학생",
        value: selectedStudentReportId != null ? "1명" : "0명",
        helper: "상세 분석",
        icon: "selected",
      },
      {
        label: "주의 필요",
        value: `${needsAttention}명`,
        helper: "현재 목록 기준",
        icon: "alert",
      },
      {
        label: "데이터 부족",
        value: `${insufficient}명`,
        helper: "현재 목록 기준",
        icon: "missing",
      },
    ];
  }, [selectedStudentReportId, studentReportList]);
  const selectedStudentReportSummary = React.useMemo(
    () =>
      (studentReportList?.content ?? []).find(
        (item) => item.studentId === selectedStudentReportId,
      ),
    [selectedStudentReportId, studentReportList],
  );
  const loadStudentReportList = React.useCallback(async () => {
    if (!studentReportListVisible || courseDetail?.courseId == null) return;
    setStudentReportListLoading(true);
    setStudentReportListError(null);
    try {
      const response = await studentReportApi.getStudentReports(courseDetail.courseId, {
        page: studentReportPage,
        size: 20,
        sort: "name,asc",
        q: studentReportQuery || undefined,
        status: studentReportStatus,
      });
      const safe = {
        ...response,
        content: Array.isArray(response.content) ? response.content : [],
      };
      setStudentReportList(safe);
      setSelectedStudentReportId((prev) => {
        if (prev != null && safe.content.some((item) => item.studentId === prev)) {
          return prev;
        }
        return safe.content[0]?.studentId ?? null;
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "학생 리포트 목록을 불러오지 못했습니다.";
      setStudentReportListError(message);
      setStudentReportList(null);
      setSelectedStudentReportId(null);
    } finally {
      setStudentReportListLoading(false);
    }
  }, [
    courseDetail?.courseId,
    studentReportListVisible,
    studentReportPage,
    studentReportQuery,
    studentReportStatus,
  ]);

  React.useEffect(() => {
    void loadStudentReportList();
  }, [loadStudentReportList]);

  React.useEffect(() => {
    if (!classroomReportPageOpen || courseDetail?.courseId == null) {
      setReportCriteriaCount(null);
      return;
    }
    let cancelled = false;
    void reportCriteriaApi
      .listCriteria(courseDetail.courseId)
      .then((items) => {
        if (!cancelled) setReportCriteriaCount(items.length);
      })
      .catch(() => {
        if (!cancelled) setReportCriteriaCount(null);
      });
    return () => {
      cancelled = true;
    };
  }, [classroomReportPageOpen, courseDetail?.courseId]);

  React.useEffect(() => {
    if (
      !studentReportListVisible ||
      courseDetail?.courseId == null ||
      selectedStudentReportId == null
    ) {
      setStudentReportDetail(null);
      setStudentReportDetailError(null);
      return;
    }
    let cancelled = false;
    setStudentReportDetailLoading(true);
    setStudentReportDetailError(null);
    void studentReportApi
      .getStudentReportDetail(courseDetail.courseId, selectedStudentReportId)
      .then((detail) => {
        if (!cancelled) {
          setStudentReportDetail(detail);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setStudentReportDetail(null);
          setStudentReportDetailError(
            error instanceof Error
              ? error.message
              : "학생 리포트 상세를 불러오지 못했습니다.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setStudentReportDetailLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    courseDetail?.courseId,
    selectedStudentReportId,
    studentReportListVisible,
  ]);

  React.useEffect(() => {
    if (!classroomReportVisible || courseDetail?.courseId == null) {
      return;
    }
    let cancelled = false;
    setClassroomReportLoading(true);
    setClassroomReportError(null);
    void studentReportApi
      .getClassroomReport(courseDetail.courseId)
      .then((r) => {
        if (!cancelled) setClassroomReport(r);
      })
      .catch((e) => {
        if (!cancelled) {
          setClassroomReportError(e instanceof Error ? e.message : "강의실 리포트를 불러오지 못했습니다.");
          setClassroomReport(undefined);
        }
      })
      .finally(() => {
      if (!cancelled) setClassroomReportLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [
    classroomReportVisible,
    courseDetail?.courseId,
  ]);

  React.useEffect(() => {
    if (!studentReportListVisible || courseDetail?.courseId == null) return;
    if (selectedStudentReportId == null) {
      setStudentAiContext(null);
      setStudentAiContextError(null);
      setStudentAiContextLoading(false);
      return;
    }
    let cancelled = false;
    setStudentAiContextLoading(true);
    setStudentAiContextError(null);
    void studentReportApi
      .getStudentAiContext(courseDetail.courseId, selectedStudentReportId)
      .then((ctx) => {
        if (!cancelled) setStudentAiContext(ctx);
      })
      .catch((e) => {
        if (!cancelled) {
          setStudentAiContext(null);
          setStudentAiContextError(
            e instanceof Error ? e.message : "AI 분석용 컨텍스트를 불러오지 못했습니다.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setStudentAiContextLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    studentReportListVisible,
    courseDetail?.courseId,
    selectedStudentReportId,
  ]);

  React.useEffect(() => {
    setReportChatMessages([]);
    setReportChatInput("");
    reportChatAbortRef.current?.abort();
    reportChatAbortRef.current = null;
  }, [selectedStudentReportId]);

  React.useEffect(() => {
    if (studentReportWorkspaceOpen) return;
    setStudentReportModalTab("students");
    setClassroomReport(undefined);
    setClassroomReportError(null);
    setClassroomStreamBuffer("");
    setClassroomAnalyzeStreaming(false);
    setClassroomAnalyzeSyncLoading(false);
    setStudentAiContext(null);
    setStudentAiContextError(null);
    setReportChatMessages([]);
    setReportChatInput("");
    reportChatAbortRef.current?.abort();
    reportChatAbortRef.current = null;
  }, [studentReportWorkspaceOpen]);

  const submitStudentReportChatQuestion = React.useCallback(async () => {
    const question = reportChatInput.trim();
    if (
      !question ||
      courseDetail?.courseId == null ||
      selectedStudentReportId == null ||
      reportChatSending
    ) {
      return;
    }

    const userMessageId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `u-${Date.now()}`;
    const assistantMessageId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `a-${Date.now()}`;
    const historyPayload = reportChatMessages.map((message) =>
      message.role === "user"
        ? { role: "user", content: message.text }
        : { role: "assistant", content: message.text },
    );

    setReportChatInput("");
    setReportChatMessages((prev) => [
      ...prev,
      { id: userMessageId, role: "user", text: question },
      { id: assistantMessageId, role: "assistant", text: "" },
    ]);
    setReportChatSending(true);
    const abortController = new AbortController();
    reportChatAbortRef.current = abortController;

    try {
      const finalText = await studentReportApi.streamStudentReportChat(
        courseDetail.courseId,
        selectedStudentReportId,
        {
          question,
          messages: historyPayload.length > 0 ? historyPayload : undefined,
        },
        {
          signal: abortController.signal,
          onDelta: (chunk) => {
            setReportChatMessages((prev) =>
              prev.map((row) =>
                row.id === assistantMessageId
                  ? { ...row, text: row.text + chunk }
                  : row,
              ),
            );
          },
        },
      );
      setReportChatMessages((prev) =>
        prev.map((row) =>
          row.id === assistantMessageId
            ? { ...row, text: finalText.trim() ? finalText : row.text }
            : row,
        ),
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "챗봇 응답을 받지 못했습니다.";
      setReportChatMessages((prev) =>
        prev.map((row) =>
          row.id === assistantMessageId
            ? { ...row, text: `오류: ${message}` }
            : row,
        ),
      );
    } finally {
      setReportChatSending(false);
      reportChatAbortRef.current = null;
    }
  }, [
    courseDetail?.courseId,
    selectedStudentReportId,
    reportChatInput,
    reportChatMessages,
    reportChatSending,
  ]);

  const renderClassroomReportPage = () => {
    if (!courseDetail) return null;
    const selectedStudent =
      studentReportDetail ?? selectedStudentReportSummary ?? null;
    const selectedName =
      selectedStudent?.name ||
      (selectedStudentReportId != null ? `학생 ${selectedStudentReportId}` : "학생 선택");
    const selectedEmail = selectedStudent?.email;
    const selectedLatest =
      studentReportDetail?.latestActivityAt ??
      selectedStudentReportSummary?.latestActivityAt;
    const competencies = studentReportDetail?.competencies ?? [];
    const score = clampReportScore(
      studentReportDetail?.averageScorePercent ??
        selectedStudentReportSummary?.averageScorePercent,
    );
    const submittedCount = studentAiContext?.activitySummary?.submittedCount;
    const totalAssessments = studentAiContext?.activitySummary?.totalAssessments;
    const missingCount = studentAiContext?.activitySummary?.missingCount;
    const scoreTrend = studentAiContext?.scoreSummary?.trend;
    const summaryLines = compactReportLines(
      studentReportDetail?.narrativeReport,
      "선택한 학생의 리포트 본문이 아직 없습니다.",
    );
    const strongCompetencies = competencies
      .filter((item) => clampReportScore(item.scorePercent) >= 70)
      .slice(0, 3);
    const weakCompetencies = competencies
      .filter((item) => clampReportScore(item.scorePercent) < 50)
      .slice(0, 3);
    const baseCriteriaCount =
      reportCriteriaCount ?? (competencies.length > 0 ? competencies.length : 0);
    const cardClass = `rounded-[var(--app-control-radius)] border ${
      isDarkMode
        ? "border-[#2b2b2b] bg-[#202020]"
        : "border-[#dedbd5] bg-white"
    }`;
    const softCardClass = `rounded-[var(--app-control-radius)] border ${
      isDarkMode
        ? "border-[#343434] bg-[#242424]"
        : "border-[#e8e1d8] bg-[#fbfaf7]"
    }`;
    const mutedText = isDarkMode ? "text-gray-400" : "text-gray-500";
    const buttonClass = `rounded-[var(--app-control-radius)] border px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50 ${
      isDarkMode
        ? "border-[#3a3a3a] text-gray-200 hover:bg-white/10"
        : "border-[#dedbd5] text-gray-700 hover:bg-[#f7f5f1]"
    }`;
    const primaryButtonClass =
      "rounded-[var(--app-control-radius)] bg-[#ff824d] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#f26f37] disabled:opacity-50";

    const refreshClassroomReport = () => {
      if (courseDetail?.courseId == null) return;
      setClassroomReportLoading(true);
      setClassroomReportError(null);
      void studentReportApi
        .getClassroomReport(courseDetail.courseId)
        .then((report) => setClassroomReport(report))
        .catch((error) => {
          setClassroomReportError(
            error instanceof Error
              ? error.message
              : "강의실 리포트를 불러오지 못했습니다.",
          );
          setClassroomReport(undefined);
        })
        .finally(() => setClassroomReportLoading(false));
    };

    const refreshSelectedStudentReport = () => {
      if (courseDetail?.courseId == null || selectedStudentReportId == null) return;
      setStudentReportDetailLoading(true);
      setStudentReportDetailError(null);
      void Promise.all([
        studentReportApi.getStudentReportDetail(
          courseDetail.courseId,
          selectedStudentReportId,
        ),
        studentReportApi.getStudentAiContext(
          courseDetail.courseId,
          selectedStudentReportId,
        ),
      ])
        .then(([detail, context]) => {
          setStudentReportDetail(detail);
          setStudentAiContext(context);
          void loadStudentReportList();
        })
        .catch((error) => {
          setStudentReportDetailError(
            error instanceof Error
              ? error.message
              : "학생 리포트를 다시 불러오지 못했습니다.",
          );
        })
        .finally(() => setStudentReportDetailLoading(false));
    };

    const runClassroomAnalyze = (stream: boolean) => {
      if (courseDetail?.courseId == null) return;
      setClassroomReportError(null);
      if (stream) {
        setClassroomAnalyzeStreaming(true);
        setClassroomStreamBuffer("");
        void (async () => {
          try {
            await studentReportApi.streamClassroomAnalyze(courseDetail.courseId, {
              onDelta: (chunk) => setClassroomStreamBuffer((prev) => prev + chunk),
            });
            const report = await studentReportApi.getClassroomReport(
              courseDetail.courseId,
            );
            setClassroomReport(report);
          } catch (error) {
            setClassroomReportError(
              error instanceof Error
                ? error.message
                : "스트리밍 분석에 실패했습니다.",
            );
          } finally {
            setClassroomAnalyzeStreaming(false);
          }
        })();
        return;
      }

      setClassroomAnalyzeSyncLoading(true);
      void (async () => {
        try {
          await studentReportApi.analyzeClassroomSync(courseDetail.courseId);
          const report = await studentReportApi.getClassroomReport(
            courseDetail.courseId,
          );
          setClassroomReport(report);
        } catch (error) {
          setClassroomReportError(
            error instanceof Error ? error.message : "종합 분석에 실패했습니다.",
          );
        } finally {
          setClassroomAnalyzeSyncLoading(false);
        }
      })();
    };

    return (
      <div className="mx-auto flex w-full max-w-[76rem] flex-col gap-3 pb-6">
        <button
          type="button"
          onClick={() => setTeacherMainPanel("materials")}
          className={`self-start text-xs font-semibold ${
            isDarkMode ? "text-gray-300 hover:text-white" : "text-gray-600 hover:text-gray-950"
          }`}
        >
          ← 강의실로 돌아가기
        </button>

        <section
          className={`${cardClass} relative overflow-hidden px-5 py-5`}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                  isDarkMode
                    ? "bg-white/10 text-gray-200"
                    : "bg-[#fff1e8] text-[#c95018]"
                }`}
              >
                리포트 생성
              </span>
              <h2 className="mt-3 text-2xl font-semibold leading-tight">
                {courseDetail?.title ?? "강의실"} 학생별 역량 리포트
              </h2>
              <p className={`mt-2 text-sm ${mutedText}`}>
                참여 학생을 선택하면 학습 지표, 리포트 본문, AI context 기반 챗봇을 한 화면에서 확인합니다.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                ["기본 항목", `${baseCriteriaCount}개`],
                ["추가 항목", "0개"],
                ["분석 기준", classroomAnalyzeStreaming ? "반영 중" : "적용 중"],
              ].map(([label, value]) => (
                <div key={label} className={`${softCardClass} min-w-[7rem] px-4 py-3`}>
                  <p className={`text-xs font-semibold ${mutedText}`}>{label}</p>
                  <p className="mt-1 text-xl font-semibold">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={`${cardClass} px-4 py-3`}>
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <span className="font-semibold">선택 학생</span>
              <span className="font-semibold">{selectedName}</span>
              {selectedEmail ? <span className={mutedText}>{selectedEmail}</span> : null}
              <span className={mutedText}>
                마지막 저장 {formatActivityMonthForKo(selectedLatest)}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void loadStudentReportList()}
                disabled={studentReportListLoading}
                className={buttonClass}
              >
                학생 목록 새로고침
              </button>
              <button
                type="button"
                onClick={refreshSelectedStudentReport}
                disabled={selectedStudentReportId == null || studentReportDetailLoading}
                className={primaryButtonClass}
              >
                선택 학생 새로고침
              </button>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-[minmax(0,1fr)_10rem_9rem]">
            <input
              type="text"
              value={studentReportSearchInput}
              onChange={(event) => setStudentReportSearchInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  setStudentReportPage(0);
                  setStudentReportQuery(studentReportSearchInput.trim());
                }
              }}
              placeholder="학생 이름 검색"
              className={`rounded-[var(--app-control-radius)] border px-3 py-2 text-sm outline-none ${
                isDarkMode
                  ? "border-[#343434] bg-[#181818] text-white placeholder:text-gray-500"
                  : "border-[#dedbd5] bg-white text-[#212121] placeholder:text-gray-400"
              }`}
            />
            <select
              value={studentReportStatus}
              onChange={(event) => {
                setStudentReportPage(0);
                setStudentReportStatus(event.target.value as StudentReportStatusFilter);
              }}
              className={`rounded-[var(--app-control-radius)] border px-3 py-2 text-sm outline-none ${
                isDarkMode
                  ? "border-[#343434] bg-[#181818] text-white"
                  : "border-[#dedbd5] bg-white text-[#212121]"
              }`}
            >
              {STUDENT_REPORT_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                setStudentReportPage(0);
                setStudentReportQuery(studentReportSearchInput.trim());
              }}
              className={primaryButtonClass}
            >
              검색
            </button>
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {studentReportListLoading ? (
              <span className={`text-sm ${mutedText}`}>학생 리포트를 불러오는 중...</span>
            ) : studentReportList?.content?.length ? (
              studentReportList.content.map((student) => {
                const active = selectedStudentReportId === student.studentId;
                return (
                  <button
                    key={student.studentId}
                    type="button"
                    onClick={() => setSelectedStudentReportId(student.studentId)}
                    className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      active
                        ? "border-[#ff824d] bg-[#ff824d] text-white"
                        : isDarkMode
                          ? "border-[#343434] bg-[#181818] text-gray-200 hover:bg-[#252525]"
                          : "border-[#dedbd5] bg-white text-gray-700 hover:bg-[#f7f5f1]"
                    }`}
                  >
                    {student.name || `학생 ${student.studentId}`} ·{" "}
                    {studentReportStatusLabel(String(student.reportStatus))}
                  </button>
                );
              })
            ) : (
              <span className={`text-sm ${mutedText}`}>표시할 학생이 없습니다.</span>
            )}
          </div>
          {studentReportList && studentReportList.totalPages > 1 ? (
            <div className="mt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={studentReportList.first}
                onClick={() => setStudentReportPage((prev) => Math.max(0, prev - 1))}
                className={buttonClass}
              >
                이전
              </button>
              <span className={`text-xs ${mutedText}`}>
                {studentReportList.page + 1} / {studentReportList.totalPages}
              </span>
              <button
                type="button"
                disabled={studentReportList.last}
                onClick={() =>
                  setStudentReportPage((prev) =>
                    Math.min(studentReportList.totalPages - 1, prev + 1),
                  )
                }
                className={buttonClass}
              >
                다음
              </button>
            </div>
          ) : null}
        </section>

        {studentReportListError ? (
          <p className={`text-sm ${isDarkMode ? "text-red-300" : "text-red-600"}`}>
            {studentReportListError}
          </p>
        ) : null}

        <section className={`${cardClass} px-5 py-5`}>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_10rem] lg:items-center">
            <div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-[#ff824d] px-3 py-1 text-xs font-semibold text-white">
                  {studentReportStatusLabel(String(studentReportDetail?.reportStatus ?? selectedStudentReportSummary?.reportStatus ?? "all"))}
                </span>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  isDarkMode ? "bg-white/10 text-gray-200" : "bg-[#fff1e8] text-[#c95018]"
                }`}>
                  리포트 점검
                </span>
                {scoreTrend ? (
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    isDarkMode ? "bg-white/10 text-gray-200" : "bg-[#f4f1eb] text-gray-700"
                  }`}>
                    {scoreTrend}
                  </span>
                ) : null}
              </div>
              <h3 className="mt-3 text-2xl font-semibold leading-snug">
                {score < 50
                  ? "기초 체력을 올리면서 약점 개념을 좁혀가야 하는 구간입니다."
                  : score < 75
                    ? "핵심 개념은 잡혀 있으나 보완 학습이 필요한 구간입니다."
                    : "학습 흐름이 안정적이며 심화 적용을 시도할 수 있습니다."}
              </h3>
              <p className={`mt-2 text-sm ${mutedText}`}>
                현재 데이터와 리포트 기준을 바탕으로 학생의 강점과 보완 포인트를 요약했습니다.
              </p>
            </div>
            <div className="flex items-center justify-center">
              <div
                className="flex h-28 w-28 items-center justify-center rounded-full"
                style={{
                  background: `conic-gradient(#ff824d ${score * 3.6}deg, ${
                    isDarkMode ? "#343434" : "#e8e1d8"
                  } 0deg)`,
                }}
              >
                <div
                  className={`flex h-20 w-20 flex-col items-center justify-center rounded-full ${
                    isDarkMode ? "bg-[#202020]" : "bg-white"
                  }`}
                >
                  <span className="text-2xl font-semibold">{score}</span>
                  <span className={`text-[11px] font-semibold ${mutedText}`}>종합 점수</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
            {[
              ["강의", `${selectedStudentReportSummary?.courseProgressPercent != null ? formatReportPercent(selectedStudentReportSummary.courseProgressPercent) : "-"}`],
              ["질문", formatReportCount(reportChatMessages.length, "건")],
              ["제출 체크", `${submittedCount ?? "-"}건`],
              ["평균 점수", formatReportPercent(studentReportDetail?.averageScorePercent ?? selectedStudentReportSummary?.averageScorePercent)],
              ["고사 시험", formatReportCount(selectedStudentReportSummary?.examAttemptCount)],
              ["미제출", `${missingCount ?? "-"}건`],
            ].map(([label, value]) => (
              <div key={label} className={`${softCardClass} px-4 py-3`}>
                <p className={`text-xs font-semibold ${mutedText}`}>{label}</p>
                <p className="mt-1 text-xl font-semibold">{value}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="grid gap-3 lg:grid-cols-2">
          <section className={`${cardClass} px-5 py-4`}>
            <h3 className="text-base font-semibold">핵심 요약</h3>
            {studentReportDetailLoading ? (
              <p className={`mt-3 text-sm ${mutedText}`}>학생 상세 리포트를 불러오는 중...</p>
            ) : studentReportDetailError ? (
              <p className={`mt-3 text-sm ${isDarkMode ? "text-red-300" : "text-red-600"}`}>
                {studentReportDetailError}
              </p>
            ) : (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6">
                {summaryLines.map((line, index) => (
                  <li key={`${line}-${index}`}>{line}</li>
                ))}
              </ul>
            )}
          </section>

          <section className={`${cardClass} px-5 py-4`}>
            <h3 className="text-base font-semibold">두드러진 역량</h3>
            <div className="mt-3 space-y-3">
              {(strongCompetencies.length ? strongCompetencies : competencies.slice(0, 3)).map((competency) => (
                <div key={competency.competencyName} className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold">{competency.competencyName}</p>
                    <p className={`mt-1 text-xs ${mutedText}`}>
                      {competency.feedback || "세부 피드백 데이터가 더 쌓이면 정밀도가 올라갑니다."}
                    </p>
                  </div>
                  <span className="text-xl font-semibold">
                    {competency.scorePercent != null
                      ? clampReportScore(competency.scorePercent)
                      : competency.level || "-"}
                  </span>
                </div>
              ))}
              {!competencies.length ? (
                <p className={`text-sm ${mutedText}`}>표시할 역량 데이터가 없습니다.</p>
              ) : null}
            </div>
          </section>
        </div>

        <section className={`${cardClass} px-5 py-4`}>
          <h3 className="text-base font-semibold">
            {competencies.length || baseCriteriaCount || 0}개 역량 체크리스트
          </h3>
          <p className={`mt-1 text-sm ${mutedText}`}>
            세션, 퀴즈, 피드백 데이터를 종합해 항목별 점수를 표시합니다.
          </p>
          <div className="mt-4 space-y-3">
            {competencies.length ? (
              competencies.map((competency) => {
                const percent = clampReportScore(competency.scorePercent);
                return (
                  <article key={competency.competencyName} className={`${softCardClass} px-4 py-3`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold">{competency.competencyName}</h4>
                        <p className={`mt-1 text-xs leading-5 ${mutedText}`}>
                          {competency.feedback || "아직 충분한 피드백 데이터가 없습니다."}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-2xl font-semibold">
                          {competency.scorePercent != null ? percent : "-"}
                        </p>
                        <p className={`text-[11px] font-semibold ${mutedText}`}>
                          {competency.level || "유지"}
                        </p>
                      </div>
                    </div>
                    <div
                      className={`mt-3 h-2 rounded-full ${
                        isDarkMode ? "bg-[#343434]" : "bg-[#e8e1d8]"
                      }`}
                    >
                      <div
                        className="h-full rounded-full bg-[#ff824d]"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </article>
                );
              })
            ) : (
              <div className={`rounded-[var(--app-control-radius)] border border-dashed px-4 py-8 text-center text-sm ${mutedText}`}>
                학생을 선택하거나 분석 데이터가 생성되면 역량 체크리스트가 표시됩니다.
              </div>
            )}
          </div>
        </section>

        <div className="grid gap-3 lg:grid-cols-2">
          <section className={`${cardClass} px-5 py-4`}>
            <h3 className="text-base font-semibold">강점</h3>
            <p className={`mt-3 text-sm ${mutedText}`}>
              {strongCompetencies.length
                ? strongCompetencies.map((item) => item.competencyName).join(", ")
                : selectedStudentReportSummary?.topStrengthLabel || "아직 충분한 강점 근거가 없습니다."}
            </p>
          </section>
          <section className={`${cardClass} px-5 py-4`}>
            <h3 className="text-base font-semibold">보완 포인트</h3>
            <p className={`mt-3 text-sm ${mutedText}`}>
              {weakCompetencies.length
                ? weakCompetencies.map((item) => item.competencyName).join(", ")
                : selectedStudentReportSummary?.topImprovementLabel || "아직 뚜렷한 보완 포인트가 없습니다."}
            </p>
          </section>
          <section className={`${cardClass} px-5 py-4`}>
            <h3 className="text-base font-semibold">코칭 인사이트</h3>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6">
              {(classroomReport?.coachingPriorities?.length
                ? classroomReport.coachingPriorities.map(reportInsightPrimaryText)
                : summaryLines
              )
                .slice(0, 3)
                .map((item, index) => (
                  <li key={`${item}-${index}`}>{item}</li>
                ))}
            </ul>
          </section>
          <section className={`${cardClass} px-5 py-4`}>
            <h3 className="text-base font-semibold">추천 액션</h3>
            <div className="mt-3 divide-y divide-current/10 text-sm">
              {[
                ["약점 개념 점검", weakCompetencies[0]?.competencyName || "핵심 개념 복습"],
                ["짧은 퀴즈 재투입", "오답 유형을 기준으로 미니 퀴즈를 제공합니다."],
                ["질문 로그 유지", "학습 중 막힌 부분을 그대로 남기도록 안내합니다."],
              ].map(([title, body]) => (
                <div key={title} className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3 py-2">
                  <span className="font-semibold">{title}</span>
                  <span className={mutedText}>{body}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className={`${cardClass} px-5 py-4`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-base font-semibold">강의실 학습 흐름</h3>
              <p className={`mt-1 text-sm ${mutedText}`}>
                선택한 학생과 강의실 전체 리포트를 함께 보면 코칭 우선순위를 정하기 쉽습니다.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={refreshClassroomReport}
                disabled={classroomReportLoading || classroomAnalyzeSyncLoading || classroomAnalyzeStreaming}
                className={buttonClass}
              >
                <RefreshIcon className={`inline h-3.5 w-3.5 ${classroomReportLoading ? "animate-spin" : ""}`} />
                <span className="ml-1">새로고침</span>
              </button>
              <button
                type="button"
                onClick={() => runClassroomAnalyze(false)}
                disabled={classroomAnalyzeSyncLoading || classroomAnalyzeStreaming || classroomReportLoading}
                className={primaryButtonClass}
              >
                {classroomAnalyzeSyncLoading ? "분석 중..." : "종합분석"}
              </button>
              <button
                type="button"
                onClick={() => runClassroomAnalyze(true)}
                disabled={classroomAnalyzeSyncLoading || classroomAnalyzeStreaming || classroomReportLoading}
                className={primaryButtonClass}
              >
                {classroomAnalyzeStreaming ? "수신 중..." : "스트리밍 분석"}
              </button>
            </div>
          </div>
          {classroomReportError ? (
            <p className={`mt-3 text-sm ${isDarkMode ? "text-red-300" : "text-red-600"}`}>
              {classroomReportError}
            </p>
          ) : null}
          <div className={`mt-4 rounded-[var(--app-control-radius)] border p-4 text-sm prose prose-sm max-w-none dark:prose-invert ${
            isDarkMode ? "border-[#343434] bg-[#242424]" : "border-[#e8e1d8] bg-[#fbfaf7]"
          }`}>
            {classroomReportLoading ? (
              <span className={mutedText}>강의실 종합 리포트를 불러오는 중...</span>
            ) : classroomReport?.summaryMarkdown?.trim() ? (
              <MarkdownContent>{classroomReport.summaryMarkdown}</MarkdownContent>
            ) : (
              <span className={mutedText}>
                아직 생성된 강의실 종합 리포트가 없습니다. 종합분석을 실행해 보세요.
              </span>
            )}
          </div>
          {classroomStreamBuffer.trim() ? (
            <details className={`${softCardClass} mt-3 text-sm`}>
              <summary className="cursor-pointer px-3 py-2 font-semibold">스트리밍 로그</summary>
              <pre className="max-h-52 overflow-auto whitespace-pre-wrap px-3 pb-3 text-xs opacity-80">
                {classroomStreamBuffer}
              </pre>
            </details>
          ) : null}
        </section>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <ReportCriteriaPanel
            courseId={courseDetail.courseId}
            isDarkMode={isDarkMode}
          />
          <section className={`${cardClass} flex min-h-[28rem] flex-col`}>
            <div className="border-b border-inherit px-4 py-3">
              <h3 className="text-base font-semibold">학생 리포트 챗봇</h3>
              <p className={`mt-1 text-xs ${mutedText}`}>
                선택 학생의 리포트와 AI context를 기반으로 질문합니다.
              </p>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              {reportChatMessages.length === 0 ? (
                <div className={`flex h-full items-center justify-center px-4 text-center text-sm ${mutedText}`}>
                  예: 이 학생의 보완점과 다음 학습 우선순위를 알려줘.
                </div>
              ) : (
                reportChatMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[84%] rounded-[var(--app-control-radius)] px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                        message.role === "user"
                          ? "bg-[#ff824d] text-white"
                          : isDarkMode
                            ? "border border-[#343434] bg-[#181818] text-gray-100"
                            : "border border-[#dedbd5] bg-white text-[#212121]"
                      }`}
                    >
                      <p className="mb-1 text-[11px] font-semibold opacity-70">
                        {message.role === "user" ? "나" : "AI Tutor"}
                      </p>
                      {message.text || (message.role === "assistant" ? "응답 생성 중..." : "")}
                    </div>
                  </div>
                ))
              )}
            </div>
            <form
              className="flex shrink-0 gap-2 border-t border-inherit p-3"
              onSubmit={(event) => {
                event.preventDefault();
                void submitStudentReportChatQuestion();
              }}
            >
              <input
                type="text"
                value={reportChatInput}
                onChange={(event) => setReportChatInput(event.target.value)}
                disabled={reportChatSending || selectedStudentReportId == null || !studentReportDetail}
                placeholder={
                  selectedStudentReportId == null
                    ? "학생을 먼저 선택하세요"
                    : "리포트에 대해 질문하세요"
                }
                className={`min-w-0 flex-1 rounded-[var(--app-control-radius)] border px-3 py-2 text-sm outline-none ${
                  isDarkMode
                    ? "border-[#343434] bg-[#181818] text-white placeholder:text-gray-500"
                    : "border-[#dedbd5] bg-white text-[#212121] placeholder:text-gray-400"
                } disabled:opacity-50`}
              />
              {reportChatSending ? (
                <button
                  type="button"
                  onClick={() => reportChatAbortRef.current?.abort()}
                  className={buttonClass}
                >
                  중지
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!reportChatInput.trim() || selectedStudentReportId == null || !studentReportDetail}
                  className={primaryButtonClass}
                >
                  전송
                </button>
              )}
            </form>
          </section>
        </div>
      </div>
    );
  };

  const [examRecoverOpen, setExamRecoverOpen] = React.useState(false);
  const [examRecoverSelectedId, setExamRecoverSelectedId] = React.useState("");
  const [examEditMode, setExamEditMode] = React.useState(false);
  const [selectedExamIds, setSelectedExamIds] = React.useState<
    Record<string, boolean>
  >({});

  React.useEffect(() => {
    if (!rightSidebarExamMode) {
      setExamRecoverOpen(false);
      setExamRecoverSelectedId("");
      setExamEditMode(false);
      setSelectedExamIds({});
      setExamProfile(null);
      setExamProfileStatus("IDLE");
    }
  }, [rightSidebarExamMode]);

  // materialId로 PDF 미리보기 (GET /api/materials/{materialId}/file)
  React.useEffect(() => {
    if (previewMaterialId == null) {
      return;
    }
    setPreviewBlobUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setPreviewMarkdownContent(null);
    setPreviewLoading(true);
    setPreviewLoadError(false);
    setPreviewErrorMessage(null);
    let objectUrl: string | null = null;
    const id = previewMaterialId;
    const fileName = previewFileName;
    let ignore = false;
    materialApi
      .getMaterialFile(id)
      .then(async (blob) => {
        if (ignore) return;
        const type = (blob.type || "").toLowerCase();
        const isHtml =
          type.includes("text/html") || type.includes("application/xhtml");
        if (isHtml) {
          setPreviewLoadError(true);
          return;
        }
        // 마크다운 파일(.md)은 텍스트로 읽어 MarkdownContent로 렌더링
        const isMarkdown =
          type.includes("text/markdown") ||
          type.includes("text/x-markdown") ||
          (typeof fileName === "string" && /\.md$/i.test(fileName));
        if (isMarkdown) {
          const text = await blob.text();
          if (ignore) return;
          setPreviewMarkdownContent(text);
          setPreviewLoadError(false);
          setPreviewErrorMessage(null);
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        if (ignore) {
          URL.revokeObjectURL(objectUrl);
          objectUrl = null;
          return;
        }
        setPreviewBlobUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return objectUrl;
        });
      })
      .catch((e) => {
        if (ignore) return;
        setPreviewLoadError(true);
        setPreviewErrorMessage(e instanceof Error ? e.message : null);
      })
      .finally(() => {
        if (!ignore) setPreviewLoading(false);
      });
    return () => {
      ignore = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [previewMaterialId, previewRetryKey, previewFileName]);

  React.useEffect(() => {
    if (!previewFileUrl) {
      // materialId로 보는 중이면 blob 유지
      if (previewMaterialId == null) {
        setPreviewBlobUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return null;
        });
        setPreviewMarkdownContent(null);
        setPreviewLoadError(false);
        setPreviewErrorMessage(null);
      }
      return;
    }

    // materialId 기반 미리보기일 때는 이 effect 스킵
    if (previewMaterialId != null) {
      return;
    }

    // 방어: previewFileUrl이 문자열이 아닌 경우 미리보기 시도 중단
    if (typeof previewFileUrl !== "string") {
      setPreviewBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setPreviewMarkdownContent(null);
      setPreviewLoadError(true);
      setPreviewLoading(false);
      return;
    }

    // 백엔드가 fileUrl에 마크다운 본문(finalDocument)을 넣어둔 경우: fetch하지 않고 바로 렌더링
    const looksLikeUrl =
      previewFileUrl.startsWith("http://") ||
      previewFileUrl.startsWith("https://") ||
      previewFileUrl.startsWith("/");
    // URL 전체에서 마크다운 패턴 검사 (https://도메인/###%201.%20... 은 pathname이 '/'만 나와서 path만 보면 놓침)
    const urlHasMarkdownPattern =
      previewFileUrl.includes("###") ||
      previewFileUrl.includes("%23%23%23") ||
      previewFileUrl.includes("## ") ||
      previewFileUrl.includes("%20%EC%9E%90%EB%A3%8C") ||
      previewFileUrl.length > 400;
    const pathPart = previewFileUrl.startsWith("http")
      ? (() => {
          try {
            return new URL(previewFileUrl).pathname;
          } catch {
            return previewFileUrl;
          }
        })()
      : previewFileUrl;
    const pathLooksLikeMarkdown =
      /^\/?#{1,6}(\s|%20)|^\/?[\d.]+\s.*자료구조|\.md$/i.test(pathPart) ||
      pathPart.length > 200;
    const isLikelyMarkdownInPath =
      urlHasMarkdownPattern || pathLooksLikeMarkdown;
    if (!looksLikeUrl || isLikelyMarkdownInPath) {
      let rawContent: string = previewFileUrl;
      if (isLikelyMarkdownInPath && previewFileUrl.startsWith("http")) {
        try {
          const u = new URL(previewFileUrl);
          const afterDomain =
            u.pathname.slice(1) + (u.hash ? u.hash.slice(1) : "");
          const decoded = decodeURIComponent(afterDomain || previewFileUrl);
          rawContent =
            previewFileUrl.includes("/###") && decoded.startsWith(" ")
              ? "###" + decoded
              : decoded;
        } catch {
          rawContent = previewFileUrl;
        }
      }
      setPreviewBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setPreviewMarkdownContent(rawContent);
      setPreviewLoading(false);
      setPreviewLoadError(false);
      setPreviewErrorMessage(null);
      return;
    }

    setPreviewBlobUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setPreviewMarkdownContent(null);
    setPreviewErrorMessage(null);
    const token = getAuthToken();
    setPreviewLoading(true);
    setPreviewLoadError(false);
    let objectUrl: string | null = null;
    const apiOrigin = API_BASE_URL ? new URL(API_BASE_URL).origin : "";
    const isSameOrigin =
      typeof window !== "undefined" && window.location.origin === apiOrigin;
    let fetchUrl: string;
    try {
      const baseForParse = API_BASE_URL || "https://dev.uouaitutor.duckdns.org";
      const u = previewFileUrl.startsWith("http")
        ? new URL(previewFileUrl)
        : new URL(previewFileUrl, baseForParse);
      if (isSameOrigin) {
        fetchUrl = u.pathname + u.search;
      } else {
        fetchUrl = u.href;
      }
    } catch {
      fetchUrl = previewFileUrl.startsWith("/")
        ? (API_BASE_URL || "") + previewFileUrl
        : previewFileUrl;
    }
    // AI 강의자료 생성 문서: /api/materials/generation/{id}/document → MD로 받아 마크다운 뷰로 표시
    const isGeneratedDocument =
      /\/api\/materials\/generation\/\d+\/document/.test(previewFileUrl) ||
      (fetchUrl &&
        /\/api\/materials\/generation\/\d+\/document/.test(fetchUrl));
    fetch(fetchUrl, {
      method: "GET",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: "omit",
      mode: "cors",
    })
      .then(async (res) => {
        if (!res.ok) {
          const status = res.status;
          if (status === 502 || status === 503 || status === 504) {
            throw new Error(
              `서버가 일시적으로 응답하지 않습니다 (${status}). 잠시 후 다시 시도해 주세요.`,
            );
          }
          throw new Error(
            status === 401
              ? "접근 권한이 없습니다."
              : "파일을 불러올 수 없습니다.",
          );
        }
        if (isGeneratedDocument) {
          const text = await res.text();
          setPreviewMarkdownContent(text);
          return;
        }
        const blob = await res.blob();
        const type = (blob.type || "").toLowerCase();
        const isHtml =
          type.includes("text/html") || type.includes("application/xhtml");
        if (isHtml) {
          setPreviewLoadError(true);
          setPreviewLoading(false);
          return;
        }
        // text/markdown 응답 또는 .md URL은 마크다운 뷰로 표시
        const urlLooksLikeMd =
          /\.md(\?|#|$)/i.test(previewFileUrl) ||
          /\.md(\?|#|$)/i.test(fetchUrl || "");
        const isMarkdown =
          type.includes("text/markdown") ||
          type.includes("text/x-markdown") ||
          urlLooksLikeMd;
        if (isMarkdown) {
          const text = await blob.text();
          setPreviewMarkdownContent(text);
          setPreviewBlobUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return null;
          });
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        setPreviewBlobUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return objectUrl;
        });
      })
      .catch((e) => {
        setPreviewLoadError(true);
        setPreviewErrorMessage(e instanceof Error ? e.message : null);
      })
      .finally(() => setPreviewLoading(false));
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [previewFileUrl, previewMaterialId, previewRetryKey]);

  React.useEffect(() => {
    const inViewer =
      !!previewFileUrl ||
      previewMaterialId != null ||
      examDetailSessionId != null;
    const topBarLabel =
      examDetailSessionId != null
        ? previewFileName ?? "시험"
        : previewFileUrl || previewMaterialId != null
          ? previewFileName
          : null;
    onPreviewStateChange?.(inViewer ? topBarLabel : null);
  }, [
    previewFileUrl,
    previewMaterialId,
    previewFileName,
    examDetailSessionId,
    onPreviewStateChange,
  ]);

  const handleOpenPreviewInNewTab = React.useCallback(async () => {
    if (previewMaterialId != null) {
      try {
        const blob = await materialApi.getMaterialFile(previewMaterialId);
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank", "noopener");
      } catch (e) {
        window.alert(
          e instanceof Error ? e.message : "미리보기를 열 수 없습니다.",
        );
      }
      return;
    }
    if (!previewFileUrl) return;
    if (typeof previewFileUrl !== "string") {
      window.alert("파일 경로를 불러오지 못했습니다.");
      return;
    }
    const token = getAuthToken();
    const apiOrigin = API_BASE_URL ? new URL(API_BASE_URL).origin : "";
    const isDevOrigin =
      typeof window !== "undefined" && window.location.hostname === "localhost";
    const useProxyPath =
      isDevOrigin && apiOrigin && previewFileUrl.startsWith(apiOrigin);
    const fetchUrl = useProxyPath
      ? (() => {
          try {
            const u = new URL(previewFileUrl);
            return u.pathname + u.search;
          } catch {
            return previewFileUrl;
          }
        })()
      : previewFileUrl;
    try {
      const res = await fetch(fetchUrl, {
        method: "GET",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: useProxyPath ? "same-origin" : "include",
        mode: "cors",
      });
      if (!res.ok) throw new Error("파일을 불러올 수 없습니다.");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener");
    } catch {
      window.open(previewFileUrl, "_blank", "noopener");
    }
  }, [previewFileUrl, previewMaterialId]);

  React.useEffect(() => {
    if (!addMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node))
        setAddMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [addMenuOpen]);

  React.useEffect(() => {
    if (!courseDetail?.courseId) {
      setAssessments([]);
      return;
    }
    setAssessmentsLoading(true);
    assessmentApi
      .getAssessmentsForCourse(courseDetail.courseId)
      .then(setAssessments)
      .catch(() => setAssessments([]))
      .finally(() => setAssessmentsLoading(false));
  }, [courseDetail?.courseId]);

  React.useEffect(() => {
    setTeacherMainPanel("materials");
  }, [courseDetail?.courseId]);

  React.useEffect(() => {
    setTeacherMainPanel("materials");
  }, [selectedLectureId]);

  const sortedItems = React.useMemo(() => {
    const rawMaterials: CenterItem[] =
      (selectedLectureId ? localMaterials[selectedLectureId] : []) ?? [];
    const materials = rawMaterials.filter(isPdfOrMarkdownResourceItem);
    const exams: CenterItem[] =
      (selectedLectureId ? localExams[selectedLectureId] : []) ?? [];
    const fromAssessments: CenterItem[] = assessments.map((a) => ({
      id: `assessment-${a.assessmentId}`,
      type: "assessment" as const,
      title: a.title,
      meta: "평가",
      createdAt: a.dueDate || "",
      assessmentId: a.assessmentId,
    }));
    const merged = [...materials, ...exams, ...fromAssessments];
    merged.sort((a, b) => a.title.localeCompare(b.title));
    return merged;
  }, [selectedLectureId, localMaterials, localExams, assessments]);

  // 강의실 진입 시 /api/courses/{courseId}/contents 한 번 호출하여 모든 주차 리소스 로드
  React.useEffect(() => {
    if (!courseDetail?.courseId) {
      setLocalMaterials({});
      setLocalExams({});
      setCourseContentsLoaded(false);
      return;
    }
    let cancelled = false;
    setLectureResourcesLoading(true);
    setCourseContentsLoaded(false);

    courseContentsApi
      .getCourseContents(courseDetail.courseId)
      .then(async (res: CourseContentsResponse) => {
        if (cancelled) return;
        const materialsByLecture: Record<number, CenterItem[]> = {};
        const examsByLecture: Record<number, CenterItem[]> = {};
        const lectures = res.lectures || [];

        // BE가 materials[].url에 마크다운 본문을 넣은 경우: fileUrl로 두면 다른 기기/캐시에서 fetch 시도 → finalDocument로만 넣어 fetch 방지
        const urlLooksLikeMarkdown = (url: string | undefined) =>
          typeof url === "string" &&
          (url.startsWith("#") ||
            url.includes("###") ||
            url.includes("## ") ||
            url.length > 250);
        for (const lec of lectures) {
          const mats: CenterItem[] = (lec.materials || []).map((m) => {
            const isMarkdown = urlLooksLikeMarkdown(m.url);
            return {
              id: `material-${m.materialId}`,
              type: "material" as const,
              title: m.displayName,
              meta: "자료",
              createdAt: new Date().toISOString(), // createdAt이 없으면 지금 시각으로 대체
              fileUrl: isMarkdown ? undefined : m.url,
              finalDocument: isMarkdown ? m.url : undefined,
              materialId: m.materialId,
            };
          });
          const exs: CenterItem[] = (lec.examSessions || []).map(
            courseExamSessionToCenterItem,
          );
          if (mats.length > 0) {
            materialsByLecture[lec.lectureId] = mats;
          }
          if (exs.length > 0) {
            examsByLecture[lec.lectureId] = exs;
          }
        }

        // BE가 contents에 생성 완료 자료를 안 넣어줄 수 있음 → 강의별 최근 세션에 문서 있으면 목록에 추가
        const sessionResults = await Promise.allSettled(
          lectures.map((lec) =>
            materialGenerationApi.getLatestSessionForLecture(lec.lectureId),
          ),
        );
        // getDocument가 필요한 세션 ID 수집 후 병렬 호출 (순차 호출 대비 속도 개선)
        const sessionIdsToFetch: { sessionId: number; idx: number }[] = [];
        const sessionInfos: Array<{
          lec: (typeof lectures)[number];
          sessionId: number;
          finalDoc: string | undefined;
          docUrl: string | null;
        }> = [];
        for (let i = 0; i < lectures.length; i++) {
          const lec = lectures[i];
          const settled = sessionResults[i];
          if (settled?.status !== "fulfilled" || !settled.value) continue;
          const raw = settled.value as Record<string, unknown>;
          const sessionId =
            typeof raw.sessionId === "number" ? raw.sessionId : null;
          if (sessionId == null) continue;
          const finalDoc =
            typeof raw.finalDocument === "string" && raw.finalDocument
              ? raw.finalDocument
              : undefined;
          let docUrl: string | null =
            typeof raw.documentUrl === "string" && raw.documentUrl
              ? raw.documentUrl
              : typeof (raw.document as Record<string, unknown>)?.url ===
                  "string"
                ? (raw.document as { url: string }).url
                : null;
          if (!docUrl) {
            const phase = String(
              raw.currentPhase ?? raw.current_phase ?? "",
            ).toUpperCase();
            const progress =
              typeof raw.progressPercentage === "number"
                ? raw.progressPercentage
                : (raw.progress_percentage as number);
            const mightHaveDoc =
              phase.includes("5") ||
              phase.includes("PHASE_5") ||
              phase.includes("COMPLETE") ||
              progress >= 100;
            if (mightHaveDoc) {
              sessionIdsToFetch.push({ sessionId, idx: sessionInfos.length });
            }
          }
          sessionInfos.push({ lec, sessionId, finalDoc, docUrl });
        }
        const docUrls = await Promise.all(
          sessionIdsToFetch.map(async ({ sessionId }) => {
            try {
              const docRes =
                await materialGenerationApi.getDocument(sessionId);
              const d = docRes as Record<string, unknown>;
              return (
                typeof d.documentUrl === "string"
                  ? d.documentUrl
                  : typeof d.url === "string"
                    ? d.url
                    : null
              );
            } catch {
              return null;
            }
          }),
        );
        sessionIdsToFetch.forEach(({ idx }, j) => {
          const url = docUrls[j];
          if (url) sessionInfos[idx].docUrl = url;
        });
        for (const { lec, sessionId, finalDoc, docUrl } of sessionInfos) {
          const hasDoc =
            (typeof docUrl === "string" && docUrl.length > 0) || finalDoc;
          if (!hasDoc) continue;
          const existing = materialsByLecture[lec.lectureId] ?? [];
          const documentApiUrl = `/api/materials/generation/${sessionId}/document`;
          const alreadyHas = existing.some(
            (m) =>
              m.generationSessionId === sessionId ||
              m.fileUrl === documentApiUrl,
          );
          if (!alreadyHas) {
            materialsByLecture[lec.lectureId] = [
              ...existing,
              {
                id: `material-session-${sessionId}`,
                type: "material" as const,
                title: "AI 생성 자료 (문서)",
                meta: "자료",
                createdAt: new Date().toISOString(),
                fileUrl: documentApiUrl,
                generationSessionId: sessionId,
                finalDocument: finalDoc,
              },
            ];
          }
        }

        setLocalMaterials(materialsByLecture);
        setLocalExams(examsByLecture);
        setCourseContentsLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
      })
      .finally(() => {
        if (!cancelled) setLectureResourcesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [courseDetail?.courseId]);

  // 삭제 후 서버 목록과 동기화 (다시 불러오기). 생성 완료 자료는 contents에 없어도 latest-session으로 보완.
  const refetchCourseContents = React.useCallback((courseId: number) => {
    courseContentsApi
      .getCourseContents(courseId)
      .then(async (res: CourseContentsResponse) => {
        const materialsByLecture: Record<number, CenterItem[]> = {};
        const examsByLecture: Record<number, CenterItem[]> = {};
        const lectures = res.lectures || [];
        const urlLooksLikeMarkdown = (url: string | undefined) =>
          typeof url === "string" &&
          (url.startsWith("#") ||
            url.includes("###") ||
            url.includes("## ") ||
            url.length > 250);
        for (const lec of lectures) {
          const mats: CenterItem[] = (lec.materials || []).map((m) => {
            const isMarkdown = urlLooksLikeMarkdown(m.url);
            return {
              id: `material-${m.materialId}`,
              type: "material" as const,
              title: m.displayName,
              meta: "자료",
              createdAt: new Date().toISOString(),
              fileUrl: isMarkdown ? undefined : m.url,
              finalDocument: isMarkdown ? m.url : undefined,
              materialId: m.materialId,
            };
          });
          const exs: CenterItem[] = (lec.examSessions || []).map(
            courseExamSessionToCenterItem,
          );
          if (mats.length > 0) materialsByLecture[lec.lectureId] = mats;
          if (exs.length > 0) examsByLecture[lec.lectureId] = exs;
        }
        const sessionResults = await Promise.allSettled(
          lectures.map((lec) =>
            materialGenerationApi.getLatestSessionForLecture(lec.lectureId),
          ),
        );
        const sessionIdsToFetch: { sessionId: number; idx: number }[] = [];
        const sessionInfos: Array<{
          lec: (typeof lectures)[number];
          sessionId: number;
          finalDoc: string | undefined;
          docUrl: string | null;
        }> = [];
        for (let i = 0; i < lectures.length; i++) {
          const lec = lectures[i];
          const settled = sessionResults[i];
          if (settled?.status !== "fulfilled" || !settled.value) continue;
          const raw = settled.value as Record<string, unknown>;
          const sessionId =
            typeof raw.sessionId === "number" ? raw.sessionId : null;
          if (sessionId == null) continue;
          const finalDoc =
            typeof raw.finalDocument === "string" && raw.finalDocument
              ? raw.finalDocument
              : undefined;
          let docUrl: string | null =
            typeof raw.documentUrl === "string" && raw.documentUrl
              ? raw.documentUrl
              : typeof (raw.document as Record<string, unknown>)?.url ===
                  "string"
                ? (raw.document as { url: string }).url
                : null;
          if (!docUrl) {
            const phase = String(
              raw.currentPhase ?? raw.current_phase ?? "",
            ).toUpperCase();
            const progress =
              typeof raw.progressPercentage === "number"
                ? raw.progressPercentage
                : (raw.progress_percentage as number);
            const mightHaveDoc =
              phase.includes("5") ||
              phase.includes("PHASE_5") ||
              phase.includes("COMPLETE") ||
              progress >= 100;
            if (mightHaveDoc) {
              sessionIdsToFetch.push({ sessionId, idx: sessionInfos.length });
            }
          }
          sessionInfos.push({ lec, sessionId, finalDoc, docUrl });
        }
        const docUrls = await Promise.all(
          sessionIdsToFetch.map(async ({ sessionId }) => {
            try {
              const docRes =
                await materialGenerationApi.getDocument(sessionId);
              const d = docRes as Record<string, unknown>;
              return (
                typeof d.documentUrl === "string"
                  ? d.documentUrl
                  : typeof d.url === "string"
                    ? d.url
                    : null
              );
            } catch {
              return null;
            }
          }),
        );
        sessionIdsToFetch.forEach(({ idx }, j) => {
          const url = docUrls[j];
          if (url) sessionInfos[idx].docUrl = url;
        });
        for (const { lec, sessionId, finalDoc, docUrl } of sessionInfos) {
          const hasDoc =
            (typeof docUrl === "string" && docUrl.length > 0) || finalDoc;
          if (!hasDoc) continue;
          const existing = materialsByLecture[lec.lectureId] ?? [];
          const documentApiUrl = `/api/materials/generation/${sessionId}/document`;
          const alreadyHas = existing.some(
            (m) =>
              m.generationSessionId === sessionId ||
              m.fileUrl === documentApiUrl,
          );
          if (!alreadyHas) {
            materialsByLecture[lec.lectureId] = [
              ...existing,
              {
                id: `material-session-${sessionId}`,
                type: "material" as const,
                title: "AI 생성 자료 (문서)",
                meta: "자료",
                createdAt: new Date().toISOString(),
                fileUrl: documentApiUrl,
                generationSessionId: sessionId,
                finalDocument: finalDoc,
              },
            ];
          }
        }
        setLocalMaterials((prev) => ({ ...prev, ...materialsByLecture }));
        setLocalExams((prev) => ({ ...prev, ...examsByLecture }));
      })
      .catch(() => {});
  }, []);

  const handleDeleteCenterItem = React.useCallback(
    async (item: CenterItem, options?: { skipConfirm?: boolean }) => {
      if (!selectedLectureId) return;
      const baseMessage =
        item.type === "material"
          ? "이 자료를 삭제하시겠습니까?\n(서버에서도 삭제됩니다.)"
          : item.type === "exam"
            ? "이 시험 카드를 목록에서 삭제하시겠습니까?\n(필요하면 다시 생성할 수 있습니다.)"
            : "이 항목을 삭제하시겠습니까?";
      if (!options?.skipConfirm && !window.confirm(baseMessage)) return;

      if (item.type === "material") {
        try {
          if (item.materialId != null) {
            await materialApi.deleteMaterial(item.materialId);
          } else if (item.generationSessionId != null) {
            await materialGenerationApi.deleteSession(item.generationSessionId);
          }
        } catch (e) {
          window.alert(e instanceof Error ? e.message : "삭제에 실패했습니다.");
          return;
        }
        setLocalMaterials((prev) => {
          const list = prev[selectedLectureId] || [];
          return {
            ...prev,
            [selectedLectureId]: list.filter((it) => it.id !== item.id),
          };
        });
        if (courseDetail?.courseId)
          refetchCourseContents(courseDetail.courseId);
      } else if (item.type === "exam") {
        try {
          if (item.examSessionId != null) {
            await examGenerationApi.deleteExamSession(
              Number(item.examSessionId),
            );
          }
        } catch (e) {
          window.alert(
            e instanceof Error ? e.message : "시험 삭제에 실패했습니다.",
          );
          return;
        }
        setLocalExams((prev) => {
          const list = prev[selectedLectureId] || [];
          return {
            ...prev,
            [selectedLectureId]: list.filter((it) => it.id !== item.id),
          };
        });
        if (courseDetail?.courseId)
          refetchCourseContents(courseDetail.courseId);
      } else {
        window.alert("이 항목은 아직 삭제 기능이 연결되지 않았습니다.");
      }
    },
    [selectedLectureId, courseDetail?.courseId, refetchCourseContents],
  );

  const canSelectCenterItemForDelete = React.useCallback((item: CenterItem) => {
    return item.type === "material" || item.type === "exam";
  }, []);

  React.useEffect(() => {
    // 편집 모드 종료/주차 변경 시 선택 초기화
    setSelectedCenterItemIds({});
    setActiveResourceActionItemId(null);
    setResourceEditMode(false);
  }, [selectedLectureId]);

  const handleDeleteSelectedCenterItems = React.useCallback(async () => {
    if (!resourceEditMode) return;
    const selected = sortedItems.filter(
      (it) => selectedCenterItemIds[it.id] && canSelectCenterItemForDelete(it),
    );
    if (selected.length === 0) return;
    if (
      !window.confirm(
        `선택한 ${selected.length}개 항목을 삭제하시겠습니까?\n(삭제 후에는 되돌릴 수 없습니다.)`,
      )
    ) {
      return;
    }
    const materialIds = selected
      .filter((it) => it.type === "material" && it.materialId != null)
      .map((it) => Number(it.materialId));
    const generationSessionIds = selected
      .filter((it) => it.type === "material" && it.generationSessionId != null)
      .map((it) => Number(it.generationSessionId));
    const examSessionIds = selected
      .filter((it) => it.type === "exam" && it.examSessionId != null)
      .map((it) => Number(it.examSessionId))
      .filter((id) => Number.isFinite(id) && id > 0);
    const hasBulkDeletePayload =
      materialIds.length > 0 ||
      generationSessionIds.length > 0 ||
      examSessionIds.length > 0;
    const hasUnresolvedItem = selected.some((it) => {
      if (it.type === "material") {
        return it.materialId == null && it.generationSessionId == null;
      }
      if (it.type === "exam") {
        const id = Number(it.examSessionId);
        return !Number.isFinite(id) || id <= 0;
      }
      return true;
    });

    if (courseDetail?.courseId && hasBulkDeletePayload && !hasUnresolvedItem) {
      setSubmitting(true);
      try {
        await courseApi.deleteCourseContents(courseDetail.courseId, {
          materialIds,
          examSessionIds,
          generationSessionIds,
        });
        const selectedIds = new Set(selected.map((it) => it.id));
        setLocalMaterials((prev) => {
          const list = prev[selectedLectureId ?? 0] || [];
          return {
            ...prev,
            [selectedLectureId ?? 0]: list.filter((it) => !selectedIds.has(it.id)),
          };
        });
        setLocalExams((prev) => {
          const list = prev[selectedLectureId ?? 0] || [];
          return {
            ...prev,
            [selectedLectureId ?? 0]: list.filter((it) => !selectedIds.has(it.id)),
          };
        });
        if (
          (previewMaterialId != null && materialIds.includes(previewMaterialId)) ||
          (previewLinkedGenerationSessionId != null &&
            generationSessionIds.includes(previewLinkedGenerationSessionId))
        ) {
          previewBeforeExamRef.current = null;
          setPreviewFileUrl(null);
          setPreviewMaterialId(null);
          setPreviewFileName(null);
          setPreviewIsAiGenerationDoc(false);
          setPreviewLinkedGenerationSessionId(null);
          clearResourceParamsInUrl();
        }
        refetchCourseContents(courseDetail.courseId);
        setSelectedCenterItemIds({});
        setResourceEditMode(false);
        return;
      } catch (e) {
        window.alert(
          e instanceof Error ? e.message : "선택한 항목 삭제에 실패했습니다.",
        );
      } finally {
        setSubmitting(false);
      }
      return;
    }

    for (const it of selected) {
      // 개별 confirm 없이 삭제
      // eslint-disable-next-line no-await-in-loop
      await handleDeleteCenterItem(it, { skipConfirm: true });
    }
    setSelectedCenterItemIds({});
    setResourceEditMode(false);
  }, [
    resourceEditMode,
    sortedItems,
    selectedCenterItemIds,
    canSelectCenterItemForDelete,
    handleDeleteCenterItem,
    courseDetail?.courseId,
    selectedLectureId,
    previewMaterialId,
    previewLinkedGenerationSessionId,
    clearResourceParamsInUrl,
    refetchCourseContents,
  ]);

  React.useEffect(() => {
    if (uploadModalOpen) {
      setUploadFile(null);
      setUploadDragOver(false);
    }
  }, [uploadModalOpen]);

  const prevLectureForPreviewRef = React.useRef<number | null | undefined>(
    undefined,
  );
  React.useEffect(() => {
    const cur = selectedLectureId ?? null;
    const prev = prevLectureForPreviewRef.current;
    if (prev === undefined) {
      prevLectureForPreviewRef.current = cur;
      return;
    }
    if (prev === cur) return;
    // null → 첫 강의 선택은 새로고침 복원 직후에도 올 수 있어 URL·미리보기 초기화하지 않음
    if (prev === null && cur !== null) {
      prevLectureForPreviewRef.current = cur;
      return;
    }
    prevLectureForPreviewRef.current = cur;
    previewBeforeExamRef.current = null;
    setPreviewFileUrl(null);
    setPreviewMaterialId(null);
    setPreviewFileName(null);
    setPreviewIsAiGenerationDoc(false);
    setPreviewLinkedGenerationSessionId(null);
    setResourcePreviewViewerWidthPx(null);
    clearResourceParamsInUrl();
  }, [selectedLectureId, clearResourceParamsInUrl]);

  const handleRightSidebarResizeStart = React.useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = rightSidebarWidth;
      const onMove = (ev: MouseEvent) => {
        const delta = startX - ev.clientX;
        setRightSidebarWidth(Math.min(680, Math.max(280, startWidth + delta)));
      };
      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [rightSidebarWidth],
  );

  const RESOURCE_PREVIEW_SPLIT_MIN_VIEWER = 280;
  const RESOURCE_PREVIEW_SPLIT_MIN_SIDEBAR = 280;

  const handleResourcePreviewSplitResizeStart = React.useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const row = resourcePreviewSplitRowRef.current;
      if (!row) return;
      const startX = e.clientX;
      const rowWidth = row.getBoundingClientRect().width;
      const measuredLeft =
        resourcePreviewViewerPanelRef.current?.getBoundingClientRect().width;
      const startLeft =
        resourcePreviewViewerWidthPx ??
        measuredLeft ??
        Math.max(RESOURCE_PREVIEW_SPLIT_MIN_VIEWER, rowWidth * 0.6);
      const onMove = (ev: MouseEvent) => {
        const w = resourcePreviewSplitRowRef.current?.getBoundingClientRect()
          .width ?? rowWidth;
        const delta = ev.clientX - startX;
        const next = startLeft + delta;
        const maxLeft = Math.max(
          RESOURCE_PREVIEW_SPLIT_MIN_VIEWER,
          w - RESOURCE_PREVIEW_SPLIT_MIN_SIDEBAR,
        );
        setResourcePreviewViewerWidthPx(
          Math.min(maxLeft, Math.max(RESOURCE_PREVIEW_SPLIT_MIN_VIEWER, next)),
        );
      };
      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [resourcePreviewViewerWidthPx],
  );

  // 강의자료 생성 시 PDF는 선택 사항이므로, 더 이상 자동 입력/강제 사용하지 않는다.

  const handleUploadSubmit = React.useCallback(async () => {
    if (!selectedLectureId || !uploadFile || !courseDetail?.courseId) return;
    setSubmitting(true);
    try {
      const result = await lectureApi.uploadMaterial(
        selectedLectureId,
        uploadFile,
      );
      const {
        materialId: resMaterialId,
        fileUrl: url,
        displayName: resDisplayName,
      } = result;
      const title = resDisplayName ?? uploadFile.name;
      const newItem: CenterItem = {
        id:
          resMaterialId != null
            ? `material-${resMaterialId}`
            : `material-${Date.now()}`,
        type: "material",
        title,
        meta: "자료",
        createdAt: new Date().toISOString(),
        fileUrl: url || undefined,
        materialId: resMaterialId,
      };

      if (url) {
        try {
          const key = `lecture_upload_${selectedLectureId}`;
          const payload = {
            fileName: title,
            fileUrl: url,
            materialId: resMaterialId,
            timestamp: Date.now(),
          };
          localStorage.setItem(key, JSON.stringify(payload));
        } catch {
          // 로컬 스토리지 저장 실패는 치명적이지 않으므로 무시
        }
      }

      setLocalMaterials((prev) => ({
        ...prev,
        [selectedLectureId]: [...(prev[selectedLectureId] || []), newItem],
      }));
      setUploadFile(null);
      // Swagger 명세: 응답의 materialId로 GET /api/materials/{materialId}/file 미리보기 사용
      if (resMaterialId != null) {
        setPreviewMaterialId(resMaterialId);
        setPreviewFileUrl(null);
        setPreviewFileName(title);
        setPreviewIsAiGenerationDoc(false);
        setPreviewLinkedGenerationSessionId(null);
        patchResourceInUrl({ material: resMaterialId });
      } else if (url) {
        setPreviewFileUrl(url);
        setPreviewMaterialId(null);
        setPreviewFileName(title);
        setPreviewIsAiGenerationDoc(false);
        setPreviewLinkedGenerationSessionId(null);
        const mid = parseMaterialIdFromMaterialFileUrl(url);
        patchResourceInUrl(mid != null ? { material: mid } : {});
      }
      // 업로드 후에는 모달만 닫고, 강의 콘텐츠 생성은 채팅(/generate)에서 수행
      setUploadModalOpen(false);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "업로드에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }, [selectedLectureId, uploadFile, courseDetail?.courseId, patchResourceInUrl]);

  const handleCloseUploadModal = React.useCallback(() => {
    setUploadFile(null);
    setUploadDragOver(false);
    setUploadModalOpen(false);
  }, []);

  const handleMaterialGenSubmit = React.useCallback(async () => {
    if (!materialKeyword.trim()) return;
    if (selectedLectureId == null) {
      window.alert("강의를 먼저 선택해주세요.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await materialGenerationApi.phase1({
        lectureId: selectedLectureId,
        keyword: materialKeyword.trim(),
      });
      setMaterialSessionId(res.sessionId);
      setMaterialDraftPlan(res.draftPlan ?? null);
      setMaterialGenStep(2);
    } catch (e) {
      window.alert(
        e instanceof Error ? e.message : "기획안 생성에 실패했습니다.",
      );
    } finally {
      setSubmitting(false);
    }
  }, [materialKeyword, selectedLectureId]);

  // 최근 사용한 기획안(세션) 불러오기 - lectureId만으로 해당 강의의 최근 생성 세션 조회
  const handleLoadLatestMaterialSession = React.useCallback(async () => {
    if (selectedLectureId == null) {
      window.alert("강의를 먼저 선택해주세요.");
      return;
    }
    setSubmitting(true);
    try {
      const res =
        await materialGenerationApi.getLatestSessionForLecture(
          selectedLectureId,
        );
      setMaterialSessionId(res.sessionId);
      if (res.draftPlan) setMaterialDraftPlan(res.draftPlan);
      const phase = (res.currentPhase || "").toUpperCase();
      if (phase === "PHASE1" || phase === "PHASE2") {
        setMaterialGenStep(2);
      } else if (phase === "PHASE3") {
        setMaterialGenStep(3);
      } else if (phase === "PHASE4") {
        setMaterialChapterSummary(
          res.chapterContentList ? "챕터 내용 생성됨" : null,
        );
        setMaterialGenStep(4);
      } else {
        // PHASE5 또는 완료: 화면에는 반드시 finalDocument만 사용. documentUrl은 다운로드/링크용.
        if (typeof res.finalDocument === "string" && res.finalDocument) {
          setMaterialFinalDocument(res.finalDocument);
          setMaterialCompletedViaAsync(true);
          setMaterialGenStep(5);
          if (typeof res.documentUrl === "string" && res.documentUrl)
            setMaterialFinalUrl(res.documentUrl);
          else setMaterialFinalUrl(null);
        } else if (typeof res.documentUrl === "string" && res.documentUrl) {
          setMaterialFinalUrl(res.documentUrl);
          setMaterialFinalDocument(null);
          setMaterialCompletedViaAsync(true);
          setMaterialGenStep(5);
        } else {
          setMaterialGenStep(3);
        }
      }
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "최근 세션 조회에 실패했습니다.";
      window.alert(
        msg +
          (msg.includes("세션")
            ? ""
            : " 이 강의에 대한 이전 기획안이 없을 수 있습니다."),
      );
    } finally {
      setSubmitting(false);
    }
  }, [selectedLectureId]);

  const resetMaterialGenModal = React.useCallback(() => {
    materialStreamAbortRef.current?.();
    materialStreamAbortRef.current = null;
    setStreamedMaterialContent("");
    setStreamedMaterialProgress("");
    setMaterialGenStep(1);
    setMaterialSessionId(null);
    setMaterialDraftPlan(null);
    setMaterialPhase2Feedback("");
    setMaterialPhase2UpdateMode(false);
    setMaterialChapterSummary(null);
    setMaterialVerifiedSummary(null);
    setMaterialFinalUrl(null);
    setMaterialFinalDocument(null);
    setMaterialKeyword("");
    setMaterialAsyncTaskId(null);
    setMaterialCompletedViaAsync(false);
  }, []);

  const handleMaterialPhase2Confirm = React.useCallback(async () => {
    if (materialSessionId == null) return;
    setSubmitting(true);
    try {
      const res = await materialGenerationApi.phase2({
        sessionId: materialSessionId,
        action: "confirm",
      });
      if (res.draftPlan) setMaterialDraftPlan(res.draftPlan);
      setMaterialGenStep(3);
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "기획안 확정에 실패했습니다.";
      if (msg.includes("Phase 1 완료 후에만")) {
        window.alert(
          "이 세션은 서버에서 Phase 2 진행이 허용되지 않습니다.\n\n" +
            "‘최근 사용한 기획안 불러오기’로 불러온 세션은 BE에서 Phase 1 완료로 인식하지 않을 수 있습니다.\n\n" +
            "해결: 1단계로 돌아가 주제/키워드를 입력한 뒤 [기획안 생성]으로 새로 만든 뒤 확정해 주세요.",
        );
      } else {
        window.alert(msg);
      }
    } finally {
      setSubmitting(false);
    }
  }, [materialSessionId]);

  const handleMaterialPhase2Update = React.useCallback(async () => {
    if (materialSessionId == null) return;
    setSubmitting(true);
    try {
      const res = await materialGenerationApi.phase2({
        sessionId: materialSessionId,
        // BE 스펙: action은 "feedback" 또는 "confirm"만 허용
        action: "feedback",
        feedback: materialPhase2Feedback.trim() || undefined,
      });
      // 수정 요청 후에는 updatedPlan, 없으면 draftPlan으로 화면 갱신
      const nextPlan = res.updatedPlan ?? res.draftPlan;
      if (nextPlan) setMaterialDraftPlan(nextPlan);
      setMaterialPhase2Feedback("");
      setMaterialPhase2UpdateMode(false);
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "기획안 수정에 실패했습니다.";
      if (msg.includes("Phase 1 완료 후에만")) {
        window.alert(
          "이 세션은 서버에서 Phase 2 진행이 허용되지 않습니다.\n\n" +
            "'최근 사용한 기획안 불러오기'로 불러온 세션은 BE에서 Phase 1 완료로 인식하지 않을 수 있습니다.\n\n" +
            "해결: 1단계로 돌아가 주제/키워드를 입력한 뒤 [기획안 생성]으로 새로 만든 뒤 수정 요청해 주세요.",
        );
      } else {
        window.alert(msg);
      }
    } finally {
      setSubmitting(false);
    }
  }, [materialSessionId, materialPhase2Feedback]);

  const applyMaterialCompletion = React.useCallback(
    (
      docUrl: string | null,
      finalDocument?: string | null,
      options?: { sessionId?: number | null; keyword?: string | null },
    ) => {
      const effectiveSessionId = options?.sessionId ?? materialSessionId;
      const effectiveKeyword = options?.keyword ?? materialKeyword;
      setMaterialAsyncTaskId(null);
      clearMaterialPendingTask();
      setMaterialCompletedViaAsync(true);
      setStreamedMaterialContent("");
      setStreamedMaterialProgress("");
      if (finalDocument != null) setMaterialFinalDocument(finalDocument);
      if (docUrl) {
        setMaterialFinalUrl(docUrl);
        setMaterialGenStep(5);
        const title = effectiveKeyword.trim() || "AI 자료";
        const newItem: CenterItem = {
          id: `material-${effectiveSessionId ?? Date.now()}-${Date.now()}`,
          type: "material",
          title: `${title} (문서)`,
          meta: "자료",
          createdAt: new Date().toISOString(),
          fileUrl: docUrl,
          generationSessionId: effectiveSessionId ?? undefined,
          finalDocument:
            typeof finalDocument === "string" && finalDocument
              ? finalDocument
              : undefined,
        };
        if (selectedLectureId) {
          setLocalMaterials((prev) => ({
            ...prev,
            [selectedLectureId]: [...(prev[selectedLectureId] || []), newItem],
          }));
        }
      }
      if (courseDetail?.courseId) refetchCourseContents(courseDetail.courseId);
      setSubmitting(false);
    },
    [
      materialSessionId,
      materialKeyword,
      selectedLectureId,
      courseDetail?.courseId,
      refetchCourseContents,
      clearMaterialPendingTask,
    ],
  );

  const pollMaterialTaskUntilDone = React.useCallback(
    async (
      taskId: string,
      sessionId: number,
      options?: { keyword?: string; silentOnFailure?: boolean },
    ) => {
      setMaterialAsyncTaskId(taskId);
      setSubmitting(true);
      const pollMs = 5000;
      const maxAttempts = 360;
      for (let i = 0; i < maxAttempts; i++) {
        let statusRes: {
          status?: string;
          documentUrl?: string;
          message?: string;
        };
        try {
          statusRes = await tasksApi.getStatus(taskId);
        } catch {
          await new Promise((r) => setTimeout(r, pollMs));
          continue;
        }
        const s = (statusRes.status || "").toUpperCase();
        if (s === "COMPLETED" || s === "DONE" || s === "SUCCESS") {
          let docUrl = statusRes.documentUrl ?? null;
          if (!docUrl) {
            try {
              const docRes = await materialGenerationApi.getDocument(sessionId);
              docUrl =
                docRes.documentUrl ?? (docRes as { url?: string }).url ?? null;
            } catch {
              /* ignore */
            }
          }
          applyMaterialCompletion(docUrl, null, {
            sessionId,
            keyword: options?.keyword,
          });
          return;
        }
        if (s === "FAILED" || s === "ERROR") {
          if (!options?.silentOnFailure) {
            window.alert(statusRes.message || "Phase 3~5 처리에 실패했습니다.");
          }
          clearMaterialPendingTask();
          setMaterialAsyncTaskId(null);
          setSubmitting(false);
          return;
        }
        await new Promise((r) => setTimeout(r, pollMs));
      }
      if (!options?.silentOnFailure) {
        window.alert(
          "처리 시간이 초과되었습니다. 잠시 후 작업 상태를 확인해 주세요.",
        );
      }
      clearMaterialPendingTask();
      setMaterialAsyncTaskId(null);
      setSubmitting(false);
    },
    [applyMaterialCompletion, clearMaterialPendingTask],
  );

  const handleMaterialPhase3To5Async = React.useCallback(async () => {
    if (materialSessionId == null) return;
    setSubmitting(true);
    setMaterialAsyncTaskId(null);
    setStreamedMaterialContent("");
    setStreamedMaterialProgress("작업 시작 중…");

    try {
      const res = await materialGenerationApi.runAsync({
        sessionId: materialSessionId,
      });
      const taskId = res.taskId;
      if (!taskId) {
        window.alert(res.message || "작업 ID를 받지 못했습니다.");
        setSubmitting(false);
        return;
      }
      setMaterialAsyncTaskId(taskId);
      saveMaterialPendingTask({
        taskId,
        sessionId: materialSessionId,
        courseId: courseDetail?.courseId ?? 0,
        lectureId: selectedLectureId ?? 0,
        keyword: materialKeyword.trim(),
        savedAt: Date.now(),
      });
      setStreamedMaterialProgress("스트림 연결 중…");

      materialStreamAbortRef.current = materialGenerationApi.streamPhase(
        materialSessionId,
        5,
        {
          onProgress: (data) => {
            if (data.progressPercentage != null)
              setStreamedMaterialProgress(`${data.progressPercentage}%`);
            else if (data.message) setStreamedMaterialProgress(data.message);
            else if (data.currentPhase)
              setStreamedMaterialProgress(data.currentPhase);
          },
          onContent: (chunk) => {
            setStreamedMaterialContent((prev) => prev + chunk);
          },
          onDone: (data) => {
            materialStreamAbortRef.current = null;
            if (typeof data.finalDocument === "string" && data.finalDocument) {
              setMaterialFinalDocument(data.finalDocument);
            } else {
              setMaterialFinalDocument(null);
            }
            let docUrl: string | null = null;
            if (typeof data.finalDocument === "string" && data.finalDocument) {
              docUrl = URL.createObjectURL(
                new Blob([data.finalDocument], {
                  type: "text/markdown; charset=UTF-8",
                }),
              );
            } else if (
              typeof data.documentUrl === "string" &&
              data.documentUrl
            ) {
              docUrl = data.documentUrl;
            }
            applyMaterialCompletion(docUrl, data.finalDocument);
          },
          onError: (err) => {
            materialStreamAbortRef.current = null;
            setStreamedMaterialProgress("스트림 종료. 상태 확인 중…");
            window.alert(
              err.message ||
                "스트림 연결에 실패했습니다. 상태 폴링으로 진행합니다.",
            );
            pollMaterialTaskUntilDone(taskId, materialSessionId, {
              keyword: materialKeyword.trim(),
            });
          },
        },
      );
    } catch (e) {
      window.alert(
        e instanceof Error ? e.message : "Phase 3~5 실행에 실패했습니다.",
      );
      clearMaterialPendingTask();
      setSubmitting(false);
    }
  }, [
    materialSessionId,
    applyMaterialCompletion,
    saveMaterialPendingTask,
    courseDetail?.courseId,
    selectedLectureId,
    materialKeyword,
    pollMaterialTaskUntilDone,
    clearMaterialPendingTask,
  ]);

  React.useEffect(() => {
    if (selectedLectureId == null || courseDetail?.courseId == null) return;
    if (materialAsyncTaskId) return;
    const pending = loadMaterialPendingTask();
    if (!pending) return;
    if (
      pending.lectureId !== selectedLectureId ||
      pending.courseId !== courseDetail.courseId
    ) {
      return;
    }
    setMaterialSessionId(pending.sessionId);
    if (!materialKeyword.trim() && pending.keyword) {
      setMaterialKeyword(pending.keyword);
    }
    setMaterialGenStep(3);
    setStreamedMaterialProgress("이전 작업 상태를 복원하는 중…");
    void pollMaterialTaskUntilDone(pending.taskId, pending.sessionId, {
      keyword: pending.keyword,
      silentOnFailure: true,
    });
  }, [
    selectedLectureId,
    courseDetail?.courseId,
    materialAsyncTaskId,
    loadMaterialPendingTask,
    pollMaterialTaskUntilDone,
    materialKeyword,
  ]);

  const handleMaterialPhase3 = React.useCallback(async () => {
    if (materialSessionId == null) return;
    setSubmitting(true);
    try {
      const res = await materialGenerationApi.phase3({
        sessionId: materialSessionId,
      });
      const total =
        res.totalChapters ??
        (res.chapterContentList && typeof res.chapterContentList === "object"
          ? Object.keys(res.chapterContentList).length
          : 0);
      setMaterialChapterSummary(
        total
          ? `챕터 ${total}개 생성 완료`
          : res.message || "챕터 내용 생성 완료",
      );
      setMaterialGenStep(4);
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "챕터 내용 생성에 실패했습니다.";
      window.alert(msg);
    } finally {
      setSubmitting(false);
    }
  }, [materialSessionId]);

  const handleMaterialPhase4 = React.useCallback(async () => {
    if (materialSessionId == null) return;
    setSubmitting(true);
    try {
      const res = await materialGenerationApi.phase4({
        sessionId: materialSessionId,
      });
      setMaterialVerifiedSummary(res.message ?? "내용 검증 완료");
      setMaterialGenStep(5);
    } catch (e) {
      window.alert(
        e instanceof Error ? e.message : "내용 검증에 실패했습니다.",
      );
    } finally {
      setSubmitting(false);
    }
  }, [materialSessionId]);

  const handleMaterialPhase5 = React.useCallback(async () => {
    if (materialSessionId == null) return;
    setSubmitting(true);
    try {
      const res = (await materialGenerationApi.phase5({
        sessionId: materialSessionId,
      })) as { documentUrl?: string; finalDocument?: string };
      // 화면에 띄울 값은 반드시 finalDocument. documentUrl은 다운로드/링크용.
      if (typeof res.finalDocument === "string" && res.finalDocument) {
        setMaterialFinalDocument(res.finalDocument);
        setMaterialFinalUrl(
          typeof res.documentUrl === "string" && res.documentUrl
            ? res.documentUrl
            : null,
        );
      } else if (typeof res.documentUrl === "string" && res.documentUrl) {
        setMaterialFinalUrl(res.documentUrl);
        setMaterialFinalDocument(null);
      } else {
        setMaterialFinalUrl(null);
        setMaterialFinalDocument(null);
      }
    } catch (e) {
      window.alert(
        e instanceof Error ? e.message : "최종 문서 생성에 실패했습니다.",
      );
    } finally {
      setSubmitting(false);
    }
  }, [materialSessionId]);

  const handleMaterialGenAddToList = React.useCallback(() => {
    if (materialCompletedViaAsync && selectedLectureId) {
      resetMaterialGenModal();
      setMaterialGenModalOpen(false);
      return;
    }
    const title = materialKeyword.trim() || "AI 자료";
    const newItem: CenterItem = {
      id: `material-${materialSessionId ?? Date.now()}`,
      type: "material",
      title:
        materialFinalUrl || materialFinalDocument ? `${title} (문서)` : title,
      meta: "자료",
      createdAt: new Date().toISOString(),
      fileUrl: materialFinalUrl ?? undefined,
      generationSessionId: materialSessionId ?? undefined,
      finalDocument: materialFinalDocument ?? undefined,
    };
    if (selectedLectureId) {
      setLocalMaterials((prev) => ({
        ...prev,
        [selectedLectureId]: [...(prev[selectedLectureId] || []), newItem],
      }));
    }
    resetMaterialGenModal();
    setMaterialGenModalOpen(false);
  }, [
    materialKeyword,
    materialSessionId,
    materialFinalUrl,
    materialFinalDocument,
    selectedLectureId,
    resetMaterialGenModal,
    materialCompletedViaAsync,
  ]);

  const handleExamGenAsyncSubmit = React.useCallback(
    async (examTopic: string, examDisplayName: string) => {
    if (!examTopic.trim()) return;
    if (selectedLectureId == null) {
      window.alert("강의를 먼저 선택해주세요.");
      return;
    }
    const resourceFilter = buildActiveExamResourceFilter(
      examSourceMaterialId,
      previewLinkedGenerationSessionId,
    );
    if (resourceFilter == null) {
      window.alert(
        "시험을 만들 자료(PDF 또는 AI 문서)를 먼저 선택해 주세요.\n좌측에서 자료 카드를 클릭해 미리보기를 연 뒤 다시 시도해 주세요.",
      );
      return;
    }
    /** 업로드 PDF 미리보기(blob)일 때만: 현재 페이지(없으면 1)를 출제 범위로 전달 */
    const sourcePdfPageForAsync =
      resourceFilter.kind === "material" && previewBlobUrl != null
        ? (previewCurrentPdfPage ?? 1)
        : undefined;
    const existingExams = examsForActiveResource;
    const resolvedName = resolveNewExamDisplayName(
      examDisplayName,
      examType,
      examCount,
      existingExams,
    );
    if ("error" in resolvedName) {
      window.alert(
        "이미 존재하는 시험 이름입니다. 다른 이름으로 수정해 주세요.",
      );
      return;
    }
    setSubmitting(true);
    try {
      const focusSource =
        profileFocusAreasInput.trim() ||
        examTopic.trim();
      const focusAreas = focusSource
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      const fallbackUserProfile =
        focusAreas.length === 0
          ? undefined
          : {
              learningGoal: {
                focusAreas,
                targetDepth: profileTargetDepth,
                questionModality: profileQuestionModality,
              },
              userStatus: {
                proficiencyLevel: profileProficiencyLevel,
                weaknessFocus: profileWeaknessFocus,
              },
              interactionStyle: {
                languagePreference: profileLanguagePreference,
                scenarioBased: profileScenarioBased,
              },
              feedbackPreference: {
                strictness: profileStrictness,
                explanationDepth: profileExplanationDepth,
              },
              scopeBoundary: profileScopeBoundary,
            };

      const finalUserProfile =
        examProfileStatus === "COMPLETE" && examProfile
          ? examProfile
          : fallbackUserProfile;

      const res = await examGenerationApi.runAsync({
        lectureId: selectedLectureId,
        examType,
        targetCount: examCount,
        lectureContent: examTopic.trim(),
        topic: examTopic.trim(),
        userProfile: finalUserProfile,
        displayName: resolvedName.title,
        ...(resourceFilter.kind === "material"
          ? { sourceMaterialId: resourceFilter.materialId }
          : { sourceGenerationSessionId: resourceFilter.sessionId }),
        ...(sourcePdfPageForAsync != null
          ? { sourcePdfPage: sourcePdfPageForAsync }
          : {}),
      });
      window.alert(
        [
          "시험 생성을 시작했습니다.",
          "완료되면 우측 사이드바의 시험 탭 목록에 자동으로 추가됩니다.",
          "생성 중에도 다른 작업을 계속할 수 있습니다.",
        ].join("\n"),
      );
      if (courseDetail?.courseId) refetchCourseContents(courseDetail.courseId);
      setExamFormKey((k) => k + 1);
      setExamCount(10);
      setProfileFocusAreasInput("");

      if (res.taskId && courseDetail?.courseId) {
        const taskId = res.taskId;
        const courseId = courseDetail.courseId;
        setExamGenPollingTaskId(taskId);
        const pollMs = 3000;
        const maxAttempts = 200;
        const pollUntilDone = async () => {
          for (let i = 0; i < maxAttempts; i++) {
            try {
              const statusRes = await tasksApi.getStatus(taskId);
              const s = (statusRes.status || "").toUpperCase();
              if (s === "COMPLETED" || s === "DONE" || s === "SUCCESS") {
                refetchCourseContents(courseId);
                setExamGenPollingTaskId(null);
                return;
              }
              if (s === "FAILED" || s === "ERROR") {
                window.alert(statusRes.message || "시험 생성에 실패했습니다.");
                setExamGenPollingTaskId(null);
                return;
              }
            } catch {
              /* 네트워크 오류 시 다음 폴링에서 재시도 */
            }
            await new Promise((r) => setTimeout(r, pollMs));
          }
          setExamGenPollingTaskId(null);
        };
        pollUntilDone();
      }
    } catch (e) {
      window.alert(
        e instanceof Error
          ? e.message
          : "비동기 시험 생성 시작에 실패했습니다.",
      );
    } finally {
      setSubmitting(false);
    }
  },
  [
    examType,
    examCount,
    examsForActiveResource,
    examSourceMaterialId,
    previewLinkedGenerationSessionId,
    previewBlobUrl,
    previewCurrentPdfPage,
    selectedLectureId,
    examProfile,
    examProfileStatus,
    profileFocusAreasInput,
    profileTargetDepth,
    profileQuestionModality,
    profileProficiencyLevel,
    profileWeaknessFocus,
    profileLanguagePreference,
    profileScenarioBased,
    profileStrictness,
    profileExplanationDepth,
    profileScopeBoundary,
    courseDetail?.courseId,
    refetchCourseContents,
  ],
  );

  const openExamSessionDetail = React.useCallback(
    async (sessionId: string, navTitle?: string | null) => {
      suppressedExamSessionForUrlRestoreRef.current = null;
      const hadResourcePreview =
        previewFileUrl != null || previewMaterialId != null;
      if (hadResourcePreview) {
        const currentChatPanelWidth =
          resourcePreviewChatPanelRef.current?.getBoundingClientRect().width;
        if (
          currentChatPanelWidth != null &&
          Number.isFinite(currentChatPanelWidth) &&
          currentChatPanelWidth > 0
        ) {
          // 리소스 미리보기에서 사용자가 보고 있던 실제 우측 패널 폭을 그대로 유지
          setRightSidebarWidth(Math.round(currentChatPanelWidth));
        }
      }
      if (hadResourcePreview) {
        previewBeforeExamRef.current = {
          previewFileUrl,
          previewMaterialId,
          previewFileName,
          previewIsAiGenerationDoc,
          previewLinkedGenerationSessionId,
        };
      } else {
        previewBeforeExamRef.current = null;
      }
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("exam", String(sessionId));
          /* PDF/자료 맥락 유지: material·gen 제거 시 URL 복원이 깨져 리소스 목록으로 보이는 문제 방지 */
          return next;
        },
        { replace: true },
      );
      const t = navTitle != null ? String(navTitle).trim() : "";
      setPreviewFileName(t.length > 0 ? t : "시험");
      setPreviewIsAiGenerationDoc(false);
      setExamDetailSessionId(sessionId);
      examDetailSessionIdRef.current = sessionId;
      setExamDetail(null);
      setExamDetailError(null);
      setExamDetailLoading(true);
      setExamDetailFlipped({});
      setFlashCardIndex(0);
      setFiveChoiceUserAnswers({});
      setFiveChoiceLog(null);
      setOxUserAnswers({});
      setOxGraded(false);
      setOxExamViewMode("all");
      setFiveChoiceExamViewMode("all");
      setOxExamSingleIndex(0);
      setFiveChoiceSingleIndex(0);
      setShortAnswerUserAnswers({});
      setShortAnswerLog(null);
      setShortAnswerKeywordOpen({});
      setShortAnswerGrading(false);
      setShortAnswerGradeError(null);
      setExamSubmissionLoading(false);
      setExamSubmissionError(null);
      setExamSubmissionResult(null);
      try {
        const numericId = Number(sessionId);
        if (!Number.isFinite(numericId)) {
          throw new Error("유효하지 않은 시험 세션 ID입니다.");
        }
        const detail = isStudent
          ? await examGenerationApi.getStudentSession(numericId)
          : await examGenerationApi.getSession(numericId);
        setExamDetail(detail);
      } catch (e) {
        setExamDetailError(
          e instanceof Error
            ? e.message
            : "시험 세션 정보를 불러오지 못했습니다.",
        );
      } finally {
        setExamDetailLoading(false);
      }
    },
    [
      setSearchParams,
      previewFileUrl,
      previewMaterialId,
      previewFileName,
      previewIsAiGenerationDoc,
      previewLinkedGenerationSessionId,
      isStudent,
    ],
  );

  const closeExamSessionDetail = React.useCallback(() => {
    const closingId = examDetailSessionId;
    if (closingId != null) {
      suppressedExamSessionForUrlRestoreRef.current = closingId;
    }
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("exam");
        return next;
      },
      { replace: true },
    );
    setExamDetailSessionId(null);
    examDetailSessionIdRef.current = null;
    setExamDetail(null);
    setExamDetailError(null);
    setExamDetailLoading(false);
    setExamDetailFlipped({});
    setFlashCardIndex(0);
    setFiveChoiceUserAnswers({});
    setFiveChoiceLog(null);
    setOxUserAnswers({});
    setOxGraded(false);
    setOxExamViewMode("all");
    setFiveChoiceExamViewMode("all");
    setOxExamSingleIndex(0);
    setFiveChoiceSingleIndex(0);
    setShortAnswerUserAnswers({});
    setShortAnswerLog(null);
    setShortAnswerKeywordOpen({});
    setShortAnswerGrading(false);
    setShortAnswerGradeError(null);
    setExamSubmissionLoading(false);
    setExamSubmissionError(null);
    setExamSubmissionResult(null);

    const snap = previewBeforeExamRef.current;
    previewBeforeExamRef.current = null;
    if (
      snap != null &&
      (snap.previewMaterialId != null || snap.previewFileUrl != null)
    ) {
      setPreviewFileUrl(snap.previewFileUrl);
      setPreviewMaterialId(snap.previewMaterialId);
      setPreviewFileName(snap.previewFileName);
      setPreviewIsAiGenerationDoc(snap.previewIsAiGenerationDoc);
      setPreviewLinkedGenerationSessionId(snap.previewLinkedGenerationSessionId);
      if (snap.previewMaterialId != null) {
        patchResourceInUrl({ material: snap.previewMaterialId });
      } else if (snap.previewLinkedGenerationSessionId != null) {
        patchResourceInUrl({ gen: snap.previewLinkedGenerationSessionId });
      } else {
        patchResourceInUrl({});
      }
    }
  }, [setSearchParams, examDetailSessionId, patchResourceInUrl]);

  /** 시험 뷰어 + PDF/마크다운 미리보기 모두 닫기 (홈 이동·뒤로가기 공통) */
  const exitPreviewAndExamViewer = React.useCallback(() => {
    previewBeforeExamRef.current = null;
    suppressResourcePreviewRestoreRef.current = true;
    closeExamSessionDetail();
    setPreviewFileUrl(null);
    setPreviewMaterialId(null);
    setPreviewFileName(null);
    setPreviewIsAiGenerationDoc(false);
    setPreviewLinkedGenerationSessionId(null);
    setPreviewMarkdownContent(null);
    setPreviewBlobUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setPreviewLoadError(false);
    setPreviewErrorMessage(null);
    setPreviewLoading(false);
    setResourcePreviewViewerWidthPx(null);
    clearResourceParamsInUrl();
  }, [closeExamSessionDetail, clearResourceParamsInUrl]);

  const closeExamSessionDetailRef = React.useRef(closeExamSessionDetail);
  React.useEffect(() => {
    closeExamSessionDetailRef.current = closeExamSessionDetail;
  }, [closeExamSessionDetail]);

  const exitPreviewAndExamViewerRef = React.useRef(exitPreviewAndExamViewer);
  React.useEffect(() => {
    exitPreviewAndExamViewerRef.current = exitPreviewAndExamViewer;
  }, [exitPreviewAndExamViewer]);

  React.useEffect(() => {
    const handleBack = () => exitPreviewAndExamViewerRef.current();
    window.addEventListener("back-from-preview", handleBack);
    return () => window.removeEventListener("back-from-preview", handleBack);
  }, []);

  React.useEffect(() => {
    if (!registerViewerBackHandler) return;
    const run = () => {
      if (examDetailSessionIdRef.current != null) {
        closeExamSessionDetailRef.current();
      } else {
        exitPreviewAndExamViewerRef.current();
      }
    };
    registerViewerBackHandler(run);
    return () => registerViewerBackHandler(null);
  }, [registerViewerBackHandler]);

  /** 강의실 목록(/ 홈)으로만 나갈 때 뷰어 정리 — exitPreview identity 변경 때마다 호출되면 안 됨 */
  React.useEffect(() => {
    if (viewMode !== "course-list") return;
    exitPreviewAndExamViewerRef.current();
  }, [viewMode]);

  const handleExamSessionRecoverOpen = React.useCallback(() => {
    if (!selectedLectureId) {
      window.alert("먼저 왼쪽에서 강의(주차)를 선택해 주세요.");
      return;
    }
    const exams = examsForActiveResource;
    if (exams.length === 0) {
      window.alert(
        activeExamResourceFilter == null
          ? "미리보기 중인 자료가 없습니다. 자료를 연 뒤 해당 자료에 속한 시험만 복구할 수 있습니다."
          : "현재 미리보기 중인 자료에 연결된 시험이 없습니다.",
      );
      return;
    }
    setExamRecoverSelectedId(exams[0]?.examSessionId ?? "");
    setExamRecoverOpen(true);
  }, [selectedLectureId, examsForActiveResource, activeExamResourceFilter]);

  const handleExamSessionRecoverSubmit = React.useCallback(async () => {
    const id = Number(examRecoverSelectedId);
    if (!Number.isFinite(id) || id <= 0) {
      window.alert("복구할 시험을 선택해 주세요.");
      return;
    }
    setSubmitting(true);
    try {
      await examGenerationApi.recoverSession(id);
      window.alert("시험 세션이 복구되었습니다.");
      setExamRecoverOpen(false);
      setExamRecoverSelectedId("");
      if (courseDetail?.courseId) refetchCourseContents(courseDetail.courseId);
    } catch (e) {
      window.alert(
        e instanceof Error ? e.message : "시험 세션 복구에 실패했습니다.",
      );
    } finally {
      setSubmitting(false);
    }
  }, [examRecoverSelectedId, courseDetail?.courseId, refetchCourseContents]);

  const handleToggleExamSelect = React.useCallback((id: string) => {
    setSelectedExamIds((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const handleDeleteSelectedExams = React.useCallback(async () => {
    const ids = Object.keys(selectedExamIds).filter((id) => selectedExamIds[id]);
    if (ids.length === 0) {
      window.alert("삭제할 시험을 선택해 주세요.");
      return;
    }
    if (
      !window.confirm(
        `선택한 ${ids.length}개의 시험을 삭제하시겠습니까?\n(필요하면 다시 생성할 수 있습니다.)`,
      )
    ) {
      return;
    }
    setSubmitting(true);
    try {
      const exams = localExams[selectedLectureId ?? 0] ?? [];
      const toDelete = exams.filter((e) => ids.includes(e.id) && e.examSessionId);
      const examSessionIds = toDelete
        .map((e) => Number(e.examSessionId))
        .filter((id) => Number.isFinite(id) && id > 0);
      if (courseDetail?.courseId) {
        await courseApi.deleteCourseContents(courseDetail.courseId, {
          materialIds: [],
          generationSessionIds: [],
          examSessionIds,
        });
      } else {
        await Promise.all(
          examSessionIds.map((examSessionId) =>
            examGenerationApi.deleteExamSession(examSessionId),
          ),
        );
      }
      setLocalExams((prev) => {
        const list = (prev[selectedLectureId ?? 0] ?? []).filter(
          (e) => !ids.includes(e.id),
        );
        return { ...prev, [selectedLectureId ?? 0]: list };
      });
      setSelectedExamIds({});
      setExamEditMode(false);
      if (courseDetail?.courseId) refetchCourseContents(courseDetail.courseId);
    } catch (e) {
      window.alert(
        e instanceof Error ? e.message : "시험 삭제에 실패했습니다.",
      );
    } finally {
      setSubmitting(false);
    }
  }, [
    selectedExamIds,
    selectedLectureId,
    localExams,
    courseDetail?.courseId,
    refetchCourseContents,
  ]);

  const handleDeleteSingleExam = React.useCallback(
    async (examSessionId: string) => {
      try {
        await examGenerationApi.deleteExamSession(Number(examSessionId));
        setLocalExams((prev) => {
          const list = (prev[selectedLectureId ?? 0] ?? []).filter(
            (e) => String(e.examSessionId) !== examSessionId,
          );
          return { ...prev, [selectedLectureId ?? 0]: list };
        });
        if (courseDetail?.courseId) refetchCourseContents(courseDetail.courseId);
      } catch (e) {
        window.alert(
          e instanceof Error ? e.message : "시험 삭제에 실패했습니다.",
        );
      }
    },
    [selectedLectureId, courseDetail?.courseId, refetchCourseContents],
  );

  const handleToggleFlashCard = (id: number) => {
    setExamDetailFlipped((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const isLikelyMarkdownText = React.useCallback((text: string): boolean => {
    return /(^|\n)\s{0,3}(#{1,6}\s|[-*+]\s|\d+\.\s|>\s)|```|`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|\[[^\]]+\]\([^)]+\)/.test(
      text,
    );
  }, []);

  const formatPlainFlashcardText = React.useCallback((text: string): string => {
    return text
      .replace(/\.\s*/g, ".\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }, []);

  const handleFiveChoiceAnswerChange = (
    problemIndex: number,
    optionId: string,
  ) => {
    if (examSubmissionResult != null) return;
    setFiveChoiceUserAnswers((prev) => ({
      ...prev,
      [String(problemIndex)]: optionId,
    }));
  };

  const handleOxAnswerChange = (problemIndex: number, choice: OxUserChoice) => {
    if (oxGraded || examSubmissionResult != null) return;
    setOxUserAnswers((prev) => ({
      ...prev,
      [String(problemIndex)]: choice,
    }));
  };

  const handleOxGrade = () => {
    if (!examDetail?.oxProblems?.length) return;
    const allFilled = examDetail.oxProblems.every((_, idx) => {
      const c = oxUserAnswers[String(idx)];
      return c === "O" || c === "X";
    });
    if (!allFilled) return;
    setOxGraded(true);
  };

  const oxExamStats = React.useMemo(() => {
    const list = examDetail?.oxProblems;
    if (!list?.length) return null;
    const allAnswered = list.every((_, idx) => {
      const c = oxUserAnswers[String(idx)];
      return c === "O" || c === "X";
    });
    let correctCount = 0;
    if (oxGraded) {
      for (let i = 0; i < list.length; i++) {
        const u = oxUserAnswers[String(i)];
        if (u && isOxAnswerCorrect(u, list[i].correctAnswer)) correctCount++;
      }
    }
    return { list, allAnswered, correctCount, total: list.length };
  }, [examDetail?.oxProblems, oxUserAnswers, oxGraded]);

  React.useEffect(() => {
    const n = examDetail?.oxProblems?.length ?? 0;
    if (n <= 0) return;
    setOxExamSingleIndex((i) => Math.min(Math.max(0, i), n - 1));
  }, [examDetail?.oxProblems]);

  React.useEffect(() => {
    const n = examDetail?.fiveChoiceProblems?.length ?? 0;
    if (n <= 0) return;
    setFiveChoiceSingleIndex((i) => Math.min(Math.max(0, i), n - 1));
  }, [examDetail?.fiveChoiceProblems]);

  /** 시험 뷰어 열림 시 루트·html 세로 스크롤 제거 (패널 내부 스크롤만 사용) */
  React.useEffect(() => {
    if (!examDetailSessionId) return;
    const root = document.getElementById("root");
    const html = document.documentElement;
    html.style.overflowY = "hidden";
    if (root) root.style.overflowY = "hidden";
    return () => {
      html.style.removeProperty("overflow-y");
      root?.style.removeProperty("overflow-y");
    };
  }, [examDetailSessionId]);

  const fiveChoiceExamStats = React.useMemo(() => {
    const list = examDetail?.fiveChoiceProblems;
    if (!list?.length) return null;
    const allAnswered = areAllFiveChoiceAnswered(list, fiveChoiceUserAnswers);
    const graded =
      fiveChoiceLog != null &&
      fiveChoiceLog.evaluationItems.length === list.length;
    const correctCount = graded
      ? fiveChoiceLog.evaluationItems.filter(
          (e) => e.resultStatus === "Correct",
        ).length
      : 0;
    return { allAnswered, correctCount, total: list.length, graded };
  }, [examDetail?.fiveChoiceProblems, fiveChoiceUserAnswers, fiveChoiceLog]);

  const shortAnswerExamStats = React.useMemo(() => {
    const list = examDetail?.shortAnswerProblems;
    if (!list?.length) return null;
    const allAnswered = list.every(
      (_, idx) => (shortAnswerUserAnswers[String(idx)] ?? "").trim().length > 0,
    );
    const graded =
      shortAnswerLog != null &&
      shortAnswerLog.evaluationItems.length === list.length;
    let totalScoreOutOf10: number | null = null;
    if (graded && shortAnswerLog && list.length > 0) {
      const sum = shortAnswerLog.evaluationItems.reduce(
        (acc, e) => acc + e.score,
        0,
      );
      totalScoreOutOf10 = (sum / list.length) * 10;
    }
    return {
      allAnswered,
      graded,
      total: list.length,
      totalScoreOutOf10,
    };
  }, [examDetail?.shortAnswerProblems, shortAnswerUserAnswers, shortAnswerLog]);

  const studentExamSubmitStats = React.useMemo(() => {
    if (!examDetail) return { answerableCount: 0, answeredCount: 0, allAnswered: false };
    const oxCount = examDetail.oxProblems?.length ?? 0;
    const fiveCount = examDetail.fiveChoiceProblems?.length ?? 0;
    const shortCount = examDetail.shortAnswerProblems?.length ?? 0;
    const answerableCount = oxCount + fiveCount + shortCount;
    let answeredCount = 0;
    for (let i = 0; i < oxCount; i += 1) {
      const c = oxUserAnswers[String(i)];
      if (c === "O" || c === "X") answeredCount += 1;
    }
    for (let i = 0; i < fiveCount; i += 1) {
      const selected = fiveChoiceUserAnswers[String(i)];
      const options = examDetail.fiveChoiceProblems[i]?.options ?? [];
      if (selected && options.some((option) => option.id === selected)) {
        answeredCount += 1;
      }
    }
    for (let i = 0; i < shortCount; i += 1) {
      if ((shortAnswerUserAnswers[String(i)] ?? "").trim().length > 0) {
        answeredCount += 1;
      }
    }
    return {
      answerableCount,
      answeredCount,
      allAnswered: answerableCount > 0 && answeredCount === answerableCount,
    };
  }, [examDetail, fiveChoiceUserAnswers, oxUserAnswers, shortAnswerUserAnswers]);

  const examSubmissionQuestionGradings = React.useMemo(
    () => examSubmissionResult?.gradingDetails?.questionGradings ?? [],
    [examSubmissionResult],
  );

  const readExamQuestionId = React.useCallback(
    (problem: { id?: number }, fallbackIndex: number): number => {
      return typeof problem.id === "number" && Number.isFinite(problem.id)
        ? problem.id
        : fallbackIndex + 1;
    },
    [],
  );

  const handleStudentExamSubmit = React.useCallback(async () => {
    if (!isStudent || !examDetail || !examDetailSessionId) return;
    const sessionNum = Number(examDetailSessionId);
    if (!Number.isFinite(sessionNum)) {
      setExamSubmissionError("유효하지 않은 시험 세션입니다.");
      return;
    }

    const answers: ExamAnswerSubmission[] = [];
    examDetail.oxProblems?.forEach((problem, idx) => {
      const choice = oxUserAnswers[String(idx)];
      if (choice === "O" || choice === "X") {
        answers.push({
          questionId: readExamQuestionId(problem, idx),
          answerText: choice,
        });
      }
    });
    examDetail.fiveChoiceProblems?.forEach((problem, idx) => {
      const selectedOptionId = fiveChoiceUserAnswers[String(idx)];
      if (selectedOptionId) {
        answers.push({
          questionId: readExamQuestionId(problem, idx),
          selectedOptionId,
        });
      }
    });
    examDetail.shortAnswerProblems?.forEach((problem, idx) => {
      const answerText = (shortAnswerUserAnswers[String(idx)] ?? "").trim();
      if (answerText) {
        answers.push({
          questionId: readExamQuestionId(problem, idx),
          answerText,
        });
      }
    });

    if (answers.length === 0) {
      setExamSubmissionError("제출할 답안이 없습니다.");
      return;
    }

    setExamSubmissionLoading(true);
    setExamSubmissionError(null);
    try {
      const result = await examGenerationApi.submitExam({
        examSessionId: sessionNum,
        answers,
      });
      let resolvedResult = result;
      const hasFeedback =
        Boolean(result.overallFeedback?.trim()) ||
        Boolean(result.gradingDetails?.questionGradings?.length);
      if (!hasFeedback && result.examResultId > 0) {
        try {
          resolvedResult = await examGenerationApi.getExamResult(result.examResultId);
        } catch {
          resolvedResult = result;
        }
      }
      setExamSubmissionResult(resolvedResult);
    } catch (e) {
      setExamSubmissionError(
        e instanceof Error ? e.message : "시험 제출에 실패했습니다.",
      );
    } finally {
      setExamSubmissionLoading(false);
    }
  }, [
    examDetail,
    examDetailSessionId,
    fiveChoiceUserAnswers,
    isStudent,
    oxUserAnswers,
    readExamQuestionId,
    shortAnswerUserAnswers,
  ]);

  const handleFiveChoiceGrade = () => {
    if (
      !examDetail ||
      !examDetail.fiveChoiceProblems ||
      examDetail.fiveChoiceProblems.length === 0
    ) {
      return;
    }
    if (fiveChoiceLog) return;
    if (
      !areAllFiveChoiceAnswered(
        examDetail.fiveChoiceProblems,
        fiveChoiceUserAnswers,
      )
    ) {
      return;
    }
    const evaluationItems: FiveChoiceEvaluationItem[] =
      examDetail.fiveChoiceProblems.map((q, idx) => {
        const key = String(idx);
        const userChoiceId = fiveChoiceUserAnswers[key];
        const selectedOption =
          q.options?.find((opt) => opt.id === userChoiceId) ?? null;

        let resultStatus: FiveChoiceResultStatus = "Incorrect";
        let userResponse = "No Answer";

        if (selectedOption) {
          userResponse = `${selectedOption.id}. ${selectedOption.content}`;
          if (selectedOption.isCorrect) {
            resultStatus = "Correct";
          }
        }

        const relatedTopic = q.intentDiagnosis || q.questionContent;
        let feedbackMessage: string;

        if (!selectedOption) {
          feedbackMessage = "답안을 선택하지 않아 개념 이해를 평가하기 어려움.";
        } else if (resultStatus === "Correct") {
          feedbackMessage = q.intentDiagnosis
            ? `정답을 정확히 선택함. ${q.intentDiagnosis}`
            : "정답을 정확히 선택함.";
        } else {
          const intentText = selectedOption.intent || "";
          const intentPart = intentText
            ? `선택한 보기의 의도: ${intentText}`
            : "선택한 보기의 의도가 명시되어 있지 않음.";
          const diagnosisPart = q.intentDiagnosis
            ? `정답 근거: ${q.intentDiagnosis}`
            : "정답 근거는 문제의 출제 의도(intent_diagnosis)를 참고해야 함.";
          feedbackMessage = `${intentPart} ${diagnosisPart}`;
        }

        return {
          questionId: idx + 1,
          resultStatus,
          questionContent: q.questionContent,
          userResponse,
          relatedTopic,
          feedbackMessage,
        };
      });

    setFiveChoiceLog({ evaluationItems });
  };

  const handleShortAnswerInputChange = (
    problemIndex: number,
    value: string,
  ) => {
    if (shortAnswerLog || examSubmissionResult != null) return;
    setShortAnswerUserAnswers((prev) => ({
      ...prev,
      [String(problemIndex)]: value,
    }));
  };

  const handleShortAnswerGrade = React.useCallback(async () => {
    if (
      !examDetail ||
      !examDetail.shortAnswerProblems ||
      examDetail.shortAnswerProblems.length === 0
    ) {
      return;
    }
    if (shortAnswerLog) return;
    const allFilled = examDetail.shortAnswerProblems.every(
      (_, idx) => (shortAnswerUserAnswers[String(idx)] ?? "").trim().length > 0,
    );
    if (!allFilled) return;

    const sessionNum = Number(examDetailSessionId);
    if (!Number.isFinite(sessionNum)) {
      setShortAnswerGradeError("유효하지 않은 시험 세션입니다.");
      return;
    }

    const mats =
      selectedLectureId != null
        ? localMaterials[selectedLectureId] ?? []
        : [];
    const examRows =
      selectedLectureId != null ? localExams[selectedLectureId] ?? [] : [];
    const thisExam = examRows.find(
      (e) => String(e.examSessionId) === String(examDetailSessionId),
    );
    const materialId =
      examSourceMaterialId ??
      thisExam?.sourceMaterialId ??
      mats.find((m) => m.materialId != null)?.materialId ??
      null;

    setShortAnswerGrading(true);
    setShortAnswerGradeError(null);
    try {
      const res = await examGenerationApi.gradeShortAnswers(sessionNum, {
        lectureId: selectedLectureId ?? undefined,
        materialId,
        problems: examDetail.shortAnswerProblems.map((q, idx) => ({
          problemNumber: idx + 1,
          questionContent: q.questionContent ?? "",
          keyKeywords: getShortAnswerKeywordsFromProblem(q),
          gradingIntent: getShortAnswerIntentText(q),
          userAnswer: (shortAnswerUserAnswers[String(idx)] ?? "").trim(),
        })),
      });

      const byNum = new Map(
        res.results.map((r) => [r.problemNumber, r] as const),
      );
      const evaluationItems: ShortAnswerEvaluationItem[] =
        examDetail.shortAnswerProblems.map((q, idx) => {
          const key = String(idx);
          const userResponse = (shortAnswerUserAnswers[key] ?? "").trim();
          const r = byNum.get(idx + 1);
          if (!r) {
            return {
              questionId: idx + 1,
              questionContent: q.questionContent ?? "",
              userResponse: userResponse || "",
              score: 0,
              gradingReason: "서버 응답에 이 문항 채점 결과가 없습니다.",
              feedback: "",
              pointsDeducted: true,
              deductionReason: "응답 누락",
            };
          }
          return {
            questionId: idx + 1,
            questionContent: q.questionContent ?? "",
            userResponse,
            score: r.score,
            gradingReason: r.gradingReason,
            feedback: r.feedback,
            pointsDeducted: r.pointsDeducted,
            deductionReason: r.deductionReason,
          };
        });

      setShortAnswerLog({ evaluationItems });
    } catch (e) {
      setShortAnswerGradeError(
        e instanceof Error ? e.message : "채점 요청에 실패했습니다.",
      );
    } finally {
      setShortAnswerGrading(false);
    }
  }, [
    examDetail,
    examDetailSessionId,
    shortAnswerLog,
    shortAnswerUserAnswers,
    selectedLectureId,
    localMaterials,
    localExams,
    examSourceMaterialId,
    examDetailSessionId,
  ]);

  const handleAssessmentSubmit = React.useCallback(async () => {
    if (
      !courseDetail?.courseId ||
      !assessmentTitle.trim() ||
      !assessmentDueDate.trim()
    )
      return;
    setSubmitting(true);
    try {
      await assessmentApi.createAssessment(courseDetail.courseId, {
        title: assessmentTitle.trim(),
        type: assessmentType,
        dueDate: assessmentDueDate,
        questions: [{ text: "샘플 문항", type: "ESSAY" }],
      });
      const list = await assessmentApi.getAssessmentsForCourse(
        courseDetail.courseId,
      );
      setAssessments(list);
      setAssessmentModalOpen(false);
      setAssessmentTitle("");
      setAssessmentDueDate("");
      window.alert("평가가 생성되었습니다.");
    } catch (e) {
      window.alert(
        e instanceof Error ? e.message : "평가 생성에 실패했습니다.",
      );
    } finally {
      setSubmitting(false);
    }
  }, [
    courseDetail?.courseId,
    assessmentTitle,
    assessmentType,
    assessmentDueDate,
  ]);

  /** AI 생성 자료 상세: sessionId로 document API URL 반환 (상대 경로 → 프록시/동일 origin에서 동작) */
  const getMaterialDocumentPreviewUrl = React.useCallback(
    (sessionId: number) => {
      return `/api/materials/generation/${sessionId}/document`;
    },
    [],
  );

  const handleCardClick = React.useCallback(
    (item: CenterItem) => {
      if (item.type === "exam" && item.examSessionId) {
        void openExamSessionDetail(item.examSessionId, item.title ?? null);
        return;
      }
      if (item.materialId != null) {
        setPreviewMaterialId(item.materialId);
        setPreviewFileUrl(null);
        setPreviewFileName(item.title || null);
        setPreviewIsAiGenerationDoc(false);
        setPreviewLinkedGenerationSessionId(null);
        patchResourceInUrl({ material: item.materialId });
        return;
      }
      // AI 생성 자료: finalDocument(마크다운 본문)가 있으면 fetch 없이 그대로 표시
      if (typeof item.finalDocument === "string" && item.finalDocument) {
        setPreviewFileUrl(item.finalDocument);
        setPreviewMaterialId(null);
        setPreviewFileName(item.title || null);
        setPreviewIsAiGenerationDoc(true);
        const sid = parseGenerationSessionIdFromMaterialItem(item);
        setPreviewLinkedGenerationSessionId(sid);
        patchResourceInUrl(sid != null ? { gen: sid } : {});
        return;
      }
      // sessionId만 있으면 document API URL로 미리보기
      if (item.generationSessionId != null) {
        setPreviewFileUrl(
          getMaterialDocumentPreviewUrl(item.generationSessionId),
        );
        setPreviewMaterialId(null);
        setPreviewFileName(item.title || null);
        setPreviewIsAiGenerationDoc(true);
        setPreviewLinkedGenerationSessionId(item.generationSessionId);
        patchResourceInUrl({ gen: item.generationSessionId });
        return;
      }
      if (item.fileUrl) {
        const genDoc =
          item.fileUrl.includes("materials/generation") &&
          item.fileUrl.includes("/document");
        const sid = genDoc ? parseGenerationSessionIdFromMaterialItem(item) : null;
        setPreviewIsAiGenerationDoc(genDoc);
        setPreviewLinkedGenerationSessionId(sid);
        const mid = parseMaterialIdFromMaterialFileUrl(item.fileUrl);
        // URL에 material id가 있으면 상태를 materialId 기준으로 통일(시험 source와 미리보기 blob이 동일 출처)
        if (mid != null && !genDoc) {
          setPreviewMaterialId(mid);
          setPreviewFileUrl(null);
          setPreviewFileName(item.title || null);
          patchResourceInUrl({ material: mid });
          return;
        }
        setPreviewFileUrl(item.fileUrl);
        setPreviewMaterialId(null);
        setPreviewFileName(item.title || null);
        if (mid != null) patchResourceInUrl({ material: mid });
        else if (sid != null) patchResourceInUrl({ gen: sid });
        else patchResourceInUrl({});
        return;
      }
      if (item.type === "material") {
        window.alert(
          "이 항목은 API Phase1으로 생성된 기획안 초안입니다.\n\n" +
            "Phase1은 키워드 기반 기획안(DraftPlan)만 만들고, PDF 파일은 생성하지 않습니다. " +
            "PDF 문서가 필요하면 Phase 2~5를 순서대로 진행하거나, " +
            '"자료 업로드"로 직접 PDF를 올린 뒤 미리보기할 수 있습니다.',
        );
        return;
      }
      if (item.assessmentId) {
        window.alert(`평가 상세 (ID: ${item.assessmentId}) - 연동 예정`);
        return;
      }
    },
    [
      openExamSessionDetail,
      getMaterialDocumentPreviewUrl,
      patchResourceInUrl,
    ],
  );

  React.useLayoutEffect(() => {
    if (viewMode !== "course-detail" || selectedLectureId == null) return;
    if (!courseContentsLoaded || lectureResourcesLoading) return;

    const exam = searchParams.get("exam");
    if (
      exam &&
      suppressedExamSessionForUrlRestoreRef.current != null &&
      String(suppressedExamSessionForUrlRestoreRef.current) === exam
    ) {
      suppressedExamSessionForUrlRestoreRef.current = null;
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete("exam");
          return next;
        },
        { replace: true },
      );
      return;
    }
    if (!exam) {
      suppressedExamSessionForUrlRestoreRef.current = null;
    }

    const material = searchParams.get("material");
    const gen = searchParams.get("gen");

    if (suppressResourcePreviewRestoreRef.current) {
      if (material || gen) {
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            next.delete("material");
            next.delete("gen");
            return next;
          },
          { replace: true },
        );
        return;
      }
      suppressResourcePreviewRestoreRef.current = false;
    }

    if (exam) {
      if (String(examDetailSessionId ?? "") === exam) return;
      void openExamSessionDetail(exam, null);
      return;
    }

    if (examDetailSessionId) return;

    const mats = localMaterials[selectedLectureId] ?? [];

    if (material) {
      const mid = Number(material);
      if (!Number.isFinite(mid)) return;
      if (previewMaterialId === mid) return;
      const item = mats.find((i) => i.materialId === mid);
      if (item) handleCardClick(item);
      return;
    }

    if (gen) {
      const sid = Number(gen);
      if (!Number.isFinite(sid)) return;
      if (previewLinkedGenerationSessionId === sid && previewFileUrl != null) {
        return;
      }
      const item = mats.find(
        (i) =>
          i.generationSessionId === sid ||
          parseGenerationSessionIdFromMaterialItem(i) === sid,
      );
      if (item) handleCardClick(item);
    }
  }, [
    viewMode,
    selectedLectureId,
    courseContentsLoaded,
    lectureResourcesLoading,
    searchParams,
    localMaterials,
    examDetailSessionId,
    previewMaterialId,
    previewLinkedGenerationSessionId,
    previewFileUrl,
    openExamSessionDetail,
    handleCardClick,
  ]);

  const handleCourseSelect = (courseId: number) => {
    onSelectCourse(courseId);
  };

  const handleToggleCourseBulkSelect = (courseId: number) => {
    setBulkSelectedCourseIds((prev) => ({
      ...prev,
      [courseId]: !prev[courseId],
    }));
  };

  const handleCourseListBulkDelete = React.useCallback(async () => {
    const ids = Object.keys(bulkSelectedCourseIds)
      .map(Number)
      .filter((id) => bulkSelectedCourseIds[id]);
    if (ids.length === 0) {
      window.alert("삭제할 강의실을 선택해주세요.");
      return;
    }
    const ok = window.confirm(
      `선택한 ${ids.length}개의 강의실을 삭제하시겠습니까?\n(삭제된 강의실은 복구할 수 없습니다.)`,
    );
    if (!ok) return;
    const toDelete = courses.filter((c) => ids.includes(c.courseId));
    for (const course of toDelete) {
      try {
        await onDeleteCourse?.(course, { skipConfirm: true });
      } catch (e) {
        window.alert(
          e instanceof Error ? e.message : "강의실 삭제에 실패했습니다.",
        );
      }
    }
    setBulkSelectedCourseIds({});
    setCourseListEditMode(false);
  }, [bulkSelectedCourseIds, courses, onDeleteCourse]);

  const handleCreateCourse = async () => {
    const rawTitle = courseModalTitle;
    const rawDescription = courseModalDescription;
    if (!rawTitle.trim()) {
      window.alert("강의실 제목을 입력해주세요.");
      return;
    }

    try {
      const course = await courseApi.createCourse({
        title: rawTitle,
        description: rawDescription.length > 0 ? rawDescription : "설명 없음",
      });

      // 자동으로 OT 강의 생성
      try {
        const otLecture = await lectureApi.createLecture(course.courseId, {
          title: "OT",
          weekNumber: 0,
          description: "오리엔테이션",
        });

        onCourseCreated?.({
          ...course,
          lectures: [otLecture],
        });
      } catch {
        onCourseCreated?.(course);
      }

      setCourseModalTitle("");
      setCourseModalDescription("");
      setIsCourseModalOpen(false);
      window.alert("강의실이 생성되었습니다!");
      onSelectCourse(course.courseId);
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "강의실 생성에 실패했습니다.";
      window.alert(errorMsg);
    }
  };

  const openStudentCourseJoinModal = React.useCallback(() => {
    setJoinCode("");
    setJoinError(null);
    setJoinSuccess(null);
    setIsJoinModalOpen(true);
  }, []);

  React.useEffect(() => {
    if (!isStudent) return;
    window.addEventListener(
      "open-join-modal",
      openStudentCourseJoinModal as EventListener,
    );
    return () =>
      window.removeEventListener(
        "open-join-modal",
        openStudentCourseJoinModal as EventListener,
      );
  }, [isStudent, openStudentCourseJoinModal]);

  const handleJoinSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (joinSuccess) return;

    const trimmedCode = joinCode.trim();
    if (!trimmedCode) {
      setJoinError("초대 코드를 입력해주세요.");
      setJoinSuccess(null);
      return;
    }

    setIsJoining(true);
    setJoinError(null);
    setJoinSuccess(null);

    try {
      await courseApi.requestJoinByInvitationCode(trimmedCode);
      setJoinSuccess("요청이 전송되었습니다. 교사 승인 후 입장됩니다.");
      // 성공 시 내 신청 목록도 즉시 갱신
      if (myJoinRequestsOpen) {
        setMyJoinRequestsPage(0);
      }
    } catch (error) {
      const raw =
        error instanceof Error ? error.message : "가입 요청 전송에 실패했습니다.";
      const errorMsg = mapJoinRequestErrorMessage(raw);
      setJoinError(errorMsg);
    } finally {
      setIsJoining(false);
    }
  };

  const loadMyJoinRequests = React.useCallback(async () => {
    if (!isStudent || !isJoinModalOpen || !myJoinRequestsOpen) return;
    setMyJoinRequestsLoading(true);
    setMyJoinRequestsError(null);
    try {
      const res = await courseApi.getMyCourseJoinRequests({
        page: myJoinRequestsPage,
        size: 10,
        sort: "createdAt,desc",
      });
      const content = Array.isArray(res.content) ? res.content : [];
      setMyJoinRequests(content);
      setMyJoinRequestsTotalPages(Math.max(res.totalPages ?? 1, 1));
    } catch (e) {
      setMyJoinRequestsError(
        e instanceof Error ? e.message : "내 가입 신청 목록을 불러오지 못했습니다.",
      );
      setMyJoinRequests([]);
      setMyJoinRequestsTotalPages(1);
    } finally {
      setMyJoinRequestsLoading(false);
    }
  }, [isStudent, isJoinModalOpen, myJoinRequestsOpen, myJoinRequestsPage]);

  React.useEffect(() => {
    void loadMyJoinRequests();
  }, [loadMyJoinRequests]);

  const handleAddLectureSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseDetail?.courseId || !onLectureCreated) return;
    const weekNum = Number(addLectureWeekNumber.trim());
    const title = addLectureTitle.trim();
    if (!Number.isFinite(weekNum) || weekNum < 0) {
      window.alert("주차 번호는 0 이상의 숫자를 입력해주세요.");
      return;
    }
    if (!title) {
      window.alert("제목을 입력해주세요.");
      return;
    }
    const exists = (courseDetail.lectures || []).some(
      (l) => l.weekNumber === weekNum,
    );
    if (exists) {
      window.alert(`${weekNum}주차는 이미 존재합니다.`);
      return;
    }
    setAddLectureSubmitting(true);
    try {
      const lecture = await lectureApi.createLecture(courseDetail.courseId, {
        title,
        weekNumber: weekNum,
        description: "",
      });
      await onLectureCreated(lecture);
      // 새로 만든 주차를 즉시 선택해 상세 화면으로 이동
      onSelectLecture?.(lecture.lectureId);
      refetchCourseContents(courseDetail.courseId);
      setAddLectureModalOpen(false);
      setAddLectureWeekNumber("");
      setAddLectureTitle("");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "강의 추가에 실패했습니다.";
      window.alert(msg);
    } finally {
      setAddLectureSubmitting(false);
    }
  };

  const handleEditCourseMetaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseDetail?.courseId) return;
    const rawTitle = editCourseMetaTitle;
    const rawDescription = editCourseMetaDescription;
    if (!rawTitle.trim()) {
      window.alert("강의실 제목은 비워둘 수 없습니다.");
      return;
    }
    if (rawTitle.length > MAX_COURSE_TITLE_LEN) {
      window.alert(
        `강의실 제목은 ${MAX_COURSE_TITLE_LEN}자 이내로 입력해주세요. (현재 ${rawTitle.length}자)`,
      );
      return;
    }
    if (rawDescription.length > MAX_COURSE_DESCRIPTION_LEN) {
      window.alert(
        `강의실 설명은 ${MAX_COURSE_DESCRIPTION_LEN}자 이내로 입력해주세요. (현재 ${rawDescription.length}자)`,
      );
      return;
    }
    setEditCourseMetaSaving(true);
    try {
      let result: { success: boolean; error?: string };
      if (onUpdateCourse) {
        result = await onUpdateCourse(courseDetail.courseId, {
          title: rawTitle,
          description: rawDescription,
        });
      } else {
        try {
          await courseApi.updateCourse(courseDetail.courseId, {
            title: rawTitle,
            description: rawDescription,
          });
          result = { success: true };
        } catch (err) {
          result = {
            success: false,
            error:
              err instanceof Error
                ? err.message
                : "강의실 수정에 실패했습니다.",
          };
        }
      }
      if (!result.success) {
        window.alert(result.error ?? "강의실 수정에 실패했습니다.");
        return;
      }
      if (onReloadCourseDetail) {
        await onReloadCourseDetail();
      }
      setEditCourseMetaModalOpen(false);
    } finally {
      setEditCourseMetaSaving(false);
    }
  };

  const renderCourseList = () => {
    const displayName = user?.fullName?.trim() || "사용자";
    const roleLabel = isTeacher ? "선생님" : isStudent ? "학생" : "";
    const greetingName = `${displayName}${roleLabel ? ` ${roleLabel}` : ""}`;
    const actionButtonBase =
      "flex h-10 w-full items-center justify-start gap-2 rounded-lg px-3 text-xs font-semibold transition-all duration-200";
    const courseListPrimaryPillCn = `${actionButtonBase} ${
      isDarkMode
        ? "bg-[#ffad9b] text-[#071829] hover:bg-[#ffd0c6]"
        : "bg-[#003c33] text-white hover:bg-[#071829]"
    }`;

    if (isCoursesLoading) {
      return (
        <div
          className={`h-full flex items-center justify-center ${
            isDarkMode ? "text-gray-400" : "text-gray-500"
          }`}
        >
          <div className="text-center">
            <p className="text-lg font-medium mb-2">
              강의실 목록을 불러오는 중...
            </p>
            <p className="text-sm">잠시만 기다려주세요.</p>
          </div>
        </div>
      );
    }

    // 에러가 있어도 에러 메시지를 표시하지 않음 (빈 목록으로 처리)

    const courseListEditToggleClasses = courseListEditMode
      ? isDarkMode
        ? "bg-[#ffad9b] text-[#071829] hover:bg-[#ffd0c6]"
        : "bg-[#003c33] text-white hover:bg-[#071829]"
      : isDarkMode
        ? "bg-white/10 text-gray-200 hover:bg-white/15"
        : "bg-[#eeece7] text-[#212121] hover:bg-[#e1ded6]";

    const renderCourseListEditToggleButton = () =>
      !isTeacher ? null : (
        <button
          type="button"
          aria-pressed={courseListEditMode}
          aria-label={
            courseListEditMode
              ? "강의실 편집 종료"
              : "강의실 수정·삭제를 위한 편집 모드"
          }
          title={
            courseListEditMode
              ? "편집 모드를 종료합니다"
              : "카드에서 강의실을 수정하거나 삭제합니다"
          }
          onClick={() => setCourseListEditMode((v) => !v)}
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full cursor-pointer transition-colors ${courseListEditToggleClasses}`}
        >
          <span className="sr-only">
            {courseListEditMode ? "편집 완료" : "강의실 편집"}
          </span>
          {courseListEditMode ? (
            <CheckIcon className="h-5 w-5" />
          ) : (
            <EditIcon
              className={`h-5 w-5 ${isDarkMode ? "text-[#ff824d]" : ""}`}
            />
          )}
        </button>
      );

    const renderCourseListSortButton = () => (
      <button
        type="button"
        onClick={() => {
          const next = courseListSortOrder === "recent" ? "name" : "recent";
          onCourseListSortOrderChange?.(next);
        }}
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-colors ${
          isDarkMode
            ? "bg-white/10 text-gray-200 hover:bg-white/15 hover:text-white"
            : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900"
        }`}
        aria-label={
          courseListSortOrder === "recent" ? "이름순으로 정렬" : "최신순으로 정렬"
        }
        title={
          courseListSortOrder === "recent" ? "이름순으로 정렬" : "최신순으로 정렬"
        }
      >
        {courseListSortOrder === "recent" ? (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`h-5 w-5 ${isDarkMode ? "text-[#ff824d]" : ""}`}
            aria-hidden="true"
          >
            <path d="M4 6h9" />
            <path d="M4 10h7" />
            <path d="M4 14h5" />
            <path d="M17 6v12" />
            <path d="M14 15l3 3 3-3" />
          </svg>
        ) : (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`h-5 w-5 ${isDarkMode ? "text-[#ff824d]" : ""}`}
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
        )}
      </button>
    );

    return (
      <div className="flex h-full min-h-0 flex-col">
          <div
            className={`flex-1 flex flex-col min-h-0 overflow-hidden ${
            isDarkMode ? "bg-[#181818]" : "bg-[#fbfaf7]"
          }`}
        >
          <div
            className={`hidden justify-between border-b ${
              isDarkMode ? "border-zinc-700" : "border-gray-200"
            }`}
          >
            <div className="flex-1" />
          </div>
          <div className="flex flex-1 min-h-0 overflow-hidden">
            <aside
              className={`hidden w-[var(--app-course-list-sidebar-width)] shrink-0 border-r px-6 py-6 md:block ${
              isDarkMode
                  ? "border-[#1b3443] text-gray-200"
                  : "border-[#d9d9dd] text-[#212121]"
              }`}
            >
              <div className="flex h-full flex-col gap-4">
                <section className="flex flex-col gap-3">
                  {isTeacher && (
                    <button
                      type="button"
                      onClick={() =>
                        window.dispatchEvent(new Event("open-course-modal"))
                      }
                      className={courseListPrimaryPillCn}
                      aria-label="강의실 만들기"
                      title="강의실 만들기"
                    >
                      <svg
                        className="h-6 w-6 shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          d="M12 5v14M5 12h14"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                        />
                      </svg>
                      <span>강의실 만들기</span>
                    </button>
                  )}
                  {!isTeacher && (
                    <button
                      type="button"
                      onClick={openStudentCourseJoinModal}
                      className={courseListPrimaryPillCn}
                      aria-label="초대 코드로 강의실 참여"
                      title="초대 코드를 입력해 강의실에 참여 신청합니다"
                    >
                      <UsersIcon className="h-6 w-6 shrink-0" />
                      <span>강의실 참여</span>
                    </button>
                  )}
                </section>

                <div
                  className={`h-px ${
                    isDarkMode ? "bg-[#1b3443]" : "bg-[#d9d9dd]"
                  }`}
                />

                <section className="grid grid-cols-2 gap-3">
                  {isTeacher && (
                    <div className="flex flex-col items-center gap-2">
                      {renderCourseListEditToggleButton()}
                      <span
                        className={`text-xs ${
                          isDarkMode ? "text-gray-400" : "text-gray-500"
                        }`}
                      >
                        편집
                      </span>
                    </div>
                  )}
                  <div className="flex flex-col items-center gap-2">
                    {renderCourseListSortButton()}
                    <span
                      className={`text-xs ${
                        isDarkMode ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      정렬
                    </span>
                  </div>
                </section>

                {coursesPage && coursesPage.totalPages > 1 && (
                  <section className="mt-auto flex items-center gap-2">
                    <button
                      type="button"
                      disabled={coursesPage.first}
                      onClick={() =>
                        onCourseListPageChange?.(Math.max(0, courseListPage - 1))
                      }
                      className={`flex-1 rounded-lg px-2 py-1.5 text-xs transition-colors ${
                        coursesPage.first
                          ? "opacity-40 cursor-not-allowed"
                          : isDarkMode
                            ? "bg-zinc-800 text-gray-200 hover:bg-zinc-700"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      이전
                    </button>
                    <button
                      type="button"
                      disabled={coursesPage.last}
                      onClick={() =>
                        onCourseListPageChange?.(
                          Math.min(coursesPage.totalPages - 1, courseListPage + 1),
                        )
                      }
                      className={`flex-1 rounded-lg px-2 py-1.5 text-xs transition-colors ${
                        coursesPage.last
                          ? "opacity-40 cursor-not-allowed"
                          : isDarkMode
                            ? "bg-zinc-800 text-gray-200 hover:bg-zinc-700"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      다음
                    </button>
                  </section>
                )}
              </div>
            </aside>

            <div
              className={`flex-1 min-w-0 overflow-y-auto px-6 py-6 ${
                isDarkMode ? "text-gray-200" : "text-[#212121]"
              }`}
            >
              {isTeacher ? (
                <div className="mb-3 md:hidden flex items-center justify-end gap-2">
                  {renderCourseListEditToggleButton()}
                  {renderCourseListSortButton()}
                </div>
              ) : isStudent ? (
                <div className="mb-3 md:hidden">
                  <button
                    type="button"
                    onClick={openStudentCourseJoinModal}
                    className={courseListPrimaryPillCn}
                    aria-label="초대 코드로 강의실 참여"
                  >
                    강의실 참여
                  </button>
                </div>
              ) : null}
              <div
                className={`mb-3 rounded-xl border px-4 py-3 ${
                  isDarkMode
                    ? "border-[#1b4d44] bg-[#0b241f]"
                    : "border-[#d9d9dd] bg-[#eeece7]"
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border text-2xl ${
                        isDarkMode
                          ? "border-[#2c5a50] bg-white/[0.05]"
                          : "border-[#b6dec6] bg-[#edfce9]"
                      }`}
                      aria-hidden="true"
                    >
                      👋
                    </div>
                    <div className="min-w-0">
                      <p
                        className={`truncate text-2xl font-semibold xl:text-3xl ${
                          isDarkMode ? "text-gray-100" : "text-gray-900"
                        }`}
                      >
                        {greetingName}, 반갑습니다
                      </p>
                      <p
                        className={`mt-1 text-sm ${
                          isDarkMode ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        강의실을 선택하면 자료를 확인하고 학습을 시작할 수 있어요.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              {sortedCourses.length === 0 ? (
                <div
                  className={`flex flex-col items-center justify-center px-3 py-10 text-center rounded-xl border ${
                    isDarkMode
                      ? "border-[#1b3443] bg-[#0b241f] text-gray-300"
                      : "border-[#d9d9dd] bg-[#eeece7] text-gray-600"
                  }`}
                >
                  <p
                    className={`text-lg font-medium ${
                      isDarkMode ? "text-gray-100" : "text-gray-900"
                    }`}
                  >
                    등록된 강의실이 없습니다.
                  </p>
                  <p className="mt-2 text-sm max-w-md mx-auto leading-relaxed">
                    {isStudent
                      ? "화면 왼쪽(좁은 기기에서는 목록 위쪽)의 「강의실 참여」에서 초대 코드로 신청하면, 승인 후 목록에 표시됩니다."
                      : isTeacher
                        ? "왼쪽의 「강의실 만들기」로 새 강의실을 만들 수 있습니다."
                        : "강의실이 없습니다."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {sortedCourses.map((course, index) => {
                    return (
                      <div
                        key={course.courseId}
                        role="button"
                        tabIndex={courseListEditMode ? -1 : 0}
                        onMouseDown={(e) => {
                          if (courseListEditMode) e.preventDefault();
                        }}
                        onClick={() => {
                          if (courseListEditMode) return;
                          handleCourseSelect(course.courseId);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            if (courseListEditMode) return;
                            handleCourseSelect(course.courseId);
                          }
                        }}
                        className={`group relative flex min-h-52 cursor-pointer overflow-hidden rounded-xl text-left transition-all duration-200 focus:outline-none ${
                          isDarkMode
                            ? "border border-[#1b3443] bg-[#071829] hover:border-[#2c5a50] hover:bg-[#0b241f]"
                            : "border border-[#d9d9dd] bg-white hover:border-[#1863dc] hover:bg-[#f1f5ff]"
                        } ${
                          courseListEditMode ? "cursor-default" : ""
                        }`}
                      >
                        {isTeacher && courseListEditMode && (
                          <div className="absolute inset-0 z-20 flex items-center justify-center">
                            {/* dim */}
                            <div
                              className={`absolute inset-0 ${
                                isDarkMode ? "bg-white/6" : "bg-black/15"
                              }`}
                              aria-hidden="true"
                            />
                            {/* actions */}
                            <div className="relative flex items-center gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  onEditCourse?.(course);
                                }}
                                className={`flex items-center justify-center w-9 h-9 rounded-full transition-colors ${
                                  isDarkMode
                                    ? "text-white bg-black/40 hover:bg-black/55"
                                    : "text-gray-800 bg-white/80 hover:bg-white"
                                }`}
                                aria-label="강의실 수정"
                                title="강의실 수정"
                              >
                                <EditIcon className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  onDeleteCourse?.(course);
                                }}
                                className={`flex items-center justify-center w-9 h-9 rounded-full transition-colors ${
                                  isDarkMode
                                    ? "text-red-200 bg-black/40 hover:bg-black/55"
                                    : "text-red-600 bg-white/80 hover:bg-white"
                                }`}
                                aria-label="강의실 삭제"
                                title="강의실 삭제"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )}
                        <div className="flex h-full min-w-0 flex-1 flex-col p-4">
                          <div className="mb-4">
                            <CourseCardVisualIcon index={index} />
                          </div>
                          <div className="flex items-start justify-between gap-3">
                            <h3
                              className={`line-clamp-2 flex-1 text-lg font-semibold ${
                                isDarkMode ? "text-gray-100" : "text-gray-900"
                              }`}
                            >
                              {course.title}
                            </h3>
                          </div>
                          <p
                            className={`mt-2 line-clamp-3 min-h-12 text-sm leading-5 ${
                              isDarkMode ? "text-gray-400" : "text-gray-600"
                            }`}
                          >
                            {course.description || "강의 자료와 학습 활동을 한곳에서 관리합니다."}
                          </p>
                          <div
                            className={`mt-auto border-t pt-3 text-xs ${
                              isDarkMode
                                ? "border-[#1b3443] text-gray-400"
                                : "border-[#d9d9dd] text-gray-500"
                            }`}
                          >
                            생성 시간 {formatIsoInstantForKo(course.createdAt)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleCopyInvitationCodeSilent = React.useCallback(async (): Promise<boolean> => {
    if (!courseDetail?.invitationCode) return false;
    const code = courseDetail.invitationCode;
    try {
      await navigator.clipboard.writeText(code);
      return true;
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = code;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      try {
        return document.execCommand("copy");
      } catch {
        return false;
      } finally {
        document.body.removeChild(textArea);
      }
    }
  }, [courseDetail?.invitationCode]);

  const handleCopyCourseId = React.useCallback(async () => {
    if (courseDetail?.courseId == null) return;
    const id = String(courseDetail.courseId);
    try {
      await navigator.clipboard.writeText(id);
      window.alert("강의실 ID가 클립보드에 복사되었습니다!");
    } catch (err) {
      const textArea = document.createElement("textarea");
      textArea.value = id;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        window.alert("강의실 ID가 클립보드에 복사되었습니다!");
      } catch (e) {
        window.alert(`강의실 ID: ${id}`);
      }
      document.body.removeChild(textArea);
    }
  }, [courseDetail?.courseId]);

  const renderCourseDetail = () => {
    if (isCourseDetailLoading) {
      return (
        <div
          className={`h-full flex items-center justify-center ${
            isDarkMode ? "text-gray-400" : "text-gray-500"
          }`}
        >
          <div className="text-center">
            <p className="text-lg font-medium mb-2">
              강의실 정보를 불러오는 중...
            </p>
            <p className="text-sm">잠시만 기다려주세요.</p>
          </div>
        </div>
      );
    }

    if (courseDetailError || !courseDetail) {
      return (
        <div
          className={`h-full flex items-center justify-center ${
            isDarkMode ? "text-red-400" : "text-red-600"
          }`}
        >
          <div className="text-center space-y-2">
            <p className="text-lg font-medium">
              강의실 정보를 불러오지 못했습니다.
            </p>
            {courseDetailError && (
              <p className="text-sm">{courseDetailError}</p>
            )}
            <button
              type="button"
              onClick={onBackToCourses}
              className={`mt-2 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg cursor-pointer ${
                isDarkMode
                  ? "bg-gray-800 hover:bg-zinc-700 text-white"
                  : "bg-gray-200 hover:bg-zinc-200 text-gray-800"
              }`}
            >
              강의실 목록으로 돌아가기
            </button>
          </div>
        </div>
      );
    }

    // 선택된 강의가 OT(0주차)인지 확인
    const selectedLecture = courseDetail.lectures?.find(
      (lecture) => lecture.lectureId === selectedLectureId,
    );
    const weekNumbers = Array.from(
      new Set((courseDetail.lectures || []).map((lec) => lec.weekNumber)),
    ).sort((a, b) => {
      if (a === 0) return -1;
      if (b === 0) return 1;
      return a - b;
    });
    const lectureBulkEditToggleClasses = bulkEditMode
      ? isDarkMode
        ? "bg-[#ff9b6a] text-[#181818] hover:bg-[#ffad9b]"
        : "bg-[#ff824d] text-white hover:bg-[#f26f37]"
      : isDarkMode
        ? "bg-white/10 text-gray-200 hover:bg-white/15"
        : "bg-[#f4f1eb] text-[#212121] hover:bg-[#ebe6dc]";
    const detailActionBase =
      "flex h-9 w-full min-w-0 items-center justify-start gap-2 rounded-lg px-3 text-sm font-semibold transition-colors duration-150";
    const weekResourceActionClass = (active = false, primary = false) =>
      `inline-flex h-8 min-w-0 items-center justify-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-colors ${
        primary
          ? isDarkMode
            ? "border-[#ff9b6a] bg-[#ff9b6a] text-[#181818] hover:bg-[#ffad9b]"
            : "border-[#ff824d] bg-[#ff824d] text-white hover:bg-[#f26f37]"
          : active
            ? isDarkMode
              ? "border-[#ff9b6a] bg-[#ff9b6a]/12 text-[#ffad9b]"
              : "border-[#ff824d] bg-[#fff2eb] text-[#ff824d]"
            : isDarkMode
              ? "border-[#343434] bg-[#202020] text-gray-100 hover:bg-[#252525]"
              : "border-[#dedbd5] bg-white text-[#212121] hover:bg-[#f7f5f1]"
      }`;
    const openWeekBoardPanel = (nextTab: "notices" | "discussions") => {
      if (!selectedLecture) {
        window.alert("강의(주차)를 먼저 선택해주세요.");
        return;
      }
      setTeacherMainPanel("materials");
      setWeekBoardTab(nextTab);
    };

    // 업로드한 자료 미리보기 (좌: 미리보기 | 우: 채팅) — fileUrl 또는 materialId로 표시
    const secondaryPanelItems: Array<{
      key: "attendance";
      label: string;
      iconPath: string;
    }> = [
      ...(!isTeacher
        ? [
            {
              key: "attendance" as const,
              label: "내 출석",
              iconPath:
                "M8 7V4m8 3V4M5 11h14M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm5 11 2 2 4-5",
            },
          ]
        : []),
    ];

    const otherSecondaryPanelItems = secondaryPanelItems;
    const reportPanelItems = isTeacher
      ? [
          {
            key: "classroomReport" as typeof teacherMainPanel,
            label: "강의실 리포트",
            iconPath:
              "M4 19V5m5 14V9m5 10V4m5 15v-7M3 19h18",
          },
        ]
      : [];

    const courseSidebarButtonClass = (active: boolean) =>
      `${detailActionBase} border ${
        active
          ? isDarkMode
            ? "border-[#ff9b6a] bg-[#ff9b6a] text-[#181818]"
            : "border-[#ff824d] bg-[#ff824d] text-white"
          : isDarkMode
            ? "border-[#343434] bg-[#202020] text-gray-100 hover:border-[#4a4a4a] hover:bg-[#252525]"
            : "border-[#dedbd5] bg-white text-[#212121] hover:border-[#cfcac1] hover:bg-[#f7f5f1]"
      }`;
    const courseSidebarIconClass = (active: boolean) =>
      `h-3.5 w-3.5 shrink-0 ${
        active
          ? isDarkMode
            ? "text-[#181818]"
            : "text-white"
          : isDarkMode
            ? "text-[#ff824d]"
            : "text-gray-600"
      }`;

    const openPanelFromPreview = (panel: typeof teacherMainPanel) => {
      setTeacherMainPanel(panel);
      exitPreviewAndExamViewer();
    };

    const selectLectureFromPreview = (lectureId: number) => {
      setTeacherMainPanel("materials");
      exitPreviewAndExamViewer();
      onSelectLecture?.(lectureId);
    };

    const renderCourseSidebarIcon = (iconPath: string, active: boolean) => (
      <svg
        className={courseSidebarIconClass(active)}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          d={iconPath}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
        />
      </svg>
    );

    const openSidebarPanel = (
      panel: typeof teacherMainPanel,
      source: "detail" | "preview",
    ) => {
      if (source === "preview") {
        openPanelFromPreview(panel);
        return;
      }
      setTeacherMainPanel((current) =>
        current === panel ? "materials" : panel,
      );
    };

    const selectSidebarLecture = (
      lectureId: number,
      source: "detail" | "preview",
    ) => {
      if (source === "preview") {
        selectLectureFromPreview(lectureId);
        return;
      }
      onSelectLecture?.(lectureId);
    };

    const renderCourseNavigationSidebar = (source: "detail" | "preview") => {
      const isPreview = source === "preview";
      const asideVisibility = isPreview
        ? "hidden w-[var(--app-resource-preview-sidebar-width)] lg:flex"
        : "hidden w-[var(--app-course-detail-sidebar-width)] md:flex";
      const ariaLabel = isPreview ? "강의자료 탐색" : "강의실 탐색";

      return (
        <aside
          className={`${asideVisibility} shrink-0 flex-col gap-5 border-r px-3 pb-3 pt-5 min-h-0 ${
            isDarkMode
              ? "border-[#2b2b2b] bg-[#181818] text-gray-200"
              : "border-[#dedbd5] bg-[#fbfaf7] text-[#212121]"
          }`}
          aria-label={ariaLabel}
        >
          {isTeacher ? (
            <div className="shrink-0 flex flex-col gap-3">
              <section className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setWeekBoardTab(null);
                    if (isPreview) {
                      openPanelFromPreview("materials");
                    } else {
                      setTeacherMainPanel("materials");
                    }
                  }}
                  className={courseSidebarButtonClass(
                    teacherMainPanel === "materials" && weekBoardTab == null,
                  )}
                  aria-pressed={
                    teacherMainPanel === "materials" && weekBoardTab == null
                  }
                >
                  {renderCourseSidebarIcon(
                    "M5 6h14M5 12h14M5 18h9",
                    teacherMainPanel === "materials" && weekBoardTab == null,
                  )}
                  <span>자료 목록</span>
                </button>
                {reportPanelItems.length > 0 ? (
                  <div
                    className={`grid gap-2 ${
                      reportPanelItems.length > 1 ? "grid-cols-2" : "grid-cols-1"
                    }`}
                  >
                    {reportPanelItems.map((item) => {
                      const active = teacherMainPanel === item.key;
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => openSidebarPanel(item.key, source)}
                          className={courseSidebarButtonClass(active)}
                          aria-pressed={active}
                        >
                          {renderCourseSidebarIcon(item.iconPath, active)}
                          <span className="truncate">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => openSidebarPanel("studentManagement", source)}
                    className={courseSidebarButtonClass(
                      teacherMainPanel === "studentManagement",
                    )}
                    aria-label="학생 관리"
                    aria-pressed={teacherMainPanel === "studentManagement"}
                    title="메인 영역에서 수강 학생을 관리합니다. 다시 누르면 강의 자료로 전환합니다."
                  >
                    <UsersIcon
                      className={courseSidebarIconClass(
                        teacherMainPanel === "studentManagement",
                      )}
                    />
                    <span className="truncate">학생 관리</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openSidebarPanel("attendance", source)}
                    className={courseSidebarButtonClass(
                      teacherMainPanel === "attendance",
                    )}
                    aria-label="출석 관리"
                    aria-pressed={teacherMainPanel === "attendance"}
                    title="메인 영역에서 출석 회차를 관리합니다. 다시 누르면 강의 자료로 전환합니다."
                  >
                    {renderCourseSidebarIcon(
                      "M8 7V4m8 3V4M5 11h14M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm5 11 2 2 4-5",
                      teacherMainPanel === "attendance",
                    )}
                    <span className="truncate">출석 관리</span>
                  </button>
                </div>
              </section>
            </div>
          ) : null}
          {otherSecondaryPanelItems.length > 0 ? (
            <section className="flex shrink-0 flex-col gap-1.5">
              {otherSecondaryPanelItems.map((item) => {
                const active = teacherMainPanel === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() =>
                      setTeacherMainPanel(item.key as typeof teacherMainPanel)
                    }
                    className={courseSidebarButtonClass(active)}
                    aria-pressed={active}
                  >
                    {renderCourseSidebarIcon(item.iconPath, active)}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </section>
          ) : null}
          <section
            className={`shrink-0 border-t pt-5 ${
              isDarkMode ? "border-[#2b2b2b]" : "border-[#dedbd5]"
            }`}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <span
                className={`text-xs font-semibold ${
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                주차 목록
              </span>
              {isTeacher && !isPreview ? (
                <button
                  type="button"
                  aria-pressed={bulkEditMode}
                  aria-label={
                    bulkEditMode
                      ? "강의·자료 편집 모드 종료"
                      : "강의·자료 수정/삭제 모드"
                  }
                  title={
                    bulkEditMode
                      ? "일반 보기로 돌아갑니다"
                      : "주차·자료를 수정하거나 삭제합니다"
                  }
                  onClick={() => setBulkEditMode((v) => !v)}
                  className={`inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-[10px] font-semibold transition-colors ${lectureBulkEditToggleClasses}`}
                >
                  {bulkEditMode ? (
                    <CheckIcon className="h-3 w-3" />
                  ) : (
                    <EditIcon
                      className={`h-3 w-3 ${
                        isDarkMode ? "text-[#ff824d]" : ""
                      }`}
                    />
                  )}
                  <span>{bulkEditMode ? "완료" : "편집"}</span>
                </button>
              ) : null}
            </div>
            <nav
              className="flex flex-col gap-1 overflow-visible"
              aria-label="주차"
            >
              {weekNumbers.map((week) => {
                const label = week === 0 ? "OT" : `${week}주차`;
                const lec = courseDetail?.lectures?.find(
                  (l) => l.weekNumber === week,
                );
                const lectureTitle = lec?.title?.trim();
                const showLectureTitle = !!lectureTitle && lectureTitle !== label;
                const weekEditingEnabled = !isPreview && bulkEditMode;
                const isActiveChip =
                  !weekEditingEnabled &&
                  selectedLecture &&
                  selectedLecture.weekNumber === week;
                const isActiveWeek =
                  selectedLecture && selectedLecture.weekNumber === week;
                const weekEditRow =
                  isTeacher &&
                  weekEditingEnabled &&
                  lec != null &&
                  onEditLecture &&
                  onDeleteLecture;
                const rowInactive = isDarkMode
                  ? "border border-[#343434] bg-[#202020] text-gray-200 hover:bg-[#252525]"
                  : "border border-[#dedbd5] bg-white text-[#212121] hover:bg-[#f7f5f1]";
                const rowActive = isDarkMode
                  ? "border border-[#ff9b6a] bg-[#ff9b6a] text-[#181818]"
                  : "border border-[#ff824d] bg-[#ff824d] text-[#FFFFFF]";
                if (weekEditRow) {
                  return (
                    <div
                      key={week}
                      className={`flex h-9 w-full items-center gap-1 rounded-xl pl-3 pr-1 text-sm font-semibold transition-colors ${
                        isActiveWeek ? rowActive : rowInactive
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => lec && selectSidebarLecture(lec.lectureId, source)}
                        className="flex min-h-0 min-w-0 flex-1 items-center gap-2 truncate py-0 text-left"
                      >
                        <span className="w-12 shrink-0 text-left tabular-nums">
                          {label}
                        </span>
                        {showLectureTitle ? (
                          <span className="min-w-0 truncate text-xs font-medium opacity-75">
                            {lectureTitle}
                          </span>
                        ) : null}
                      </button>
                      <div className="flex shrink-0 items-center gap-0.5 pr-0.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onEditLecture?.(lec);
                          }}
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors ${
                            isDarkMode
                              ? "text-[#ff824d] bg-black/35 hover:bg-black/50"
                              : "text-gray-800 bg-white/80 hover:bg-white"
                          }`}
                          aria-label={`${label} 수정`}
                          title="강의 수정"
                        >
                          <EditIcon className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            void onDeleteLecture?.(lec.lectureId);
                          }}
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors ${
                            isDarkMode
                              ? "text-[#ff824d] bg-black/35 hover:bg-black/50"
                              : "text-[#ff824d] bg-white/80 hover:bg-white"
                          }`}
                          aria-label={`${label} 삭제`}
                          title="강의 삭제"
                        >
                          <TrashIcon className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                }
                return (
                  <button
                    key={week}
                    type="button"
                    disabled={!lec}
                    onClick={() => {
                      if (lec) selectSidebarLecture(lec.lectureId, source);
                    }}
                    className={`flex h-9 w-full items-center gap-2 px-3 rounded-xl text-left text-sm font-semibold cursor-pointer transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                      isActiveChip ? rowActive : rowInactive
                    }`}
                  >
                    <span className="w-12 shrink-0 text-left tabular-nums">
                      {label}
                    </span>
                    {showLectureTitle ? (
                      <span className="min-w-0 truncate text-xs font-medium opacity-75">
                        {lectureTitle}
                      </span>
                    ) : null}
                  </button>
                );
              })}
              {!weekNumbers.length && (
                <p
                  className={`text-xs xl:text-sm px-2 ${
                    isDarkMode ? "text-gray-500" : "text-gray-400"
                  }`}
                >
                  등록된 강의가 없습니다.
                </p>
              )}
            </nav>
            {isTeacher && !isPreview ? (
              <button
                type="button"
                onClick={() => setAddLectureModalOpen(true)}
                className={`mt-2 flex h-9 w-full shrink-0 items-center justify-center gap-2 rounded-lg border border-dashed bg-transparent px-3 text-sm font-semibold transition-colors ${
                  isDarkMode
                    ? "border-white/20 text-gray-400 hover:border-white/35 hover:bg-white/[0.03] hover:text-gray-200"
                    : "border-[#d3cec6] text-gray-500 hover:border-gray-400 hover:bg-[#f5f1ec] hover:text-gray-700"
                }`}
              >
                <svg
                  className="h-3.5 w-3.5 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    d="M12 5v14M5 12h14"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                  />
                </svg>
                <span>주차 추가</span>
              </button>
            ) : null}
          </section>
        </aside>
      );
    };

    if (previewFileUrl || previewMaterialId != null || examDetailSessionId) {
      const hasResourcePreviewContext =
        previewFileUrl != null || previewMaterialId != null;
      const isResourceDocPreview =
        !examDetailSessionId && hasResourcePreviewContext;
      const showResourcePreviewSidebar = true;
      const usePdfLearningPanelStyle =
        isResourceDocPreview || examDetailSessionId != null;
      const previewShellClass = isDarkMode ? "bg-[#181818]" : "bg-[#fbfaf7]";
      return (
        <div className={`flex flex-col h-full min-w-0 overflow-hidden ${previewShellClass}`}>
          <div
            className="flex-1 flex min-h-0 min-w-0 overflow-hidden"
          >
            {showResourcePreviewSidebar ? renderCourseNavigationSidebar("preview") : null}
            <div
              ref={resourcePreviewSplitRowRef}
              className="flex min-h-0 min-w-0 flex-1 overflow-hidden"
            >
            {/* 좌: 미리보기 (PDF·MD: 기본 3:2, 구분선 드래그로 너비 조절) */}
            <div
              ref={resourcePreviewViewerPanelRef}
              className={`min-h-0 min-w-0 ${previewShellClass} flex flex-col overflow-hidden ${
                isResourceDocPreview
                  ? resourcePreviewViewerWidthPx != null
                    ? "shrink-0"
                    : "min-w-0"
                  : "flex-1"
              }`}
              style={
                isResourceDocPreview && resourcePreviewViewerWidthPx != null
                  ? {
                      width: resourcePreviewViewerWidthPx,
                      minWidth: RESOURCE_PREVIEW_SPLIT_MIN_VIEWER,
                    }
                  : isResourceDocPreview
                    ? {
                        flex: "3 1 0%",
                        minWidth: RESOURCE_PREVIEW_SPLIT_MIN_VIEWER,
                      }
                  : undefined
              }
            >
              {examDetailSessionId ? (
                <div
                  className={`group flex flex-1 min-h-0 min-w-0 flex-col ${previewShellClass} ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}
                >
                  <div
                    className="shrink-0 h-10 min-h-10 max-h-10 flex items-center justify-between px-3 border-b box-border"
                    style={{
                      backgroundColor: isDarkMode ? "#242424" : "#FFFFFF",
                      color: isDarkMode ? "#FFFFFF" : "#000000",
                      borderColor: isDarkMode ? "rgba(255, 255, 255, 0.18)" : "rgba(0, 0, 0, 0.14)",
                    }}
                  >
                    <div className="min-w-0 flex items-center">
                      <h2 className="text-sm font-semibold leading-none truncate">
                        {previewFileName?.trim() || "시험"}
                      </h2>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 min-w-0">
                      <p className="text-xs opacity-80 leading-none truncate max-w-[min(13.75rem,40vw)]">
                        유형:{" "}
                        {(() => {
                          const type = String(examDetail?.examType ?? "").toUpperCase();
                          if (type === "FLASH_CARD") return "플래시카드";
                          if (type === "OX_PROBLEM") return "OX 문제";
                          if (type === "FIVE_CHOICE") return "객관식";
                          if (type === "SHORT_ANSWER") return "주관식";
                          if (type === "DEBATE") return "토론형";
                          return examDetail?.examType || "-";
                        })()}
                      </p>
                      {(examDetail?.oxProblems?.length ?? 0) > 0 && (
                        <ExamSectionViewModeToggle
                          mode={oxExamViewMode}
                          onChange={setOxExamViewMode}
                          isDarkMode={isDarkMode}
                        />
                      )}
                      {(examDetail?.fiveChoiceProblems?.length ?? 0) > 0 && (
                        <ExamSectionViewModeToggle
                          mode={fiveChoiceExamViewMode}
                          onChange={setFiveChoiceExamViewMode}
                          isDarkMode={isDarkMode}
                        />
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          closeExamSessionDetail();
                        }}
                        className={`shrink-0 cursor-pointer rounded-full p-1.5 transition-opacity opacity-0 pointer-events-none group-hover:pointer-events-auto group-hover:opacity-100 focus-visible:pointer-events-auto focus-visible:opacity-100 ${
                          isDarkMode
                            ? "text-zinc-300 hover:bg-zinc-800 hover:text-white"
                            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                        }`}
                        aria-label="시험 보기 닫기"
                        title="닫기"
                      >
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          aria-hidden
                        >
                          <path
                            d="M18 6L6 18M6 6l12 12"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4">
                    {examDetailLoading && (
                      <p className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                        시험 세션 정보를 불러오는 중입니다...
                      </p>
                    )}
                    {examDetailError && (
                      <p className={`text-sm ${isDarkMode ? "text-red-300" : "text-red-600"}`}>
                        {examDetailError}
                      </p>
                    )}
                    {!examDetailLoading && !examDetailError && examDetail && (
                      <>
                        {isStudent ? (
                          <section
                            className={`rounded-xl border px-4 py-3 ${
                              isDarkMode
                                ? "border-[#2b2b2b] bg-[#202020]"
                                : "border-[#dedbd5] bg-white"
                            }`}
                          >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold">시험 응시</p>
                                {examSubmissionResult ? (
                                  <p className="mt-1 text-xs opacity-75">
                                    제출 완료
                                    {examSubmissionResult.totalScore != null ||
                                    examSubmissionResult.maxScore != null
                                      ? ` · 점수 ${examSubmissionResult.totalScore ?? "-"} / ${examSubmissionResult.maxScore ?? "-"}`
                                      : ""}
                                  </p>
                                ) : studentExamSubmitStats.answerableCount > 0 ? (
                                  <p className="mt-1 text-xs opacity-75">
                                    답변 {studentExamSubmitStats.answeredCount} /{" "}
                                    {studentExamSubmitStats.answerableCount}
                                  </p>
                                ) : (
                                  <p className="mt-1 text-xs opacity-75">
                                    제출형 문항이 없는 시험입니다.
                                  </p>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => void handleStudentExamSubmit()}
                                disabled={
                                  examSubmissionLoading ||
                                  examSubmissionResult != null ||
                                  !studentExamSubmitStats.allAnswered
                                }
                                className={`inline-flex h-9 shrink-0 items-center justify-center rounded-xl px-3 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                                  isDarkMode
                                    ? "bg-[#ff9b6a] text-[#181818] hover:bg-[#ffad9b]"
                                    : "bg-[#ff824d] text-white hover:bg-[#f26f37]"
                                }`}
                              >
                                {examSubmissionLoading
                                  ? "제출 중..."
                                  : examSubmissionResult
                                    ? "제출 완료"
                                    : "답안 제출"}
                              </button>
                            </div>
                            {examSubmissionError ? (
                              <p className={`mt-2 text-xs ${isDarkMode ? "text-red-300" : "text-red-600"}`}>
                                {examSubmissionError}
                              </p>
                            ) : null}
                            {examSubmissionResult?.overallFeedback ? (
                              <div
                                className={`mt-3 rounded-lg border p-3 text-xs leading-5 ${
                                  isDarkMode
                                    ? "border-[#343434] bg-[#181818]"
                                    : "border-[#dedbd5] bg-[#fbfaf7]"
                                }`}
                              >
                                <p className="font-semibold">종합 피드백</p>
                                <p className="mt-1 opacity-85">
                                  {examSubmissionResult.overallFeedback}
                                </p>
                              </div>
                            ) : null}
                            {examSubmissionQuestionGradings.length > 0 ? (
                              <div
                                className={`mt-3 rounded-lg border p-3 ${
                                  isDarkMode
                                    ? "border-[#343434] bg-[#181818]"
                                    : "border-[#dedbd5] bg-[#fbfaf7]"
                                }`}
                              >
                                <div className="mb-2 flex items-center justify-between gap-2">
                                  <p className="text-xs font-semibold">문항별 피드백</p>
                                  <p className="text-[11px] opacity-70">
                                    {examSubmissionQuestionGradings.length}개 문항
                                  </p>
                                </div>
                                <div className="space-y-2">
                                  {examSubmissionQuestionGradings.map((item, index) => (
                                    <div
                                      key={`${item.questionId}-${index}`}
                                      className={`rounded-lg border px-3 py-2 text-xs ${
                                        isDarkMode
                                          ? "border-[#343434] bg-[#202020]"
                                          : "border-[#dedbd5] bg-white"
                                      }`}
                                    >
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-semibold">
                                          {index + 1}번
                                        </span>
                                        {item.isCorrect != null ? (
                                          <span
                                            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                              item.isCorrect
                                                ? isDarkMode
                                                  ? "bg-emerald-400/15 text-emerald-200"
                                                  : "bg-emerald-50 text-emerald-700"
                                                : isDarkMode
                                                  ? "bg-red-400/15 text-red-200"
                                                  : "bg-red-50 text-red-700"
                                            }`}
                                          >
                                            {item.isCorrect ? "정답" : "오답"}
                                          </span>
                                        ) : null}
                                        {item.score != null ? (
                                          <span className="opacity-75">
                                            점수 {item.score}
                                          </span>
                                        ) : null}
                                      </div>
                                      {item.feedback ? (
                                        <p className="mt-1 leading-5 opacity-85">
                                          {item.feedback}
                                        </p>
                                      ) : null}
                                      {(item.userAnswer || item.correctAnswer) ? (
                                        <div className="mt-1 grid gap-1 opacity-75">
                                          {item.userAnswer ? (
                                            <p>내 답안: {item.userAnswer}</p>
                                          ) : null}
                                          {item.correctAnswer ? (
                                            <p>정답: {item.correctAnswer}</p>
                                          ) : null}
                                        </div>
                                      ) : null}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : examSubmissionResult ? (
                              <p className="mt-3 text-xs opacity-70">
                                서버 응답에 문항별 피드백이 포함되지 않았습니다.
                              </p>
                            ) : null}
                          </section>
                        ) : null}
                        {examDetail.flashCards?.length ? (
                          <section className="min-h-[calc(100vh-17.5rem)] flex flex-col">
                            <div className="flex-1 min-h-0 flex flex-col gap-3">
                              <p className="text-xs opacity-80 text-center">
                                {flashCardIndex + 1} / {examDetail.flashCards.length}
                              </p>
                              {(() => {
                                const current = examDetail.flashCards[flashCardIndex];
                                const id = flashCardIndex + 1;
                                const flipped = !!examDetailFlipped[id];
                                const backText = current.backContent ?? "";
                                const renderBackAsMarkdown = isLikelyMarkdownText(backText);
                                return (
                                  <div key={`fc-single-${id}`} className="relative w-full flex-1 min-h-0 px-10">
                                    <button
                                      type="button"
                                      onClick={() => setFlashCardIndex((prev) => Math.max(0, prev - 1))}
                                      disabled={flashCardIndex <= 0}
                                      className={`absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full border flex items-center justify-center disabled:opacity-40 ${
                                        isDarkMode
                                          ? "bg-zinc-900/90 border-zinc-700 text-gray-200"
                                          : "bg-white/95 border-gray-300 text-gray-700"
                                      }`}
                                      aria-label="이전 카드"
                                      title="이전"
                                    >
                                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                                        <path d="M15 18l-6-6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                      </svg>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setFlashCardIndex((prev) =>
                                          Math.min(examDetail.flashCards.length - 1, prev + 1),
                                        )
                                      }
                                      disabled={flashCardIndex >= examDetail.flashCards.length - 1}
                                      className={`absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full border flex items-center justify-center disabled:opacity-40 ${
                                        isDarkMode
                                          ? "bg-zinc-900/90 border-zinc-700 text-gray-200"
                                          : "bg-white/95 border-gray-300 text-gray-700"
                                      }`}
                                      aria-label="다음 카드"
                                      title="다음"
                                    >
                                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                                        <path d="M9 6l6 6-6 6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                      </svg>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleToggleFlashCard(id)}
                                      className={`w-full h-full min-h-80 rounded-xl border p-5 text-left transition-all ${
                                        isDarkMode
                                          ? "border-zinc-700 bg-zinc-900/70 hover:bg-zinc-800"
                                          : "border-gray-200 bg-white hover:bg-gray-50"
                                      }`}
                                    >
                                      <div className="flex items-center justify-between mb-3">
                                        <p className="text-xs opacity-70">{flipped ? "Back" : "Front"}</p>
                                        <p className="text-xs opacity-70">클릭해서 앞/뒤 전환</p>
                                      </div>
                                      {!flipped ? (
                                        <p className="text-lg leading-8 whitespace-pre-wrap break-words">
                                          {current.frontContent}
                                        </p>
                                      ) : renderBackAsMarkdown ? (
                                        <article
                                          className={`prose prose-neutral max-w-none text-base leading-7 break-words prose-headings:font-semibold prose-blockquote:border-l-emerald-600/50 dark:prose-blockquote:border-emerald-400/45 ${
                                            isDarkMode ? "prose-invert" : ""
                                          }`}
                                        >
                                          <MarkdownContent>{backText}</MarkdownContent>
                                        </article>
                                      ) : (
                                        <p className="text-base leading-7 whitespace-pre-wrap break-words">
                                          {formatPlainFlashcardText(backText)}
                                        </p>
                                      )}
                                    </button>
                                  </div>
                                );
                              })()}
                              {examDetail.flashCards.length > 1 && (
                                <div className="w-full">
                                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 pb-1">
                                    {examDetail.flashCards
                                      .map((card, idx) => ({ card, idx }))
                                      .filter(({ idx }) => idx !== flashCardIndex)
                                      .map(({ card, idx }) => (
                                        <button
                                          key={`fc-preview-${idx}`}
                                          type="button"
                                          onClick={() => setFlashCardIndex(idx)}
                                          className={`w-full h-20 rounded-lg border p-2 text-left transition-colors ${
                                            isDarkMode
                                              ? "border-zinc-700 bg-zinc-900/60 hover:bg-zinc-800 text-gray-200"
                                              : "border-gray-200 bg-white hover:bg-gray-50 text-gray-800"
                                          }`}
                                          title={`카드 ${idx + 1}`}
                                        >
                                          <p className="text-xs opacity-70 mb-1">
                                            {idx + 1}
                                          </p>
                                          <p className="text-xs line-clamp-2 whitespace-pre-wrap break-words">
                                            {card.frontContent}
                                          </p>
                                        </button>
                                      ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </section>
                        ) : null}
                        {oxExamStats ? (
                          oxExamViewMode === "single" ? (
                            <section className="flex min-h-[calc(100vh-17.5rem)] w-full flex-col">
                              <div className="flex min-h-0 flex-1 flex-col gap-3">
                                <div className="relative min-h-0 w-full flex-1 px-10">
                                  <ExamFlashStyleSideArrows
                                    show={oxExamStats.total > 1}
                                    isDarkMode={isDarkMode}
                                    prevDisabled={oxExamSingleIndex <= 0}
                                    nextDisabled={
                                      oxExamSingleIndex >=
                                      oxExamStats.total - 1
                                    }
                                    onPrev={() =>
                                      setOxExamSingleIndex((i) =>
                                        Math.max(0, i - 1),
                                      )
                                    }
                                    onNext={() =>
                                      setOxExamSingleIndex((i) =>
                                        Math.min(
                                          oxExamStats.total - 1,
                                          i + 1,
                                        ),
                                      )
                                    }
                                  />
                                  {(() => {
                                    const idx = oxExamSingleIndex;
                                    const q = oxExamStats.list[idx];
                                    const choice = oxUserAnswers[String(idx)];
                                    const userCorrect =
                                      choice != null &&
                                      isOxAnswerCorrect(
                                        choice,
                                        q.correctAnswer,
                                      );
                                    const oxCorrectCanon =
                                      normalizeExamOxCorrectAnswer(
                                        q.correctAnswer,
                                      );
                                    return (
                                      <div
                                        className={examSingleFlashCardShellClass(
                                          isDarkMode,
                                        )}
                                      >
                                        <div className="mb-3 flex items-center justify-end">
                                          <p className="text-xs tabular-nums opacity-70">
                                            {idx + 1}/{oxExamStats.total}
                                          </p>
                                        </div>
                                        <p className="mb-4 text-lg font-medium leading-8 whitespace-pre-wrap break-words">
                                          {q.questionContent}
                                        </p>
                                        <div className="mt-auto flex h-12 shrink-0 flex-wrap items-center justify-center gap-3">
                                          <label
                                            className={oxChoiceButtonClass({
                                              letter: "O",
                                              choice,
                                              correctCanonical: oxCorrectCanon,
                                              graded: oxGraded,
                                              isDarkMode,
                                            })}
                                          >
                                            <input
                                              type="radio"
                                              name={`ox-problem-inline-${idx}`}
                                              className="sr-only"
                                              checked={choice === "O"}
                                              disabled={oxGraded || examSubmissionResult != null}
                                              onChange={() =>
                                                handleOxAnswerChange(idx, "O")
                                              }
                                            />
                                            <span>O</span>
                                          </label>
                                          <label
                                            className={oxChoiceButtonClass({
                                              letter: "X",
                                              choice,
                                              correctCanonical: oxCorrectCanon,
                                              graded: oxGraded,
                                              isDarkMode,
                                            })}
                                          >
                                            <input
                                              type="radio"
                                              name={`ox-problem-inline-${idx}`}
                                              className="sr-only"
                                              checked={choice === "X"}
                                              disabled={oxGraded || examSubmissionResult != null}
                                              onChange={() =>
                                                handleOxAnswerChange(idx, "X")
                                              }
                                            />
                                            <span>X</span>
                                          </label>
                                        </div>
                                        {oxGraded && choice && (
                                          <div className="mt-4 space-y-1 border-t border-dashed border-gray-300 pt-3 dark:border-zinc-600">
                                            <p className="text-xs">
                                              <span className="font-semibold">
                                                결과:
                                              </span>{" "}
                                              <span
                                                className={
                                                  userCorrect
                                                    ? "text-emerald-500 font-medium"
                                                    : "text-red-500 font-medium"
                                                }
                                              >
                                                {userCorrect ? "정답" : "오답"}
                                              </span>
                                            </p>
                                            <p className="text-xs opacity-90">
                                              <span className="font-semibold">
                                                정답:
                                              </span>{" "}
                                              {normalizeExamOxCorrectAnswer(
                                                q.correctAnswer,
                                              ) ?? q.correctAnswer}
                                            </p>
                                            {q.explanation ? (
                                              <p className="text-xs opacity-80 whitespace-pre-line">
                                                <span className="font-semibold">
                                                  해설:
                                                </span>{" "}
                                                {q.explanation}
                                              </p>
                                            ) : null}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </div>
                                <div className="flex min-h-[4.5rem] w-full shrink-0 flex-col items-center justify-start gap-2 px-2 text-center">
                                  {(oxExamSingleIndex ===
                                    oxExamStats.total - 1 ||
                                    oxExamStats.total <= 1) && (
                                    !isStudent ? (
                                      <>
                                        <button
                                          type="button"
                                          onClick={handleOxGrade}
                                          disabled={
                                            !oxExamStats.allAnswered ||
                                            oxGraded
                                          }
                                          className={`inline-flex items-center justify-center rounded px-3 py-1.5 text-xs font-medium cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                                            isDarkMode
                                              ? "bg-[#ff824d] text-white hover:bg-[#f26f37]"
                                              : "bg-[#ff824d] text-white hover:bg-[#f26f37]"
                                          }`}
                                        >
                                          채점하기
                                        </button>
                                        {oxGraded ? (
                                          <p
                                            className={`text-xs font-semibold ${isDarkMode ? "text-emerald-300" : "text-emerald-700"}`}
                                          >
                                            {oxExamStats.total}문제 중{" "}
                                            {oxExamStats.correctCount}문제 정답
                                          </p>
                                        ) : null}
                                      </>
                                    ) : (
                                      <p className="text-xs opacity-70">
                                        답안을 모두 선택한 뒤 상단에서 제출할 수 있습니다.
                                      </p>
                                    )
                                  )}
                                </div>
                                <ExamQuestionProgressDots
                                  total={oxExamStats.total}
                                  currentIndex={oxExamSingleIndex}
                                  isAnswered={(i) => {
                                    const c = oxUserAnswers[String(i)];
                                    return c === "O" || c === "X";
                                  }}
                                  onSelect={(i) => setOxExamSingleIndex(i)}
                                  isDarkMode={isDarkMode}
                                />
                              </div>
                            </section>
                          ) : (
                            <section className="w-full">
                              <div className="space-y-3 text-xs">
                                {oxExamStats.list.map((_, idx) => {
                                  const q = oxExamStats.list[idx];
                                  const choice = oxUserAnswers[String(idx)];
                                  const userCorrect =
                                    choice != null &&
                                    isOxAnswerCorrect(
                                      choice,
                                      q.correctAnswer,
                                    );
                                  const oxCorrectCanon =
                                    normalizeExamOxCorrectAnswer(
                                      q.correctAnswer,
                                    );
                                  return (
                                    <div
                                      key={idx}
                                      className={`rounded-lg border p-3 ${isDarkMode ? "border-zinc-700" : "border-gray-200 bg-white"}`}
                                    >
                                      <p className="mb-2 text-sm font-medium whitespace-pre-line">
                                        <span className="mr-1.5 inline tabular-nums font-semibold">
                                          {idx + 1}.
                                        </span>
                                        {q.questionContent}
                                      </p>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <label
                                          className={oxChoiceButtonClass({
                                            letter: "O",
                                            choice,
                                            correctCanonical: oxCorrectCanon,
                                            graded: oxGraded,
                                            isDarkMode,
                                          })}
                                        >
                                          <input
                                            type="radio"
                                            name={`ox-problem-inline-all-${idx}`}
                                            className="sr-only"
                                            checked={choice === "O"}
                                            disabled={oxGraded || examSubmissionResult != null}
                                            onChange={() =>
                                              handleOxAnswerChange(idx, "O")
                                            }
                                          />
                                          <span>O</span>
                                        </label>
                                        <label
                                          className={oxChoiceButtonClass({
                                            letter: "X",
                                            choice,
                                            correctCanonical: oxCorrectCanon,
                                            graded: oxGraded,
                                            isDarkMode,
                                          })}
                                        >
                                          <input
                                            type="radio"
                                            name={`ox-problem-inline-all-${idx}`}
                                            className="sr-only"
                                            checked={choice === "X"}
                                            disabled={oxGraded || examSubmissionResult != null}
                                            onChange={() =>
                                              handleOxAnswerChange(idx, "X")
                                            }
                                          />
                                          <span>X</span>
                                        </label>
                                      </div>
                                      {oxGraded && choice && (
                                        <div className="mt-2 space-y-1 border-t border-dashed border-gray-300 pt-2 dark:border-zinc-600">
                                          <p className="text-xs">
                                            <span className="font-semibold">
                                              결과:
                                            </span>{" "}
                                            <span
                                              className={
                                                userCorrect
                                                  ? "text-emerald-500 font-medium"
                                                  : "text-red-500 font-medium"
                                              }
                                            >
                                              {userCorrect ? "정답" : "오답"}
                                            </span>
                                          </p>
                                          <p className="text-xs opacity-90">
                                            <span className="font-semibold">
                                              정답:
                                            </span>{" "}
                                            {normalizeExamOxCorrectAnswer(
                                              q.correctAnswer,
                                            ) ?? q.correctAnswer}
                                          </p>
                                          {q.explanation ? (
                                            <p className="text-xs opacity-80 whitespace-pre-line">
                                              <span className="font-semibold">
                                                해설:
                                              </span>{" "}
                                              {q.explanation}
                                            </p>
                                          ) : null}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                              <div className="mt-2 flex flex-col gap-1.5">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                  {!isStudent ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={handleOxGrade}
                                        disabled={
                                          !oxExamStats.allAnswered || oxGraded
                                        }
                                        className={`inline-flex items-center justify-center rounded px-3 py-1.5 text-xs font-medium cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                                          isDarkMode
                                            ? "bg-[#ff824d] text-white hover:bg-[#f26f37]"
                                            : "bg-[#ff824d] text-white hover:bg-[#f26f37]"
                                        }`}
                                      >
                                        채점하기
                                      </button>
                                      {oxGraded ? (
                                        <p
                                          className={`text-xs font-semibold ${isDarkMode ? "text-emerald-300" : "text-emerald-700"}`}
                                        >
                                          {oxExamStats.total}문제 중{" "}
                                          {oxExamStats.correctCount}문제 정답
                                        </p>
                                      ) : (
                                        <p className="text-xs opacity-70">
                                          모든 문항에 O 또는 X를 선택하면 채점하기를
                                          누를 수 있습니다.
                                        </p>
                                      )}
                                    </>
                                  ) : (
                                    <p className="text-xs opacity-70">
                                      답안을 모두 선택한 뒤 상단에서 제출할 수 있습니다.
                                    </p>
                                  )}
                                </div>
                              </div>
                            </section>
                          )
                        ) : null}
                        {examDetail.fiveChoiceProblems?.length ? (
                          fiveChoiceExamViewMode === "single" ? (
                            <section className="flex min-h-[calc(100vh-17.5rem)] w-full flex-col">
                              <div className="flex min-h-0 flex-1 flex-col gap-3">
                                <div className="relative min-h-0 w-full flex-1 px-10">
                                  <ExamFlashStyleSideArrows
                                    show={
                                      examDetail.fiveChoiceProblems.length > 1
                                    }
                                    isDarkMode={isDarkMode}
                                    prevDisabled={fiveChoiceSingleIndex <= 0}
                                    nextDisabled={
                                      fiveChoiceSingleIndex >=
                                      examDetail.fiveChoiceProblems.length - 1
                                    }
                                    onPrev={() =>
                                      setFiveChoiceSingleIndex((i) =>
                                        Math.max(0, i - 1),
                                      )
                                    }
                                    onNext={() =>
                                      setFiveChoiceSingleIndex((i) =>
                                        Math.min(
                                          examDetail.fiveChoiceProblems
                                            .length - 1,
                                          i + 1,
                                        ),
                                      )
                                    }
                                  />
                                  {(() => {
                                    const idx = fiveChoiceSingleIndex;
                                    const q =
                                      examDetail.fiveChoiceProblems[idx];
                                    const gradedItem =
                                      fiveChoiceLog?.evaluationItems[idx];
                                    const mcGraded = !!fiveChoiceLog;
                                    const mcExplanation =
                                      gradedItem &&
                                      (gradedItem.resultStatus === "Correct"
                                        ? (q.intentDiagnosis?.trim() ||
                                            gradedItem.feedbackMessage ||
                                            "")
                                        : (gradedItem.feedbackMessage ||
                                            q.intentDiagnosis?.trim() ||
                                            ""));
                                    return (
                                      <div
                                        className={examSingleFlashCardShellClass(
                                          isDarkMode,
                                        )}
                                      >
                                        <div className="mb-3 flex items-center justify-between">
                                          <p className="text-xs opacity-70">
                                            객관식
                                          </p>
                                          <p className="text-xs tabular-nums opacity-70">
                                            문항 {idx + 1}
                                          </p>
                                        </div>
                                        <p className="mb-4 text-lg font-medium leading-8 whitespace-pre-wrap break-words">
                                          {q.questionContent}
                                        </p>
                                        <ul className="mt-auto space-y-2 pl-0 list-none">
                                          {q.options.map((opt) => {
                                            const selected =
                                              fiveChoiceUserAnswers[
                                                String(idx)
                                              ] === opt.id;
                                            return (
                                              <li key={opt.id}>
                                                <label
                                                  className={fiveChoiceOptionLabelClass(
                                                    selected,
                                                    mcGraded,
                                                    !!opt.isCorrect,
                                                    isDarkMode,
                                                  )}
                                                >
                                                  <input
                                                    type="radio"
                                                    name={`five-choice-inline-${idx}`}
                                                    value={opt.id}
                                                    className="sr-only"
                                                    disabled={mcGraded || examSubmissionResult != null}
                                                    checked={selected}
                                                    onChange={() =>
                                                      handleFiveChoiceAnswerChange(
                                                        idx,
                                                        opt.id,
                                                      )
                                                    }
                                                  />
                                                  <span className="flex min-w-0 flex-1 items-start gap-2 text-sm">
                                                    <span className="w-5 shrink-0 text-right font-semibold tabular-nums">
                                                      {opt.id}.
                                                    </span>
                                                    <span className="min-w-0">
                                                      {opt.content}
                                                    </span>
                                                    {mcGraded &&
                                                    opt.isCorrect ? (
                                                      <span className="ml-auto shrink-0 text-xs font-semibold text-emerald-500">
                                                        정답
                                                      </span>
                                                    ) : null}
                                                  </span>
                                                </label>
                                              </li>
                                            );
                                          })}
                                        </ul>
                                        {gradedItem && (
                                          <div className="mt-4 space-y-1 border-t border-dashed border-gray-300 pt-3 dark:border-zinc-600">
                                            <p className="text-xs">
                                              <span className="font-semibold">
                                                결과:
                                              </span>{" "}
                                              <span
                                                className={
                                                  gradedItem.resultStatus ===
                                                  "Correct"
                                                    ? "text-emerald-500 font-medium"
                                                    : "text-red-500 font-medium"
                                                }
                                              >
                                                {gradedItem.resultStatus ===
                                                "Correct"
                                                  ? "정답"
                                                  : "오답"}
                                              </span>
                                            </p>
                                            {mcExplanation ? (
                                              <p className="text-xs opacity-80 whitespace-pre-line">
                                                <span className="font-semibold">
                                                  해설:
                                                </span>{" "}
                                                {mcExplanation}
                                              </p>
                                            ) : null}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </div>
                                {(fiveChoiceSingleIndex ===
                                  examDetail.fiveChoiceProblems.length - 1 ||
                                  examDetail.fiveChoiceProblems.length <=
                                    1) && (
                                  <div className="flex w-full flex-col items-center gap-1.5">
                                    <div className="flex w-full max-w-md flex-col items-center gap-2 text-center">
                                      {!isStudent ? (
                                        <>
                                          <button
                                            type="button"
                                            onClick={handleFiveChoiceGrade}
                                            disabled={
                                              !fiveChoiceExamStats?.allAnswered ||
                                              fiveChoiceExamStats?.graded
                                            }
                                            className={`inline-flex items-center justify-center rounded px-3 py-1.5 text-xs font-medium cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                                              isDarkMode
                                                ? "bg-[#ff824d] text-white hover:bg-[#f26f37]"
                                                : "bg-[#ff824d] text-white hover:bg-[#f26f37]"
                                            }`}
                                          >
                                            선택한 답안 채점하기
                                          </button>
                                          {fiveChoiceExamStats?.graded ? (
                                            <p
                                              className={`text-xs font-semibold ${isDarkMode ? "text-emerald-300" : "text-emerald-700"}`}
                                            >
                                              {fiveChoiceExamStats.total}문제 중{" "}
                                              {
                                                fiveChoiceExamStats.correctCount
                                              }
                                              문제 정답
                                            </p>
                                          ) : (
                                            <p className="text-xs opacity-70">
                                              모든 문항에 답을 선택하면 채점하기를
                                              누를 수 있습니다.
                                            </p>
                                          )}
                                        </>
                                      ) : (
                                        <p className="text-xs opacity-70">
                                          답안을 모두 선택한 뒤 상단에서 제출할 수 있습니다.
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                )}
                                <ExamQuestionProgressDots
                                  total={
                                    examDetail.fiveChoiceProblems.length
                                  }
                                  currentIndex={fiveChoiceSingleIndex}
                                  isAnswered={(i) => {
                                    const qq =
                                      examDetail.fiveChoiceProblems[i];
                                    const id = fiveChoiceUserAnswers[
                                      String(i)
                                    ];
                                    return (
                                      id != null &&
                                      id !== "" &&
                                      (qq.options ?? []).some(
                                        (o) => o.id === id,
                                      )
                                    );
                                  }}
                                  onSelect={(i) =>
                                    setFiveChoiceSingleIndex(i)
                                  }
                                  isDarkMode={isDarkMode}
                                />
                              </div>
                            </section>
                          ) : (
                            <section className="w-full">
                              <ExamQuestionProgressDots
                                total={
                                  examDetail.fiveChoiceProblems.length
                                }
                                currentIndex={null}
                                isAnswered={(i) => {
                                  const qq =
                                    examDetail.fiveChoiceProblems[i];
                                  const id = fiveChoiceUserAnswers[
                                    String(i)
                                  ];
                                  return (
                                    id != null &&
                                    id !== "" &&
                                    (qq.options ?? []).some(
                                      (o) => o.id === id,
                                    )
                                  );
                                }}
                                isDarkMode={isDarkMode}
                              />
                              <ol className="space-y-3 text-xs list-decimal list-inside">
                                {examDetail.fiveChoiceProblems.map(
                                  (_, idx) => {
                                    const q =
                                      examDetail.fiveChoiceProblems[idx];
                                    const gradedItem =
                                      fiveChoiceLog?.evaluationItems[idx];
                                    const mcGraded = !!fiveChoiceLog;
                                    const mcExplanation =
                                      gradedItem &&
                                      (gradedItem.resultStatus === "Correct"
                                        ? (q.intentDiagnosis?.trim() ||
                                            gradedItem.feedbackMessage ||
                                            "")
                                        : (gradedItem.feedbackMessage ||
                                            q.intentDiagnosis?.trim() ||
                                            ""));
                                    return (
                                      <li
                                        key={idx}
                                        className={`rounded-lg border p-3 ${isDarkMode ? "border-zinc-700" : "border-gray-200 bg-white"}`}
                                      >
                                        <p className="mb-2 font-medium">
                                          {q.questionContent}
                                        </p>
                                        <ul className="space-y-1.5 pl-0 list-none">
                                          {q.options.map((opt) => {
                                            const selected =
                                              fiveChoiceUserAnswers[
                                                String(idx)
                                              ] === opt.id;
                                            return (
                                              <li key={opt.id}>
                                                <label
                                                  className={fiveChoiceOptionLabelClass(
                                                    selected,
                                                    mcGraded,
                                                    !!opt.isCorrect,
                                                    isDarkMode,
                                                  )}
                                                >
                                                  <input
                                                    type="radio"
                                                    name={`five-choice-inline-${idx}`}
                                                    value={opt.id}
                                                    className="sr-only"
                                                    disabled={mcGraded || examSubmissionResult != null}
                                                    checked={selected}
                                                    onChange={() =>
                                                      handleFiveChoiceAnswerChange(
                                                        idx,
                                                        opt.id,
                                                      )
                                                    }
                                                  />
                                                  <span className="flex min-w-0 flex-1 items-start gap-1.5 text-xs">
                                                    <span className="w-4 shrink-0 text-right font-semibold tabular-nums">
                                                      {opt.id}.
                                                    </span>
                                                    <span className="min-w-0">
                                                      {opt.content}
                                                    </span>
                                                    {mcGraded &&
                                                    opt.isCorrect ? (
                                                      <span className="ml-auto shrink-0 text-xs font-semibold text-emerald-500">
                                                        정답
                                                      </span>
                                                    ) : null}
                                                  </span>
                                                </label>
                                              </li>
                                            );
                                          })}
                                        </ul>
                                        {gradedItem && (
                                          <div className="mt-2 space-y-1 border-t border-dashed border-gray-300 pt-2 dark:border-zinc-600">
                                            <p className="text-xs">
                                              <span className="font-semibold">
                                                결과:
                                              </span>{" "}
                                              <span
                                                className={
                                                  gradedItem.resultStatus ===
                                                  "Correct"
                                                    ? "text-emerald-500 font-medium"
                                                    : "text-red-500 font-medium"
                                                }
                                              >
                                                {gradedItem.resultStatus ===
                                                "Correct"
                                                  ? "정답"
                                                  : "오답"}
                                              </span>
                                            </p>
                                            {mcExplanation ? (
                                              <p className="text-xs opacity-80 whitespace-pre-line">
                                                <span className="font-semibold">
                                                  해설:
                                                </span>{" "}
                                                {mcExplanation}
                                              </p>
                                            ) : null}
                                          </div>
                                        )}
                                      </li>
                                    );
                                  },
                                )}
                              </ol>
                              <div className="mt-2 flex flex-col gap-1">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                  {!isStudent ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={handleFiveChoiceGrade}
                                        disabled={
                                          !fiveChoiceExamStats?.allAnswered ||
                                          fiveChoiceExamStats?.graded
                                        }
                                        className={`inline-flex items-center justify-center rounded px-3 py-1.5 text-xs font-medium cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                                          isDarkMode
                                            ? "bg-[#ff824d] text-white hover:bg-[#f26f37]"
                                            : "bg-[#ff824d] text-white hover:bg-[#f26f37]"
                                        }`}
                                      >
                                        선택한 답안 채점하기
                                      </button>
                                      {fiveChoiceExamStats?.graded ? (
                                        <p
                                          className={`text-xs font-semibold ${isDarkMode ? "text-emerald-300" : "text-emerald-700"}`}
                                        >
                                          {fiveChoiceExamStats.total}문제 중{" "}
                                          {fiveChoiceExamStats.correctCount}문제
                                          정답
                                        </p>
                                      ) : (
                                        <p className="text-xs opacity-70">
                                          모든 문항에 답을 선택하면 채점하기를 누를
                                          수 있습니다.
                                        </p>
                                      )}
                                    </>
                                  ) : (
                                    <p className="text-xs opacity-70">
                                      답안을 모두 선택한 뒤 상단에서 제출할 수 있습니다.
                                    </p>
                                  )}
                                </div>
                              </div>
                            </section>
                          )
                        ) : null}
                        {examDetail.shortAnswerProblems?.length ? (
                          <section>
                            <h3 className="text-sm font-semibold mb-2">단답형 / 서술형 ({examDetail.shortAnswerProblems.length}개)</h3>
                            <ol className="space-y-3 text-xs list-decimal list-inside">
                              {examDetail.shortAnswerProblems.map((q, idx) => {
                                const saItem =
                                  shortAnswerLog?.evaluationItems[idx];
                                const saGraded = !!shortAnswerLog && !!saItem;
                                const kKey = String(idx);
                                const kwOpen = !!shortAnswerKeywordOpen[kKey];
                                const anyKeywords =
                                  getShortAnswerKeywordsFromProblem(q);
                                const intentText = getShortAnswerIntentText(q);
                                return (
                                  <li
                                    key={idx}
                                    className={`rounded-lg border p-2 ${isDarkMode ? "border-zinc-700" : "border-gray-200 bg-white"}`}
                                  >
                                    <p className="font-medium mb-1">
                                      {q.questionContent}
                                    </p>
                                    <div className="mb-1.5">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setShortAnswerKeywordOpen((p) => ({
                                            ...p,
                                            [kKey]: !p[kKey],
                                          }))
                                        }
                                        className={`text-xs underline cursor-pointer ${isDarkMode ? "text-sky-300" : "text-sky-700"}`}
                                      >
                                        {kwOpen
                                          ? "키워드와 출제의도 접기"
                                          : "키워드와 출제의도 보기"}
                                      </button>
                                      {kwOpen ? (
                                        <div
                                          className={`mt-1.5 rounded border p-2 space-y-1 text-xs ${
                                            isDarkMode
                                              ? "border-zinc-600 bg-zinc-800/50"
                                              : "border-gray-200 bg-gray-50"
                                          }`}
                                        >
                                          {anyKeywords.length > 0 ? (
                                            <p>
                                              <span className="font-semibold">
                                                핵심 키워드:
                                              </span>{" "}
                                              {anyKeywords.join(", ")}
                                            </p>
                                          ) : null}
                                          {intentText ? (
                                            <p className="whitespace-pre-line opacity-90">
                                              <span className="font-semibold">
                                                출제 의도:
                                              </span>{" "}
                                              {intentText}
                                            </p>
                                          ) : null}
                                          {anyKeywords.length === 0 &&
                                          !intentText ? (
                                            <p className="opacity-70">
                                              등록된 키워드·출제 의도가 없습니다.
                                            </p>
                                          ) : null}
                                        </div>
                                      ) : null}
                                    </div>
                                    <textarea
                                      value={
                                        shortAnswerUserAnswers[String(idx)] ??
                                        ""
                                      }
                                      onChange={(e) =>
                                        handleShortAnswerInputChange(
                                          idx,
                                          e.target.value,
                                        )
                                      }
                                      readOnly={saGraded || examSubmissionResult != null}
                                      className={`w-full rounded border px-2 py-1 text-xs resize-y min-h-15 ${
                                        saGraded ? "opacity-90" : ""
                                      } ${
                                        isDarkMode
                                          ? "bg-zinc-900 border-zinc-700 text-gray-100"
                                          : "bg-white border-gray-300 text-gray-900"
                                      }`}
                                      placeholder="이 문항에 대한 자신의 답안을 작성해 보세요."
                                    />
                                    {saGraded && saItem && (
                                      <div className="mt-2 space-y-1.5 border-t border-dashed border-gray-300 pt-2 text-xs dark:border-zinc-600">
                                        <p>
                                          <span className="font-semibold">
                                            점수:
                                          </span>{" "}
                                          <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                            {(saItem.score * 10).toFixed(1)} / 10
                                          </span>
                                        </p>
                                        {saItem.gradingReason ? (
                                          <p className="whitespace-pre-line opacity-90">
                                            <span className="font-semibold">
                                              채점 이유:
                                            </span>{" "}
                                            {saItem.gradingReason}
                                          </p>
                                        ) : null}
                                        {saItem.feedback ? (
                                          <p className="whitespace-pre-line opacity-90">
                                            <span className="font-semibold">
                                              피드백:
                                            </span>{" "}
                                            {saItem.feedback}
                                          </p>
                                        ) : null}
                                        {saItem.pointsDeducted &&
                                        saItem.deductionReason ? (
                                          <p className="whitespace-pre-line opacity-90">
                                            <span className="font-semibold">
                                              감점 사유:
                                            </span>{" "}
                                            {saItem.deductionReason}
                                          </p>
                                        ) : null}
                                      </div>
                                    )}
                                  </li>
                                );
                              })}
                            </ol>
                            <div className="mt-2 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
                              {!isStudent ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={handleShortAnswerGrade}
                                    disabled={
                                      !shortAnswerExamStats?.allAnswered ||
                                      shortAnswerExamStats?.graded ||
                                      shortAnswerGrading
                                    }
                                    className={`inline-flex items-center px-3 py-1.5 rounded text-xs font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                                      isDarkMode
                                        ? "bg-[#ff824d] text-white hover:bg-[#f26f37]"
                                        : "bg-[#ff824d] text-white hover:bg-[#f26f37]"
                                    }`}
                                  >
                                    {shortAnswerGrading
                                      ? "채점 중…"
                                      : "작성한 단답/서술형 채점하기"}
                                  </button>
                                  {shortAnswerExamStats?.graded &&
                                  shortAnswerExamStats.totalScoreOutOf10 != null ? (
                                    <p
                                      className={`text-xs font-semibold ${isDarkMode ? "text-emerald-300" : "text-emerald-700"}`}
                                    >
                                      총점{" "}
                                      {shortAnswerExamStats.totalScoreOutOf10.toFixed(
                                        1,
                                      )}{" "}
                                      / 10
                                    </p>
                                  ) : (
                                    <p className="text-xs opacity-70">
                                      모든 문항에 답안을 작성한 뒤 채점하기를 누를
                                      수 있습니다.
                                    </p>
                                  )}
                                </>
                              ) : (
                                <p className="text-xs opacity-70">
                                  답안을 모두 작성한 뒤 상단에서 제출할 수 있습니다.
                                </p>
                              )}
                            </div>
                            {shortAnswerGradeError ? (
                              <p
                                className={`mt-1 text-xs ${isDarkMode ? "text-red-400" : "text-red-600"}`}
                              >
                                {shortAnswerGradeError}
                              </p>
                            ) : null}
                          </section>
                        ) : null}
                        {examDetail.debateTopics?.length ? (
                          <section>
                            <h3 className="text-sm font-semibold mb-2">토론형 주제 ({examDetail.debateTopics.length}개)</h3>
                            <ol className="space-y-3 text-xs list-decimal list-inside">
                              {examDetail.debateTopics.map((d, idx) => (
                                <li key={idx} className={`rounded-lg border p-2 ${isDarkMode ? "border-zinc-700" : "border-gray-200 bg-white"}`}>
                                  <p className="font-medium mb-1">{d.topic}</p>
                                  {d.context && <p className="text-xs opacity-80 whitespace-pre-line">맥락: {d.context}</p>}
                                  <p className="mt-1 text-xs"><span className="font-semibold">찬성 입장:</span> {d.proSideStand}</p>
                                  <p className="mt-1 text-xs"><span className="font-semibold">반대 입장:</span> {d.conSideStand}</p>
                                  {d.evaluationCriteria?.length > 0 && (
                                    <p className="mt-1 text-xs opacity-80">평가 기준: {d.evaluationCriteria.join(", ")}</p>
                                  )}
                                </li>
                              ))}
                            </ol>
                          </section>
                        ) : null}
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                  {previewIsAiGenerationDoc ? (
                    <div
                      className="box-border flex h-12 max-h-12 min-h-12 shrink-0 items-center gap-3 border-b px-4"
                      style={{
                        backgroundColor: isDarkMode ? "#242424" : "#FFFFFF",
                        color: isDarkMode ? "#FFFFFF" : "#000000",
                        borderColor: isDarkMode ? "rgba(255, 255, 255, 0.18)" : "rgba(0, 0, 0, 0.14)",
                      }}
                    >
                      <div className="flex min-w-0 flex-1 items-center">
                        <h2 className="truncate text-sm font-semibold leading-none">
                          AI 생성 자료 (문서)
                        </h2>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleCopyAiDocument}
                          disabled={!previewMarkdownContent?.trim()}
                          className={`inline-flex h-8 items-center gap-1.5 rounded-[var(--app-control-radius)] border px-2.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
                            isDarkMode
                              ? "border-white/15 bg-[#2b2b2b] text-gray-100 hover:bg-[#343434]"
                              : "border-[#dedbd5] bg-white text-[#212121] hover:bg-[#f7f5f1]"
                          }`}
                          title="본문 복사"
                        >
                          <ClipboardIcon className="h-3.5 w-3.5" />
                          <span>복사</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleDownloadAiDocumentMarkdown}
                          disabled={!previewMarkdownContent?.trim()}
                          className={`inline-flex h-8 items-center gap-1.5 rounded-[var(--app-control-radius)] border px-2.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
                            isDarkMode
                              ? "border-white/15 bg-[#2b2b2b] text-gray-100 hover:bg-[#343434]"
                              : "border-[#dedbd5] bg-white text-[#212121] hover:bg-[#f7f5f1]"
                          }`}
                          title="마크다운 파일로 다운로드"
                        >
                          <svg
                            className="h-3.5 w-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path
                              d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M8 12l4 4m0 0 4-4m-4 4V4"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                            />
                          </svg>
                          <span>MD</span>
                        </button>
                        <button
                          type="button"
                          onClick={handlePrintAiDocumentAsPdf}
                          disabled={!previewMarkdownContent?.trim()}
                          className={`inline-flex h-8 items-center gap-1.5 rounded-[var(--app-control-radius)] border px-2.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
                            isDarkMode
                              ? "border-white/15 bg-[#2b2b2b] text-gray-100 hover:bg-[#343434]"
                              : "border-[#dedbd5] bg-white text-[#212121] hover:bg-[#f7f5f1]"
                          }`}
                          title="인쇄 대화상자에서 PDF로 저장"
                        >
                          <svg
                            className="h-3.5 w-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path
                              d="M7 8V4h10v4M7 17H5a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2M7 14h10v6H7z"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                            />
                          </svg>
                          <span>PDF 저장</span>
                        </button>
                      </div>
                    </div>
                  ) : null}
                  <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                    {previewLoading ? (
                <div
                  className={`flex-1 flex items-center justify-center ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                >
                  <p className="text-sm">자료를 불러오는 중…</p>
                </div>
              ) : previewLoadError ? (
                <div
                  className={`flex-1 flex flex-col items-center justify-center p-6 text-center ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
                >
                  <p className="text-sm mb-2">
                    미리보기를 불러오지 못했습니다.
                  </p>
                  {previewErrorMessage && (
                    <p className="text-xs mb-2 opacity-90 max-w-sm">
                      {previewErrorMessage}
                    </p>
                  )}
                  <p className="text-xs mb-6 opacity-80">
                    잠시 후 다시 시도해주세요.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewLoadError(false);
                      setPreviewErrorMessage(null);
                      setPreviewRetryKey((k) => k + 1);
                    }}
                    className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold cursor-pointer ${
                      isDarkMode
                        ? "bg-[#ff824d] hover:bg-[#ff6b33] text-white"
                        : "bg-[#ff824d] hover:bg-[#ff6b33] text-white"
                    }`}
                  >
                    다시 시도
                  </button>
                </div>
              ) : previewMarkdownContent != null ? (
                <div
                  className={`flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden ${
                    isDarkMode ? "text-gray-200" : "text-gray-900"
                  }`}
                >
                  <div
                    ref={previewMarkdownScrollRef}
                    className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto [scrollbar-gutter:stable]"
                  >
                    <div className="relative flex min-h-min w-full flex-col gap-5 px-5 py-6 sm:px-7 sm:py-7">
                      <article
                        className={`prose prose-lg prose-neutral relative z-0 max-w-none min-w-0 min-h-min leading-relaxed break-words [&_*]:break-words [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_code]:break-words prose-headings:scroll-mt-24 prose-headings:font-semibold prose-h1:text-balance prose-blockquote:border-l-4 prose-blockquote:border-emerald-600/45 prose-blockquote:bg-zinc-500/[0.06] dark:prose-blockquote:bg-white/[0.04] ${isDarkMode ? "prose-invert" : ""}`}
                      >
                        <MarkdownContent>{previewMarkdownContent}</MarkdownContent>
                      </article>
                    </div>
                  </div>
                </div>
              ) : previewBlobUrl ? (
                <div className={`flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden ${previewShellClass}`}>
                  <PdfViewer
                    ref={pdfViewerRef}
                    fileUrl={previewBlobUrl}
                    title={previewFileName || "자료 미리보기"}
                    className="min-h-0"
                    onPageChange={(page, meta) => {
                      setPreviewCurrentPdfPage(page);
                      if (meta?.source === "user") {
                        setUserPdfNav({ page, at: Date.now() });
                      }
                    }}
                  />
                </div>
              ) : (
                <div
                  className={`flex-1 flex flex-col items-center justify-center p-6 text-center ${previewShellClass} ${
                    isDarkMode ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  <p className="text-sm mb-2">미리보기를 표시할 수 없습니다.</p>
                  <p className="text-xs opacity-80 mb-5">
                    자료가 아직 처리 중이거나, 파일을 불러오지 못했습니다.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewLoadError(false);
                      setPreviewErrorMessage(null);
                      setPreviewRetryKey((k) => k + 1);
                    }}
                    className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold cursor-pointer ${
                      isDarkMode
                        ? "bg-[#ff824d] hover:bg-[#ff6b33] text-white"
                        : "bg-[#ff824d] hover:bg-[#ff6b33] text-white"
                    }`}
                  >
                    다시 시도
                  </button>
                </div>
              )}
                  </div>
                </div>
              )}
            </div>
            <div
              role="separator"
              aria-label={
                isResourceDocPreview
                  ? "뷰어와 채팅 패널 너비 조절"
                  : "채팅창 너비 조절"
              }
              title="드래그: 너비 조절 · 더블클릭: 기본 크기"
              onMouseDown={
                isResourceDocPreview
                  ? handleResourcePreviewSplitResizeStart
                  : handleRightSidebarResizeStart
              }
              onDoubleClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isResourceDocPreview) {
                  setResourcePreviewViewerWidthPx(null);
                } else {
                  const preserved = lastResourcePreviewSidebarWidthRef.current;
                  if (preserved != null && Number.isFinite(preserved)) {
                    setRightSidebarWidth(preserved);
                  } else {
                    const rowWidth =
                      resourcePreviewSplitRowRef.current?.getBoundingClientRect()
                        .width;
                    if (rowWidth != null && Number.isFinite(rowWidth)) {
                      setRightSidebarWidth(
                        Math.min(680, Math.max(280, Math.round(rowWidth / 2))),
                      );
                    } else {
                      setRightSidebarWidth(RIGHT_SIDEBAR_DEFAULT_WIDTH);
                    }
                  }
                }
              }}
              className={`shrink-0 w-1 cursor-col-resize flex items-center justify-center group hover:bg-[#ff824d]/25 transition-colors ${
                isDarkMode ? "bg-zinc-800" : "bg-gray-200"
              }`}
            >
              <div
                className={`w-0.5 h-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${
                  isDarkMode ? "bg-[#ff824d]" : "bg-[#ff824d]"
                }`}
              />
            </div>
            {/* 우: 채팅(강의 학습) — PDF/MD는 분할 너비, 시험 뷰는 고정 픽셀 */}
            <div
              ref={resourcePreviewChatPanelRef}
              className={`min-h-0 overflow-hidden flex flex-col ${previewShellClass} ${
                isResourceDocPreview ? "min-w-0" : "shrink-0"
              }`}
              style={
                isResourceDocPreview
                  ? {
                      flex: "2 1 0%",
                      minWidth: RESOURCE_PREVIEW_SPLIT_MIN_SIDEBAR,
                    }
                  : {
                      width: rightSidebarWidth,
                      minWidth: RESOURCE_PREVIEW_SPLIT_MIN_SIDEBAR,
                    }
              }
            >
            <RightSidebar
              fillContainer={usePdfLearningPanelStyle}
              width={rightSidebarWidth}
              lectureId={selectedLectureId ?? undefined}
              courseId={courseDetail.courseId}
              viewMode="course-detail"
              courseDetail={courseDetail}
              previewCurrentPdfPage={previewCurrentPdfPage}
              assistantMaterialId={previewMaterialId}
              assistantPdfActive={
                Boolean(previewBlobUrl) && previewMarkdownContent == null
              }
              goToPdfPage={(page) => pdfViewerRef.current?.goToPage(page)}
              userPdfNav={userPdfNav}
              onLectureDataChange={(_, fileUrl, fileName, materialIdOpt) => {
                if (fileUrl) {
                  setPreviewFileUrl(fileUrl);
                  setPreviewFileName(fileName);
                  const resolvedMid = resolveMaterialIdFromSidebarSync(
                    selectedLectureId,
                    fileUrl,
                    fileName ?? "",
                    localMaterials,
                    materialIdOpt,
                  );
                  setPreviewMaterialId(resolvedMid);
                  const gen = /\/materials\/generation\/(\d+)\//.exec(fileUrl);
                  if (gen) {
                    const sid = Number(gen[1]);
                    setPreviewLinkedGenerationSessionId(sid);
                    setPreviewIsAiGenerationDoc(true);
                    patchResourceInUrl({ gen: sid });
                  } else {
                    setPreviewLinkedGenerationSessionId(null);
                    setPreviewIsAiGenerationDoc(false);
                    if (resolvedMid != null) {
                      patchResourceInUrl({ material: resolvedMid });
                    } else {
                      const mid = parseMaterialIdFromMaterialFileUrl(fileUrl);
                      patchResourceInUrl(mid != null ? { material: mid } : {});
                    }
                  }
                }
              }}
              examProps={
                isTeacher
                  ? {
                      examMode: rightSidebarExamMode,
                      onExamModeChange: setRightSidebarExamMode,
                      isTeacher,
                      examType,
                      setExamType,
                      examCount,
                      setExamCount,
                      examFormKey,
                      profileProficiencyLevel,
                      setProfileProficiencyLevel,
                      profileTargetDepth,
                      setProfileTargetDepth,
                      profileQuestionModality,
                      setProfileQuestionModality,
                      onCreateExam: handleExamGenAsyncSubmit,
                      submitting: submitting || !!examGenPollingTaskId,
                      onRecoverSession: handleExamSessionRecoverOpen,
                      recoverOpen: examRecoverOpen,
                      recoverSelectedId: examRecoverSelectedId,
                      setRecoverSelectedId: setExamRecoverSelectedId,
                      recoverExams: examsForActiveResource,
                      onRecoverSubmit: handleExamSessionRecoverSubmit,
                      setRecoverOpen: setExamRecoverOpen,
                      onExamClick: (id) => {
                        const ex = examsForActiveResource.find(
                          (e) => String(e.examSessionId) === String(id),
                        );
                        void openExamSessionDetail(id, ex?.title ?? null);
                      },
                      examEditMode,
                      onExamEditModeChange: (v) => {
                        setExamEditMode(v);
                        if (!v) setSelectedExamIds({});
                      },
                      selectedExamIds,
                      onToggleExamSelect: handleToggleExamSelect,
                      onDeleteSelectedExams: handleDeleteSelectedExams,
                      onDeleteExam: handleDeleteSingleExam,
                    }
                  : STUDENT_PDF_SIDEBAR_EXAM_PROPS
              }
            />
            </div>
          </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex h-full min-h-0 flex-col">
        {/* 자료 생성 중 표시 (모달 닫은 후 백그라운드 진행 시) */}
        {materialAsyncTaskId && (
          <div
            className={`mb-4 shrink-0 flex items-center gap-3 px-4 py-2.5 rounded-xl border ${isDarkMode ? "bg-emerald-900/30 border-emerald-700 text-emerald-200" : "bg-emerald-50 border-emerald-200 text-emerald-800"}`}
          >
            <span
              className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"
              aria-hidden
            />
            <span className="text-sm font-medium">
              자료 생성 중: {materialKeyword.trim() || "AI 자료"}
            </span>
            <span className="text-xs opacity-80">
              완료 시 목록에 자동 추가됩니다.
            </span>
          </div>
        )}
        {/* 상단 컨트롤 영역(md 미만에서는 주차 가로 선택만 표시) */}
        <div
          className={`flex-1 flex flex-col min-h-0 overflow-hidden ${
            isDarkMode ? "bg-[#181818]" : "bg-[#fbfaf7]"
          }`}
        >
          <div
            className={`md:hidden box-border flex min-h-12 shrink-0 items-center gap-2 border-b px-3 py-1.5 ${
              isDarkMode ? "border-[#2b2b2b]" : "border-[#dedbd5]"
            }`}
          >
              <div className="flex min-h-0 min-w-0 flex-1 items-center gap-2 overflow-x-auto no-scrollbar">
                {weekNumbers.map((week) => {
                  const label = week === 0 ? "OT" : `${week}주차`;
                  const lec = courseDetail?.lectures?.find(
                    (l) => l.weekNumber === week,
                  );
                  const lectureTitle = lec?.title?.trim();
                  const showLectureTitle =
                    !!lectureTitle && lectureTitle !== label;
                  const isActiveWeek =
                    selectedLecture && selectedLecture.weekNumber === week;
                  const isActiveChip =
                    !bulkEditMode &&
                    selectedLecture &&
                    selectedLecture.weekNumber === week;
                  const weekEditRow =
                    isTeacher &&
                    bulkEditMode &&
                    lec != null &&
                    onEditLecture &&
                    onDeleteLecture;
                  const chipBaseInEdit = isActiveWeek
                    ? isDarkMode
                      ? "bg-[#ff9b6a] text-[#181818]"
                      : "bg-[#ff824d] text-[#FFFFFF]"
                    : isDarkMode
                      ? "bg-white/[0.08] text-gray-200 hover:bg-white/[0.13]"
                      : "bg-[#f4f1eb] text-[#212121] hover:bg-[#ebe6dc]";
                  if (weekEditRow) {
                    return (
                      <div
                        key={week}
                        className={`flex h-9 shrink-0 items-center gap-0.5 rounded-full pl-2 pr-1 text-xs font-medium transition-colors xl:text-sm ${chipBaseInEdit}`}
                      >
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                          }}
                          onClick={() =>
                            lec &&
                            onSelectLecture?.(lec.lectureId)
                          }
                          className="flex min-h-0 min-w-0 max-w-[12rem] flex-1 items-center gap-1.5 truncate px-1 text-left"
                        >
	                      <span className="w-11 shrink-0 text-left tabular-nums">{label}</span>
                          {showLectureTitle ? (
                            <span className="min-w-0 truncate opacity-75">
                              {lectureTitle}
                            </span>
                          ) : null}
                        </button>
                        <div className="flex shrink-0 items-center gap-0.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onEditLecture?.(lec);
                            }}
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${
                              isDarkMode
                                ? "text-[#ff824d] bg-black/35 hover:bg-black/50"
                                : "text-gray-800 bg-white/85 hover:bg-white"
                            }`}
                            aria-label={`${label} 수정`}
                            title="강의 수정"
                          >
                            <EditIcon className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              void onDeleteLecture?.(lec.lectureId);
                            }}
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${
                              isDarkMode
                                ? "text-[#ff824d] bg-black/35 hover:bg-black/50"
                                : "text-[#ff824d] bg-white/85 hover:bg-white"
                            }`}
                            aria-label={`${label} 삭제`}
                            title="강의 삭제"
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <button
                      key={week}
                      type="button"
                      onClick={() => {
                        if (onSelectLecture && courseDetail.lectures) {
                          const target = courseDetail.lectures.find(
                            (l) => l.weekNumber === week,
                          );
                          if (target) {
                            onSelectLecture(target.lectureId);
                          }
                        }
                      }}
                      className={`inline-flex h-9 max-w-[14rem] shrink-0 items-center gap-1.5 px-3 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer transition-colors xl:text-sm ${
                        isActiveChip
                          ? isDarkMode
                            ? "bg-[#ff9b6a] text-[#181818]"
                            : "bg-[#ff824d] text-[#FFFFFF]"
                          : isDarkMode
                            ? "bg-white/[0.08] text-gray-200 hover:bg-white/[0.13]"
                            : "bg-[#f4f1eb] text-[#212121] hover:bg-[#ebe6dc]"
                      }`}
                    >
	                          <span className="w-12 shrink-0 text-left tabular-nums">{label}</span>
                      {showLectureTitle ? (
                        <span className="min-w-0 truncate opacity-75">
                          {lectureTitle}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
                {!weekNumbers.length && (
                  <span
                    className={`text-xs xl:text-sm ${
                      isDarkMode ? "text-gray-500" : "text-gray-400"
                    }`}
                  >
                    등록된 강의가 없습니다.
                  </span>
                )}
              </div>
              {lectureResourcesLoading ? (
                <span className="shrink-0 whitespace-nowrap text-xs xl:text-sm opacity-70">
                  불러오는 중...
                </span>
              ) : null}
          </div>

          {/* 강의 리소스 박스 그리드 영역 — 데스크톱에서는 주차 헤더 줄이 없어서 상단 구분선만 border-t로 유지 */}
          <div className="flex flex-1 min-h-0 overflow-hidden">
            {renderCourseNavigationSidebar("detail")}

            <div
              className={`flex min-h-0 flex-1 min-w-0 flex-col overflow-hidden p-3 ${
                isDarkMode ? "text-gray-200" : "text-[#212121]"
              }`}
            >
              {teacherMainPanel === "materials" ? (
                <CourseMaterialsMetaCard
	                  title={courseDetail.title ?? "강의실"}
	                  description={courseDetail.description}
	                  invitationCode={courseDetail.invitationCode}
		                  resourceActions={
	                    isTeacher ? (
	                      <>
	                        <button
	                          type="button"
	                          onClick={() => {
	                            setWeekBoardTab(null);
	                            window.dispatchEvent(new Event("open-upload-modal"));
	                          }}
	                          className={weekResourceActionClass(false)}
	                        >
	                          <UploadTrayIcon className="h-3.5 w-3.5 shrink-0 text-[#ff824d]" />
	                          <span className="truncate">자료 업로드</span>
	                        </button>
	                        <button
	                          type="button"
	                          onClick={() => {
	                            setWeekBoardTab(null);
	                            window.dispatchEvent(new Event("open-material-gen-modal"));
	                          }}
	                          className={weekResourceActionClass(false)}
	                        >
	                          <SparklesIcon className="h-3.5 w-3.5 shrink-0 text-[#ff824d]" />
	                          <span className="truncate">자료 생성</span>
	                        </button>
	                        <button
	                          type="button"
	                          onClick={() => openWeekBoardPanel("notices")}
	                          className={weekResourceActionClass(weekBoardTab === "notices")}
	                        >
	                          <svg
	                            className={`h-3.5 w-3.5 shrink-0 ${
	                              isDarkMode && weekBoardTab !== "notices"
	                                ? "text-[#ff824d]"
	                                : ""
	                            }`}
	                            fill="none"
	                            stroke="currentColor"
	                            viewBox="0 0 24 24"
	                            aria-hidden="true"
	                          >
	                            <path
	                              d="M4 7h3l9-3v16l-9-3H4V7Zm3 0v10M18 9.5a4 4 0 0 1 0 5"
	                              strokeLinecap="round"
	                              strokeLinejoin="round"
	                              strokeWidth={2}
	                            />
	                          </svg>
	                          <span className="truncate">공지</span>
	                        </button>
	                        <button
	                          type="button"
	                          onClick={() => openWeekBoardPanel("discussions")}
	                          className={weekResourceActionClass(weekBoardTab === "discussions")}
	                        >
	                          <svg
	                            className={`h-3.5 w-3.5 shrink-0 ${
	                              isDarkMode && weekBoardTab !== "discussions"
	                                ? "text-[#ff824d]"
	                                : ""
	                            }`}
	                            fill="none"
	                            stroke="currentColor"
	                            viewBox="0 0 24 24"
	                            aria-hidden="true"
	                          >
	                            <path
	                              d="M7 8h10M7 12h6m8-1a7 7 0 0 1-7 7H9l-5 3 1.5-4.5A7 7 0 1 1 21 11Z"
	                              strokeLinecap="round"
	                              strokeLinejoin="round"
	                              strokeWidth={2}
	                            />
	                          </svg>
	                          <span className="truncate">토론</span>
	                        </button>
	                      </>
	                    ) : null
	                  }
	                  isDarkMode={isDarkMode}
	                  isTeacher={isTeacher}
                  onCopyInvitationCode={handleCopyInvitationCodeSilent}
	                  onEditCourseMeta={() => {
	                    setEditCourseMetaTitle(courseDetail.title ?? "");
	                    setEditCourseMetaDescription(courseDetail.description ?? "");
	                    setEditCourseMetaModalOpen(true);
	                  }}
                    isEditingCourseMeta={editCourseMetaModalOpen}
                    editTitle={editCourseMetaTitle}
                    editDescription={editCourseMetaDescription}
                    editSaving={editCourseMetaSaving}
                    onEditTitleChange={setEditCourseMetaTitle}
                    onEditDescriptionChange={setEditCourseMetaDescription}
                    onCancelEditCourseMeta={() => {
                      if (!editCourseMetaSaving) {
                        setEditCourseMetaModalOpen(false);
                        setEditCourseMetaTitle(courseDetail.title ?? "");
                        setEditCourseMetaDescription(courseDetail.description ?? "");
                      }
                    }}
                    onSaveCourseMeta={handleEditCourseMetaSubmit}
	                />
	              ) : null}
	              <div className="scrollbar-hide flex min-h-0 flex-1 flex-col overflow-y-auto pb-4">
              {isTeacher && teacherMainPanel === "classroomReport" ? (
                renderClassroomReportPage()
              ) : false ? (
                <div className="flex min-h-full flex-col gap-4 pb-6">
                  <section
                    className={`rounded-xl border px-4 py-4 ${
                      isDarkMode
                        ? "border-[#1b3443] bg-[#181818] text-gray-100"
                        : "border-[#d9d9dd] bg-white text-gray-900"
                    }`}
                  >
                    <div className="mb-4 flex min-h-10 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <h2 className="text-xl font-semibold">강의실 리포트</h2>
                        <p
                          className={`mt-1 text-sm ${
                            isDarkMode ? "text-gray-400" : "text-gray-500"
                          }`}
                        >
                          강의실 전체 학습 흐름과 위험 요소를 종합해서 확인합니다.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={
                            classroomReportLoading ||
                            classroomAnalyzeSyncLoading ||
                            classroomAnalyzeStreaming
                          }
                          onClick={() => {
                            if (courseDetail?.courseId == null) return;
                            setClassroomReportLoading(true);
                            setClassroomReportError(null);
                            void studentReportApi
                              .getClassroomReport(courseDetail.courseId)
                              .then((r) => setClassroomReport(r))
                              .catch((e) => {
                                setClassroomReportError(
                                  e instanceof Error
                                    ? e.message
                                    : "강의실 리포트를 불러오지 못했습니다.",
                                );
                                setClassroomReport(undefined);
                              })
                              .finally(() => setClassroomReportLoading(false));
                          }}
                          aria-label="새로고침"
                          title="새로고침"
                          className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold disabled:opacity-50 ${
                            isDarkMode
                              ? "bg-white/[0.08] text-gray-200 hover:bg-white/[0.12]"
                              : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                          }`}
                        >
                          <RefreshIcon className={`h-4 w-4 ${classroomReportLoading ? "animate-spin" : ""}`} />
                        </button>
                        <button
                          type="button"
                          disabled={
                            classroomAnalyzeSyncLoading ||
                            classroomAnalyzeStreaming ||
                            classroomReportLoading
                          }
                          onClick={() => {
                            if (courseDetail?.courseId == null) return;
                            setClassroomAnalyzeSyncLoading(true);
                            setClassroomReportError(null);
                            void (async () => {
                              try {
                                await studentReportApi.analyzeClassroomSync(
                                  courseDetail.courseId,
                                );
                                const r =
                                  await studentReportApi.getClassroomReport(
                                    courseDetail.courseId,
                                  );
                                setClassroomReport(r);
                              } catch (e) {
                                setClassroomReportError(
                                  e instanceof Error
                                    ? e.message
                                    : "동기 분석에 실패했습니다.",
                                );
                              } finally {
                                setClassroomAnalyzeSyncLoading(false);
                              }
                            })();
                          }}
                          className="rounded-lg bg-[#ff824d] px-3 py-2 text-xs font-semibold text-white hover:bg-[#f26f37] disabled:opacity-50"
                        >
                          {classroomAnalyzeSyncLoading
                            ? "분석 중..."
                            : "종합 분석"}
                        </button>
                        <button
                          type="button"
                          disabled={
                            classroomAnalyzeStreaming ||
                            classroomAnalyzeSyncLoading ||
                            classroomReportLoading
                          }
                          onClick={() => {
                            if (courseDetail?.courseId == null) return;
                            setClassroomAnalyzeStreaming(true);
                            setClassroomStreamBuffer("");
                            setClassroomReportError(null);
                            void (async () => {
                              try {
                                await studentReportApi.streamClassroomAnalyze(
                                  courseDetail.courseId,
                                  {
                                    onDelta: (c) =>
                                      setClassroomStreamBuffer((p) => p + c),
                                  },
                                );
                                const r =
                                  await studentReportApi.getClassroomReport(
                                    courseDetail.courseId,
                                  );
                                setClassroomReport(r);
                              } catch (e) {
                                setClassroomReportError(
                                  e instanceof Error
                                    ? e.message
                                    : "스트리밍 분석에 실패했습니다.",
                                );
                              } finally {
                                setClassroomAnalyzeStreaming(false);
                              }
                            })();
                          }}
                          className="rounded-lg bg-[#ff824d] px-3 py-2 text-xs font-semibold text-white hover:bg-[#f26f37] disabled:opacity-50"
                        >
                          {classroomAnalyzeStreaming
                            ? "수신 중..."
                            : "스트리밍 분석"}
                        </button>
                      </div>
                    </div>

                    <div className="mb-4 grid grid-cols-2 gap-2 xl:grid-cols-4">
                      {studentReportDashboardStats.map((stat) => (
                        <article
                          key={stat.label}
                          className={`rounded-xl border px-3 py-3 ${
                            isDarkMode
                              ? "border-[#343434] bg-[#202020]"
                              : "border-[#dedbd5] bg-[#fbfaf7]"
                          }`}
                        >
                          <div className="mb-2 flex items-center gap-2">
                            <span
                              className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${
                                isDarkMode
                                  ? "bg-[#ff824d]/15 text-[#ffad9b]"
                                  : "bg-[#ff824d]/10 text-[#ff824d]"
                              }`}
                            >
                              <ReportDashboardStatIcon name={stat.icon} />
                            </span>
                            <span className="text-xs font-semibold opacity-75">
                              {stat.label}
                            </span>
                          </div>
                          <p className="text-xl font-semibold">{stat.value}</p>
                          <p className="mt-1 text-xs opacity-60">{stat.helper}</p>
                        </article>
                      ))}
                    </div>

                    {classroomReportError ? (
                      <p
                        className={`mb-4 text-sm ${
                          isDarkMode ? "text-red-300" : "text-red-600"
                        }`}
                      >
                        {classroomReportError}
                      </p>
                    ) : null}

                    {classroomReportLoading ? (
                      <div className="py-12 text-center text-sm opacity-70">
                        불러오는 중...
                      </div>
                    ) : classroomReport === null ? (
                      <div
                        className={`rounded-lg border p-6 text-sm ${
                          isDarkMode
                            ? "border-zinc-700 bg-zinc-900/40"
                            : "border-gray-200 bg-gray-50"
                        }`}
                      >
                        아직 생성된 강의실 종합 리포트가 없습니다. 상단에서 분석을
                        실행해 보세요.
                      </div>
                    ) : classroomReport ? (
                      <div className="space-y-5">
                        <div
                          className={`flex flex-wrap gap-3 text-xs ${
                            isDarkMode ? "text-gray-400" : "text-gray-600"
                          }`}
                        >
                          {classroomReport.generatedAt ? (
                            <span>생성: {classroomReport.generatedAt}</span>
                          ) : null}
                          {classroomReport.confidence ? (
                            <span>신뢰도: {classroomReport.confidence}</span>
                          ) : null}
                          {classroomReport.source ? (
                            <span>출처: {classroomReport.source}</span>
                          ) : null}
                          {classroomReport.fallbackUsed ? (
                            <span>폴백 사용</span>
                          ) : null}
                        </div>

                        {classroomReport.reason ? (
                          <p
                            className={`text-xs ${
                              isDarkMode ? "text-amber-200/90" : "text-amber-800"
                            }`}
                          >
                            {classroomReport.reason}
                          </p>
                        ) : null}

                        <section className="space-y-2">
                          <h3 className="text-sm font-semibold">요약</h3>
                          <div
                            className={`rounded-lg border p-4 text-sm prose prose-sm max-w-none dark:prose-invert ${
                              isDarkMode
                                ? "border-zinc-700 bg-zinc-900/40"
                                : "border-gray-200 bg-gray-50"
                            }`}
                          >
                            {classroomReport.summaryMarkdown.trim() ? (
                              <MarkdownContent>
                                {classroomReport.summaryMarkdown}
                              </MarkdownContent>
                            ) : (
                              <span className="opacity-70">
                                요약 본문이 없습니다.
                              </span>
                            )}
                          </div>
                        </section>

                        {classroomReport.highlights.length > 0 ? (
                          <section className="space-y-2">
                            <h3 className="text-sm font-semibold">하이라이트</h3>
                            <ul className="space-y-2">
                              {classroomReport.highlights.map((row, i) => (
                                <li
                                  key={`classroom-h-${i}`}
                                  className={`rounded-lg border px-3 py-2 text-sm ${
                                    isDarkMode
                                      ? "border-zinc-700 bg-zinc-900/30"
                                      : "border-gray-200 bg-white"
                                  }`}
                                >
                                  {reportInsightPrimaryText(row)}
                                </li>
                              ))}
                            </ul>
                          </section>
                        ) : null}

                        {classroomReport.risks.length > 0 ? (
                          <section className="space-y-2">
                            <h3 className="text-sm font-semibold">리스크</h3>
                            <ul className="space-y-2">
                              {classroomReport.risks.map((row, i) => (
                                <li
                                  key={`classroom-r-${i}`}
                                  className={`rounded-lg border px-3 py-2 text-sm ${
                                    isDarkMode
                                      ? "border-zinc-700 bg-zinc-900/30"
                                      : "border-gray-200 bg-white"
                                  }`}
                                >
                                  {reportInsightPrimaryText(row)}
                                </li>
                              ))}
                            </ul>
                          </section>
                        ) : null}

                        {classroomReport.coachingPriorities.length > 0 ? (
                          <section className="space-y-2">
                            <h3 className="text-sm font-semibold">
                              코칭 우선순위
                            </h3>
                            <ul className="space-y-2">
                              {classroomReport.coachingPriorities.map((row, i) => (
                                <li
                                  key={`classroom-c-${i}`}
                                  className={`rounded-lg border px-3 py-2 text-sm ${
                                    isDarkMode
                                      ? "border-zinc-700 bg-zinc-900/30"
                                      : "border-gray-200 bg-white"
                                  }`}
                                >
                                  {reportInsightPrimaryText(row)}
                                </li>
                              ))}
                            </ul>
                          </section>
                        ) : null}
                      </div>
                    ) : null}

                    {classroomStreamBuffer.trim() ? (
                      <details
                        className={`mt-5 rounded-lg border text-sm ${
                          isDarkMode
                            ? "border-zinc-700 bg-zinc-900/20"
                            : "border-gray-200 bg-gray-50"
                        }`}
                      >
                        <summary className="cursor-pointer px-3 py-2 font-medium">
                          스트리밍 로그
                        </summary>
                        <pre className="overflow-x-auto whitespace-pre-wrap px-3 pb-3 text-xs opacity-90">
                          {classroomStreamBuffer}
                        </pre>
                      </details>
                    ) : null}
                  </section>
                  <section
                    className={`rounded-xl border px-4 py-4 ${
                      isDarkMode
                        ? "border-[#1b3443] bg-[#181818] text-gray-100"
                        : "border-[#d9d9dd] bg-white text-gray-900"
                    }`}
                  >
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <h2 className="text-xl font-semibold">학생별 리포트</h2>
                        <p
                          className={`mt-1 text-sm ${
                            isDarkMode ? "text-gray-400" : "text-gray-500"
                          }`}
                        >
                          학생별 학습 지표를 확인하고 리포트 기반 후속 질문을 이어갑니다.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          void loadStudentReportList();
                        }}
                        aria-label="학생 리포트 새로고침"
                        title="학생 리포트 새로고침"
                        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold disabled:opacity-50 ${
                          isDarkMode
                            ? "bg-white/[0.08] text-gray-200 hover:bg-white/[0.12]"
                            : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                        }`}
                      >
                        <RefreshIcon
                          className={`h-4 w-4 ${
                            studentReportListLoading ? "animate-spin" : ""
                          }`}
                        />
                      </button>
                    </div>

                    {studentReportListError ? (
                      <p
                        className={`mb-3 text-sm ${
                          isDarkMode ? "text-red-300" : "text-red-600"
                        }`}
                      >
                        {studentReportListError}
                      </p>
                    ) : null}

                    <div className="grid min-h-[30rem] grid-cols-1 gap-3 xl:grid-cols-[20rem_minmax(0,1fr)]">
                      <div
                        className={`flex min-h-0 flex-col rounded-xl border ${
                          isDarkMode
                            ? "border-[#2b2b2b] bg-[#202020]"
                            : "border-[#dedbd5] bg-[#fbfaf7]"
                        }`}
                      >
                        <div className="space-y-2 border-b border-inherit p-3">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={studentReportSearchInput}
                              onChange={(event) =>
                                setStudentReportSearchInput(event.target.value)
                              }
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  setStudentReportPage(0);
                                  setStudentReportQuery(
                                    studentReportSearchInput.trim(),
                                  );
                                }
                              }}
                              placeholder="학생 검색"
                              className={`min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm ${
                                isDarkMode
                                  ? "border-[#343434] bg-[#181818] text-white placeholder:text-gray-500"
                                  : "border-[#dedbd5] bg-white text-[#212121] placeholder:text-gray-400"
                              }`}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setStudentReportPage(0);
                                setStudentReportQuery(studentReportSearchInput.trim());
                              }}
                              className="rounded-lg bg-[#ff824d] px-3 py-2 text-sm font-semibold text-white hover:bg-[#f26f37]"
                            >
                              검색
                            </button>
                          </div>
                          <select
                            value={studentReportStatus}
                            onChange={(event) => {
                              setStudentReportPage(0);
                              setStudentReportStatus(
                                event.target.value as StudentReportStatusFilter,
                              );
                            }}
                            className={`w-full rounded-lg border px-3 py-2 text-sm ${
                              isDarkMode
                                ? "border-[#343434] bg-[#181818] text-white"
                                : "border-[#dedbd5] bg-white text-[#212121]"
                            }`}
                          >
                            {STUDENT_REPORT_STATUS_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="min-h-0 flex-1 overflow-y-auto p-2">
                          {studentReportListLoading ? (
                            <div className="flex h-full items-center justify-center text-sm opacity-70">
                              학생 리포트를 불러오는 중...
                            </div>
                          ) : studentReportList?.content?.length ? (
                            <div className="space-y-1.5">
                              {studentReportList.content.map((student) => {
                                const active =
                                  selectedStudentReportId === student.studentId;
                                const average = formatReportPercent(
                                  student.averageScorePercent,
                                );
                                const progress = formatReportPercent(
                                  student.courseProgressPercent,
                                );
                                const recent = formatActivityMonthForKo(
                                  student.latestActivityAt,
                                );
                                return (
                                  <button
                                    key={student.studentId}
                                    type="button"
                                    onClick={() =>
                                      setSelectedStudentReportId(student.studentId)
                                    }
                                    className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                                      active
                                        ? isDarkMode
                                          ? "border-[#ff9b6a] bg-[#ff9b6a] text-[#181818]"
                                          : "border-[#ff824d] bg-[#ff824d] text-white"
                                        : isDarkMode
                                          ? "border-[#343434] bg-[#181818] text-gray-100 hover:bg-[#252525]"
                                          : "border-[#dedbd5] bg-white text-[#212121] hover:bg-[#f7f5f1]"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="truncate text-sm font-semibold">
                                        {student.name || `학생 ${student.studentId}`}
                                      </span>
                                      <span className="shrink-0 text-xs opacity-75">
                                        {studentReportStatusLabel(
                                          String(student.reportStatus),
                                        )}
                                      </span>
                                    </div>
                                    <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[11px] opacity-80">
                                      <span className="rounded-md border border-current/10 px-1.5 py-1">
                                        평균 {average}
                                      </span>
                                      <span className="rounded-md border border-current/10 px-1.5 py-1">
                                        진도 {progress}
                                      </span>
                                      <span className="rounded-md border border-current/10 px-1.5 py-1">
                                        제출 {student.submissionCount ?? 0}
                                      </span>
                                    </div>
                                    <div className="mt-2 flex items-center justify-between gap-2 text-[11px] opacity-70">
                                      <span className="truncate">
                                        최근 활동 {recent}
                                      </span>
                                      <span className="shrink-0">
                                        시험 {student.examAttemptCount ?? 0}회
                                      </span>
                                    </div>
                                    {student.topStrengthLabel ||
                                    student.topImprovementLabel ? (
                                      <div className="mt-2 space-y-1 text-[11px] opacity-75">
                                        {student.topStrengthLabel ? (
                                          <p className="truncate">
                                            강점 {student.topStrengthLabel}
                                          </p>
                                        ) : null}
                                        {student.topImprovementLabel ? (
                                          <p className="truncate">
                                            보완 {student.topImprovementLabel}
                                          </p>
                                        ) : null}
                                      </div>
                                    ) : null}
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="flex h-full items-center justify-center px-3 text-center text-sm opacity-70">
                              표시할 학생 리포트가 없습니다.
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid min-h-0 grid-cols-1 gap-3 2xl:grid-cols-[minmax(0,1fr)_24rem]">
                        <div
                          className={`min-h-0 overflow-y-auto rounded-xl border p-4 ${
                            isDarkMode
                              ? "border-[#2b2b2b] bg-[#202020]"
                              : "border-[#dedbd5] bg-[#fbfaf7]"
                          }`}
                        >
                          {studentReportDetailLoading ? (
                            <div className="flex min-h-[16rem] items-center justify-center text-sm opacity-70">
                              학생 상세 리포트를 불러오는 중...
                            </div>
                          ) : studentReportDetailError ? (
                            <p
                              className={`text-sm ${
                                isDarkMode ? "text-red-300" : "text-red-600"
                              }`}
                            >
                              {studentReportDetailError}
                            </p>
                          ) : studentReportDetail ? (
                            <div className="space-y-4">
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                  <h3 className="text-lg font-semibold">
                                    {studentReportDetail.name ||
                                      `학생 ${studentReportDetail.studentId}`}
                                  </h3>
                                  <p className="mt-1 text-xs opacity-70">
                                    studentId {studentReportDetail.studentId}
                                    {studentReportDetail.email
                                      ? ` · ${studentReportDetail.email}`
                                      : ""}
                                  </p>
                                </div>
                                <span
                                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                    isDarkMode
                                      ? "bg-white/[0.08] text-gray-200"
                                      : "bg-white text-[#212121] border border-[#dedbd5]"
                                  }`}
                                >
                                  {studentReportStatusLabel(
                                    String(studentReportDetail.reportStatus),
                                  )}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
                                <div
                                  className={`rounded-lg border p-3 ${
                                    isDarkMode
                                      ? "border-[#343434] bg-[#181818]"
                                      : "border-[#dedbd5] bg-white"
                                  }`}
                                >
                                  <p className="text-xs opacity-70">평균 점수</p>
                                  <p className="mt-1 text-lg font-semibold">
                                    {formatReportPercent(
                                      studentReportDetail.averageScorePercent ??
                                        selectedStudentReportSummary
                                          ?.averageScorePercent,
                                    )}
                                  </p>
                                </div>
                                <div
                                  className={`rounded-lg border p-3 ${
                                    isDarkMode
                                      ? "border-[#343434] bg-[#181818]"
                                      : "border-[#dedbd5] bg-white"
                                  }`}
                                >
                                  <p className="text-xs opacity-70">최근 활동</p>
                                  <p className="mt-1 text-sm font-medium">
                                    {formatActivityMonthForKo(
                                      studentReportDetail.latestActivityAt ??
                                        selectedStudentReportSummary?.latestActivityAt,
                                    )}
                                  </p>
                                </div>
                                <div
                                  className={`rounded-lg border p-3 ${
                                    isDarkMode
                                      ? "border-[#343434] bg-[#181818]"
                                      : "border-[#dedbd5] bg-white"
                                  }`}
                                >
                                  <p className="text-xs opacity-70">학습 진도</p>
                                  <p className="mt-1 text-lg font-semibold">
                                    {formatReportPercent(
                                      selectedStudentReportSummary
                                        ?.courseProgressPercent,
                                    )}
                                  </p>
                                </div>
                                <div
                                  className={`rounded-lg border p-3 ${
                                    isDarkMode
                                      ? "border-[#343434] bg-[#181818]"
                                      : "border-[#dedbd5] bg-white"
                                  }`}
                                >
                                  <p className="text-xs opacity-70">시험 / 제출</p>
                                  <p className="mt-1 text-sm font-semibold">
                                    {formatReportCount(
                                      selectedStudentReportSummary?.examAttemptCount,
                                    )}{" "}
                                    /{" "}
                                    {formatReportCount(
                                      selectedStudentReportSummary?.submissionCount,
                                      "건",
                                    )}
                                  </p>
                                </div>
                              </div>

                              <section className="space-y-2">
                                <h4 className="text-sm font-semibold">서술 리포트</h4>
                                <div
                                  className={`rounded-lg border p-3 text-sm whitespace-pre-wrap ${
                                    isDarkMode
                                      ? "border-[#343434] bg-[#181818] text-gray-200"
                                      : "border-[#dedbd5] bg-white text-gray-700"
                                  }`}
                                >
                                  {studentReportDetail.narrativeReport?.trim() ||
                                    "리포트 본문이 없습니다."}
                                </div>
                              </section>

                              <section className="space-y-2">
                                <h4 className="text-sm font-semibold">역량</h4>
                                {studentReportDetail.competencies.length > 0 ? (
                                  <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                                    {studentReportDetail.competencies.map(
                                      (competency, index) => (
                                        <div
                                          key={`${competency.competencyName}-${index}`}
                                          className={`rounded-lg border p-3 ${
                                            isDarkMode
                                              ? "border-[#343434] bg-[#181818]"
                                              : "border-[#dedbd5] bg-white"
                                          }`}
                                        >
                                          <div className="flex items-center justify-between gap-2">
                                            <p className="truncate text-sm font-medium">
                                              {competency.competencyName}
                                            </p>
                                            <span className="shrink-0 text-xs opacity-70">
                                              {competency.scorePercent != null
                                                ? `${competency.scorePercent}%`
                                                : competency.level || "-"}
                                            </span>
                                          </div>
                                          {competency.feedback ? (
                                            <p className="mt-2 text-xs opacity-75">
                                              {competency.feedback}
                                            </p>
                                          ) : null}
                                        </div>
                                      ),
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-sm opacity-70">
                                    표시할 역량 데이터가 없습니다.
                                  </p>
                                )}
                              </section>

                              <details
                                className={`rounded-lg border text-sm ${
                                  isDarkMode
                                    ? "border-[#343434] bg-[#181818]"
                                    : "border-[#dedbd5] bg-white"
                                }`}
                              >
                                <summary className="cursor-pointer px-3 py-2 font-medium">
                                  AI 분석 컨텍스트
                                </summary>
                                <div className="space-y-2 px-3 pb-3 text-xs">
                                  {studentAiContextLoading ? (
                                    <p className="opacity-70">컨텍스트 불러오는 중...</p>
                                  ) : studentAiContextError ? (
                                    <p
                                      className={
                                        isDarkMode ? "text-red-300" : "text-red-600"
                                      }
                                    >
                                      {studentAiContextError}
                                    </p>
                                  ) : studentAiContext ? (
                                    <>
                                      <p>
                                        과제·평가{" "}
                                        {studentAiContext.activitySummary
                                          ?.totalAssessments ?? "-"}
                                        개 · 제출{" "}
                                        {studentAiContext.activitySummary
                                          ?.submittedCount ?? "-"}
                                        개 · 미제출{" "}
                                        {studentAiContext.activitySummary
                                          ?.missingCount ?? "-"}
                                        개
                                      </p>
                                      <p>
                                        추세{" "}
                                        {studentAiContext.scoreSummary?.trend ?? "-"}
                                      </p>
                                    </>
                                  ) : (
                                    <p className="opacity-70">컨텍스트가 없습니다.</p>
                                  )}
                                </div>
                              </details>
                            </div>
                          ) : (
                            <div className="flex min-h-[16rem] items-center justify-center text-sm opacity-70">
                              학생을 선택하면 상세 리포트가 표시됩니다.
                            </div>
                          )}
                        </div>

                        <div
                          className={`flex min-h-[30rem] flex-col rounded-xl border ${
                            isDarkMode
                              ? "border-[#2b2b2b] bg-[#202020]"
                              : "border-[#dedbd5] bg-[#fbfaf7]"
                          }`}
                        >
                          <div className="border-b border-inherit px-4 py-3">
                            <p className="text-sm font-semibold">리포트 챗봇</p>
                            <p className="mt-1 text-xs opacity-70">
                              선택한 학생의 리포트와 AI context를 기반으로 답변합니다.
                            </p>
                          </div>
                          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
                            {reportChatMessages.length === 0 ? (
                              <div className="flex h-full items-center justify-center px-4 text-center text-sm opacity-70">
                                예: 이 학생의 보완점과 다음 학습 우선순위를 알려줘.
                              </div>
                            ) : (
                              reportChatMessages.map((message) => (
                                <div
                                  key={message.id}
                                  className={`flex ${
                                    message.role === "user"
                                      ? "justify-end"
                                      : "justify-start"
                                  }`}
                                >
                                  <div
                                    className={`max-w-[84%] rounded-xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                                      message.role === "user"
                                        ? "bg-[#ff824d] text-white"
                                        : isDarkMode
                                          ? "border border-[#343434] bg-[#181818] text-gray-100"
                                          : "border border-[#dedbd5] bg-white text-[#212121]"
                                    }`}
                                  >
                                    <p className="mb-1 text-[11px] font-semibold opacity-70">
                                      {message.role === "user" ? "나" : "AI Tutor"}
                                    </p>
                                    {message.text ||
                                      (message.role === "assistant" ? "응답 생성 중..." : "")}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                          <form
                            className="flex shrink-0 gap-2 border-t border-inherit p-3"
                            onSubmit={(event) => {
                              event.preventDefault();
                              void submitStudentReportChatQuestion();
                            }}
                          >
                            <input
                              type="text"
                              value={reportChatInput}
                              onChange={(event) =>
                                setReportChatInput(event.target.value)
                              }
                              disabled={
                                reportChatSending ||
                                selectedStudentReportId == null ||
                                !studentReportDetail
                              }
                              placeholder={
                                selectedStudentReportId == null
                                  ? "학생을 먼저 선택하세요"
                                  : "리포트에 대해 질문하세요"
                              }
                              className={`min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm ${
                                isDarkMode
                                  ? "border-[#343434] bg-[#181818] text-white placeholder:text-gray-500"
                                  : "border-[#dedbd5] bg-white text-[#212121] placeholder:text-gray-400"
                              } disabled:opacity-50`}
                            />
                            {reportChatSending ? (
                              <button
                                type="button"
                                onClick={() => {
                                  reportChatAbortRef.current?.abort();
                                }}
                                className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                                  isDarkMode
                                    ? "border-[#343434] text-gray-200 hover:bg-white/[0.06]"
                                    : "border-[#dedbd5] text-[#212121] hover:bg-[#f7f5f1]"
                                }`}
                              >
                                중지
                              </button>
                            ) : (
                              <button
                                type="submit"
                                disabled={
                                  !reportChatInput.trim() ||
                                  selectedStudentReportId == null ||
                                  !studentReportDetail
                                }
                                className="rounded-lg bg-[#ff824d] px-3 py-2 text-sm font-semibold text-white hover:bg-[#f26f37] disabled:opacity-50"
                              >
                                전송
                              </button>
                            )}
                          </form>
                        </div>
                      </div>
	                    </div>
	                  </section>
	                  <ReportCriteriaPanel
	                    courseId={courseDetail.courseId}
	                    isDarkMode={isDarkMode}
	                  />
	                </div>
	              ) : isTeacher && teacherMainPanel === "studentManagement" ? (
                <TeacherStudentManagementPanel
                  courseId={courseDetail.courseId}
                  isDarkMode={isDarkMode}
                />
              ) : isTeacher && teacherMainPanel === "attendance" ? (
                <AttendanceSessionsPanel
                  courseId={courseDetail.courseId}
                  lectures={courseDetail.lectures}
                  isDarkMode={isDarkMode}
                  isTeacher={isTeacher}
                />
              ) : !isTeacher && teacherMainPanel === "attendance" ? (
	                <AttendanceSessionsPanel
	                  courseId={courseDetail.courseId}
	                  lectures={courseDetail.lectures}
	                  isDarkMode={isDarkMode}
	                  isTeacher={isTeacher}
	                />
	              ) : teacherMainPanel === "materials" && weekBoardTab && selectedLecture ? (
	                <CourseBoardsPanel
	                  key={`week-boards-${courseDetail.courseId}-${selectedLecture.lectureId}-${weekBoardTab}`}
	                  courseId={courseDetail.courseId}
	                  isTeacher={isTeacher}
	                  isDarkMode={isDarkMode}
	                  initialTab={weekBoardTab}
	                  selectedLectureId={selectedLecture.lectureId}
	                  selectedWeekNumber={selectedLecture.weekNumber}
	                  scopedToLecture
	                />
	              ) : teacherMainPanel === "notices" ? (
	                <CourseBoardsPanel
	                  key={`boards-${courseDetail.courseId}-notices`}
                  courseId={courseDetail.courseId}
                  isTeacher={isTeacher}
                  isDarkMode={isDarkMode}
                  initialTab="notices"
                />
              ) : teacherMainPanel === "discussions" ? (
                <CourseBoardsPanel
                  key={`boards-${courseDetail.courseId}-discussions`}
                  courseId={courseDetail.courseId}
                  isTeacher={isTeacher}
                  isDarkMode={isDarkMode}
                  initialTab="discussions"
                />
	              ) : assessmentsLoading ? (
                <div className="flex flex-1 min-h-[12rem] items-center justify-center text-sm opacity-70">
                  목록 불러오는 중...
                </div>
              ) : sortedItems.length === 0 ? (
                <div className="pb-4">
                  <section
                    className={`flex min-h-[24rem] flex-col rounded-2xl border p-5 ${
                      isDarkMode
                        ? "border-[#2b2b2b] bg-[#202020]"
                        : "border-[#dedbd5] bg-white"
                    }`}
                  >
                    <div className="flex flex-1 flex-col items-center justify-center text-center">
                      <div
                        className={`mb-5 flex h-20 w-20 items-center justify-center rounded-2xl border ${
                          isDarkMode
                            ? "border-[#343434] bg-[#181818] text-[#ff9b6a]"
                            : "border-[#dedbd5] bg-[#fbfaf7] text-[#ff824d]"
                        }`}
                        aria-hidden="true"
                      >
                        <svg
                          className="h-9 w-9"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            d="M7 4h7l4 4v12H7V4Zm7 0v5h4M9.5 13h5M9.5 16h5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.8}
                          />
                        </svg>
                      </div>
                      <h3
                        className={`text-lg font-semibold ${
                          isDarkMode ? "text-gray-100" : "text-gray-950"
                        }`}
                      >
                        이 주차에는 아직 등록된 자료가 없습니다.
                      </h3>
                      <p
                        className={`mt-2 max-w-md text-sm leading-6 ${
                          isDarkMode ? "text-gray-400" : "text-gray-500"
                        }`}
                      >
                        PDF를 업로드하거나 AI 자료 생성을 시작하면 이 영역에 자료 카드가 쌓입니다.
                      </p>
                      {isTeacher ? (
                        <div className="mt-5 flex flex-wrap justify-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              window.dispatchEvent(new Event("open-upload-modal"))
                            }
                            className={`inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors ${
                              isDarkMode
                                ? "bg-[#ff9b6a] text-[#181818] hover:bg-[#ffad9b]"
                                : "bg-[#ff824d] text-white hover:bg-[#f26f37]"
                            }`}
                          >
                            <UploadTrayIcon className="h-4 w-4 text-[#ff824d]" />
                            자료 업로드
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              window.dispatchEvent(new Event("open-material-gen-modal"))
                            }
                            className={`inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-semibold transition-colors ${
                              isDarkMode
                                ? "border-[#343434] text-gray-100 hover:bg-white/10"
                                : "border-[#dedbd5] text-gray-800 hover:bg-[#f7f5f1]"
                            }`}
                          >
                            <SparklesIcon className="h-4 w-4 text-[#ff824d]" />
                            자료 생성
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </section>
                </div>
              ) : (
                <>
                  {false && resourceEditMode ? (
                    <div className="sticky top-0 z-10 -mx-1 mb-4 px-1">
                      <div
                        className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 ${
                          isDarkMode
                            ? "border-[#1b3443] bg-[#102a35]"
                            : "border-[#d9d9dd] bg-[#eeece7]"
                        }`}
                      >
                        <div className="text-xs font-medium xl:text-sm">
                          선택됨:{" "}
                          {
                            sortedItems.filter(
                              (it) => selectedCenterItemIds[it.id],
                            ).length
                          }
                          개
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleDeleteSelectedCenterItems()}
                          disabled={
                            sortedItems.filter(
                              (it) =>
                                selectedCenterItemIds[it.id] &&
                                canSelectCenterItemForDelete(it),
                            ).length === 0
                          }
                          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors xl:text-sm ${
                            isDarkMode
                              ? "bg-red-500/15 text-red-200 hover:bg-red-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
                              : "bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                          }`}
                          aria-label="선택 삭제"
                          title="선택 삭제"
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                          선택 삭제
                        </button>
                      </div>
                    </div>
                  ) : null}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {sortedItems.map((item, index) => {
                      const selectMode = false;
                      const canSelect = canSelectCenterItemForDelete(item);
                      const checked = !!selectedCenterItemIds[item.id];
                      const resourceActionsOpen =
                        activeResourceActionItemId === item.id;
                      return (
                        <div
                          key={item.id}
                          role={selectMode ? undefined : "button"}
                          tabIndex={selectMode ? undefined : 0}
                          onMouseDown={(e) => {
                            if (selectMode) e.preventDefault();
                          }}
                          onClick={() => {
                            if (selectMode) {
                              if (!canSelect) return;
                              setSelectedCenterItemIds((prev) => ({
                                ...prev,
                                [item.id]: !prev[item.id],
                              }));
                              return;
                            }
                            handleCardClick(item);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              if (selectMode) {
                                if (!canSelect) return;
                                setSelectedCenterItemIds((prev) => ({
                                  ...prev,
                                  [item.id]: !prev[item.id],
                                }));
                                return;
                              }
                              handleCardClick(item);
                            }
                          }}
                          className={`group/card relative flex min-h-52 overflow-hidden rounded-2xl text-left transition-all duration-200 focus:outline-none ${
                            isDarkMode
                              ? "border border-[#2b2b2b] bg-[#202020] hover:border-[#4a4a4a] hover:bg-[#252525]"
                              : "border border-[#dedbd5] bg-white hover:border-[#cfcac1] hover:bg-[#f7f5f1]"
                          } ${
                            selectMode
                              ? canSelect
                                ? "cursor-pointer"
                                : "cursor-not-allowed opacity-70"
                              : "cursor-pointer"
                          }`}
                        >
                          {selectMode ? (
                            <div className="absolute top-3 left-3 z-20">
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={!canSelect}
                                onClick={(e) => {
                                  e.stopPropagation();
                                }}
                                onChange={() => {
                                  if (!canSelect) return;
                                  setSelectedCenterItemIds((prev) => ({
                                    ...prev,
                                    [item.id]: !prev[item.id],
                                  }));
                                }}
                                aria-label={
                                  canSelect
                                    ? `${item.title} 선택`
                                    : `${item.title} (삭제 미지원)`
                                }
                                className="h-4 w-4 accent-[#ff824d]"
                              />
                            </div>
                          ) : null}
                          <div
                            className="flex h-full min-w-0 flex-1 flex-col p-4"
                          >
                            <div className="mb-4">
                              <CourseCardVisualIcon index={index + 4} />
                            </div>
                            <div className="flex items-start justify-between gap-3">
                              <h3
                                className={`line-clamp-2 flex-1 text-base font-semibold ${
                                  isDarkMode ? "text-gray-100" : "text-gray-900"
                                }`}
                              >
                                {item.title}
                              </h3>
                            </div>
                            <p
                              className={`mt-2 line-clamp-3 min-h-12 text-sm leading-5 ${
                                isDarkMode ? "text-gray-400" : "text-gray-600"
                              }`}
                            >
                              {item.meta}
                              {item.type === "material" &&
                                !item.fileUrl &&
                                " · 클릭 시 안내"}
                              {selectMode && !canSelect ? " · 삭제 미지원" : ""}
                            </p>
                            <div
                              className={`mt-auto flex items-center justify-between gap-2 border-t pt-3 text-xs ${
                                isDarkMode
                                  ? "border-[#2b2b2b] text-gray-400"
                                  : "border-[#dedbd5] text-gray-500"
                              }`}
                            >
                              <span className="min-w-0 truncate">
                                생성 시간 {formatIsoInstantForKo(item.createdAt)}
                              </span>
                              {isTeacher && canSelect ? (
                                <div className="flex shrink-0 items-center gap-1">
                                {resourceActionsOpen ? (
                                  <>
                                    <button
                                      type="button"
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                      }}
                                      onClick={async (e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        await handleDeleteCenterItem(item);
                                        setActiveResourceActionItemId(null);
                                        setResourceEditMode(false);
                                      }}
                                      className={`inline-flex h-7 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-semibold transition-colors ${
                                        isDarkMode
                                          ? "bg-red-500/15 text-red-200 hover:bg-red-500/20"
                                          : "bg-red-50 text-red-700 hover:bg-red-100"
                                      }`}
                                      aria-label={`${item.title} 삭제`}
                                      title="삭제"
                                    >
                                      <TrashIcon className="h-3 w-3" />
                                      <span>삭제</span>
                                    </button>
                                    <button
                                      type="button"
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                      }}
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleCardClick(item);
                                      }}
                                      className={`inline-flex h-7 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-semibold transition-colors ${
                                        isDarkMode
                                          ? "bg-white/[0.08] text-gray-200 hover:bg-white/[0.13]"
                                          : "bg-[#f4f1eb] text-[#212121] hover:bg-[#ebe6dc]"
                                      }`}
                                      aria-label={`${item.title} 수정`}
                                      title="수정"
                                    >
                                      <EditIcon
                                        className={`h-3 w-3 ${
                                          isDarkMode ? "text-[#ff824d]" : ""
                                        }`}
                                      />
                                      <span>수정</span>
                                    </button>
                                  </>
                                ) : null}
                                <button
                                  type="button"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const willOpen = activeResourceActionItemId !== item.id;
                                    setActiveResourceActionItemId(willOpen ? item.id : null);
                                    setResourceEditMode(willOpen);
                                  }}
                                  className={`inline-flex h-7 shrink-0 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold transition-colors ${
                                    resourceActionsOpen
                                      ? isDarkMode
                                        ? "bg-[#ff9b6a] text-[#181818] hover:bg-[#ffad9b]"
                                        : "bg-[#ff824d] text-white hover:bg-[#f26f37]"
                                      : isDarkMode
                                        ? "bg-white/[0.08] text-gray-200 hover:bg-white/[0.13]"
                                        : "bg-[#f4f1eb] text-[#212121] hover:bg-[#ebe6dc]"
                                  }`}
                                  aria-pressed={resourceActionsOpen}
                                  aria-label={resourceActionsOpen ? "강의 리소스 편집 완료" : "강의 리소스 편집"}
                                  title={resourceActionsOpen ? "편집 완료" : "강의 리소스 편집"}
                                >
                                  {resourceActionsOpen ? (
                                    <CheckIcon className="h-3 w-3" />
                                  ) : (
                                    <EditIcon
                                      className={`h-3 w-3 ${
                                        isDarkMode ? "text-[#ff824d]" : ""
                                      }`}
                                    />
                                  )}
                                  <span>{resourceActionsOpen ? "완료" : "편집"}</span>
                                </button>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCourseListHeader = () => {
    // 상단 글로벌 헤더(TopNav)만 사용하므로 별도 "내 강의실" 헤더는 표시하지 않음
    return null;
  };

  React.useEffect(() => {
    const handleOpenCourse = () => {
      if (!isTeacher) return;
      if (viewMode !== "course-list") return;
      setIsCourseModalOpen(true);
    };
    window.addEventListener(
      "open-course-modal" as any,
      handleOpenCourse as any,
    );
    return () => {
      window.removeEventListener(
        "open-course-modal" as any,
        handleOpenCourse as any,
      );
    };
  }, [isTeacher, viewMode]);

  React.useEffect(() => {
    const handleOpenUpload = () => {
      if (!isTeacher) return;
      if (viewMode !== "course-detail" || !courseDetail?.courseId) return;
      if (!selectedLectureId) {
        window.alert("강의(주차)를 먼저 선택해주세요.");
        return;
      }
      setUploadModalOpen(true);
    };
    const handleOpenMaterialGen = () => {
      if (!isTeacher) return;
      if (viewMode !== "course-detail" || !courseDetail?.courseId) return;
      if (!selectedLectureId) {
        window.alert("강의(주차)를 먼저 선택해주세요.");
        return;
      }
      setMaterialGenModalOpen(true);
    };
    window.addEventListener("open-upload-modal" as any, handleOpenUpload as any);
    window.addEventListener("open-material-gen-modal" as any, handleOpenMaterialGen as any);
    return () => {
      window.removeEventListener("open-upload-modal" as any, handleOpenUpload as any);
      window.removeEventListener("open-material-gen-modal" as any, handleOpenMaterialGen as any);
    };
  }, [isTeacher, viewMode, courseDetail?.courseId, selectedLectureId]);

  const renderCourseDetailHeader = () => {
    return null;
  };

  const renderSettingsHeader = () => {
    return null;
  };

  return (
    <>
      <div
        className={`flex-1 flex flex-col min-h-0 min-w-0 overflow-x-hidden transition-colors ${
          selectedMenu === "settings" ||
          selectedMenu === "updates"
            ? "px-5"
            : "px-0"
        } ${isDarkMode ? "bg-[#071829]" : "bg-white"}`}
      >
        {renderCourseListHeader()}
        {renderCourseDetailHeader()}
        {renderSettingsHeader()}
        <div className="flex-1 min-h-0 min-w-0 overflow-hidden flex flex-col">
          <div
            className={`flex-1 min-h-0 min-w-0 ${
              previewFileUrl || previewMaterialId != null || examDetailSessionId
                ? "overflow-hidden"
                : viewMode === "course-detail" && selectedMenu === "lectures"
                  ? "overflow-hidden"
                  : "overflow-y-auto"
            } ${
              selectedMenu === "settings" ||
              selectedMenu === "updates"
                ? "pr-5 sm:pr-6 lg:pr-8"
                : ""
            }`}
          >
            {selectedMenu === "settings" ? (
              <SettingsPage />
            ) : selectedMenu === "updates" ? (
              <UpdatesPage />
            ) : viewMode === "course-list" ? (
              renderCourseList()
            ) : (
              renderCourseDetail()
            )}
          </div>
        </div>
      </div>

      {/* 강의실 생성 모달 */}
      {isCourseModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setIsCourseModalOpen(false)}
        >
          <div
            className={`w-full max-w-2xl rounded-lg shadow-lg border ${
              isDarkMode
                ? "bg-zinc-900 border-zinc-700 text-gray-100"
                : "bg-white border-gray-200 text-gray-900"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`flex items-center justify-between px-5 py-4 border-b ${
                isDarkMode ? "border-zinc-700/50" : "border-gray-200"
              }`}
            >
              <h2
                className={`text-lg font-semibold ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}
              >
                새 강의실 생성
              </h2>
              <button
                type="button"
                onClick={() => {
                  setIsCourseModalOpen(false);
                  setCourseModalTitle("");
                  setCourseModalDescription("");
                }}
                className={`p-1.5 rounded cursor-pointer ${
                  isDarkMode
                    ? "hover:bg-zinc-700 text-gray-300"
                    : "hover:bg-zinc-200 text-gray-500"
                }`}
                aria-label="닫기"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              <div>
                <label
                  className={`block text-sm font-medium mb-1 ${
                    isDarkMode ? "text-gray-200" : "text-gray-700"
                  }`}
                >
                  강의실 제목 *
                </label>
                <input
                  type="text"
                  value={courseModalTitle}
                  onChange={(e) => setCourseModalTitle(e.target.value)}
                  placeholder="예: AI 튜터링 A반"
                  className={`w-full px-3 py-2 text-sm rounded border ${
                    isDarkMode
                      ? "bg-zinc-800 border-zinc-600 text-white placeholder-gray-400"
                      : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                  } focus:outline-none focus:ring-2 focus:ring-[#ff824d]/60 focus:border-[#ff824d]`}
                  autoFocus
                />
              </div>
              <div>
                <label
                  className={`block text-sm font-medium mb-1 ${
                    isDarkMode ? "text-gray-200" : "text-gray-700"
                  }`}
                >
                  강의실 설명 (선택)
                </label>
                <textarea
                  value={courseModalDescription}
                  onChange={(e) => setCourseModalDescription(e.target.value)}
                  placeholder="강의실에 대한 설명을 입력하세요"
                  rows={7}
                  className={`w-full min-h-[10.5rem] px-3 py-2 text-sm rounded border resize-y ${
                    isDarkMode
                      ? "bg-zinc-800 border-zinc-600 text-white placeholder-gray-400"
                      : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                  } focus:outline-none focus:ring-2 focus:ring-[#ff824d]/60 focus:border-[#ff824d]`}
                />
              </div>
            </div>

            <div
              className={`px-5 py-4 border-t flex justify-end gap-2 ${
                isDarkMode ? "border-zinc-700/50" : "border-gray-200"
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  setIsCourseModalOpen(false);
                  setCourseModalTitle("");
                  setCourseModalDescription("");
                }}
                className={`px-4 py-2 text-sm rounded cursor-pointer ${
                  isDarkMode
                    ? "bg-zinc-800 hover:bg-zinc-700 text-gray-200"
                    : "bg-gray-100 hover:bg-zinc-200 text-gray-700"
                }`}
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleCreateCourse}
                disabled={!courseModalTitle.trim()}
                className={`px-4 py-2 text-sm rounded font-medium transition-colors ${
                  !courseModalTitle.trim()
                    ? isDarkMode
                      ? "bg-zinc-800/40 text-gray-400 cursor-not-allowed"
                      : "bg-orange-200 text-orange-500 cursor-not-allowed"
                    : isDarkMode
                      ? "bg-[#ff824d] hover:bg-[#ff6b33] text-white cursor-pointer"
                      : "bg-[#ff824d] hover:bg-[#ff6b33] text-white cursor-pointer"
                }`}
              >
                생성하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 주차 추가 모달 (선생님용) */}
      {addLectureModalOpen && courseDetail?.courseId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          role="dialog"
          aria-modal="true"
          onClick={() => !addLectureSubmitting && setAddLectureModalOpen(false)}
        >
          <div
            className={`w-full max-w-md max-h-[calc(100vh-3rem)] overflow-y-auto p-6 sm:p-8 rounded-lg shadow-lg ${
              isDarkMode ? "bg-zinc-800 text-gray-100" : "bg-white text-gray-900"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6 sm:mb-4">
              <h2
                className={`text-lg font-semibold ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}
              >
                주차 추가
              </h2>
              <button
                type="button"
                onClick={() =>
                  !addLectureSubmitting && setAddLectureModalOpen(false)
                }
                className={`p-1.5 rounded cursor-pointer transition-colors ${
                  isDarkMode
                    ? "hover:bg-zinc-700 text-gray-300"
                    : "hover:bg-gray-200 text-gray-500"
                }`}
                aria-label="닫기"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>
            <form
              onSubmit={handleAddLectureSubmit}
              className="space-y-4 sm:space-y-5"
            >
              <div className="grid grid-cols-1 sm:grid-cols-[4.5rem_1fr] gap-3">
                <div>
                  <label
                    className={`block text-xs sm:text-sm md:text-base font-medium mb-2 ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}
                  >
                    주차 *
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={addLectureWeekNumber}
                    onChange={(e) => setAddLectureWeekNumber(e.target.value)}
                    placeholder="예: 1"
                    className={`w-full px-3 py-2 text-sm rounded-lg border ${
                      isDarkMode
                        ? "bg-zinc-800 border-zinc-700 text-white placeholder-gray-500"
                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                    } focus:outline-none focus:ring-2 focus:ring-[#ff824d]/60 focus:border-[#ff824d] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                    autoFocus
                  />
                </div>
                <div>
                  <label
                    className={`block text-xs sm:text-sm md:text-base font-medium mb-2 ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}
                  >
                    제목 *
                  </label>
                  <input
                    type="text"
                    value={addLectureTitle}
                    onChange={(e) => setAddLectureTitle(e.target.value)}
                    placeholder="예: 1주차 - 오리엔테이션"
                    className={`w-full px-3 py-2 text-sm rounded-lg border ${
                      isDarkMode
                        ? "bg-zinc-800 border-zinc-700 text-white placeholder-gray-500"
                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                    } focus:outline-none focus:ring-2 focus:ring-[#ff824d]/60 focus:border-[#ff824d]`}
                  />
                </div>
              </div>
              <div
                className="flex justify-end gap-2 pt-2"
              >
                <button
                  type="button"
                  onClick={() =>
                    !addLectureSubmitting && setAddLectureModalOpen(false)
                  }
                  className={`px-4 py-2 text-sm rounded-lg ${
                    isDarkMode
                      ? "bg-zinc-800 hover:bg-zinc-700 text-gray-200"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  }`}
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={
                    addLectureSubmitting ||
                    !addLectureWeekNumber.trim() ||
                    !addLectureTitle.trim()
                  }
                  className={`px-4 py-2 text-sm rounded-lg font-medium ${
                    addLectureSubmitting ||
                    !addLectureWeekNumber.trim() ||
                    !addLectureTitle.trim()
                      ? isDarkMode
                        ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-[#ff824d] hover:bg-[#ff6b33] text-white cursor-pointer"
                  }`}
                >
                  {addLectureSubmitting ? "추가 중..." : "추가"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 수강 코드 참여 모달 (학생용) */}
      {isStudent && isJoinModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          role="dialog"
          aria-modal="true"
          onClick={() => {
            if (!isJoining) {
              setIsJoinModalOpen(false);
              setJoinCode("");
              setJoinError(null);
              setJoinSuccess(null);
            }
          }}
        >
          <div
            className={`w-full max-w-md rounded-xl shadow-xl border ${
              isDarkMode
                ? "bg-zinc-900 border-zinc-700 text-gray-100"
                : "bg-white border-gray-200 text-gray-900"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`flex items-center justify-between px-5 py-4 border-b ${
                isDarkMode ? "border-zinc-700/50" : "border-gray-200"
              }`}
            >
              <h2
                className={`text-lg font-semibold ${
                  isDarkMode ? "text-gray-100" : "text-gray-900"
                }`}
              >
                강의실 참여
              </h2>
              <button
                type="button"
                onClick={() => {
                  if (isJoining) return;
                  setIsJoinModalOpen(false);
                  setJoinCode("");
                  setJoinError(null);
                  setJoinSuccess(null);
                }}
                className={`p-1.5 rounded cursor-pointer ${
                  isDarkMode
                    ? "hover:bg-zinc-700 text-gray-300"
                    : "hover:bg-zinc-200 text-gray-500"
                }`}
                aria-label="닫기"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleJoinSubmit} className="px-5 py-4 space-y-4">
              <div>
                <div className="flex flex-row items-baseline justify-between gap-2 mb-1">
                  <label
                    htmlFor="course-join-invitation-code"
                    className={`text-sm font-medium shrink-0 ${
                      isDarkMode ? "text-gray-200" : "text-gray-700"
                    }`}
                  >
                    초대 코드
                  </label>
                  {(joinSuccess || joinError || isJoining) && (
                    <p
                      id="join-request-status"
                      className={`min-w-0 flex-1 max-w-[65%] text-right text-xs leading-snug line-clamp-3 ${
                        joinSuccess
                          ? isDarkMode
                            ? "text-emerald-300"
                            : "text-emerald-700"
                          : joinError
                            ? isDarkMode
                              ? "text-red-300"
                              : "text-red-600"
                            : isDarkMode
                              ? "text-gray-400"
                              : "text-gray-500"
                      }`}
                      title={
                        joinSuccess || joinError
                          ? joinSuccess ?? joinError ?? undefined
                          : undefined
                      }
                      aria-live="polite"
                    >
                      {joinSuccess
                        ? joinSuccess
                        : joinError
                          ? joinError
                          : "신청 중…"}
                    </p>
                  )}
                </div>
                <input
                  id="course-join-invitation-code"
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="예: 550e8400-e29b-41d4-a716-446655440000"
                  className={`w-full px-3 py-2 text-sm rounded border ${
                    isDarkMode
                      ? "bg-zinc-800 border-zinc-600 text-white placeholder-gray-400"
                      : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                  } focus:outline-none focus:ring-2 ${
                    isDarkMode ? "focus:ring-zinc-500" : "focus:ring-zinc-500"
                  }`}
                  disabled={isJoining || !!joinSuccess}
                  aria-describedby={
                    joinSuccess || joinError || isJoining
                      ? "join-request-status"
                      : undefined
                  }
                />
                <p
                  className={`mt-2 text-xs ${
                    isDarkMode ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  선생님이 알려준 초대 코드를 입력하세요.
                </p>
              </div>

              <div className={`rounded-lg border ${isDarkMode ? "border-zinc-700 bg-zinc-900/40" : "border-gray-200 bg-gray-50"}`}>
                <button
                  type="button"
                  onClick={() => {
                    setMyJoinRequestsOpen((p) => !p);
                    setMyJoinRequestsPage(0);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm font-semibold cursor-pointer ${
                    isDarkMode ? "text-gray-100 hover:bg-white/5" : "text-gray-800 hover:bg-gray-100"
                  }`}
                  aria-expanded={myJoinRequestsOpen}
                >
                  <span>내 신청</span>
                  <span className={`text-xs font-medium ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                    {myJoinRequestsOpen ? "접기" : "펼치기"}
                  </span>
                </button>
                {myJoinRequestsOpen && (
                  <div className="px-3 pb-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                        내 강의실 가입 신청 목록
                      </span>
                      <button
                        type="button"
                        onClick={() => void loadMyJoinRequests()}
                        disabled={myJoinRequestsLoading}
                        aria-label="새로고침"
                        title="새로고침"
                        className={`inline-flex h-7 w-7 items-center justify-center rounded-lg text-xs font-semibold ${
                          myJoinRequestsLoading
                            ? "opacity-40 cursor-not-allowed"
                            : isDarkMode
                              ? "bg-white/10 hover:bg-white/15 text-gray-100"
                              : "bg-white hover:bg-gray-100 text-gray-700 border border-gray-200"
                        }`}
                      >
                        <RefreshIcon className={`h-3.5 w-3.5 ${myJoinRequestsLoading ? "animate-spin" : ""}`} />
                      </button>
                    </div>

                    {myJoinRequestsLoading ? (
                      <div className="py-6 text-center text-xs opacity-70">불러오는 중…</div>
                    ) : myJoinRequestsError ? (
                      <div className={`py-2 text-xs ${isDarkMode ? "text-red-300" : "text-red-600"}`}>
                        {myJoinRequestsError}
                      </div>
                    ) : myJoinRequests.length === 0 ? (
                      <div className="py-6 text-center text-xs opacity-70">내 신청이 없습니다.</div>
                    ) : (
                      <ul className="space-y-2">
                        {myJoinRequests.map((r) => {
                          const s = String(r.status ?? "").toUpperCase();
                          const badge =
                            s === "APPROVED"
                              ? isDarkMode
                                ? "bg-emerald-500/15 text-emerald-200"
                                : "bg-emerald-100 text-emerald-800"
                              : s === "PENDING"
                                ? isDarkMode
                                  ? "bg-amber-500/15 text-amber-200"
                                  : "bg-amber-100 text-amber-800"
                                : s === "BLOCKED"
                                  ? isDarkMode
                                    ? "bg-red-500/15 text-red-200"
                                    : "bg-red-100 text-red-800"
                                  : isDarkMode
                                    ? "bg-zinc-700 text-gray-200"
                                    : "bg-gray-200 text-gray-700";
                          return (
                            <li
                              key={r.requestId}
                              className={`rounded-lg border px-3 py-2 ${
                                isDarkMode ? "border-zinc-700 bg-zinc-900/20" : "border-gray-200 bg-white"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="text-sm font-semibold truncate">{r.courseTitle || `courseId ${r.courseId}`}</div>
                                  <div className={`text-[11px] mt-1 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                                    요청: {formatIsoInstantForKo(r.requestedAt)}{" "}
                                    {r.updatedAt ? `· 변경: ${formatIsoInstantForKo(r.updatedAt)}` : ""}
                                  </div>
                                </div>
                                <span className={`shrink-0 text-[11px] px-2 py-1 rounded-full ${badge}`}>
                                  {joinRequestStatusLabel(r.status)}
                                </span>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}

                    {myJoinRequestsOpen && myJoinRequestsTotalPages > 1 && (
                      <div className="mt-3 flex items-center justify-between">
                        <button
                          type="button"
                          disabled={myJoinRequestsPage <= 0 || myJoinRequestsLoading}
                          onClick={() => setMyJoinRequestsPage((p) => Math.max(0, p - 1))}
                          className={`text-xs font-semibold px-2 py-1 rounded-lg ${
                            myJoinRequestsPage <= 0 || myJoinRequestsLoading
                              ? "opacity-40 cursor-not-allowed"
                              : isDarkMode
                                ? "bg-white/10 hover:bg-white/15 text-gray-100"
                                : "bg-white hover:bg-gray-100 text-gray-700 border border-gray-200"
                          }`}
                        >
                          이전
                        </button>
                        <span className="text-[11px] opacity-70">
                          {myJoinRequestsPage + 1} / {myJoinRequestsTotalPages}
                        </span>
                        <button
                          type="button"
                          disabled={myJoinRequestsPage >= myJoinRequestsTotalPages - 1 || myJoinRequestsLoading}
                          onClick={() =>
                            setMyJoinRequestsPage((p) =>
                              Math.min(myJoinRequestsTotalPages - 1, p + 1),
                            )
                          }
                          className={`text-xs font-semibold px-2 py-1 rounded-lg ${
                            myJoinRequestsPage >= myJoinRequestsTotalPages - 1 || myJoinRequestsLoading
                              ? "opacity-40 cursor-not-allowed"
                              : isDarkMode
                                ? "bg-white/10 hover:bg-white/15 text-gray-100"
                                : "bg-white hover:bg-gray-100 text-gray-700 border border-gray-200"
                          }`}
                        >
                          다음
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                {!joinSuccess ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (isJoining) return;
                      setIsJoinModalOpen(false);
                      setJoinCode("");
                      setJoinError(null);
                      setJoinSuccess(null);
                    }}
                    className={`px-4 py-2 text-sm rounded cursor-pointer ${
                      isDarkMode
                        ? "bg-zinc-800 hover:bg-zinc-700 text-gray-200"
                        : "bg-gray-100 hover:bg-zinc-200 text-gray-700"
                    }`}
                    disabled={isJoining}
                  >
                    취소
                  </button>
                ) : null}
                <button
                  type={joinSuccess ? "button" : "submit"}
                  onClick={
                    joinSuccess
                      ? () => {
                          if (isJoining) return;
                          setIsJoinModalOpen(false);
                          setJoinCode("");
                          setJoinError(null);
                          setJoinSuccess(null);
                        }
                      : undefined
                  }
                  className={`px-4 py-2 text-sm rounded font-medium transition-colors ${
                    isJoining
                      ? "bg-[#ff824d]/55 text-white cursor-not-allowed"
                      : "bg-[#ff824d] hover:bg-[#f26f37] text-white cursor-pointer"
                  }`}
                  disabled={isJoining}
                  aria-label={joinSuccess ? "닫기" : undefined}
                  title={joinSuccess ? "닫기" : undefined}
                >
                  {isJoining ? (
                    "신청 중..."
                  ) : joinSuccess ? (
                    <CloseIcon className="h-4 w-4" />
                  ) : (
                    "신청"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 자료 업로드 모달 */}
      {uploadModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          role="dialog"
          aria-modal="true"
          onClick={() => !submitting && handleCloseUploadModal()}
        >
          <div
            className={`w-full max-w-md rounded-lg shadow-lg border ${isDarkMode ? "bg-zinc-900 border-zinc-700" : "bg-white border-gray-200"}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`flex justify-between items-center px-5 py-4 border-b ${isDarkMode ? "border-zinc-700" : "border-gray-200"}`}
            >
              <h2
                className={`text-lg font-semibold ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}
              >
                자료 업로드
              </h2>
              <button
                type="button"
                onClick={() => !submitting && handleCloseUploadModal()}
                className={`p-1.5 rounded cursor-pointer transition-colors ${isDarkMode ? "hover:bg-zinc-700 text-gray-300" : "hover:bg-gray-200 text-gray-500"}`}
                aria-label="닫기"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <p
                className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
              >
                강의에 첨부할{" "}
                <strong
                  className={isDarkMode ? "text-gray-300" : "text-gray-700"}
                >
                  PDF 파일
                </strong>
                을 선택하세요.
              </p>
              <input
                id="material-upload-input"
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                className="hidden"
              />
              {!uploadFile ? (
                <label
                  htmlFor="material-upload-input"
                  onDragOver={(e) => {
                    e.preventDefault();
                    setUploadDragOver(true);
                  }}
                  onDragLeave={() => setUploadDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setUploadDragOver(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file && file.type === "application/pdf")
                      setUploadFile(file);
                  }}
                  className={`flex flex-col items-center justify-center gap-3 py-8 px-4 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
                    uploadDragOver
                      ? isDarkMode
                        ? "border-[#ff824d] bg-[#ff824d]/15"
                        : "border-[#ff824d] bg-orange-50"
                      : isDarkMode
                        ? "border-zinc-600 bg-zinc-800/50 hover:border-zinc-500 hover:bg-zinc-800 text-gray-300"
                        : "border-gray-300 bg-gray-50 hover:border-[#ff824d] hover:bg-orange-50/70 text-gray-600"
                  }`}
                >
                  <svg
                    className="w-10 h-10 opacity-60"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <span className="text-sm font-medium">
                    PDF 파일을 여기에 끌어다 놓거나
                  </span>
                  <span
                    className={`text-sm font-medium px-4 py-2 rounded-lg ${isDarkMode ? "bg-zinc-700 text-white" : "bg-[#ff824d] text-white"}`}
                  >
                    파일 선택
                  </span>
                </label>
              ) : (
                <div
                  className={`flex items-center justify-between gap-3 py-3 px-4 rounded-xl border ${isDarkMode ? "bg-zinc-800 border-zinc-600" : "bg-gray-50 border-gray-200"}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <svg
                      className="w-8 h-8 shrink-0 text-red-500 opacity-80"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span
                      className="text-sm font-medium truncate"
                      title={uploadFile.name}
                    >
                      {uploadFile.name}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUploadFile(null)}
                    className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded ${isDarkMode ? "text-gray-400 hover:bg-zinc-700 hover:text-gray-200" : "text-gray-500 hover:bg-gray-200"}`}
                  >
                    삭제
                  </button>
                </div>
              )}
            </div>
            <div
              className={`px-5 py-4 border-t flex justify-end gap-2 ${isDarkMode ? "border-zinc-700" : "border-gray-200"}`}
            >
              <button
                type="button"
                onClick={() => !submitting && handleCloseUploadModal()}
                className={`px-4 py-2 text-sm rounded ${isDarkMode ? "bg-zinc-800 text-gray-200" : "bg-gray-100 text-gray-700"}`}
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleUploadSubmit}
                disabled={submitting || !uploadFile}
                className="px-4 py-2 text-sm rounded font-medium bg-[#ff824d] hover:bg-[#ff6b33] text-white disabled:opacity-50 cursor-pointer"
              >
                {submitting ? "업로드 중..." : "업로드"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 강의자료 생성 모달 (Phase 1~5 단계형) */}
      {materialGenModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          role="dialog"
          aria-modal="true"
          onClick={() => {
            if (!submitting) {
              resetMaterialGenModal();
              setMaterialGenModalOpen(false);
            }
          }}
        >
          <div
            className={`w-full max-w-lg rounded-lg shadow-lg border ${isDarkMode ? "bg-zinc-900 border-zinc-700" : "bg-white border-gray-200"}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`flex justify-between items-center px-5 py-4 border-b ${isDarkMode ? "border-zinc-700" : "border-gray-200"}`}
            >
              <h2
                className={`text-lg font-semibold ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}
              >
                강의자료 생성{" "}
                {materialGenStep > 1 && `(단계 ${materialGenStep}/5)`}
              </h2>
              <button
                type="button"
                onClick={() => {
                  if (!submitting) {
                    resetMaterialGenModal();
                    setMaterialGenModalOpen(false);
                  }
                }}
                className={`p-1.5 rounded cursor-pointer transition-colors ${isDarkMode ? "hover:bg-zinc-700 text-gray-300" : "hover:bg-gray-200 text-gray-500"}`}
              >
                ✕
              </button>
            </div>
            <div className="px-5 py-4 space-y-4 max-h-[60vh] overflow-y-hidden">
              {/* Step 1: 키워드 입력 (PDF는 완전 선택 사항이므로 UI에서 제거) */}
              {materialGenStep === 1 && (
                <>
                  <p
                    className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                  >
                    새로 기획안을 만들거나, 이전에 작성 중이던 기획안을 이어서
                    수정·확정할 수 있습니다.
                  </p>
                  <button
                    type="button"
                    onClick={handleLoadLatestMaterialSession}
                    disabled={submitting}
                    className={`w-full py-2 px-3 text-sm rounded border ${isDarkMode ? "border-zinc-600 text-gray-200 hover:bg-zinc-800" : "border-gray-300 text-gray-700 hover:bg-gray-100"} disabled:opacity-50`}
                  >
                    {submitting
                      ? "불러오는 중…"
                      : "최근 사용한 기획안 불러오기"}
                  </button>
                  <div
                    className={`border-t pt-4 ${isDarkMode ? "border-zinc-700" : "border-gray-200"}`}
                  >
                    <label
                      className={`block text-sm font-medium mb-1 ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}
                    >
                      새 기획안 만들기 — 주제 또는 키워드
                    </label>
                    <input
                      type="text"
                      value={materialKeyword}
                      onChange={(e) => setMaterialKeyword(e.target.value)}
                      placeholder="예: 강화학습 DQN"
                      className={`w-full px-3 py-2 text-sm rounded border ${isDarkMode ? "bg-zinc-800 border-zinc-600 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                    />
                  </div>
                </>
              )}

              {/* Step 2: 기획안 확인 / 확정 또는 수정 */}
              {materialGenStep === 2 && (
                <>
                  {materialDraftPlan && (
                    <div
                      className={`space-y-4 text-sm rounded-lg border p-4 max-h-[50vh] overflow-y-auto ${isDarkMode ? "bg-zinc-800/50 border-zinc-600" : "bg-gray-50 border-gray-200"}`}
                    >
                      {/* 프로젝트 개요 */}
                      {Boolean(
                        materialDraftPlan.project_meta &&
                        typeof materialDraftPlan.project_meta === "object",
                      ) && (
                        <div>
                          <h3
                            className={`font-semibold mb-1.5 ${isDarkMode ? "text-[#ff9a70]" : "text-[#ff824d]"}`}
                          >
                            📋 프로젝트 개요
                          </h3>
                          <ul
                            className={`space-y-0.5 text-xs ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
                          >
                            {(
                              materialDraftPlan.project_meta as Record<
                                string,
                                unknown
                              >
                            ).title != null && (
                              <li>
                                <span className="font-medium">제목:</span>{" "}
                                {String(
                                  (
                                    materialDraftPlan.project_meta as Record<
                                      string,
                                      unknown
                                    >
                                  ).title,
                                )}
                              </li>
                            )}
                            {(
                              materialDraftPlan.project_meta as Record<
                                string,
                                unknown
                              >
                            ).goal != null && (
                              <li>
                                <span className="font-medium">목표:</span>{" "}
                                {String(
                                  (
                                    materialDraftPlan.project_meta as Record<
                                      string,
                                      unknown
                                    >
                                  ).goal,
                                )}
                              </li>
                            )}
                            {(
                              materialDraftPlan.project_meta as Record<
                                string,
                                unknown
                              >
                            ).target_audience != null && (
                              <li>
                                <span className="font-medium">대상:</span>{" "}
                                {String(
                                  (
                                    materialDraftPlan.project_meta as Record<
                                      string,
                                      unknown
                                    >
                                  ).target_audience,
                                )}
                              </li>
                            )}
                            {(
                              materialDraftPlan.project_meta as Record<
                                string,
                                unknown
                              >
                            ).description != null && (
                              <li>
                                <span className="font-medium">설명:</span>{" "}
                                {String(
                                  (
                                    materialDraftPlan.project_meta as Record<
                                      string,
                                      unknown
                                    >
                                  ).description,
                                )}
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                      {/* 작성 스타일 */}
                      {Boolean(
                        materialDraftPlan.style_guide &&
                        typeof materialDraftPlan.style_guide === "object",
                      ) && (
                        <div>
                          <h3
                            className={`font-semibold mb-1.5 ${isDarkMode ? "text-[#ff9a70]" : "text-[#ff824d]"}`}
                          >
                            ✒️ 작성 스타일
                          </h3>
                          <ul
                            className={`space-y-0.5 text-xs ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
                          >
                            {(
                              materialDraftPlan.style_guide as Record<
                                string,
                                unknown
                              >
                            ).tone != null && (
                              <li>
                                <span className="font-medium">톤:</span>{" "}
                                {String(
                                  (
                                    materialDraftPlan.style_guide as Record<
                                      string,
                                      unknown
                                    >
                                  ).tone,
                                )}
                              </li>
                            )}
                            {(
                              materialDraftPlan.style_guide as Record<
                                string,
                                unknown
                              >
                            ).formatting != null && (
                              <li>
                                <span className="font-medium">서식:</span>{" "}
                                {String(
                                  (
                                    materialDraftPlan.style_guide as Record<
                                      string,
                                      unknown
                                    >
                                  ).formatting,
                                )}
                              </li>
                            )}
                            {(
                              materialDraftPlan.style_guide as Record<
                                string,
                                unknown
                              >
                            ).detail_level != null && (
                              <li>
                                <span className="font-medium">상세도:</span>{" "}
                                {String(
                                  (
                                    materialDraftPlan.style_guide as Record<
                                      string,
                                      unknown
                                    >
                                  ).detail_level,
                                )}
                              </li>
                            )}
                            {(
                              materialDraftPlan.style_guide as Record<
                                string,
                                unknown
                              >
                            ).math_policy != null && (
                              <li>
                                <span className="font-medium">수식:</span>{" "}
                                {String(
                                  (
                                    materialDraftPlan.style_guide as Record<
                                      string,
                                      unknown
                                    >
                                  ).math_policy,
                                )}
                              </li>
                            )}
                            {(
                              materialDraftPlan.style_guide as Record<
                                string,
                                unknown
                              >
                            ).example_policy != null && (
                              <li>
                                <span className="font-medium">예시:</span>{" "}
                                {String(
                                  (
                                    materialDraftPlan.style_guide as Record<
                                      string,
                                      unknown
                                    >
                                  ).example_policy,
                                )}
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                      {/* 챕터 구성 */}
                      {Array.isArray(materialDraftPlan.chapters) &&
                        materialDraftPlan.chapters.length > 0 && (
                          <div>
                            <h3
                              className={`font-semibold mb-2 ${isDarkMode ? "text-[#ff9a70]" : "text-[#ff824d]"}`}
                            >
                              📑 챕터 구성 ({materialDraftPlan.chapters.length}
                              개)
                            </h3>
                            <ol className="space-y-3 list-decimal list-inside">
                              {materialDraftPlan.chapters.map(
                                (ch: unknown, i: number) => {
                                  const c = ch as Record<string, unknown>;
                                  const title =
                                    c.title != null
                                      ? String(c.title)
                                      : `챕터 ${i + 1}`;
                                  const objective =
                                    c.objective != null
                                      ? String(c.objective)
                                      : null;
                                  const keyTopics = Array.isArray(c.key_topics)
                                    ? (c.key_topics as string[])
                                    : [];
                                  const mustInclude = Array.isArray(
                                    c.must_include,
                                  )
                                    ? (c.must_include as string[])
                                    : [];
                                  return (
                                    <li
                                      key={i}
                                      className={`pl-1 border-l-2 ${isDarkMode ? "border-zinc-600" : "border-gray-300"}`}
                                    >
                                      <span
                                        className={`font-medium ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}
                                      >
                                        {title}
                                      </span>
                                      {objective && (
                                        <p
                                          className={`mt-0.5 text-xs ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
                                        >
                                          {objective}
                                        </p>
                                      )}
                                      {keyTopics.length > 0 && (
                                        <p
                                          className={`mt-1 text-xs ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
                                        >
                                          <span className="font-medium">
                                            주요 주제:
                                          </span>{" "}
                                          {keyTopics.slice(0, 4).join(" · ")}
                                          {keyTopics.length > 4 ? " …" : ""}
                                        </p>
                                      )}
                                      {mustInclude.length > 0 && (
                                        <ul className="mt-0.5 text-xs list-disc list-inside text-gray-500">
                                          {mustInclude
                                            .slice(0, 2)
                                            .map((s, j) => (
                                              <li key={j}>{s}</li>
                                            ))}
                                          {mustInclude.length > 2 && (
                                            <li>
                                              외 {mustInclude.length - 2}개
                                            </li>
                                          )}
                                        </ul>
                                      )}
                                    </li>
                                  );
                                },
                              )}
                            </ol>
                          </div>
                        )}
                      {/* 알 수 없는 구조면 JSON 폴백 */}
                      {!materialDraftPlan.project_meta &&
                        !materialDraftPlan.style_guide &&
                        !(
                          Array.isArray(materialDraftPlan.chapters) &&
                          materialDraftPlan.chapters.length > 0
                        ) && (
                          <pre
                            className={`text-xs p-2 rounded overflow-x-auto ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
                          >
                            {JSON.stringify(materialDraftPlan, null, 2)}
                          </pre>
                        )}
                    </div>
                  )}
                  {!materialDraftPlan && (
                    <p
                      className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                    >
                      기획안이 생성되었습니다. 확정하거나 수정 요청을
                      입력하세요.
                    </p>
                  )}
                  {!materialPhase2UpdateMode ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleMaterialPhase2Confirm}
                        disabled={submitting}
                        className="px-4 py-2 text-sm rounded font-medium bg-[#ff824d] hover:bg-[#ff6b33] text-white disabled:opacity-50"
                      >
                        기획안 확정
                      </button>
                      <button
                        type="button"
                        onClick={() => setMaterialPhase2UpdateMode(true)}
                        disabled={submitting}
                        className={`px-4 py-2 text-sm rounded font-medium ${isDarkMode ? "bg-zinc-700 text-gray-200" : "bg-gray-200 text-gray-800"}`}
                      >
                        수정 요청
                      </button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label
                          className={`block text-sm font-medium mb-1 ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}
                        >
                          수정 요청 사항
                        </label>
                        <textarea
                          value={materialPhase2Feedback}
                          onChange={(e) =>
                            setMaterialPhase2Feedback(e.target.value)
                          }
                          placeholder="수정하고 싶은 내용을 입력하세요"
                          rows={3}
                          className={`w-full px-3 py-2 text-sm rounded border ${isDarkMode ? "bg-zinc-800 border-zinc-600 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleMaterialPhase2Update}
                          disabled={submitting}
                          className="px-4 py-2 text-sm rounded font-medium bg-[#ff824d] hover:bg-[#ff6b33] text-white disabled:opacity-50"
                        >
                          {submitting ? "반영 중..." : "반영 후 다시 보기"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMaterialPhase2UpdateMode(false);
                            setMaterialPhase2Feedback("");
                          }}
                          disabled={submitting}
                          className={`px-4 py-2 text-sm rounded ${isDarkMode ? "bg-zinc-700 text-gray-200" : "bg-gray-200 text-gray-800"}`}
                        >
                          취소
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}

              {/* Step 3: Phase 3~5 한 번에 실행 (async) */}
              {materialGenStep === 3 && (
                <div className="space-y-3">
                  {submitting && materialAsyncTaskId ? (
                    <>
                      <p
                        className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}
                      >
                        챕터·검증·최종 문서를 생성하고 있습니다.
                      </p>
                      {streamedMaterialProgress && (
                        <p
                          className={`text-xs font-medium ${isDarkMode ? "text-[#ff9a70]" : "text-[#ff824d]"}`}
                        >
                          {streamedMaterialProgress}
                        </p>
                      )}
                      {streamedMaterialContent.length > 0 && (
                        <div
                          className={`rounded-lg border overflow-hidden max-h-48 min-h-[8rem] flex flex-col ${isDarkMode ? "bg-zinc-800 border-zinc-600" : "bg-gray-50 border-gray-200"}`}
                        >
                          <p
                            className={`shrink-0 px-3 py-1.5 text-xs font-medium ${isDarkMode ? "text-gray-400 bg-zinc-800" : "text-gray-500 bg-gray-100"}`}
                          >
                            실시간 미리보기
                          </p>
                          <div
                            className={`flex-1 min-h-0 min-w-0 overflow-x-hidden overflow-y-auto p-3 text-sm ${isDarkMode ? "text-gray-200" : "text-gray-800"}`}
                          >
                            <article
                              className={`prose prose-sm prose-neutral max-w-none break-words [&_*]:break-words [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_code]:break-words prose-headings:font-semibold prose-blockquote:border-l-emerald-600/45 ${
                                isDarkMode ? "prose-invert" : ""
                              }`}
                            >
                              <MarkdownContent>
                                {streamedMaterialContent}
                              </MarkdownContent>
                            </article>
                          </div>
                        </div>
                      )}
                      <p
                        className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                      >
                        아래 닫기 아이콘을 누르면 모달만 닫히고, 작업은
                        백그라운드에서 계속됩니다. 완료되면 목록에 자동으로
                        추가됩니다.
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setMaterialGenModalOpen(false)}
                          className={`px-4 py-2 text-sm rounded font-medium ${isDarkMode ? "bg-zinc-700 text-gray-200" : "bg-gray-200 text-gray-800"}`}
                        >
                          닫고 다른 작업하기
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p
                        className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}
                      >
                        챕터 내용 생성·검증·최종 문서 생성을 한 번에 실행합니다.
                      </p>
                      <button
                        type="button"
                        onClick={handleMaterialPhase3To5Async}
                        disabled={submitting}
                        className="px-4 py-2 text-sm rounded font-medium bg-[#ff824d] hover:bg-[#ff6b33] text-white disabled:opacity-50"
                      >
                        {submitting
                          ? "처리 중… (완료될 때까지 잠시 기다려 주세요)"
                          : "Phase 3~5 실행"}
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Step 4: (async 사용 시 건너뜀, 기존 단계별 진행용 유지) */}
              {materialGenStep === 4 && (
                <div className="space-y-3">
                  {materialChapterSummary && (
                    <p
                      className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}
                    >
                      {materialChapterSummary}
                    </p>
                  )}
                  <p
                    className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}
                  >
                    내용을 검증합니다.
                  </p>
                  <button
                    type="button"
                    onClick={handleMaterialPhase4}
                    disabled={submitting}
                    className="px-4 py-2 text-sm rounded font-medium bg-[#ff824d] hover:bg-[#ff6b33] text-white disabled:opacity-50"
                  >
                    {submitting ? "검증 중..." : "내용 검증"}
                  </button>
                </div>
              )}

              {/* Step 5: 최종 문서 생성 및 완료 — 화면에는 반드시 finalDocument만 사용 */}
              {materialGenStep === 5 && (
                <div className="space-y-3">
                  {materialVerifiedSummary && (
                    <p
                      className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}
                    >
                      {materialVerifiedSummary}
                    </p>
                  )}
                  {materialFinalDocument == null && materialFinalUrl == null ? (
                    <>
                      {materialCompletedViaAsync ? (
                        <>
                          <p
                            className={`text-sm ${isDarkMode ? "text-amber-300" : "text-amber-700"}`}
                          >
                            문서 링크가 아직 반영되지 않았을 수 있습니다.
                          </p>
                          <p
                            className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
                          >
                            백엔드에서 완료 후 finalDocument/documentUrl을
                            내려주면 여기서 보입니다. 잠시 후 목록에서
                            확인하거나 닫아 주세요.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              resetMaterialGenModal();
                              setMaterialGenModalOpen(false);
                            }}
                            className={`inline-flex h-9 w-9 items-center justify-center rounded ${isDarkMode ? "bg-zinc-700 text-gray-200" : "bg-gray-200 text-gray-800"}`}
                            aria-label="닫기"
                            title="닫기"
                          >
                            <CloseIcon className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <p
                            className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}
                          >
                            최종 문서를 생성합니다.
                          </p>
                          <button
                            type="button"
                            onClick={handleMaterialPhase5}
                            disabled={submitting}
                            className="px-4 py-2 text-sm rounded font-medium bg-[#ff824d] hover:bg-[#ff6b33] text-white disabled:opacity-50"
                          >
                            {submitting ? "생성 중..." : "최종 문서 생성"}
                          </button>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      <p
                        className={`text-sm ${isDarkMode ? "text-green-300" : "text-green-700"}`}
                      >
                        문서 생성이 완료되었습니다.
                      </p>
                      {materialFinalDocument && (
                        <div
                          className={`rounded border overflow-x-hidden overflow-y-auto max-h-48 p-3 text-left min-w-0 ${isDarkMode ? "bg-zinc-800 border-zinc-600 text-gray-200" : "bg-gray-50 border-gray-200 text-gray-900"}`}
                        >
                          <article
                            className={`prose prose-sm prose-neutral max-w-none break-words [&_*]:break-words [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_code]:break-words prose-headings:font-semibold prose-blockquote:border-l-emerald-600/45 ${
                              isDarkMode ? "prose-invert" : ""
                            }`}
                          >
                            <MarkdownContent>
                              {materialFinalDocument}
                            </MarkdownContent>
                          </article>
                        </div>
                      )}
                      {materialFinalUrl && (
                        <p className="text-sm">
                          <a
                            href={materialFinalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#ff824d] underline"
                          >
                            문서 보기/다운로드
                          </a>
                        </p>
                      )}
                      <div className="flex gap-2 pt-2">
                        <button
                          type="button"
                          onClick={handleMaterialGenAddToList}
                          className="px-4 py-2 text-sm rounded font-medium bg-[#ff824d] hover:bg-[#ff6b33] text-white"
                        >
                          목록에 추가하고 닫기
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            resetMaterialGenModal();
                            setMaterialGenModalOpen(false);
                          }}
                          className={`inline-flex h-9 w-9 items-center justify-center rounded ${isDarkMode ? "bg-zinc-700 text-gray-200" : "bg-gray-200 text-gray-800"}`}
                          aria-label="닫기"
                          title="닫기"
                        >
                          <CloseIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
            {materialGenStep === 1 && (
              <div
                className={`px-5 py-4 border-t flex justify-end gap-2 ${isDarkMode ? "border-zinc-700" : "border-gray-200"}`}
              >
                <button
                  type="button"
                  onClick={() => {
                    resetMaterialGenModal();
                    setMaterialGenModalOpen(false);
                  }}
                  className={`px-4 py-2 text-sm rounded ${isDarkMode ? "bg-zinc-800 text-gray-200" : "bg-gray-100 text-gray-700"}`}
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleMaterialGenSubmit}
                  disabled={submitting || !materialKeyword.trim()}
                  className="px-4 py-2 text-sm rounded font-medium bg-[#ff824d] hover:bg-[#ff6b33] text-white disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? "생성 중..." : "기획안 생성"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 시험 세션 상세 모달 */}
      {false && examDetailSessionId && examDetail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          role="dialog"
          aria-modal="true"
          onClick={() => {
            if (!examDetailLoading) {
              setExamDetailSessionId(null);
              setExamDetail(null);
              setExamDetailError(null);
              setExamDetailFlipped({});
              setFlashCardIndex(0);
              setFiveChoiceUserAnswers({});
              setFiveChoiceLog(null);
              setShortAnswerUserAnswers({});
              setShortAnswerLog(null);
              setShortAnswerKeywordOpen({});
              setShortAnswerGrading(false);
              setShortAnswerGradeError(null);
              setOxUserAnswers({});
              setOxGraded(false);
              setOxExamViewMode("all");
              setFiveChoiceExamViewMode("all");
              setOxExamSingleIndex(0);
              setFiveChoiceSingleIndex(0);
            }
          }}
        >
          <div
            className={`w-full max-w-3xl max-h-[80vh] overflow-hidden rounded-xl shadow-xl border ${
              isDarkMode
                ? "bg-zinc-900 border-zinc-700 text-gray-100"
                : "bg-white border-gray-200 text-gray-900"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`flex items-center justify-between gap-3 px-5 py-4 border-b ${isDarkMode ? "border-zinc-700/60" : "border-gray-200"}`}
            >
              <div className="min-w-0">
                <h2 className="text-lg font-semibold">시험 세션 상세</h2>
                <p className="text-xs mt-0.5 opacity-80 truncate">
                  세션 ID: {examDetailSessionId}
                  {examDetail?.examType && ` · 유형: ${examDetail.examType}`}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {(examDetail.oxProblems?.length ?? 0) > 0 && (
                  <ExamSectionViewModeToggle
                    mode={oxExamViewMode}
                    onChange={setOxExamViewMode}
                    isDarkMode={isDarkMode}
                  />
                )}
                {(examDetail.fiveChoiceProblems?.length ?? 0) > 0 && (
                  <ExamSectionViewModeToggle
                    mode={fiveChoiceExamViewMode}
                    onChange={setFiveChoiceExamViewMode}
                    isDarkMode={isDarkMode}
                  />
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (!examDetailLoading) {
                      setExamDetailSessionId(null);
                      setExamDetail(null);
                      setExamDetailError(null);
                      setExamDetailFlipped({});
                      setFlashCardIndex(0);
                      setFiveChoiceUserAnswers({});
                      setFiveChoiceLog(null);
                      setShortAnswerUserAnswers({});
                      setShortAnswerLog(null);
                      setShortAnswerKeywordOpen({});
                      setShortAnswerGrading(false);
                      setShortAnswerGradeError(null);
                      setOxUserAnswers({});
                      setOxGraded(false);
                      setOxExamViewMode("all");
                      setFiveChoiceExamViewMode("all");
                      setOxExamSingleIndex(0);
                      setFiveChoiceSingleIndex(0);
                    }
                  }}
                  className={`p-1.5 rounded cursor-pointer ${isDarkMode ? "hover:bg-zinc-800" : "hover:bg-gray-100"}`}
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {examDetailLoading && (
                <p
                  className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
                >
                  시험 세션 정보를 불러오는 중입니다...
                </p>
              )}
              {examDetailError && (
                <p
                  className={`text-sm ${isDarkMode ? "text-red-300" : "text-red-600"}`}
                >
                  {examDetailError}
                </p>
              )}
              {!examDetailLoading && !examDetailError && examDetail && (
                <>
                  {examDetail.usedProfile && (
                    <div
                      className={`rounded-lg border text-xs p-3 ${isDarkMode ? "border-zinc-700 bg-zinc-900/60" : "border-gray-200 bg-gray-50"}`}
                    >
                      <p className="font-semibold mb-1">사용된 Profile</p>
                      <div className="flex flex-wrap gap-2">
                        {examDetail.usedProfile.learningGoal?.focusAreas &&
                          examDetail.usedProfile.learningGoal.focusAreas
                            .length > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-600/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/40">
                              집중 영역:{" "}
                              {examDetail.usedProfile.learningGoal.focusAreas.join(
                                ", ",
                              )}
                            </span>
                          )}
                        {examDetail.usedProfile.userStatus
                          ?.proficiencyLevel && (
                          <span className="px-2 py-0.5 rounded-full bg-blue-600/10 text-blue-600 dark:text-blue-300 border border-blue-500/40">
                            수준:{" "}
                            {examDetail.usedProfile.userStatus.proficiencyLevel}
                          </span>
                        )}
                        {examDetail.usedProfile.scopeBoundary && (
                          <span className="px-2 py-0.5 rounded-full bg-gray-600/10 text-gray-600 dark:text-gray-300 border border-gray-500/40">
                            범위: {examDetail.usedProfile.scopeBoundary}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  {(() => {
                    const hasAny =
                      (examDetail.flashCards?.length ?? 0) > 0 ||
                      (examDetail.oxProblems?.length ?? 0) > 0 ||
                      (examDetail.fiveChoiceProblems?.length ?? 0) > 0 ||
                      (examDetail.shortAnswerProblems?.length ?? 0) > 0 ||
                      (examDetail.debateTopics?.length ?? 0) > 0;
                    if (!hasAny) {
                      return (
                        <p
                          className={`text-sm py-4 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                        >
                          표시할 문항이 없습니다. 시험을 비동기로 생성했다면
                          아직 생성 중일 수 있어요. 잠시 후 목록에서 다시
                          클릭하거나 새로고침해 보세요.
                        </p>
                      );
                    }
                    return null;
                  })()}
                  {examDetail.flashCards &&
                    examDetail.flashCards.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold">
                            플래시카드 ({examDetail.flashCards.length}개)
                          </h3>
                          <span className="text-xs opacity-70">
                            카드를 클릭하면 앞/뒷면이 전환됩니다.
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {examDetail.flashCards.map((card, index) => {
                            const id = index + 1;
                            const flipped = !!examDetailFlipped[id];
                            return (
                              <button
                                key={id}
                                type="button"
                                onClick={() => handleToggleFlashCard(id)}
                                className={`group relative text-left rounded-xl border p-3 text-xs transition-all cursor-pointer ${
                                  isDarkMode
                                    ? "border-zinc-700 bg-zinc-900 hover:bg-zinc-800"
                                    : "border-gray-200 bg-white hover:bg-emerald-50/50"
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-semibold opacity-70">
                                    #{id}
                                  </span>
                                  {card.categoryTag && (
                                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-600/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30">
                                      {card.categoryTag}
                                    </span>
                                  )}
                                </div>
                                <div className="mt-1 min-h-15">
                                  <p className="text-xs whitespace-pre-line">
                                    {flipped
                                      ? card.backContent
                                      : card.frontContent}
                                  </p>
                                </div>
                                <div className="mt-2 flex items-center justify-between text-xs opacity-70">
                                  <span>
                                    {flipped ? "정답 / 개념명" : "질문 / 힌트"}
                                  </span>
                                  <span>
                                    {flipped ? "앞면 보기" : "뒷면 보기"}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  {oxExamStats &&
                    (oxExamViewMode === "single" ? (
                      <div className="flex w-full flex-col gap-2 pb-1">
                        <div className="relative w-full px-8">
                          <ExamFlashStyleSideArrows
                            show={oxExamStats.total > 1}
                            isDarkMode={isDarkMode}
                            prevDisabled={oxExamSingleIndex <= 0}
                            nextDisabled={
                              oxExamSingleIndex >= oxExamStats.total - 1
                            }
                            onPrev={() =>
                              setOxExamSingleIndex((i) => Math.max(0, i - 1))
                            }
                            onNext={() =>
                              setOxExamSingleIndex((i) =>
                                Math.min(oxExamStats.total - 1, i + 1),
                              )
                            }
                          />
                          {(() => {
                            const idx = oxExamSingleIndex;
                            const q = oxExamStats.list[idx];
                            const choice = oxUserAnswers[String(idx)];
                            const userCorrect =
                              choice != null &&
                              isOxAnswerCorrect(choice, q.correctAnswer);
                            const oxCorrectCanon = normalizeExamOxCorrectAnswer(
                              q.correctAnswer,
                            );
                            return (
                              <div
                                className={examModalFlashCardShellClass(
                                  isDarkMode,
                                )}
                              >
                                <div className="mb-2 flex items-center justify-end">
                                  <p className="text-xs tabular-nums opacity-70">
                                    {idx + 1}/{oxExamStats.total}
                                  </p>
                                </div>
                                <p className="mb-3 text-base font-medium leading-7 whitespace-pre-wrap break-words">
                                  {q.questionContent}
                                </p>
                                <div className="mt-auto flex h-12 shrink-0 flex-wrap items-center justify-center gap-3">
                                  <label
                                    className={oxChoiceButtonClass({
                                      letter: "O",
                                      choice,
                                      correctCanonical: oxCorrectCanon,
                                      graded: oxGraded,
                                      isDarkMode,
                                    })}
                                  >
                                    <input
                                      type="radio"
                                      name={`ox-problem-${idx}`}
                                      className="sr-only"
                                      checked={choice === "O"}
                                      disabled={oxGraded}
                                      onChange={() =>
                                        handleOxAnswerChange(idx, "O")
                                      }
                                    />
                                    <span>O</span>
                                  </label>
                                  <label
                                    className={oxChoiceButtonClass({
                                      letter: "X",
                                      choice,
                                      correctCanonical: oxCorrectCanon,
                                      graded: oxGraded,
                                      isDarkMode,
                                    })}
                                  >
                                    <input
                                      type="radio"
                                      name={`ox-problem-${idx}`}
                                      className="sr-only"
                                      checked={choice === "X"}
                                      disabled={oxGraded}
                                      onChange={() =>
                                        handleOxAnswerChange(idx, "X")
                                      }
                                    />
                                    <span>X</span>
                                  </label>
                                </div>
                                {oxGraded && choice && (
                                  <div className="mt-3 space-y-1 border-t border-dashed border-gray-300 pt-2 dark:border-zinc-600">
                                    <p className="text-xs">
                                      <span className="font-semibold">
                                        결과:
                                      </span>{" "}
                                      <span
                                        className={
                                          userCorrect
                                            ? "text-emerald-500 font-medium"
                                            : "text-red-500 font-medium"
                                        }
                                      >
                                        {userCorrect ? "정답" : "오답"}
                                      </span>
                                    </p>
                                    <p className="text-xs opacity-90">
                                      <span className="font-semibold">
                                        정답:
                                      </span>{" "}
                                      {normalizeExamOxCorrectAnswer(
                                        q.correctAnswer,
                                      ) ?? q.correctAnswer}
                                    </p>
                                    {q.explanation ? (
                                      <p className="text-xs opacity-80 whitespace-pre-line">
                                        <span className="font-semibold">
                                          해설:
                                        </span>{" "}
                                        {q.explanation}
                                      </p>
                                    ) : null}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                        <div className="flex min-h-[4.5rem] w-full shrink-0 flex-col items-center justify-start gap-2 px-2 text-center">
                          {(oxExamSingleIndex === oxExamStats.total - 1 ||
                            oxExamStats.total <= 1) && (
                            <>
                              <button
                                type="button"
                                onClick={handleOxGrade}
                                disabled={
                                  !oxExamStats.allAnswered || oxGraded
                                }
                                className={`inline-flex items-center justify-center rounded px-3 py-1.5 text-xs font-medium cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                                  isDarkMode
                                    ? "bg-[#ff824d] text-white hover:bg-[#f26f37]"
                                    : "bg-[#ff824d] text-white hover:bg-[#f26f37]"
                                }`}
                              >
                                채점하기
                              </button>
                              {oxGraded ? (
                                <p
                                  className={`text-xs font-semibold ${isDarkMode ? "text-emerald-300" : "text-emerald-700"}`}
                                >
                                  {oxExamStats.total}문제 중{" "}
                                  {oxExamStats.correctCount}문제 정답
                                </p>
                              ) : null}
                            </>
                          )}
                        </div>
                        <ExamQuestionProgressDots
                          total={oxExamStats.total}
                          currentIndex={oxExamSingleIndex}
                          isAnswered={(i) => {
                            const c = oxUserAnswers[String(i)];
                            return c === "O" || c === "X";
                          }}
                          onSelect={(i) => setOxExamSingleIndex(i)}
                          isDarkMode={isDarkMode}
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="space-y-3 text-xs">
                          {oxExamStats.list.map((_, idx) => {
                            const q = oxExamStats.list[idx];
                            const choice = oxUserAnswers[String(idx)];
                            const userCorrect =
                              choice != null &&
                              isOxAnswerCorrect(choice, q.correctAnswer);
                            const oxCorrectCanon = normalizeExamOxCorrectAnswer(
                              q.correctAnswer,
                            );
                            return (
                              <div
                                key={idx}
                                className={`rounded-lg border p-2 ${isDarkMode ? "border-zinc-700" : "border-gray-200"}`}
                              >
                                <p className="mb-1 font-medium whitespace-pre-line">
                                  <span className="mr-1.5 inline tabular-nums font-semibold">
                                    {idx + 1}.
                                  </span>
                                  {q.questionContent}
                                </p>
                                <div className="mt-1 flex flex-wrap items-center gap-2">
                                  <label
                                    className={oxChoiceButtonClass({
                                      letter: "O",
                                      choice,
                                      correctCanonical: oxCorrectCanon,
                                      graded: oxGraded,
                                      isDarkMode,
                                    })}
                                  >
                                    <input
                                      type="radio"
                                      name={`ox-problem-modal-all-${idx}`}
                                      className="sr-only"
                                      checked={choice === "O"}
                                      disabled={oxGraded}
                                      onChange={() =>
                                        handleOxAnswerChange(idx, "O")
                                      }
                                    />
                                    <span>O</span>
                                  </label>
                                  <label
                                    className={oxChoiceButtonClass({
                                      letter: "X",
                                      choice,
                                      correctCanonical: oxCorrectCanon,
                                      graded: oxGraded,
                                      isDarkMode,
                                    })}
                                  >
                                    <input
                                      type="radio"
                                      name={`ox-problem-modal-all-${idx}`}
                                      className="sr-only"
                                      checked={choice === "X"}
                                      disabled={oxGraded}
                                      onChange={() =>
                                        handleOxAnswerChange(idx, "X")
                                      }
                                    />
                                    <span>X</span>
                                  </label>
                                </div>
                                {oxGraded && choice && (
                                  <div className="mt-2 space-y-1 border-t border-dashed border-gray-300 pt-2 dark:border-zinc-600">
                                    <p className="text-xs">
                                      <span className="font-semibold">
                                        결과:
                                      </span>{" "}
                                      <span
                                        className={
                                          userCorrect
                                            ? "text-emerald-500 font-medium"
                                            : "text-red-500 font-medium"
                                        }
                                      >
                                        {userCorrect ? "정답" : "오답"}
                                      </span>
                                    </p>
                                    <p className="text-xs opacity-90">
                                      <span className="font-semibold">
                                        정답:
                                      </span>{" "}
                                      {normalizeExamOxCorrectAnswer(
                                        q.correctAnswer,
                                      ) ?? q.correctAnswer}
                                    </p>
                                    {q.explanation ? (
                                      <p className="text-xs opacity-80 whitespace-pre-line">
                                        <span className="font-semibold">
                                          해설:
                                        </span>{" "}
                                        {q.explanation}
                                      </p>
                                    ) : null}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <div className="mt-2 flex flex-col gap-1.5">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <button
                              type="button"
                              onClick={handleOxGrade}
                              disabled={
                                !oxExamStats.allAnswered || oxGraded
                              }
                              className={`inline-flex items-center justify-center rounded px-3 py-1.5 text-xs font-medium cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                                isDarkMode
                                  ? "bg-[#ff824d] text-white hover:bg-[#f26f37]"
                                  : "bg-[#ff824d] text-white hover:bg-[#f26f37]"
                              }`}
                            >
                              채점하기
                            </button>
                            {oxGraded ? (
                              <p
                                className={`text-xs font-semibold ${isDarkMode ? "text-emerald-300" : "text-emerald-700"}`}
                              >
                                {oxExamStats.total}문제 중{" "}
                                {oxExamStats.correctCount}문제 정답
                              </p>
                            ) : (
                              <p className="text-xs opacity-70">
                                모든 문항에 O 또는 X를 선택하면 채점하기를 누를
                                수 있습니다.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  {examDetail.fiveChoiceProblems &&
                    examDetail.fiveChoiceProblems.length > 0 &&
                    (fiveChoiceExamViewMode === "single" ? (
                      <div className="flex w-full flex-col gap-2 pb-1">
                        <div className="relative w-full px-8">
                          <ExamFlashStyleSideArrows
                            show={
                              examDetail.fiveChoiceProblems.length > 1
                            }
                            isDarkMode={isDarkMode}
                            prevDisabled={fiveChoiceSingleIndex <= 0}
                            nextDisabled={
                              fiveChoiceSingleIndex >=
                              examDetail.fiveChoiceProblems.length - 1
                            }
                            onPrev={() =>
                              setFiveChoiceSingleIndex((i) =>
                                Math.max(0, i - 1),
                              )
                            }
                            onNext={() =>
                              setFiveChoiceSingleIndex((i) =>
                                Math.min(
                                  examDetail.fiveChoiceProblems.length - 1,
                                  i + 1,
                                ),
                              )
                            }
                          />
                          {(() => {
                            const idx = fiveChoiceSingleIndex;
                            const q =
                              examDetail.fiveChoiceProblems[idx];
                            const gradedItem =
                              fiveChoiceLog?.evaluationItems[idx];
                            const mcGraded = !!fiveChoiceLog;
                            const mcExplanation =
                              gradedItem &&
                              (gradedItem.resultStatus === "Correct"
                                ? (q.intentDiagnosis?.trim() ||
                                    gradedItem.feedbackMessage ||
                                    "")
                                : (gradedItem.feedbackMessage ||
                                    q.intentDiagnosis?.trim() ||
                                    ""));
                            return (
                              <div
                                className={examModalFlashCardShellClass(
                                  isDarkMode,
                                )}
                              >
                                <div className="mb-2 flex items-center justify-between">
                                  <p className="text-xs opacity-70">
                                    객관식
                                  </p>
                                  <p className="text-xs tabular-nums opacity-70">
                                    문항 {idx + 1}
                                  </p>
                                </div>
                                <p className="mb-3 text-base font-medium leading-7 whitespace-pre-wrap break-words">
                                  {q.questionContent}
                                </p>
                                <ul className="mt-auto space-y-1.5 pl-0 list-none">
                                  {q.options.map((opt) => {
                                    const selected =
                                      fiveChoiceUserAnswers[
                                        String(idx)
                                      ] === opt.id;
                                    return (
                                      <li key={opt.id}>
                                        <label
                                          className={fiveChoiceOptionLabelClass(
                                            selected,
                                            mcGraded,
                                            !!opt.isCorrect,
                                            isDarkMode,
                                          )}
                                        >
                                          <input
                                            type="radio"
                                            name={`five-choice-${idx}`}
                                            value={opt.id}
                                            className="sr-only"
                                            disabled={mcGraded}
                                            checked={selected}
                                            onChange={() =>
                                              handleFiveChoiceAnswerChange(
                                                idx,
                                                opt.id,
                                              )
                                            }
                                          />
                                          <span className="flex min-w-0 flex-1 items-start gap-2 text-sm">
                                            <span className="w-5 shrink-0 text-right font-semibold tabular-nums">
                                              {opt.id}.
                                            </span>
                                            <span className="min-w-0">
                                              {opt.content}
                                            </span>
                                            {mcGraded && opt.isCorrect ? (
                                              <span className="ml-auto shrink-0 text-xs font-semibold text-emerald-500">
                                                정답
                                              </span>
                                            ) : null}
                                          </span>
                                        </label>
                                      </li>
                                    );
                                  })}
                                </ul>
                                {gradedItem && (
                                  <div className="mt-3 space-y-1 border-t border-dashed border-gray-300 pt-2 dark:border-zinc-600">
                                    <p className="text-xs">
                                      <span className="font-semibold">
                                        결과:
                                      </span>{" "}
                                      <span
                                        className={
                                          gradedItem.resultStatus ===
                                          "Correct"
                                            ? "text-emerald-500 font-medium"
                                            : "text-red-500 font-medium"
                                        }
                                      >
                                        {gradedItem.resultStatus === "Correct"
                                          ? "정답"
                                          : "오답"}
                                      </span>
                                    </p>
                                    {mcExplanation ? (
                                      <p className="text-xs opacity-80 whitespace-pre-line">
                                        <span className="font-semibold">
                                          해설:
                                        </span>{" "}
                                        {mcExplanation}
                                      </p>
                                    ) : null}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                        {(fiveChoiceSingleIndex ===
                          examDetail.fiveChoiceProblems.length - 1 ||
                          examDetail.fiveChoiceProblems.length <= 1) && (
                          <div className="flex w-full flex-col items-center gap-1.5">
                            <div className="flex w-full max-w-md flex-col items-center gap-2 text-center">
                              <button
                                type="button"
                                onClick={handleFiveChoiceGrade}
                                disabled={
                                  !fiveChoiceExamStats?.allAnswered ||
                                  fiveChoiceExamStats?.graded
                                }
                                className={`inline-flex items-center justify-center rounded px-3 py-1.5 text-xs font-medium cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                                  isDarkMode
                                    ? "bg-[#ff824d] text-white hover:bg-[#f26f37]"
                                    : "bg-[#ff824d] text-white hover:bg-[#f26f37]"
                                }`}
                              >
                                선택한 답안 채점하기
                              </button>
                              {fiveChoiceExamStats?.graded ? (
                                <p
                                  className={`text-xs font-semibold ${isDarkMode ? "text-emerald-300" : "text-emerald-700"}`}
                                >
                                  {fiveChoiceExamStats.total}문제 중{" "}
                                  {fiveChoiceExamStats.correctCount}문제 정답
                                </p>
                              ) : (
                                <p className="text-xs opacity-70">
                                  모든 문항에 답을 선택하면 채점하기를 누를 수
                                  있습니다.
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                        <ExamQuestionProgressDots
                          total={
                            examDetail.fiveChoiceProblems.length
                          }
                          currentIndex={fiveChoiceSingleIndex}
                          isAnswered={(i) => {
                            const qq =
                              examDetail.fiveChoiceProblems[i];
                            const id = fiveChoiceUserAnswers[String(i)];
                            return (
                              id != null &&
                              id !== "" &&
                              (qq.options ?? []).some((o) => o.id === id)
                            );
                          }}
                          onSelect={(i) => setFiveChoiceSingleIndex(i)}
                          isDarkMode={isDarkMode}
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <ExamQuestionProgressDots
                          total={
                            examDetail.fiveChoiceProblems.length
                          }
                          currentIndex={null}
                          isAnswered={(i) => {
                            const qq =
                              examDetail.fiveChoiceProblems[i];
                            const id = fiveChoiceUserAnswers[String(i)];
                            return (
                              id != null &&
                              id !== "" &&
                              (qq.options ?? []).some((o) => o.id === id)
                            );
                          }}
                          isDarkMode={isDarkMode}
                        />
                        <ol className="divide-y divide-gray-200 text-xs list-decimal list-inside dark:divide-zinc-600">
                          {examDetail.fiveChoiceProblems.map((_, idx) => {
                            const q =
                              examDetail.fiveChoiceProblems[idx];
                            const gradedItem =
                              fiveChoiceLog?.evaluationItems[idx];
                            const mcGraded = !!fiveChoiceLog;
                            const mcExplanation =
                              gradedItem &&
                              (gradedItem.resultStatus === "Correct"
                                ? (q.intentDiagnosis?.trim() ||
                                    gradedItem.feedbackMessage ||
                                    "")
                                : (gradedItem.feedbackMessage ||
                                    q.intentDiagnosis?.trim() ||
                                    ""));
                            return (
                              <li
                                key={idx}
                                className="py-3 first:pt-0"
                              >
                                <p className="mb-2 font-medium">
                                  {q.questionContent}
                                </p>
                                <ul className="space-y-1.5 pl-0 list-none">
                                  {q.options.map((opt) => {
                                    const selected =
                                      fiveChoiceUserAnswers[
                                        String(idx)
                                      ] === opt.id;
                                    return (
                                      <li key={opt.id}>
                                        <label
                                          className={fiveChoiceOptionLabelClass(
                                            selected,
                                            mcGraded,
                                            !!opt.isCorrect,
                                            isDarkMode,
                                          )}
                                        >
                                          <input
                                            type="radio"
                                            name={`five-choice-${idx}`}
                                            value={opt.id}
                                            className="sr-only"
                                            disabled={mcGraded}
                                            checked={selected}
                                            onChange={() =>
                                              handleFiveChoiceAnswerChange(
                                                idx,
                                                opt.id,
                                              )
                                            }
                                          />
                                          <span className="flex min-w-0 flex-1 items-start gap-1.5 text-xs">
                                            <span className="w-4 shrink-0 text-right font-semibold tabular-nums">
                                              {opt.id}.
                                            </span>
                                            <span className="min-w-0">
                                              {opt.content}
                                            </span>
                                            {mcGraded &&
                                            opt.isCorrect ? (
                                              <span className="ml-auto shrink-0 text-xs font-semibold text-emerald-500">
                                                정답
                                              </span>
                                            ) : null}
                                          </span>
                                        </label>
                                      </li>
                                    );
                                  })}
                                </ul>
                                {gradedItem && (
                                  <div className="mt-2 space-y-1 border-t border-dashed border-gray-300 pt-2 dark:border-zinc-600">
                                    <p className="text-xs">
                                      <span className="font-semibold">
                                        결과:
                                      </span>{" "}
                                      <span
                                        className={
                                          gradedItem.resultStatus ===
                                          "Correct"
                                            ? "text-emerald-500 font-medium"
                                            : "text-red-500 font-medium"
                                        }
                                      >
                                        {gradedItem.resultStatus ===
                                        "Correct"
                                          ? "정답"
                                          : "오답"}
                                      </span>
                                    </p>
                                    {mcExplanation ? (
                                      <p className="text-xs opacity-80 whitespace-pre-line">
                                        <span className="font-semibold">
                                          해설:
                                        </span>{" "}
                                        {mcExplanation}
                                      </p>
                                    ) : null}
                                  </div>
                                )}
                              </li>
                            );
                          })}
                        </ol>
                        <div className="mt-2 flex flex-col gap-1">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <button
                              type="button"
                              onClick={handleFiveChoiceGrade}
                              disabled={
                                !fiveChoiceExamStats?.allAnswered ||
                                fiveChoiceExamStats?.graded
                              }
                              className={`inline-flex items-center justify-center rounded px-3 py-1.5 text-xs font-medium cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                                isDarkMode
                                  ? "bg-[#ff824d] text-white hover:bg-[#f26f37]"
                                  : "bg-[#ff824d] text-white hover:bg-[#f26f37]"
                              }`}
                            >
                              선택한 답안 채점하기
                            </button>
                            {fiveChoiceExamStats?.graded ? (
                              <p
                                className={`text-xs font-semibold ${isDarkMode ? "text-emerald-300" : "text-emerald-700"}`}
                              >
                                {fiveChoiceExamStats.total}문제 중{" "}
                                {fiveChoiceExamStats.correctCount}문제 정답
                              </p>
                            ) : (
                              <p className="text-xs opacity-70">
                                모든 문항에 답을 선택하면 채점하기를 누를 수
                                있습니다.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  {examDetail.shortAnswerProblems &&
                    examDetail.shortAnswerProblems.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-sm font-semibold">
                          단답형 / 서술형 (
                          {examDetail.shortAnswerProblems.length}개)
                        </h3>
                        <ol className="space-y-3 text-xs list-decimal list-inside">
                          {examDetail.shortAnswerProblems.map((q, idx) => {
                            const type = (q as any).type as
                              | "Short_Keyword"
                              | "Descriptive"
                              | undefined;
                            const kKey = String(idx);
                            const kwOpen = !!shortAnswerKeywordOpen[kKey];
                            const anyKeywords =
                              getShortAnswerKeywordsFromProblem(q);
                            const intentText = getShortAnswerIntentText(q);
                            const saItem =
                              shortAnswerLog?.evaluationItems[idx];
                            const saGraded = !!shortAnswerLog && !!saItem;

                            return (
                              <li
                                key={idx}
                                className={`rounded-lg border p-2 ${
                                  isDarkMode
                                    ? "border-zinc-700"
                                    : "border-gray-200"
                                }`}
                              >
                                <div className="mb-1 flex items-start justify-between gap-2">
                                  <p className="flex-1 font-medium">
                                    {q.questionContent}
                                  </p>
                                  {type && (
                                    <span
                                      className={`shrink-0 rounded-full border px-2 py-0.5 text-xs ${
                                        isDarkMode
                                          ? "border-zinc-600 bg-zinc-800 text-gray-200"
                                          : "border-gray-300 bg-gray-100 text-gray-700"
                                      }`}
                                    >
                                      {type === "Short_Keyword"
                                        ? "단답형"
                                        : "서술형"}
                                    </span>
                                  )}
                                </div>
                                <div className="mb-1.5">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setShortAnswerKeywordOpen((p) => ({
                                        ...p,
                                        [kKey]: !p[kKey],
                                      }))
                                    }
                                    className={`text-xs underline cursor-pointer ${isDarkMode ? "text-sky-300" : "text-sky-700"}`}
                                  >
                                    {kwOpen
                                      ? "키워드와 출제의도 접기"
                                      : "키워드와 출제의도 보기"}
                                  </button>
                                  {kwOpen ? (
                                    <div
                                      className={`mt-1.5 rounded border p-2 space-y-1 text-xs ${
                                        isDarkMode
                                          ? "border-zinc-600 bg-zinc-800/50"
                                          : "border-gray-200 bg-gray-50"
                                      }`}
                                    >
                                      {anyKeywords.length > 0 ? (
                                        <p>
                                          <span className="font-semibold">
                                            핵심 키워드:
                                          </span>{" "}
                                          {anyKeywords.join(", ")}
                                        </p>
                                      ) : null}
                                      {intentText ? (
                                        <p className="whitespace-pre-line opacity-90">
                                          <span className="font-semibold">
                                            출제 의도:
                                          </span>{" "}
                                          {intentText}
                                        </p>
                                      ) : null}
                                      {anyKeywords.length === 0 &&
                                      !intentText ? (
                                        <p className="opacity-70">
                                          등록된 키워드·출제 의도가 없습니다.
                                        </p>
                                      ) : null}
                                    </div>
                                  ) : null}
                                </div>
                                <div className="mt-2">
                                  <label className="mb-1 block text-xs font-semibold">
                                    나의 답안
                                  </label>
                                  <textarea
                                    value={
                                      shortAnswerUserAnswers[String(idx)] ??
                                      ""
                                    }
                                    onChange={(e) =>
                                      handleShortAnswerInputChange(
                                        idx,
                                        e.target.value,
                                      )
                                    }
                                    readOnly={saGraded}
                                    className={`min-h-15 w-full resize-y rounded border px-2 py-1 text-xs ${
                                      saGraded ? "opacity-90" : ""
                                    } ${
                                      isDarkMode
                                        ? "border-zinc-700 bg-zinc-900 text-gray-100"
                                        : "border-gray-300 bg-white text-gray-900"
                                    }`}
                                    placeholder="이 문항에 대한 자신의 답안을 작성해 보세요."
                                  />
                                </div>
                                {saGraded && saItem && (
                                  <div className="mt-2 space-y-1.5 border-t border-dashed border-gray-300 pt-2 text-xs dark:border-zinc-600">
                                    <p>
                                      <span className="font-semibold">
                                        점수:
                                      </span>{" "}
                                      <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                        {(saItem.score * 10).toFixed(1)} / 10
                                      </span>
                                    </p>
                                    {saItem.gradingReason ? (
                                      <p className="whitespace-pre-line opacity-90">
                                        <span className="font-semibold">
                                          채점 이유:
                                        </span>{" "}
                                        {saItem.gradingReason}
                                      </p>
                                    ) : null}
                                    {saItem.feedback ? (
                                      <p className="whitespace-pre-line opacity-90">
                                        <span className="font-semibold">
                                          피드백:
                                        </span>{" "}
                                        {saItem.feedback}
                                      </p>
                                    ) : null}
                                    {saItem.pointsDeducted &&
                                    saItem.deductionReason ? (
                                      <p className="whitespace-pre-line opacity-90">
                                        <span className="font-semibold">
                                          감점 사유:
                                        </span>{" "}
                                        {saItem.deductionReason}
                                      </p>
                                    ) : null}
                                  </div>
                                )}
                              </li>
                            );
                          })}
                        </ol>
                        <div className="mt-2 flex flex-col gap-1.5">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <button
                              type="button"
                              onClick={handleShortAnswerGrade}
                              disabled={
                                !shortAnswerExamStats?.allAnswered ||
                                shortAnswerExamStats?.graded ||
                                shortAnswerGrading
                              }
                              className={`inline-flex items-center rounded px-3 py-1.5 text-xs font-medium cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                                isDarkMode
                                  ? "bg-[#ff824d] text-white hover:bg-[#f26f37]"
                                  : "bg-[#ff824d] text-white hover:bg-[#f26f37]"
                              }`}
                            >
                              {shortAnswerGrading
                                ? "채점 중…"
                                : "작성한 단답/서술형 채점하기"}
                            </button>
                            {shortAnswerExamStats?.graded &&
                            shortAnswerExamStats.totalScoreOutOf10 != null ? (
                              <p
                                className={`text-xs font-semibold ${isDarkMode ? "text-emerald-300" : "text-emerald-700"}`}
                              >
                                총점{" "}
                                {shortAnswerExamStats.totalScoreOutOf10.toFixed(
                                  1,
                                )}{" "}
                                / 10
                              </p>
                            ) : (
                              <p className="text-xs opacity-70">
                                모든 문항에 답안을 작성한 뒤 채점하기를 누르면
                                문항별로 채점 결과가 표시됩니다.
                              </p>
                            )}
                          </div>
                          {shortAnswerGradeError ? (
                            <p
                              className={`text-xs ${isDarkMode ? "text-red-400" : "text-red-600"}`}
                            >
                              {shortAnswerGradeError}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    )}
                  {examDetail.debateTopics &&
                    examDetail.debateTopics.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-sm font-semibold">
                          토론형 주제 ({examDetail.debateTopics.length}개)
                        </h3>
                        <ol className="space-y-3 text-xs list-decimal list-inside">
                          {examDetail.debateTopics.map((d, idx) => (
                            <li
                              key={idx}
                              className={`rounded-lg border p-2 ${isDarkMode ? "border-zinc-700" : "border-gray-200"}`}
                            >
                              <p className="font-medium mb-1">{d.topic}</p>
                              {d.context && (
                                <p className="text-xs opacity-80 whitespace-pre-line">
                                  맥락: {d.context}
                                </p>
                              )}
                              <p className="mt-1 text-xs">
                                <span className="font-semibold">
                                  찬성 입장:
                                </span>{" "}
                                {d.proSideStand}
                              </p>
                              <p className="mt-1 text-xs">
                                <span className="font-semibold">
                                  반대 입장:
                                </span>{" "}
                                {d.conSideStand}
                              </p>
                              {d.evaluationCriteria?.length > 0 && (
                                <p className="mt-1 text-xs opacity-80">
                                  평가 기준: {d.evaluationCriteria.join(", ")}
                                </p>
                              )}
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 평가 만들기 모달 */}
      {assessmentModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          role="dialog"
          aria-modal="true"
          onClick={() => !submitting && setAssessmentModalOpen(false)}
        >
          <div
            className={`w-full max-w-md rounded-xl shadow-xl border ${isDarkMode ? "bg-zinc-900 border-zinc-700" : "bg-white border-gray-200"}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`flex justify-between px-5 py-4 border-b ${isDarkMode ? "border-zinc-700" : "border-gray-200"}`}
            >
              <h2
                className={`text-lg font-semibold ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}
              >
                평가 만들기
              </h2>
              <button
                type="button"
                onClick={() => !submitting && setAssessmentModalOpen(false)}
                className="p-1.5 rounded hover:bg-black/10"
              >
                ✕
              </button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div>
                <label
                  className={`block text-sm font-medium mb-1 ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}
                >
                  제목
                </label>
                <input
                  type="text"
                  value={assessmentTitle}
                  onChange={(e) => setAssessmentTitle(e.target.value)}
                  placeholder="예: 3주차 퀴즈"
                  className={`w-full px-3 py-2 text-sm rounded border ${isDarkMode ? "bg-zinc-800 border-zinc-600 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                />
              </div>
              <div>
                <label
                  className={`block text-sm font-medium mb-1 ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}
                >
                  유형
                </label>
                <select
                  value={assessmentType}
                  onChange={(e) =>
                    setAssessmentType(e.target.value as "QUIZ" | "ASSIGNMENT")
                  }
                  className={`w-full px-3 py-2 text-sm rounded border ${isDarkMode ? "bg-zinc-800 border-zinc-600 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                >
                  <option value="QUIZ">퀴즈</option>
                  <option value="ASSIGNMENT">과제</option>
                </select>
              </div>
              <div>
                <label
                  className={`block text-sm font-medium mb-1 ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}
                >
                  마감일
                </label>
                <input
                  type="date"
                  value={assessmentDueDate}
                  onChange={(e) => setAssessmentDueDate(e.target.value)}
                  className={`w-full px-3 py-2 text-sm rounded border ${isDarkMode ? "bg-zinc-800 border-zinc-600 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                />
              </div>
            </div>
            <div
              className={`px-5 py-4 border-t flex justify-end gap-2 ${isDarkMode ? "border-zinc-700" : "border-gray-200"}`}
            >
              <button
                type="button"
                onClick={() => !submitting && setAssessmentModalOpen(false)}
                className={`px-4 py-2 text-sm rounded ${isDarkMode ? "bg-zinc-800 text-gray-200" : "bg-gray-100 text-gray-700"}`}
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleAssessmentSubmit}
                disabled={
                  submitting || !assessmentTitle.trim() || !assessmentDueDate
                }
                className="px-4 py-2 text-sm rounded font-medium bg-[#ff824d] text-white hover:bg-[#f26f37] disabled:opacity-50 cursor-pointer"
              >
                {submitting ? "생성 중..." : "생성"}
              </button>
            </div>
          </div>
        </div>
      )}
      {studentReportModalOpen && courseDetail?.courseId != null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className={`w-full max-w-6xl h-[80vh] rounded-lg shadow-lg overflow-hidden flex flex-col ${
              isDarkMode ? "bg-[#071829] text-white" : "bg-white text-gray-900"
            }`}
          >
            <div
              className={`px-5 py-4 border-b flex items-start justify-between gap-4 ${
                isDarkMode ? "border-zinc-700" : "border-gray-200"
              }`}
            >
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold">강의실 리포트</h2>
                <p className={`text-xs mt-1 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                  teacher 전용 강의실 상세·종합 리포트
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => setStudentReportModalTab("students")}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
                      studentReportModalTab === "students"
                        ? "bg-[#ff824d] text-white"
                        : isDarkMode
                          ? "bg-zinc-800 text-gray-300 hover:bg-zinc-700"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    학생별
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudentReportModalTab("classroom")}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
                      studentReportModalTab === "classroom"
                        ? "bg-[#ff824d] text-white"
                        : isDarkMode
                          ? "bg-zinc-800 text-gray-300 hover:bg-zinc-700"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    강의실 종합
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStudentReportModalOpen(false)}
                className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                  isDarkMode ? "bg-zinc-800 text-gray-200" : "bg-gray-100 text-gray-700"
                }`}
                aria-label="닫기"
                title="닫기"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>
            {studentReportModalTab === "classroom" ? (
              <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={classroomReportLoading || classroomAnalyzeSyncLoading || classroomAnalyzeStreaming}
                    onClick={() => {
                      if (courseDetail?.courseId == null) return;
                      setClassroomReportLoading(true);
                      setClassroomReportError(null);
                      void studentReportApi
                        .getClassroomReport(courseDetail.courseId)
                        .then((r) => setClassroomReport(r))
                        .catch((e) => {
                          setClassroomReportError(
                            e instanceof Error ? e.message : "강의실 리포트를 불러오지 못했습니다.",
                          );
                          setClassroomReport(undefined);
                        })
                        .finally(() => setClassroomReportLoading(false));
                    }}
                    aria-label="새로고침"
                    title="새로고침"
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold ${
                      isDarkMode ? "bg-zinc-800 text-gray-200" : "bg-gray-100 text-gray-800"
                    } disabled:opacity-50`}
                  >
                    <RefreshIcon className={`h-4 w-4 ${classroomReportLoading ? "animate-spin" : ""}`} />
                  </button>
                  <button
                    type="button"
                    disabled={
                      classroomAnalyzeSyncLoading ||
                      classroomAnalyzeStreaming ||
                      classroomReportLoading
                    }
                    onClick={() => {
                      if (courseDetail?.courseId == null) return;
                      setClassroomAnalyzeSyncLoading(true);
                      setClassroomReportError(null);
                      void (async () => {
                        try {
                          await studentReportApi.analyzeClassroomSync(courseDetail.courseId);
                          const r = await studentReportApi.getClassroomReport(courseDetail.courseId);
                          setClassroomReport(r);
                        } catch (e) {
                          setClassroomReportError(
                            e instanceof Error ? e.message : "동기 분석에 실패했습니다.",
                          );
                        } finally {
                          setClassroomAnalyzeSyncLoading(false);
                        }
                      })();
                    }}
                    className="px-3 py-2 text-xs font-semibold rounded-lg bg-[#ff824d] text-white hover:bg-[#f26f37] disabled:opacity-50"
                  >
                    {classroomAnalyzeSyncLoading ? "분석 중…" : "종합 분석 (동기)"}
                  </button>
                  <button
                    type="button"
                    disabled={
                      classroomAnalyzeStreaming ||
                      classroomAnalyzeSyncLoading ||
                      classroomReportLoading
                    }
                    onClick={() => {
                      if (courseDetail?.courseId == null) return;
                      setClassroomAnalyzeStreaming(true);
                      setClassroomStreamBuffer("");
                      setClassroomReportError(null);
                      void (async () => {
                        try {
                          await studentReportApi.streamClassroomAnalyze(courseDetail.courseId, {
                            onDelta: (c) => setClassroomStreamBuffer((p) => p + c),
                          });
                          const r = await studentReportApi.getClassroomReport(courseDetail.courseId);
                          setClassroomReport(r);
                        } catch (e) {
                          setClassroomReportError(
                            e instanceof Error ? e.message : "스트림 분석에 실패했습니다.",
                          );
                        } finally {
                          setClassroomAnalyzeStreaming(false);
                        }
                      })();
                    }}
                    className="px-3 py-2 text-xs font-semibold rounded-lg bg-[#ff824d] text-white disabled:opacity-50"
                  >
                    {classroomAnalyzeStreaming ? "스트림 수신 중…" : "종합 분석 (스트림)"}
                  </button>
                </div>
                {classroomReportError ? (
                  <p className={`text-sm ${isDarkMode ? "text-red-300" : "text-red-600"}`}>
                    {classroomReportError}
                  </p>
                ) : null}
                {classroomReportLoading ? (
                  <div className="text-sm opacity-70 py-8 text-center">불러오는 중…</div>
                ) : classroomReport === null ? (
                  <div className={`rounded-lg border p-6 text-sm ${isDarkMode ? "border-zinc-700 bg-zinc-900/40" : "border-gray-200 bg-gray-50"}`}>
                    아직 생성된 강의실 종합 리포트가 없습니다. 위에서 분석을 실행해 보세요.
                  </div>
                ) : classroomReport ? (
                  <div className="space-y-5">
                    <div className={`flex flex-wrap gap-3 text-xs ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                      {classroomReport.generatedAt ? (
                        <span>생성: {classroomReport.generatedAt}</span>
                      ) : null}
                      {classroomReport.confidence ? (
                        <span>신뢰도: {classroomReport.confidence}</span>
                      ) : null}
                      {classroomReport.source ? <span>출처: {classroomReport.source}</span> : null}
                      {classroomReport.fallbackUsed ? <span>폴백 사용</span> : null}
                    </div>
                    {classroomReport.reason ? (
                      <p className={`text-xs ${isDarkMode ? "text-amber-200/90" : "text-amber-800"}`}>
                        {classroomReport.reason}
                      </p>
                    ) : null}
                    <section className="space-y-2">
                      <h3 className="text-sm font-semibold">요약</h3>
                      <div
                        className={`rounded-lg border p-4 text-sm prose prose-sm max-w-none dark:prose-invert ${isDarkMode ? "border-zinc-700 bg-zinc-900/40" : "border-gray-200 bg-gray-50"}`}
                      >
                        {classroomReport.summaryMarkdown.trim() ? (
                          <MarkdownContent>{classroomReport.summaryMarkdown}</MarkdownContent>
                        ) : (
                          <span className="opacity-70">요약 본문이 없습니다.</span>
                        )}
                      </div>
                    </section>
                    {classroomReport.highlights.length > 0 ? (
                      <section className="space-y-2">
                        <h3 className="text-sm font-semibold">하이라이트</h3>
                        <ul className="space-y-2">
                          {classroomReport.highlights.map((row, i) => (
                            <li
                              key={`h-${i}`}
                              className={`rounded-lg border px-3 py-2 text-sm ${isDarkMode ? "border-zinc-700 bg-zinc-900/30" : "border-gray-200 bg-white"}`}
                            >
                              {reportInsightPrimaryText(row)}
                            </li>
                          ))}
                        </ul>
                      </section>
                    ) : null}
                    {classroomReport.risks.length > 0 ? (
                      <section className="space-y-2">
                        <h3 className="text-sm font-semibold">리스크</h3>
                        <ul className="space-y-2">
                          {classroomReport.risks.map((row, i) => (
                            <li
                              key={`r-${i}`}
                              className={`rounded-lg border px-3 py-2 text-sm ${isDarkMode ? "border-zinc-700 bg-zinc-900/30" : "border-gray-200 bg-white"}`}
                            >
                              {reportInsightPrimaryText(row)}
                            </li>
                          ))}
                        </ul>
                      </section>
                    ) : null}
                    {classroomReport.coachingPriorities.length > 0 ? (
                      <section className="space-y-2">
                        <h3 className="text-sm font-semibold">코칭 우선순위</h3>
                        <ul className="space-y-2">
                          {classroomReport.coachingPriorities.map((row, i) => (
                            <li
                              key={`c-${i}`}
                              className={`rounded-lg border px-3 py-2 text-sm ${isDarkMode ? "border-zinc-700 bg-zinc-900/30" : "border-gray-200 bg-white"}`}
                            >
                              {reportInsightPrimaryText(row)}
                            </li>
                          ))}
                        </ul>
                      </section>
                    ) : null}
                  </div>
                ) : null}
                {classroomStreamBuffer.trim() ? (
                  <details
                    className={`rounded-lg border text-sm ${isDarkMode ? "border-zinc-700 bg-zinc-900/20" : "border-gray-200 bg-gray-50"}`}
                  >
                    <summary className="cursor-pointer px-3 py-2 font-medium">스트림 로그</summary>
                    <pre className="px-3 pb-3 text-xs whitespace-pre-wrap overflow-x-auto opacity-90">
                      {classroomStreamBuffer}
                    </pre>
                  </details>
                ) : null}
              </div>
            ) : (
            <div className="flex-1 min-h-0 flex">
              <div
                className={`w-[22.5rem] shrink-0 border-r flex flex-col ${
                  isDarkMode ? "border-zinc-700" : "border-gray-200"
                }`}
              >
                <div className="p-4 space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={studentReportSearchInput}
                      onChange={(e) => setStudentReportSearchInput(e.target.value)}
                      placeholder="학생 이름 검색"
                      className={`flex-1 px-3 py-2 text-sm rounded-lg border ${
                        isDarkMode
                          ? "bg-zinc-800 border-zinc-700 text-white"
                          : "bg-white border-gray-300 text-gray-900"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setStudentReportPage(0);
                        setStudentReportQuery(studentReportSearchInput.trim());
                      }}
                      className="px-3 py-2 text-sm rounded-lg bg-[#ff824d] text-white"
                    >
                      검색
                    </button>
                  </div>
                  <select
                    value={studentReportStatus}
                    onChange={(e) => {
                      setStudentReportPage(0);
                      setStudentReportStatus(e.target.value as StudentReportStatusFilter);
                    }}
                    className={`w-full px-3 py-2 text-sm rounded-lg border ${
                      isDarkMode
                        ? "bg-zinc-800 border-zinc-700 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    }`}
                  >
                    {STUDENT_REPORT_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4">
                  {studentReportListLoading ? (
                    <div className="h-full flex items-center justify-center text-sm opacity-70">
                      목록 불러오는 중...
                    </div>
                  ) : studentReportListError ? (
                    <div className={`text-sm ${isDarkMode ? "text-red-300" : "text-red-600"}`}>
                      {studentReportListError}
                    </div>
                  ) : !(studentReportList?.content?.length ?? 0) ? (
                    <div className="h-full flex items-center justify-center text-sm opacity-70">
                      조회된 학생이 없습니다.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(studentReportList?.content ?? []).map((item) => {
                        const active = selectedStudentReportId === item.studentId;
                        return (
                          <button
                            key={item.studentId}
                            type="button"
                            onClick={() => setSelectedStudentReportId(item.studentId)}
                            className={`w-full text-left rounded-lg border px-3 py-3 transition-colors ${
                              active
                                ? "border-[#ff824d] bg-[#ff824d]/10"
                                : isDarkMode
                                  ? "border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800"
                                  : "border-gray-200 bg-white hover:bg-gray-50"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{item.name}</p>
                                <p className={`text-xs mt-1 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                                  studentId {item.studentId} / userId {item.userId}
                                </p>
                              </div>
                              <span
                                className={`shrink-0 text-xs px-2 py-1 rounded-full ${
                                  isDarkMode ? "bg-zinc-800 text-gray-300" : "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {studentReportStatusLabel(String(item.reportStatus))}
                              </span>
                            </div>
                            <p className={`text-xs mt-2 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
                              평균 점수 {item.averageScorePercent != null ? `${item.averageScorePercent}%` : "-"}
                              {(item.examAttemptCount != null || item.submissionCount != null) && (
                                <span className="ml-2">
                                  시험 {item.examAttemptCount ?? "-"}회 / 제출 {item.submissionCount ?? "-"}
                                </span>
                              )}
                            </p>
                            {(item.topStrengthLabel || item.topImprovementLabel) && (
                              <p className={`text-xs mt-1 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                                {item.topStrengthLabel ? (
                                  <span>강점: {item.topStrengthLabel}</span>
                                ) : null}
                                {item.topStrengthLabel && item.topImprovementLabel ? " · " : null}
                                {item.topImprovementLabel ? (
                                  <span>개선: {item.topImprovementLabel}</span>
                                ) : null}
                              </p>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                {studentReportList && studentReportList.totalPages > 1 && (
                  <div
                    className={`px-4 py-3 border-t flex items-center justify-between ${
                      isDarkMode ? "border-zinc-700" : "border-gray-200"
                    }`}
                  >
                    <button
                      type="button"
                      disabled={studentReportList.first}
                      onClick={() => setStudentReportPage((prev) => Math.max(0, prev - 1))}
                      className={`px-3 py-1.5 text-xs rounded-lg ${
                        studentReportList.first
                          ? "opacity-40 cursor-not-allowed"
                          : isDarkMode
                            ? "bg-zinc-800 text-gray-200"
                            : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      이전
                    </button>
                    <span className="text-xs opacity-70">
                      {studentReportList.page + 1} / {studentReportList.totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={studentReportList.last}
                      onClick={() =>
                        setStudentReportPage((prev) =>
                          Math.min(studentReportList.totalPages - 1, prev + 1),
                        )
                      }
                      className={`px-3 py-1.5 text-xs rounded-lg ${
                        studentReportList.last
                          ? "opacity-40 cursor-not-allowed"
                          : isDarkMode
                            ? "bg-zinc-800 text-gray-200"
                            : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      다음
                    </button>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 flex flex-col min-h-0">
                <div className="flex-1 min-h-0 overflow-y-auto p-5">
                {studentReportDetailLoading ? (
                  <div className="h-full flex items-center justify-center text-sm opacity-70">
                    상세 불러오는 중...
                  </div>
                ) : studentReportDetailError ? (
                  <p className={`text-sm ${isDarkMode ? "text-red-300" : "text-red-600"}`}>
                    {studentReportDetailError}
                  </p>
                ) : !studentReportDetail ? (
                  <div className="h-full flex items-center justify-center text-sm opacity-70">
                    학생을 선택하면 상세 리포트가 표시됩니다.
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div>
                      <h3 className="text-lg font-semibold">{studentReportDetail.name}</h3>
                      <p className={`text-sm mt-1 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                        studentId {studentReportDetail.studentId} / userId {studentReportDetail.userId}
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className={`rounded-lg border p-4 ${isDarkMode ? "border-zinc-700 bg-zinc-900/40" : "border-gray-200 bg-gray-50"}`}>
                        <p className="text-xs opacity-70">상태</p>
                        <p className="text-sm font-medium mt-1">
                          {studentReportStatusLabel(String(studentReportDetail.reportStatus))}
                        </p>
                      </div>
                      <div className={`rounded-lg border p-4 ${isDarkMode ? "border-zinc-700 bg-zinc-900/40" : "border-gray-200 bg-gray-50"}`}>
                        <p className="text-xs opacity-70">평균 점수</p>
                        <p className="text-sm font-medium mt-1">
                          {studentReportDetail.averageScorePercent != null
                            ? `${studentReportDetail.averageScorePercent}%`
                            : "-"}
                        </p>
                      </div>
                      <div className={`rounded-lg border p-4 ${isDarkMode ? "border-zinc-700 bg-zinc-900/40" : "border-gray-200 bg-gray-50"}`}>
                        <p className="text-xs opacity-70">최근 활동</p>
                        <p className="text-sm font-medium mt-1">
                          {formatActivityMonthForKo(
                            studentReportDetail.latestActivityAt,
                          )}
                        </p>
                      </div>
                    </div>
                    <section className="space-y-2">
                      <h4 className="text-sm font-semibold">서술 리포트</h4>
                      <div className={`rounded-lg border p-4 text-sm whitespace-pre-wrap ${isDarkMode ? "border-zinc-700 bg-zinc-900/40 text-gray-200" : "border-gray-200 bg-gray-50 text-gray-700"}`}>
                        {studentReportDetail.narrativeReport?.trim() || "리포트 본문이 없습니다."}
                      </div>
                    </section>
                    <section className="space-y-2">
                      <h4 className="text-sm font-semibold">역량</h4>
                      <div className="space-y-2">
                        {studentReportDetail.competencies?.length ? (
                          studentReportDetail.competencies.map((competency, index) => (
                            <div
                              key={`${competency.competencyId ?? competency.competencyName}-${index}`}
                              className={`rounded-lg border p-4 ${isDarkMode ? "border-zinc-700 bg-zinc-900/40" : "border-gray-200 bg-gray-50"}`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-medium">{competency.competencyName}</p>
                                <span className="text-xs opacity-70">
                                  {competency.scorePercent != null ? `${competency.scorePercent}%` : competency.level || "-"}
                                </span>
                              </div>
                              {competency.feedback ? (
                                <p className={`text-sm mt-2 whitespace-pre-wrap ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
                                  {competency.feedback}
                                </p>
                              ) : null}
                            </div>
                          ))
                        ) : (
                          <p className="text-sm opacity-70">표시할 역량 데이터가 없습니다.</p>
                        )}
                      </div>
                    </section>
                    <section className="space-y-2">
                      <h4 className="text-sm font-semibold">AI 분석용 컨텍스트</h4>
                      {studentAiContextLoading ? (
                        <p className="text-sm opacity-70">컨텍스트 불러오는 중…</p>
                      ) : studentAiContextError ? (
                        <p className={`text-sm ${isDarkMode ? "text-red-300" : "text-red-600"}`}>
                          {studentAiContextError}
                        </p>
                      ) : studentAiContext ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {(studentAiContext.course?.courseName || studentAiContext.course?.courseId != null) && (
                              <div
                                className={`rounded-lg border p-3 text-xs ${isDarkMode ? "border-zinc-700 bg-zinc-900/40" : "border-gray-200 bg-white"}`}
                              >
                                <p className="opacity-70">강의</p>
                                <p className="font-medium mt-1">
                                  {studentAiContext.course?.courseName || `courseId ${studentAiContext.course?.courseId ?? ""}`}
                                </p>
                              </div>
                            )}
                            {(studentAiContext.student?.studentName ||
                              studentAiContext.student?.studentId != null) && (
                              <div
                                className={`rounded-lg border p-3 text-xs ${isDarkMode ? "border-zinc-700 bg-zinc-900/40" : "border-gray-200 bg-white"}`}
                              >
                                <p className="opacity-70">학생</p>
                                <p className="font-medium mt-1">
                                  {studentAiContext.student?.studentName || ""}
                                  {studentAiContext.student?.enrollmentStatus
                                    ? ` (${studentAiContext.student.enrollmentStatus})`
                                    : ""}
                                </p>
                              </div>
                            )}
                          </div>
                          {studentAiContext.activitySummary && (
                            <div
                              className={`rounded-lg border p-3 text-xs space-y-1 ${isDarkMode ? "border-zinc-700 bg-zinc-900/40" : "border-gray-200 bg-white"}`}
                            >
                              <p className="font-semibold">활동</p>
                              <p>
                                과제·평가 {studentAiContext.activitySummary.totalAssessments ?? "-"} · 제출{" "}
                                {studentAiContext.activitySummary.submittedCount ?? "-"} · 미제출{" "}
                                {studentAiContext.activitySummary.missingCount ?? "-"}
                              </p>
                              {studentAiContext.activitySummary.latestSubmittedAt ? (
                                <p className="opacity-80">
                                  최근 제출: {studentAiContext.activitySummary.latestSubmittedAt}
                                </p>
                              ) : null}
                            </div>
                          )}
                          {studentAiContext.scoreSummary && (
                            <div
                              className={`rounded-lg border p-3 text-xs space-y-1 ${isDarkMode ? "border-zinc-700 bg-zinc-900/40" : "border-gray-200 bg-white"}`}
                            >
                              <p className="font-semibold">점수</p>
                              <p>
                                평균 {studentAiContext.scoreSummary.averageScore ?? studentAiContext.scoreSummary.averageScoreRatio ?? "-"}
                                {studentAiContext.scoreSummary.highestScore != null ||
                                studentAiContext.scoreSummary.lowestScore != null
                                  ? ` (최고 ${studentAiContext.scoreSummary.highestScore ?? "-"} / 최저 ${studentAiContext.scoreSummary.lowestScore ?? "-"})`
                                  : null}
                              </p>
                              {studentAiContext.scoreSummary.trend ? (
                                <p>추세: {studentAiContext.scoreSummary.trend}</p>
                              ) : null}
                              {studentAiContext.scoreSummary.recentTrend &&
                              studentAiContext.scoreSummary.recentTrend.length > 0 ? (
                                <p className="opacity-80 font-mono">
                                  최근: [{studentAiContext.scoreSummary.recentTrend.join(", ")}]
                                </p>
                              ) : null}
                            </div>
                          )}
                          <details
                            className={`rounded-lg border text-xs ${isDarkMode ? "border-zinc-700 bg-zinc-900/20" : "border-gray-200 bg-gray-50"}`}
                          >
                            <summary className="cursor-pointer px-3 py-2 font-medium">원본 JSON</summary>
                            <pre className="px-3 pb-3 max-h-48 overflow-auto whitespace-pre-wrap opacity-90">
                              {JSON.stringify(studentAiContext, null, 2)}
                            </pre>
                          </details>
                        </div>
                      ) : (
                        <p className="text-sm opacity-70">컨텍스트가 없습니다.</p>
                      )}
                    </section>
                  </div>
                )}
                </div>
                {studentReportDetail && courseDetail?.courseId != null && selectedStudentReportId != null ? (
                  <div
                    className={`shrink-0 border-t p-3 flex flex-col gap-2 max-h-[40%] min-h-0 ${isDarkMode ? "border-zinc-700 bg-[#0c0c0c]" : "border-gray-200 bg-gray-50"}`}
                  >
                    <p className="text-xs font-semibold opacity-80">리포트 팔로업 질문</p>
                    <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
                      {reportChatMessages.length === 0 ? (
                        <p className={`text-xs ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>
                          학생 리포트에 대해 추가 질문을 입력하세요.
                        </p>
                      ) : (
                        reportChatMessages.map((m) => (
                          <div
                            key={m.id}
                            className={`text-xs rounded-lg px-2 py-1.5 whitespace-pre-wrap ${
                              m.role === "user"
                                ? isDarkMode
                                  ? "bg-zinc-800 ml-4"
                                  : "bg-white border border-gray-200 ml-4"
                                : isDarkMode
                                  ? "bg-zinc-900/80 mr-4 text-gray-200"
                                  : "bg-white border border-gray-200 mr-4"
                            }`}
                          >
                            <span className="font-semibold opacity-70">
                              {m.role === "user" ? "나" : "AI"}
                            </span>
                            <div className="mt-0.5">{m.text || (m.role === "assistant" ? "…" : "")}</div>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <input
                        type="text"
                        value={reportChatInput}
                        onChange={(e) => setReportChatInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            void (async () => {
                              const q = reportChatInput.trim();
                              if (
                                !q ||
                                courseDetail?.courseId == null ||
                                selectedStudentReportId == null ||
                                reportChatSending
                              )
                                return;
                              const uid =
                                typeof crypto !== "undefined" && "randomUUID" in crypto
                                  ? crypto.randomUUID()
                                  : `u-${Date.now()}`;
                              const aid =
                                typeof crypto !== "undefined" && "randomUUID" in crypto
                                  ? crypto.randomUUID()
                                  : `a-${Date.now()}`;
                              const historyPayload = reportChatMessages.map((m) =>
                                m.role === "user"
                                  ? { role: "user", content: m.text }
                                  : { role: "assistant", content: m.text },
                              );
                              setReportChatInput("");
                              setReportChatMessages((prev) => [
                                ...prev,
                                { id: uid, role: "user", text: q },
                                { id: aid, role: "assistant", text: "" },
                              ]);
                              setReportChatSending(true);
                              const ac = new AbortController();
                              reportChatAbortRef.current = ac;
                              try {
                                const finalText = await studentReportApi.streamStudentReportChat(
                                  courseDetail.courseId,
                                  selectedStudentReportId,
                                  {
                                    question: q,
                                    messages:
                                      historyPayload.length > 0 ? historyPayload : undefined,
                                  },
                                  {
                                    signal: ac.signal,
                                    onDelta: (chunk) => {
                                      setReportChatMessages((prev) =>
                                        prev.map((row) =>
                                          row.id === aid ? { ...row, text: row.text + chunk } : row,
                                        ),
                                      );
                                    },
                                  },
                                );
                                setReportChatMessages((prev) =>
                                  prev.map((row) =>
                                    row.id === aid
                                      ? { ...row, text: finalText.trim() ? finalText : row.text }
                                      : row,
                                  ),
                                );
                              } catch (err) {
                                const msg =
                                  err instanceof Error ? err.message : "챗봇 응답을 받지 못했습니다.";
                                setReportChatMessages((prev) =>
                                  prev.map((row) =>
                                    row.id === aid ? { ...row, text: `오류: ${msg}` } : row,
                                  ),
                                );
                              } finally {
                                setReportChatSending(false);
                                reportChatAbortRef.current = null;
                              }
                            })();
                          }
                        }}
                        placeholder="질문 입력 후 Enter"
                        disabled={reportChatSending}
                        className={`flex-1 min-w-0 px-2 py-1.5 text-xs rounded-lg border ${
                          isDarkMode
                            ? "bg-zinc-800 border-zinc-600 text-white"
                            : "bg-white border-gray-300 text-gray-900"
                        } disabled:opacity-50`}
                      />
                      <button
                        type="button"
                        disabled={reportChatSending || !reportChatInput.trim()}
                        onClick={() => {
                          void (async () => {
                            const q = reportChatInput.trim();
                            if (
                              !q ||
                              courseDetail?.courseId == null ||
                              selectedStudentReportId == null ||
                              reportChatSending
                            )
                              return;
                            const uid =
                              typeof crypto !== "undefined" && "randomUUID" in crypto
                                ? crypto.randomUUID()
                                : `u-${Date.now()}`;
                            const aid =
                              typeof crypto !== "undefined" && "randomUUID" in crypto
                                ? crypto.randomUUID()
                                : `a-${Date.now()}`;
                            const historyPayload = reportChatMessages.map((m) =>
                              m.role === "user"
                                ? { role: "user", content: m.text }
                                : { role: "assistant", content: m.text },
                            );
                            setReportChatInput("");
                            setReportChatMessages((prev) => [
                              ...prev,
                              { id: uid, role: "user", text: q },
                              { id: aid, role: "assistant", text: "" },
                            ]);
                            setReportChatSending(true);
                            const ac = new AbortController();
                            reportChatAbortRef.current = ac;
                            try {
                              const finalText = await studentReportApi.streamStudentReportChat(
                                courseDetail.courseId,
                                selectedStudentReportId,
                                {
                                  question: q,
                                  messages:
                                    historyPayload.length > 0 ? historyPayload : undefined,
                                },
                                {
                                  signal: ac.signal,
                                  onDelta: (chunk) => {
                                    setReportChatMessages((prev) =>
                                      prev.map((row) =>
                                        row.id === aid ? { ...row, text: row.text + chunk } : row,
                                      ),
                                    );
                                  },
                                },
                              );
                              setReportChatMessages((prev) =>
                                prev.map((row) =>
                                  row.id === aid
                                    ? { ...row, text: finalText.trim() ? finalText : row.text }
                                    : row,
                                ),
                              );
                            } catch (err) {
                              const msg =
                                err instanceof Error ? err.message : "챗봇 응답을 받지 못했습니다.";
                              setReportChatMessages((prev) =>
                                prev.map((row) =>
                                  row.id === aid ? { ...row, text: `오류: ${msg}` } : row,
                                ),
                              );
                            } finally {
                              setReportChatSending(false);
                              reportChatAbortRef.current = null;
                            }
                          })();
                        }}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#ff824d] text-white disabled:opacity-50 shrink-0"
                      >
                        전송
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default MainContent;
