import React, { useState } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import TopNav from "./TopNav.tsx";
import LeftSidebar from "./LeftSidebar.tsx";
import RightSidebar from "./RightSidebar.tsx";
import MainContent from "./MainContent.tsx";
import { AppLayoutProps } from "../../types";

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [aiGeneratedContent, setAiGeneratedContent] = useState<string>("");
  const { isDarkMode } = useTheme();

  const handleAIGenerate = (markdownContent: string): void => {
    setAiGeneratedContent(markdownContent);
  };

  return (
    <div className={`flex flex-col h-screen transition-colors ${
      isDarkMode 
        ? "bg-gray-900 text-white" 
        : "bg-gray-50 text-gray-900"
    }`}>
      <TopNav />
      <div className="flex flex-1 overflow-hidden min-h-0">
        <LeftSidebar />
        {children ? (
          <main className={`flex-1 min-h-0 p-6 overflow-y-auto scrollbar-hide ${
            isDarkMode ? "bg-gray-800" : "bg-white"
          }`}>{children}</main>
        ) : (
          <MainContent aiGeneratedContent={aiGeneratedContent} />
        )}
        <RightSidebar onAIGenerate={handleAIGenerate} />
      </div>
    </div>
  );
};

export default AppLayout;
