import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import {
  courseApi,
  lectureApi,
  assessmentApi,
  materialGenerationApi,
  examGenerationApi,
  type Course,
  type CourseDetail,
  type AssessmentSimpleDto,
} from "../../services/api";
import SettingsPage from "../pages/SettingsPage";
import HelpPage from "../pages/HelpPage";

type ViewMode = "course-list" | "course-detail";
type MenuItem = 
  | "dashboard" 
  | "lectures" 
  | "assignments" 
  | "exam-creation"
  | "reports"
  | "student-management"
  | "settings" 
  | "help";

type ItemType = "material" | "exam" | "assessment";
type CenterItem = {
  id: string;
  type: ItemType;
  title: string;
  meta: string;
  createdAt: string;
  fileUrl?: string;
  assessmentId?: number;
  examSessionId?: string;
};

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
  onEditCourse,
  onDeleteCourse,
  onCourseCreated,
  selectedMenu = "dashboard",
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
  const [examGenModalOpen, setExamGenModalOpen] = React.useState(false);
  const [assessmentModalOpen, setAssessmentModalOpen] = React.useState(false);
  const [uploadFile, setUploadFile] = React.useState<File | null>(null);
  const [uploadDragOver, setUploadDragOver] = React.useState(false);
  const [materialKeyword, setMaterialKeyword] = React.useState("");
  const [examType, setExamType] = React.useState("FLASH_CARD");
  const [examTopic, setExamTopic] = React.useState("");
  const [examCount, setExamCount] = React.useState(10);
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
  const actionMenuRef = React.useRef<HTMLDivElement | null>(null);

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

  React.useEffect(() => {
    if (uploadModalOpen) {
      setUploadFile(null);
      setUploadDragOver(false);
    }
  }, [uploadModalOpen]);

  const handleUploadSubmit = React.useCallback(async () => {
    if (!selectedLectureId || !uploadFile || !courseDetail?.courseId) return;
    setSubmitting(true);
    try {
      const fileUrl = await lectureApi.uploadMaterial(selectedLectureId, uploadFile);
      const newItem: CenterItem = {
        id: `material-${Date.now()}`,
        type: "material",
        title: uploadFile.name,
        meta: "자료",
        createdAt: new Date().toISOString(),
        fileUrl: fileUrl || undefined,
      };
      setLocalMaterials((prev) => ({
        ...prev,
        [selectedLectureId]: [...(prev[selectedLectureId] || []), newItem],
      }));
      setUploadModalOpen(false);
      setUploadFile(null);
      window.alert("자료가 업로드되었습니다.");
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "업로드에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }, [selectedLectureId, uploadFile, courseDetail?.courseId]);

  const handleMaterialGenSubmit = React.useCallback(async () => {
    if (!materialKeyword.trim()) return;
    setSubmitting(true);
    try {
      await materialGenerationApi.phase1({
        lectureId: selectedLectureId ?? 0,
        keyword: materialKeyword.trim(),
        pdfPath: "",
      });
      const newItem: CenterItem = {
        id: `material-gen-${Date.now()}`,
        type: "material",
        title: `${materialKeyword.trim()} (기획안 생성됨)`,
        meta: "자료",
        createdAt: new Date().toISOString(),
      };
      if (selectedLectureId) {
        setLocalMaterials((prev) => ({
          ...prev,
          [selectedLectureId]: [...(prev[selectedLectureId] || []), newItem],
        }));
      }
      setMaterialGenModalOpen(false);
      setMaterialKeyword("");
      window.alert("기획안 생성이 시작되었습니다.");
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "자료 생성에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }, [materialKeyword, selectedLectureId]);

  const handleExamGenSubmit = React.useCallback(async () => {
    if (!examTopic.trim()) return;
    if (selectedLectureId == null) {
      window.alert("강의를 먼저 선택해주세요.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await examGenerationApi.createExam({
        lectureId: selectedLectureId,
        examType,
        targetCount: examCount,
        lectureContent: examTopic.trim(),
        topic: examTopic.trim(),
      });
      const newItem: CenterItem = {
        id: res.examSessionId,
        type: "exam",
        title: res.exam?.topic || examTopic.trim(),
        meta: "시험",
        createdAt: new Date().toISOString(),
        examSessionId: res.examSessionId,
      };
      if (selectedLectureId) {
        setLocalExams((prev) => ({
          ...prev,
          [selectedLectureId]: [...(prev[selectedLectureId] || []), newItem],
        }));
      }
      setExamGenModalOpen(false);
      setExamTopic("");
      setExamCount(10);
      window.alert("시험이 생성되었습니다.");
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "시험 생성에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }, [examType, examTopic, examCount, selectedLectureId]);

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

  const handleCardClick = React.useCallback((item: CenterItem) => {
    if (item.fileUrl) window.open(item.fileUrl, "_blank");
    else if (item.assessmentId) window.alert(`평가 상세 (ID: ${item.assessmentId}) - 연동 예정`);
    else if (item.examSessionId) window.alert(`시험 세션: ${item.examSessionId} - 연동 예정`);
  }, []);

  const toggleCourseMenu = (courseId: number) => {
    setOpenCourseMenuId((prev) => (prev === courseId ? null : courseId));
  };

  const handleCourseSelect = (courseId: number) => {
    onSelectCourse(courseId);
    setOpenCourseMenuId(null);
  };

  const handleCreateCourse = async () => {
    if (!courseModalTitle.trim()) {
      window.alert("강의실 제목을 입력해주세요.");
      return;
    }

    try {
      const course = await courseApi.createCourse({
        title: courseModalTitle.trim(),
        description: courseModalDescription.trim() || '',
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

    if (!courses.length) {
      return (
        <div className="h-full flex flex-col">
          <div
            className={`flex-1 flex items-center justify-center ${
              isDarkMode ? "text-gray-400" : "text-gray-500"
            }`}
          >
            {isTeacher ? (
              <button
                type="button"
                onClick={() => setIsCourseModalOpen(true)}
                className={`text-center p-8 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
                  isDarkMode
                    ? "border-gray-700 hover:border-gray-500 hover:bg-zinc-700"
                    : "border-gray-300 hover:border-emerald-500 hover:bg-zinc-200"
                } focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:ring-offset-2 ${
                  isDarkMode ? "focus:ring-offset-gray-900" : "focus:ring-offset-white"
                }`}
              >
                <svg
                  className={`w-16 h-16 mx-auto mb-4 ${isDarkMode ? "text-gray-400" : "text-gray-400"}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <p className={`text-xl font-semibold mb-2 ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}>
                  새 강의실 만들기
                </p>
                <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                  버튼을 눌러 강의실 생성을 시작해보세요.
                </p>
              </button>
            ) : (
              <div className="text-center space-y-2">
                <p className="text-lg font-medium">등록된 강의실이 없습니다.</p>
                <p className="text-sm">담당 선생님이 강의실을 생성하면 여기에 표시됩니다.</p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-4">
          {courses.map((course) => (
            <div
              key={course.courseId}
              role="button"
              tabIndex={0}
              onClick={() => handleCourseSelect(course.courseId)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  handleCourseSelect(course.courseId);
                }
              }}
              className={`text-left p-5 rounded-xl border shadow-sm transition-all flex flex-col h-32 cursor-pointer focus:outline-none ${
                isDarkMode
                  ? "bg-zinc-900 border-zinc-700 hover:border-zinc-500 hover:shadow-zinc-500/30"
                  : "bg-white border-gray-200 hover:border-emerald-500/40 hover:shadow-emerald-500/20"
              } focus:ring-2 ${
                isDarkMode ? "focus:ring-zinc-500/60 focus:ring-offset-zinc-900" : "focus:ring-emerald-500/60 focus:ring-offset-white"
              }`}
            >
              <div className="flex flex-col h-full">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-base font-semibold line-clamp-2 flex-1">{course.title}</h3>
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
                          className={`w-full text-left px-3 py-2 text-xs transition-colors rounded-t-lg cursor-pointer ${
                            isDarkMode
                              ? "text-gray-200 hover:bg-zinc-700"
                              : "text-gray-700 hover:bg-zinc-200"
                          }`}
                          role="menuitem"
                        >
                          강의실 수정
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setOpenCourseMenuId(null);
                            onDeleteCourse?.(course);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs transition-colors rounded-b-lg cursor-pointer ${
                            isDarkMode
                              ? "text-red-300 hover:text-red-200 hover:bg-zinc-700"
                              : "text-red-600 hover:bg-zinc-200"
                          }`}
                          role="menuitem"
                        >
                          강의실 삭제
                        </button>
                      </div>
                    )}
                  </div>
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
          ))}
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

    return (
      <div className="flex flex-col gap-1.5 h-full">
        {/* 박스형 목록 + 정렬 + 추가 버튼 */}
        <div className={`flex-1 flex flex-col min-h-0 rounded-xl overflow-hidden ${
          isDarkMode ? "bg-zinc-800" : "bg-white"
        }`}>
          <div className={`flex items-center justify-between gap-3 shrink-0 px-4 py-3 border-b ${
            isDarkMode ? "border-zinc-700" : "border-gray-200"
          }`}>
            {currentWeekLabel && (
              <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${
                isDarkMode ? "bg-zinc-700 text-gray-300" : "bg-white border border-gray-200 text-gray-600"
              }`}>
                {currentWeekLabel}
              </span>
            )}
            <div className="flex items-center gap-2 ml-auto">
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as "recent" | "name" | "type")}
                className={`text-xs px-2 py-1.5 rounded border cursor-pointer ${
                  isDarkMode ? "bg-zinc-800 border-zinc-600 text-gray-200" : "bg-white border-gray-200 text-gray-700"
                }`}
              >
                <option value="recent">최신순</option>
                <option value="name">이름순</option>
                <option value="type">유형별</option>
              </select>
            </div>
          </div>
          <div className={`flex-1 overflow-y-auto p-4 ${isDarkMode ? "text-gray-200" : "text-gray-800"}`}>
            {assessmentsLoading ? (
              <div className="flex items-center justify-center py-12 text-sm opacity-70">목록 불러오는 중...</div>
            ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 auto-rows-fr">
              {sortedItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleCardClick(item)}
                  className={`rounded-xl border p-4 min-h-[100px] flex flex-col justify-between transition-colors cursor-pointer text-left ${
                    isDarkMode
                      ? "bg-zinc-800 border-zinc-700 hover:border-zinc-600"
                      : "bg-white border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  <p className={`text-xs mt-1 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>{item.meta}</p>
                </button>
              ))}
              <div className="relative min-h-[100px]" ref={addMenuRef}>
                <button
                  type="button"
                  onClick={() => setAddMenuOpen((v) => !v)}
                  className={`w-full h-full min-h-[100px] rounded-xl border-2 border-dashed flex items-center justify-center transition-colors cursor-pointer ${
                    isDarkMode
                      ? "border-zinc-600 hover:border-zinc-500 hover:bg-zinc-700 text-gray-400 hover:text-gray-200"
                      : "border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-gray-400 hover:text-gray-600"
                  }`}
                >
                  <span className="text-2xl font-light leading-none">+</span>
                </button>
                {addMenuOpen && (
                  <div
                    className={`absolute right-0 top-full mt-1 z-20 min-w-[160px] rounded-lg border shadow-lg py-1 ${
                      isDarkMode ? "bg-zinc-800 border-zinc-700" : "bg-white border-gray-200"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => { setAddMenuOpen(false); if (selectedLectureId) setUploadModalOpen(true); else window.alert("강의를 먼저 선택해주세요."); }}
                      className={`w-full text-left px-3 py-2 text-sm cursor-pointer ${
                        isDarkMode ? "hover:bg-zinc-700 text-gray-200" : "hover:bg-gray-100 text-gray-800"
                      }`}
                    >
                      자료 업로드
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAddMenuOpen(false); if (selectedLectureId) setMaterialGenModalOpen(true); else window.alert("강의를 먼저 선택해주세요."); }}
                      className={`w-full text-left px-3 py-2 text-sm cursor-pointer ${
                        isDarkMode ? "hover:bg-zinc-700 text-gray-200" : "hover:bg-gray-100 text-gray-800"
                      }`}
                    >
                      AI 자료 생성
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAddMenuOpen(false); if (selectedLectureId) setExamGenModalOpen(true); else window.alert("강의를 먼저 선택해주세요."); }}
                      className={`w-full text-left px-3 py-2 text-sm cursor-pointer ${
                        isDarkMode ? "hover:bg-zinc-700 text-gray-200" : "hover:bg-gray-100 text-gray-800"
                      }`}
                    >
                      시험 생성
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAddMenuOpen(false); if (isTeacher) setAssessmentModalOpen(true); else window.alert("선생님만 평가를 만들 수 있습니다."); }}
                      className={`w-full text-left px-3 py-2 text-sm cursor-pointer ${
                        isDarkMode ? "hover:bg-zinc-700 text-gray-200" : "hover:bg-gray-100 text-gray-800"
                      }`}
                    >
                      평가 만들기
                    </button>
                  </div>
                )}
              </div>
            </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const getMenuName = (menu: MenuItem): string => {
    const menuNames: Record<MenuItem, string> = {
      dashboard: "대시보드",
      lectures: "강의",
      assignments: "과제",
      "exam-creation": "시험생성",
      reports: "보고서",
      "student-management": "학생관리",
      settings: "환경설정",
      help: "도움말",
    };
    return menuNames[menu] || "이 기능";
  };

  const renderCourseListHeader = () => {
    if (viewMode !== "course-list" || selectedMenu !== "lectures") {
      return null;
    }

    return (
      <div
        className={`h-[50px] px-4 flex items-center justify-between ${
          isDarkMode ? "bg-zinc-800" : "bg-white"
        }`}
      >
        <h2 className={`text-xl font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
          내 강의실
        </h2>
        <div className="flex items-center gap-2">
          {isStudent && (
            <button
              type="button"
              onClick={handleOpenJoinModal}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium cursor-pointer ${
                isDarkMode
                  ? "border-zinc-600 text-gray-100 hover:bg-zinc-700"
                  : "border-emerald-500 text-emerald-700 hover:bg-emerald-50"
              }`}
            >
              <span>강의실 참여</span>
            </button>
          )}
          {isTeacher && (
            <button
              type="button"
              onClick={() => setIsCourseModalOpen(true)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer"
            >
              <svg className="w-[20px] h-[20px] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-sm font-medium">새 강의실 만들기</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderCourseDetailHeader = () => {
    if (viewMode !== "course-detail" || !courseDetail) {
      return null;
    }

    const showInviteButton = isTeacher && courseDetail.invitationCode;

    return (
      <div
        className={`h-[50px] px-1.5 flex items-center justify-between ${
          isDarkMode ? "bg-zinc-800" : "bg-white"
        }`}
      >
        <button
          type="button"
          onClick={onBackToCourses}
          className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
            isDarkMode
              ? "text-gray-200 hover:bg-zinc-700"
              : "text-gray-700 hover:bg-zinc-200"
          }`}
        >
          <svg className="w-[20px] h-[20px] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="text-sm font-medium">강의실 목록으로</span>
        </button>
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
    if (viewMode !== "course-list" || selectedMenu !== "settings") {
      return null;
    }

    return (
      <div
        className={`h-[50px] px-4 flex items-center justify-between ${
          isDarkMode ? "bg-zinc-800" : "bg-white"
        }`}
      >
        <h2 className={`text-xl font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
          설정
        </h2>
      </div>
    );
  };

  return (
    <>
      <div className="flex-1 flex flex-col min-h-0">
        {renderCourseListHeader()}
        {renderCourseDetailHeader()}
        {renderSettingsHeader()}
        <div
          className={`flex-1 min-h-0 pt-2 p-1.5 overflow-y-auto scrollbar-hide transition-colors ${
            isDarkMode ? "bg-zinc-800" : "bg-white"
          }`}
        >
        {viewMode === "course-list" ? (
          selectedMenu === "settings" ? (
            <SettingsPage />
          ) : selectedMenu === "help" ? (
            <HelpPage />
          ) : selectedMenu === "lectures" ? (
            renderCourseList()
          ) : (
            <div className={`h-full flex items-center justify-center ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
              <div className="text-center space-y-2">
                <p className="text-lg font-medium">미구현</p>
                <p className="text-sm">
                  {getMenuName(selectedMenu)}은(는) 아직 구현되지 않았습니다.
                </p>
              </div>
            </div>
          )
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true" onClick={() => !submitting && setUploadModalOpen(false)}>
          <div className={`w-full max-w-md rounded-xl shadow-xl border ${isDarkMode ? "bg-zinc-900 border-zinc-700" : "bg-white border-gray-200"}`} onClick={(e) => e.stopPropagation()}>
            <div className={`flex justify-between items-center px-5 py-4 border-b ${isDarkMode ? "border-zinc-700" : "border-gray-200"}`}>
              <h2 className={`text-lg font-semibold ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>자료 업로드</h2>
              <button type="button" onClick={() => !submitting && setUploadModalOpen(false)} className="p-1.5 rounded hover:bg-black/10" aria-label="닫기">✕</button>
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
              <button type="button" onClick={() => !submitting && setUploadModalOpen(false)} className={`px-4 py-2 text-sm rounded ${isDarkMode ? "bg-zinc-800 text-gray-200" : "bg-gray-100 text-gray-700"}`}>취소</button>
              <button type="button" onClick={handleUploadSubmit} disabled={submitting || !uploadFile} className="px-4 py-2 text-sm rounded font-medium bg-emerald-600 text-white disabled:opacity-50 cursor-pointer">{submitting ? "업로드 중..." : "업로드"}</button>
            </div>
          </div>
        </div>
      )}

      {/* AI 자료 생성 모달 */}
      {materialGenModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true" onClick={() => !submitting && setMaterialGenModalOpen(false)}>
          <div className={`w-full max-w-md rounded-xl shadow-xl border ${isDarkMode ? "bg-zinc-900 border-zinc-700" : "bg-white border-gray-200"}`} onClick={(e) => e.stopPropagation()}>
            <div className={`flex justify-between px-5 py-4 border-b ${isDarkMode ? "border-zinc-700" : "border-gray-200"}`}>
              <h2 className={`text-lg font-semibold ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>AI 자료 생성</h2>
              <button type="button" onClick={() => !submitting && setMaterialGenModalOpen(false)} className="p-1.5 rounded hover:bg-black/10">✕</button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <label className={`block text-sm font-medium ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}>주제 또는 키워드</label>
              <input type="text" value={materialKeyword} onChange={(e) => setMaterialKeyword(e.target.value)} placeholder="예: 강화학습 DQN" className={`w-full px-3 py-2 text-sm rounded border ${isDarkMode ? "bg-zinc-800 border-zinc-600 text-white" : "bg-white border-gray-300 text-gray-900"}`} />
            </div>
            <div className={`px-5 py-4 border-t flex justify-end gap-2 ${isDarkMode ? "border-zinc-700" : "border-gray-200"}`}>
              <button type="button" onClick={() => !submitting && setMaterialGenModalOpen(false)} className={`px-4 py-2 text-sm rounded ${isDarkMode ? "bg-zinc-800 text-gray-200" : "bg-gray-100 text-gray-700"}`}>취소</button>
              <button type="button" onClick={handleMaterialGenSubmit} disabled={submitting || !materialKeyword.trim()} className="px-4 py-2 text-sm rounded font-medium bg-emerald-600 text-white disabled:opacity-50 cursor-pointer">{submitting ? "생성 중..." : "기획안 생성"}</button>
            </div>
          </div>
        </div>
      )}

      {/* 시험 생성 모달 */}
      {examGenModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true" onClick={() => !submitting && setExamGenModalOpen(false)}>
          <div className={`w-full max-w-md rounded-xl shadow-xl border ${isDarkMode ? "bg-zinc-900 border-zinc-700" : "bg-white border-gray-200"}`} onClick={(e) => e.stopPropagation()}>
            <div className={`flex justify-between px-5 py-4 border-b ${isDarkMode ? "border-zinc-700" : "border-gray-200"}`}>
              <h2 className={`text-lg font-semibold ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>시험 생성</h2>
              <button type="button" onClick={() => !submitting && setExamGenModalOpen(false)} className="p-1.5 rounded hover:bg-black/10">✕</button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}>시험 유형</label>
                <select value={examType} onChange={(e) => setExamType(e.target.value)} className={`w-full px-3 py-2 text-sm rounded border ${isDarkMode ? "bg-zinc-800 border-zinc-600 text-white" : "bg-white border-gray-300 text-gray-900"}`}>
                  <option value="FLASH_CARD">플래시카드</option>
                  <option value="OX_PROBLEM">O/X 문제</option>
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}>주제</label>
                <input type="text" value={examTopic} onChange={(e) => setExamTopic(e.target.value)} placeholder="예: 3주차 강의 내용" className={`w-full px-3 py-2 text-sm rounded border ${isDarkMode ? "bg-zinc-800 border-zinc-600 text-white" : "bg-white border-gray-300 text-gray-900"}`} />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}>문항 수</label>
                <input type="number" min={1} max={50} value={examCount} onChange={(e) => setExamCount(Number(e.target.value) || 10)} className={`w-full px-3 py-2 text-sm rounded border ${isDarkMode ? "bg-zinc-800 border-zinc-600 text-white" : "bg-white border-gray-300 text-gray-900"}`} />
              </div>
            </div>
            <div className={`px-5 py-4 border-t flex justify-end gap-2 ${isDarkMode ? "border-zinc-700" : "border-gray-200"}`}>
              <button type="button" onClick={() => !submitting && setExamGenModalOpen(false)} className={`px-4 py-2 text-sm rounded ${isDarkMode ? "bg-zinc-800 text-gray-200" : "bg-gray-100 text-gray-700"}`}>취소</button>
              <button type="button" onClick={handleExamGenSubmit} disabled={submitting || !examTopic.trim()} className="px-4 py-2 text-sm rounded font-medium bg-emerald-600 text-white disabled:opacity-50 cursor-pointer">{submitting ? "생성 중..." : "생성"}</button>
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
