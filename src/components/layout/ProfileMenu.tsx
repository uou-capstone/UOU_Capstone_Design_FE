import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";

const DROPDOWN_WIDTH = 240;
const AVATAR_GAP = 8;

const ProfileMenu: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { isDarkMode, themeMode, setThemeMode } = useTheme();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const updatePosition = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const left = Math.min(
        rect.right - DROPDOWN_WIDTH,
        viewportWidth - DROPDOWN_WIDTH - 8
      );
      setPosition({
        top: rect.bottom + AVATAR_GAP,
        left: Math.max(8, left),
      });
    }
  }, []);

  useEffect(() => {
    if (open) {
      updatePosition();
      window.addEventListener("resize", updatePosition);
      return () => window.removeEventListener("resize", updatePosition);
    }
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.closest("[data-profile-menu-dropdown]") ||
        buttonRef.current?.contains(target)
      )
        return;
      setOpen(false);
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const handleToggle = () => {
    if (!open) updatePosition();
    setOpen((prev) => !prev);
  };

  const closeAndNavigate = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  const handleLogout = () => {
    setOpen(false);
    logout();
    navigate("/login");
  };

  // Mobbin 스타일 유사 글래스모픽 토큰
  const textPrimary = "text-glass-text-primary";
  const textMuted = "text-glass-text-secondary";
  const hoverRow = "hover:bg-glass-background-primary-hover";
  const secondaryBg = "bg-glass-background-secondary";
  const badgeBg = "bg-glass-background-unique-badge text-glass-text-primary";

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className="rounded-full overflow-hidden focus:outline-none"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="프로필 메뉴"
      >
        {user?.profileImageUrl ? (
          <img
            src={user.profileImageUrl}
            alt=""
            className="w-9 h-9 rounded-full object-cover"
          />
        ) : (
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold ${
              isDarkMode ? "bg-white/10 text-white" : "bg-zinc-200 text-zinc-700"
            }`}
          >
            {user?.fullName?.charAt(0)?.toUpperCase() ?? "?"}
          </div>
        )}
      </button>

      {open &&
        createPortal(
          <div
            data-profile-menu-dropdown
            className="fixed z-[9999] flex flex-col items-stretch rounded-2xl w-[240px] bg-glass-background-primary text-glass-text-primary glass shadow-glass backdrop-blur-glass select-none overflow-hidden"
            style={{
              width: DROPDOWN_WIDTH,
              top: position.top,
              left: position.left,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 상단: 사용자 정보 + Set up profile */}
            <div className="flex flex-col gap-y-[10px] px-[10px] pt-8 pb-4">
              <div className="flex flex-col">
                <div className={`truncate text-sm font-semibold ${textPrimary}`}>
                  {user?.fullName ?? "Guest"}
                </div>
                <div className={`truncate text-xs ${textMuted}`}>
                  {user?.email ?? ""}
                </div>
              </div>
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => closeAndNavigate("/settings")}
                  className={`relative rounded-full flex items-center justify-center h-9 text-xs font-semibold px-3 ${secondaryBg} ${textPrimary} hover:bg-glass-background-secondary-hover focus-visible:ring-4 focus-visible:ring-[hsl(var(--blue-60)/50%)] cursor-pointer transition-colors`}
                >
                  <span className="truncate">Set up profile</span>
                </button>
              </div>
            </div>

            {/* 메뉴 그룹 */}
            <div className="border-t border-glass-border-divider" />
            <div className="flex flex-col items-stretch p-4 gap-1">
              <MenuItem
                icon={<PlusIcon />}
                label="Request content"
                onClick={() => closeAndNavigate("/")}
                rowClass={hoverRow}
                textPrimary={textPrimary}
              />
            </div>

            <div className="h-px bg-glass-border-divider" />
            <div className="flex flex-col items-stretch p-4 gap-1">
              <MenuItem
                icon={<SettingsIcon />}
                label="Settings"
                onClick={() => closeAndNavigate("/settings")}
                rowClass={hoverRow}
                textPrimary={textPrimary}
              />
              <MenuItem
                icon={<ReportIcon />}
                label="신고"
                onClick={() => closeAndNavigate("/report")}
                rowClass={hoverRow}
                textPrimary={textPrimary}
              />
            </div>

            <div className="h-px bg-glass-border-divider" />
            <div className="flex flex-col items-stretch p-4 gap-3">
              <div className="flex h-9 w-full items-center justify-between gap-x-2 px-2">
                <div className={`overflow-hidden text-xs font-semibold ${textPrimary}`}>
                  Theme
                </div>
                <div className="relative isolate w-fit select-none rounded-full bg-glass-background-secondary p-1 flex items-center gap-1 h-9">
                  <ThemeOption
                    active={themeMode === "light"}
                    onClick={() => setThemeMode("light")}
                    label="Light"
                    icon="☀"
                  />
                  <ThemeOption
                    active={themeMode === "dark"}
                    onClick={() => setThemeMode("dark")}
                    label="Dark"
                    icon="☾"
                  />
                  <ThemeOption
                    active={themeMode === "system"}
                    onClick={() => setThemeMode("system")}
                    label="System"
                    icon="⊘"
                  />
                </div>
              </div>
            </div>

            <div className="h-px bg-glass-border-divider" />
            <div className="flex flex-col items-stretch p-4 gap-1">
              <MenuItem icon={null} label="Pricing" onClick={() => {}} rowClass={hoverRow} textPrimary={textPrimary} />
              <MenuItem icon={null} label="Changelog" onClick={() => {}} rowClass={hoverRow} textPrimary={textPrimary} />
              <MenuItem icon={null} label="Blog" onClick={() => {}} rowClass={hoverRow} textPrimary={textPrimary} />
              <MenuItem icon={null} label="Careers" onClick={() => {}} external rowClass={hoverRow} textPrimary={textPrimary} />
              <MenuItem icon={null} label="Merch" badge="New" badgeBg={badgeBg} onClick={() => {}} external rowClass={hoverRow} textPrimary={textPrimary} />
              <MenuItem icon={null} label="Support" onClick={() => {}} external rowClass={hoverRow} textPrimary={textPrimary} />
              <MenuItem icon={<LogOutIcon />} label="Log out" onClick={handleLogout} rowClass={hoverRow} textPrimary="text-[#ff824d]" />
            </div>

            <div className="h-px bg-glass-border-divider" />
            {/* 푸터 */}
            <div className="flex h-9 flex-row items-center justify-between px-4 text-[11px] leading-none text-glass-text-secondary">
              <div className="flex flex-row items-center justify-start gap-3">
                <button
                  type="button"
                  className="text-[11px] hover:text-glass-text-primary"
                  onClick={() => {}}
                >
                  Privacy
                </button>
                <button
                  type="button"
                  className="text-[11px] hover:text-glass-text-primary"
                  onClick={() => {}}
                >
                  Terms
                </button>
                <button
                  type="button"
                  className="text-[11px] hover:text-glass-text-primary"
                  onClick={() => {}}
                >
                  Copyright
                </button>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1 rounded hover:text-glass-text-primary"
                aria-label="닫기"
              >
                ✕
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

function ThemeOption({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={`min-w-[36px] py-1.5 text-xs font-medium transition-colors ${
        active
          ? "bg-[#3D3D3D] text-white"
          : "bg-transparent text-[#9CA3AF] hover:bg-[#353535]"
      }`}
    >
      {icon}
    </button>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  rowClass,
  textPrimary,
  external,
  badge,
  badgeBg,
}: {
  icon: React.ReactNode | null;
  label: string;
  onClick: () => void;
  rowClass: string;
  textPrimary: string;
  external?: boolean;
  badge?: string;
  badgeBg?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-9 items-center justify-center rounded-xl px-[10px] gap-x-2 cursor-pointer focus:bg-glass-background-primary-hover text-xs font-semibold ${textPrimary} ${rowClass}`}
    >
      {icon && <span className="w-4 h-4 flex items-center justify-center shrink-0">{icon}</span>}
      {!icon && <span className="w-4 shrink-0" />}
      <span className="flex-1">{label}</span>
      {badge && (
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${badgeBg ?? "bg-zinc-200 text-zinc-700"}`}>
          {badge}
        </span>
      )}
      {external && (
        <svg className="w-3.5 h-3.5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      )}
    </button>
  );
}

function PlusIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function ReportIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}

function LogOutIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
}

export default ProfileMenu;
