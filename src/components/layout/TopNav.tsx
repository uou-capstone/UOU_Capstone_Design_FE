import React from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";

interface TopNavProps {
  isCourseDetail?: boolean;
  isSettingsPage?: boolean;
  onNavigateHome?: () => void;
  onOpenSettings?: () => void;
  previewFileName?: string | null;
  onBackFromPreview?: () => void;
}

const TopNav: React.FC<TopNavProps> = ({ isCourseDetail, isSettingsPage, onNavigateHome, onOpenSettings, previewFileName, onBackFromPreview }) => {
  const { isDarkMode, setThemeMode } = useTheme();
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

  const isPreviewMode = !!previewFileName;

  return (
    <header
      className={`flex items-end px-5 sm:px-6 lg:px-8 h-[52px] transition-colors ${
        isDarkMode ? "bg-[#141414]" : "bg-[#ffffff]"
      }`}
    >
      <div className="flex items-center min-w-0 flex-1">
        <button
          type="button"
          onClick={handleNavigateHome}
          className={`truncate text-lg font-semibold h-9 flex items-center ${isDarkMode ? "text-white" : "text-gray-900"}`}
        >
          AI Tutor LMS
        </button>
      </div>
      <div className="flex items-center justify-center min-w-0 flex-1">
        {isPreviewMode && (
          <span className={`text-sm font-medium truncate max-w-[200px] sm:max-w-[300px] ${isDarkMode ? "text-gray-200" : "text-gray-700"}`} title={previewFileName}>
            {previewFileName}
          </span>
        )}
      </div>
      <div className="flex items-center gap-4 justify-end min-w-0 flex-1">
        {isPreviewMode && (
          <button
            type="button"
            onClick={onBackFromPreview}
            className="p-1 shrink-0 rounded cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-x-2 hover:scale-125 active:translate-x-0 active:scale-95"
            aria-label="목록으로"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="#FFFFFF"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
        )}
        {user?.role === "TEACHER" && !isSettingsPage && (
          <div className="hidden items-center justify-center lg:flex">
            <button
              type="button"
              onClick={() => {
                if (isCourseDetail) {
                  window.dispatchEvent(new Event("open-lecture-modal"));
                } else {
                  window.dispatchEvent(new Event("open-course-modal"));
                }
              }}
              className={`relative rounded-full h-9 text-xs font-semibold px-3 cursor-pointer transition-colors ease-out ${
                isDarkMode ? "bg-[#FFFFFF] text-[#141414] hover:bg-white/90" : "bg-[#141414] text-white hover:bg-black"
              }`}
            >
              <span className="flex items-center justify-center gap-x-2">
                <span className="truncate whitespace-nowrap">
                  {isCourseDetail ? " 강의 만들기" : " 강의실 만들기"}
                </span>
              </span>
            </button>
          </div>
        )}
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
                className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm cursor-pointer ${
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
                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    if (onOpenSettings) {
                      onOpenSettings();
                    } else {
                      navigate("/settings");
                    }
                  }}
                  className={`w-full text-left px-3 py-2 text-xs font-medium cursor-pointer ${
                    isDarkMode ? "text-slate-200 hover:bg-slate-600/60" : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  설정
                </button>
                <div className={`border-t ${isDarkMode ? "border-slate-600" : "border-gray-200"}`}>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 text-xs font-medium cursor-pointer text-[#ff824d] hover:opacity-80"
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
