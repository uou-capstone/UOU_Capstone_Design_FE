import React from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";

interface TopNavProps {
  currentCourseTitle?: string | null;
  onNavigateHome?: () => void;
}

const TopNav: React.FC<TopNavProps> = ({ currentCourseTitle, onNavigateHome }) => {
  const { isDarkMode, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false);
  const userMenuRef = React.useRef<HTMLDivElement | null>(null);

  const handleLogout = () => {
    setIsUserMenuOpen(false);
    logout();
    navigate("/login");
  };

  const handleNavigateHome = () => {
    if (onNavigateHome) {
      onNavigateHome();
      return;
    }
    navigate("/");
  };

  const toggleUserMenu = () => {
    setIsUserMenuOpen((prev) => !prev);
  };

  React.useEffect(() => {
    if (!isUserMenuOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (
        userMenuRef.current &&
        event.target instanceof Node &&
        !userMenuRef.current.contains(event.target)
      ) {
        setIsUserMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isUserMenuOpen]);

  const roleLabel =
    user?.role === "TEACHER" ? "선생님" : user?.role === "STUDENT" ? "학생" : "사용자";

  return (
    <header
      className={`flex items-center justify-between px-6 py-3 h-14 border-b transition-colors ${
        isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {currentCourseTitle ? (
          <>
            <button
              type="button"
              onClick={handleNavigateHome}
              className={`inline-flex items-center justify-center w-9 h-9 rounded-lg border transition-colors ${
                isDarkMode
                  ? "border-gray-700 text-gray-200 hover:bg-gray-700"
                  : "border-gray-200 text-gray-700 hover:bg-gray-100"
              }`}
              title="과목 목록으로"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div
              className={`truncate text-lg font-semibold ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
              title={currentCourseTitle}
            >
              {currentCourseTitle}
            </div>
          </>
        ) : (
          <div className={`text-lg font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
            AI Tutor LMS
          </div>
        )}
      </div>
      <div className="flex items-center gap-4">
        {user ? (
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={toggleUserMenu}
              className="focus:outline-none"
              aria-haspopup="true"
              aria-expanded={isUserMenuOpen}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm cursor-pointer ${
                  isDarkMode ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-500 hover:bg-blue-600"
                }`}
              >
                {user.fullName.charAt(0).toUpperCase()}
              </div>
            </button>
            {isUserMenuOpen && (
              <div
                className={`absolute right-0 mt-2 w-64 rounded-xl border shadow-lg z-20 ${
                  isDarkMode ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"
                }`}
              >
                <div
                className={`px-4 py-3 border-b ${
                    isDarkMode ? "border-gray-700 text-gray-200" : "border-gray-200 text-gray-700"
                  }`}
                >
                  <p className="text-sm font-semibold">{user.fullName}</p>
                  <p className="text-xs mt-1">{user.email}</p>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] mt-2 ${
                      isDarkMode ? "bg-gray-800 text-gray-300" : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {roleLabel}
                  </span>
                </div>
                <div className="px-3 py-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">테마</span>
                    <button
                      type="button"
                      onClick={() => {
                        toggleTheme();
                      }}
                      className={`relative inline-flex h-7 w-16 items-center rounded-full transition-colors ${
                        isDarkMode ? "bg-blue-600" : "bg-gray-300"
                      }`}
                      aria-label="테마 전환"
                    >
                      <span className="absolute left-1.5 flex items-center justify-center h-5 w-5">
                        {isDarkMode ? (
                          <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" />
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 4.5a1 1 0 011 1V7a1 1 0 11-2 0V5.5a1 1 0 011-1zm0 10a3.5 3.5 0 100-7 3.5 3.5 0 000 7zm7-3.5a1 1 0 011 1v1.5a1 1 0 11-2 0V12a1 1 0 011-1zm-14 0a1 1 0 011 1v1.5a1 1 0 11-2 0V12a1 1 0 011-1zm11.95 5.536a1 1 0 011.414 0l1.06 1.06a1 1 0 11-1.414 1.415l-1.06-1.06a1 1 0 010-1.415zM5.576 6.576a1 1 0 011.414 0l1.06 1.06A1 1 0 016.636 9.05l-1.06-1.06a1 1 0 010-1.414zm11.95-1.06a1 1 0 000 1.414l1.06 1.06a1 1 0 101.414-1.414l-1.06-1.06a1 1 0 00-1.414 0zM5.576 16.424a1 1 0 000 1.414l1.06 1.06a1 1 0 001.414-1.414l-1.06-1.06a1 1 0 00-1.414 0z" />
                          </svg>
                        )}
                      </span>
                      <span className="absolute right-1.5 flex items-center justify-center h-5 w-5">
                        {isDarkMode ? (
                          <svg className="w-3.5 h-3.5 text-white/80" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" />
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5 text-gray-600/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                        )}
                      </span>
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                          isDarkMode ? "translate-x-[2.45rem]" : "translate-x-[0.3rem]"
                        }`}
                      />
                    </button>
                  </div>
                </div>
                <div className={`border-t ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className={`w-full text-left px-3 py-2 text-sm font-medium cursor-pointer ${
                      isDarkMode ? "text-red-300" : "text-red-600"
                    }`}
                  >
                    로그아웃
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => navigate("/login")}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              isDarkMode
                ? "bg-gray-700 hover:bg-gray-600 text-white"
                : "bg-gray-100 hover:bg-gray-200 text-gray-700"
            }`}
          >
            로그인
          </button>
        )}
      </div>
    </header>
  );
};

export default TopNav;
