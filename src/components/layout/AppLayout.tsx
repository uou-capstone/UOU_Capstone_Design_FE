import React, { useState, useRef, useCallback, useEffect } from "react";
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
  const DEFAULT_LEFT_SIDEBAR_WIDTH = 224; // 기본 너비 224px (w-56)
  const DEFAULT_RIGHT_SIDEBAR_WIDTH = 320; // 기본 너비 320px (w-80)
  const [leftSidebarWidth, setLeftSidebarWidth] = useState<number>(DEFAULT_LEFT_SIDEBAR_WIDTH);
  const [rightSidebarWidth, setRightSidebarWidth] = useState<number>(DEFAULT_RIGHT_SIDEBAR_WIDTH);
  const [isResizingLeft, setIsResizingLeft] = useState<boolean>(false);
  const [isResizingRight, setIsResizingRight] = useState<boolean>(false);
  const leftResizeRef = useRef<HTMLDivElement>(null);
  const rightResizeRef = useRef<HTMLDivElement>(null);

  const handleLeftMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingLeft(true);
  }, []);

  const handleRightMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingRight(true);
  }, []);

  const handleLeftMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizingLeft) return;

      const newWidth = e.clientX;
      const minWidth = 150;
      const maxWidth = window.innerWidth * 0.4;

      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setLeftSidebarWidth(newWidth);
      }
    },
    [isResizingLeft]
  );

  const handleRightMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizingRight) return;

      const newWidth = window.innerWidth - e.clientX;
      const minWidth = 200;
      const maxWidth = window.innerWidth * 0.6;

      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setRightSidebarWidth(newWidth);
      }
    },
    [isResizingRight]
  );

  const handleLeftMouseUp = useCallback(() => {
    setIsResizingLeft(false);
  }, []);

  const handleRightMouseUp = useCallback(() => {
    setIsResizingRight(false);
  }, []);

  const handleLeftDoubleClick = useCallback(() => {
    setLeftSidebarWidth(DEFAULT_LEFT_SIDEBAR_WIDTH);
  }, []);

  const handleRightDoubleClick = useCallback(() => {
    setRightSidebarWidth(DEFAULT_RIGHT_SIDEBAR_WIDTH);
  }, []);

  useEffect(() => {
    if (isResizingLeft) {
      document.addEventListener("mousemove", handleLeftMouseMove);
      document.addEventListener("mouseup", handleLeftMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      return () => {
        document.removeEventListener("mousemove", handleLeftMouseMove);
        document.removeEventListener("mouseup", handleLeftMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
    }
  }, [isResizingLeft, handleLeftMouseMove, handleLeftMouseUp]);

  useEffect(() => {
    if (isResizingRight) {
      document.addEventListener("mousemove", handleRightMouseMove);
      document.addEventListener("mouseup", handleRightMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      return () => {
        document.removeEventListener("mousemove", handleRightMouseMove);
        document.removeEventListener("mouseup", handleRightMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
    }
  }, [isResizingRight, handleRightMouseMove, handleRightMouseUp]);

  return (
    <div className={`flex flex-col h-screen transition-colors ${
      isDarkMode 
        ? "bg-gray-900 text-white" 
        : "bg-gray-50 text-gray-900"
    }`}>
      <TopNav />
      <div className="flex flex-1 overflow-hidden min-h-0">
        <LeftSidebar 
          onNavigateToApiTest={onNavigateToApiTest}
          width={leftSidebarWidth}
        />
        {/* 왼쪽 리사이저 핸들 */}
        <div
          ref={leftResizeRef}
          onMouseDown={handleLeftMouseDown}
          onDoubleClick={handleLeftDoubleClick}
          className={`relative flex-shrink-0 cursor-col-resize transition-colors group ${
            isDarkMode ? "bg-gray-800" : "bg-gray-200"
          } ${isResizingLeft ? (isDarkMode ? "bg-gray-600" : "bg-gray-400") : ""}`}
          style={{ 
            width: '2px',
            zIndex: 10,
            marginLeft: '-1px',
            marginRight: '-1px'
          }}
        >
          {/* 호버 시 더 넓은 클릭 영역 */}
          <div 
            className={`absolute inset-y-0 left-1/2 -translate-x-1/2 w-8 transition-opacity ${
              isResizingLeft ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
            style={{ cursor: 'col-resize' }}
          />
        </div>
        <MainContent 
          fileUrl={lectureFileUrl}
          fileName={lectureFileName}
        />
        {/* 오른쪽 리사이저 핸들 */}
        <div
          ref={rightResizeRef}
          onMouseDown={handleRightMouseDown}
          onDoubleClick={handleRightDoubleClick}
          className={`relative flex-shrink-0 cursor-col-resize transition-colors group ${
            isDarkMode ? "bg-gray-800" : "bg-gray-200"
          } ${isResizingRight ? (isDarkMode ? "bg-gray-600" : "bg-gray-400") : ""}`}
          style={{ 
            width: '2px',
            zIndex: 10,
            marginLeft: '-1px',
            marginRight: '-1px'
          }}
        >
          {/* 호버 시 더 넓은 클릭 영역 */}
          <div 
            className={`absolute inset-y-0 left-1/2 -translate-x-1/2 w-8 transition-opacity ${
              isResizingRight ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
            style={{ cursor: 'col-resize' }}
          />
        </div>
        <RightSidebar 
          lectureMarkdown={lectureMarkdown}
          onLectureDataChange={(markdown, fileUrl, fileName) => {
            setLectureMarkdown(markdown);
            setLectureFileUrl(fileUrl);
            setLectureFileName(fileName);
          }}
          width={rightSidebarWidth}
        />
      </div>
    </div>
  );
};

export default AppLayout;
