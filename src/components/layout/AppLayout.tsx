import React, { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTheme } from "../../contexts/ThemeContext";
import TopNav from "./TopNav.tsx";
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

const DEFAULT_LEFT_SIDEBAR_WIDTH = 224;
const DEFAULT_RIGHT_SIDEBAR_WIDTH = 420;

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

  const [leftSidebarWidth, setLeftSidebarWidth] = useState<number>(DEFAULT_LEFT_SIDEBAR_WIDTH);
  const [rightSidebarWidth, setRightSidebarWidth] = useState<number>(DEFAULT_RIGHT_SIDEBAR_WIDTH);
  const [isResizingLeft, setIsResizingLeft] = useState<boolean>(false);
  const [isResizingRight, setIsResizingRight] = useState<boolean>(false);
  const leftResizeRef = useRef<HTMLDivElement>(null);
  const rightResizeRef = useRef<HTMLDivElement>(null);
  
  // 메뉴 상태 관리 (메인 페이지일 때만 사용)
  const [selectedMenu, setSelectedMenu] = useState<MenuItem>("dashboard");

  const viewMode: ViewMode = selectedCourseId ? "course-detail" : "course-list";
  const currentCourseTitle =
    viewMode === "course-detail"
      ? courseDetail?.title ??
        (currentCourseId
          ? courses.find((courseItem) => courseItem.courseId === currentCourseId)?.title ?? null
          : null)
      : null;

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
          setCourseDetailError("과목 정보를 불러오지 못했습니다.");
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "과목 정보를 불러오지 못했습니다.";
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
      // 메인 페이지로 돌아올 때 대시보드로 리셋
      setSelectedMenu("dashboard");
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
    navigate("/");
  };

  const handleCourseCreated = (course: CourseDetail) => {
    fetchCourses();
    resetLectureOutputs();
    setCurrentLectureId(null);
    navigate(`/courses/${course.courseId}`);
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

  const handleCourseEdit = useCallback(
    async (course: Course) => {
      const initialTitle = course.title ?? "";
      const initialDescription = course.description ?? "";

      const titleInput = window.prompt("새 과목 제목을 입력해주세요.", initialTitle);
      if (titleInput === null) {
        return;
      }

      const trimmedTitle = titleInput.trim();
      if (!trimmedTitle) {
        window.alert("과목 제목은 비워둘 수 없습니다.");
        return;
      }

      const descriptionInput = window.prompt(
        "새 과목 설명을 입력해주세요.",
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
        window.alert(result.error ?? "과목 수정에 실패했습니다.");
        return;
      }

      if (currentCourseId === course.courseId) {
        await loadCourseDetail(course.courseId);
      }

      window.alert("과목이 성공적으로 수정되었습니다.");
    },
    [currentCourseId, loadCourseDetail, updateCourse]
  );

  const handleCourseDelete = useCallback(
    async (course: Course) => {
      const confirmed = window.confirm(
        `정말로 '${course.title}' 과목을 삭제하시겠습니까?\n삭제 후에는 되돌릴 수 없습니다.`
      );

      if (!confirmed) {
        return;
      }

      const result = await deleteCourse(course.courseId);

      if (!result.success) {
        window.alert(result.error ?? "과목 삭제에 실패했습니다.");
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

      window.alert("과목이 삭제되었습니다.");
    },
    [
      currentCourseId,
      deleteCourse,
      navigate,
      resetLectureOutputs,
      setCourseDetailError,
    ]
  );

  const handleLeftMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingLeft(true);
  }, []);

  const handleRightMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingRight(true);
  }, []);

  const handleLeftMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizingLeft) return;

      const newWidth = e.clientX;
      const minWidth = 150;
      const maxWidth = window.innerWidth * 0.4;

      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setLeftSidebarWidth(newWidth);
      }
    },
    [isResizingLeft]
  );

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

  const handleLeftMouseUp = useCallback(() => {
    setIsResizingLeft(false);
  }, []);

  const handleRightMouseUp = useCallback(() => {
    setIsResizingRight(false);
  }, []);

  const handleLeftDoubleClick = useCallback(() => {
    setLeftSidebarWidth(DEFAULT_LEFT_SIDEBAR_WIDTH);
  }, []);

  const handleRightDoubleClick = useCallback(() => {
    setRightSidebarWidth(DEFAULT_RIGHT_SIDEBAR_WIDTH);
  }, []);

  useEffect(() => {
    if (isResizingLeft) {
      document.addEventListener("mousemove", handleLeftMouseMove);
      document.addEventListener("mouseup", handleLeftMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      return () => {
        document.removeEventListener("mousemove", handleLeftMouseMove);
        document.removeEventListener("mouseup", handleLeftMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
    }
  }, [isResizingLeft, handleLeftMouseMove, handleLeftMouseUp]);

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

  return (
    <div
      className={`flex flex-col h-screen transition-colors ${
        isDarkMode ? "bg-slate-900 text-slate-100" : "bg-gray-50 text-gray-900"
      }`}
    >
      <TopNav currentCourseTitle={currentCourseTitle} onNavigateHome={handleBackToCourses} />
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* 좌측 사이드바 (항상 표시) */}
        <LeftSidebar
          width={leftSidebarWidth}
          viewMode={viewMode}
          courseDetail={courseDetail}
          selectedLectureId={currentLectureId}
          onSelectLecture={handleLectureSelect}
          onDeleteLecture={handleLectureDelete}
          isCourseDetailLoading={isCourseDetailLoading}
          selectedMenu={selectedMenu}
          onMenuSelect={setSelectedMenu}
        />
        <div
          ref={leftResizeRef}
          onMouseDown={handleLeftMouseDown}
          onDoubleClick={handleLeftDoubleClick}
          className={`relative flex-shrink-0 cursor-col-resize transition-colors group ${
            isDarkMode ? "bg-slate-800" : "bg-gray-200"
          } ${isResizingLeft ? (isDarkMode ? "bg-slate-700" : "bg-gray-400") : ""}`}
          style={{
            width: "2px",
            zIndex: 10,
            marginLeft: "-1px",
            marginRight: "-1px",
          }}
        >
          <div
            className={`absolute inset-y-0 left-1/2 -translate-x-1/2 w-8 transition-opacity ${
              isResizingLeft ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            }`}
            style={{ cursor: "col-resize" }}
          />
        </div>

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

        {/* 우측 사이드바 (항상 표시) */}
        <div
          ref={rightResizeRef}
          onMouseDown={handleRightMouseDown}
          onDoubleClick={handleRightDoubleClick}
          className={`relative flex-shrink-0 cursor-col-resize transition-colors group ${
            isDarkMode ? "bg-slate-800" : "bg-gray-200"
          } ${isResizingRight ? (isDarkMode ? "bg-slate-700" : "bg-gray-400") : ""}`}
          style={{
            width: "2px",
            zIndex: 10,
            marginLeft: "-1px",
            marginRight: "-1px",
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
          lectureMarkdown={lectureMarkdown}
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
    </div>
  );
};

export default AppLayout;
