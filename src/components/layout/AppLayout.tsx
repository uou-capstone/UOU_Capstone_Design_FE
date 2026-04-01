import React, { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate, useParams, useLocation, useSearchParams } from "react-router-dom";
import { useTheme } from "../../contexts/ThemeContext";
import MainContent from "./MainContent.tsx";
import TopNav from "./TopNav.tsx";
import { useCourses } from "../../hooks/useCourses";
import type { Course, CourseDetail, LectureResponseDto } from "../../services/api";

type ViewMode = "course-list" | "course-detail";
type MenuItem = "lectures" | "settings" | "report";

type CourseLecture = NonNullable<NonNullable<CourseDetail["lectures"]>[number]>;

const getLastLectureStorageKey = (courseId: number) => `course_${courseId}_last_lecture`;

const AppLayout: React.FC = () => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { courseId: courseIdParam } = useParams<{ courseId?: string }>();
  const selectedCourseId = courseIdParam
    ? (() => {
        const parsed = Number(courseIdParam);
        return Number.isFinite(parsed) ? parsed : null;
      })()
    : null;

  const {
    courses,
    isLoading: isCoursesLoading,
    fetchCourses,
    getCourseDetail,
    updateCourse,
    deleteCourse,
  } = useCourses();

  const [courseDetail, setCourseDetail] = useState<CourseDetail | null>(null);
  /** /courses/:id 직접 진입·새로고침 시 첫 프레임에 !detail && !loading 로 오류 UI가 깜빡이지 않도록 */
  const [isCourseDetailLoading, setIsCourseDetailLoading] = useState(() => {
    if (!courseIdParam) return false;
    const p = Number(courseIdParam);
    return Number.isFinite(p);
  });
  const [courseDetailError, setCourseDetailError] = useState<string | null>(null);

  const [currentCourseId, setCurrentCourseId] = useState<number | null>(null);
  const [currentLectureId, setCurrentLectureId] = useState<number | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string | null>(null);
  const viewerBackHandlerRef = useRef<(() => void) | null>(null);
  const registerViewerBackHandler = useCallback((fn: (() => void) | null) => {
    viewerBackHandlerRef.current = fn;
  }, []);

  // 메뉴 상태 관리 (메인 페이지일 때만 사용) - 기본은 "강의"
  const [selectedMenu, setSelectedMenu] = useState<MenuItem>("lectures");
  const viewMode: ViewMode = selectedCourseId ? "course-detail" : "course-list";
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

  const resetLectureOutputs = useCallback(() => {
    try {
      if (selectedCourseId != null) {
        localStorage.removeItem(getLastLectureStorageKey(selectedCourseId));
      }
      if (currentLectureId != null) {
        localStorage.removeItem(`lecture_upload_${currentLectureId}`);
      }
    } catch {
      // ignore storage errors
    }
  }, [selectedCourseId, currentLectureId]);

  useEffect(() => {
    if (!selectedCourseId) {
      setIsCourseDetailLoading(false);
      setCourseDetail(null);
      setCourseDetailError(null);
      setCurrentCourseId(null);
      setCurrentLectureId(null);
      resetLectureOutputs();
      // 설정/신고 페이지로 이동한 경우 메뉴는 pathname effect에서 처리, 그 외에만 "강의"로
      if (pathname !== "/settings" && pathname !== "/report") {
        setSelectedMenu("lectures");
      }
      return;
    }
    // resetLectureOutputs() 호출 제거: 마지막 강의 복원을 위해 localStorage 유지
    loadCourseDetail(selectedCourseId);
  }, [selectedCourseId, loadCourseDetail, resetLectureOutputs, pathname]);

  // URL 경로에 따라 메뉴 동기화
  useEffect(() => {
    if (pathname === "/settings") setSelectedMenu("settings");
    else if (pathname === "/report") setSelectedMenu("report");
  }, [pathname]);

  // 설정/신고 페이지로 전환 시 미리보기 상태(뒤로가기 버튼, 파일 제목) 초기화
  useEffect(() => {
    if (selectedMenu === "settings" || selectedMenu === "report") {
      setPreviewFileName(null);
    }
  }, [selectedMenu]);

  useEffect(() => {
    if (!selectedCourseId || !courseDetail?.lectures?.length) return;

    let lectureIdToUse: number | null = null;
    const fromUrl = searchParams.get("lecture");
    if (fromUrl) {
      const n = Number(fromUrl);
      if (
        Number.isFinite(n) &&
        courseDetail.lectures.some((l) => l.lectureId === n)
      ) {
        lectureIdToUse = n;
      }
    }

    if (lectureIdToUse == null) {
      try {
        const key = getLastLectureStorageKey(selectedCourseId);
        const raw = localStorage.getItem(key);
        if (raw) {
          const lectureId = Number(raw);
          if (Number.isFinite(lectureId)) {
            const exists = courseDetail.lectures.some(
              (l) => l.lectureId === lectureId,
            );
            if (exists) lectureIdToUse = lectureId;
          }
        }
      } catch {
        // ignore
      }
    }

    if (lectureIdToUse == null) {
      const otLecture = courseDetail.lectures.find((l) => l.weekNumber === 0);
      if (otLecture) lectureIdToUse = otLecture.lectureId;
    }

    if (lectureIdToUse != null) {
      setCurrentLectureId(lectureIdToUse);
      const coursePath = `/courses/${selectedCourseId}`;
      if (
        pathname.startsWith(coursePath) &&
        searchParams.get("lecture") !== String(lectureIdToUse)
      ) {
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            next.set("lecture", String(lectureIdToUse));
            return next;
          },
          { replace: true },
        );
      }
    }
  }, [
    selectedCourseId,
    courseDetail,
    searchParams,
    pathname,
    setSearchParams,
  ]);

  const handleSelectCourse = (courseId: number) => {
    navigate(`/courses/${courseId}`);
  };

  const handleBackToCourses = () => {
    setSelectedMenu("lectures");
    navigate("/");
  };

  const handleBackFromPreview = useCallback(() => {
    setSelectedMenu("lectures");
    viewerBackHandlerRef.current?.();
  }, []);

  const handleCourseCreated = (_course: CourseDetail) => {
    fetchCourses();
    resetLectureOutputs();
    setCurrentLectureId(null);
  };

  const handleLectureCreated = async (lecture: LectureResponseDto) => {
    if (!selectedCourseId) return;
    await loadCourseDetail(selectedCourseId);
    resetLectureOutputs();
    setCurrentLectureId(lecture.lectureId);
    try {
      localStorage.setItem(getLastLectureStorageKey(selectedCourseId), String(lecture.lectureId));
    } catch {
      // ignore
    }
  };

  const handleLectureDelete = useCallback(
    async (lectureId: number, options?: { skipAlert?: boolean }) => {
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
        
        if (!options?.skipAlert) {
          window.alert("강의가 삭제되었습니다.");
        }
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
    if (selectedCourseId != null) {
      try {
        localStorage.setItem(getLastLectureStorageKey(selectedCourseId), String(lectureId));
      } catch {
        // ignore
      }
    }
    if (selectedCourseId != null && pathname.startsWith(`/courses/${selectedCourseId}`)) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("lecture", String(lectureId));
          next.delete("material");
          next.delete("gen");
          next.delete("exam");
          return next;
        },
        { replace: true },
      );
    }
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
    async (course: Course, options?: { skipConfirm?: boolean }) => {
      if (!options?.skipConfirm) {
        const confirmed = window.confirm(
          `정말로 '${course.title}' 강의실을 삭제하시겠습니까?\n삭제 후에는 되돌릴 수 없습니다.`
        );
        if (!confirmed) return;
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
    [currentCourseId, deleteCourse, navigate, resetLectureOutputs]
  );

  return (
    <div
      className={`h-screen w-full max-w-full flex flex-col transition-colors gap-8 overflow-hidden ${
        isDarkMode ? "bg-[#141414] text-gray-100" : "bg-white text-gray-900"
      }`}
    >
      <TopNav
        isCourseDetail={viewMode === "course-detail"}
        isSettingsPage={selectedMenu === "settings"}
        isReportPage={selectedMenu === "report"}
        onNavigateHome={handleBackToCourses}
        onOpenSettings={() => {
          setSelectedMenu("settings");
          navigate("/settings");
        }}
        onOpenReport={() => {
          setSelectedMenu("report");
          navigate("/report");
        }}
        previewFileName={previewFileName}
        onBackFromPreview={handleBackFromPreview}
      />
      <div className="flex-1 min-h-0 min-w-0 flex overflow-hidden">
        <MainContent
          viewMode={viewMode}
          courses={courses}
          isCoursesLoading={isCoursesLoading}
          onSelectCourse={handleSelectCourse}
          onBackToCourses={handleBackToCourses}
          courseDetail={courseDetail}
          isCourseDetailLoading={isCourseDetailLoading}
          courseDetailError={courseDetailError}
          selectedLectureId={currentLectureId}
          onSelectLecture={handleLectureSelect}
          onEditCourse={handleCourseEdit}
          onUpdateCourse={updateCourse}
          onReloadCourseDetail={async () => {
            if (selectedCourseId != null) {
              await loadCourseDetail(selectedCourseId);
            }
          }}
          onDeleteCourse={handleCourseDelete}
          onEditLecture={handleLectureEdit}
          onDeleteLecture={handleLectureDelete}
          onCourseCreated={handleCourseCreated}
          onLectureCreated={handleLectureCreated}
          selectedMenu={selectedMenu}
          onPreviewStateChange={setPreviewFileName}
          registerViewerBackHandler={registerViewerBackHandler}
        />
      </div>
    </div>
  );
};

export default AppLayout;
