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
  tasksApi,
  examGenerationApi,
  courseContentsApi,
  getAuthToken,
  API_BASE_URL,
  type Course,
  type CourseDetail,
  type LectureResponseDto,
  type AssessmentSimpleDto,
  type ExamSessionDetailResponse,
  type ExamUserProfile,
  type CourseContentsResponse,
  type CourseContentsLectureExamSession,
  readCourseExamSessionResourceIds,
} from "../../services/api";
import RightSidebar from "./RightSidebar";
import SettingsPage from "../pages/SettingsPage";
import ReportPage from "../pages/ReportPage";
import PdfViewer from "../common/PdfViewer";
import { CloseIcon, EditIcon, TrashIcon } from "../common/Icons";

type ViewMode = "course-list" | "course-detail";
// 메인 메뉴는 강의/설정/신고 사용
type MenuItem = "lectures" | "settings" | "report";

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
    if (nameTrim && mat.title === nameTrim) return mat.materialId;
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
  return `flex w-full min-h-[min(320px,45dvh)] flex-col rounded-xl border p-5 text-left transition-colors ${
    isDarkMode
      ? "border-zinc-700 bg-zinc-900/70"
      : "border-gray-200 bg-gray-50"
  }`;
}

function examModalFlashCardShellClass(isDarkMode: boolean): string {
  return `flex w-full min-h-[min(240px,36dvh)] flex-col rounded-xl border p-4 text-left transition-colors ${
    isDarkMode
      ? "border-zinc-700 bg-zinc-900/70"
      : "border-gray-200 bg-gray-50"
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
  courses: Course[];
  isCoursesLoading: boolean;
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
}

const MainContent: React.FC<MainContentProps> = ({
  viewMode,
  courses,
  isCoursesLoading,
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
  const [isJoining, setIsJoining] = React.useState(false);
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

  const activeExamResourceFilter = React.useMemo(
    () =>
      buildActiveExamResourceFilter(
        previewMaterialId,
        previewLinkedGenerationSessionId,
      ),
    [previewMaterialId, previewLinkedGenerationSessionId],
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
  const [rightSidebarWidth, setRightSidebarWidth] = React.useState(400);

  // 시험 세션 상세 보기 모달 상태
  const [examDetailSessionId, setExamDetailSessionId] = React.useState<
    string | null
  >(null);
  /** X로 닫은 직후 URL 쿼리가 한박자 남았을 때 딥링크 복구가 시험을 다시 열지 않도록 */
  const suppressedExamSessionForUrlRestoreRef = React.useRef<string | null>(
    null,
  );
  const previewBeforeExamRef = React.useRef<ResourcePreviewSnapshot | null>(
    null,
  );
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
  const [bulkEditMode, setBulkEditMode] = React.useState(false);
  const [bulkSelectedIds, setBulkSelectedIds] = React.useState<
    Record<string, boolean>
  >({});
  const [bulkSelectedWeekNumbers, setBulkSelectedWeekNumbers] = React.useState<
    Record<number, boolean>
  >({});
  /** 강의실 목록에서 수정/삭제 모드 (버튼 1개로 토글) */
  const [courseListEditMode, setCourseListEditMode] = React.useState(false);
  const [bulkSelectedCourseIds, setBulkSelectedCourseIds] = React.useState<
    Record<number, boolean>
  >({});
  const [courseListSortOrder, setCourseListSortOrder] = React.useState<
    "recent" | "name"
  >("recent");
  const [courseContentsLoaded, setCourseContentsLoaded] = React.useState(false);

  const patchResourceInUrl = React.useCallback(
    (opts: { material?: number | null; gen?: number | null }) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
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
    [setSearchParams],
  );

  const clearResourceParamsInUrl = React.useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("material");
        next.delete("gen");
        next.delete("exam");
        return next;
      },
      { replace: true },
    );
  }, [setSearchParams]);

  const sortedCourses = React.useMemo(() => {
    const list = [...courses];
    if (courseListSortOrder === "recent")
      list.sort((a, b) => b.courseId - a.courseId);
    if (courseListSortOrder === "name")
      list.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    return list;
  }, [courses, courseListSortOrder]);
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
    materialApi
      .getMaterialFile(id)
      .then(async (blob) => {
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
          setPreviewMarkdownContent(text);
          setPreviewLoadError(false);
          setPreviewErrorMessage(null);
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
      const baseForParse = API_BASE_URL || "https://uouaitutor.duckdns.org";
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

  const sortedItems = React.useMemo(() => {
    const lectureId = selectedLectureId ?? 0;
    const materials: CenterItem[] =
      (selectedLectureId ? localMaterials[selectedLectureId] : []) ?? [];
    const fromAssessments: CenterItem[] = assessments.map((a) => ({
      id: `assessment-${a.assessmentId}`,
      type: "assessment" as const,
      title: a.title,
      meta: "평가",
      createdAt: a.dueDate || "",
      assessmentId: a.assessmentId,
    }));
    const merged = [...materials, ...fromAssessments];
    merged.sort((a, b) => a.title.localeCompare(b.title));
    return merged;
  }, [selectedLectureId, localMaterials, assessments]);

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

  React.useEffect(() => {
    // 강의 변경 또는 모드 해제 시 선택 상태 초기화
    if (!bulkEditMode) {
      setBulkSelectedIds({});
    }
  }, [bulkEditMode, selectedLectureId]);

  const handleToggleBulkSelect = (itemId: string) => {
    if (!bulkEditMode) return;
    setBulkSelectedIds((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const handleToggleWeekSelect = (weekNumber: number) => {
    if (!bulkEditMode) return;
    setBulkSelectedWeekNumbers((prev) => ({
      ...prev,
      [weekNumber]: !prev[weekNumber],
    }));
  };

  const handleBulkDelete = async () => {
    const ids = Object.keys(bulkSelectedIds).filter((id) => bulkSelectedIds[id]);
    const selectedWeeks = Object.keys(bulkSelectedWeekNumbers)
      .map(Number)
      .filter((w) => bulkSelectedWeekNumbers[w]);

    if (ids.length === 0 && selectedWeeks.length === 0) {
      window.alert("삭제할 주차 또는 자료/시험을 선택해주세요.");
      return;
    }

    const parts: string[] = [];
    if (selectedWeeks.length > 0) parts.push(`${selectedWeeks.length}개 주차`);
    if (ids.length > 0) parts.push(`${ids.length}개 자료/시험`);
    if (
      !window.confirm(
        `선택한 ${parts.join(", ")}를 삭제하시겠습니까?\n(삭제된 항목은 복구할 수 없습니다.)`,
      )
    ) {
      return;
    }

    if (selectedWeeks.length > 0 && onDeleteLecture && courseDetail?.lectures) {
      const lecturesToDelete = courseDetail.lectures.filter((l) =>
        selectedWeeks.includes(l.weekNumber),
      );
      for (const lec of lecturesToDelete) {
        try {
          await onDeleteLecture(lec.lectureId, { skipAlert: true });
        } catch (e) {
          window.alert(
            `주차 삭제 실패: ${e instanceof Error ? e.message : String(e)}`,
          );
          return;
        }
      }
      window.alert("선택한 주차가 삭제되었습니다.");
    }

    if (ids.length > 0 && selectedLectureId) {
      const materialList = localMaterials[selectedLectureId] || [];
      const examList = localExams[selectedLectureId] || [];
      const selectedMats = materialList.filter((it) => bulkSelectedIds[it.id]);
      const selectedExams = examList.filter((it) => bulkSelectedIds[it.id]);

      const materialDeletePromises = selectedMats.map((m) =>
        m.materialId != null
          ? materialApi.deleteMaterial(m.materialId)
          : m.generationSessionId != null
            ? materialGenerationApi.deleteSession(m.generationSessionId!)
            : Promise.resolve(),
      );
      const examDeletePromises = selectedExams
        .filter((e) => e.examSessionId != null)
        .map((e) =>
          examGenerationApi.deleteExamSession(Number(e.examSessionId)),
        );
      const settled = await Promise.allSettled([
        ...materialDeletePromises,
        ...examDeletePromises,
      ]);
      const failed = settled.filter((r) => r.status === "rejected");
      if (failed.length > 0) {
        const msg = (failed[0] as PromiseRejectedResult).reason;
        window.alert(
          `일부 삭제 실패: ${msg instanceof Error ? msg.message : String(msg)}`,
        );
        return;
      }

      setLocalMaterials((prev) => {
        const list = prev[selectedLectureId] || [];
        return {
          ...prev,
          [selectedLectureId]: list.filter((it) => !bulkSelectedIds[it.id]),
        };
      });
      setLocalExams((prev) => {
        const list = prev[selectedLectureId] || [];
        return {
          ...prev,
          [selectedLectureId]: list.filter((it) => !bulkSelectedIds[it.id]),
        };
      });
    }

    setBulkSelectedIds({});
    setBulkSelectedWeekNumbers({});
    setBulkEditMode(false);
    if (courseDetail?.courseId) refetchCourseContents(courseDetail.courseId);
  };

  const handleDeleteCenterItem = React.useCallback(
    async (item: CenterItem) => {
      if (!selectedLectureId) return;
      const baseMessage =
        item.type === "material"
          ? "이 자료를 삭제하시겠습니까?\n(서버에서도 삭제됩니다.)"
          : item.type === "exam"
            ? "이 시험 카드를 목록에서 삭제하시겠습니까?\n(필요하면 다시 생성할 수 있습니다.)"
            : "이 항목을 삭제하시겠습니까?";
      if (!window.confirm(baseMessage)) return;

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
    (docUrl: string | null, finalDocument?: string | null) => {
      setMaterialAsyncTaskId(null);
      setMaterialCompletedViaAsync(true);
      setStreamedMaterialContent("");
      setStreamedMaterialProgress("");
      if (finalDocument != null) setMaterialFinalDocument(finalDocument);
      if (docUrl) {
        setMaterialFinalUrl(docUrl);
        setMaterialGenStep(5);
        const title = materialKeyword.trim() || "AI 자료";
        const newItem: CenterItem = {
          id: `material-${materialSessionId!}-${Date.now()}`,
          type: "material",
          title: `${title} (문서)`,
          meta: "자료",
          createdAt: new Date().toISOString(),
          fileUrl: docUrl,
          generationSessionId: materialSessionId!,
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
    ],
  );

  const handleMaterialPhase3To5Async = React.useCallback(async () => {
    if (materialSessionId == null) return;
    setSubmitting(true);
    setMaterialAsyncTaskId(null);
    setStreamedMaterialContent("");
    setStreamedMaterialProgress("작업 시작 중…");

    const pollUntilDone = async (taskId: string) => {
      setMaterialAsyncTaskId(taskId);
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
              const docRes =
                await materialGenerationApi.getDocument(materialSessionId);
              docUrl =
                docRes.documentUrl ?? (docRes as { url?: string }).url ?? null;
            } catch {
              /* ignore */
            }
          }
          applyMaterialCompletion(docUrl);
          return;
        }
        if (s === "FAILED" || s === "ERROR") {
          window.alert(statusRes.message || "Phase 3~5 처리에 실패했습니다.");
          setMaterialAsyncTaskId(null);
          setSubmitting(false);
          return;
        }
        await new Promise((r) => setTimeout(r, pollMs));
      }
      window.alert(
        "처리 시간이 초과되었습니다. 잠시 후 작업 상태를 확인해 주세요.",
      );
      setMaterialAsyncTaskId(null);
      setSubmitting(false);
    };

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
            pollUntilDone(taskId);
          },
        },
      );
    } catch (e) {
      window.alert(
        e instanceof Error ? e.message : "Phase 3~5 실행에 실패했습니다.",
      );
      setSubmitting(false);
    }
  }, [materialSessionId, applyMaterialCompletion]);

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
      previewMaterialId,
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
      const lines = [
        "시험이 백그라운드에서 생성 중입니다.",
        "",
        "완료되면 시험 목록이 자동으로 갱신됩니다. 다른 페이지로 이동하거나 새로고침·로그아웃을 해도 서버에서 계속 생성됩니다.",
      ];
      if (res.taskId) {
        lines.push("", `작업 ID: ${res.taskId}`);
      }
      if (res.status) {
        lines.push(`상태: ${res.status}`);
      }
      if (res.message) {
        lines.push("", res.message);
      }
      window.alert(lines.join("\n"));
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
    previewMaterialId,
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
      const hadResourcePreview =
        previewFileUrl != null || previewMaterialId != null;
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
          next.delete("material");
          next.delete("gen");
          return next;
        },
        { replace: true },
      );
      const t = navTitle != null ? String(navTitle).trim() : "";
      setPreviewFileName(t.length > 0 ? t : "시험");
      setPreviewIsAiGenerationDoc(false);
      setExamDetailSessionId(sessionId);
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
      try {
        const numericId = Number(sessionId);
        if (!Number.isFinite(numericId)) {
          throw new Error("유효하지 않은 시험 세션 ID입니다.");
        }
        const detail = await examGenerationApi.getSession(numericId);
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
    clearResourceParamsInUrl();
  }, [closeExamSessionDetail, clearResourceParamsInUrl]);

  React.useEffect(() => {
    const handleBack = () => exitPreviewAndExamViewer();
    window.addEventListener("back-from-preview", handleBack);
    return () => window.removeEventListener("back-from-preview", handleBack);
  }, [exitPreviewAndExamViewer]);

  /** 강의실 목록/홈으로 나가면 시험·뷰어 state가 남지 않도록 초기화 */
  React.useEffect(() => {
    if (viewMode !== "course-list") return;
    exitPreviewAndExamViewer();
  }, [viewMode, exitPreviewAndExamViewer]);

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
      await Promise.all(
        toDelete.map((e) =>
          examGenerationApi.deleteExamSession(Number(e.examSessionId)),
        ),
      );
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
    setFiveChoiceUserAnswers((prev) => ({
      ...prev,
      [String(problemIndex)]: optionId,
    }));
  };

  const handleOxAnswerChange = (problemIndex: number, choice: OxUserChoice) => {
    if (oxGraded) return;
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
    if (shortAnswerLog) return;
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
      previewMaterialId ??
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
    previewMaterialId,
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
        setPreviewFileUrl(item.fileUrl);
        setPreviewMaterialId(null);
        setPreviewFileName(item.title || null);
        const genDoc =
          item.fileUrl.includes("materials/generation") &&
          item.fileUrl.includes("/document");
        const sid = genDoc ? parseGenerationSessionIdFromMaterialItem(item) : null;
        setPreviewIsAiGenerationDoc(genDoc);
        setPreviewLinkedGenerationSessionId(sid);
        const mid = parseMaterialIdFromMaterialFileUrl(item.fileUrl);
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
      if (item.examSessionId) {
        void openExamSessionDetail(item.examSessionId, item.title ?? null);
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
    if (!courseModalTitle.trim()) {
      window.alert("강의실 제목을 입력해주세요.");
      return;
    }

    try {
      const description = courseModalDescription.trim();
      const course = await courseApi.createCourse({
        title: courseModalTitle.trim(),
        description: description || "설명 없음",
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

  const handleEnrollCurrentCourse = React.useCallback(async () => {
    if (!courseDetail) return;

    const confirmed = window.confirm(
      `'${courseDetail.title}' 강의실에 수강 신청하시겠습니까?`,
    );
    if (!confirmed) {
      return;
    }

    try {
      await courseApi.enrollCourse(courseDetail.courseId);
      window.alert("수강 신청이 완료되었습니다.");
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "수강 신청에 실패했습니다.";
      window.alert(errorMsg);
    }
  }, [courseDetail]);

  const handleOpenJoinModal = () => {
    setJoinCode("");
    setJoinError(null);
    setIsJoinModalOpen(true);
  };

  const handleJoinSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const trimmedCode = joinCode.trim();
    if (!trimmedCode) {
      setJoinError("강의실 ID 또는 수강 코드를 입력해주세요.");
      return;
    }

    setIsJoining(true);
    setJoinError(null);
    const isNumericId = /^\d+$/.test(trimmedCode);

    try {
      if (isNumericId) {
        await courseApi.enrollCourse(Number(trimmedCode));
        window.alert("수강 신청이 완료되었습니다!");
        setIsJoinModalOpen(false);
        setJoinCode("");
        onSelectCourse(Number(trimmedCode));
      } else {
        const course = await courseApi.joinCourse(trimmedCode);
        window.alert("수강 신청이 완료되었습니다!");
        setIsJoinModalOpen(false);
        setJoinCode("");
        onSelectCourse(course.courseId);
      }
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "수강 신청에 실패했습니다.";
      setJoinError(errorMsg);
    } finally {
      setIsJoining(false);
    }
  };

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
    const trimmedTitle = editCourseMetaTitle.trim();
    if (!trimmedTitle) {
      window.alert("강의실 제목은 비워둘 수 없습니다.");
      return;
    }
    const trimmedDescription = editCourseMetaDescription.trim();
    setEditCourseMetaSaving(true);
    try {
      let result: { success: boolean; error?: string };
      if (onUpdateCourse) {
        result = await onUpdateCourse(courseDetail.courseId, {
          title: trimmedTitle,
          description: trimmedDescription,
        });
      } else {
        try {
          await courseApi.updateCourse(courseDetail.courseId, {
            title: trimmedTitle,
            description: trimmedDescription,
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

    if (!courses.length && !isTeacher) {
      return (
        <div className="h-full flex flex-col">
          <div
            className={`flex-1 flex items-center justify-center ${
              isDarkMode ? "text-gray-400" : "text-gray-500"
            }`}
          >
            <div className="text-center space-y-2">
              <p className="text-lg font-medium">등록된 강의실이 없습니다.</p>
              <p className="text-sm">
                담당 선생님이 강의실을 생성하면 여기에 표시됩니다.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-1.5 h-full">
        <div
          className={`flex-1 flex flex-col min-h-0 rounded-xl overflow-hidden ${
            isDarkMode ? "bg-[#141414]" : "bg-white"
          }`}
        >
          <div
            className={`flex items-center justify-between gap-3 shrink-0 pb-3 border-b ${
              isDarkMode ? "border-zinc-700" : "border-gray-200"
            }`}
          >
            <div className="flex-1" />
            {isTeacher && (
              <div className="flex items-center gap-1">
                {!courseListEditMode ? (
                  <button
                    type="button"
                    onClick={() => setCourseListEditMode(true)}
                    className={`flex items-center justify-center w-7 h-7 rounded-full cursor-pointer transition-colors ${
                      isDarkMode
                        ? "text-gray-400 hover:text-gray-200 hover:bg-zinc-700"
                        : "text-gray-500 hover:text-gray-700 hover:bg-zinc-200"
                    }`}
                    aria-label="수정/삭제 모드"
                    title="수정/삭제 모드"
                  >
                    <EditIcon className="w-4 h-4" />
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        const selectedIds = Object.entries(bulkSelectedCourseIds)
                          .filter(([, v]) => v)
                          .map(([k]) => Number(k));
                        if (selectedIds.length !== 1) {
                          window.alert("수정할 강의실을 1개 선택해주세요.");
                          return;
                        }
                        const course = sortedCourses.find((c) => c.courseId === selectedIds[0]);
                        if (course) {
                          onEditCourse?.(course);
                        }
                      }}
                      className={`flex items-center justify-center w-7 h-7 rounded-full cursor-pointer transition-colors ${
                        isDarkMode
                          ? "text-gray-300 hover:bg-zinc-700"
                          : "text-gray-500 hover:bg-zinc-200"
                      }`}
                      aria-label="수정"
                      title="수정"
                    >
                      <EditIcon className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleCourseListBulkDelete}
                      className="flex items-center justify-center w-7 h-7 rounded-full cursor-pointer text-[#ff824d] hover:opacity-80"
                      aria-label="삭제"
                      title="삭제"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCourseListEditMode(false);
                        setBulkSelectedCourseIds({});
                      }}
                      className={`flex items-center justify-center w-7 h-7 rounded-full cursor-pointer transition-colors ${
                        isDarkMode
                          ? "bg-[#FFFFFF] text-[#141414] hover:opacity-90"
                          : "bg-[#141414] text-[#FFFFFF] hover:opacity-90"
                      }`}
                      aria-label="취소"
                      title="취소"
                    >
                      <CloseIcon className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
          <div
            className={`flex-1 overflow-y-auto pt-3 ${isDarkMode ? "text-gray-200" : "text-gray-800"}`}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-6">
              {sortedCourses.map((course) => {
                const checked = !!bulkSelectedCourseIds[course.courseId];
                return (
                  <div
                    key={course.courseId}
                    role="button"
                    tabIndex={courseListEditMode ? -1 : 0}
                    onMouseDown={(e) => {
                      if (courseListEditMode) e.preventDefault();
                    }}
                    onClick={() => {
                      if (courseListEditMode) {
                        handleToggleCourseBulkSelect(course.courseId);
                      } else {
                        handleCourseSelect(course.courseId);
                      }
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        if (courseListEditMode) {
                          handleToggleCourseBulkSelect(course.courseId);
                        } else handleCourseSelect(course.courseId);
                      }
                    }}
                    className={`text-left rounded-2xl flex cursor-pointer focus:outline-none relative overflow-hidden ${
                      isDarkMode
                        ? "border border-zinc-800"
                        : "border border-[#E5E7EB]"
                    } ${
                      courseListEditMode && checked
                        ? isDarkMode
                          ? "shadow-[inset_0_0_0_2px_#FFFFFF]"
                          : "shadow-[inset_0_0_0_2px_#141414]"
                        : ""
                    } ${
                      isDarkMode
                        ? "bg-[#ffffff14]"
                        : "bg-[#4040401f]"
                    }`}
                  >
                    <div className="flex flex-col h-full p-6 flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <h3 className="text-base font-semibold line-clamp-2 flex-1">
                          {course.title}
                        </h3>
                      </div>
                      {course.description && (
                        <p
                          className={`text-xs line-clamp-3 flex-1 ${
                            isDarkMode ? "text-gray-400" : "text-gray-600"
                          }`}
                        >
                          {course.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleCopyInvitationLink = React.useCallback(async () => {
    if (!courseDetail?.invitationCode) {
      return;
    }
    const invitationUrl = `${window.location.origin}/join?code=${courseDetail.invitationCode}`;
    try {
      await navigator.clipboard.writeText(invitationUrl);
      window.alert("초대 링크가 클립보드에 복사되었습니다!");
    } catch (err) {
      const textArea = document.createElement("textarea");
      textArea.value = invitationUrl;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        window.alert("초대 링크가 클립보드에 복사되었습니다!");
      } catch (e) {
        window.alert(`초대 링크: ${invitationUrl}`);
      }
      document.body.removeChild(textArea);
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
    const currentWeekLabel = selectedLecture
      ? selectedLecture.weekNumber === 0
        ? "OT"
        : `${selectedLecture.weekNumber}주차`
      : null;

    const weekNumbers = Array.from(
      new Set((courseDetail.lectures || []).map((lec) => lec.weekNumber)),
    ).sort((a, b) => {
      if (a === 0) return -1;
      if (b === 0) return 1;
      return a - b;
    });

    // 업로드한 자료 미리보기 (좌: 미리보기 | 우: 채팅) — fileUrl 또는 materialId로 표시
    if (previewFileUrl || previewMaterialId != null || examDetailSessionId) {
      return (
        <div className="flex flex-col h-full min-w-0 overflow-hidden">
          <div className="flex-1 flex min-h-0 min-w-0 overflow-hidden">
            {/* 좌: 미리보기 */}
            <div className="flex-1 min-h-0 min-w-0 bg-gray-100 dark:bg-[#141414] flex flex-col overflow-hidden">
              {examDetailSessionId ? (
                <div className={`flex-1 min-h-0 min-w-0 flex flex-col ${isDarkMode ? "bg-[#141414] text-gray-100" : "bg-white text-gray-900"}`}>
                  <div
                    className="shrink-0 h-10 min-h-10 max-h-10 flex items-center justify-between px-3 border-b box-border"
                    style={{
                      backgroundColor: isDarkMode ? "#141414" : "#FFFFFF",
                      color: isDarkMode ? "#FFFFFF" : "#141414",
                      borderColor: isDarkMode ? "#404040" : "#e5e7eb",
                    }}
                  >
                    <div className="min-w-0 flex items-center">
                      <h2 className="text-sm font-semibold leading-none truncate">
                        {(() => {
                          const type = String(examDetail?.examType ?? "").toUpperCase();
                          if (type === "FLASH_CARD") return "플래시카드";
                          if (type === "OX_PROBLEM") return "OX 문제";
                          if (type === "FIVE_CHOICE") return "객관식";
                          if (type === "SHORT_ANSWER") return "주관식";
                          if (type === "DEBATE") return "토론형";
                          return examDetail?.examType || "시험";
                        })()}
                      </h2>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 min-w-0">
                      <p className="text-xs opacity-80 leading-none truncate max-w-[min(220px,40vw)]">
                        세션 ID: {examDetailSessionId}
                        {examDetail?.examType && ` · 유형: ${examDetail.examType}`}
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
                        className={`p-1 rounded cursor-pointer shrink-0 ${isDarkMode ? "hover:bg-zinc-800" : "hover:bg-gray-100"}`}
                        aria-label="시험 보기 닫기"
                        title="닫기"
                      >
                        ✕
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
                        {examDetail.flashCards?.length ? (
                          <section className="min-h-[calc(100vh-280px)] flex flex-col">
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
                                      className={`w-full h-full min-h-[320px] rounded-xl border p-5 text-left transition-all ${
                                        isDarkMode
                                          ? "border-zinc-700 bg-zinc-900/70 hover:bg-zinc-800"
                                          : "border-gray-200 bg-gray-50 hover:bg-gray-100"
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
                                          <p className="text-[10px] opacity-70 mb-1">
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
                            <section className="flex min-h-[calc(100vh-280px)] w-full flex-col">
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
                                              name={`ox-problem-inline-${idx}`}
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
                                          <div className="mt-4 space-y-1 border-t border-dashed border-gray-300 pt-3 dark:border-zinc-600">
                                            <p className="text-[11px]">
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
                                            <p className="text-[11px] opacity-90">
                                              <span className="font-semibold">
                                                정답:
                                              </span>{" "}
                                              {normalizeExamOxCorrectAnswer(
                                                q.correctAnswer,
                                              ) ?? q.correctAnswer}
                                            </p>
                                            {q.explanation ? (
                                              <p className="text-[11px] opacity-80 whitespace-pre-line">
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
                                    <>
                                      <button
                                        type="button"
                                        onClick={handleOxGrade}
                                        disabled={
                                          !oxExamStats.allAnswered ||
                                          oxGraded
                                        }
                                        className={`inline-flex items-center justify-center rounded px-3 py-1.5 text-[11px] font-medium cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                                          isDarkMode
                                            ? "bg-emerald-600 text-white"
                                            : "bg-emerald-600 text-white"
                                        }`}
                                      >
                                        채점하기
                                      </button>
                                      {oxGraded ? (
                                        <p
                                          className={`text-[11px] font-semibold ${isDarkMode ? "text-emerald-300" : "text-emerald-700"}`}
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
                                      className={`rounded-lg border p-3 ${isDarkMode ? "border-zinc-700" : "border-gray-200"}`}
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
                                            name={`ox-problem-inline-all-${idx}`}
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
                                          <p className="text-[11px]">
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
                                          <p className="text-[11px] opacity-90">
                                            <span className="font-semibold">
                                              정답:
                                            </span>{" "}
                                            {normalizeExamOxCorrectAnswer(
                                              q.correctAnswer,
                                            ) ?? q.correctAnswer}
                                          </p>
                                          {q.explanation ? (
                                            <p className="text-[11px] opacity-80 whitespace-pre-line">
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
                                    className={`inline-flex items-center justify-center rounded px-3 py-1.5 text-[11px] font-medium cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                                      isDarkMode
                                        ? "bg-emerald-600 text-white"
                                        : "bg-emerald-600 text-white"
                                    }`}
                                  >
                                    채점하기
                                  </button>
                                  {oxGraded ? (
                                    <p
                                      className={`text-[11px] font-semibold ${isDarkMode ? "text-emerald-300" : "text-emerald-700"}`}
                                    >
                                      {oxExamStats.total}문제 중{" "}
                                      {oxExamStats.correctCount}문제 정답
                                    </p>
                                  ) : (
                                    <p className="text-[11px] opacity-70">
                                      모든 문항에 O 또는 X를 선택하면 채점하기를
                                      누를 수 있습니다.
                                    </p>
                                  )}
                                </div>
                              </div>
                            </section>
                          )
                        ) : null}
                        {examDetail.fiveChoiceProblems?.length ? (
                          fiveChoiceExamViewMode === "single" ? (
                            <section className="flex min-h-[calc(100vh-280px)] w-full flex-col">
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
                                            <p className="text-[11px]">
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
                                              <p className="text-[11px] opacity-80 whitespace-pre-line">
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
                                      <button
                                        type="button"
                                        onClick={handleFiveChoiceGrade}
                                        disabled={
                                          !fiveChoiceExamStats?.allAnswered ||
                                          fiveChoiceExamStats?.graded
                                        }
                                        className={`inline-flex items-center justify-center rounded px-3 py-1.5 text-[11px] font-medium cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                                          isDarkMode
                                            ? "bg-emerald-600 text-white"
                                            : "bg-emerald-600 text-white"
                                        }`}
                                      >
                                        선택한 답안 채점하기
                                      </button>
                                      {fiveChoiceExamStats?.graded ? (
                                        <p
                                          className={`text-[11px] font-semibold ${isDarkMode ? "text-emerald-300" : "text-emerald-700"}`}
                                        >
                                          {fiveChoiceExamStats.total}문제 중{" "}
                                          {
                                            fiveChoiceExamStats.correctCount
                                          }
                                          문제 정답
                                        </p>
                                      ) : (
                                        <p className="text-[11px] opacity-70">
                                          모든 문항에 답을 선택하면 채점하기를
                                          누를 수 있습니다.
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
                              <ol className="divide-y divide-gray-200 text-xs list-decimal list-inside dark:divide-zinc-600">
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
                                                    name={`five-choice-inline-${idx}`}
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
                                                  <span className="flex min-w-0 flex-1 items-start gap-1.5 text-[11px]">
                                                    <span className="w-4 shrink-0 text-right font-semibold tabular-nums">
                                                      {opt.id}.
                                                    </span>
                                                    <span className="min-w-0">
                                                      {opt.content}
                                                    </span>
                                                    {mcGraded &&
                                                    opt.isCorrect ? (
                                                      <span className="ml-auto shrink-0 text-[10px] font-semibold text-emerald-500">
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
                                            <p className="text-[11px]">
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
                                              <p className="text-[11px] opacity-80 whitespace-pre-line">
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
                                  <button
                                    type="button"
                                    onClick={handleFiveChoiceGrade}
                                    disabled={
                                      !fiveChoiceExamStats?.allAnswered ||
                                      fiveChoiceExamStats?.graded
                                    }
                                    className={`inline-flex items-center justify-center rounded px-3 py-1.5 text-[11px] font-medium cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                                      isDarkMode
                                        ? "bg-emerald-600 text-white"
                                        : "bg-emerald-600 text-white"
                                    }`}
                                  >
                                    선택한 답안 채점하기
                                  </button>
                                  {fiveChoiceExamStats?.graded ? (
                                    <p
                                      className={`text-[11px] font-semibold ${isDarkMode ? "text-emerald-300" : "text-emerald-700"}`}
                                    >
                                      {fiveChoiceExamStats.total}문제 중{" "}
                                      {fiveChoiceExamStats.correctCount}문제
                                      정답
                                    </p>
                                  ) : (
                                    <p className="text-[11px] opacity-70">
                                      모든 문항에 답을 선택하면 채점하기를 누를
                                      수 있습니다.
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
                                    className={`rounded-lg border p-2 ${isDarkMode ? "border-zinc-700" : "border-gray-200"}`}
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
                                        className={`text-[11px] underline cursor-pointer ${isDarkMode ? "text-sky-300" : "text-sky-700"}`}
                                      >
                                        {kwOpen
                                          ? "키워드와 출제의도 접기"
                                          : "키워드와 출제의도 보기"}
                                      </button>
                                      {kwOpen ? (
                                        <div
                                          className={`mt-1.5 rounded border p-2 space-y-1 text-[11px] ${
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
                                      readOnly={saGraded}
                                      className={`w-full rounded border px-2 py-1 text-xs resize-y min-h-[60px] ${
                                        saGraded ? "opacity-90" : ""
                                      } ${
                                        isDarkMode
                                          ? "bg-zinc-900 border-zinc-700 text-gray-100"
                                          : "bg-white border-gray-300 text-gray-900"
                                      }`}
                                      placeholder="이 문항에 대한 자신의 답안을 작성해 보세요."
                                    />
                                    {saGraded && saItem && (
                                      <div className="mt-2 space-y-1.5 border-t border-dashed border-gray-300 pt-2 text-[11px] dark:border-zinc-600">
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
                              <button
                                type="button"
                                onClick={handleShortAnswerGrade}
                                disabled={
                                  !shortAnswerExamStats?.allAnswered ||
                                  shortAnswerExamStats?.graded ||
                                  shortAnswerGrading
                                }
                                className={`inline-flex items-center px-3 py-1.5 rounded text-[11px] font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                                  isDarkMode
                                    ? "bg-emerald-600 text-white"
                                    : "bg-emerald-600 text-white"
                                }`}
                              >
                                {shortAnswerGrading
                                  ? "채점 중…"
                                  : "작성한 단답/서술형 채점하기"}
                              </button>
                              {shortAnswerExamStats?.graded &&
                              shortAnswerExamStats.totalScoreOutOf10 != null ? (
                                <p
                                  className={`text-[11px] font-semibold ${isDarkMode ? "text-emerald-300" : "text-emerald-700"}`}
                                >
                                  총점{" "}
                                  {shortAnswerExamStats.totalScoreOutOf10.toFixed(
                                    1,
                                  )}{" "}
                                  / 10
                                </p>
                              ) : (
                                <p className="text-[11px] opacity-70">
                                  모든 문항에 답안을 작성한 뒤 채점하기를 누를
                                  수 있습니다.
                                </p>
                              )}
                            </div>
                            {shortAnswerGradeError ? (
                              <p
                                className={`mt-1 text-[11px] ${isDarkMode ? "text-red-400" : "text-red-600"}`}
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
                                <li key={idx} className={`rounded-lg border p-2 ${isDarkMode ? "border-zinc-700" : "border-gray-200"}`}>
                                  <p className="font-medium mb-1">{d.topic}</p>
                                  {d.context && <p className="text-[11px] opacity-80 whitespace-pre-line">맥락: {d.context}</p>}
                                  <p className="mt-1 text-[11px]"><span className="font-semibold">찬성 입장:</span> {d.proSideStand}</p>
                                  <p className="mt-1 text-[11px]"><span className="font-semibold">반대 입장:</span> {d.conSideStand}</p>
                                  {d.evaluationCriteria?.length > 0 && (
                                    <p className="mt-1 text-[11px] opacity-80">평가 기준: {d.evaluationCriteria.join(", ")}</p>
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
                      className="box-border flex h-10 max-h-10 min-h-10 shrink-0 items-center border-b px-3"
                      style={{
                        backgroundColor: isDarkMode ? "#141414" : "#FFFFFF",
                        color: isDarkMode ? "#FFFFFF" : "#141414",
                        borderColor: isDarkMode ? "#404040" : "#e5e7eb",
                      }}
                    >
                      <div className="flex min-w-0 flex-1 items-center">
                        <h2 className="truncate text-sm font-semibold leading-none">
                          AI 생성 자료 (문서)
                        </h2>
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
                        ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                        : "bg-emerald-600 hover:bg-emerald-700 text-white"
                    }`}
                  >
                    다시 시도
                  </button>
                </div>
              ) : previewMarkdownContent != null ? (
                <div
                  className={`flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden ${
                    isDarkMode ? "text-gray-200" : "bg-[#FFFFFF]"
                  }`}
                >
                  <div
                    ref={previewMarkdownScrollRef}
                    className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto [scrollbar-gutter:stable]"
                  >
                    <div className="relative flex min-h-min w-full flex-col gap-5 px-3 py-5 sm:pr-6 sm:py-6 lg:px-6">
                      <article
                        className={`prose prose-lg prose-neutral relative z-0 max-w-none min-w-0 min-h-min leading-relaxed break-words [&_*]:break-words [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_code]:break-words prose-headings:scroll-mt-24 prose-headings:font-semibold prose-h1:text-balance prose-blockquote:border-l-4 prose-blockquote:border-emerald-600/45 prose-blockquote:bg-zinc-500/[0.06] dark:prose-blockquote:bg-white/[0.04] ${isDarkMode ? "prose-invert" : ""}`}
                      >
                        <MarkdownContent>{previewMarkdownContent}</MarkdownContent>
                      </article>
                    </div>
                  </div>
                </div>
              ) : previewBlobUrl ? (
                <div className="flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden">
                  <PdfViewer
                    fileUrl={previewBlobUrl}
                    title={previewFileName || "자료 미리보기"}
                    className="min-h-[calc(100vh-110px)]"
                    onPageChange={(page) => setPreviewCurrentPdfPage(page)}
                  />
                </div>
              ) : null}
                  </div>
                </div>
              )}
            </div>
            {/* 채팅창 리사이즈 핸들 */}
            <div
              role="separator"
              aria-label="채팅창 너비 조절"
              onMouseDown={handleRightSidebarResizeStart}
              className={`shrink-0 w-0.1 cursor-col-resize flex items-center justify-center group hover:bg-emerald-500/30 transition-colors ${
                isDarkMode ? "bg-zinc-700" : "bg-gray-200"
              }`}
            >
              <div
                className={`w-0.5 h-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${
                  isDarkMode ? "bg-zinc-400" : "bg-gray-500"
                }`}
              />
            </div>
            {/* 우: 채팅(강의 학습) 또는 시험 만들기(프로필 API) — 고정 */}
            <div className="shrink-0 min-h-0 overflow-hidden">
            <RightSidebar
              width={rightSidebarWidth}
              lectureId={selectedLectureId ?? undefined}
              courseId={courseDetail.courseId}
              viewMode="course-detail"
              courseDetail={courseDetail}
              previewCurrentPdfPage={previewCurrentPdfPage}
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
                  : null
              }
            />
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-1.5 h-full">
        {/* 자료 생성 중 표시 (모달 닫은 후 백그라운드 진행 시) */}
        {materialAsyncTaskId && (
          <div
            className={`shrink-0 flex items-center gap-3 px-4 py-2.5 rounded-xl border ${isDarkMode ? "bg-emerald-900/30 border-emerald-700 text-emerald-200" : "bg-emerald-50 border-emerald-200 text-emerald-800"}`}
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
        {/* 상단 컨트롤 영역: N주차 목록 / 삭제 / 정렬 */}
        <div
          className={`flex-1 flex flex-col min-h-0 overflow-hidden ${
            isDarkMode ? "bg-[#141414]" : "bg-white"
          }`}
        >
          <div
            className={`flex items-center justify-between gap-3 shrink-0 pb-2 border-b ${
              isDarkMode ? "border-zinc-700" : "border-gray-200"
            }`}
          >
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pr-2">
              {weekNumbers.map((week) => {
                const label = week === 0 ? "OT" : `${week}주차`;
                const isActive =
                  !bulkEditMode &&
                  selectedLecture &&
                  selectedLecture.weekNumber === week;
                const isWeekSelected = !!bulkSelectedWeekNumbers[week];
                return (
                  <button
                    key={week}
                    type="button"
                    onMouseDown={(e) => {
                      if (bulkEditMode) {
                        e.preventDefault();
                        e.stopPropagation();
                      }
                    }}
                    onClick={(e) => {
                      if (bulkEditMode) {
                        e.preventDefault();
                        e.stopPropagation();
                        handleToggleWeekSelect(week);
                        return;
                      }
                      if (onSelectLecture && courseDetail.lectures) {
                        const target = courseDetail.lectures.find(
                          (lec) => lec.weekNumber === week,
                        );
                        if (target) {
                          onSelectLecture(target.lectureId);
                        }
                      }
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
                      bulkEditMode && isWeekSelected
                        ? isDarkMode
                          ? "shadow-[inset_0_0_0_2px_#FFFFFF] bg-[#ffffff20] text-white"
                          : "shadow-[inset_0_0_0_2px_#141414] bg-[#00000020] text-[#141414]"
                        : isActive
                          ? isDarkMode
                            ? "bg-[#FFFFFF] text-[#141414]"
                            : "bg-[#141414] text-[#FFFFFF]"
                          : isDarkMode
                            ? "bg-[#ffffff14] text-gray-200 hover:bg-[#ffffff20]"
                            : "bg-[#00000014] text-gray-700 hover:bg-[#00000020]"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
              {!weekNumbers.length && (
                <span
                  className={`text-xs ${
                    isDarkMode ? "text-gray-500" : "text-gray-400"
                  }`}
                >
                  등록된 강의가 없습니다.
                </span>
              )}
              {isTeacher && (
                <button
                  type="button"
                  onClick={() => {
                    setAddLectureWeekNumber("");
                    setAddLectureTitle("");
                    setAddLectureModalOpen(true);
                  }}
                  className={`shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium leading-none cursor-pointer transition-colors ${
                    isDarkMode
                      ? "bg-zinc-700 text-gray-300 hover:bg-zinc-600"
                      : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                  }`}
                  title="주차 추가"
                >
                  +
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 ml-auto">
              {lectureResourcesLoading && (
                <span className="text-[11px] opacity-70">불러오는 중...</span>
              )}
              {isTeacher && (
                <div className="flex items-center gap-1">
                  {!bulkEditMode ? (
                    <button
                      type="button"
                      onClick={() => {
                        setBulkEditMode(true);
                        setBulkSelectedIds({});
                        setBulkSelectedWeekNumbers({});
                      }}
                      className={`flex items-center justify-center w-7 h-7 rounded-full cursor-pointer transition-colors ${
                        isDarkMode
                          ? "text-gray-400 hover:text-gray-200 hover:bg-zinc-700"
                          : "text-gray-500 hover:text-gray-700 hover:bg-zinc-200"
                      }`}
                      aria-label="수정/삭제 모드"
                      title="수정/삭제 모드"
                    >
                      <EditIcon className="w-4 h-4" />
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          if (!courseDetail) return;
                          setEditCourseMetaTitle(courseDetail.title ?? "");
                          setEditCourseMetaDescription(
                            courseDetail.description ?? "",
                          );
                          setEditCourseMetaModalOpen(true);
                        }}
                        className={`flex items-center justify-center w-7 h-7 rounded-full cursor-pointer transition-colors ${
                          isDarkMode
                            ? "text-gray-300 hover:bg-zinc-700"
                            : "text-gray-500 hover:bg-zinc-200"
                        }`}
                        aria-label="강의실 정보 수정"
                        title="강의실 이름·설명 수정"
                      >
                        <EditIcon className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={handleBulkDelete}
                        className="flex items-center justify-center w-7 h-7 rounded-full cursor-pointer text-[#ff824d] hover:opacity-80"
                        aria-label="삭제"
                        title="삭제"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setBulkEditMode(false);
                          setBulkSelectedIds({});
                          setBulkSelectedWeekNumbers({});
                        }}
                        className={`flex items-center justify-center w-7 h-7 rounded-full cursor-pointer transition-colors ${
                          isDarkMode
                            ? "bg-[#FFFFFF] text-[#141414] hover:opacity-90"
                            : "bg-[#141414] text-[#FFFFFF] hover:opacity-90"
                        }`}
                        aria-label="취소"
                        title="취소"
                      >
                        <CloseIcon className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 강의 리소스 박스 그리드 영역 */}
          <div
            className={`flex-1 overflow-y-auto pt-3 ${
              isDarkMode ? "text-gray-200" : "text-gray-800"
            }`}
          >
            {assessmentsLoading ? (
              <div className="flex items-center justify-center py-12 text-sm opacity-70">
                목록 불러오는 중...
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-6">
                {sortedItems.map((item) => {
                  const selectable =
                    isTeacher &&
                    (item.type === "material" || item.type === "exam");
                  const checked = !!bulkSelectedIds[item.id];
                  return (
                    <div
                      key={item.id}
                      className={`text-left rounded-2xl flex cursor-pointer focus:outline-none relative overflow-hidden ${
                        isDarkMode
                          ? "border border-zinc-800"
                          : "border border-[#E5E7EB]"
                      } ${
                        bulkEditMode && selectable && checked
                          ? isDarkMode
                            ? "shadow-[inset_0_0_0_2px_#FFFFFF]"
                            : "shadow-[inset_0_0_0_2px_#141414]"
                          : ""
                      } ${
                        isDarkMode
                          ? "bg-[#ffffff14]"
                          : "bg-[#4040401f]"
                      } relative group/card`}
                    >
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          if (bulkEditMode && selectable) e.preventDefault();
                        }}
                        onClick={() => {
                          if (bulkEditMode && selectable) {
                            handleToggleBulkSelect(item.id);
                          } else {
                            handleCardClick(item);
                          }
                        }}
                        className={`w-full h-full text-left flex flex-col p-6 focus:outline-none ${
                          isDarkMode ? "hover:bg-zinc-900/90" : ""
                        }`}
                      >
                        <p className="text-sm font-medium truncate">
                          {item.title}
                        </p>
                        <p
                          className={`text-xs mt-1 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}
                        >
                          {item.meta}
                          {item.type === "material" &&
                            !item.fileUrl &&
                            " · 클릭 시 안내"}
                        </p>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
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
    if (viewMode !== "course-detail" || !courseDetail) {
      return null;
    }

    return (
      <div className="flex items-center gap-2">
        {isStudent && (
          <button
            type="button"
            onClick={handleEnrollCurrentCourse}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer ${
              isDarkMode
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "bg-emerald-600 hover:bg-emerald-700 text-white"
            }`}
          >
            <span>수강 신청</span>
          </button>
        )}
      </div>
    );
  };

  const renderSettingsHeader = () => {
    return null;
  };

  return (
    <>
      <div
        className={`flex-1 flex flex-col min-h-0 min-w-0 overflow-x-hidden transition-colors pl-5 sm:pl-6 lg:pl-8 ${
          selectedMenu === "settings" || selectedMenu === "report" ? "pr-0" : "pr-5 sm:pr-6 lg:pr-8"
        } ${isDarkMode ? "bg-[#141414]" : "bg-white"}`}
      >
        {renderCourseListHeader()}
        {renderCourseDetailHeader()}
        {renderSettingsHeader()}
        <div className="flex-1 min-h-0 min-w-0 overflow-hidden flex flex-col">
          <div
            className={`flex-1 min-h-0 min-w-0 ${(previewFileUrl || previewMaterialId != null || examDetailSessionId) ? "overflow-hidden" : "overflow-y-auto"} ${selectedMenu === "settings" || selectedMenu === "report" ? "pr-5 sm:pr-6 lg:pr-8" : ""}`}
          >
            {selectedMenu === "settings" ? (
              <SettingsPage />
            ) : selectedMenu === "report" ? (
              <ReportPage />
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
                ✕
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
                  } focus:outline-none focus:ring-2 ${isDarkMode ? "focus:ring-zinc-500" : "focus:ring-zinc-500"}`}
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
                  rows={3}
                  className={`w-full px-3 py-2 text-sm rounded border resize-none ${
                    isDarkMode
                      ? "bg-zinc-800 border-zinc-600 text-white placeholder-gray-400"
                      : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                  } focus:outline-none focus:ring-2 ${isDarkMode ? "focus:ring-zinc-500" : "focus:ring-zinc-500"}`}
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
                      : "bg-emerald-200 text-emerald-500 cursor-not-allowed"
                    : isDarkMode
                      ? "bg-emerald-600 hover:bg-zinc-700 text-white cursor-pointer"
                      : "bg-emerald-600 hover:bg-zinc-200 text-white cursor-pointer"
                }`}
              >
                생성하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 강의실 이름·설명 수정 (수정/삭제 모드 연필) */}
      {editCourseMetaModalOpen && courseDetail?.courseId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-course-meta-title"
          onClick={() => !editCourseMetaSaving && setEditCourseMetaModalOpen(false)}
        >
          <div
            className={`w-full max-w-md rounded-xl shadow-xl border ${
              isDarkMode
                ? "bg-zinc-900 border-zinc-700 text-gray-100"
                : "bg-white border-gray-200 text-gray-900"
            }`}
            onClick={(ev) => ev.stopPropagation()}
          >
            <div
              className={`flex items-center justify-between px-5 py-4 border-b ${
                isDarkMode ? "border-zinc-700/50" : "border-gray-200"
              }`}
            >
              <h2
                id="edit-course-meta-title"
                className={`text-lg font-semibold ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}
              >
                강의실 정보 수정
              </h2>
              <button
                type="button"
                onClick={() =>
                  !editCourseMetaSaving && setEditCourseMetaModalOpen(false)
                }
                className={`p-1.5 rounded cursor-pointer ${
                  isDarkMode
                    ? "hover:bg-zinc-700 text-gray-300"
                    : "hover:bg-gray-200 text-gray-500"
                }`}
                aria-label="닫기"
              >
                ✕
              </button>
            </div>
            <form
              onSubmit={handleEditCourseMetaSubmit}
              className="px-5 py-4 space-y-4"
            >
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
                  value={editCourseMetaTitle}
                  onChange={(e) => setEditCourseMetaTitle(e.target.value)}
                  className={`w-full px-3 py-2 text-sm rounded border ${
                    isDarkMode
                      ? "bg-zinc-800 border-zinc-600 text-white placeholder-gray-400"
                      : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                  } focus:outline-none focus:ring-2 ${isDarkMode ? "focus:ring-zinc-500" : "focus:ring-zinc-500"}`}
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
                  value={editCourseMetaDescription}
                  onChange={(e) =>
                    setEditCourseMetaDescription(e.target.value)
                  }
                  rows={3}
                  className={`w-full px-3 py-2 text-sm rounded border resize-none ${
                    isDarkMode
                      ? "bg-zinc-800 border-zinc-600 text-white placeholder-gray-400"
                      : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                  } focus:outline-none focus:ring-2 ${isDarkMode ? "focus:ring-zinc-500" : "focus:ring-zinc-500"}`}
                />
              </div>
              <div
                className={`flex justify-end gap-2 pt-2 border-t ${
                  isDarkMode ? "border-zinc-700/50" : "border-gray-200"
                }`}
              >
                <button
                  type="button"
                  onClick={() =>
                    !editCourseMetaSaving && setEditCourseMetaModalOpen(false)
                  }
                  className={`px-4 py-2 text-sm rounded ${
                    isDarkMode
                      ? "bg-zinc-800 hover:bg-zinc-700 text-gray-200"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  }`}
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={editCourseMetaSaving || !editCourseMetaTitle.trim()}
                  className={`px-4 py-2 text-sm rounded font-medium ${
                    editCourseMetaSaving || !editCourseMetaTitle.trim()
                      ? isDarkMode
                        ? "bg-zinc-800/40 text-gray-400 cursor-not-allowed"
                        : "bg-emerald-200 text-emerald-500 cursor-not-allowed"
                      : isDarkMode
                        ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                        : "bg-emerald-600 hover:bg-emerald-700 text-white"
                  }`}
                >
                  {editCourseMetaSaving ? "저장 중..." : "저장"}
                </button>
              </div>
            </form>
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
                className={`text-lg font-semibold ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}
              >
                주차 추가
              </h2>
              <button
                type="button"
                onClick={() =>
                  !addLectureSubmitting && setAddLectureModalOpen(false)
                }
                className={`p-1.5 rounded cursor-pointer ${
                  isDarkMode
                    ? "hover:bg-zinc-700 text-gray-300"
                    : "hover:bg-gray-200 text-gray-500"
                }`}
                aria-label="닫기"
              >
                ✕
              </button>
            </div>
            <form
              onSubmit={handleAddLectureSubmit}
              className="px-5 py-4 space-y-4"
            >
              <div>
                <label
                  className={`block text-sm font-medium mb-1 ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}
                >
                  주차 번호 (숫자) *
                </label>
                <input
                  type="number"
                  min={0}
                  value={addLectureWeekNumber}
                  onChange={(e) => setAddLectureWeekNumber(e.target.value)}
                  placeholder="예: 1"
                  className={`w-full px-3 py-2 text-sm rounded border ${
                    isDarkMode
                      ? "bg-zinc-800 border-zinc-600 text-white placeholder-gray-400"
                      : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                  } focus:outline-none focus:ring-2 ${isDarkMode ? "focus:ring-zinc-500" : "focus:ring-zinc-500"}`}
                  autoFocus
                />
              </div>
              <div>
                <label
                  className={`block text-sm font-medium mb-1 ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}
                >
                  제목 *
                </label>
                <input
                  type="text"
                  value={addLectureTitle}
                  onChange={(e) => setAddLectureTitle(e.target.value)}
                  placeholder="예: 1주차 - 오리엔테이션"
                  className={`w-full px-3 py-2 text-sm rounded border ${
                    isDarkMode
                      ? "bg-zinc-800 border-zinc-600 text-white placeholder-gray-400"
                      : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                  } focus:outline-none focus:ring-2 ${isDarkMode ? "focus:ring-zinc-500" : "focus:ring-zinc-500"}`}
                />
              </div>
              <div
                className={`flex justify-end gap-2 pt-2 border-t ${isDarkMode ? "border-zinc-700/50" : "border-gray-200"}`}
              >
                <button
                  type="button"
                  onClick={() =>
                    !addLectureSubmitting && setAddLectureModalOpen(false)
                  }
                  className={`px-4 py-2 text-sm rounded ${
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
                  className={`px-4 py-2 text-sm rounded font-medium ${
                    addLectureSubmitting ||
                    !addLectureWeekNumber.trim() ||
                    !addLectureTitle.trim()
                      ? isDarkMode
                        ? "bg-zinc-800/40 text-gray-400 cursor-not-allowed"
                        : "bg-emerald-200 text-emerald-500 cursor-not-allowed"
                      : isDarkMode
                        ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                        : "bg-emerald-600 hover:bg-emerald-700 text-white"
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
                }}
                className={`p-1.5 rounded cursor-pointer ${
                  isDarkMode
                    ? "hover:bg-zinc-700 text-gray-300"
                    : "hover:bg-zinc-200 text-gray-500"
                }`}
                aria-label="닫기"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleJoinSubmit} className="px-5 py-4 space-y-4">
              <div>
                <label
                  className={`block text-sm font-medium mb-1 ${
                    isDarkMode ? "text-gray-200" : "text-gray-700"
                  }`}
                >
                  강의실 ID / 수강 코드
                </label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="예: 5 또는 ABCD-1234"
                  className={`w-full px-3 py-2 text-sm rounded border ${
                    isDarkMode
                      ? "bg-zinc-800 border-zinc-600 text-white placeholder-gray-400"
                      : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                  } focus:outline-none focus:ring-2 ${
                    isDarkMode
                      ? "focus:ring-zinc-500"
                      : "focus:ring-zinc-500"
                  }`}
                  disabled={isJoining}
                />
                <p
                  className={`mt-2 text-xs ${
                    isDarkMode ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  선생님이 알려준 강의실 ID(숫자) 또는 수강 코드를 입력하세요.
                </p>
              </div>

              {joinError && (
                <div
                  className={`p-3 rounded-lg text-sm ${
                    isDarkMode
                      ? "bg-red-900/30 text-red-300"
                      : "bg-red-50 text-red-600"
                  }`}
                >
                  {joinError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (isJoining) return;
                    setIsJoinModalOpen(false);
                    setJoinCode("");
                    setJoinError(null);
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
                <button
                  type="submit"
                  className={`px-4 py-2 text-sm rounded font-medium transition-colors ${
                    isJoining
                      ? "bg-emerald-400 text-white cursor-not-allowed"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                  }`}
                  disabled={isJoining}
                >
                  {isJoining ? "신청 중..." : "수강 신청"}
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
            className={`w-full max-w-md rounded-xl shadow-xl border ${isDarkMode ? "bg-zinc-900 border-zinc-700" : "bg-white border-gray-200"}`}
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
                className="p-1.5 rounded hover:bg-black/10"
                aria-label="닫기"
              >
                ✕
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
                        ? "border-emerald-500 bg-emerald-900/20"
                        : "border-emerald-500 bg-emerald-50"
                      : isDarkMode
                        ? "border-zinc-600 bg-zinc-800/50 hover:border-zinc-500 hover:bg-zinc-800 text-gray-300"
                        : "border-gray-300 bg-gray-50 hover:border-emerald-400 hover:bg-emerald-50/50 text-gray-600"
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
                    className={`text-sm font-medium px-4 py-2 rounded-lg ${isDarkMode ? "bg-zinc-700 text-white" : "bg-emerald-600 text-white"}`}
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
                className="px-4 py-2 text-sm rounded font-medium bg-emerald-600 text-white disabled:opacity-50 cursor-pointer"
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
            className={`w-full max-w-lg rounded-xl shadow-xl border ${isDarkMode ? "bg-zinc-900 border-zinc-700" : "bg-white border-gray-200"}`}
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
                className="p-1.5 rounded hover:bg-black/10"
              >
                ✕
              </button>
            </div>
            <div className="px-5 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
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
                            className={`font-semibold mb-1.5 ${isDarkMode ? "text-emerald-400" : "text-emerald-700"}`}
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
                            className={`font-semibold mb-1.5 ${isDarkMode ? "text-emerald-400" : "text-emerald-700"}`}
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
                              className={`font-semibold mb-2 ${isDarkMode ? "text-emerald-400" : "text-emerald-700"}`}
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
                        className="px-4 py-2 text-sm rounded font-medium bg-emerald-600 text-white disabled:opacity-50"
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
                          className="px-4 py-2 text-sm rounded font-medium bg-emerald-600 text-white disabled:opacity-50"
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
                          className={`text-xs font-medium ${isDarkMode ? "text-emerald-400" : "text-emerald-700"}`}
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
                        아래 [닫기]를 누르면 모달만 닫히고, 작업은
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
                        className="px-4 py-2 text-sm rounded font-medium bg-emerald-600 text-white disabled:opacity-50"
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
                    className="px-4 py-2 text-sm rounded font-medium bg-emerald-600 text-white disabled:opacity-50"
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
                            className={`px-4 py-2 text-sm rounded ${isDarkMode ? "bg-zinc-700 text-gray-200" : "bg-gray-200 text-gray-800"}`}
                          >
                            닫기
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
                            className="px-4 py-2 text-sm rounded font-medium bg-emerald-600 text-white disabled:opacity-50"
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
                            className="text-emerald-600 underline"
                          >
                            문서 보기/다운로드
                          </a>
                        </p>
                      )}
                      <div className="flex gap-2 pt-2">
                        <button
                          type="button"
                          onClick={handleMaterialGenAddToList}
                          className="px-4 py-2 text-sm rounded font-medium bg-emerald-600 text-white"
                        >
                          목록에 추가하고 닫기
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            resetMaterialGenModal();
                            setMaterialGenModalOpen(false);
                          }}
                          className={`px-4 py-2 text-sm rounded ${isDarkMode ? "bg-zinc-700 text-gray-200" : "bg-gray-200 text-gray-800"}`}
                        >
                          닫기
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
                  className="px-4 py-2 text-sm rounded font-medium bg-emerald-600 text-white disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? "생성 중..." : "기획안 생성"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 시험 세션 상세 모달 */}
      {examDetailSessionId && examDetail && (
        <div
          className="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
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
                                  <span className="text-[10px] font-semibold opacity-70">
                                    #{id}
                                  </span>
                                  {card.categoryTag && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-600/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30">
                                      {card.categoryTag}
                                    </span>
                                  )}
                                </div>
                                <div className="mt-1 min-h-[60px]">
                                  <p className="text-[11px] whitespace-pre-line">
                                    {flipped
                                      ? card.backContent
                                      : card.frontContent}
                                  </p>
                                </div>
                                <div className="mt-2 flex items-center justify-between text-[10px] opacity-70">
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
                                    <p className="text-[11px]">
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
                                    <p className="text-[11px] opacity-90">
                                      <span className="font-semibold">
                                        정답:
                                      </span>{" "}
                                      {normalizeExamOxCorrectAnswer(
                                        q.correctAnswer,
                                      ) ?? q.correctAnswer}
                                    </p>
                                    {q.explanation ? (
                                      <p className="text-[11px] opacity-80 whitespace-pre-line">
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
                                className={`inline-flex items-center justify-center rounded px-3 py-1.5 text-[11px] font-medium cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                                  isDarkMode
                                    ? "bg-emerald-600 text-white"
                                    : "bg-emerald-600 text-white"
                                }`}
                              >
                                채점하기
                              </button>
                              {oxGraded ? (
                                <p
                                  className={`text-[11px] font-semibold ${isDarkMode ? "text-emerald-300" : "text-emerald-700"}`}
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
                                    <p className="text-[11px]">
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
                                    <p className="text-[11px] opacity-90">
                                      <span className="font-semibold">
                                        정답:
                                      </span>{" "}
                                      {normalizeExamOxCorrectAnswer(
                                        q.correctAnswer,
                                      ) ?? q.correctAnswer}
                                    </p>
                                    {q.explanation ? (
                                      <p className="text-[11px] opacity-80 whitespace-pre-line">
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
                              className={`inline-flex items-center justify-center rounded px-3 py-1.5 text-[11px] font-medium cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                                isDarkMode
                                  ? "bg-emerald-600 text-white"
                                  : "bg-emerald-600 text-white"
                              }`}
                            >
                              채점하기
                            </button>
                            {oxGraded ? (
                              <p
                                className={`text-[11px] font-semibold ${isDarkMode ? "text-emerald-300" : "text-emerald-700"}`}
                              >
                                {oxExamStats.total}문제 중{" "}
                                {oxExamStats.correctCount}문제 정답
                              </p>
                            ) : (
                              <p className="text-[11px] opacity-70">
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
                                    <p className="text-[11px]">
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
                                      <p className="text-[11px] opacity-80 whitespace-pre-line">
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
                                className={`inline-flex items-center justify-center rounded px-3 py-1.5 text-[11px] font-medium cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                                  isDarkMode
                                    ? "bg-emerald-600 text-white"
                                    : "bg-emerald-600 text-white"
                                }`}
                              >
                                선택한 답안 채점하기
                              </button>
                              {fiveChoiceExamStats?.graded ? (
                                <p
                                  className={`text-[11px] font-semibold ${isDarkMode ? "text-emerald-300" : "text-emerald-700"}`}
                                >
                                  {fiveChoiceExamStats.total}문제 중{" "}
                                  {fiveChoiceExamStats.correctCount}문제 정답
                                </p>
                              ) : (
                                <p className="text-[11px] opacity-70">
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
                                          <span className="flex min-w-0 flex-1 items-start gap-1.5 text-[11px]">
                                            <span className="w-4 shrink-0 text-right font-semibold tabular-nums">
                                              {opt.id}.
                                            </span>
                                            <span className="min-w-0">
                                              {opt.content}
                                            </span>
                                            {mcGraded &&
                                            opt.isCorrect ? (
                                              <span className="ml-auto shrink-0 text-[10px] font-semibold text-emerald-500">
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
                                    <p className="text-[11px]">
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
                                      <p className="text-[11px] opacity-80 whitespace-pre-line">
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
                              className={`inline-flex items-center justify-center rounded px-3 py-1.5 text-[11px] font-medium cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                                isDarkMode
                                  ? "bg-emerald-600 text-white"
                                  : "bg-emerald-600 text-white"
                              }`}
                            >
                              선택한 답안 채점하기
                            </button>
                            {fiveChoiceExamStats?.graded ? (
                              <p
                                className={`text-[11px] font-semibold ${isDarkMode ? "text-emerald-300" : "text-emerald-700"}`}
                              >
                                {fiveChoiceExamStats.total}문제 중{" "}
                                {fiveChoiceExamStats.correctCount}문제 정답
                              </p>
                            ) : (
                              <p className="text-[11px] opacity-70">
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
                                      className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] ${
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
                                    className={`text-[11px] underline cursor-pointer ${isDarkMode ? "text-sky-300" : "text-sky-700"}`}
                                  >
                                    {kwOpen
                                      ? "키워드와 출제의도 접기"
                                      : "키워드와 출제의도 보기"}
                                  </button>
                                  {kwOpen ? (
                                    <div
                                      className={`mt-1.5 rounded border p-2 space-y-1 text-[11px] ${
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
                                  <label className="mb-1 block text-[11px] font-semibold">
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
                                    className={`min-h-[60px] w-full resize-y rounded border px-2 py-1 text-xs ${
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
                                  <div className="mt-2 space-y-1.5 border-t border-dashed border-gray-300 pt-2 text-[11px] dark:border-zinc-600">
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
                              className={`inline-flex items-center rounded px-3 py-1.5 text-[11px] font-medium cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                                isDarkMode
                                  ? "bg-emerald-600 text-white"
                                  : "bg-emerald-600 text-white"
                              }`}
                            >
                              {shortAnswerGrading
                                ? "채점 중…"
                                : "작성한 단답/서술형 채점하기"}
                            </button>
                            {shortAnswerExamStats?.graded &&
                            shortAnswerExamStats.totalScoreOutOf10 != null ? (
                              <p
                                className={`text-[11px] font-semibold ${isDarkMode ? "text-emerald-300" : "text-emerald-700"}`}
                              >
                                총점{" "}
                                {shortAnswerExamStats.totalScoreOutOf10.toFixed(
                                  1,
                                )}{" "}
                                / 10
                              </p>
                            ) : (
                              <p className="text-[11px] opacity-70">
                                모든 문항에 답안을 작성한 뒤 채점하기를 누르면
                                문항별로 채점 결과가 표시됩니다.
                              </p>
                            )}
                          </div>
                          {shortAnswerGradeError ? (
                            <p
                              className={`text-[11px] ${isDarkMode ? "text-red-400" : "text-red-600"}`}
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
                                <p className="text-[11px] opacity-80 whitespace-pre-line">
                                  맥락: {d.context}
                                </p>
                              )}
                              <p className="mt-1 text-[11px]">
                                <span className="font-semibold">
                                  찬성 입장:
                                </span>{" "}
                                {d.proSideStand}
                              </p>
                              <p className="mt-1 text-[11px]">
                                <span className="font-semibold">
                                  반대 입장:
                                </span>{" "}
                                {d.conSideStand}
                              </p>
                              {d.evaluationCriteria?.length > 0 && (
                                <p className="mt-1 text-[11px] opacity-80">
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
                className="px-4 py-2 text-sm rounded font-medium bg-emerald-600 text-white disabled:opacity-50 cursor-pointer"
              >
                {submitting ? "생성 중..." : "생성"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MainContent;
