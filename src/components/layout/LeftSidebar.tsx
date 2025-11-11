import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import type { CourseDetail } from "../../services/api";

type ViewMode = "course-list" | "course-detail";

interface LeftSidebarProps {
  width?: number;
  viewMode: ViewMode;
  courseDetail?: CourseDetail | null;
  selectedLectureId?: number | null;
  onSelectLecture?: (lectureId: number) => void;
  isCourseDetailLoading?: boolean;
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({
  width = 224,
  viewMode,
  courseDetail,
  selectedLectureId,
  onSelectLecture,
  isCourseDetailLoading = false,
}) => {
  const { isDarkMode } = useTheme();

  const renderLectureList = () => {
    if (isCourseDetailLoading) {
      return (
        <div
          className={`text-sm ${
            isDarkMode ? "text-gray-400" : "text-gray-500"
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
        <button
          key={lecture.lectureId}
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
          <div className="flex flex-col">
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
        </button>
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
