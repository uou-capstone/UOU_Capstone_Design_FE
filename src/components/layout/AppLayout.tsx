import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import TopNav from "./TopNav.tsx";
import LeftSidebar from "./LeftSidebar.tsx";
import RightSidebar from "./RightSidebar.tsx";
import MainContent from "./MainContent.tsx";

interface AppLayoutProps {
  onNavigateToApiTest?: () => void;
}

const AppLayout: React.FC<AppLayoutProps> = ({ onNavigateToApiTest }) => {
  const { isDarkMode } = useTheme();

  return (
    <div className={`flex flex-col h-screen transition-colors ${
      isDarkMode 
        ? "bg-gray-900 text-white" 
        : "bg-gray-50 text-gray-900"
    }`}>
      <TopNav />
      <div className="flex flex-1 overflow-hidden min-h-0">
        <LeftSidebar onNavigateToApiTest={onNavigateToApiTest} />
        <MainContent />
        <RightSidebar />
      </div>
    </div>
  );
};

export default AppLayout;
