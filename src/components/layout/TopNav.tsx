import React from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function LogOutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  );
}

function SystemIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path fill="currentColor" d="M12 12 L12 2 A10 10 0 0 0 12 22 Z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2 A10 10 0 0 1 12 22" fill="none" />
    </svg>
  );
}

interface TopNavProps {
  isCourseDetail?: boolean;
  isSettingsPage?: boolean;
  isReportPage?: boolean;
  onNavigateHome?: () => void;
  onOpenSettings?: () => void;
  onOpenReport?: () => void;
  previewFileName?: string | null;
  onBackFromPreview?: () => void;
}

const TopNav: React.FC<TopNavProps> = ({ isCourseDetail, isSettingsPage, isReportPage, onNavigateHome, onOpenSettings, onOpenReport, previewFileName, onBackFromPreview }) => {
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
          className={`truncate text-lg font-semibold h-9 flex items-center leading-9 ${isDarkMode ? "text-white" : "text-gray-900"}`}
        >
          AI Tutor LMS
        </button>
      </div>
      <div className="flex items-center justify-center min-w-0 flex-1">
        {isPreviewMode && (
          <span className={`h-9 flex items-center text-sm font-medium truncate max-w-[200px] sm:max-w-[300px] ${isDarkMode ? "text-gray-200" : "text-gray-700"}`} title={previewFileName}>
            {previewFileName}
          </span>
        )}
      </div>
      <div className="flex items-center gap-4 justify-end min-w-0 flex-1">
        {isPreviewMode && (
          <button
            type="button"
            onClick={onBackFromPreview}
            className={`p-1 shrink-0 rounded cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-x-2 hover:scale-125 active:translate-x-0 active:scale-95 ${isDarkMode ? "text-white" : "text-[#141414]"}`}
            aria-label="목록으로"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
        )}
        {user?.role === "TEACHER" && !isSettingsPage && !isReportPage && (
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
                className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm cursor-pointer transition-colors ${
                  isDarkMode ? "bg-gray-600 hover:bg-gray-700" : "bg-gray-500 hover:bg-gray-600"
                }`}
              >
                {user.fullName.charAt(0).toUpperCase()}
              </div>
            </button>
            {isUserMenuOpen && (
              <div
                className="profile-dropdown-glass absolute right-0 mt-2 w-[240px] rounded-2xl z-20 overflow-hidden select-none"
              >
                <div className="flex flex-col p-4 pb-2">
                  <div className="truncate text-base font-semibold text-white">
                    {user.fullName}
                  </div>
                  <div className="truncate text-sm text-gray-400">
                    {user.email}
                  </div>
                </div>
                <div className="h-px bg-white/10" />
                <div className="flex flex-col px-4 py-2 gap-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-base font-semibold shrink-0 text-white">
                      테마
                    </span>
                    <div
                      className="flex rounded-full p-1 shrink-0 bg-white/10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {(["light", "dark", "system"] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setThemeMode(mode)}
                          className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors ${
                            themeMode === mode
                              ? "bg-black/40 text-white"
                              : "text-gray-400 hover:text-gray-300"
                          }`}
                          aria-label={mode === "light" ? "라이트 모드" : mode === "dark" ? "다크 모드" : "시스템 모드"}
                        >
                          {mode === "light" && <SunIcon className="w-4 h-4" />}
                          {mode === "dark" && <MoonIcon className="w-4 h-4" />}
                          {mode === "system" && <SystemIcon className="w-4 h-4" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="h-px bg-white/10" />
                <div className="flex flex-col p-2 gap-0.5">
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
                    className="flex h-9 items-center rounded-xl p-2 gap-2 cursor-pointer text-base font-semibold text-white hover:bg-white/10 transition-colors"
                  >
                    <SettingsIcon className="w-4 h-4 text-gray-400" />
                    <span>설정</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      if (onOpenReport) {
                        onOpenReport();
                      } else {
                        navigate("/report");
                      }
                    }}
                    className="flex h-9 items-center rounded-xl p-2 gap-2 cursor-pointer text-base font-semibold text-white hover:bg-white/10 transition-colors"
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>신고</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      window.location.reload();
                    }}
                    className="flex h-9 items-center rounded-xl p-2 gap-2 cursor-pointer text-base font-semibold text-white hover:bg-white/10 transition-colors"
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>업데이트</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex h-9 items-center rounded-xl p-2 gap-2 cursor-pointer text-base font-semibold text-[#ff824d] hover:bg-white/10 transition-colors"
                  >
                    <LogOutIcon className="w-4 h-4" />
                    <span>로그아웃</span>
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
