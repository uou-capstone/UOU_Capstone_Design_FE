import React from "react";
import { useNavigate } from "react-router-dom";
import { useTheme, type ThemeMode } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";

interface TopNavProps {
  currentCourseTitle?: string | null;
  onNavigateHome?: () => void;
}

const TopNav: React.FC<TopNavProps> = ({ currentCourseTitle, onNavigateHome }) => {
  const { isDarkMode, themeMode, setThemeMode } = useTheme();
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
        isDarkMode ? "bg-slate-700 border-slate-600" : "bg-white border-gray-100"
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {currentCourseTitle ? (
          <>
            <button
              type="button"
              onClick={handleNavigateHome}
              className={`inline-flex items-center justify-center w-9 h-9 rounded-lg border transition-colors cursor-pointer ${
                isDarkMode
                  ? "border-gray-700 text-gray-200 hover:bg-gray-700"
                  : "border-gray-200 text-gray-700 hover:bg-gray-100"
              }`}
              title="강의실 목록으로"
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
              className="focus:outline-none cursor-pointer"
              aria-haspopup="true"
              aria-expanded={isUserMenuOpen}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm cursor-pointer ${
                  isDarkMode ? "bg-gray-600 hover:bg-gray-700" : "bg-gray-500 hover:bg-gray-600"
                }`}
              >
                {user.fullName.charAt(0).toUpperCase()}
              </div>
            </button>
            {isUserMenuOpen && (
              <div
                className={`absolute right-0 mt-2 w-64 rounded-xl border shadow-lg z-20 ${
                  isDarkMode ? "bg-slate-700 border-slate-600" : "bg-white border-gray-200"
                }`}
              >
                <div
                className={`px-4 py-3 border-b ${
                    isDarkMode ? "border-slate-600 text-slate-200" : "border-gray-200 text-gray-700"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <p className="text-base font-semibold">{user.fullName}</p>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] ${
                        isDarkMode ? "bg-slate-700 text-slate-200" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {roleLabel}
                    </span>
                  </div>
                  <p className="text-xs mt-1">{user.email}</p>
                </div>
                <div className={`px-3 py-2 border-t ${isDarkMode ? "border-slate-600" : "border-gray-200"}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className={`text-xs font-medium ${isDarkMode ? "text-slate-200" : "text-gray-700"}`}>
                      테마
                    </div>
                    <label className="theme-switch">
                      <input
                        type="checkbox"
                        className="theme-switch__checkbox"
                        checked={isDarkMode}
                        onChange={(e) => setThemeMode(e.target.checked ? "dark" : "light")}
                      />
                      <div className="theme-switch__container">
                        <div className="theme-switch__circle-container">
                          <div className="theme-switch__sun-moon-container">
                            <div className="theme-switch__moon">
                              <div className="theme-switch__spot"></div>
                              <div className="theme-switch__spot"></div>
                              <div className="theme-switch__spot"></div>
                            </div>
                          </div>
                        </div>
                        <div className="theme-switch__clouds"></div>
                        <div className="theme-switch__stars-container">
                          <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%" }}>
                            <circle cx="20" cy="20" r="1.5" fill="currentColor" />
                            <circle cx="60" cy="15" r="1" fill="currentColor" />
                            <circle cx="80" cy="30" r="0.8" fill="currentColor" />
                            <circle cx="30" cy="50" r="1.2" fill="currentColor" />
                            <circle cx="70" cy="45" r="0.9" fill="currentColor" />
                          </svg>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
                <div className={`border-t ${isDarkMode ? "border-slate-600" : "border-gray-200"}`}>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className={`w-full text-left px-3 py-2 text-xs font-medium cursor-pointer ${
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
            type="button"
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
