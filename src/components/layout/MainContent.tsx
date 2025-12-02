import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import { courseApi, lectureApi, type Course, type CourseDetail } from "../../services/api";
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

    const hasLectureContent = Boolean(lectureMarkdown) || Boolean(fileUrl);
    
    // 선택된 강의가 OT(0주차)인지 확인
    const selectedLecture = courseDetail.lectures?.find(
      (lecture) => lecture.lectureId === selectedLectureId
    );
    const isOTSelected = selectedLecture?.weekNumber === 0;

    return (
      <div className="flex flex-col gap-1.5 h-full">
        {/* OT(0주차)를 선택했을 때만 강의실 이름과 과목 설명 표시 */}
        {isOTSelected && (
          <div
            className={`px-3 py-2 rounded-xl border ${
              isDarkMode ? "bg-zinc-800 border-zinc-700" : "bg-white border-gray-200"
            }`}
          >
            <div className="flex flex-col gap-2">
              <div className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                강의실 이름: {courseDetail.title}
              </div>
              {courseDetail.description && (
                <p className={`text-sm ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}>
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
                    ? "bg-gray-700 border-gray-700 text-gray-100"
                    : "bg-white border-gray-200 text-gray-900"
                }`}
                style={{ maxHeight: "60vh" }}
              >
                <h2 className="text-xl font-semibold mb-4">AI 생성 강의 자료</h2>
                <div
                  className={`prose prose-sm max-w-none leading-relaxed ${
                    isDarkMode 
                      ? "prose-invert prose-headings:text-gray-100 prose-p:text-gray-200 prose-strong:text-gray-100 prose-ul:text-gray-200 prose-ol:text-gray-200 prose-li:text-gray-200 prose-code:text-gray-100 prose-pre:text-gray-100 prose-blockquote:text-gray-300 prose-a:text-gray-400" 
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
                      code: ({node, ...props}) => <code className={`px-1.5 py-0.5 rounded text-sm ${isDarkMode ? "bg-gray-800 text-gray-300" : "bg-gray-100 text-emerald-700"}`} {...props} />,
                      blockquote: ({node, ...props}) => <blockquote className={`border-l-4 pl-4 italic my-4 ${isDarkMode ? "border-gray-600 text-gray-300" : "border-gray-300 text-gray-600"}`} {...props} />,
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
                    className={`w-full h-[60vh] rounded-xl border transition-colors ${
                      isDarkMode
                        ? "border-gray-800 bg-gray-900 text-gray-200"
                        : "border-gray-200 bg-white text-gray-700"
                    }`}
                    style={{ borderWidth: 1 }}
                    title={fileName}
                  />
                ) : (
                  <div
                    className={`h-full flex items-center justify-center rounded-xl border transition-colors ${
                      isDarkMode
                        ? "border-gray-800 bg-gray-900 text-gray-200"
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
                            ? "bg-gray-800 hover:bg-zinc-700 text-white"
                            : "bg-emerald-600 hover:bg-zinc-200 text-white"
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
                ? "border-zinc-700 bg-zinc-800 text-gray-400"
                : "border-gray-200 bg-white text-gray-500"
            }`}
          >
            <div className="w-full max-w-3xl text-center space-y-2">
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
      </div>
    );
  };

  return (
    <>
      <div className="flex-1 flex flex-col min-h-0">
        {renderCourseListHeader()}
        {renderCourseDetailHeader()}
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
    </>
  );
};

export default MainContent;
