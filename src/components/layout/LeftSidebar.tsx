import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import type { CourseDetail } from "../../services/api";

// 전체 레이아웃에서 사용하는 뷰 모드 타입
type ViewMode = "course-list" | "course-detail";

// 좌측 사이드바 메뉴 종류 정의
type MenuItem =
  | "dashboard" /* 대시보드 */
  | "lectures" /* 강의 */
  | "assignments" /* 과제 */
  | "exam-creation" /* 시험 생성 */
  | "reports" /* 보고서 */
  | "student-management" /* 학생 관리 */
  | "settings" /* 설정 */
  | "help" /* 도움말 */;

/* 좌측 사이드바 컴포넌트 프로퍼티 */
interface LeftSidebarProps {
  width?: number;
  expandedWidth?: number;
  viewMode: ViewMode;
  courseDetail?: CourseDetail | null;
  selectedLectureId?: number | null;
  onSelectLecture?: (lectureId: number) => void;
  onDeleteLecture?: (lectureId: number) => void;
  isCourseDetailLoading?: boolean;
  selectedMenu?: MenuItem;
  onMenuSelect?: (menu: MenuItem) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

// 아이콘 컴포넌트
const SidebarToggleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M6.83496 3.99992C6.38353 4.00411 6.01421 4.0122 5.69824 4.03801C5.31232 4.06954 5.03904 4.12266 4.82227 4.20012L4.62207 4.28606C4.18264 4.50996 3.81498 4.85035 3.55859 5.26848L3.45605 5.45207C3.33013 5.69922 3.25006 6.01354 3.20801 6.52824C3.16533 7.05065 3.16504 7.71885 3.16504 8.66301V11.3271C3.16504 12.2712 3.16533 12.9394 3.20801 13.4618C3.25006 13.9766 3.33013 14.2909 3.45605 14.538L3.55859 14.7216C3.81498 15.1397 4.18266 15.4801 4.62207 15.704L4.82227 15.79C5.03904 15.8674 5.31234 15.9205 5.69824 15.9521C6.01398 15.9779 6.383 15.986 6.83398 15.9902L6.83496 3.99992ZM18.165 11.3271C18.165 12.2493 18.1653 12.9811 18.1172 13.5702C18.0745 14.0924 17.9916 14.5472 17.8125 14.9648L17.7295 15.1415C17.394 15.8 16.8834 16.3511 16.2568 16.7353L15.9814 16.8896C15.5157 17.1268 15.0069 17.2285 14.4102 17.2773C13.821 17.3254 13.0893 17.3251 12.167 17.3251H7.83301C6.91071 17.3251 6.17898 17.3254 5.58984 17.2773C5.06757 17.2346 4.61294 17.1508 4.19531 16.9716L4.01855 16.8896C3.36014 16.5541 2.80898 16.0434 2.4248 15.4169L2.27051 15.1415C2.03328 14.6758 1.93158 14.167 1.88281 13.5702C1.83468 12.9811 1.83496 12.2493 1.83496 11.3271V8.66301C1.83496 7.74072 1.83468 7.00898 1.88281 6.41985C1.93157 5.82309 2.03329 5.31432 2.27051 4.84856L2.4248 4.57317C2.80898 3.94666 3.36012 3.436 4.01855 3.10051L4.19531 3.0175C4.61285 2.83843 5.06771 2.75548 5.58984 2.71281C6.17898 2.66468 6.91071 2.66496 7.83301 2.66496H12.167C13.0893 2.66496 13.821 2.66468 14.4102 2.71281C15.0069 2.76157 15.5157 2.86329 15.9814 3.10051L16.2568 3.25481C16.8833 3.63898 17.394 4.19012 17.7295 4.84856L17.8125 5.02531C17.9916 5.44285 18.0745 5.89771 18.1172 6.41985C18.1653 7.00898 18.165 7.74072 18.165 8.66301V11.3271ZM8.16406 15.995H12.167C13.1112 15.995 13.7794 15.9947 14.3018 15.9521C14.8164 15.91 15.1308 15.8299 15.3779 15.704L15.5615 15.6015C15.9797 15.3451 16.32 14.9774 16.5439 14.538L16.6299 14.3378C16.7074 14.121 16.7605 13.8478 16.792 13.4618C16.8347 12.9394 16.835 12.2712 16.835 11.3271V8.66301C16.835 7.71885 16.8347 7.05065 16.792 6.52824C16.7605 6.14232 16.7073 5.86904 16.6299 5.65227L16.5439 5.45207C16.32 5.01264 15.9796 4.64498 15.5615 4.3886L15.3779 4.28606C15.1308 4.16013 14.8165 4.08006 14.3018 4.03801C13.7794 3.99533 13.1112 3.99504 12.167 3.99504H8.16406C8.16407 3.99667 8.16504 3.99829 8.16504 3.99992L8.16406 15.995Z"></path>
  </svg>
);

const MenuItemIcon: React.FC<{ type: MenuItem; className?: string }> = ({
  type,
  className,
}) => {
  const iconPaths: Record<MenuItem, string> = {
    dashboard:
      "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
    lectures:
      "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
    assignments:
      "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
    "exam-creation":
      "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    reports:
      "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
    "student-management":
      "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
    settings:
      "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z",
    help: "M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  };

  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d={iconPaths[type]}
      />
    </svg>
  );
};

const LectureIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 6h16M4 10h16M4 14h10M4 18h6"
    />
  </svg>
);

const DeleteIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
    />
  </svg>
);

// 좌측 사이드바의 메인 컴포넌트
const LeftSidebar: React.FC<LeftSidebarProps> = ({
  width = 200,
  expandedWidth = 200,
  viewMode,
  courseDetail,
  selectedLectureId,
  onSelectLecture,
  onDeleteLecture,
  isCourseDetailLoading = false,
  selectedMenu: externalSelectedMenu,
  onMenuSelect,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const { user, logout } = useAuth();
  const { isDarkMode, setThemeMode } = useTheme();
  const navigate = useNavigate();
  const isTeacher = user?.role === "TEACHER";
  const [internalSelectedMenu, setInternalSelectedMenu] =
    useState<MenuItem>("dashboard");
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isHomeHovered, setIsHomeHovered] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const profileButtonRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    buttonLeft: 0,
    buttonWidth: 0,
    sidebarLeft: 0,
    sidebarWidth: 0,
  });

  const selectedMenu = externalSelectedMenu ?? internalSelectedMenu;

  // 공통 스타일 클래스
  const commonStyles = {
    transition: "transition-all duration-300",
    rounded: "rounded-lg",
    buttonBase:
      "flex items-center rounded-lg text-sm transition-all duration-300 cursor-pointer",
  };

  // 다크/라이트 테마별 클래스 정의
  const sidebarBgClass = isDarkMode ? "bg-black" : "bg-gray-50";
  const sidebarTextClass = isDarkMode ? "text-white" : "text-gray-900";
  const buttonDefaultTextClass = isDarkMode ? "text-gray-300" : "text-gray-700";
  const buttonDefaultHoverClass = isDarkMode
    ? "hover:bg-gray-800"
    : "hover:bg-gray-200";
  const selectedButtonClass = "bg-emerald-600 text-white";
  const textSecondaryClass = isDarkMode ? "text-gray-300" : "text-gray-700";
  const textMutedClass = isDarkMode ? "text-gray-400" : "text-gray-500";
  const dividerClass = isDarkMode ? "border-white/10" : "border-gray-200";
  const profileAvatarBgClass = isDarkMode ? "bg-white/10" : "bg-gray-200";
  const profileAvatarTextClass = isDarkMode ? "text-white" : "text-gray-700";
  const dropdownBgClass = isDarkMode ? "bg-black" : "bg-white";
  const dropdownBorderClass = isDarkMode
    ? "border-white/10"
    : "border-gray-200";
  const tooltipBgClass = isDarkMode ? "bg-gray-900" : "bg-white";
  const tooltipTextClass = isDarkMode ? "text-white" : "text-gray-900";
  const tooltipBorderClass = isDarkMode ? "" : "border border-gray-200";

  // 메뉴 클릭 시 외부/내부 상태를 동기화
  const handleMenuSelect = useCallback(
    (menu: MenuItem) => {
      if (onMenuSelect) {
        onMenuSelect(menu);
      } else {
        setInternalSelectedMenu(menu);
      }
    },
    [onMenuSelect]
  );

  // 로그아웃 버튼 동작
  const handleLogout = useCallback(() => {
    setIsProfileDropdownOpen(false);
    logout();
    navigate("/login");
  }, [logout, navigate]);

  // 홈 버튼 클릭 시 대시보드 이동
  const handleHomeClick = useCallback(() => {
    handleMenuSelect("dashboard");
    navigate("/");
  }, [handleMenuSelect, navigate]);

  // 프로필 드롭다운 위치 계산
  const updateDropdownPosition = useCallback(() => {
    if (profileButtonRef.current) {
      const buttonRect = profileButtonRef.current.getBoundingClientRect();
      const sidebarRect = sidebarRef.current?.getBoundingClientRect();
      setDropdownPosition({
        top: buttonRect.top,
        buttonLeft: buttonRect.left,
        buttonWidth: buttonRect.width,
        sidebarLeft: sidebarRect?.left ?? buttonRect.left,
        sidebarWidth: sidebarRect?.width ?? buttonRect.width,
      });
    }
  }, []);

  // 프로필 드롭다운 열고 닫기
  const toggleProfileDropdown = useCallback(() => {
    updateDropdownPosition();
    setIsProfileDropdownOpen((prev) => !prev);
  }, [updateDropdownPosition]);

  // 다크/라이트 전환 토글 처리
  const handleThemeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setThemeMode(e.target.checked ? "dark" : "light");
      // 드롭다운을 열어둠 (닫지 않음)
    },
    [setThemeMode]
  );

  // 사이드바 접힘 상태 변경 시 홈 호버 상태 리셋
  useEffect(() => {
    setIsHomeHovered(false);
  }, [isCollapsed]);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    if (!isProfileDropdownOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // 드롭다운 내부 클릭인지 확인
      const isInsideDropdown = target.closest("[data-profile-dropdown]");
      const isClickOnButton =
        profileButtonRef.current &&
        profileButtonRef.current.contains(target as Node);

      if (!isInsideDropdown && !isClickOnButton) {
        setIsProfileDropdownOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsProfileDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("resize", updateDropdownPosition);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", updateDropdownPosition);
    };
  }, [isProfileDropdownOpen, updateDropdownPosition]);

  useEffect(() => {
    if (isProfileDropdownOpen) {
      updateDropdownPosition();
    }
  }, [isProfileDropdownOpen, updateDropdownPosition, width, isCollapsed]);

  // 메뉴 구조 정의
  const menuStructure = useMemo(() => {
    const learningMenu: MenuItem[] = [
      "dashboard",
      "lectures",
      "assignments",
      "exam-creation",
    ];
    const managementMenu: MenuItem[] = ["reports", "student-management"];
    const helpMenu: MenuItem[] = ["help"];

    return { learningMenu, managementMenu, helpMenu };
  }, []);

  const menuLabels: Record<MenuItem, string> = {
    dashboard: "대시보드",
    lectures: "강의",
    assignments: "과제",
    "exam-creation": "시험",
    reports: "보고서",
    "student-management": "학생관리",
    settings: "설정",
    help: "도움말",
  };

  // 강의 목록 정렬
  const sortedLectures = useMemo(() => {
    if (!courseDetail?.lectures) return [];
    return [...courseDetail.lectures].sort((a, b) => {
      if (a.weekNumber === 0) return -1;
      if (b.weekNumber === 0) return 1;
      return a.weekNumber - b.weekNumber;
    });
  }, [courseDetail?.lectures]);

  // 메뉴 버튼 컴포넌트
  // 프로필 드롭다운 가로 길이 계산
  const dropdownWidth = useMemo(() => {
    const targetSidebarWidth = isCollapsed ? expandedWidth : width;
    return Math.max(targetSidebarWidth - 16, 0);
  }, [expandedWidth, isCollapsed, width]);

  // 드롭다운 좌측 위치 계산
  const dropdownLeft = useMemo(() => {
    const { sidebarLeft, sidebarWidth, buttonLeft, buttonWidth } =
      dropdownPosition;
    const useButtonMetrics = isCollapsed || !sidebarLeft || !sidebarWidth;
    const sourceLeft = useButtonMetrics
      ? buttonLeft
      : sidebarLeft ?? buttonLeft;
    const sourceWidth = useButtonMetrics
      ? buttonWidth ?? dropdownWidth
      : sidebarWidth ?? dropdownWidth;
    const centeredLeft = sourceLeft + (sourceWidth - dropdownWidth) / 2;
    if (typeof window === "undefined") {
      return centeredLeft;
    }
    const viewportWidth = window.innerWidth;
    const minLeft = 8;
    const maxLeft = Math.max(viewportWidth - dropdownWidth - 8, minLeft);
    return Math.min(Math.max(centeredLeft, minLeft), maxLeft);
  }, [dropdownPosition, dropdownWidth, isCollapsed]);

  // 좌측 메뉴 버튼 렌더링
  const MenuButton: React.FC<{ menu: MenuItem; label: string }> = ({
    menu,
    label,
  }) => {
    const isSelected = selectedMenu === menu;
    return (
      <button
        type="button"
        onClick={() => handleMenuSelect(menu)}
        className={`mx-[6px] ${commonStyles.buttonBase} relative group/button ${
          isSelected
            ? selectedButtonClass
            : `${buttonDefaultTextClass} ${buttonDefaultHoverClass}`
        } justify-start px-3 py-2 min-w-[44px] min-h-[36px]`}
      >
        <div className="w-[20px] h-[20px] flex items-center justify-center shrink-0 overflow-hidden">
          <MenuItemIcon type={menu} className="w-[20px] h-[20px]" />
        </div>
        <div className={`ml-3 flex items-center min-w-0 overflow-hidden whitespace-nowrap flex-1 transition-opacity duration-300 ${
          isCollapsed ? "opacity-0 w-0 ml-0" : "opacity-100"
        }`}>
          <span className="text-sm font-medium truncate">{label}</span>
        </div>
        {isCollapsed && <span className="sr-only">{label}</span>}
      </button>
    );
  };

  // 강의 목록 UI
  const renderLectureList = () => {
    if (isCourseDetailLoading) {
      return (
        <div className={`text-sm px-2 ${textMutedClass}`}>
          강의 목록을 불러오는 중...
        </div>
      );
    }

    if (sortedLectures.length === 0) {
      return (
        <div className={`text-sm px-2 ${textMutedClass}`}>
          등록된 강의가 없습니다.
        </div>
      );
    }

    return sortedLectures.map((lecture) => {
      const isSelected = selectedLectureId === lecture.lectureId;
      return (
        <div key={lecture.lectureId} className="relative group w-full mx-[6px]">
          <button
            type="button"
            onClick={() => onSelectLecture?.(lecture.lectureId)}
            className={`w-full ${commonStyles.buttonBase} justify-start px-3 py-2 min-w-[44px] min-h-[36px] ${
              isSelected
                ? selectedButtonClass
                : `${buttonDefaultTextClass} ${buttonDefaultHoverClass}`
            }`}
          >
            <div className="w-[20px] h-[20px] flex items-center justify-center shrink-0 overflow-hidden">
              <LectureIcon className="w-[20px] h-[20px]" />
            </div>
            <span className={`overflow-hidden whitespace-nowrap flex-1 min-w-0 ml-3 transition-opacity duration-300 ${
              isCollapsed ? "opacity-0 w-0 ml-0" : "opacity-100"
            }`}>
              <span className="text-sm font-medium truncate">
                {lecture.title}
              </span>
              <span
                className={`text-xs font-semibold ml-2 ${
                  isSelected ? "text-white/80" : textMutedClass
                }`}
              >
                {lecture.weekNumber}주차
              </span>
            </span>
            {isCollapsed && (
              <>
                <span className="sr-only">{lecture.title}</span>
                <span className="sr-only">{lecture.weekNumber}주차</span>
              </>
            )}
          </button>
          {!isCollapsed && isTeacher && onDeleteLecture && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (
                  window.confirm(
                    `"${lecture.title}" (${lecture.weekNumber}주차)를 삭제하시겠습니까?`
                  )
                ) {
                  onDeleteLecture(lecture.lectureId);
                }
              }}
              className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer ${
                isSelected
                  ? "hover:bg-red-600/30 text-red-200 hover:text-red-100"
                  : "hover:bg-red-600/20 text-red-400 hover:text-red-300"
              }`}
              title="강의 삭제"
            >
              <DeleteIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      );
    });
  };

  // 메뉴 섹션 묶음 렌더링
  const renderMenuSection = (menus: MenuItem[]) => (
    <div className="flex flex-col gap-2">
      {menus.map((menu) => (
        <MenuButton key={menu} menu={menu} label={menuLabels[menu]} />
      ))}
    </div>
  );

  return (
    <aside
      ref={sidebarRef}
      className={`h-full overflow-hidden flex-shrink-0 group ${commonStyles.transition} ease-in-out relative ${sidebarBgClass} ${sidebarTextClass}`}
      style={{
        width: `${width}px`,
        transition: "width 300ms ease-in-out",
      }}
    >
      <div className="h-full flex flex-col">
        {/* 상단 헤더 */}
        <div id="sidebar-header">
          <div className={isCollapsed ? "touch:px-1.5 px-0" : "touch:px-1.5 px-2"}>
            <div className="h-[50px] flex items-center justify-between" style={{ overflow: "visible" }}>
              {isCollapsed ? (
                <div 
                  className="relative flex items-center justify-start mx-[6px]" 
                  style={{ overflow: "visible" }}
                  onMouseEnter={() => setIsHomeHovered(true)}
                  onMouseLeave={() => setIsHomeHovered(false)}
                >
                  <div className="relative">
                    <button
                      aria-label="홈"
                      type="button"
                      onClick={handleHomeClick}
                      className={`${commonStyles.buttonBase} relative group/button justify-start px-3 py-2 min-w-[44px] min-h-[36px] rounded-lg cursor-pointer ${buttonDefaultTextClass} ${buttonDefaultHoverClass} ${isHomeHovered ? 'opacity-0 pointer-events-none invisible' : 'opacity-100 pointer-events-auto visible'}`}
                      style={{ zIndex: isHomeHovered ? 0 : 10 }}
                    >
                      <div className="w-[20px] h-[20px] flex items-center justify-center shrink-0 overflow-hidden">
                        <MenuItemIcon
                          type="dashboard"
                          className="w-[20px] h-[20px]"
                        />
                      </div>
                      <span className="sr-only">홈</span>
                    </button>
                    <button
                      aria-label="사이드바 펼치기"
                      type="button"
                      onClick={onToggleCollapse}
                      className={`absolute inset-0 ${commonStyles.buttonBase} group/button justify-start px-3 py-2 min-w-[44px] min-h-[36px] rounded-lg cursor-pointer ${buttonDefaultTextClass} ${buttonDefaultHoverClass} ${isHomeHovered ? 'opacity-100 pointer-events-auto visible' : 'opacity-0 pointer-events-none invisible'}`}
                      style={{ zIndex: isHomeHovered ? 10 : 0 }}
                    >
                      <div className="w-[20px] h-[20px] flex items-center justify-center shrink-0 overflow-hidden">
                        <SidebarToggleIcon className="w-[20px] h-[20px]" />
                      </div>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    aria-label="홈"
                    type="button"
                    onClick={handleHomeClick}
                    className={`flex items-center justify-center h-9 w-9 rounded-lg transition-colors cursor-pointer ${buttonDefaultTextClass} ${buttonDefaultHoverClass}`}
                  >
                    <MenuItemIcon
                      type="dashboard"
                      className="w-[20px] h-[20px] flex-shrink-0"
                    />
                    <span className="sr-only">홈</span>
                  </button>
                  <button
                    aria-label="사이드바 접기"
                    type="button"
                    onClick={onToggleCollapse}
                    className={`flex items-center justify-center h-9 w-9 rounded-lg relative group/button cursor-pointer ${buttonDefaultTextClass} ${buttonDefaultHoverClass}`}
                  >
                    <SidebarToggleIcon className="w-[20px] h-[20px] flex-shrink-0" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 메인 컨텐츠 */}
    <div id="sidebar-content" className="flex-1 overflow-y-auto scrollbar-hide">
          {viewMode === "course-detail" ? (
            <div className="flex flex-col gap-1 py-4">
              {renderLectureList()}
            </div>
          ) : (
            <div className="flex flex-col gap-2 py-2">
              {renderMenuSection(menuStructure.learningMenu)}

              <div
                className={`mx-[6px] border-t my-1 ${
                  commonStyles.transition
                } ${
                  isCollapsed ? "opacity-0 h-0 my-0" : "opacity-100 h-px"
                } ${dividerClass}`}
              />
              {isTeacher && renderMenuSection(menuStructure.managementMenu)}
              <div
                className={`mx-[6px] border-t my-1 ${
                  commonStyles.transition
                } ${
                  isCollapsed ? "opacity-0 h-0 my-0" : "opacity-100 h-px"
                } ${dividerClass}`}
              />
              {renderMenuSection(menuStructure.helpMenu)}
            </div>
          )}
        </div>

        {/* 프로필 영역 */}
        <div id="sidebar-profile" className="mt-auto relative" style={{ overflow: "visible" }}>
          <div className={`border-t ${dividerClass}`} />
          <div className="mx-[6px] py-2">
            <div
              className={`group/profile relative w-full rounded-lg transition-colors`}
              ref={profileDropdownRef}
              style={{ overflow: "visible" }}
            >
              <button
                ref={profileButtonRef}
                type="button"
                onClick={toggleProfileDropdown}
                className={`w-full ${commonStyles.buttonBase} relative group/button ${buttonDefaultTextClass} ${buttonDefaultHoverClass} justify-start px-3 py-2 min-w-[44px] min-h-[36px]`}
                style={{ overflow: "visible" }}
              >
                <div
                  className={`w-[20px] h-[20px] rounded-full flex items-center justify-center text-xs font-semibold shrink-0 overflow-hidden ${profileAvatarBgClass} ${profileAvatarTextClass}`}
                >
                  {user?.fullName?.charAt(0)?.toUpperCase() ?? "?"}
                </div>
                <div className={`ml-3 flex items-center min-w-0 overflow-hidden whitespace-nowrap flex-1 transition-opacity duration-300 ${
                  isCollapsed ? "opacity-0 w-0 ml-0" : "opacity-100"
                }`}>
                  <span className="text-sm font-medium truncate">
                    {user?.fullName ?? "Guest"}
                  </span>
                </div>
                {isCollapsed && (
                  <span className="sr-only">
                    {user?.fullName ?? "Guest"},{" "}
                    {user?.role === "TEACHER"
                      ? "선생님"
                      : user?.role === "STUDENT"
                      ? "학생"
                      : "게스트"}
                  </span>
                )}
              </button>

              {/* 드롭다운 메뉴 - Portal로 렌더링 */}
              {isProfileDropdownOpen &&
                createPortal(
                  <div
                    data-profile-dropdown
                    className={`fixed ${commonStyles.rounded} shadow-xl overflow-hidden ${dropdownBgClass} border ${dropdownBorderClass}`}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    style={{
                      position: "fixed",
                      top: `${dropdownPosition.top - 10}px`, // 버튼 바로 위 (10px 간격)
                      left: `${dropdownLeft}px`,
                      width: `${dropdownWidth}px`,
                      transform: "translateY(-100%)", // 드롭다운을 위로 이동
                      zIndex: 9999,
                    }}
                  >
                    {/* 테마 선택 */}
                    <div
                      className={`px-4 py-3 border-b ${dividerClass}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className={`text-sm ${textSecondaryClass}`}>
                          테마
                        </span>
                        <label
                          className="theme-switch"
                          onClick={(e) => e.stopPropagation()}
                          style={
                            { "--toggle-size": "8px" } as React.CSSProperties
                          }
                        >
                          <input
                            type="checkbox"
                            className="theme-switch__checkbox"
                            checked={isDarkMode}
                            onChange={handleThemeChange}
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
                              <svg
                                viewBox="0 0 100 100"
                                style={{ width: "100%", height: "100%" }}
                              >
                                <circle
                                  cx="20"
                                  cy="20"
                                  r="1.5"
                                  fill="currentColor"
                                />
                                <circle
                                  cx="60"
                                  cy="15"
                                  r="1"
                                  fill="currentColor"
                                />
                                <circle
                                  cx="80"
                                  cy="30"
                                  r="0.8"
                                  fill="currentColor"
                                />
                                <circle
                                  cx="30"
                                  cy="50"
                                  r="1.2"
                                  fill="currentColor"
                                />
                                <circle
                                  cx="70"
                                  cy="45"
                                  r="0.9"
                                  fill="currentColor"
                                />
                              </svg>
                            </div>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* 설정 버튼 */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsProfileDropdownOpen(false);
                        handleMenuSelect("settings");
                      }}
                      className={`w-full px-4 py-3 text-left text-sm transition-colors flex items-center gap-3 cursor-pointer ${textSecondaryClass} ${buttonDefaultHoverClass}`}
                    >
                      <MenuItemIcon type="settings" className="w-4 h-4" />
                      <span>설정</span>
                    </button>

                    {/* 로그아웃 버튼 */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLogout();
                      }}
                      className={`w-full px-4 py-3 text-left text-sm transition-colors flex items-center gap-3 cursor-pointer ${textSecondaryClass} ${buttonDefaultHoverClass}`}
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                        />
                      </svg>
                      로그아웃
                    </button>
                  </div>,
                  document.body
                )}

              {/* 접힌 상태일 때 호버 툴팁 */}
              {isCollapsed && (
                <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 opacity-0 group-hover/profile:opacity-100 transition-opacity">
                  <div
                    className={`${commonStyles.rounded} px-3 shadow-lg ${tooltipBgClass} ${tooltipTextClass} ${tooltipBorderClass}`}
                  >
                    <p className="text-xs font-semibold whitespace-nowrap">
                      {user?.fullName ?? "Guest"}
                    </p>
                    <p className="text-[11px] opacity-70">
                      {user?.role === "TEACHER"
                        ? "선생님"
                        : user?.role === "STUDENT"
                        ? "학생"
                        : "게스트"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default LeftSidebar;
