import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import type { CourseDetail } from "../../services/api";

type ViewMode = "course-list" | "course-detail";

interface LeftSidebarProps {
  width?: number;
  viewMode: ViewMode;
  courseDetail?: CourseDetail | null;
  selectedLectureId?: number | null;
  onSelectLecture?: (lectureId: number) => void;
  onDeleteLecture?: (lectureId: number) => void;
  isCourseDetailLoading?: boolean;
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({
  width = 224,
  viewMode,
  courseDetail,
  selectedLectureId,
  onSelectLecture,
  onDeleteLecture,
  isCourseDetailLoading = false,
}) => {
  const { isDarkMode } = useTheme();
  const { user } = useAuth();
  const isTeacher = user?.role === "TEACHER";

  const renderLectureList = () => {
    if (isCourseDetailLoading) {
      return (
        <div
          className={`text-sm ${
            isDarkMode   ? "text-gray-400" : "text-gray-500"
          }`}
        >
          강의 목록을 불러오는 중...
        </div>
      );
    }

    if (!courseDetail?.lectures || courseDetail.lectures.length === 0) {
      return (
        <div
          className={`text-sm ${
            isDarkMode ? "text-gray-500" : "text-gray-500"
          }`}
        >
          등록된 강의가 없습니다.
        </div>
      );
    }

    return courseDetail.lectures.map((lecture) => {
      const isSelected = selectedLectureId === lecture.lectureId;
      return (
        <div
          key={lecture.lectureId}
          className="relative group"
        >
          <button
            type="button"
            onClick={() => onSelectLecture?.(lecture.lectureId)}
            className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
              isSelected
                ? isDarkMode
                  ? "bg-blue-600/25 text-blue-100"
                  : "bg-blue-200/80 text-blue-800"
                : isDarkMode
                ? "hover:bg-gray-800 text-gray-200"
                : "hover:bg-gray-100 text-gray-700"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-sm font-medium truncate">{lecture.title}</span>
                <span
                  className={`text-xs ${
                    isSelected
                      ? isDarkMode
                        ? "text-blue-200"
                        : "text-blue-600"
                      : isDarkMode
                      ? "text-gray-400"
                      : "text-gray-500"
                  }`}
                >
                  {lecture.weekNumber}주차
                </span>
              </div>
              {isTeacher && onDeleteLecture && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`"${lecture.title}" (${lecture.weekNumber}주차)를 삭제하시겠습니까?`)) {
                      onDeleteLecture(lecture.lectureId);
                    }
                  }}
                  className={`ml-2 p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                    isDarkMode
                      ? "hover:bg-red-600/20 text-red-400 hover:text-red-300"
                      : "hover:bg-red-100 text-red-600 hover:text-red-700"
                  }`}
                  title="강의 삭제"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          </button>
        </div>
      );
    });
  };

  return (
    <aside
      className={`h-full overflow-y-auto border-r scrollbar-hide transition-colors flex-shrink-0 ${
        isDarkMode
          ? "bg-gray-900 border-gray-800"
          : "bg-white border-gray-100"
      }`}
      style={{ width: `${width}px` }}
    >
      <div className="h-full p-4">
        {viewMode === "course-detail" ? (
          <div className="flex flex-col gap-2">{renderLectureList()}</div>
        ) : null}
      </div>
    </aside>
  );
};

export default LeftSidebar;
