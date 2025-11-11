import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTheme } from "../../contexts/ThemeContext";
import type { Course, CourseDetail } from "../../services/api";

type ViewMode = "course-list" | "course-detail";

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
  lectureMarkdown?: string;
  fileUrl?: string;
  fileName?: string;
  onEditCourse?: (course: Course) => void;
  onDeleteCourse?: (course: Course) => void;
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
  lectureMarkdown,
  fileUrl,
  fileName,
  onEditCourse,
  onDeleteCourse,
}) => {
  const { isDarkMode } = useTheme();
  const [openCourseMenuId, setOpenCourseMenuId] = React.useState<number | null>(null);
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

    if (coursesError) {
      return (
        <div
          className={`h-full flex items-center justify-center ${
            isDarkMode ? "text-red-400" : "text-red-600"
          }`}
        >
          <div className="text-center">
            <p className="text-lg font-medium mb-2">과목 목록을 불러오지 못했습니다.</p>
            <p className="text-sm">{coursesError}</p>
          </div>
        </div>
      );
    }

    if (!courses.length) {
      return (
        <div
          className={`h-full flex items-center justify-center ${
            isDarkMode ? "text-gray-400" : "text-gray-500"
          }`}
        >
          <div className="text-center space-y-2">
            <p className="text-lg font-medium">등록된 과목이 없습니다.</p>
            <p className="text-sm">
              오른쪽 사이드바의 + 버튼을 눌러 과목을 생성해보세요.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold mb-1">내 과목</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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
              className={`text-left p-3 md:p-4 rounded-xl border shadow-sm transition-all ${
                isDarkMode
                  ? "bg-gray-800 border-gray-700 hover:border-blue-500 hover:shadow-blue-500/30"
                  : "bg-white border-gray-200 hover:border-blue-500/40 hover:shadow-blue-500/20"
              } cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:ring-offset-2 ${
                isDarkMode ? "focus:ring-offset-gray-900" : "focus:ring-offset-white"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-lg font-semibold">{course.title}</h3>
                <div className="relative -mr-1">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleCourseMenu(course.courseId);
                    }}
                    className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
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
                      className={`absolute right-0 mt-2 w-40 rounded-lg border shadow-lg z-10 ${
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
                        className={`w-full text-left px-4 py-2 text-sm transition-colors ${
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
                        className={`w-full text-left px-4 py-2 text-sm transition-colors ${
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
                  className={`mt-3 text-sm line-clamp-3 ${
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  {course.description}
                </p>
              )}
            </div>
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
              className={`mt-2 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg ${
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

    return (
      <div className="flex flex-col gap-4 h-full">
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
    <div
      className={`flex-1 min-h-0 p-4 overflow-y-auto scrollbar-hide transition-colors ${
        isDarkMode ? "bg-gray-900" : "bg-gray-50"
      }`}
    >
      {viewMode === "course-list" ? renderCourseList() : renderCourseDetail()}
    </div>
  );
};

export default MainContent;
