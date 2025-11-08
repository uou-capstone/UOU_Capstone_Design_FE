import React from "react";
import { useTheme } from "../../contexts/ThemeContext";

interface LeftSidebarProps {
  onNavigateToApiTest?: () => void;
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({ onNavigateToApiTest }) => {
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
        <div className={`text-sm font-semibold mb-4 ${
          isDarkMode ? "text-gray-300" : "text-gray-600"
        }`}>
          왼쪽 사이드바 영역
        </div>
        {onNavigateToApiTest && (
          <button
            onClick={onNavigateToApiTest}
            className={`w-full px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              isDarkMode
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-blue-100 hover:bg-blue-200 text-blue-900"
            }`}
          >
            🔧 API 테스트
          </button>
        )}
      </div>
    </aside>
  );
};

export default LeftSidebar;
