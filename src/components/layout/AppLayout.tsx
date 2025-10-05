import React, { useState } from "react";
import TopNav from "./TopNav";
import LeftSidebar from "./LeftSidebar";
import RightSidebar from "./RightSidebar";
import MainContent from "./MainContent";
import { AppLayoutProps } from "../../types";

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [aiGeneratedContent, setAiGeneratedContent] = useState<string>("");

  const handleAIGenerate = (markdownContent: string): void => {
    setAiGeneratedContent(markdownContent);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      <TopNav />
      <div className="flex flex-1 overflow-hidden min-h-0">
        <LeftSidebar />
        {children ? (
          <main className="flex-1 min-h-0 p-6 overflow-y-auto bg-gray-900">{children}</main>
        ) : (
          <MainContent aiGeneratedContent={aiGeneratedContent} />
        )}
        <RightSidebar onAIGenerate={handleAIGenerate} />
      </div>
    </div>
  );
};

export default AppLayout;
