import React, { useState } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import type { CourseDetail } from "../../services/api";

type ViewMode = "course-list" | "course-detail";

type MenuItem = 
  | "dashboard" 
  | "lectures" 
  | "assignments" 
  | "progress" 
  | "ai-tutor" 
  | "smart-recommendation" 
  | "auto-evaluation" 
  | "settings" 
  | "help";

interface LeftSidebarProps {
  width?: number;
  viewMode: ViewMode;
  courseDetail?: CourseDetail | null;
  selectedLectureId?: number | null;
  onSelectLecture?: (lectureId: number) => void;
  onDeleteLecture?: (lectureId: number) => void;
  isCourseDetailLoading?: boolean;
  selectedMenu?: MenuItem;
  onMenuSelect?: (menu: MenuItem) => void;
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({
  width = 224,
  viewMode,
  courseDetail,
  selectedLectureId,
  onSelectLecture,
  onDeleteLecture,
  isCourseDetailLoading = false,
  selectedMenu: externalSelectedMenu,
  onMenuSelect,
}) => {
  const { isDarkMode } = useTheme();
  const { user } = useAuth();
  const isTeacher = user?.role === "TEACHER";
  const [internalSelectedMenu, setInternalSelectedMenu] = useState<MenuItem>("dashboard");
  
  // 외부에서 전달된 selectedMenu가 있으면 사용, 없으면 내부 상태 사용
  const selectedMenu = externalSelectedMenu ?? internalSelectedMenu;
  
  const handleMenuSelect = (menu: MenuItem) => {
    if (onMenuSelect) {
      onMenuSelect(menu);
    } else {
      setInternalSelectedMenu(menu);
    }
  };

  const renderLectureList = () => {
    if (isCourseDetailLoading) {
      return (
        <div
          className={`text-sm ${
            isDarkMode   ? "text-gray-400" : "text-gray-500"
          }`}
        >
          강의 목록을 불러오는 중...
        </div>
      );
    }

    if (!courseDetail?.lectures || courseDetail.lectures.length === 0) {
      return (
        <div
          className={`text-sm ${
            isDarkMode ? "text-gray-500" : "text-gray-500"
          }`}
        >
          등록된 강의가 없습니다.
        </div>
      );
    }

    return courseDetail.lectures.map((lecture) => {
      const isSelected = selectedLectureId === lecture.lectureId;
      return (
        <div
          key={lecture.lectureId}
          className="relative group"
        >
          <button
            type="button"
            onClick={() => onSelectLecture?.(lecture.lectureId)}
            className={`w-full text-left px-3 py-2 rounded-lg transition-colors cursor-pointer ${
              isSelected
                ? isDarkMode
                  ? "bg-blue-600/25 text-blue-100"
                  : "bg-blue-200/80 text-blue-800"
                : isDarkMode
                ? "hover:bg-gray-800 text-gray-200"
                : "hover:bg-gray-100 text-gray-700"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-sm font-medium truncate">{lecture.title}</span>
                <span
                  className={`text-xs ${
                    isSelected
                      ? isDarkMode
                        ? "text-blue-200"
                        : "text-blue-600"
                      : isDarkMode
                      ? "text-gray-400"
                      : "text-gray-500"
                  }`}
                >
                  {lecture.weekNumber}주차
                </span>
              </div>
              {isTeacher && onDeleteLecture && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`"${lecture.title}" (${lecture.weekNumber}주차)를 삭제하시겠습니까?`)) {
                      onDeleteLecture(lecture.lectureId);
                    }
                  }}
                  className={`ml-2 p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                    isDarkMode
                      ? "hover:bg-red-600/20 text-red-400 hover:text-red-300"
                      : "hover:bg-red-100 text-red-600 hover:text-red-700"
                  }`}
                  title="강의 삭제"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          </button>
        </div>
      );
    });
  };

  return (
    <aside
      className={`h-full overflow-y-auto border-r scrollbar-hide transition-colors flex-shrink-0 ${
        isDarkMode
          ? "bg-gray-900 border-gray-800"
          : "bg-white border-gray-100"
      }`}
      style={{ width: `${width}px` }}
    >
      <div className="h-full p-4 flex flex-col">
        {viewMode === "course-detail" ? (
          <div className="flex flex-col gap-2">
            <h2 className={`text-sm font-semibold mb-3 ${
              isDarkMode ? "text-gray-300" : "text-gray-700"
            }`}>
              강의 목록
            </h2>
            {renderLectureList()}
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* 학습 섹션 */}
            <div>
              <h3 className={`text-xs font-semibold mb-3 ${
                isDarkMode ? "text-gray-500" : "text-gray-500"
              }`}>
                학습
              </h3>
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => handleMenuSelect("dashboard")}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                    selectedMenu === "dashboard"
                      ? "bg-purple-600 text-white"
                      : isDarkMode
                      ? "text-gray-300 hover:bg-gray-800"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  <span>대시보드</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleMenuSelect("lectures")}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                    selectedMenu === "lectures"
                      ? "bg-purple-600 text-white"
                      : isDarkMode
                      ? "text-gray-300 hover:bg-gray-800"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <span>강의</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleMenuSelect("assignments")}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                    selectedMenu === "assignments"
                      ? "bg-purple-600 text-white"
                      : isDarkMode
                      ? "text-gray-300 hover:bg-gray-800"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                  <span>과제</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleMenuSelect("progress")}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                    selectedMenu === "progress"
                      ? "bg-purple-600 text-white"
                      : isDarkMode
                      ? "text-gray-300 hover:bg-gray-800"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span>진도율</span>
                </button>
              </div>
            </div>

            {/* 구분선 */}
            <div className={`border-t ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}></div>

            {/* AI 도구 섹션 */}
            <div>
              <h3 className={`text-xs font-semibold mb-3 ${
                isDarkMode ? "text-gray-500" : "text-gray-500"
              }`}>
                AI 도구
              </h3>
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => handleMenuSelect("ai-tutor")}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                    selectedMenu === "ai-tutor"
                      ? "bg-purple-600 text-white"
                      : isDarkMode
                      ? "text-gray-300 hover:bg-gray-800"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <span>AI 튜터</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleMenuSelect("smart-recommendation")}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                    selectedMenu === "smart-recommendation"
                      ? "bg-purple-600 text-white"
                      : isDarkMode
                      ? "text-gray-300 hover:bg-gray-800"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <span>스마트 추천</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleMenuSelect("auto-evaluation")}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                    selectedMenu === "auto-evaluation"
                      ? "bg-purple-600 text-white"
                      : isDarkMode
                      ? "text-gray-300 hover:bg-gray-800"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  <span>자동 평가</span>
                </button>
              </div>
            </div>

            {/* 구분선 */}
            <div className={`border-t ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}></div>

            {/* 설정 섹션 */}
            <div>
              <h3 className={`text-xs font-semibold mb-3 ${
                isDarkMode ? "text-gray-500" : "text-gray-500"
              }`}>
                설정
              </h3>
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => handleMenuSelect("settings")}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                    selectedMenu === "settings"
                      ? "bg-purple-600 text-white"
                      : isDarkMode
                      ? "text-gray-300 hover:bg-gray-800"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>환경설정</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleMenuSelect("help")}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                    selectedMenu === "help"
                      ? "bg-purple-600 text-white"
                      : isDarkMode
                      ? "text-gray-300 hover:bg-gray-800"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>도움말</span>
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Version 표시 (하단 고정) */}
        <div className={`mt-auto pt-4 border-t ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}>
          <p className={`text-xs text-center ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
            Version 1.0
          </p>
        </div>
      </div>
    </aside>
  );
};

export default LeftSidebar;
