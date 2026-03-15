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

  // 라이트/다크 동일: 다크 톤 (#2D2D2D, Set up profile #454545, 푸터 #252525)
  const dropdownBg = "bg-[#2D2D2D]";
  const dropdownBorder = "border-[#404040]";
  const textPrimary = "text-white";
  const textMuted = "text-[#9CA3AF]";
  const hoverBg = "hover:bg-[#3D3D3D]";
  const buttonMutedBg = "bg-[#454545]";
  const badgeBg = "bg-[#3D3D3D] text-white";

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
            className={`fixed z-[9999] rounded-[10px] shadow-xl border ${dropdownBorder} ${dropdownBg} overflow-hidden`}
            style={{
              width: DROPDOWN_WIDTH,
              top: position.top,
              left: position.left,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 상단: 사용자 정보 + Set up profile */}
            <div className="px-4 pt-4 pb-3">
              <p className={`font-bold ${textPrimary}`}>
                {user?.fullName ?? "Guest"}
              </p>
              <p className={`text-sm mt-0.5 ${textMuted}`}>
                {user?.email ?? ""}
              </p>
              <button
                type="button"
                onClick={() => closeAndNavigate("/settings")}
                className={`mt-3 w-full py-2 rounded-full text-sm font-medium ${buttonMutedBg} ${textPrimary} hover:opacity-90 transition-opacity`}
              >
                Set up profile
              </button>
            </div>

            {/* 메뉴 항목 */}
            <div className="py-0">
              <MenuItem icon={<PlusIcon />} label="Request content" onClick={() => closeAndNavigate("/")} hoverBg={hoverBg} textPrimary={textPrimary} />
              <MenuItem icon={<SettingsIcon />} label="Settings" onClick={() => closeAndNavigate("/settings")} hoverBg={hoverBg} textPrimary={textPrimary} />
              {/* Theme: 3-way toggle */}
              <div className="px-4 py-3 flex items-center justify-between gap-3">
                <span className={`text-sm ${textPrimary}`}>Theme</span>
                <div className="flex rounded-lg overflow-hidden bg-[#404040]">
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
              <MenuItem icon={null} label="Pricing" onClick={() => {}} hoverBg={hoverBg} textPrimary={textPrimary} />
              <MenuItem icon={null} label="Changelog" onClick={() => {}} hoverBg={hoverBg} textPrimary={textPrimary} />
              <MenuItem icon={null} label="Blog" onClick={() => {}} hoverBg={hoverBg} textPrimary={textPrimary} />
              <MenuItem icon={null} label="Careers" onClick={() => {}} external hoverBg={hoverBg} textPrimary={textPrimary} />
              <MenuItem icon={null} label="Merch" badge="New" badgeBg={badgeBg} onClick={() => {}} external hoverBg={hoverBg} textPrimary={textPrimary} />
              <MenuItem icon={null} label="Support" onClick={() => {}} external hoverBg={hoverBg} textPrimary={textPrimary} />
              <MenuItem icon={<LogOutIcon />} label="Log out" onClick={handleLogout} hoverBg={hoverBg} textPrimary={textPrimary} />
            </div>

            {/* 푸터: Privacy, Terms, Copyright, X */}
            <div
              className={`px-4 py-3 flex items-center justify-between ${textMuted} text-xs bg-[#252525]`}
            >
              <div className="flex gap-3">
                <button
                  type="button"
                  className={`${hoverBg} rounded px-1 -mx-1`}
                  onClick={() => {}}
                >
                  Privacy
                </button>
                <button
                  type="button"
                  className={`${hoverBg} rounded px-1 -mx-1`}
                  onClick={() => {}}
                >
                  Terms
                </button>
                <span>Copyright</span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className={`p-1 -mr-1 rounded ${hoverBg} ${textPrimary}`}
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
  hoverBg,
  textPrimary,
  external,
  badge,
  badgeBg,
}: {
  icon: React.ReactNode | null;
  label: string;
  onClick: () => void;
  hoverBg: string;
  textPrimary: string;
  external?: boolean;
  badge?: string;
  badgeBg?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full px-4 py-2.5 flex items-center gap-3 text-left text-sm ${textPrimary} ${hoverBg} transition-colors`}
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

function LogOutIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
}

export default ProfileMenu;
