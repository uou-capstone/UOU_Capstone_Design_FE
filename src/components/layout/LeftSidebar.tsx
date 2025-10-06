import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "../../contexts/ThemeContext";
import { useLectures } from "../../hooks/useLectures";

const LeftSidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDarkMode } = useTheme();
  const { lectures, isLoading, fetchLectures } = useLectures();
  const [courseId, setCourseId] = useState<number | null>(null);

  // URL에서 courseId 추출 (예: /teacher/1 또는 /student/1)
  useEffect(() => {
    const pathParts = location.pathname.split('/');
    if (pathParts.length >= 3) {
      const id = parseInt(pathParts[2]);
      if (!isNaN(id)) {
        setCourseId(id);
        fetchLectures(id);
      }
    }
  }, [location.pathname, fetchLectures]);

  // 현재 선택된 강의 ID 추출
  const getCurrentLectureId = (): number | null => {
    const pathParts = location.pathname.split('/');
    const lecturePart = pathParts[pathParts.length - 1];
    const lectureId = parseInt(lecturePart);
    return isNaN(lectureId) ? null : lectureId;
  };

  const currentLectureId = getCurrentLectureId();

  const handleLectureSelect = (lectureId: number | null): void => {
    const basePath = location.pathname.includes('/teacher') ? '/teacher' : '/student';
    if (courseId) {
      if (lectureId === null) {
        // 전체 선택
        navigate(`${basePath}/${courseId}`);
      } else {
        // 특정 강의 선택
        navigate(`${basePath}/${courseId}/${lectureId}`);
      }
    }
  };

  const isSelected = (lectureId: number | null): boolean => {
    if (lectureId === null) {
      return currentLectureId === null;
    }
    return currentLectureId === lectureId;
  };

  return (
    <aside className={`w-60 h-full overflow-y-auto border-r scrollbar-hide transition-colors ${
      isDarkMode 
        ? "bg-gray-800 border-gray-700" 
        : "bg-white border-gray-100"
    }`}>
      <div className="p-4">
        <h3 className={`text-lg font-semibold m-0 ${
          isDarkMode ? "text-white" : "text-gray-900"
        }`}>강의 목록</h3>
      </div>

      <div className="flex-1">
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <div className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
              강의 목록을 불러오는 중...
            </div>
          </div>
        ) : lectures.length === 0 ? (
          <div className="flex flex-col justify-center items-center py-8 px-4">
            <div className={`text-sm text-center ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
              등록된 강의가 없습니다
            </div>
          </div>
        ) : (
          <div className="space-y-1 px-4">
            {/* 전체 항목 */}
            <button
              onClick={() => handleLectureSelect(null)}
              className={`w-full text-left px-4 py-3 rounded-md transition-colors cursor-pointer ${
                isSelected(null)
                  ? isDarkMode 
                    ? "bg-gray-700 text-white" 
                    : "bg-gray-200 text-gray-900"
                  : isDarkMode
                    ? "text-gray-300 hover:bg-gray-700"
                    : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              전체
            </button>

            {/* 강의별 항목 */}
            {lectures.map((lecture) => (
              <button
                key={lecture.lectureId}
                onClick={() => handleLectureSelect(lecture.lectureId)}
                className={`w-full text-left px-4 py-3 rounded-md transition-colors cursor-pointer ${
                  isSelected(lecture.lectureId)
                    ? isDarkMode 
                      ? "bg-gray-700 text-white" 
                      : "bg-gray-200 text-gray-900"
                    : isDarkMode
                      ? "text-gray-300 hover:bg-gray-700"
                      : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                {lecture.title}
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
};

export default LeftSidebar;
