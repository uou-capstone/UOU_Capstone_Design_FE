import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../hooks/useAuth";
import { DevPage } from "../../types";

const TopNav: React.FC = () => {
  const [showDevMenu, setShowDevMenu] = useState<boolean>(false);
  const [showProfileMenu, setShowProfileMenu] = useState<boolean>(false);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [hasNotifications, setHasNotifications] = useState<boolean>(true); // 알림 있음/없음 상태
  const { isDarkMode, toggleTheme } = useTheme();
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isClassroomSelect = location.pathname === "/";

  const devPages: DevPage[] = [
    { name: "로그인 화면", path: "/login" },
    { name: "강의실 선택 (메인)", path: "/" },
    { name: "선생님 강의실", path: "/teacher" },
    { name: "학생 강의실", path: "/student" },
  ];

  const handlePageNavigation = (path: string): void => {
    navigate(path);
    setShowDevMenu(false);
  };

  // 클릭 외부 영역 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.dropdown-menu')) {
        setShowDevMenu(false);
        setShowProfileMenu(false);
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <header className={`flex items-center justify-between px-6 p-4 h-16 border-b transition-colors ${
      isDarkMode 
        ? "bg-gray-800 border-gray-700" 
        : "bg-white border-gray-100"
    }`}>
      <div className="flex items-center gap-3">
        {isClassroomSelect ? (
          <div className={`font-semibold ${isDarkMode ? "text-white" : "text-black"}`}>AI Tutor LMS</div>
        ) : (
          <button 
            className={`p-2 rounded-lg transition-colors cursor-pointer ${
              isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
            }`}
            onClick={() => navigate("/")}
            title="홈으로 이동"
          >
            <svg className={`w-5 h-5 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </button>
        )}
      </div>
      {/* Dev 버튼 - 중앙 위치 */}
      <div className="relative">
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors cursor-pointer"
          onClick={() => setShowDevMenu((v) => !v)}
        >
          Dev
        </button>

        {showDevMenu && (
          <div 
            className={`dropdown-menu absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-48 rounded-md shadow-lg border z-50 ${
              isDarkMode 
                ? "bg-gray-800 border-gray-700" 
                : "bg-white border-gray-200"
            }`}
          >
            {devPages.map((page) => (
              <button
                key={page.path}
                className={`w-full text-left px-4 py-2 transition-colors first:rounded-t-md last:rounded-b-md ${
                  page.current
                    ? "bg-blue-600 text-white cursor-default"
                    : isDarkMode
                      ? "text-gray-300 hover:bg-gray-700 cursor-pointer"
                      : "text-gray-900 hover:bg-gray-100 cursor-pointer"
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
      {/* 우측 사용자 영역 */}
      <div className="flex items-center gap-3">
        {/* 다크모드/라이트모드 토글 버튼 */}
        <button
          onClick={toggleTheme}
          className={`p-2 rounded-lg transition-colors cursor-pointer ${
            isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
          }`}
          title={isDarkMode ? "라이트모드로 전환" : "다크모드로 전환"}
        >
          {isDarkMode ? (
            // 라이트모드 아이콘 (태양)
            <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            // 다크모드 아이콘 (달)
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>

        {/* 알림 버튼 */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className={`p-2 rounded-lg transition-colors relative cursor-pointer ${
              isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
            }`}
            title="알림"
          >
            <svg className={`w-5 h-5 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4.828 7l2.586-2.586A2 2 0 018.828 4h6.344a2 2 0 011.414.586L19.172 7H4.828zM4 7v10a2 2 0 002 2h12a2 2 0 002-2V7H4z" />
            </svg>
            {/* 알림 배지 - 알림이 있을 때만 표시 */}
            {hasNotifications && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-xs"></span>
            )}
          </button>

          {/* 알림 드롭다운 */}
          {showNotifications && (
            <div className={`dropdown-menu absolute right-0 top-full mt-2 w-80 rounded-lg shadow-lg border z-50 ${
              isDarkMode 
                ? "bg-gray-800 border-gray-700" 
                : "bg-white border-gray-200"
            }`}>
              <div className={`p-4 border-b ${
                isDarkMode ? "border-gray-700" : "border-gray-200"
              }`}>
                <h3 className={`font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>알림</h3>
              </div>
              <div className="max-h-64 overflow-y-auto">
                <div className={`p-3 border-b ${
                  isDarkMode 
                    ? "hover:bg-gray-700 border-gray-700" 
                    : "hover:bg-gray-50 border-gray-200"
                }`}>
                  <p className={`text-sm ${isDarkMode ? "text-white" : "text-gray-900"}`}>새로운 과제가 등록되었습니다</p>
                  <p className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>2시간 전</p>
                </div>
                <div className={`p-3 border-b ${
                  isDarkMode 
                    ? "hover:bg-gray-700 border-gray-700" 
                    : "hover:bg-gray-50 border-gray-200"
                }`}>
                  <p className={`text-sm ${isDarkMode ? "text-white" : "text-gray-900"}`}>학생이 질문을 남겼습니다</p>
                  <p className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>4시간 전</p>
                </div>
                <div className={`p-3 ${
                  isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-50"
                }`}>
                  <p className={`text-sm ${isDarkMode ? "text-white" : "text-gray-900"}`}>시험 결과가 업데이트되었습니다</p>
                  <p className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>1일 전</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 프로필 드롭다운 */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className={`flex items-center gap-3 p-2 rounded-lg transition-colors cursor-pointer ${
              isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
            }`}
          >
            {/* 기본 아바타 아이콘 (인스타그램 스타일) */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              isDarkMode ? "bg-gray-600" : "bg-gray-200"
            }`}>
              <svg className={`w-5 h-5 ${isDarkMode ? "text-gray-300" : "text-gray-500"}`} fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            </div>
            <span className={`text-sm font-medium ${isDarkMode ? "text-white" : "text-gray-900"}`}>
              {user?.fullName || "사용자"}
            </span>
          </button>

          {/* 프로필 메뉴 */}
          {showProfileMenu && (
            <div className={`dropdown-menu absolute right-0 top-full mt-2 w-56 rounded-lg shadow-lg border z-50 ${
              isDarkMode 
                ? "bg-gray-800 border-gray-700" 
                : "bg-white border-gray-200"
            }`}>
              <div className={`p-4 border-b ${
                isDarkMode ? "border-gray-700" : "border-gray-200"
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isDarkMode ? "bg-gray-600" : "bg-gray-200"
                  }`}>
                    <svg className={`w-6 h-6 ${isDarkMode ? "text-gray-300" : "text-gray-500"}`} fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                  </div>
                  <div>
                    <p className={`font-medium ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                      {user?.fullName || "사용자"}
                    </p>
                    <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                      {user?.email || "이메일 없음"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="py-1">
                <button className={`w-full text-left px-4 py-2 text-sm transition-colors cursor-pointer ${
                  isDarkMode 
                    ? "text-gray-300 hover:bg-gray-700" 
                    : "text-gray-700 hover:bg-gray-50"
                }`}>
                  프로필 설정
                </button>
                <button className={`w-full text-left px-4 py-2 text-sm transition-colors cursor-pointer ${
                  isDarkMode 
                    ? "text-gray-300 hover:bg-gray-700" 
                    : "text-gray-700 hover:bg-gray-50"
                }`}>
                  계정 설정
                </button>
                <button className={`w-full text-left px-4 py-2 text-sm transition-colors cursor-pointer ${
                  isDarkMode 
                    ? "text-gray-300 hover:bg-gray-700" 
                    : "text-gray-700 hover:bg-gray-50"
                }`}>
                  도움말
                </button>
                <button 
                  className={`w-full text-left px-4 py-2 text-sm transition-colors cursor-pointer ${
                    isDarkMode 
                      ? "text-gray-300 hover:bg-gray-700" 
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                  onClick={() => setHasNotifications(!hasNotifications)}
                >
                  {hasNotifications ? '알림 끄기' : '알림 켜기'}
                </button>
                <hr className={`my-1 ${isDarkMode ? "border-gray-700" : "border-gray-200"}`} />
                <button 
                  className={`w-full text-left px-4 py-2 text-sm text-red-600 transition-colors cursor-pointer ${
                    isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-50"
                  }`}
                  onClick={logout}
                >
                  로그아웃
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopNav;
