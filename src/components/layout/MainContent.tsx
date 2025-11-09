import React from "react";
import { useTheme } from "../../contexts/ThemeContext";

const MainContent: React.FC = () => {
  const { isDarkMode } = useTheme();

  return (
    <div
      className={`flex-1 min-h-0 p-6 overflow-y-auto scrollbar-hide transition-colors ${
        isDarkMode ? "bg-gray-900" : "bg-gray-50"
      }`}
    >
      <div className={`text-base font-medium ${
        isDarkMode ? "text-gray-200" : "text-gray-600"
      }`}>
        메인 콘텐츠 영역
      </div>
    </div>
  );
};

export default MainContent;
