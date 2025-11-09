import React, { useState } from "react";
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
  const [lectureMarkdown, setLectureMarkdown] = useState<string>("");
  const [lectureFileUrl, setLectureFileUrl] = useState<string>("");
  const [lectureFileName, setLectureFileName] = useState<string>("");

  return (
    <div className={`flex flex-col h-screen transition-colors ${
      isDarkMode 
        ? "bg-gray-900 text-white" 
        : "bg-gray-50 text-gray-900"
    }`}>
      <TopNav />
      <div className="flex flex-1 overflow-hidden min-h-0">
        <LeftSidebar onNavigateToApiTest={onNavigateToApiTest} />
        <MainContent 
          fileUrl={lectureFileUrl}
          fileName={lectureFileName}
        />
        <RightSidebar 
          lectureMarkdown={lectureMarkdown}
          onLectureDataChange={(markdown, fileUrl, fileName) => {
            setLectureMarkdown(markdown);
            setLectureFileUrl(fileUrl);
            setLectureFileName(fileName);
          }}
        />
      </div>
    </div>
  );
};

export default AppLayout;
