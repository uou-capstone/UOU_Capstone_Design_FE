import React from "react";
import { useTheme } from "../../contexts/ThemeContext";

const RightSidebar: React.FC = () => {
  const { isDarkMode } = useTheme();

  return (
    <aside
      className={`w-80 p-6 overflow-y-auto border-l transition-colors ${
        isDarkMode ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100"
      }`}
    >
      <div className={`text-sm font-semibold ${
        isDarkMode ? "text-gray-300" : "text-gray-600"
      }`}>
        오른쪽 사이드바 영역
      </div>
    </aside>
  );
};

export default RightSidebar;
