import React from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import { BellIcon } from "@/components/common/Icons";
import { notificationsApi, type NotificationItem } from "@/services/api";

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

function BookOpenIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5.5A3.5 3.5 0 0 1 7.5 2H12v18H7.5A3.5 3.5 0 0 0 4 23.5v-18Z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 5.5A3.5 3.5 0 0 0 16.5 2H12v18h4.5a3.5 3.5 0 0 1 3.5 3.5v-18Z" />
    </svg>
  );
}

interface TopNavProps {
  onNavigateHome?: () => void;
  onOpenSettings?: () => void;
  onOpenReport?: () => void;
  onOpenUpdates?: () => void;
  previewFileName?: string | null;
  onBackFromPreview?: () => void;
}

const TopNav: React.FC<TopNavProps> = ({
  onNavigateHome,
  onOpenSettings,
  onOpenReport,
  onOpenUpdates,
  previewFileName,
  onBackFromPreview,
}) => {
  const { isDarkMode, themeMode, setThemeMode } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false);
  const userMenuRef = React.useRef<HTMLDivElement | null>(null);
  const [notifOpen, setNotifOpen] = React.useState(false);
  const notifRef = React.useRef<HTMLDivElement | null>(null);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [notifPage, setNotifPage] = React.useState(0);
  const [notifTotalPages, setNotifTotalPages] = React.useState(1);
  const [notifItems, setNotifItems] = React.useState<NotificationItem[]>([]);
  const [notifLoading, setNotifLoading] = React.useState(false);
  const [notifError, setNotifError] = React.useState<string | null>(null);

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

  const handlePreviewBack = React.useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      onBackFromPreview?.();
    },
    [onBackFromPreview],
  );

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

  React.useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    let cancelled = false;
    void notificationsApi
      .getUnreadCount()
      .then((c) => {
        if (!cancelled) setUnreadCount(Math.max(0, c));
      })
      .catch(() => {
        // ignore
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  React.useEffect(() => {
    if (!user) return;
    const stop = notificationsApi.subscribeNotificationsStream({
      onMessage: (item) => {
        setNotifItems((prev) => {
          if (prev.some((x) => x.notificationId === item.notificationId)) return prev;
          return [item, ...prev].slice(0, 50);
        });
        if (!item.read) setUnreadCount((c) => c + 1);
      },
    });
    return () => stop();
  }, [user]);

  const loadNotifications = React.useCallback(async (page: number) => {
    setNotifLoading(true);
    setNotifError(null);
    try {
      const res = await notificationsApi.getNotifications({
        page,
        size: 20,
        sort: "createdAt,desc",
      });
      setNotifItems(res.content ?? []);
      setNotifTotalPages(Math.max(res.totalPages ?? 1, 1));
    } catch (e) {
      setNotifError(e instanceof Error ? e.message : "알림을 불러오지 못했습니다.");
      setNotifItems([]);
      setNotifTotalPages(1);
    } finally {
      setNotifLoading(false);
    }
  }, []);

  const getNotificationNavigatePath = React.useCallback(
    (item: NotificationItem): string | null => {
      const t = String(item.resourceType ?? "").trim().toUpperCase();
      const id = item.resourceId;
      if (!id || !Number.isFinite(id)) return null;
      if (t === "COURSE") return `/courses/${id}`;
      return null;
    },
    [],
  );

  const handleNotificationClick = React.useCallback(
    async (item: NotificationItem) => {
      try {
        if (!item.read) {
          await notificationsApi.markRead(item.notificationId);
          setNotifItems((prev) =>
            prev.map((x) =>
              x.notificationId === item.notificationId ? { ...x, read: true } : x,
            ),
          );
          setUnreadCount((c) => Math.max(0, c - 1));
        }
      } catch (e) {
        // 읽음 처리 실패해도 이동은 막지 않음
        console.warn(e);
      }

      const target = getNotificationNavigatePath(item);
      if (target) {
        setNotifOpen(false);
        navigate(target);
      }
    },
    [getNotificationNavigatePath, navigate],
  );

  React.useEffect(() => {
    if (!notifOpen) return;
    void loadNotifications(notifPage);
  }, [notifOpen, notifPage, loadNotifications]);

  React.useEffect(() => {
    if (!notifOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notifRef.current &&
        event.target instanceof Node &&
        !notifRef.current.contains(event.target)
      ) {
        setNotifOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setNotifOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [notifOpen]);

  const isPreviewMode = !!previewFileName;
  const roleSuffix =
    user?.role === "TEACHER"
      ? "선생님"
      : user?.role === "STUDENT"
        ? "학생"
        : user?.role === "ADMIN"
          ? "관리자"
          : "";
  const displayUserName = user
    ? `${user.fullName}${roleSuffix ? ` ${roleSuffix}` : ""}`
    : "";

  return (
    <header
      className={`flex h-[4.5rem] shrink-0 items-center border-b px-7 transition-colors ${
        isDarkMode
          ? "border-[#1b3443] bg-[#071829]"
          : "border-[#d9d9dd] bg-[#ffffff]"
      }`}
    >
      <div className="flex items-center min-w-0 flex-1">
        <button
          type="button"
          onClick={handleNavigateHome}
          className={`flex min-w-0 items-center gap-3 text-lg font-semibold xl:text-xl 2xl:text-2xl ${isDarkMode ? "text-white" : "text-gray-900"}`}
        >
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
              isDarkMode ? "text-[#ffad9b]" : "text-[#003c33]"
            }`}
            aria-hidden="true"
          >
            <BookOpenIcon className="h-7 w-7" />
          </span>
          <span className="truncate">AI Tutor LMS</span>
        </button>
      </div>
      <div className="min-w-0 flex-1" aria-hidden="true" />
      <div className="flex items-center gap-4 justify-end min-w-0 flex-1">
        {isPreviewMode && (
          <button
            type="button"
            onClick={handlePreviewBack}
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
        {user ? (
          <div className="flex items-center gap-3 shrink-0">
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => {
                  setNotifOpen((p) => !p);
                  setNotifPage(0);
                }}
                className={`relative p-2 rounded-lg cursor-pointer transition-colors ${
                  isDarkMode ? "hover:bg-white/10 text-gray-200" : "hover:bg-[#eeece7] text-gray-700"
                }`}
                aria-label="알림"
                aria-haspopup="true"
                aria-expanded={notifOpen}
              >
                <BellIcon className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-[11px] leading-5 text-center">
                    {unreadCount > 99 ? "99+" : String(unreadCount)}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div
                  className={`absolute right-0 mt-2 w-[22rem] max-w-[80vw] rounded-2xl border shadow-xl overflow-hidden z-30 ${
                    isDarkMode ? "bg-[#071829] border-[#1b3443] text-gray-100" : "bg-white border-[#d9d9dd] text-gray-900"
                  }`}
                >
                  <div className={`flex items-center justify-between px-4 py-3 border-b ${isDarkMode ? "border-[#1b3443]" : "border-[#d9d9dd]"}`}>
                    <div className="text-sm font-semibold">알림</div>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await notificationsApi.markReadAll();
                          setNotifItems((prev) => prev.map((x) => ({ ...x, read: true })));
                          setUnreadCount(0);
                        } catch (e) {
                          window.alert(e instanceof Error ? e.message : "처리에 실패했습니다.");
                        }
                      }}
                      className={`text-xs font-semibold px-2 py-1 rounded-lg ${
                        isDarkMode ? "bg-white/10 hover:bg-white/15 text-gray-100" : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                      }`}
                    >
                      모두 읽음
                    </button>
                  </div>
                  <div className="max-h-[28rem] overflow-y-auto">
                    {notifLoading ? (
                      <div className="px-4 py-10 text-sm opacity-70 text-center">불러오는 중…</div>
                    ) : notifError ? (
                      <div className={`px-4 py-6 text-sm ${isDarkMode ? "text-red-300" : "text-red-600"}`}>{notifError}</div>
                    ) : notifItems.length === 0 ? (
                      <div className="px-4 py-10 text-sm opacity-70 text-center">알림이 없습니다.</div>
                    ) : (
                      <ul className="divide-y divide-black/5 dark:divide-white/10">
                        {notifItems.map((n) => (
                          <li key={n.notificationId}>
                            <button
                              type="button"
                              onClick={() => void handleNotificationClick(n)}
                              className={`w-full text-left px-4 py-3 transition-colors ${
                                n.read
                                  ? isDarkMode
                                    ? "hover:bg-white/5"
                                    : "hover:bg-gray-50"
                                  : isDarkMode
                                    ? "bg-[#ffad9b]/15 hover:bg-[#ffad9b]/20"
                                    : "bg-[#fff2ee] hover:bg-[#ffe7df]"
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                {!n.read && <span className="mt-1.5 h-2 w-2 rounded-full bg-[#ff7759] shrink-0" aria-hidden="true" />}
                                <div className="min-w-0">
                                  <div className="text-sm font-semibold truncate">{n.title || n.type}</div>
                                  <div className={`text-xs mt-1 whitespace-pre-wrap break-words ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
                                    {n.body}
                                  </div>
                                  <div className={`text-[11px] mt-2 opacity-70 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                                    {n.createdAt}
                                  </div>
                                </div>
                              </div>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {notifTotalPages > 1 && (
                    <div className={`flex items-center justify-between px-4 py-2 border-t ${isDarkMode ? "border-[#1b3443]" : "border-[#d9d9dd]"}`}>
                      <button
                        type="button"
                        disabled={notifPage <= 0 || notifLoading}
                        onClick={() => setNotifPage((p) => Math.max(0, p - 1))}
                        className={`text-xs font-semibold px-2 py-1 rounded-lg ${
                          notifPage <= 0 || notifLoading
                            ? "opacity-40 cursor-not-allowed"
                            : isDarkMode
                              ? "bg-white/10 hover:bg-white/15 text-gray-100"
                              : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                        }`}
                      >
                        이전
                      </button>
                      <span className="text-[11px] opacity-70">
                        {notifPage + 1} / {notifTotalPages}
                      </span>
                      <button
                        type="button"
                        disabled={notifPage >= notifTotalPages - 1 || notifLoading}
                        onClick={() => setNotifPage((p) => Math.min(notifTotalPages - 1, p + 1))}
                        className={`text-xs font-semibold px-2 py-1 rounded-lg ${
                          notifPage >= notifTotalPages - 1 || notifLoading
                            ? "opacity-40 cursor-not-allowed"
                            : isDarkMode
                              ? "bg-white/10 hover:bg-white/15 text-gray-100"
                              : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                        }`}
                      >
                        다음
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={toggleUserMenu}
              className={`flex items-center gap-2 rounded-full px-2.5 py-2 transition-colors focus:outline-none cursor-pointer ${
                isDarkMode ? "hover:bg-white/10" : "hover:bg-[#eeece7]"
              }`}
              aria-haspopup="true"
              aria-expanded={isUserMenuOpen}
            >
              <span
                className={`hidden max-w-40 truncate text-sm font-semibold md:block ${
                  isDarkMode ? "text-gray-100" : "text-gray-900"
                }`}
              >
                {displayUserName}
              </span>
              <svg
                className={`hidden h-4 w-4 shrink-0 md:block ${
                  isDarkMode ? "text-gray-300" : "text-gray-600"
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            {isUserMenuOpen && (
              <div
                className="profile-dropdown-glass absolute right-0 mt-2 w-60 rounded-2xl z-20 overflow-hidden select-none"
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
                      className="relative flex rounded-full p-1 shrink-0 bg-white/10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* active indicator */}
                      <div
                        aria-hidden="true"
                        className={`absolute top-1 left-1 w-8 h-8 rounded-full bg-black/40 transform-gpu will-change-transform transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
                          themeMode === "dark"
                            ? "translate-x-8"
                            : themeMode === "system"
                              ? "translate-x-16"
                              : "translate-x-0"
                        }`}
                      />
                      {(["light", "dark", "system"] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setThemeMode(mode)}
                          className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full transition-colors duration-200 ${
                            themeMode === mode ? "text-white" : "text-gray-400 hover:text-gray-300"
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
                      if (onOpenUpdates) {
                        onOpenUpdates();
                      } else {
                        navigate("/updates");
                      }
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
