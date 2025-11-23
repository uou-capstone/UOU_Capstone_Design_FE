import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import { courseApi, lectureApi, type Course, type CourseDetail } from "../../services/api";
import SettingsPage from "../pages/SettingsPage";

type ViewMode = "course-list" | "course-detail";
type MenuItem = 
  | "dashboard" 
  | "lectures" 
  | "assignments" 
  | "progress" 
  | "ai-tutor" 
  | "smart-recommendation" 
  | "auto-evaluation" 
  | "settings" 
  | "help";

interface MainContentProps {
  viewMode: ViewMode;
  courses: Course[];
  isCoursesLoading: boolean;
  coursesError: string | null;
  onSelectCourse: (courseId: number) => void;
  onBackToCourses: () => void;
  courseDetail: CourseDetail | null;
  isCourseDetailLoading: boolean;
  courseDetailError: string | null;
  selectedLectureId?: number | null;
  lectureMarkdown?: string;
  fileUrl?: string;
  fileName?: string;
  onEditCourse?: (course: Course) => void;
  onDeleteCourse?: (course: Course) => void;
  onCourseCreated?: (course: CourseDetail) => void;
  selectedMenu?: MenuItem;
}

const MainContent: React.FC<MainContentProps> = ({
  viewMode,
  courses,
  isCoursesLoading,
  coursesError,
  onSelectCourse,
  onBackToCourses,
  courseDetail,
  isCourseDetailLoading,
  courseDetailError,
  selectedLectureId,
  lectureMarkdown,
  fileUrl,
  fileName,
  onEditCourse,
  onDeleteCourse,
  onCourseCreated,
  selectedMenu = "dashboard",
}) => {
  const { isDarkMode } = useTheme();
  const { user } = useAuth();
  const isTeacher = user?.role === "TEACHER";
  const [openCourseMenuId, setOpenCourseMenuId] = React.useState<number | null>(null);
  const [isCourseModalOpen, setIsCourseModalOpen] = React.useState(false);
  const [courseModalTitle, setCourseModalTitle] = React.useState("");
  const [courseModalDescription, setCourseModalDescription] = React.useState("");
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

  const toggleCourseMenu = (courseId: number) => {
    setOpenCourseMenuId((prev) => (prev === courseId ? null : courseId));
  };

  const handleCourseSelect = (courseId: number) => {
    onSelectCourse(courseId);
    setOpenCourseMenuId(null);
  };

  const handleCreateCourse = async () => {
    if (!courseModalTitle.trim()) {
      window.alert("과목 제목을 입력해주세요.");
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
      window.alert("과목이 생성되었습니다!");
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '과목 생성에 실패했습니다.';
      window.alert(errorMsg);
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
            <p className="text-lg font-medium mb-2">과목 목록을 불러오는 중...</p>
            <p className="text-sm">잠시만 기다려주세요.</p>
          </div>
        </div>
      );
    }

    // 에러가 있어도 에러 메시지를 표시하지 않음 (빈 목록으로 처리)

    if (!courses.length) {
      return (
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">내 강의실</h2>
            {isTeacher && (
              <button
                onClick={() => setIsCourseModalOpen(true)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer ${
                  isDarkMode
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "bg-blue-500 hover:bg-blue-600 text-white"
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                과목 생성
              </button>
            )}
          </div>
          <div
            className={`flex-1 flex items-center justify-center ${
              isDarkMode ? "text-gray-400" : "text-gray-500"
            }`}
          >
            <div className="text-center space-y-2">
              <p className="text-lg font-medium">등록된 과목이 없습니다.</p>
              {isTeacher ? (
                <p className="text-sm">위의 '과목 생성' 버튼을 눌러 새 과목을 만들어보세요.</p>
              ) : (
                <p className="text-sm">담당 선생님이 과목을 생성하면 여기에 표시됩니다.</p>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">내 과목</h2>
          {isTeacher && (
            <button
              onClick={() => setIsCourseModalOpen(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                isDarkMode
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-blue-500 hover:bg-blue-600 text-white"
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              과목 생성
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {courses.map((course) => (
            <button
              key={course.courseId}
              type="button"
              onClick={() => handleCourseSelect(course.courseId)}
              className={`text-left p-4 rounded-xl border shadow-sm transition-all flex flex-col h-32 cursor-pointer ${
                isDarkMode
                  ? "bg-gray-800 border-gray-700 hover:border-blue-500 hover:shadow-blue-500/30"
                  : "bg-white border-gray-200 hover:border-blue-500/40 hover:shadow-blue-500/20"
              } focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:ring-offset-2 ${
                isDarkMode ? "focus:ring-offset-gray-900" : "focus:ring-offset-white"
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
                          ? "text-gray-300 hover:text-white hover:bg-gray-700"
                          : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                      }`}
                      aria-haspopup="menu"
                      aria-expanded={openCourseMenuId === course.courseId}
                      aria-label="과목 옵션 열기"
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
                          isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
                        }`}
                        role="menu"
                        aria-label="과목 옵션 메뉴"
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
                              ? "text-gray-200 hover:bg-gray-700"
                              : "text-gray-700 hover:bg-gray-100"
                          }`}
                          role="menuitem"
                        >
                          과목 수정
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
                              ? "text-red-300 hover:bg-red-900/20 hover:text-red-200"
                              : "text-red-600 hover:bg-red-50"
                          }`}
                          role="menuitem"
                        >
                          과목 삭제
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
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderCourseDetail = () => {
    if (isCourseDetailLoading) {
      return (
        <div
          className={`h-full flex items-center justify-center ${
            isDarkMode ? "text-gray-400" : "text-gray-500"
          }`}
        >
          <div className="text-center">
            <p className="text-lg font-medium mb-2">과목 정보를 불러오는 중...</p>
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
            <p className="text-lg font-medium">과목 정보를 불러오지 못했습니다.</p>
            {courseDetailError && <p className="text-sm">{courseDetailError}</p>}
            <button
              onClick={onBackToCourses}
              className={`mt-2 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg cursor-pointer ${
                isDarkMode
                  ? "bg-gray-800 hover:bg-gray-700 text-white"
                  : "bg-gray-200 hover:bg-gray-300 text-gray-800"
              }`}
            >
              과목 목록으로 돌아가기
            </button>
          </div>
        </div>
      );
    }

    const hasLectureContent = Boolean(lectureMarkdown) || Boolean(fileUrl);
    
    // 선택된 강의가 OT(0주차)인지 확인
    const selectedLecture = courseDetail.lectures?.find(
      (lecture) => lecture.lectureId === selectedLectureId
    );
    const isOTSelected = selectedLecture?.weekNumber === 0;

    return (
      <div className="flex flex-col gap-4 h-full">
        {/* OT(0주차)를 선택했을 때만 담당과 강의 설명 표시 */}
        {isOTSelected && (
          <div
            className={`p-4 rounded-xl border ${
              isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
            }`}
          >
            <div className="flex flex-col gap-3">
              <div className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                담당: {courseDetail.teacherName}
              </div>
              {courseDetail.description && (
                <p className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                  {courseDetail.description}
                </p>
              )}
            </div>
          </div>
        )}

        {hasLectureContent ? (
          <div className="flex-1 flex flex-col gap-6">
            {lectureMarkdown && (
              <div
                className={`p-6 rounded-xl shadow-sm border transition-colors overflow-y-auto max-h-full ${
                  isDarkMode
                    ? "bg-gray-800 border-gray-700 text-gray-100"
                    : "bg-white border-gray-200 text-gray-900"
                }`}
                style={{ maxHeight: "60vh" }}
              >
                <h2 className="text-xl font-semibold mb-4">AI 생성 강의 자료</h2>
                <div
                  className={`prose prose-sm max-w-none leading-relaxed ${
                    isDarkMode ? "prose-invert" : ""
                  }`}
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {lectureMarkdown}
                  </ReactMarkdown>
                </div>
              </div>
            )}

            {fileUrl && (
              <div className="flex-1 min-h-0">
                {fileName?.toLowerCase().endsWith(".pdf") ? (
                  <iframe
                    src={fileUrl}
                    className="w-full h-[60vh] border-0 rounded-lg shadow-sm"
                    title={fileName}
                  />
                ) : (
                  <div
                    className={`h-full flex items-center justify-center rounded-xl border transition-colors ${
                      isDarkMode
                        ? "border-gray-700 bg-gray-800 text-gray-200"
                        : "border-gray-200 bg-white text-gray-700"
                    }`}
                  >
                    <div className="text-center">
                      <p className="text-lg font-medium mb-2">파일 다운로드</p>
                      <a
                        href={fileUrl}
                        download={fileName}
                        className={`inline-block px-4 py-2 rounded-lg ${
                          isDarkMode
                            ? "bg-blue-600 hover:bg-blue-700 text-white"
                            : "bg-blue-500 hover:bg-blue-600 text-white"
                        }`}
                      >
                        {fileName} 다운로드
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div
            className={`flex-1 flex items-center justify-center rounded-xl border ${
              isDarkMode
                ? "border-gray-800 bg-gray-900 text-gray-500"
                : "border-gray-200 bg-white text-gray-500"
            }`}
          >
            <div className="text-center space-y-2">
              <p className="text-lg font-medium">좌측 사이드바에서 강의를 선택해주세요.</p>
              <p className="text-sm">선택한 강의의 자료와 업로드 파일이 이 영역에 표시됩니다.</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div
        className={`flex-1 min-h-0 p-4 overflow-y-auto scrollbar-hide transition-colors ${
          isDarkMode ? "bg-gray-900" : "bg-gray-50"
        }`}
      >
        {viewMode === "course-list" ? (
          selectedMenu === "settings" ? (
            <SettingsPage />
          ) : selectedMenu === "lectures" ? (
            renderCourseList()
          ) : (
            <div className={`h-full flex items-center justify-center ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
              <div className="text-center">
                <p className="text-lg">메뉴를 선택해주세요.</p>
              </div>
            </div>
          )
        ) : (
          renderCourseDetail()
        )}
      </div>

      {/* 과목 생성 모달 */}
      {isCourseModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setIsCourseModalOpen(false)}
        >
          <div
            className={`w-full max-w-md p-6 rounded-xl shadow-xl ${
              isDarkMode ? "bg-gray-800" : "bg-white"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-semibold mb-4">새 과목 생성</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">과목 제목 *</label>
                <input
                  type="text"
                  value={courseModalTitle}
                  onChange={(e) => setCourseModalTitle(e.target.value)}
                  placeholder="예: Python 기초 프로그래밍"
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isDarkMode
                      ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                      : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">과목 설명</label>
                <textarea
                  value={courseModalDescription}
                  onChange={(e) => setCourseModalDescription(e.target.value)}
                  placeholder="과목에 대한 설명을 입력하세요"
                  rows={3}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isDarkMode
                      ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                      : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleCreateCourse}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium cursor-pointer ${
                    isDarkMode
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "bg-blue-500 hover:bg-blue-600 text-white"
                  }`}
                >
                  생성
                </button>
                <button
                  onClick={() => {
                    setIsCourseModalOpen(false);
                    setCourseModalTitle("");
                    setCourseModalDescription("");
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium cursor-pointer ${
                    isDarkMode
                      ? "bg-gray-700 hover:bg-gray-600 text-white"
                      : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                  }`}
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MainContent;
