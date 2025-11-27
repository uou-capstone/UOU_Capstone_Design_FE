import React, { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTheme } from "../../contexts/ThemeContext";
import LeftSidebar from "./LeftSidebar.tsx";
import RightSidebar from "./RightSidebar.tsx";
import MainContent from "./MainContent.tsx";
import { useCourses } from "../../hooks/useCourses";
import type { Course, CourseDetail, LectureResponseDto } from "../../services/api";

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

type CourseLecture = NonNullable<NonNullable<CourseDetail["lectures"]>[number]>;

const DEFAULT_LEFT_SIDEBAR_WIDTH = 220;
const DEFAULT_RIGHT_SIDEBAR_WIDTH = 420;

const COLLAPSED_LEFT_WIDTH = 56;

const AppLayout: React.FC = () => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const { courseId: courseIdParam } = useParams<{ courseId?: string }>();
  const parsedCourseId = courseIdParam ? Number(courseIdParam) : null;
  const selectedCourseId =
    parsedCourseId !== null && !Number.isNaN(parsedCourseId) ? parsedCourseId : null;

  const {
    courses,
    isLoading: isCoursesLoading,
    error: coursesError,
    fetchCourses,
    getCourseDetail,
    updateCourse,
    deleteCourse,
  } = useCourses();

  const [courseDetail, setCourseDetail] = useState<CourseDetail | null>(null);
  const [isCourseDetailLoading, setIsCourseDetailLoading] = useState(false);
  const [courseDetailError, setCourseDetailError] = useState<string | null>(null);

  const [currentCourseId, setCurrentCourseId] = useState<number | null>(null);
  const [currentLectureId, setCurrentLectureId] = useState<number | null>(null);

  const [lectureMarkdown, setLectureMarkdown] = useState<string>("");
  const [lectureFileUrl, setLectureFileUrl] = useState<string>("");
  const [lectureFileName, setLectureFileName] = useState<string>("");

  const [rightSidebarWidth, setRightSidebarWidth] = useState<number>(DEFAULT_RIGHT_SIDEBAR_WIDTH);
  const [isResizingRight, setIsResizingRight] = useState<boolean>(false);
  const rightResizeRef = useRef<HTMLDivElement>(null);
  const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = useState(false);
  const [isAutoCollapsed, setIsAutoCollapsed] = useState(false);
  
  // 메뉴 상태 관리 (메인 페이지일 때만 사용)
  const [selectedMenu, setSelectedMenu] = useState<MenuItem>("dashboard");

  const viewMode: ViewMode = selectedCourseId ? "course-detail" : "course-list";

  const resetLectureOutputs = useCallback(() => {
    setLectureMarkdown("");
    setLectureFileUrl("");
    setLectureFileName("");
  }, []);

  const loadCourseDetail = useCallback(
    async (courseId: number) => {
      setIsCourseDetailLoading(true);
      setCourseDetailError(null);
      try {
        const detail = await getCourseDetail(courseId);
        if (detail) {
          setCourseDetail(detail);
        } else {
          setCourseDetail(null);
          setCourseDetailError("강의실 정보를 불러오지 못했습니다.");
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "강의실 정보를 불러오지 못했습니다.";
        setCourseDetailError(message);
        setCourseDetail(null);
      } finally {
        setIsCourseDetailLoading(false);
      }
    },
    [getCourseDetail]
  );

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  useEffect(() => {
    if (!selectedCourseId) {
      setCourseDetail(null);
      setCourseDetailError(null);
      setCurrentCourseId(null);
      setCurrentLectureId(null);
      resetLectureOutputs();
      // 메인 페이지로 돌아올 때 대시보드로 리셋 (단, 메뉴가 이미 lectures로 설정되어 있으면 유지)
      setSelectedMenu((prev) => (prev === "lectures" ? "lectures" : "dashboard"));
      return;
    }

    setCurrentCourseId(selectedCourseId);
    setCurrentLectureId(null);
    resetLectureOutputs();
    loadCourseDetail(selectedCourseId);
  }, [selectedCourseId, loadCourseDetail, resetLectureOutputs]);

  const handleSelectCourse = (courseId: number) => {
    navigate(`/courses/${courseId}`);
  };

  const handleBackToCourses = () => {
    setSelectedMenu("lectures");
    navigate("/");
  };

  const handleCourseCreated = (course: CourseDetail) => {
    fetchCourses();
    resetLectureOutputs();
    setCurrentLectureId(null);
  };

  const handleLectureCreated = async (lecture: LectureResponseDto) => {
    if (!selectedCourseId) return;
    await loadCourseDetail(selectedCourseId);
    setCurrentLectureId(lecture.lectureId);
    resetLectureOutputs();
  };

  const handleLectureDelete = useCallback(
    async (lectureId: number) => {
      if (!selectedCourseId) return;

      try {
        const { lectureApi } = await import("../../services/api");
        await lectureApi.deleteLecture(lectureId);
        
        // 삭제된 강의가 현재 선택된 강의라면 선택 해제
        if (currentLectureId === lectureId) {
          setCurrentLectureId(null);
          resetLectureOutputs();
        }
        
        // 강의 목록 갱신
        await loadCourseDetail(selectedCourseId);
        
        window.alert("강의가 삭제되었습니다.");
      } catch (error) {
        const message = error instanceof Error ? error.message : "강의 삭제에 실패했습니다.";
        window.alert(message);
      }
    },
    [selectedCourseId, currentLectureId, loadCourseDetail, resetLectureOutputs]
  );

  const handleLectureSelect = (lectureId: number) => {
    setCurrentLectureId(lectureId);
    resetLectureOutputs();
  };

  const handleLectureEdit = useCallback(
    async (lecture: CourseLecture) => {
      if (!selectedCourseId) return;

      const initialTitle = lecture.title ?? "";
      const titleInput = window.prompt("새 강의 제목을 입력해주세요.", initialTitle);
      if (titleInput === null) {
        return;
      }
      const trimmedTitle = titleInput.trim();
      if (!trimmedTitle) {
        window.alert("강의 제목은 비워둘 수 없습니다.");
        return;
      }

      const weekInput = window.prompt(
        "새 주차 번호를 입력해주세요. (0 이상의 숫자)",
        lecture.weekNumber.toString()
      );
      if (weekInput === null) {
        return;
      }
      const parsedWeek = Number(weekInput);
      if (!Number.isFinite(parsedWeek) || parsedWeek < 0) {
        window.alert("주차 번호는 0 이상의 숫자여야 합니다.");
        return;
      }

      const descriptionInput = window.prompt(
        "새 강의 설명을 입력해주세요.",
        lecture.description ?? ""
      );
      if (descriptionInput === null) {
        return;
      }
      const trimmedDescription = descriptionInput.trim();
      if (!trimmedDescription) {
        window.alert("강의 설명은 비워둘 수 없습니다.");
        return;
      }

      if (courseDetail?.lectures) {
        const duplicate = courseDetail.lectures.find(
          (item) => item.weekNumber === parsedWeek && item.lectureId !== lecture.lectureId
        );
        if (duplicate) {
          window.alert(`${parsedWeek}주차는 이미 존재합니다.`);
          return;
        }
      }

      try {
        const { lectureApi } = await import("../../services/api");
        await lectureApi.updateLecture(lecture.lectureId, {
          title: trimmedTitle,
          weekNumber: parsedWeek,
          description: trimmedDescription,
        });
        await loadCourseDetail(selectedCourseId);
        window.alert("강의 정보가 수정되었습니다.");
      } catch (error) {
        const message = error instanceof Error ? error.message : "강의 정보 수정에 실패했습니다.";
        window.alert(message);
      }
    },
    [selectedCourseId, courseDetail?.lectures, loadCourseDetail]
  );

  const handleCourseEdit = useCallback(
    async (course: Course) => {
      const initialTitle = course.title ?? "";
      const initialDescription = course.description ?? "";

      const titleInput = window.prompt("새 강의실 제목을 입력해주세요.", initialTitle);
      if (titleInput === null) {
        return;
      }

      const trimmedTitle = titleInput.trim();
      if (!trimmedTitle) {
        window.alert("강의실 제목은 비워둘 수 없습니다.");
        return;
      }

      const descriptionInput = window.prompt(
        "새 강의실 설명을 입력해주세요.",
        initialDescription ?? ""
      );

      if (descriptionInput === null) {
        return;
      }

      const trimmedDescription = descriptionInput.trim();
      const result = await updateCourse(course.courseId, {
        title: trimmedTitle,
        description: trimmedDescription,
      });

      if (!result.success) {
        window.alert(result.error ?? "강의실 수정에 실패했습니다.");
        return;
      }

      if (currentCourseId === course.courseId) {
        await loadCourseDetail(course.courseId);
      }

      window.alert("강의실이 성공적으로 수정되었습니다.");
    },
    [currentCourseId, loadCourseDetail, updateCourse]
  );

  const handleCourseDelete = useCallback(
    async (course: Course) => {
      const confirmed = window.confirm(
        `정말로 '${course.title}' 강의실을 삭제하시겠습니까?\n삭제 후에는 되돌릴 수 없습니다.`
      );

      if (!confirmed) {
        return;
      }

      const result = await deleteCourse(course.courseId);

      if (!result.success) {
        window.alert(result.error ?? "강의실 삭제에 실패했습니다.");
        return;
      }

      if (currentCourseId === course.courseId) {
        setCourseDetail(null);
        setCourseDetailError(null);
        setCurrentCourseId(null);
        setCurrentLectureId(null);
        resetLectureOutputs();
        navigate("/");
      }

      window.alert("강의실이 삭제되었습니다.");
    },
    [
      currentCourseId,
      deleteCourse,
      navigate,
      resetLectureOutputs,
      setCourseDetailError,
    ]
  );

  const handleRightMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingRight(true);
  }, []);

  const handleRightMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizingRight) return;

      const newWidth = window.innerWidth - e.clientX;
      const minWidth = 260;
      const maxWidth = window.innerWidth * 0.6;

      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setRightSidebarWidth(newWidth);
      }
    },
    [isResizingRight]
  );

  const handleRightMouseUp = useCallback(() => {
    setIsResizingRight(false);
  }, []);

  const handleRightDoubleClick = useCallback(() => {
    setRightSidebarWidth(DEFAULT_RIGHT_SIDEBAR_WIDTH);
  }, []);

  useEffect(() => {
    if (isResizingRight) {
      document.addEventListener("mousemove", handleRightMouseMove);
      document.addEventListener("mouseup", handleRightMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      return () => {
        document.removeEventListener("mousemove", handleRightMouseMove);
        document.removeEventListener("mouseup", handleRightMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
    }
  }, [isResizingRight, handleRightMouseMove, handleRightMouseUp]);

  // 화면 크기에 따라 좌측 사이드바 자동 접기/펼치기 (반응형)
  useEffect(() => {
    const handleResize = () => {
      const shouldAutoCollapse = window.innerWidth < 1024;
      if (shouldAutoCollapse && !isAutoCollapsed) {
        setIsAutoCollapsed(true);
        setIsLeftSidebarCollapsed(true);
      } else if (!shouldAutoCollapse && isAutoCollapsed) {
        setIsAutoCollapsed(false);
        setIsLeftSidebarCollapsed(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isAutoCollapsed]);

  const effectiveLeftSidebarWidth = isLeftSidebarCollapsed
    ? COLLAPSED_LEFT_WIDTH
    : DEFAULT_LEFT_SIDEBAR_WIDTH;

  const toggleLeftSidebar = () => {
    setIsAutoCollapsed(false);
    setIsLeftSidebarCollapsed((prev) => !prev);
  };


  return (
    <div
      className={`h-screen w-full flex overflow-hidden transition-colors ${
        isDarkMode ? "bg-zinc-900 text-gray-100" : "bg-white text-gray-900"
      }`}
    >
      {/* 좌측 사이드바 (항상 표시) */}
      <LeftSidebar
        width={effectiveLeftSidebarWidth}
        expandedWidth={DEFAULT_LEFT_SIDEBAR_WIDTH}
        viewMode={viewMode}
        courseDetail={courseDetail}
        selectedLectureId={currentLectureId}
        onSelectLecture={handleLectureSelect}
        onDeleteLecture={handleLectureDelete}
        onEditLecture={handleLectureEdit}
        isCourseDetailLoading={isCourseDetailLoading}
        selectedMenu={selectedMenu}
        onMenuSelect={setSelectedMenu}
        isCollapsed={isLeftSidebarCollapsed}
        onToggleCollapse={toggleLeftSidebar}
      />

      <div className="flex flex-1 min-w-0 min-h-0 overflow-hidden">
        <MainContent
          viewMode={viewMode}
          courses={courses}
          isCoursesLoading={isCoursesLoading}
          coursesError={coursesError}
          onSelectCourse={handleSelectCourse}
          onBackToCourses={handleBackToCourses}
          courseDetail={courseDetail}
          isCourseDetailLoading={isCourseDetailLoading}
          courseDetailError={courseDetailError}
          selectedLectureId={currentLectureId}
          lectureMarkdown={lectureMarkdown}
          fileUrl={lectureFileUrl}
          fileName={lectureFileName}
          onEditCourse={handleCourseEdit}
          onDeleteCourse={handleCourseDelete}
          onCourseCreated={handleCourseCreated}
          selectedMenu={selectedMenu}
        />
      </div>

      {/* 우측 사이드바 구분선 및 리사이즈 핸들러 */}
      <div
        ref={rightResizeRef}
        onMouseDown={handleRightMouseDown}
        onDoubleClick={handleRightDoubleClick}
        className={`relative flex-shrink-0 cursor-col-resize transition-colors group ${
          isDarkMode ? "bg-[#1a1a1a] border-l border-white/10 hover:bg-gray-800" : "bg-white border-l border-gray-200 hover:bg-gray-200"
        } ${isResizingRight ? (isDarkMode ? "bg-gray-800" : "bg-gray-200") : ""}`}
        style={{
          width: "1px",
          zIndex: 10,
        }}
      >
        <div
          className={`absolute inset-y-0 left-1/2 -translate-x-1/2 w-8 transition-opacity ${
            isResizingRight ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
          style={{ cursor: "col-resize" }}
        />
      </div>

      <RightSidebar
        onLectureDataChange={(markdown, fileUrl, fileName) => {
          setLectureMarkdown(markdown);
          setLectureFileUrl(fileUrl);
          setLectureFileName(fileName);
        }}
        width={rightSidebarWidth}
        courseId={currentCourseId ?? undefined}
        lectureId={currentLectureId ?? undefined}
        viewMode={viewMode}
        courseDetail={courseDetail}
        onCourseCreated={handleCourseCreated}
        onLectureCreated={handleLectureCreated}
      />
    </div>
  );
};

export default AppLayout;
