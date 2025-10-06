import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import TopNav from "../components/layout/TopNav";
import { Classroom } from "../types";

const ClassroomSelectPage: React.FC = () => {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();

  const recentClassrooms: Classroom[] = [
    { id: 2, title: "미시경제학 원론", subtitle: "2023. 10. 26 · 소스 2개" },
    { id: 3, title: "AI 추천시스템 01반", subtitle: "2023. 10. 25 · 소스 1개" },
    { id: 4, title: "운영체제", subtitle: "2023. 10. 22 · 소스 3개" },
  ];


  const handleClick = (item: Classroom): void => {
    // 선생님 강의실로 이동 (임시)
    navigate("/teacher");
  };

  const handleCreateClassroom = (): void => {
    // 새 강의실 만들기 동작 (임시)
    alert("새 강의실 만들기 (준비중)");
  };

  return (
    <div className={`flex flex-col h-screen transition-colors ${
      isDarkMode 
        ? "bg-gray-900 text-white" 
        : "bg-gray-50 text-gray-900"
    }`}>
      <TopNav />
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* 좌측 사이드바 */}
        <aside className={`w-60 h-full overflow-y-auto border-r scrollbar-hide transition-colors ${
          isDarkMode 
            ? "bg-gray-800 border-gray-700" 
            : "bg-white border-gray-100"
        }`}>
          <div className="p-4">
            <h3 className={`text-lg font-semibold m-0 ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}>강의실 관리</h3>
          </div>
          <div className="flex-1">
            {/* 메뉴 아이템들 */}
            <div className="space-y-1 px-4">
              <button
                onClick={handleCreateClassroom}
                className={`w-full text-left px-4 py-3 rounded-md transition-colors cursor-pointer ${
                  isDarkMode
                    ? "text-gray-300 hover:bg-gray-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                새 강의실 만들기
              </button>
            </div>
          </div>
        </aside>

        {/* 메인 컨텐츠 */}
        <main className={`flex-1 min-h-0 p-6 overflow-y-auto scrollbar-hide transition-colors ${
          isDarkMode ? "bg-gray-800" : "bg-white"
        }`}>
          <h2 className={`text-2xl font-bold mb-6 ${
            isDarkMode ? "text-white" : "text-gray-900"
          }`}>강의실</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl">
            {recentClassrooms.map((item) => (
              <button
                key={item.id}
                onClick={() => handleClick(item)}
                className={`h-44 rounded-2xl border transition-all duration-200 hover:-translate-y-1 shadow-sm text-left p-6 ${
                  isDarkMode 
                    ? "bg-gray-700 border-gray-600 hover:bg-gray-600" 
                    : "bg-gray-100 border-gray-200 hover:bg-gray-200"
                }`}
              >
                <div className="flex flex-col justify-between h-full">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${
                      isDarkMode 
                        ? "bg-gray-600 text-gray-300" 
                        : "bg-gray-200 text-gray-600"
                    }`}>$</div>
                    <div className={`text-lg font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>{item.title}</div>
                  </div>
                  <div className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>{item.subtitle}</div>
                </div>
              </button>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
};

export default ClassroomSelectPage;
