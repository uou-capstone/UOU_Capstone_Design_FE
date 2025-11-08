import React from "react";
import { useTheme } from "../../contexts/ThemeContext";

const LeftSidebar: React.FC = () => {
  const { isDarkMode } = useTheme();

  return (
    <aside
      className={`w-56 h-full overflow-y-auto border-r scrollbar-hide transition-colors ${
        isDarkMode
          ? "bg-gray-900 border-gray-800"
          : "bg-white border-gray-100"
      }`}
    >
      <div className="p-6">
        <div className={`text-sm font-semibold ${
          isDarkMode ? "text-gray-300" : "text-gray-600"
        }`}>
          왼쪽 사이드바 영역
        </div>
      </div>
    </aside>
  );
};

export default LeftSidebar;
