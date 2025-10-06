import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "../../contexts/ThemeContext";
import { Week } from "../../types";

const LeftSidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDarkMode } = useTheme();

  const weeks: Week[] = [
    { id: 1, title: "1주차", date: "09/01 - 09/07" },
    { id: 2, title: "2주차", date: "09/08 - 09/14" },
    { id: 3, title: "3주차", date: "09/15 - 09/21" },
    { id: 4, title: "4주차", date: "09/22 - 09/28" },
    { id: 5, title: "5주차", date: "09/29 - 10/05" },
    { id: 6, title: "6주차", date: "10/06 - 10/12" },
    { id: 7, title: "7주차", date: "10/13 - 10/19" },
    { id: 8, title: "8주차", date: "10/20 - 10/26" },
    { id: 9, title: "9주차", date: "10/27 - 11/02" },
    { id: 10, title: "10주차", date: "11/03 - 11/09" },
    { id: 11, title: "11주차", date: "11/10 - 11/16" },
    { id: 12, title: "12주차", date: "11/17 - 11/23" },
  ];

  // 현재 경로에서 주차 정보 추출
  const getCurrentWeek = (): number | null => {
    const pathParts = location.pathname.split('/');
    const weekPart = pathParts[pathParts.length - 1];
    if (weekPart.startsWith('w')) {
      return parseInt(weekPart.substring(1));
    }
    return null; // 전체 선택
  };

  const currentWeek = getCurrentWeek();

  const handleWeekSelect = (weekId: number | null): void => {
    const basePath = location.pathname.includes('/teacher') ? '/teacher' : '/student';
    if (weekId === null) {
      // 전체 선택
      navigate(basePath);
    } else {
      // 특정 주차 선택
      navigate(`${basePath}/w${weekId}`);
    }
  };

  const isSelected = (weekId: number | null): boolean => {
    if (weekId === null) {
      return currentWeek === null;
    }
    return currentWeek === weekId;
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
        }`}>전체</h3>
      </div>

      <div className="flex-1">
        {/* 전체 항목 */}
        <div className="space-y-1 px-4">
          <button
            onClick={() => handleWeekSelect(null)}
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

          {/* 주차별 항목 */}
          {weeks.map((week) => (
            <button
              key={week.id}
              onClick={() => handleWeekSelect(week.id)}
              className={`w-full text-left px-4 py-3 rounded-md transition-colors cursor-pointer ${
                isSelected(week.id)
                  ? isDarkMode 
                    ? "bg-gray-700 text-white" 
                    : "bg-gray-200 text-gray-900"
                  : isDarkMode
                    ? "text-gray-300 hover:bg-gray-700"
                    : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {week.title}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
};

export default LeftSidebar;
