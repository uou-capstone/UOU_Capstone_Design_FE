import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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
  type AssessmentSimpleDto,
  type ExamSessionDetailResponse,
  type ExamUserProfile,
  type CourseContentsResponse,
} from "../../services/api";
import RightSidebar from "./RightSidebar";
import SettingsPage from "../pages/SettingsPage";

type ViewMode = "course-list" | "course-detail";
// 메인 메뉴는 강의/설정만 사용
type MenuItem = "lectures" | "settings";

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
};

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

type ShortAnswerResultStatus = "Correct" | "Incorrect" | "Partial_Correct";

interface ShortAnswerEvaluationItem {
  questionId: number;
  resultStatus: ShortAnswerResultStatus;
  questionContent: string;
  userResponse: string;
  relatedTopic?: string;
  feedbackMessage?: string;
}

interface ShortAnswerLogData {
  evaluationItems: ShortAnswerEvaluationItem[];
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
  onDeleteCourse?: (course: Course) => void;
  onCourseCreated?: (course: CourseDetail) => void;
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
  onDeleteCourse,
  onCourseCreated,
  selectedMenu = "lectures",
}) => {
  const { isDarkMode } = useTheme();
  const { user } = useAuth();
  const isTeacher = user?.role === "TEACHER";
  const isStudent = user?.role === "STUDENT";
  const [sortOrder, setSortOrder] = React.useState<"recent" | "name" | "type">("recent");
  const [addMenuOpen, setAddMenuOpen] = React.useState(false);
  const addMenuRef = React.useRef<HTMLDivElement>(null);
  const [assessments, setAssessments] = React.useState<AssessmentSimpleDto[]>([]);
  const [assessmentsLoading, setAssessmentsLoading] = React.useState(false);
  const [localMaterials, setLocalMaterials] = React.useState<Record<number, CenterItem[]>>({});
  const [localExams, setLocalExams] = React.useState<Record<number, CenterItem[]>>({});
  const [uploadModalOpen, setUploadModalOpen] = React.useState(false);
  const [materialGenModalOpen, setMaterialGenModalOpen] = React.useState(false);
  /** 오른쪽 패널 시험 만들기 모드 (강의 선택 후 PDF 미리보기 옆 채팅창에서 프로필 설정) */
  const [rightSidebarExamMode, setRightSidebarExamMode] = React.useState(false);
  const [assessmentModalOpen, setAssessmentModalOpen] = React.useState(false);
  const [uploadFile, setUploadFile] = React.useState<File | null>(null);
  const [uploadDragOver, setUploadDragOver] = React.useState(false);
  const [materialKeyword, setMaterialKeyword] = React.useState("");
  const [materialGenStep, setMaterialGenStep] = React.useState<1 | 2 | 3 | 4 | 5>(1);
  const [materialSessionId, setMaterialSessionId] = React.useState<number | null>(null);
  const [materialDraftPlan, setMaterialDraftPlan] = React.useState<Record<string, unknown> | null>(null);
  const [materialPhase2Feedback, setMaterialPhase2Feedback] = React.useState("");
  const [materialPhase2UpdateMode, setMaterialPhase2UpdateMode] = React.useState(false);
  const [materialChapterSummary, setMaterialChapterSummary] = React.useState<string | null>(null);
  const [materialVerifiedSummary, setMaterialVerifiedSummary] = React.useState<string | null>(null);
  const [materialFinalUrl, setMaterialFinalUrl] = React.useState<string | null>(null);
  /** 화면에 띄울 문서 본문 — latest-session/status/phase5의 finalDocument만 사용 */
  const [materialFinalDocument, setMaterialFinalDocument] = React.useState<string | null>(null);
  const [materialAsyncTaskId, setMaterialAsyncTaskId] = React.useState<string | null>(null);
  const [materialCompletedViaAsync, setMaterialCompletedViaAsync] = React.useState(false);
  /** Phase 5 스트리밍: 실시간 렌더링용 내용·진행 메시지 */
  const [streamedMaterialContent, setStreamedMaterialContent] = React.useState("");
  const [streamedMaterialProgress, setStreamedMaterialProgress] = React.useState("");
  const materialStreamAbortRef = React.useRef<(() => void) | null>(null);
  const [examType, setExamType] = React.useState("FLASH_CARD");
  const [examTopic, setExamTopic] = React.useState("");
  const [examCount, setExamCount] = React.useState(10);
  // 시험 생성 프로파일 공통 상태
  const [profileFocusAreasInput, setProfileFocusAreasInput] = React.useState("");
  const [profileTargetDepth, setProfileTargetDepth] = React.useState<"Concept" | "Application" | "Derivation" | "Deep Understanding">("Concept");
  const [profileQuestionModality, setProfileQuestionModality] = React.useState<"Mathematical" | "Theoretical" | "Balance">("Balance");
  const [profileProficiencyLevel, setProfileProficiencyLevel] = React.useState<"Beginner" | "Intermediate" | "Advanced">("Beginner");
  const [profileWeaknessFocus, setProfileWeaknessFocus] = React.useState(false);
  const [profileLanguagePreference, setProfileLanguagePreference] = React.useState<"Korean_with_English_Terms" | "Korean_with_Korean_Terms" | "Only_English">("Korean_with_English_Terms");
  const [profileScenarioBased, setProfileScenarioBased] = React.useState(true);
  const [profileStrictness, setProfileStrictness] = React.useState<"Strict" | "Lenient">("Strict");
  const [profileExplanationDepth, setProfileExplanationDepth] = React.useState<"Answer_Only" | "Detailed_with_Examples">("Detailed_with_Examples");
  const [profileScopeBoundary, setProfileScopeBoundary] = React.useState<"Lecture_Material_Only" | "Allow_External_Knowledge">("Lecture_Material_Only");
  type ExamDesignMessage = { id: string; role: "assistant" | "user"; text: string };
  const [examDesignMessages, setExamDesignMessages] = React.useState<ExamDesignMessage[]>([]);
  const [examDesignInput, setExamDesignInput] = React.useState("");
  const [assessmentTitle, setAssessmentTitle] = React.useState("");
  const [assessmentType, setAssessmentType] = React.useState<"QUIZ" | "ASSIGNMENT">("QUIZ");
  const [assessmentDueDate, setAssessmentDueDate] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [openCourseMenuId, setOpenCourseMenuId] = React.useState<number | null>(null);
  const [isCourseModalOpen, setIsCourseModalOpen] = React.useState(false);
  const [courseModalTitle, setCourseModalTitle] = React.useState("");
  const [courseModalDescription, setCourseModalDescription] = React.useState("");
  const [isJoinModalOpen, setIsJoinModalOpen] = React.useState(false);
  const [joinCode, setJoinCode] = React.useState("");
  const [joinError, setJoinError] = React.useState<string | null>(null);
  const [isJoining, setIsJoining] = React.useState(false);
  const [previewFileUrl, setPreviewFileUrl] = React.useState<string | null>(null);
  const [previewMaterialId, setPreviewMaterialId] = React.useState<number | null>(null);
  const [previewFileName, setPreviewFileName] = React.useState<string | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = React.useState<string | null>(null);
  /** AI 강의자료 생성 문서는 MD로 불러와 마크다운 뷰로 표시 */
  const [previewMarkdownContent, setPreviewMarkdownContent] = React.useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = React.useState(false);
  const [previewLoadError, setPreviewLoadError] = React.useState(false);
  const [previewErrorMessage, setPreviewErrorMessage] = React.useState<string | null>(null);
  const [previewRetryKey, setPreviewRetryKey] = React.useState(0);
  const [rightSidebarWidth, setRightSidebarWidth] = React.useState(480);
  const actionMenuRef = React.useRef<HTMLDivElement | null>(null);
  // 시험 세션 상세 보기 모달 상태
  const [examDetailSessionId, setExamDetailSessionId] = React.useState<string | null>(null);
  const [examDetail, setExamDetail] = React.useState<ExamSessionDetailResponse | null>(null);
  const [examDetailLoading, setExamDetailLoading] = React.useState(false);
  const [examDetailError, setExamDetailError] = React.useState<string | null>(null);
  const [examDetailFlipped, setExamDetailFlipped] = React.useState<Record<number, boolean>>({});
  const [examAnswerVisible, setExamAnswerVisible] = React.useState<Record<string, boolean>>({});
  const [fiveChoiceUserAnswers, setFiveChoiceUserAnswers] = React.useState<Record<string, string>>({});
  const [fiveChoiceLog, setFiveChoiceLog] = React.useState<FiveChoiceLogData | null>(null);
  const [shortAnswerUserAnswers, setShortAnswerUserAnswers] = React.useState<Record<string, string>>({});
  const [shortAnswerLog, setShortAnswerLog] = React.useState<ShortAnswerLogData | null>(null);
  const [examProfile, setExamProfile] = React.useState<ExamUserProfile | null>(null);
  const [examProfileStatus, setExamProfileStatus] = React.useState<"IDLE" | "INCOMPLETE" | "COMPLETE">("IDLE");
  const [examProfileLoading, setExamProfileLoading] = React.useState(false);
  const [lectureResourcesLoading, setLectureResourcesLoading] = React.useState(false);
  const [bulkEditMode, setBulkEditMode] = React.useState(false);
  const [bulkSelectedIds, setBulkSelectedIds] = React.useState<Record<string, boolean>>({});
  /** 강의실 목록에서 삭제 모드(강의 삭제와 동일 UI) */
  const [courseListBulkEditMode, setCourseListBulkEditMode] = React.useState(false);
  const [bulkSelectedCourseIds, setBulkSelectedCourseIds] = React.useState<Record<number, boolean>>({});
  const [courseListSortOrder, setCourseListSortOrder] = React.useState<"recent" | "name">("recent");
  const [courseContentsLoaded, setCourseContentsLoaded] = React.useState(false);

  const sortedCourses = React.useMemo(() => {
    const list = [...courses];
    if (courseListSortOrder === "recent") list.sort((a, b) => b.courseId - a.courseId);
    if (courseListSortOrder === "name") list.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    return list;
  }, [courses, courseListSortOrder]);
  const [examRecoverOpen, setExamRecoverOpen] = React.useState(false);
  const [examRecoverSelectedId, setExamRecoverSelectedId] = React.useState("");

  React.useEffect(() => {
    if (!rightSidebarExamMode) {
      setExamRecoverOpen(false);
      setExamRecoverSelectedId("");
      setExamProfile(null);
      setExamProfileStatus("IDLE");
      setExamProfileLoading(false);
      setExamDesignMessages([]);
      setExamDesignInput("");
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
    setPreviewLoading(true);
    setPreviewLoadError(false);
    setPreviewErrorMessage(null);
    let objectUrl: string | null = null;
    const id = previewMaterialId;
    materialApi
      .getMaterialFile(id)
      .then((blob) => {
        const type = (blob.type || "").toLowerCase();
        const isHtml = type.includes("text/html") || type.includes("application/xhtml");
        if (isHtml) {
          setPreviewLoadError(true);
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
  }, [previewMaterialId, previewRetryKey]);

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
    const pathPart = previewFileUrl.startsWith("http") ? (() => { try { return new URL(previewFileUrl).pathname; } catch { return previewFileUrl; } })() : previewFileUrl;
    const pathLooksLikeMarkdown = /^\/?#{1,6}(\s|%20)|^\/?[\d.]+\s.*자료구조|\.md$/i.test(pathPart) || pathPart.length > 200;
    const isLikelyMarkdownInPath = urlHasMarkdownPattern || pathLooksLikeMarkdown;
    if (!looksLikeUrl || isLikelyMarkdownInPath) {
      let rawContent: string = previewFileUrl;
      if (isLikelyMarkdownInPath && previewFileUrl.startsWith("http")) {
        try {
          const u = new URL(previewFileUrl);
          const afterDomain = u.pathname.slice(1) + (u.hash ? u.hash.slice(1) : "");
          const decoded = decodeURIComponent(afterDomain || previewFileUrl);
          rawContent = previewFileUrl.includes("/###") && decoded.startsWith(" ") ? "###" + decoded : decoded;
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
    const isSameOrigin = typeof window !== "undefined" && window.location.origin === apiOrigin;
    let fetchUrl: string;
    try {
      const baseForParse = API_BASE_URL || "https://uouaitutor.duckdns.org";
      const u = previewFileUrl.startsWith("http") ? new URL(previewFileUrl) : new URL(previewFileUrl, baseForParse);
      if (isSameOrigin) {
        fetchUrl = u.pathname + u.search;
      } else {
        fetchUrl = u.href;
      }
    } catch {
      fetchUrl = previewFileUrl.startsWith("/") ? (API_BASE_URL || "") + previewFileUrl : previewFileUrl;
    }
    // AI 강의자료 생성 문서: /api/materials/generation/{id}/document → MD로 받아 마크다운 뷰로 표시
    const isGeneratedDocument =
      /\/api\/materials\/generation\/\d+\/document/.test(previewFileUrl) ||
      (fetchUrl && /\/api\/materials\/generation\/\d+\/document/.test(fetchUrl));
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
            throw new Error(`서버가 일시적으로 응답하지 않습니다 (${status}). 잠시 후 다시 시도해 주세요.`);
          }
          throw new Error(status === 401 ? "접근 권한이 없습니다." : "파일을 불러올 수 없습니다.");
        }
        if (isGeneratedDocument) {
          const text = await res.text();
          setPreviewMarkdownContent(text);
          return;
        }
        const blob = await res.blob();
        const type = (blob.type || "").toLowerCase();
        const isHtml = type.includes("text/html") || type.includes("application/xhtml");
        if (isHtml) {
          setPreviewLoadError(true);
          setPreviewLoading(false);
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

  const handleOpenPreviewInNewTab = React.useCallback(async () => {
    if (previewMaterialId != null) {
      try {
        const blob = await materialApi.getMaterialFile(previewMaterialId);
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank", "noopener");
      } catch (e) {
        window.alert(e instanceof Error ? e.message : "미리보기를 열 수 없습니다.");
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
    const isDevOrigin = typeof window !== "undefined" && window.location.hostname === "localhost";
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
    if (openCourseMenuId === null) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (actionMenuRef.current && !actionMenuRef.current.contains(target)) {
        setOpenCourseMenuId(null);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenCourseMenuId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [openCourseMenuId]);

  React.useEffect(() => {
    if (!addMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) setAddMenuOpen(false);
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
    const materials: CenterItem[] = (selectedLectureId ? localMaterials[selectedLectureId] : []) ?? [];
    const exams: CenterItem[] = (selectedLectureId ? localExams[selectedLectureId] : []) ?? [];
    const fromAssessments: CenterItem[] = assessments.map((a) => ({
      id: `assessment-${a.assessmentId}`,
      type: "assessment" as const,
      title: a.title,
      meta: "평가",
      createdAt: a.dueDate || "",
      assessmentId: a.assessmentId,
    }));
    const merged = [...materials, ...exams, ...fromAssessments];
    if (sortOrder === "recent")
      merged.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    if (sortOrder === "name") merged.sort((a, b) => a.title.localeCompare(b.title));
    if (sortOrder === "type")
      merged.sort((a, b) => {
        const order = { material: 0, exam: 1, assessment: 2 };
        return order[a.type] - order[b.type] || a.title.localeCompare(b.title);
      });
    return merged;
  }, [selectedLectureId, localMaterials, localExams, assessments, sortOrder]);

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
          (url.startsWith("#") || url.includes("###") || url.includes("## ") || url.length > 250);
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
          const exs: CenterItem[] = (lec.examSessions || []).map((s) => ({
            id: String(s.examSessionId),
            type: "exam" as const,
            title: `${s.examType} · ${s.targetCount}문항`,
            meta: "시험",
            createdAt: s.createdAt,
            examSessionId: String(s.examSessionId),
          }));
          if (mats.length > 0) {
            materialsByLecture[lec.lectureId] = mats;
          }
          if (exs.length > 0) {
            examsByLecture[lec.lectureId] = exs;
          }
        }

        // BE가 contents에 생성 완료 자료를 안 넣어줄 수 있음 → 강의별 최근 세션에 문서 있으면 목록에 추가
        const sessionResults = await Promise.allSettled(
          lectures.map((lec) => materialGenerationApi.getLatestSessionForLecture(lec.lectureId))
        );
        for (let i = 0; i < lectures.length; i++) {
          const lec = lectures[i];
          const settled = sessionResults[i];
          if (settled?.status !== "fulfilled" || !settled.value) continue;
          const raw = settled.value as Record<string, unknown>;
          const sessionId = typeof raw.sessionId === "number" ? raw.sessionId : null;
          if (sessionId == null) continue;
          // 표시용: 반드시 finalDocument(마크다운 본문)만 사용. documentUrl은 다운로드/API용.
          const finalDoc = typeof raw.finalDocument === "string" && raw.finalDocument ? raw.finalDocument : undefined;
          let docUrl: string | null =
            typeof raw.documentUrl === "string" && raw.documentUrl ? raw.documentUrl
              : typeof (raw.document as Record<string, unknown>)?.url === "string"
                ? (raw.document as { url: string }).url
                : null;
          if (!docUrl) {
            try {
              const docRes = await materialGenerationApi.getDocument(sessionId);
              const d = docRes as Record<string, unknown>;
              docUrl =
                typeof d.documentUrl === "string"
                  ? d.documentUrl
                  : typeof d.url === "string"
                    ? d.url
                    : null;
            } catch {
              /* getDocument 404 등 실패 시 finalDocument 있으면 목록에 추가 */
            }
          }
          // 세션이 있고 (실제 URL 있음 또는 finalDocument 있음) 이면 목록에 추가
          const hasDoc = (typeof docUrl === "string" && docUrl.length > 0) || finalDoc;
          if (!hasDoc) continue;
          const existing = materialsByLecture[lec.lectureId] ?? [];
          const documentApiUrl = `/api/materials/generation/${sessionId}/document`;
          const alreadyHas = existing.some((m) => m.generationSessionId === sessionId || m.fileUrl === documentApiUrl);
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
  const refetchCourseContents = React.useCallback(
    (courseId: number) => {
      courseContentsApi.getCourseContents(courseId).then(async (res: CourseContentsResponse) => {
        const materialsByLecture: Record<number, CenterItem[]> = {};
        const examsByLecture: Record<number, CenterItem[]> = {};
        const lectures = res.lectures || [];
        const urlLooksLikeMarkdown = (url: string | undefined) =>
          typeof url === "string" &&
          (url.startsWith("#") || url.includes("###") || url.includes("## ") || url.length > 250);
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
          const exs: CenterItem[] = (lec.examSessions || []).map((s) => ({
            id: String(s.examSessionId),
            type: "exam" as const,
            title: `${s.examType} · ${s.targetCount}문항`,
            meta: "시험",
            createdAt: s.createdAt,
            examSessionId: String(s.examSessionId),
          }));
          if (mats.length > 0) materialsByLecture[lec.lectureId] = mats;
          if (exs.length > 0) examsByLecture[lec.lectureId] = exs;
        }
        const sessionResults = await Promise.allSettled(
          lectures.map((lec) => materialGenerationApi.getLatestSessionForLecture(lec.lectureId))
        );
        for (let i = 0; i < lectures.length; i++) {
          const lec = lectures[i];
          const settled = sessionResults[i];
          if (settled?.status !== "fulfilled" || !settled.value) continue;
          const raw = settled.value as Record<string, unknown>;
          const sessionId = typeof raw.sessionId === "number" ? raw.sessionId : null;
          if (sessionId == null) continue;
          const finalDoc = typeof raw.finalDocument === "string" && raw.finalDocument ? raw.finalDocument : undefined;
          let docUrl: string | null =
            typeof raw.documentUrl === "string" && raw.documentUrl ? raw.documentUrl
              : typeof (raw.document as Record<string, unknown>)?.url === "string"
                ? (raw.document as { url: string }).url
                : null;
          if (!docUrl) {
            try {
              const docRes = await materialGenerationApi.getDocument(sessionId);
              const d = docRes as Record<string, unknown>;
              docUrl =
                typeof d.documentUrl === "string"
                  ? d.documentUrl
                  : typeof d.url === "string"
                    ? d.url
                    : null;
            } catch {
              /* getDocument 404 등 실패 시 finalDocument 있으면 추가 */
            }
          }
          const hasDoc = (typeof docUrl === "string" && docUrl.length > 0) || finalDoc;
          if (!hasDoc) continue;
          const existing = materialsByLecture[lec.lectureId] ?? [];
          const documentApiUrl = `/api/materials/generation/${sessionId}/document`;
          const alreadyHas = existing.some((m) => m.generationSessionId === sessionId || m.fileUrl === documentApiUrl);
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
      }).catch(() => {});
    },
    []
  );

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

  const handleBulkDelete = async () => {
    if (!selectedLectureId) return;
    const ids = Object.keys(bulkSelectedIds).filter((id) => bulkSelectedIds[id]);
    if (ids.length === 0) {
      window.alert("삭제할 카드를 선택해주세요.");
      return;
    }
    if (
      !window.confirm(
        `선택한 ${ids.length}개의 자료/시험을 삭제하시겠습니까?\n(자료는 서버에서도 삭제됩니다.)`,
      )
    ) {
      return;
    }

    const materialList = localMaterials[selectedLectureId] || [];
    const examList = localExams[selectedLectureId] || [];
    const selectedMats = materialList.filter((it) => bulkSelectedIds[it.id]);
    const selectedExams = examList.filter((it) => bulkSelectedIds[it.id]);

    const materialDeletePromises = selectedMats.map((m) =>
      m.materialId != null
        ? materialApi.deleteMaterial(m.materialId)
        : m.generationSessionId != null
        ? materialGenerationApi.deleteSession(m.generationSessionId!)
        : Promise.resolve()
    );
    const examDeletePromises = selectedExams
      .filter((e) => e.examSessionId != null)
      .map((e) => examGenerationApi.deleteExamSession(Number(e.examSessionId)));
    const settled = await Promise.allSettled([...materialDeletePromises, ...examDeletePromises]);
    const failed = settled.filter((r) => r.status === "rejected");
    if (failed.length > 0) {
      const msg = (failed[0] as PromiseRejectedResult).reason;
      window.alert(`일부 삭제 실패: ${msg instanceof Error ? msg.message : String(msg)}`);
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
    setBulkSelectedIds({});
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
        if (courseDetail?.courseId) refetchCourseContents(courseDetail.courseId);
      } else if (item.type === "exam") {
        try {
          if (item.examSessionId != null) {
            await examGenerationApi.deleteExamSession(Number(item.examSessionId));
          }
        } catch (e) {
          window.alert(e instanceof Error ? e.message : "시험 삭제에 실패했습니다.");
          return;
        }
        setLocalExams((prev) => {
          const list = prev[selectedLectureId] || [];
          return {
            ...prev,
            [selectedLectureId]: list.filter((it) => it.id !== item.id),
          };
        });
        if (courseDetail?.courseId) refetchCourseContents(courseDetail.courseId);
      } else {
        window.alert("이 항목은 아직 삭제 기능이 연결되지 않았습니다.");
      }
    },
    [selectedLectureId, courseDetail?.courseId, refetchCourseContents]
  );

  React.useEffect(() => {
    if (uploadModalOpen) {
      setUploadFile(null);
      setUploadDragOver(false);
    }
  }, [uploadModalOpen]);

  React.useEffect(() => {
    setPreviewFileUrl(null);
    setPreviewMaterialId(null);
    setPreviewFileName(null);
  }, [selectedLectureId]);

  const handleRightSidebarResizeStart = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = rightSidebarWidth;
    const onMove = (ev: MouseEvent) => {
      const delta = startX - ev.clientX;
      setRightSidebarWidth(Math.min(800, Math.max(320, startWidth + delta)));
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
  }, [rightSidebarWidth]);

  // 강의자료 생성 시 PDF는 선택 사항이므로, 더 이상 자동 입력/강제 사용하지 않는다.

  const handleUploadSubmit = React.useCallback(async () => {
    if (!selectedLectureId || !uploadFile || !courseDetail?.courseId) return;
    setSubmitting(true);
    try {
      const result = await lectureApi.uploadMaterial(selectedLectureId, uploadFile);
      const { materialId: resMaterialId, fileUrl: url, displayName: resDisplayName } = result;
      const title = resDisplayName ?? uploadFile.name;
      const newItem: CenterItem = {
        id: resMaterialId != null ? `material-${resMaterialId}` : `material-${Date.now()}`,
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
      } else if (url) {
        setPreviewFileUrl(url);
        setPreviewMaterialId(null);
        setPreviewFileName(title);
      }
      // 업로드 후에는 모달만 닫고, 강의 콘텐츠 생성은 채팅(/generate)에서 수행
      setUploadModalOpen(false);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "업로드에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }, [selectedLectureId, uploadFile, courseDetail?.courseId]);

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
      window.alert(e instanceof Error ? e.message : "기획안 생성에 실패했습니다.");
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
      const res = await materialGenerationApi.getLatestSessionForLecture(selectedLectureId);
      setMaterialSessionId(res.sessionId);
      if (res.draftPlan) setMaterialDraftPlan(res.draftPlan);
      const phase = (res.currentPhase || "").toUpperCase();
      if (phase === "PHASE1" || phase === "PHASE2") {
        setMaterialGenStep(2);
      } else if (phase === "PHASE3") {
        setMaterialGenStep(3);
      } else if (phase === "PHASE4") {
        setMaterialChapterSummary(res.chapterContentList ? "챕터 내용 생성됨" : null);
        setMaterialGenStep(4);
      } else {
        // PHASE5 또는 완료: 화면에는 반드시 finalDocument만 사용. documentUrl은 다운로드/링크용.
        if (typeof res.finalDocument === "string" && res.finalDocument) {
          setMaterialFinalDocument(res.finalDocument);
          setMaterialCompletedViaAsync(true);
          setMaterialGenStep(5);
          if (typeof res.documentUrl === "string" && res.documentUrl) setMaterialFinalUrl(res.documentUrl);
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
      const msg = e instanceof Error ? e.message : "최근 세션 조회에 실패했습니다.";
      window.alert(msg + (msg.includes("세션") ? "" : " 이 강의에 대한 이전 기획안이 없을 수 있습니다."));
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
      const res = await materialGenerationApi.phase2({ sessionId: materialSessionId, action: "confirm" });
      if (res.draftPlan) setMaterialDraftPlan(res.draftPlan);
      setMaterialGenStep(3);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "기획안 확정에 실패했습니다.";
      if (msg.includes("Phase 1 완료 후에만")) {
        window.alert(
          "이 세션은 서버에서 Phase 2 진행이 허용되지 않습니다.\n\n" +
            "‘최근 사용한 기획안 불러오기’로 불러온 세션은 BE에서 Phase 1 완료로 인식하지 않을 수 있습니다.\n\n" +
            "해결: 1단계로 돌아가 주제/키워드를 입력한 뒤 [기획안 생성]으로 새로 만든 뒤 확정해 주세요."
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
      const msg = e instanceof Error ? e.message : "기획안 수정에 실패했습니다.";
      if (msg.includes("Phase 1 완료 후에만")) {
        window.alert(
          "이 세션은 서버에서 Phase 2 진행이 허용되지 않습니다.\n\n" +
            "'최근 사용한 기획안 불러오기'로 불러온 세션은 BE에서 Phase 1 완료로 인식하지 않을 수 있습니다.\n\n" +
            "해결: 1단계로 돌아가 주제/키워드를 입력한 뒤 [기획안 생성]으로 새로 만든 뒤 수정 요청해 주세요."
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
          finalDocument: typeof finalDocument === "string" && finalDocument ? finalDocument : undefined,
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
    [materialSessionId, materialKeyword, selectedLectureId, courseDetail?.courseId, refetchCourseContents]
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
        let statusRes: { status?: string; documentUrl?: string; message?: string };
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
              const docRes = await materialGenerationApi.getDocument(materialSessionId);
              docUrl = docRes.documentUrl ?? (docRes as { url?: string }).url ?? null;
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
      window.alert("처리 시간이 초과되었습니다. 잠시 후 작업 상태를 확인해 주세요.");
      setMaterialAsyncTaskId(null);
      setSubmitting(false);
    };

    try {
      const res = await materialGenerationApi.runAsync({ sessionId: materialSessionId });
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
            if (data.progressPercentage != null) setStreamedMaterialProgress(`${data.progressPercentage}%`);
            else if (data.message) setStreamedMaterialProgress(data.message);
            else if (data.currentPhase) setStreamedMaterialProgress(data.currentPhase);
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
              docUrl = URL.createObjectURL(new Blob([data.finalDocument], { type: "text/markdown; charset=UTF-8" }));
            } else if (typeof data.documentUrl === "string" && data.documentUrl) {
              docUrl = data.documentUrl;
            }
            applyMaterialCompletion(docUrl, data.finalDocument);
          },
          onError: (err) => {
            materialStreamAbortRef.current = null;
            setStreamedMaterialProgress("스트림 종료. 상태 확인 중…");
            window.alert(err.message || "스트림 연결에 실패했습니다. 상태 폴링으로 진행합니다.");
            pollUntilDone(taskId);
          },
        }
      );
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Phase 3~5 실행에 실패했습니다.");
      setSubmitting(false);
    }
  }, [materialSessionId, applyMaterialCompletion]);

  const handleMaterialPhase3 = React.useCallback(async () => {
    if (materialSessionId == null) return;
    setSubmitting(true);
    try {
      const res = await materialGenerationApi.phase3({ sessionId: materialSessionId });
      const total = res.totalChapters ?? (res.chapterContentList && typeof res.chapterContentList === "object" ? Object.keys(res.chapterContentList).length : 0);
      setMaterialChapterSummary(total ? `챕터 ${total}개 생성 완료` : (res.message || "챕터 내용 생성 완료"));
      setMaterialGenStep(4);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "챕터 내용 생성에 실패했습니다.";
      window.alert(msg);
    } finally {
      setSubmitting(false);
    }
  }, [materialSessionId]);

  const handleMaterialPhase4 = React.useCallback(async () => {
    if (materialSessionId == null) return;
    setSubmitting(true);
    try {
      const res = await materialGenerationApi.phase4({ sessionId: materialSessionId });
      setMaterialVerifiedSummary(res.message ?? "내용 검증 완료");
      setMaterialGenStep(5);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "내용 검증에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }, [materialSessionId]);

  const handleMaterialPhase5 = React.useCallback(async () => {
    if (materialSessionId == null) return;
    setSubmitting(true);
    try {
      const res = await materialGenerationApi.phase5({ sessionId: materialSessionId }) as { documentUrl?: string; finalDocument?: string };
      // 화면에 띄울 값은 반드시 finalDocument. documentUrl은 다운로드/링크용.
      if (typeof res.finalDocument === "string" && res.finalDocument) {
        setMaterialFinalDocument(res.finalDocument);
        setMaterialFinalUrl(typeof res.documentUrl === "string" && res.documentUrl ? res.documentUrl : null);
      } else if (typeof res.documentUrl === "string" && res.documentUrl) {
        setMaterialFinalUrl(res.documentUrl);
        setMaterialFinalDocument(null);
      } else {
        setMaterialFinalUrl(null);
        setMaterialFinalDocument(null);
      }
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "최종 문서 생성에 실패했습니다.");
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
      title: (materialFinalUrl || materialFinalDocument) ? `${title} (문서)` : title,
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
  }, [materialKeyword, materialSessionId, materialFinalUrl, materialFinalDocument, selectedLectureId, resetMaterialGenModal, materialCompletedViaAsync]);

  const handleExamGenAsyncSubmit = React.useCallback(async () => {
    if (!examTopic.trim()) return;
    if (selectedLectureId == null) {
      window.alert("강의를 먼저 선택해주세요.");
      return;
    }
    setSubmitting(true);
    try {
      const convoTextFromChat = examDesignMessages
        .filter((m) => m.role === "user")
        .map((m) => m.text)
        .join(" | ");
      const focusSource =
        profileFocusAreasInput.trim() || convoTextFromChat.trim() || examTopic.trim();
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
        examProfileStatus === "COMPLETE" && examProfile ? examProfile : fallbackUserProfile;

      const res = await examGenerationApi.runAsync({
        lectureId: selectedLectureId,
        examType,
        targetCount: examCount,
        lectureContent: examTopic.trim(),
        topic: examTopic.trim(),
        userProfile: finalUserProfile,
      });
      const lines = [
        "시험이 백그라운드에서 생성 중입니다.",
        "",
        "다른 페이지로 이동하거나 새로고침·로그아웃을 해도 서버에서 계속 생성됩니다. 완료 후 이 강의 화면을 다시 열면 목록에 표시됩니다.",
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
      setRightSidebarExamMode(false);
      setExamTopic("");
      setExamCount(10);
      setProfileFocusAreasInput("");
      setExamDesignMessages([]);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "비동기 시험 생성 시작에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }, [
    examType,
    examTopic,
    examCount,
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
    examDesignMessages,
  ]);

  const openExamSessionDetail = React.useCallback(async (sessionId: string) => {
    setExamDetailSessionId(sessionId);
    setExamDetail(null);
    setExamDetailError(null);
    setExamDetailLoading(true);
    setExamDetailFlipped({});
    setExamAnswerVisible({});
    setFiveChoiceUserAnswers({});
    setFiveChoiceLog(null);
     setShortAnswerUserAnswers({});
     setShortAnswerLog(null);
    try {
      const numericId = Number(sessionId);
      if (!Number.isFinite(numericId)) {
        throw new Error("유효하지 않은 시험 세션 ID입니다.");
      }
      const detail = await examGenerationApi.getSession(numericId);
      setExamDetail(detail);
    } catch (e) {
      setExamDetailError(e instanceof Error ? e.message : "시험 세션 정보를 불러오지 못했습니다.");
    } finally {
      setExamDetailLoading(false);
    }
  }, []);

  const handleExamSessionRecoverOpen = React.useCallback(() => {
    if (!selectedLectureId) {
      window.alert("먼저 왼쪽에서 강의(주차)를 선택해 주세요.");
      return;
    }
    const exams = localExams[selectedLectureId] || [];
    if (exams.length === 0) {
      window.alert("이 강의에 시험 세션이 없습니다. 시험을 생성한 뒤 복구할 수 있습니다.");
      return;
    }
    setExamRecoverSelectedId(exams[0]?.examSessionId ?? "");
    setExamRecoverOpen(true);
  }, [selectedLectureId, localExams]);

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
      window.alert(e instanceof Error ? e.message : "시험 세션 복구에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }, [examRecoverSelectedId, courseDetail?.courseId, refetchCourseContents]);

  const handleToggleFlashCard = (id: number) => {
    setExamDetailFlipped((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleExamAnswerVisible = (key: string) => {
    setExamAnswerVisible((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleFiveChoiceAnswerChange = (problemIndex: number, optionId: string) => {
    setFiveChoiceUserAnswers((prev) => ({
      ...prev,
      [String(problemIndex)]: optionId,
    }));
  };

  const handleFiveChoiceGrade = () => {
    if (!examDetail || !examDetail.fiveChoiceProblems || examDetail.fiveChoiceProblems.length === 0) {
      return;
    }
    const evaluationItems: FiveChoiceEvaluationItem[] = examDetail.fiveChoiceProblems.map((q, idx) => {
      const key = String(idx);
      const userChoiceId = fiveChoiceUserAnswers[key];
      const selectedOption = q.options?.find((opt) => opt.id === userChoiceId) ?? null;

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
        const intentPart = intentText ? `선택한 보기의 의도: ${intentText}` : "선택한 보기의 의도가 명시되어 있지 않음.";
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

  /** POST /api/exams/generation/profile — 에이전트와 대화로 시험 프로필 채움. status가 COMPLETE될 때까지 반복 호출 후 updatedProfile을 시험 생성 요청의 userProfile로 사용 */
  const sendExamProfileMessage = React.useCallback(
    async (text: string) => {
      const trimmedTopic = examTopic.trim();
      if (!trimmedTopic) {
        window.alert("먼저 시험 주제를 입력해주세요.");
        return;
      }
      setExamProfileLoading(true);
      try {
        const res = await examGenerationApi.generateProfile({
          lectureContent: trimmedTopic,
          examType,
          existingProfile: examProfile ?? undefined,
          userMessage: text,
        });
        if (res.agentMessage) {
          setExamDesignMessages((prev) => [
            ...prev,
            { id: `a-${Date.now()}`, role: "assistant", text: res.agentMessage },
          ]);
        }
        if (res.updatedProfile) {
          setExamProfile(res.updatedProfile);
        }
        if (res.status === "COMPLETE") {
          setExamProfileStatus("COMPLETE");
        } else {
          setExamProfileStatus("INCOMPLETE");
        }
      } catch (e) {
        window.alert(
          e instanceof Error
            ? e.message
            : "프로필 설정 에이전트와의 통신 중 오류가 발생했습니다.",
        );
      } finally {
        setExamProfileLoading(false);
      }
    },
    [examTopic, examType, examProfile],
  );

  const handleShortAnswerInputChange = (problemIndex: number, value: string) => {
    setShortAnswerUserAnswers((prev) => ({
      ...prev,
      [String(problemIndex)]: value,
    }));
  };

  const handleShortAnswerGrade = () => {
    if (!examDetail || !examDetail.shortAnswerProblems || examDetail.shortAnswerProblems.length === 0) {
      return;
    }

    const evaluationItems: ShortAnswerEvaluationItem[] = examDetail.shortAnswerProblems.map((q, idx) => {
      const key = String(idx);
      const userResponse = (shortAnswerUserAnswers[key] ?? "").trim();

      const rawKeywords =
        (Array.isArray((q as any).relatedKeywords) && (q as any).relatedKeywords.length > 0
          ? (q as any).relatedKeywords
          : Array.isArray((q as any).keyKeywords)
          ? (q as any).keyKeywords
          : []) as string[];

      const normalizedUser = userResponse.toLowerCase();
      const matchedKeywords = rawKeywords.filter((kw) =>
        normalizedUser.includes(String(kw).toLowerCase()),
      );

      let resultStatus: ShortAnswerResultStatus = "Incorrect";
      if (rawKeywords.length === 0) {
        resultStatus = userResponse ? "Correct" : "Incorrect";
      } else if (matchedKeywords.length === rawKeywords.length && rawKeywords.length > 0) {
        resultStatus = "Correct";
      } else if (matchedKeywords.length > 0) {
        resultStatus = "Partial_Correct";
      }

      const relatedTopic =
        (q as any).intentDiagnosis ||
        (q as any).evaluationCriteria ||
        (q as any).questionContent ||
        "";

      let feedbackMessage: string;
      if (!userResponse) {
        feedbackMessage =
          "답안을 입력하지 않아 개념 이해를 평가하기 어렵습니다. 강의 자료와 모범 답안을 참고해 핵심 키워드를 포함해 다시 서술해 보세요.";
      } else if (resultStatus === "Correct") {
        const base =
          "핵심 키워드를 잘 포함해 정확하게 서술했습니다. ";
        const intentText = (q as any).intentDiagnosis || (q as any).evaluationCriteria || "";
        feedbackMessage = intentText ? `${base}${intentText}` : base;
      } else if (resultStatus === "Partial_Correct") {
        const missing = rawKeywords.filter(
          (kw) => !matchedKeywords.includes(kw),
        );
        const missingText =
          missing.length > 0 ? `누락된 핵심 키워드: ${missing.join(", ")}.` : "";
        feedbackMessage =
          "핵심 개념의 일부는 잘 짚었지만, 모범 답안과 비교했을 때 표현이 부족한 부분이 있습니다. " +
          missingText;
      } else {
        feedbackMessage =
          "모범 답안의 핵심 논리와 키워드가 충분히 반영되지 않았습니다. 강의 자료에서 관련 부분을 다시 읽고, 정의·비교·원인·사례 등을 구조적으로 정리해 보세요.";
      }

      return {
        questionId: idx + 1,
        resultStatus,
        questionContent: (q as any).questionContent || "",
        userResponse: userResponse || "No Answer",
        relatedTopic,
        feedbackMessage,
      };
    });

    setShortAnswerLog({ evaluationItems });
  };

  const handleAssessmentSubmit = React.useCallback(async () => {
    if (!courseDetail?.courseId || !assessmentTitle.trim() || !assessmentDueDate.trim()) return;
    setSubmitting(true);
    try {
      await assessmentApi.createAssessment(courseDetail.courseId, {
        title: assessmentTitle.trim(),
        type: assessmentType,
        dueDate: assessmentDueDate,
        questions: [{ text: "샘플 문항", type: "ESSAY" }],
      });
      const list = await assessmentApi.getAssessmentsForCourse(courseDetail.courseId);
      setAssessments(list);
      setAssessmentModalOpen(false);
      setAssessmentTitle("");
      setAssessmentDueDate("");
      window.alert("평가가 생성되었습니다.");
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "평가 생성에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }, [courseDetail?.courseId, assessmentTitle, assessmentType, assessmentDueDate]);

  /** AI 생성 자료 상세: sessionId로 document API URL 반환 (상대 경로 → 프록시/동일 origin에서 동작) */
  const getMaterialDocumentPreviewUrl = React.useCallback((sessionId: number) => {
    return `/api/materials/generation/${sessionId}/document`;
  }, []);

  const handleCardClick = React.useCallback((item: CenterItem) => {
    if (item.materialId != null) {
      setPreviewMaterialId(item.materialId);
      setPreviewFileUrl(null);
      setPreviewFileName(item.title || null);
      return;
    }
    // AI 생성 자료: finalDocument(마크다운 본문)가 있으면 fetch 없이 그대로 표시
    if (typeof item.finalDocument === "string" && item.finalDocument) {
      setPreviewFileUrl(item.finalDocument);
      setPreviewMaterialId(null);
      setPreviewFileName(item.title || null);
      return;
    }
    // sessionId만 있으면 document API URL로 미리보기
    if (item.generationSessionId != null) {
      setPreviewFileUrl(getMaterialDocumentPreviewUrl(item.generationSessionId));
      setPreviewMaterialId(null);
      setPreviewFileName(item.title || null);
      return;
    }
    if (item.fileUrl) {
      setPreviewFileUrl(item.fileUrl);
      setPreviewMaterialId(null);
      setPreviewFileName(item.title || null);
      return;
    }
    if (item.type === "material") {
      window.alert(
        "이 항목은 API Phase1으로 생성된 기획안 초안입니다.\n\n" +
        "Phase1은 키워드 기반 기획안(DraftPlan)만 만들고, PDF 파일은 생성하지 않습니다. " +
        "PDF 문서가 필요하면 Phase 2~5를 순서대로 진행하거나, " +
        '"자료 업로드"로 직접 PDF를 올린 뒤 미리보기할 수 있습니다.'
      );
      return;
    }
    if (item.assessmentId) {
      window.alert(`평가 상세 (ID: ${item.assessmentId}) - 연동 예정`);
      return;
    }
    if (item.examSessionId) {
      void openExamSessionDetail(item.examSessionId);
    }
  }, [openExamSessionDetail, getMaterialDocumentPreviewUrl]);

  const toggleCourseMenu = (courseId: number) => {
    setOpenCourseMenuId((prev) => (prev === courseId ? null : courseId));
  };

  const handleCourseSelect = (courseId: number) => {
    onSelectCourse(courseId);
    setOpenCourseMenuId(null);
  };

  const handleToggleCourseBulkSelect = (courseId: number) => {
    setBulkSelectedCourseIds((prev) => ({ ...prev, [courseId]: !prev[courseId] }));
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
      `선택한 ${ids.length}개의 강의실을 삭제하시겠습니까?\n(삭제된 강의실은 복구할 수 없습니다.)`
    );
    if (!ok) return;
    const toDelete = courses.filter((c) => ids.includes(c.courseId));
    for (const course of toDelete) {
      try {
        onDeleteCourse?.(course);
      } catch (e) {
        window.alert(e instanceof Error ? e.message : "강의실 삭제에 실패했습니다.");
      }
    }
    setBulkSelectedCourseIds({});
    setCourseListBulkEditMode(false);
    setOpenCourseMenuId(null);
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
        description: description || '설명 없음',
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
      const errorMsg = error instanceof Error ? error.message : '강의실 생성에 실패했습니다.';
      window.alert(errorMsg);
    }
  };

  const handleEnrollCurrentCourse = React.useCallback(async () => {
    if (!courseDetail) return;

    const confirmed = window.confirm(
      `'${courseDetail.title}' 강의실에 수강 신청하시겠습니까?`
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

  const renderCourseList = () => {
    if (isCoursesLoading) {
      return (
        <div
          className={`h-full flex items-center justify-center ${
            isDarkMode ? "text-gray-400" : "text-gray-500"
          }`}
        >
          <div className="text-center">
            <p className="text-lg font-medium mb-2">강의실 목록을 불러오는 중...</p>
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
              <p className="text-sm">담당 선생님이 강의실을 생성하면 여기에 표시됩니다.</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-1.5 h-full">
        <div className={`flex-1 flex flex-col min-h-0 rounded-xl overflow-hidden ${
          isDarkMode ? "bg-[#141414]" : "bg-white"
        }`}>
          <div className={`flex-1 overflow-y-auto ${isDarkMode ? "text-gray-200" : "text-gray-800"}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-6">
          {sortedCourses.map((course) => {
            const checked = !!bulkSelectedCourseIds[course.courseId];
            return (
            <div
              key={course.courseId}
              role="button"
              tabIndex={0}
              onClick={() => {
                if (courseListBulkEditMode) {
                  handleToggleCourseBulkSelect(course.courseId);
                } else {
                  handleCourseSelect(course.courseId);
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  if (courseListBulkEditMode) handleToggleCourseBulkSelect(course.courseId);
                  else handleCourseSelect(course.courseId);
                }
              }}
              className={`text-left rounded-2xl transition-all flex flex-col cursor-pointer focus:outline-none relative overflow-hidden ${
                isDarkMode
                  ? "bg-[#ffffff14] border border-zinc-800"
                  : "bg-[#4040401f] border border-[#E5E7EB]"
              } ${courseListBulkEditMode && checked ? "ring-2 ring-emerald-500" : ""} focus:ring-2 ${
                isDarkMode ? "focus:ring-zinc-500/60 focus:ring-offset-zinc-950" : "focus:ring-emerald-500/60 focus:ring-offset-white"
              } shadow-sm`}
            >
              {courseListBulkEditMode && (
                <label
                  className="absolute top-2 left-2 flex items-center justify-center w-5 h-5 rounded z-10 cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => handleToggleCourseBulkSelect(course.courseId)}
                    className="w-3 h-3"
                    onClick={(e) => e.stopPropagation()}
                  />
                </label>
              )}
              <div className="flex flex-col h-full p-6">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h3 className="text-base font-semibold line-clamp-2 flex-1">
                    {course.title}
                  </h3>
                  {!courseListBulkEditMode && (
                  <div className="relative flex-shrink-0">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleCourseMenu(course.courseId);
                      }}
                      className={`inline-flex items-center justify-center w-7 h-7 rounded-lg transition-colors cursor-pointer ${
                        isDarkMode
                          ? "text-gray-200 hover:text-white hover:bg-zinc-700"
                          : "text-gray-500 hover:text-gray-700 hover:bg-zinc-200"
                      }`}
                      aria-haspopup="menu"
                      aria-expanded={openCourseMenuId === course.courseId}
                      aria-label="강의실 옵션 열기"
                    >
                      ⋮
                    </button>
                    {openCourseMenuId === course.courseId && (
                      <div
                        ref={(node) => {
                          if (openCourseMenuId === course.courseId) {
                            actionMenuRef.current = node;
                          }
                        }}
                        className={`absolute right-0 mt-1 w-36 rounded-lg border shadow-lg z-20 ${
                          isDarkMode ? "bg-zinc-800 border-zinc-700" : "bg-white border-gray-200"
                        }`}
                        role="menu"
                        aria-label="강의실 옵션 메뉴"
                      >
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setOpenCourseMenuId(null);
                            onEditCourse?.(course);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs transition-colors rounded-lg cursor-pointer ${
                            isDarkMode
                              ? "text-gray-200 hover:bg-zinc-700"
                              : "text-gray-700 hover:bg-zinc-200"
                          }`}
                          role="menuitem"
                        >
                          강의실 수정
                        </button>
                      </div>
                    )}
                  </div>
                  )}
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
            <p className="text-lg font-medium mb-2">강의실 정보를 불러오는 중...</p>
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
            <p className="text-lg font-medium">강의실 정보를 불러오지 못했습니다.</p>
            {courseDetailError && <p className="text-sm">{courseDetailError}</p>}
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
      (lecture) => lecture.lectureId === selectedLectureId
    );
    const currentWeekLabel = selectedLecture
      ? selectedLecture.weekNumber === 0
        ? "OT"
        : `${selectedLecture.weekNumber}주차`
      : null;

    const weekNumbers = Array.from(
      new Set((courseDetail.lectures || []).map((lec) => lec.weekNumber))
    ).sort((a, b) => {
      if (a === 0) return -1;
      if (b === 0) return 1;
      return a - b;
    });

    // 업로드한 자료 미리보기 (좌: 미리보기 | 우: 채팅) — fileUrl 또는 materialId로 표시
    if (previewFileUrl || previewMaterialId != null) {
      return (
        <div className="flex flex-col h-full">
          <div className={`flex items-center justify-between gap-3 shrink-0 px-4 py-2 border-b ${
            isDarkMode ? "border-zinc-700 bg-[#141414]" : "border-gray-200 bg-white"
          }`}>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { setPreviewFileUrl(null); setPreviewMaterialId(null); setPreviewFileName(null); setPreviewMarkdownContent(null); }}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer ${
                  isDarkMode ? "text-gray-200 hover:bg-zinc-700" : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                목록으로
              </button>
              {previewFileName && (
                <span className={`text-sm break-words min-w-0 flex-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`} title={previewFileName}>
                  {previewFileName}
                </span>
              )}
            </div>
          </div>
          <div className="flex-1 min-h-0 flex">
            {/* 좌: 미리보기 */}
            <div className="flex-1 min-w-0 bg-gray-100 dark:bg-zinc-900 flex flex-col border-r border-zinc-700/50">
              {previewLoading ? (
                <div className={`flex-1 flex items-center justify-center ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                  <p className="text-sm">자료를 불러오는 중…</p>
                </div>
              ) : previewLoadError ? (
                <div className={`flex-1 flex flex-col items-center justify-center p-6 text-center ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                  <p className="text-sm mb-2">미리보기를 불러오지 못했습니다.</p>
                  {previewErrorMessage && (
                    <p className="text-xs mb-2 opacity-90 max-w-sm">{previewErrorMessage}</p>
                  )}
                  <p className="text-xs mb-6 opacity-80">잠시 후 다시 시도해주세요.</p>
                  <button
                    type="button"
                    onClick={() => { setPreviewLoadError(false); setPreviewErrorMessage(null); setPreviewRetryKey((k) => k + 1); }}
                    className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold cursor-pointer ${
                      isDarkMode ? "bg-emerald-600 hover:bg-emerald-500 text-white" : "bg-emerald-600 hover:bg-emerald-700 text-white"
                    }`}
                  >
                    다시 시도
                  </button>
                </div>
              ) : previewMarkdownContent != null ? (
                <div className={`flex-1 min-h-0 overflow-auto p-6 ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}>
                  <article className="prose max-w-none dark:prose-invert [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_code]:break-words">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {previewMarkdownContent}
                    </ReactMarkdown>
                  </article>
                </div>
              ) : previewBlobUrl ? (
                <object
                  data={previewBlobUrl}
                  type="application/pdf"
                  className="w-full h-full border-0 flex-1 min-h-0"
                  title={previewFileName || "자료 미리보기"}
                >
                  <iframe
                    src={previewBlobUrl}
                    title={previewFileName || "자료 미리보기"}
                    className="w-full h-full border-0 flex-1 min-h-0"
                  />
                </object>
              ) : null}
            </div>
            {/* 채팅창 리사이즈 핸들 */}
            <div
              role="separator"
              aria-label="채팅창 너비 조절"
              onMouseDown={handleRightSidebarResizeStart}
              className={`shrink-0 w-1 cursor-col-resize flex items-center justify-center group hover:bg-emerald-500/30 transition-colors ${
                isDarkMode ? "bg-zinc-700" : "bg-gray-200"
              }`}
            >
              <div className={`w-0.5 h-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${
                isDarkMode ? "bg-zinc-400" : "bg-gray-500"
              }`} />
            </div>
            {/* 우: 채팅(강의 학습) 또는 시험 만들기(프로필 API) */}
            <RightSidebar
              width={rightSidebarWidth}
              lectureId={selectedLectureId ?? undefined}
              courseId={courseDetail.courseId}
              viewMode="course-detail"
              courseDetail={courseDetail}
              onLectureDataChange={(_, fileUrl, fileName) => {
                if (fileUrl) {
                  setPreviewFileUrl(fileUrl);
                  setPreviewFileName(fileName);
                }
              }}
              examProps={isTeacher ? {
                examMode: rightSidebarExamMode,
                onExamModeChange: setRightSidebarExamMode,
                isTeacher,
                examType,
                setExamType,
                examTopic,
                setExamTopic,
                examCount,
                setExamCount,
                examDesignMessages,
                setExamDesignMessages,
                examDesignInput,
                setExamDesignInput,
                examProfileLoading,
                sendExamProfileMessage,
                onCreateExam: handleExamGenAsyncSubmit,
                submitting,
                onRecoverSession: handleExamSessionRecoverOpen,
                recoverOpen: examRecoverOpen,
                recoverSelectedId: examRecoverSelectedId,
                setRecoverSelectedId: setExamRecoverSelectedId,
                recoverExams: localExams[selectedLectureId ?? 0] ?? [],
                onRecoverSubmit: handleExamSessionRecoverSubmit,
                setRecoverOpen: setExamRecoverOpen,
              } : null}
            />
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-1.5 h-full">
        {/* 자료 생성 중 표시 (모달 닫은 후 백그라운드 진행 시) */}
        {materialAsyncTaskId && (
          <div className={`shrink-0 flex items-center gap-3 px-4 py-2.5 rounded-xl border ${isDarkMode ? "bg-emerald-900/30 border-emerald-700 text-emerald-200" : "bg-emerald-50 border-emerald-200 text-emerald-800"}`}>
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden />
            <span className="text-sm font-medium">자료 생성 중: {materialKeyword.trim() || "AI 자료"}</span>
            <span className="text-xs opacity-80">완료 시 목록에 자동 추가됩니다.</span>
          </div>
        )}
        {/* 상단 컨트롤 영역: N주차 목록 / 삭제 / 정렬 */}
        <div className={`flex-1 flex flex-col min-h-0 overflow-hidden ${
          isDarkMode ? "bg-[#141414]" : "bg-white"
        }`}>
          <div
            className={`flex items-center justify-between gap-3 shrink-0 pb-3 border-b ${
              isDarkMode ? "border-zinc-700" : "border-gray-200"
            }`}
          >
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pr-2">
              {weekNumbers.map((week) => {
                const label = week === 0 ? "OT" : `${week}주차`;
                const isActive =
                  selectedLecture &&
                  selectedLecture.weekNumber === week;
                return (
                  <button
                    key={week}
                    type="button"
                    onClick={() => {
                      if (!onSelectLecture || !courseDetail.lectures) return;
                      const target = courseDetail.lectures.find(
                        (lec) => lec.weekNumber === week
                      );
                      if (target) {
                        onSelectLecture(target.lectureId);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
                      isActive
                        ? "bg-emerald-600 text-white"
                        : isDarkMode
                        ? "bg-zinc-800 text-gray-200 hover:bg-zinc-700"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
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
            </div>
            <div className="flex items-center gap-2 ml-auto">
              {isTeacher && (
                <div className="flex items-center gap-1 mr-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (!selectedLectureId) {
                        window.alert("강의를 먼저 선택해주세요.");
                        return;
                      }
                      setBulkEditMode((v) => !v);
                      if (bulkEditMode) {
                        setBulkSelectedIds({});
                      }
                    }}
                    className={`px-2 py-1 text-[11px] cursor-pointer ${
                      isDarkMode
                        ? "bg-zinc-800 border-zinc-600 text-gray-200 hover:bg-zinc-700"
                        : "bg-white border-gray-300 text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {bulkEditMode ? "삭제 취소" : "삭제"}
                  </button>
                  {bulkEditMode && (
                    <button
                      type="button"
                      onClick={handleBulkDelete}
                      className="px-2 py-1 text-[11px] rounded border border-red-500 text-red-600 cursor-pointer hover:bg-red-50 dark:text-red-400 dark:border-red-500 dark:hover:bg-red-500/10"
                    >
                      선택 삭제
                    </button>
                  )}
                </div>
              )}
              {lectureResourcesLoading && (
                <span className="text-[11px] opacity-70">
                  불러오는 중...
                </span>
              )}
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as "recent" | "name" | "type")}
                className={`text-[11px] px-2 py-1 rounded border cursor-pointer ${
                  isDarkMode ? "bg-zinc-800 border-zinc-600 text-gray-200" : "bg-white border-gray-200 text-gray-700"
                }`}
              >
                <option value="recent">최신순</option>
                <option value="name">이름순</option>
                <option value="type">유형별</option>
              </select>
            </div>
          </div>

          {/* 강의 리소스 박스 그리드 영역 */}
          <div
            className={`flex-1 overflow-y-auto pt-3 ${
              isDarkMode ? "text-gray-200" : "text-gray-800"
            }`}
          >
            {assessmentsLoading ? (
              <div className="flex items-center justify-center py-12 text-sm opacity-70">목록 불러오는 중...</div>
            ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-6">
              {sortedItems.map((item) => {
              const selectable = isTeacher && (item.type === "material" || item.type === "exam");
              const checked = !!bulkSelectedIds[item.id];
              return (
              <div
                key={item.id}
                className={`text-left rounded-2xl transition-all flex flex-col cursor-pointer focus:outline-none relative overflow-hidden ${
                  isDarkMode
                    ? "bg-[#ffffff14] border border-zinc-800"
                    : "bg-[#4040401f] border border-[#E5E7EB]"
                } ${
                  bulkEditMode && selectable && checked ? "ring-2 ring-emerald-500" : ""
                } focus:ring-2 ${
                  isDarkMode
                    ? "focus:ring-zinc-500/60 focus:ring-offset-zinc-950"
                    : "focus:ring-emerald-500/60 focus:ring-offset-white"
                } shadow-sm relative group/card`}
              >
                  <button
                    type="button"
                    onClick={() => {
                      if (bulkEditMode && selectable) {
                        handleToggleBulkSelect(item.id);
                      } else {
                        handleCardClick(item);
                      }
                    }}
                    className={`w-full h-full text-left flex flex-col p-6 ${
                      isDarkMode
                        ? "hover:bg-zinc-900/90"
                        : ""
                    }`}
                  >
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <p className={`text-xs mt-1 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                      {item.meta}
                      {item.type === "material" && !item.fileUrl && " · 클릭 시 안내"}
                    </p>
                  </button>
                  {selectable && bulkEditMode && (
                    <label
                      className={`absolute top-1.5 left-1.5 flex items-center justify-center w-5 h-5 rounded ${
                        isDarkMode ? "bg-zinc-900/80" : "bg-white/90"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleToggleBulkSelect(item.id)}
                        className="w-3 h-3"
                      />
                    </label>
                  )}
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
    window.addEventListener("open-course-modal" as any, handleOpenCourse as any);
    return () => {
      window.removeEventListener("open-course-modal" as any, handleOpenCourse as any);
    };
  }, [isTeacher, viewMode]);

  const renderCourseDetailHeader = () => {
    if (viewMode !== "course-detail" || !courseDetail) {
      return null;
    }

    const showInviteButton = isTeacher && courseDetail.invitationCode;

    return (
      <div
        className={`h-[50px] flex items-center justify-end ${
          isDarkMode ? "bg-[#141414]" : "bg-white"
        }`}
      >
        <div className="flex items-center gap-2">
          {isTeacher && courseDetail?.courseId != null && (
            <button
              type="button"
              onClick={handleCopyCourseId}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors cursor-pointer ${
                isDarkMode
                  ? "border-zinc-600 text-gray-200 hover:bg-zinc-700"
                  : "border-gray-300 text-gray-700 hover:bg-gray-100"
              }`}
              title="강의실 ID 복사"
            >
              <span className="text-sm font-medium">강의실 ID: {courseDetail.courseId}</span>
              <svg className="w-4 h-4 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          )}
          {showInviteButton && (
            <button
              type="button"
              onClick={handleCopyInvitationLink}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer"
            >
              <svg className="w-[20px] h-[20px] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span className="text-sm font-medium">초대 링크 복사</span>
            </button>
          )}
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
      </div>
    );
  };

  const renderSettingsHeader = () => {
    return null;
  };

  return (
    <>
      <div
        className={`flex-1 flex flex-col min-h-0 gap-1.5 transition-colors px-5 sm:px-6 lg:px-8 xl:px-20 ${
          isDarkMode ? "bg-[#141414]" : "bg-white"
        }`}
      >
        {renderCourseListHeader()}
        {renderCourseDetailHeader()}
        {renderSettingsHeader()}
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
          {selectedMenu === "settings" ? (
            <SettingsPage />
          ) : viewMode === "course-list" ? (
            renderCourseList()
          ) : (
            renderCourseDetail()
          )}
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
            <div className={`flex items-center justify-between px-5 py-4 border-b ${
              isDarkMode ? "border-zinc-700/50" : "border-gray-200"
            }`}>
              <h2 className={`text-lg font-semibold ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>
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
                <label className={`block text-sm font-medium mb-1 ${
                  isDarkMode ? "text-gray-200" : "text-gray-700"
                }`}>
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
                  } focus:outline-none focus:ring-2 ${isDarkMode ? 'focus:ring-zinc-500' : 'focus:ring-emerald-500'}`}
                  autoFocus
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${
                  isDarkMode ? "text-gray-200" : "text-gray-700"
                }`}>
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
                  } focus:outline-none focus:ring-2 ${isDarkMode ? 'focus:ring-zinc-500' : 'focus:ring-emerald-500'}`}
                />
              </div>
            </div>

            <div className={`px-5 py-4 border-t flex justify-end gap-2 ${
              isDarkMode ? "border-zinc-700/50" : "border-gray-200"
            }`}>
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
                    isDarkMode ? "focus:ring-emerald-500" : "focus:ring-emerald-500"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true" onClick={() => !submitting && handleCloseUploadModal()}>
          <div className={`w-full max-w-md rounded-xl shadow-xl border ${isDarkMode ? "bg-zinc-900 border-zinc-700" : "bg-white border-gray-200"}`} onClick={(e) => e.stopPropagation()}>
            <div className={`flex justify-between items-center px-5 py-4 border-b ${isDarkMode ? "border-zinc-700" : "border-gray-200"}`}>
              <h2 className={`text-lg font-semibold ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>자료 업로드</h2>
              <button type="button" onClick={() => !submitting && handleCloseUploadModal()} className="p-1.5 rounded hover:bg-black/10" aria-label="닫기">✕</button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                강의에 첨부할 <strong className={isDarkMode ? "text-gray-300" : "text-gray-700"}>PDF 파일</strong>을 선택하세요.
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
                  onDragOver={(e) => { e.preventDefault(); setUploadDragOver(true); }}
                  onDragLeave={() => setUploadDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setUploadDragOver(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file && file.type === "application/pdf") setUploadFile(file);
                  }}
                  className={`flex flex-col items-center justify-center gap-3 py-8 px-4 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
                    uploadDragOver
                      ? isDarkMode ? "border-emerald-500 bg-emerald-900/20" : "border-emerald-500 bg-emerald-50"
                      : isDarkMode
                        ? "border-zinc-600 bg-zinc-800/50 hover:border-zinc-500 hover:bg-zinc-800 text-gray-300"
                        : "border-gray-300 bg-gray-50 hover:border-emerald-400 hover:bg-emerald-50/50 text-gray-600"
                  }`}
                >
                  <svg className="w-10 h-10 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span className="text-sm font-medium">PDF 파일을 여기에 끌어다 놓거나</span>
                  <span className={`text-sm font-medium px-4 py-2 rounded-lg ${isDarkMode ? "bg-zinc-700 text-white" : "bg-emerald-600 text-white"}`}>파일 선택</span>
                </label>
              ) : (
                <div className={`flex items-center justify-between gap-3 py-3 px-4 rounded-xl border ${isDarkMode ? "bg-zinc-800 border-zinc-600" : "bg-gray-50 border-gray-200"}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <svg className="w-8 h-8 shrink-0 text-red-500 opacity-80" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium truncate" title={uploadFile.name}>{uploadFile.name}</span>
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
            <div className={`px-5 py-4 border-t flex justify-end gap-2 ${isDarkMode ? "border-zinc-700" : "border-gray-200"}`}>
              <button type="button" onClick={() => !submitting && handleCloseUploadModal()} className={`px-4 py-2 text-sm rounded ${isDarkMode ? "bg-zinc-800 text-gray-200" : "bg-gray-100 text-gray-700"}`}>취소</button>
              <button type="button" onClick={handleUploadSubmit} disabled={submitting || !uploadFile} className="px-4 py-2 text-sm rounded font-medium bg-emerald-600 text-white disabled:opacity-50 cursor-pointer">{submitting ? "업로드 중..." : "업로드"}</button>
            </div>
          </div>
        </div>
      )}

      {/* 강의자료 생성 모달 (Phase 1~5 단계형) */}
      {materialGenModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true" onClick={() => { if (!submitting) { resetMaterialGenModal(); setMaterialGenModalOpen(false); } }}>
          <div className={`w-full max-w-lg rounded-xl shadow-xl border ${isDarkMode ? "bg-zinc-900 border-zinc-700" : "bg-white border-gray-200"}`} onClick={(e) => e.stopPropagation()}>
            <div className={`flex justify-between items-center px-5 py-4 border-b ${isDarkMode ? "border-zinc-700" : "border-gray-200"}`}>
              <h2 className={`text-lg font-semibold ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>
                강의자료 생성 {materialGenStep > 1 && `(단계 ${materialGenStep}/5)`}
              </h2>
              <button type="button" onClick={() => { if (!submitting) { resetMaterialGenModal(); setMaterialGenModalOpen(false); } }} className="p-1.5 rounded hover:bg-black/10">✕</button>
            </div>
            <div className="px-5 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Step 1: 키워드 입력 (PDF는 완전 선택 사항이므로 UI에서 제거) */}
              {materialGenStep === 1 && (
                <>
                  <p className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                    새로 기획안을 만들거나, 이전에 작성 중이던 기획안을 이어서 수정·확정할 수 있습니다.
                  </p>
                  <button
                    type="button"
                    onClick={handleLoadLatestMaterialSession}
                    disabled={submitting}
                    className={`w-full py-2 px-3 text-sm rounded border ${isDarkMode ? "border-zinc-600 text-gray-200 hover:bg-zinc-800" : "border-gray-300 text-gray-700 hover:bg-gray-100"} disabled:opacity-50`}
                  >
                    {submitting ? "불러오는 중…" : "최근 사용한 기획안 불러오기"}
                  </button>
                  <div className={`border-t pt-4 ${isDarkMode ? "border-zinc-700" : "border-gray-200"}`}>
                    <label className={`block text-sm font-medium mb-1 ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}>새 기획안 만들기 — 주제 또는 키워드</label>
                    <input type="text" value={materialKeyword} onChange={(e) => setMaterialKeyword(e.target.value)} placeholder="예: 강화학습 DQN" className={`w-full px-3 py-2 text-sm rounded border ${isDarkMode ? "bg-zinc-800 border-zinc-600 text-white" : "bg-white border-gray-300 text-gray-900"}`} />
                  </div>
                </>
              )}

              {/* Step 2: 기획안 확인 / 확정 또는 수정 */}
              {materialGenStep === 2 && (
                <>
                  {materialDraftPlan && (
                    <div className={`space-y-4 text-sm rounded-lg border p-4 max-h-[50vh] overflow-y-auto ${isDarkMode ? "bg-zinc-800/50 border-zinc-600" : "bg-gray-50 border-gray-200"}`}>
                      {/* 프로젝트 개요 */}
                      {Boolean(
                        materialDraftPlan.project_meta &&
                          typeof materialDraftPlan.project_meta === "object"
                      ) && (
                        <div>
                          <h3 className={`font-semibold mb-1.5 ${isDarkMode ? "text-emerald-400" : "text-emerald-700"}`}>📋 프로젝트 개요</h3>
                          <ul className={`space-y-0.5 text-xs ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                            {(materialDraftPlan.project_meta as Record<string, unknown>).title != null && <li><span className="font-medium">제목:</span> {String((materialDraftPlan.project_meta as Record<string, unknown>).title)}</li>}
                            {(materialDraftPlan.project_meta as Record<string, unknown>).goal != null && <li><span className="font-medium">목표:</span> {String((materialDraftPlan.project_meta as Record<string, unknown>).goal)}</li>}
                            {(materialDraftPlan.project_meta as Record<string, unknown>).target_audience != null && <li><span className="font-medium">대상:</span> {String((materialDraftPlan.project_meta as Record<string, unknown>).target_audience)}</li>}
                            {(materialDraftPlan.project_meta as Record<string, unknown>).description != null && <li><span className="font-medium">설명:</span> {String((materialDraftPlan.project_meta as Record<string, unknown>).description)}</li>}
                          </ul>
                        </div>
                      )}
                      {/* 작성 스타일 */}
                      {Boolean(
                        materialDraftPlan.style_guide &&
                          typeof materialDraftPlan.style_guide === "object"
                      ) && (
                        <div>
                          <h3 className={`font-semibold mb-1.5 ${isDarkMode ? "text-emerald-400" : "text-emerald-700"}`}>✒️ 작성 스타일</h3>
                          <ul className={`space-y-0.5 text-xs ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                            {(materialDraftPlan.style_guide as Record<string, unknown>).tone != null && <li><span className="font-medium">톤:</span> {String((materialDraftPlan.style_guide as Record<string, unknown>).tone)}</li>}
                            {(materialDraftPlan.style_guide as Record<string, unknown>).formatting != null && <li><span className="font-medium">서식:</span> {String((materialDraftPlan.style_guide as Record<string, unknown>).formatting)}</li>}
                            {(materialDraftPlan.style_guide as Record<string, unknown>).detail_level != null && <li><span className="font-medium">상세도:</span> {String((materialDraftPlan.style_guide as Record<string, unknown>).detail_level)}</li>}
                            {(materialDraftPlan.style_guide as Record<string, unknown>).math_policy != null && <li><span className="font-medium">수식:</span> {String((materialDraftPlan.style_guide as Record<string, unknown>).math_policy)}</li>}
                            {(materialDraftPlan.style_guide as Record<string, unknown>).example_policy != null && <li><span className="font-medium">예시:</span> {String((materialDraftPlan.style_guide as Record<string, unknown>).example_policy)}</li>}
                          </ul>
                        </div>
                      )}
                      {/* 챕터 구성 */}
                      {Array.isArray(materialDraftPlan.chapters) && materialDraftPlan.chapters.length > 0 && (
                        <div>
                          <h3 className={`font-semibold mb-2 ${isDarkMode ? "text-emerald-400" : "text-emerald-700"}`}>📑 챕터 구성 ({materialDraftPlan.chapters.length}개)</h3>
                          <ol className="space-y-3 list-decimal list-inside">
                            {materialDraftPlan.chapters.map((ch: unknown, i: number) => {
                              const c = ch as Record<string, unknown>;
                              const title = c.title != null ? String(c.title) : `챕터 ${i + 1}`;
                              const objective = c.objective != null ? String(c.objective) : null;
                              const keyTopics = Array.isArray(c.key_topics) ? c.key_topics as string[] : [];
                              const mustInclude = Array.isArray(c.must_include) ? c.must_include as string[] : [];
                              return (
                                <li key={i} className={`pl-1 border-l-2 ${isDarkMode ? "border-zinc-600" : "border-gray-300"}`}>
                                  <span className={`font-medium ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>{title}</span>
                                  {objective && <p className={`mt-0.5 text-xs ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>{objective}</p>}
                                  {keyTopics.length > 0 && (
                                    <p className={`mt-1 text-xs ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                                      <span className="font-medium">주요 주제:</span> {keyTopics.slice(0, 4).join(" · ")}{keyTopics.length > 4 ? " …" : ""}
                                    </p>
                                  )}
                                  {mustInclude.length > 0 && (
                                    <ul className="mt-0.5 text-xs list-disc list-inside text-gray-500">
                                      {mustInclude.slice(0, 2).map((s, j) => <li key={j}>{s}</li>)}
                                      {mustInclude.length > 2 && <li>외 {mustInclude.length - 2}개</li>}
                                    </ul>
                                  )}
                                </li>
                              );
                            })}
                          </ol>
                        </div>
                      )}
                      {/* 알 수 없는 구조면 JSON 폴백 */}
                      {!materialDraftPlan.project_meta && !materialDraftPlan.style_guide && !(Array.isArray(materialDraftPlan.chapters) && materialDraftPlan.chapters.length > 0) && (
                        <pre className={`text-xs p-2 rounded overflow-x-auto ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>{JSON.stringify(materialDraftPlan, null, 2)}</pre>
                      )}
                    </div>
                  )}
                  {!materialDraftPlan && <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>기획안이 생성되었습니다. 확정하거나 수정 요청을 입력하세요.</p>}
                  {!materialPhase2UpdateMode ? (
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={handleMaterialPhase2Confirm} disabled={submitting} className="px-4 py-2 text-sm rounded font-medium bg-emerald-600 text-white disabled:opacity-50">기획안 확정</button>
                      <button type="button" onClick={() => setMaterialPhase2UpdateMode(true)} disabled={submitting} className={`px-4 py-2 text-sm rounded font-medium ${isDarkMode ? "bg-zinc-700 text-gray-200" : "bg-gray-200 text-gray-800"}`}>수정 요청</button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}>수정 요청 사항</label>
                        <textarea value={materialPhase2Feedback} onChange={(e) => setMaterialPhase2Feedback(e.target.value)} placeholder="수정하고 싶은 내용을 입력하세요" rows={3} className={`w-full px-3 py-2 text-sm rounded border ${isDarkMode ? "bg-zinc-800 border-zinc-600 text-white" : "bg-white border-gray-300 text-gray-900"}`} />
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={handleMaterialPhase2Update} disabled={submitting} className="px-4 py-2 text-sm rounded font-medium bg-emerald-600 text-white disabled:opacity-50">{submitting ? "반영 중..." : "반영 후 다시 보기"}</button>
                        <button type="button" onClick={() => { setMaterialPhase2UpdateMode(false); setMaterialPhase2Feedback(""); }} disabled={submitting} className={`px-4 py-2 text-sm rounded ${isDarkMode ? "bg-zinc-700 text-gray-200" : "bg-gray-200 text-gray-800"}`}>취소</button>
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
                      <p className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>챕터·검증·최종 문서를 생성하고 있습니다.</p>
                      {streamedMaterialProgress && (
                        <p className={`text-xs font-medium ${isDarkMode ? "text-emerald-400" : "text-emerald-700"}`}>{streamedMaterialProgress}</p>
                      )}
                      {(streamedMaterialContent.length > 0) && (
                        <div className={`rounded-lg border overflow-hidden max-h-48 min-h-[8rem] flex flex-col ${isDarkMode ? "bg-zinc-800 border-zinc-600" : "bg-gray-50 border-gray-200"}`}>
                          <p className={`shrink-0 px-3 py-1.5 text-xs font-medium ${isDarkMode ? "text-gray-400 bg-zinc-800" : "text-gray-500 bg-gray-100"}`}>실시간 미리보기</p>
                          <div className={`flex-1 min-h-0 overflow-y-auto p-3 text-sm ${isDarkMode ? "text-gray-200" : "text-gray-800"}`}>
                            <article className="prose prose-sm max-w-none dark:prose-invert [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_code]:break-words">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamedMaterialContent}</ReactMarkdown>
                            </article>
                          </div>
                        </div>
                      )}
                      <p className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>아래 [닫기]를 누르면 모달만 닫히고, 작업은 백그라운드에서 계속됩니다. 완료되면 목록에 자동으로 추가됩니다.</p>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setMaterialGenModalOpen(false)} className={`px-4 py-2 text-sm rounded font-medium ${isDarkMode ? "bg-zinc-700 text-gray-200" : "bg-gray-200 text-gray-800"}`}>닫고 다른 작업하기</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
                        챕터 내용 생성·검증·최종 문서 생성을 한 번에 실행합니다.
                      </p>
                      <button type="button" onClick={handleMaterialPhase3To5Async} disabled={submitting} className="px-4 py-2 text-sm rounded font-medium bg-emerald-600 text-white disabled:opacity-50">{submitting ? "처리 중… (완료될 때까지 잠시 기다려 주세요)" : "Phase 3~5 실행"}</button>
                    </>
                  )}
                </div>
              )}

              {/* Step 4: (async 사용 시 건너뜀, 기존 단계별 진행용 유지) */}
              {materialGenStep === 4 && (
                <div className="space-y-3">
                  {materialChapterSummary && <p className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>{materialChapterSummary}</p>}
                  <p className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>내용을 검증합니다.</p>
                  <button type="button" onClick={handleMaterialPhase4} disabled={submitting} className="px-4 py-2 text-sm rounded font-medium bg-emerald-600 text-white disabled:opacity-50">{submitting ? "검증 중..." : "내용 검증"}</button>
                </div>
              )}

              {/* Step 5: 최종 문서 생성 및 완료 — 화면에는 반드시 finalDocument만 사용 */}
              {materialGenStep === 5 && (
                <div className="space-y-3">
                  {materialVerifiedSummary && <p className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>{materialVerifiedSummary}</p>}
                  {materialFinalDocument == null && materialFinalUrl == null ? (
                    <>
                      {materialCompletedViaAsync ? (
                        <>
                          <p className={`text-sm ${isDarkMode ? "text-amber-300" : "text-amber-700"}`}>문서 링크가 아직 반영되지 않았을 수 있습니다.</p>
                          <p className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>백엔드에서 완료 후 finalDocument/documentUrl을 내려주면 여기서 보입니다. 잠시 후 목록에서 확인하거나 닫아 주세요.</p>
                          <button type="button" onClick={() => { resetMaterialGenModal(); setMaterialGenModalOpen(false); }} className={`px-4 py-2 text-sm rounded ${isDarkMode ? "bg-zinc-700 text-gray-200" : "bg-gray-200 text-gray-800"}`}>닫기</button>
                        </>
                      ) : (
                        <>
                          <p className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>최종 문서를 생성합니다.</p>
                          <button type="button" onClick={handleMaterialPhase5} disabled={submitting} className="px-4 py-2 text-sm rounded font-medium bg-emerald-600 text-white disabled:opacity-50">{submitting ? "생성 중..." : "최종 문서 생성"}</button>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      <p className={`text-sm ${isDarkMode ? "text-green-300" : "text-green-700"}`}>문서 생성이 완료되었습니다.</p>
                      {materialFinalDocument && (
                        <div className={`rounded border overflow-auto max-h-48 p-3 text-left ${isDarkMode ? "bg-zinc-800 border-zinc-600 text-gray-200" : "bg-gray-50 border-gray-200 text-gray-900"}`}>
                          <article className="prose prose-sm max-w-none dark:prose-invert [&_pre]:max-w-full [&_pre]:overflow-x-auto">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{materialFinalDocument}</ReactMarkdown>
                          </article>
                        </div>
                      )}
                      {materialFinalUrl && (
                        <p className="text-sm">
                          <a href={materialFinalUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-600 underline">문서 보기/다운로드</a>
                        </p>
                      )}
                      <div className="flex gap-2 pt-2">
                        <button type="button" onClick={handleMaterialGenAddToList} className="px-4 py-2 text-sm rounded font-medium bg-emerald-600 text-white">목록에 추가하고 닫기</button>
                        <button type="button" onClick={() => { resetMaterialGenModal(); setMaterialGenModalOpen(false); }} className={`px-4 py-2 text-sm rounded ${isDarkMode ? "bg-zinc-700 text-gray-200" : "bg-gray-200 text-gray-800"}`}>닫기</button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
            {materialGenStep === 1 && (
              <div className={`px-5 py-4 border-t flex justify-end gap-2 ${isDarkMode ? "border-zinc-700" : "border-gray-200"}`}>
                <button type="button" onClick={() => { resetMaterialGenModal(); setMaterialGenModalOpen(false); }} className={`px-4 py-2 text-sm rounded ${isDarkMode ? "bg-zinc-800 text-gray-200" : "bg-gray-100 text-gray-700"}`}>취소</button>
                <button type="button" onClick={handleMaterialGenSubmit} disabled={submitting || !materialKeyword.trim()} className="px-4 py-2 text-sm rounded font-medium bg-emerald-600 text-white disabled:opacity-50 cursor-pointer">{submitting ? "생성 중..." : "기획안 생성"}</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 시험 세션 상세 모달 */}
      {examDetailSessionId && (
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
              setExamAnswerVisible({});
              setFiveChoiceUserAnswers({});
              setFiveChoiceLog(null);
            }
          }}
        >
          <div
            className={`w-full max-w-3xl max-h-[80vh] overflow-hidden rounded-xl shadow-xl border ${
              isDarkMode ? "bg-zinc-900 border-zinc-700 text-gray-100" : "bg-white border-gray-200 text-gray-900"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`flex items-center justify-between px-5 py-4 border-b ${isDarkMode ? "border-zinc-700/60" : "border-gray-200"}`}>
              <div>
                <h2 className="text-lg font-semibold">시험 세션 상세</h2>
                <p className="text-xs mt-0.5 opacity-80">
                  세션 ID: {examDetailSessionId}
                  {examDetail?.examType && ` · 유형: ${examDetail.examType}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!examDetailLoading) {
                    setExamDetailSessionId(null);
                    setExamDetail(null);
                    setExamDetailError(null);
                    setExamDetailFlipped({});
                    setExamAnswerVisible({});
                    setFiveChoiceUserAnswers({});
                    setFiveChoiceLog(null);
                  }
                }}
                className={`p-1.5 rounded cursor-pointer ${isDarkMode ? "hover:bg-zinc-800" : "hover:bg-gray-100"}`}
              >
                ✕
              </button>
            </div>
            <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {examDetailLoading && (
                <p className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>시험 세션 정보를 불러오는 중입니다...</p>
              )}
              {examDetailError && (
                <p className={`text-sm ${isDarkMode ? "text-red-300" : "text-red-600"}`}>{examDetailError}</p>
              )}
              {!examDetailLoading && !examDetailError && examDetail && (
                <>
                  {examDetail.usedProfile && (
                    <div className={`rounded-lg border text-xs p-3 ${isDarkMode ? "border-zinc-700 bg-zinc-900/60" : "border-gray-200 bg-gray-50"}`}>
                      <p className="font-semibold mb-1">사용된 Profile</p>
                      <div className="flex flex-wrap gap-2">
                        {examDetail.usedProfile.learningGoal?.focusAreas && examDetail.usedProfile.learningGoal.focusAreas.length > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-600/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/40">
                            집중 영역: {examDetail.usedProfile.learningGoal.focusAreas.join(", ")}
                          </span>
                        )}
                        {examDetail.usedProfile.userStatus?.proficiencyLevel && (
                          <span className="px-2 py-0.5 rounded-full bg-blue-600/10 text-blue-600 dark:text-blue-300 border border-blue-500/40">
                            수준: {examDetail.usedProfile.userStatus.proficiencyLevel}
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
                        <p className={`text-sm py-4 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                          표시할 문항이 없습니다. 시험을 비동기로 생성했다면 아직 생성 중일 수 있어요. 잠시 후 목록에서 다시 클릭하거나 새로고침해 보세요.
                        </p>
                      );
                    }
                    return null;
                  })()}
                  {examDetail.flashCards && examDetail.flashCards.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold">플래시카드 ({examDetail.flashCards.length}개)</h3>
                        <span className="text-xs opacity-70">카드를 클릭하면 앞/뒷면이 전환됩니다.</span>
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
                                <span className="text-[10px] font-semibold opacity-70">#{id}</span>
                                {card.categoryTag && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-600/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30">
                                    {card.categoryTag}
                                  </span>
                                )}
                              </div>
                              <div className="mt-1 min-h-[60px]">
                                <p className="text-[11px] whitespace-pre-line">
                                  {flipped ? card.backContent : card.frontContent}
                                </p>
                              </div>
                              <div className="mt-2 flex items-center justify-between text-[10px] opacity-70">
                                <span>{flipped ? "정답 / 개념명" : "질문 / 힌트"}</span>
                                <span>{flipped ? "앞면 보기" : "뒷면 보기"}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {examDetail.oxProblems && examDetail.oxProblems.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold">O/X 문제 ({examDetail.oxProblems.length}개)</h3>
                      <ol className="space-y-2 text-xs list-decimal list-inside">
                        {examDetail.oxProblems.map((q, idx) => {
                          const key = `ox-${idx}`;
                          const show = !!examAnswerVisible[key];
                          return (
                            <li key={idx} className={`rounded-lg border p-2 ${isDarkMode ? "border-zinc-700" : "border-gray-200"}`}>
                              <p className="font-medium mb-1">{q.questionContent}</p>
                              <button
                                type="button"
                                onClick={() => toggleExamAnswerVisible(key)}
                                className={`mt-1 inline-flex items-center px-2 py-1 rounded text-[11px] cursor-pointer ${
                                  isDarkMode ? "bg-zinc-800 text-gray-200" : "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {show ? "정답/해설 숨기기" : "정답/해설 보기"}
                              </button>
                              {show && (
                                <>
                                  <p className="mt-1 text-[11px]">
                                    <span className="font-semibold">정답:</span> {q.correctAnswer}
                                  </p>
                                  {q.explanation && (
                                    <p className="mt-1 text-[11px] opacity-80 whitespace-pre-line">해설: {q.explanation}</p>
                                  )}
                                </>
                              )}
                            </li>
                          );
                        })}
                      </ol>
                    </div>
                  )}
                  {examDetail.fiveChoiceProblems && examDetail.fiveChoiceProblems.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold">5지선다 ({examDetail.fiveChoiceProblems.length}개)</h3>
                      <ol className="space-y-3 text-xs list-decimal list-inside">
                        {examDetail.fiveChoiceProblems.map((q, idx) => {
                          const key = `mc-${idx}`;
                          const show = !!examAnswerVisible[key];
                          return (
                            <li key={idx} className={`rounded-lg border p-2 ${isDarkMode ? "border-zinc-700" : "border-gray-200"}`}>
                              <p className="font-medium mb-1">{q.questionContent}</p>
                              <ul className="space-y-0.5 mt-1">
                                {q.options.map((opt) => (
                                  <li key={opt.id} className="flex items-start gap-2">
                                    <label className="inline-flex items-start gap-1 cursor-pointer">
                                      <input
                                        type="radio"
                                        name={`five-choice-${idx}`}
                                        value={opt.id}
                                        className="mt-0.5"
                                        checked={fiveChoiceUserAnswers[String(idx)] === opt.id}
                                        onChange={() => handleFiveChoiceAnswerChange(idx, opt.id)}
                                      />
                                      <span className="text-[11px]">
                                        <span className="font-semibold mr-1">{opt.id}.</span>
                                        <span>{opt.content}</span>
                                        {show && opt.isCorrect && (
                                          <span className="ml-1 text-[10px] text-emerald-500">(정답)</span>
                                        )}
                                      </span>
                                    </label>
                                  </li>
                                ))}
                              </ul>
                              <button
                                type="button"
                                onClick={() => toggleExamAnswerVisible(key)}
                                className={`mt-1 inline-flex items-center px-2 py-1 rounded text-[11px] cursor-pointer ${
                                  isDarkMode ? "bg-zinc-800 text-gray-200" : "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {show ? "정답/해설 숨기기" : "정답/해설 보기"}
                              </button>
                              {show && (
                                <>
                                  <p className="mt-1 text-[11px]">
                                    <span className="font-semibold">정답:</span> {q.correctAnswer}
                                  </p>
                                  {q.intentDiagnosis && (
                                    <p className="mt-1 text-[11px] opacity-80 whitespace-pre-line">
                                      출제 의도: {q.intentDiagnosis}
                                    </p>
                                  )}
                                </>
                              )}
                            </li>
                          );
                        })}
                      </ol>
                      <div className="mt-2 flex flex-col gap-1">
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={handleFiveChoiceGrade}
                            className={`inline-flex items-center px-3 py-1.5 rounded text-[11px] font-medium cursor-pointer ${
                              isDarkMode ? "bg-emerald-600 text-white" : "bg-emerald-600 text-white"
                            }`}
                          >
                            선택한 답안 채점하기
                          </button>
                          <p className="text-[11px] opacity-70">
                            각 문항에 대해 하나의 선택지를 고른 뒤 채점 버튼을 눌러주세요.
                          </p>
                        </div>
                        {fiveChoiceLog && fiveChoiceLog.evaluationItems.length > 0 && (
                          <div
                            className={`mt-2 rounded-lg border p-2 text-[11px] ${
                              isDarkMode ? "border-zinc-700 bg-zinc-900/60" : "border-gray-200 bg-gray-50"
                            }`}
                          >
                            <p className="font-semibold mb-1">5지선다 채점 결과 및 피드백</p>
                            <ul className="space-y-1.5">
                              {fiveChoiceLog.evaluationItems.map((item) => (
                                <li key={item.questionId} className="border-b last:border-b-0 pb-1 last:pb-0 border-dashed border-gray-300 dark:border-zinc-700">
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium">
                                      문항 {item.questionId} —{" "}
                                      <span
                                        className={
                                          item.resultStatus === "Correct"
                                            ? "text-emerald-500"
                                            : "text-red-500"
                                        }
                                      >
                                        {item.resultStatus === "Correct" ? "정답" : "오답"}
                                      </span>
                                    </span>
                                    {item.relatedTopic && (
                                      <span className="text-[10px] opacity-70">
                                        주제: {item.relatedTopic}
                                      </span>
                                    )}
                                  </div>
                                  <p className="mt-0.5">
                                    <span className="font-semibold">선택한 답:</span>{" "}
                                    {item.userResponse}
                                  </p>
                                  {item.feedbackMessage && (
                                    <p className="mt-0.5 opacity-80 whitespace-pre-line">
                                      {item.feedbackMessage}
                                    </p>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {examDetail.shortAnswerProblems && examDetail.shortAnswerProblems.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold">
                        단답형 / 서술형 ({examDetail.shortAnswerProblems.length}개)
                      </h3>
                      <ol className="space-y-3 text-xs list-decimal list-inside">
                        {examDetail.shortAnswerProblems.map((q, idx) => {
                          const key = `sa-${idx}`;
                          const show = !!examAnswerVisible[key];
                          const anyKeywords =
                            (Array.isArray((q as any).relatedKeywords) && (q as any).relatedKeywords.length > 0
                              ? (q as any).relatedKeywords
                              : Array.isArray((q as any).keyKeywords)
                              ? (q as any).keyKeywords
                              : []) as string[];
                          const type = (q as any).type as "Short_Keyword" | "Descriptive" | undefined;
                          const modelAnswer = (q as any).modelAnswer || (q as any).bestAnswer;
                          const intentText = (q as any).intentDiagnosis || (q as any).evaluationCriteria;

                          return (
                            <li
                              key={idx}
                              className={`rounded-lg border p-2 ${
                                isDarkMode ? "border-zinc-700" : "border-gray-200"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <p className="font-medium flex-1">{q.questionContent}</p>
                                {type && (
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] shrink-0 ${
                                      isDarkMode
                                        ? "bg-zinc-800 text-gray-200 border border-zinc-600"
                                        : "bg-gray-100 text-gray-700 border border-gray-300"
                                    }`}
                                  >
                                    {type === "Short_Keyword" ? "단답형" : "서술형"}
                                  </span>
                                )}
                              </div>
                              {anyKeywords.length > 0 && (
                                <p className="text-[11px] opacity-80">
                                  핵심 키워드: {anyKeywords.join(", ")}
                                </p>
                              )}
                              {intentText && (
                                <p className="mt-0.5 text-[11px] opacity-80 whitespace-pre-line">
                                  출제 의도: {intentText}
                                </p>
                              )}
                              <div className="mt-2">
                                <label className="block text-[11px] font-semibold mb-1">
                                  나의 답안
                                </label>
                                <textarea
                                  value={shortAnswerUserAnswers[String(idx)] ?? ""}
                                  onChange={(e) =>
                                    handleShortAnswerInputChange(idx, e.target.value)
                                  }
                                  className={`w-full rounded border px-2 py-1 text-xs resize-y min-h-[60px] ${
                                    isDarkMode
                                      ? "bg-zinc-900 border-zinc-700 text-gray-100"
                                      : "bg-white border-gray-300 text-gray-900"
                                  }`}
                                  placeholder="이 문항에 대한 자신의 답안을 작성해 보세요."
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => toggleExamAnswerVisible(key)}
                                className={`mt-1 inline-flex items-center px-2 py-1 rounded text-[11px] cursor-pointer ${
                                  isDarkMode
                                    ? "bg-zinc-800 text-gray-200"
                                    : "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {show ? "모범 답안/기준 숨기기" : "모범 답안/기준 보기"}
                              </button>
                              {show && modelAnswer && (
                                <>
                                  <p className="mt-1 text-[11px]">
                                    <span className="font-semibold">모범 답안:</span>{" "}
                                    {modelAnswer}
                                  </p>
                                  {intentText && (
                                    <p className="mt-1 text-[11px] opacity-80 whitespace-pre-line">
                                      평가 기준/의도: {intentText}
                                    </p>
                                  )}
                                </>
                              )}
                            </li>
                          );
                        })}
                      </ol>
                      <div className="mt-2 flex flex-col gap-1">
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={handleShortAnswerGrade}
                            className={`inline-flex items-center px-3 py-1.5 rounded text-[11px] font-medium cursor-pointer ${
                              isDarkMode ? "bg-emerald-600 text-white" : "bg-emerald-600 text-white"
                            }`}
                          >
                            작성한 단답/서술형 채점하기
                          </button>
                          <p className="text-[11px] opacity-70">
                            각 문항에 대해 답안을 작성한 뒤 채점 버튼을 누르면 키워드 기반으로
                            결과와 피드백을 제공합니다.
                          </p>
                        </div>
                        {shortAnswerLog && shortAnswerLog.evaluationItems.length > 0 && (
                          <div
                            className={`mt-2 rounded-lg border p-2 text-[11px] ${
                              isDarkMode
                                ? "border-zinc-700 bg-zinc-900/60"
                                : "border-gray-200 bg-gray-50"
                            }`}
                          >
                            <p className="font-semibold mb-1">
                              단답/서술형 채점 결과 및 피드백
                            </p>
                            <ul className="space-y-1.5">
                              {shortAnswerLog.evaluationItems.map((item) => (
                                <li
                                  key={item.questionId}
                                  className="border-b last:border-b-0 pb-1 last:pb-0 border-dashed border-gray-300 dark:border-zinc-700"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium">
                                      문항 {item.questionId} —{" "}
                                      <span
                                        className={
                                          item.resultStatus === "Correct"
                                            ? "text-emerald-500"
                                            : item.resultStatus === "Partial_Correct"
                                            ? "text-amber-500"
                                            : "text-red-500"
                                        }
                                      >
                                        {item.resultStatus === "Correct"
                                          ? "정답"
                                          : item.resultStatus === "Partial_Correct"
                                          ? "부분 정답"
                                          : "오답"}
                                      </span>
                                    </span>
                                    {item.relatedTopic && (
                                      <span className="text-[10px] opacity-70">
                                        주제: {item.relatedTopic}
                                      </span>
                                    )}
                                  </div>
                                  <p className="mt-0.5">
                                    <span className="font-semibold">작성한 답안:</span>{" "}
                                    {item.userResponse}
                                  </p>
                                  {item.feedbackMessage && (
                                    <p className="mt-0.5 opacity-80 whitespace-pre-line">
                                      {item.feedbackMessage}
                                    </p>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {examDetail.debateTopics && examDetail.debateTopics.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold">토론형 주제 ({examDetail.debateTopics.length}개)</h3>
                      <ol className="space-y-3 text-xs list-decimal list-inside">
                        {examDetail.debateTopics.map((d, idx) => (
                          <li key={idx} className={`rounded-lg border p-2 ${isDarkMode ? "border-zinc-700" : "border-gray-200"}`}>
                            <p className="font-medium mb-1">{d.topic}</p>
                            {d.context && <p className="text-[11px] opacity-80 whitespace-pre-line">맥락: {d.context}</p>}
                            <p className="mt-1 text-[11px]">
                              <span className="font-semibold">찬성 입장:</span> {d.proSideStand}
                            </p>
                            <p className="mt-1 text-[11px]">
                              <span className="font-semibold">반대 입장:</span> {d.conSideStand}
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
                  {examDetail.totalCount != null && (
                    <p className="text-[11px] opacity-70">총 문항 수: {examDetail.totalCount}</p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 평가 만들기 모달 */}
      {assessmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true" onClick={() => !submitting && setAssessmentModalOpen(false)}>
          <div className={`w-full max-w-md rounded-xl shadow-xl border ${isDarkMode ? "bg-zinc-900 border-zinc-700" : "bg-white border-gray-200"}`} onClick={(e) => e.stopPropagation()}>
            <div className={`flex justify-between px-5 py-4 border-b ${isDarkMode ? "border-zinc-700" : "border-gray-200"}`}>
              <h2 className={`text-lg font-semibold ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>평가 만들기</h2>
              <button type="button" onClick={() => !submitting && setAssessmentModalOpen(false)} className="p-1.5 rounded hover:bg-black/10">✕</button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}>제목</label>
                <input type="text" value={assessmentTitle} onChange={(e) => setAssessmentTitle(e.target.value)} placeholder="예: 3주차 퀴즈" className={`w-full px-3 py-2 text-sm rounded border ${isDarkMode ? "bg-zinc-800 border-zinc-600 text-white" : "bg-white border-gray-300 text-gray-900"}`} />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}>유형</label>
                <select value={assessmentType} onChange={(e) => setAssessmentType(e.target.value as "QUIZ" | "ASSIGNMENT")} className={`w-full px-3 py-2 text-sm rounded border ${isDarkMode ? "bg-zinc-800 border-zinc-600 text-white" : "bg-white border-gray-300 text-gray-900"}`}>
                  <option value="QUIZ">퀴즈</option>
                  <option value="ASSIGNMENT">과제</option>
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}>마감일</label>
                <input type="date" value={assessmentDueDate} onChange={(e) => setAssessmentDueDate(e.target.value)} className={`w-full px-3 py-2 text-sm rounded border ${isDarkMode ? "bg-zinc-800 border-zinc-600 text-white" : "bg-white border-gray-300 text-gray-900"}`} />
              </div>
            </div>
            <div className={`px-5 py-4 border-t flex justify-end gap-2 ${isDarkMode ? "border-zinc-700" : "border-gray-200"}`}>
              <button type="button" onClick={() => !submitting && setAssessmentModalOpen(false)} className={`px-4 py-2 text-sm rounded ${isDarkMode ? "bg-zinc-800 text-gray-200" : "bg-gray-100 text-gray-700"}`}>취소</button>
              <button type="button" onClick={handleAssessmentSubmit} disabled={submitting || !assessmentTitle.trim() || !assessmentDueDate} className="px-4 py-2 text-sm rounded font-medium bg-emerald-600 text-white disabled:opacity-50 cursor-pointer">{submitting ? "생성 중..." : "생성"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MainContent;
