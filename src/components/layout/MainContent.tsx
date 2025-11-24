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
  | "exam-creation"
  | "reports"
  | "student-management"
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
            isDarkMode ? "text-slate-400" : "text-gray-500"
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
          </div>
          <div
            className={`flex-1 flex items-center justify-center ${
              isDarkMode ? "text-slate-400" : "text-gray-500"
            }`}
          >
            {isTeacher ? (
              <button
                type="button"
                onClick={() => setIsCourseModalOpen(true)}
                className={`text-center p-8 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
                  isDarkMode
                    ? "border-slate-600 hover:border-emerald-500 hover:bg-slate-800/50"
                    : "border-gray-300 hover:border-emerald-500 hover:bg-gray-50"
                } focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:ring-offset-2 ${
                  isDarkMode ? "focus:ring-offset-slate-900" : "focus:ring-offset-white"
                }`}
              >
                <svg 
                  className={`w-16 h-16 mx-auto mb-4 ${isDarkMode ? "text-slate-400" : "text-gray-400"}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <p className={`text-xl font-semibold mb-2 ${isDarkMode ? "text-slate-200" : "text-gray-700"}`}>
                  새 과목 만들기
                </p>
                <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                  클릭하여 새 과목을 생성하세요
                </p>
              </button>
            ) : (
              <div className="text-center space-y-2">
                <p className="text-lg font-medium">등록된 과목이 없습니다.</p>
                <p className="text-sm">담당 선생님이 과목을 생성하면 여기에 표시됩니다.</p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">내 강의실</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {isTeacher && (
            <button
              type="button"
              onClick={() => setIsCourseModalOpen(true)}
              className={`text-left p-5 rounded-xl border-2 border-dashed transition-all flex flex-col h-40 items-center justify-center cursor-pointer ${
                isDarkMode
                  ? "border-slate-600 hover:border-emerald-500 hover:bg-slate-800/50"
                  : "border-gray-300 hover:border-emerald-500 hover:bg-gray-50"
              } focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:ring-offset-2 ${
                isDarkMode ? "focus:ring-offset-slate-900" : "focus:ring-offset-white"
              }`}
            >
              <svg 
                className={`w-8 h-8 mb-2 ${isDarkMode ? "text-slate-400" : "text-gray-400"}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className={`text-sm font-medium ${isDarkMode ? "text-slate-300" : "text-gray-600"}`}>
                새 과목 만들기
              </span>
            </button>
          )}
          {courses.map((course) => (
            <button
              key={course.courseId}
              type="button"
              onClick={() => handleCourseSelect(course.courseId)}
              className={`text-left p-5 rounded-xl border shadow-sm transition-all flex flex-col h-40 cursor-pointer ${
                isDarkMode
                  ? "bg-slate-800 border-slate-600 hover:border-emerald-500 hover:shadow-emerald-500/30"
                  : "bg-white border-gray-200 hover:border-emerald-500/40 hover:shadow-emerald-500/20"
              } focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:ring-offset-2 ${
                isDarkMode ? "focus:ring-offset-slate-900" : "focus:ring-offset-white"
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
                          ? "text-slate-200 hover:text-white hover:bg-slate-700"
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
                          isDarkMode ? "bg-slate-700 border-slate-600" : "bg-white border-gray-200"
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
                              ? "text-slate-200 hover:bg-slate-700"
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
                      isDarkMode ? "text-slate-400" : "text-gray-600"
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
            isDarkMode ? "text-slate-400" : "text-gray-500"
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
              type="button"
              onClick={onBackToCourses}
              className={`mt-2 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg cursor-pointer ${
                isDarkMode
                  ? "bg-slate-800 hover:bg-slate-700 text-white"
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
              isDarkMode ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
            }`}
          >
            <div className="flex flex-col gap-3">
              <div className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-600"}`}>
                담당: {courseDetail.teacherName}
              </div>
              {courseDetail.description && (
                <p className={`text-sm ${isDarkMode ? "text-slate-200" : "text-gray-700"}`}>
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
                    ? "bg-slate-700 border-slate-600 text-slate-100"
                    : "bg-white border-gray-200 text-gray-900"
                }`}
                style={{ maxHeight: "60vh" }}
              >
                <h2 className="text-xl font-semibold mb-4">AI 생성 강의 자료</h2>
                <div
                  className={`prose prose-sm max-w-none leading-relaxed ${
                    isDarkMode 
                      ? "prose-invert prose-headings:text-slate-100 prose-p:text-slate-200 prose-strong:text-slate-100 prose-ul:text-slate-200 prose-ol:text-slate-200 prose-li:text-slate-200 prose-code:text-slate-100 prose-pre:text-slate-100 prose-blockquote:text-slate-300 prose-a:text-emerald-400" 
                      : "prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900 prose-ul:text-gray-700 prose-ol:text-gray-700 prose-li:text-gray-700 prose-code:text-gray-900 prose-pre:text-gray-900 prose-blockquote:text-gray-600 prose-a:text-emerald-600"
                  }`}
                  style={{
                    lineHeight: '1.75',
                  }}
                >
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({node, ...props}) => <p className="mb-4" {...props} />,
                      h1: ({node, ...props}) => <h1 className="text-2xl font-bold mt-6 mb-4" {...props} />,
                      h2: ({node, ...props}) => <h2 className="text-xl font-semibold mt-5 mb-3" {...props} />,
                      h3: ({node, ...props}) => <h3 className="text-lg font-semibold mt-4 mb-2" {...props} />,
                      ul: ({node, ...props}) => <ul className="list-disc pl-6 mb-4 space-y-1" {...props} />,
                      ol: ({node, ...props}) => <ol className="list-decimal pl-6 mb-4 space-y-1" {...props} />,
                      li: ({node, ...props}) => <li className="mb-1" {...props} />,
                      strong: ({node, ...props}) => <strong className="font-semibold" {...props} />,
                      em: ({node, ...props}) => <em className="italic" {...props} />,
                      code: ({node, ...props}) => <code className={`px-1.5 py-0.5 rounded text-sm ${isDarkMode ? "bg-slate-800 text-emerald-300" : "bg-gray-100 text-emerald-700"}`} {...props} />,
                      blockquote: ({node, ...props}) => <blockquote className={`border-l-4 pl-4 italic my-4 ${isDarkMode ? "border-slate-500 text-slate-300" : "border-gray-300 text-gray-600"}`} {...props} />,
                    }}
                  >
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
                        ? "border-slate-600 bg-slate-700 text-slate-200"
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
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                            : "bg-emerald-600 hover:bg-emerald-700 text-white"
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
                ? "border-slate-700 bg-slate-900 text-slate-400"
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

  return (
    <>
      <div
        className={`flex-1 min-h-0 p-4 overflow-y-auto scrollbar-hide transition-colors ${
          isDarkMode ? "bg-slate-900" : "bg-gray-50"
        }`}
      >
        {viewMode === "course-list" ? (
          selectedMenu === "settings" ? (
            <SettingsPage />
          ) : selectedMenu === "lectures" ? (
            renderCourseList()
          ) : (
            <div className={`h-full flex items-center justify-center ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
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

      {/* 과목 생성 모달 */}
      {isCourseModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setIsCourseModalOpen(false)}
        >
          <div
            className={`w-full max-w-md p-6 rounded-xl shadow-xl ${
              isDarkMode ? "bg-slate-700" : "bg-white"
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
                  } focus:outline-none focus:ring-2 focus:ring-emerald-500`}
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
                  } focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
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
                  type="button"
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
