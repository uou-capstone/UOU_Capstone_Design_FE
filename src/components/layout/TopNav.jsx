import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const TopNav = () => {
  const [showDevMenu, setShowDevMenu] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isClassroomSelect = location.pathname === "/";

  const devPages = [
    { name: "로그인 화면", path: "/login" },
    { name: "강의실 선택 (메인)", path: "/" },
    { name: "선생님 강의실", path: "/teacher" },
    { name: "학생 강의실", path: "/student" },
  ];

  const handlePageNavigation = (path) => {
    navigate(path);
    setShowDevMenu(false);
  };

  return (
    <header className="flex items-center justify-between px-6 p-4 bg-[#ffffff] h-16">
      <div className="flex items-center gap-3">
        {isClassroomSelect ? (
          <div className="text-black font-semibold">AI Tutor LMS</div>
        ) : (
          <div className="cursor-pointer text-black" onClick={() => navigate("/")}>Home</div>
        )}
      </div>
      {/* Dev 버튼 - 중앙 위치 */}
      <div className="relative">
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          onClick={() => setShowDevMenu((v) => !v)}
        >
          Dev
        </button>

        {showDevMenu && (
          <div 
            className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-48 bg-gray-700 rounded-md shadow-lg z-50"
          >
            {devPages.map((page) => (
              <button
                key={page.path}
                className={`w-full text-left px-4 py-2 transition-colors first:rounded-t-md last:rounded-b-md ${
                  page.current
                    ? "bg-blue-600 text-white cursor-default"
                    : "text-white hover:bg-gray-600"
                }`}
                onClick={() => !page.current && handlePageNavigation(page.path)}
                disabled={page.current}
              >
                {page.name}
              </button>
            ))}
          </div>
        )}
      </div>
      {isClassroomSelect ? (
        <div className="flex items-center gap-3 text-sm">
          <button className="px-3 py-1.5 rounded bg-gray-200 hover:bg-gray-300 text-gray-800">설정</button>
          <button className="px-3 py-1.5 rounded bg-fuchsia-600 hover:bg-fuchsia-700 text-white">PRO</button>
          <div className="w-8 h-8 rounded-full bg-gray-400" />
        </div>
      ) : (
        <div className="w-20"></div>
      )}
    </header>
  );
};

export default TopNav;
