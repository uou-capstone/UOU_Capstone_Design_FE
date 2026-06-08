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
import {
  courseApi,
  lectureApi,
  type CourseDetail,
  type LectureResponseDto,
} from "../../services/api";
import {
  buildAutoAttendancePayload,
  createAutoAttendanceForm,
  dispatchAttendanceSessionsUpdated,
  validateAutoAttendanceForm,
} from "@/utils/attendanceAutoCreate";
import { CloseIcon, EditIcon, TrashIcon } from "../common/Icons";

type ViewMode = "course-list" | "course-detail";

// 좌측 메뉴는 강의만, 설정은 하단 프로필에서 진입
type MenuItem = "lectures" | "settings";

interface LeftSidebarProps {
  width?: number;
  expandedWidth?: number;
  viewMode: ViewMode;
  courseDetail?: CourseDetail | null;
  selectedLectureId?: number | null;
  onSelectLecture?: (lectureId: number) => void;
  onDeleteLecture?: (lectureId: number) => void;
  onEditLecture?: (lecture: CourseLecture) => void;
  onLectureCreated?: (lecture: LectureResponseDto) => void;
  isCourseDetailLoading?: boolean;
  selectedMenu?: MenuItem;
  onMenuSelect?: (menu: MenuItem) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

type CourseLecture = NonNullable<NonNullable<CourseDetail["lectures"]>[number]>;

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
    lectures:
      "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
    settings:
      "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z",
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
      d="M5 7h14M5 12h14M5 17h10"
    />
  </svg>
);

const PlusIcon: React.FC<{ className?: string }> = ({ className }) => (
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
      d="M12 4v16m8-8H4"
    />
  </svg>
);

const LeftSidebar: React.FC<LeftSidebarProps> = ({
  width = 200,
  expandedWidth = 200,
  viewMode,
  courseDetail,
  selectedLectureId,
  onSelectLecture,
  onDeleteLecture,
  onEditLecture,
  onLectureCreated,
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
  const roleLabel =
    user?.role === "TEACHER"
      ? "선생님"
      : user?.role === "STUDENT"
      ? "학생"
      : user?.role === "ADMIN"
      ? "관리자"
      : user?.role
      ? user.role
      : null;
  const [internalSelectedMenu, setInternalSelectedMenu] =
    useState<MenuItem>("lectures");
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
  const [isLectureModalOpen, setIsLectureModalOpen] = useState(false);
  const [lectureModalTitle, setLectureModalTitle] = useState("");
  const [lectureModalWeek, setLectureModalWeek] = useState("");
  const [lectureModalDescription, setLectureModalDescription] = useState("");
  const [lectureModalAttendance, setLectureModalAttendance] = useState(() =>
    createAutoAttendanceForm(true),
  );
  const [isCreatingLecture, setIsCreatingLecture] = useState(false);

  const selectedMenu = externalSelectedMenu ?? internalSelectedMenu;

  const commonStyles = {
    transition: "transition-all duration-300",
    rounded: "rounded-lg",
    buttonBase:
      "flex items-center rounded-lg text-sm transition-all duration-300 cursor-pointer min-h-8",
  };

  // 프로필 메뉴(글래스)와 동일한 톤으로 사이드바 메뉴를 통일
  // (profile-dropdown-glass: 항상 다크 글래스 스타일)
  const sidebarBgClass = "profile-dropdown-glass";
  const sidebarTextClass = "text-white";
  const buttonDefaultTextClass = "text-white";
  const buttonDefaultHoverClass = "hover:bg-white/10";
  const selectedButtonClass = "bg-white/10 text-white";
  const textSecondaryClass = "text-gray-200";
  const textMutedClass = "text-gray-400";
  const dividerClass = "border-white/10";
  const profileAvatarBgClass = "bg-white/10";
  const profileAvatarTextClass = "text-white";
  const dropdownBgClass = "profile-dropdown-glass";
  const dropdownBorderClass = "border-white/10";
  const tooltipBgClass = "profile-dropdown-glass";
  const tooltipTextClass = "text-white";
  const tooltipBorderClass = "";
  const inputRadiusClass = "rounded-lg";

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

  const handleLogout = useCallback(() => {
    setIsProfileDropdownOpen(false);
    logout();
    navigate("/login");
  }, [logout, navigate]);

  const handleHomeClick = useCallback(() => {
    handleMenuSelect("lectures");
    navigate("/");
  }, [handleMenuSelect, navigate]);

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

  const toggleProfileDropdown = useCallback(() => {
    updateDropdownPosition();
    setIsProfileDropdownOpen((prev) => !prev);
  }, [updateDropdownPosition]);

  const handleThemeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setThemeMode(e.target.checked ? "dark" : "light");
    },
    [setThemeMode]
  );

  useEffect(() => {
    setIsHomeHovered(false);
  }, [isCollapsed]);

  useEffect(() => {
    if (!isProfileDropdownOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
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

  const menuStructure = useMemo(() => {
    const learningMenu: MenuItem[] = ["lectures"];
    return { learningMenu };
  }, []);

  const menuLabels: Record<MenuItem, string> = {
    lectures: "강의",
    settings: "설정",
  };

  const sortedLectures = useMemo(() => {
    if (!courseDetail?.lectures) return [];
    return [...courseDetail.lectures].sort((a, b) => {
      if (a.weekNumber === 0) return -1;
      if (b.weekNumber === 0) return 1;
      return a.weekNumber - b.weekNumber;
    });
  }, [courseDetail?.lectures]);

  const dropdownWidth = useMemo(() => {
    const { buttonWidth } = dropdownPosition;
    if (buttonWidth && buttonWidth > 0) {
      return buttonWidth;
    }
    const targetSidebarWidth = isCollapsed ? expandedWidth : width;
    return Math.max(targetSidebarWidth - 12, 0);
  }, [expandedWidth, isCollapsed, width, dropdownPosition]);

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

  const MenuButton: React.FC<{ menu: MenuItem; label: string }> = ({
    menu,
    label,
  }) => {
    const isSelected = selectedMenu === menu;
    return (
      <button
        type="button"
        onClick={() => handleMenuSelect(menu)}
        className={`mx-1.5 ${commonStyles.buttonBase} relative group/button ${
          isSelected
            ? selectedButtonClass
            : `${buttonDefaultTextClass} ${buttonDefaultHoverClass}`
        } justify-start px-3 py-2`}
      >
        <div className="size-5 flex items-center justify-center shrink-0 overflow-hidden">
          <MenuItemIcon type={menu} className="size-5" />
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

  const LectureButton: React.FC<{ lecture: CourseLecture }> = ({
    lecture,
  }) => {
    const isSelected = selectedLectureId === lecture.lectureId;
    const hasActions = isTeacher && !isCollapsed && (onEditLecture || onDeleteLecture);

    return (
      <div key={lecture.lectureId} className="relative group/button mx-1.5">
        <button
          type="button"
          onClick={() => onSelectLecture?.(lecture.lectureId)}
          className={`${commonStyles.buttonBase} w-full justify-between px-3 py-2 focus:outline-none ${
            isSelected ? selectedButtonClass : `${buttonDefaultTextClass} ${buttonDefaultHoverClass}`
          }`}
        >
          <div className="flex items-center min-w-0 flex-1">
            <div className="size-5 flex items-center justify-center shrink-0 overflow-hidden">
              <LectureIcon className="size-5" />
            </div>
	            <span className="ml-3 w-12 shrink-0 text-left text-sm font-semibold tabular-nums xl:text-base">
	              {lecture.weekNumber === 0 ? "OT" : `${lecture.weekNumber}주차`}
	            </span>
            {lecture.title?.trim() ? (
              <span className="ml-2 min-w-0 truncate text-xs font-medium opacity-75 xl:text-sm">
                {lecture.title}
              </span>
            ) : null}
          </div>
        </button>
        {hasActions && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover/button:opacity-100 transition-opacity">
            {onEditLecture && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditLecture(lecture);
                }}
                className={`p-1 rounded cursor-pointer ${
                  isSelected
                    ? "hover:bg-[#ff824d]/25 text-white"
                    : "hover:bg-[#ff824d]/10 text-[#ff824d] hover:text-[#f26f37]"
                }`}
                title="강의 수정"
              >
                <EditIcon className="w-4 h-4" />
              </button>
            )}
            {onDeleteLecture && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`"${lecture.title}" (${lecture.weekNumber}주차)를 삭제하시겠습니까?`)) {
                    onDeleteLecture(lecture.lectureId);
                  }
                }}
                className={`p-1 rounded cursor-pointer ${
                  isSelected
                    ? "hover:bg-red-600/30 text-red-100"
                    : "hover:bg-red-600/10 text-red-500 hover:text-red-400"
                }`}
                title="강의 삭제"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

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

    return sortedLectures.map((lecture) => <LectureButton key={lecture.lectureId} lecture={lecture} />);
  };

  const openLectureModal = () => {
    if (!isTeacher) {
      return;
    }
    if (!courseDetail?.courseId) {
      window.alert("강의실 정보를 찾을 수 없습니다.");
      return;
    }
    setLectureModalTitle("");
    setLectureModalWeek("");
    setLectureModalDescription("");
    setLectureModalAttendance(createAutoAttendanceForm(true));
    setIsLectureModalOpen(true);
  };

  React.useEffect(() => {
    const handleOpenLecture = () => {
      openLectureModal();
    };
    window.addEventListener("open-lecture-modal" as any, handleOpenLecture as any);
    return () => {
      window.removeEventListener("open-lecture-modal" as any, handleOpenLecture as any);
    };
  }, [openLectureModal]);

  const closeLectureModal = () => {
    if (isCreatingLecture) return;
    setIsLectureModalOpen(false);
    setLectureModalAttendance(createAutoAttendanceForm(true));
  };

  const handleCreateLecture = async () => {
    if (!courseDetail?.courseId) {
      window.alert("강의실 정보를 찾을 수 없습니다.");
      return;
    }

    const trimmedTitle = lectureModalTitle.trim();
    if (!trimmedTitle) {
      window.alert("강의 제목을 입력해주세요.");
      return;
    }

    const parsedWeek = Number(lectureModalWeek);
    if (!Number.isFinite(parsedWeek) || parsedWeek < 0) {
      window.alert("주차 번호는 0 이상의 숫자로 입력해주세요.");
      return;
    }

    const duplicate = courseDetail.lectures?.find(
      (lecture) => lecture.weekNumber === parsedWeek
    );
    if (duplicate) {
      window.alert(`${parsedWeek}주차 강의가 이미 존재합니다.`);
      return;
    }

    const attendanceValidation = validateAutoAttendanceForm(lectureModalAttendance);
    if (attendanceValidation) {
      window.alert(attendanceValidation);
      return;
    }

    setIsCreatingLecture(true);
    try {
      const lecture = await lectureApi.createLecture(courseDetail.courseId, {
        title: trimmedTitle,
        weekNumber: parsedWeek,
        description: lectureModalDescription.trim() || undefined,
      });
      let attendanceCreationFailed = false;
      if (lectureModalAttendance.enabled) {
        try {
          await courseApi.createAttendanceSession(
            courseDetail.courseId,
            buildAutoAttendancePayload(
              trimmedTitle,
              lecture.lectureId,
              lectureModalAttendance,
            ),
          );
          dispatchAttendanceSessionsUpdated(courseDetail.courseId);
        } catch {
          attendanceCreationFailed = true;
        }
      }
      window.alert(
        attendanceCreationFailed
          ? "강의는 생성됐지만 출석 회차 생성에 실패했습니다. 출석관리에서 다시 생성할 수 있습니다."
          : "강의가 생성되었습니다.",
      );
      onLectureCreated?.(lecture);
      onSelectLecture?.(lecture.lectureId);
      setIsLectureModalOpen(false);
      setLectureModalTitle("");
      setLectureModalWeek("");
      setLectureModalDescription("");
      setLectureModalAttendance(createAutoAttendanceForm(true));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "강의 생성에 실패했습니다.";
      window.alert(message);
    } finally {
      setIsCreatingLecture(false);
    }
  };

  const renderMenuSection = (menus: MenuItem[]) => (
    <div className="flex flex-col gap-2">
      {menus.map((menu) => (
        <MenuButton key={menu} menu={menu} label={menuLabels[menu]} />
      ))}
      {(isTeacher || user?.role === "STUDENT") && (
        <button
          type="button"
          onClick={() => {
            if (isTeacher) {
              window.dispatchEvent(new Event("open-course-modal"));
            } else {
              window.dispatchEvent(new Event("open-join-modal"));
            }
          }}
          className={`mx-1.5 ${commonStyles.buttonBase} ${buttonDefaultTextClass} ${buttonDefaultHoverClass} justify-start px-3 py-2`}
          aria-label={isTeacher ? "강의실 만들기" : "강의실 참여"}
          title={
            isTeacher
              ? "강의실 만들기"
              : "초대 코드로 강의실 참여"
          }
        >
          <div className="size-5 flex items-center justify-center shrink-0 overflow-hidden">
            <PlusIcon className="size-5" />
          </div>
          <div
            className={`ml-3 flex items-center min-w-0 overflow-hidden whitespace-nowrap flex-1 transition-opacity duration-300 ${
              isCollapsed ? "opacity-0 w-0 ml-0" : "opacity-100"
            }`}
          >
            <span className="text-sm font-medium truncate xl:text-base">
              {isTeacher ? "강의실 만들기" : "강의실 참여"}
            </span>
          </div>
          {isCollapsed && (
            <span className="sr-only">
              {isTeacher ? "강의실 만들기" : "강의실 참여"}
            </span>
          )}
        </button>
      )}
    </div>
  );

  return (
    <aside
      ref={sidebarRef}
      className={`h-full overflow-hidden flex-shrink-0 group ${commonStyles.transition} ease-in-out relative ${sidebarBgClass} ${sidebarTextClass}`}
      style={{
        width: isCollapsed ? `${width}px` : "var(--app-shell-sidebar-width)",
        transition: "width 300ms ease-in-out",
      }}
    >
      <div className="h-full flex flex-col">
        {/* 상단 헤더 */}
        <div id="sidebar-header">
          <div className={isCollapsed ? "touch:px-1.5 px-0" : "touch:px-1.5"}>
            <div className="h-12.5 flex items-center justify-between" style={{ overflow: "visible" }}>
              {isCollapsed ? (
                <div 
                  className="relative flex items-center justify-start mx-1.5" 
                  style={{ overflow: "visible" }}
                  onMouseEnter={() => setIsHomeHovered(true)}
                  onMouseLeave={() => setIsHomeHovered(false)}
                >
                  <div className="relative">
                    <button
                      aria-label="홈"
                      type="button"
                      onClick={handleHomeClick}
                      className={`${commonStyles.buttonBase} relative group/button justify-start px-3 py-2 min-w-11 min-h-9 rounded-lg cursor-pointer ${buttonDefaultTextClass} ${buttonDefaultHoverClass} ${isHomeHovered ? 'opacity-0 pointer-events-none invisible' : 'opacity-100 pointer-events-auto visible'}`}
                      style={{ zIndex: isHomeHovered ? 0 : 10 }}
                    >
                      <div className="size-5 flex items-center justify-center shrink-0 overflow-hidden">
                        <MenuItemIcon
                          type="lectures"
                          className="size-5"
                        />
                      </div>
                      <span className="sr-only">홈</span>
                    </button>
                    <button
                      aria-label="사이드바 펼치기"
                      type="button"
                      onClick={onToggleCollapse}
                      className={`absolute inset-0 ${commonStyles.buttonBase} group/button justify-start px-3 py-2 min-w-11 rounded-lg cursor-pointer ${buttonDefaultTextClass} ${buttonDefaultHoverClass} ${isHomeHovered ? 'opacity-100 pointer-events-auto visible' : 'opacity-0 pointer-events-none invisible'}`}
                      style={{ zIndex: isHomeHovered ? 10 : 0 }}
                    >
                      <div className="size-5 flex items-center justify-center shrink-0 overflow-hidden">
                        <SidebarToggleIcon className="size-5" />
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
                    className={`ml-1.5 ${commonStyles.buttonBase} justify-start px-3 py-2 min-w-11 rounded-lg cursor-pointer ${buttonDefaultTextClass} ${buttonDefaultHoverClass}`}
                  >
                    <div className="size-5 flex items-center justify-center shrink-0 overflow-hidden">
                      <MenuItemIcon
                        type="lectures"
                        className="size-5"
                      />
                    </div>
                    <span className="sr-only">홈</span>
                  </button>
                  <button
                    aria-label="사이드바 접기"
                    type="button"
                    onClick={onToggleCollapse}
                    className={`mr-1.5 ${commonStyles.buttonBase} justify-start px-3 py-2 min-w-11 rounded-lg relative group/button cursor-pointer ${buttonDefaultTextClass} ${buttonDefaultHoverClass}`}
                  >
                    <div className="size-5 flex items-center justify-center shrink-0 overflow-hidden">
                      <SidebarToggleIcon className="size-5" />
                    </div>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 메인 컨텐츠 */}
    <div id="sidebar-content" className="flex-1 overflow-y-auto sidebar-scroll">
          {viewMode === "course-detail" ? (
            <div className="flex flex-col gap-2 py-2">
              <div className="flex flex-col gap-1">{renderLectureList()}</div>
            </div>
          ) : (
            <div className="flex flex-col gap-2 py-2">
              {renderMenuSection(menuStructure.learningMenu)}
            </div>
          )}
        </div>

        {/* 프로필 영역 */}
        <div id="sidebar-profile" className="mt-auto relative" style={{ overflow: "visible" }}>
          <div className={`border-t ${dividerClass}`} />
          <div className="mx-1.5 py-2">
            <div
              className={`group/profile relative w-full rounded-lg transition-colors`}
              ref={profileDropdownRef}
              style={{ overflow: "visible" }}
            >
              <button
                ref={profileButtonRef}
                type="button"
                onClick={toggleProfileDropdown}
                className={`w-full ${commonStyles.buttonBase} relative group/button ${
                  isProfileDropdownOpen
                    ? selectedButtonClass
                    : `${buttonDefaultTextClass} ${buttonDefaultHoverClass}`
                } justify-start px-3 py-2 min-w-11 min-h-9`}
                style={{ overflow: "visible" }}
              >
                <div
                  className={`size-5 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 overflow-hidden ${profileAvatarBgClass} ${profileAvatarTextClass}`}
                >
                  {user?.fullName?.charAt(0)?.toUpperCase() ?? "?"}
                </div>
                <div
                  className={`ml-3 flex items-center min-w-0 gap-2 overflow-hidden whitespace-nowrap flex-1 transition-opacity duration-300 ${
                    isCollapsed ? "opacity-0 w-0 ml-0" : "opacity-100"
                  }`}
                >
                  <span
                    className={`text-sm font-semibold truncate ${
                      isDarkMode ? "text-white" : "text-[#0D0D0D]"
                    }`}
                  >
                    {user?.fullName ?? "Guest"}
                  </span>
                  {roleLabel && (
                    <span
                      className={`text-sm font-medium flex-shrink-0 ${
                        isDarkMode ? "text-white" : "text-gray-600"
                      }`}
                    >
                      {roleLabel}
                    </span>
                  )}
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
                      top: `${dropdownPosition.top}px`,
                      left: `${dropdownLeft}px`,
                      width: `${dropdownWidth}px`,
                      transform: "translateY(calc(-100% - 0.625rem))", // 드롭다운을 위로 이동
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
                            { "--toggle-size": "0.5rem" } as React.CSSProperties
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
                      className={`w-full px-4 py-3 text-left text-sm transition-colors flex items-center gap-3 cursor-pointer text-[#ff824d] hover:opacity-80 ${buttonDefaultHoverClass}`}
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
                    <p className="text-xs opacity-70">
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
          {isCollapsed && !isProfileDropdownOpen && (
            <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 opacity-0 group-hover/profile:opacity-100 transition-opacity">
              <div
                className={`${commonStyles.rounded} px-3 py-1.5 shadow-lg ${tooltipBgClass} ${tooltipTextClass} ${tooltipBorderClass}`}
              >
                <p className="text-xs font-semibold whitespace-nowrap">프로필</p>
                <p className="text-xs opacity-70">로그아웃, 설정</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {isLectureModalOpen && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4"
          role="dialog"
          aria-modal="true"
          onClick={closeLectureModal}
        >
          <div
            className={`w-full max-w-md max-h-[calc(100vh-3rem)] overflow-y-auto rounded-2xl shadow-xl border ${
              isDarkMode
                ? "bg-zinc-900 border-zinc-700 text-gray-100"
                : "bg-white border-gray-200 text-gray-900"
            }`}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className={`flex items-center justify-between px-3 py-1.5 border-b ${
                isDarkMode ? "border-zinc-700/50" : "border-gray-200"
              }`}
            >
              <h2 className="text-lg font-semibold">새 강의 생성</h2>
              <button
                type="button"
                onClick={closeLectureModal}
                className={`p-1.5 ${inputRadiusClass} cursor-pointer ${
                  isDarkMode
                    ? "hover:bg-zinc-700 text-gray-300"
                    : "hover:bg-zinc-200 text-gray-500"
                }`}
                aria-label="닫기"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="p-3 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-[3fr_auto] gap-3">
                <div>
                  <label
                    className={`block text-sm font-medium mb-1 ${
                      isDarkMode ? "text-gray-200" : "text-gray-700"
                    }`}
                  >
                    강의 제목 *
                  </label>
                  <input
                    type="text"
                    value={lectureModalTitle}
                    onChange={(event) => setLectureModalTitle(event.target.value)}
                    placeholder="예: 1주차 - AI 개론"
                    className={`w-full px-3 py-2 text-sm ${inputRadiusClass} border ${
                      isDarkMode
                        ? "bg-zinc-800 border-zinc-600 text-white placeholder-gray-400"
                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                    } focus:outline-none focus:ring-2 ${
                      isDarkMode ? "focus:ring-[#ff824d]" : "focus:ring-[#ff824d]/70"
                    }`}
                  />
                </div>
                <div className="md:w-28">
                  <label
                    className={`block text-sm font-medium mb-1 ${
                      isDarkMode ? "text-gray-200" : "text-gray-700"
                    }`}
                  >
                    주차 번호 *
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={99}
                    value={lectureModalWeek}
                    onChange={(event) => {
                      const value = event.target.value.slice(0, 2);
                      setLectureModalWeek(value);
                    }}
                    placeholder="주차 번호"
                    className={`w-full px-3 py-2 text-sm tracking-wide ${inputRadiusClass} border ${
                      isDarkMode
                        ? "bg-zinc-800 border-zinc-600 text-white placeholder-gray-400"
                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                    } focus:outline-none focus:ring-2 ${
                      isDarkMode ? "focus:ring-[#ff824d]" : "focus:ring-[#ff824d]/70"
                    }`}
                  />
                </div>
              </div>
              <div>
                <label
                  className={`block text-sm font-medium mb-1 ${
                    isDarkMode ? "text-gray-200" : "text-gray-700"
                  }`}
                >
                  설명 (선택)
                </label>
                <textarea
                  value={lectureModalDescription}
                  onChange={(event) => setLectureModalDescription(event.target.value)}
                  placeholder="강의 한 줄 설명"
                  rows={3}
                  className={`w-full px-3 py-2 text-sm ${inputRadiusClass} border resize-none ${
                    isDarkMode
                      ? "bg-zinc-800 border-zinc-600 text-white placeholder-gray-400"
                      : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                  } focus:outline-none focus:ring-2 ${
                    isDarkMode ? "focus:ring-[#ff824d]" : "focus:ring-[#ff824d]/70"
                  }`}
                />
              </div>
              <div
                className={`rounded-lg border p-3 space-y-3 ${
                  isDarkMode
                    ? "border-zinc-700 bg-zinc-800/60"
                    : "border-gray-200 bg-gray-50"
                }`}
              >
                <label className="flex items-center justify-between gap-3">
                  <span>
                    <span
                      className={`block text-sm font-semibold ${
                        isDarkMode ? "text-gray-100" : "text-gray-900"
                      }`}
                    >
                      출석 자동 생성
                    </span>
                    <span
                      className={`block text-xs mt-0.5 ${
                        isDarkMode ? "text-gray-400" : "text-gray-700"
                      }`}
                    >
                      이 강의에 연결된 출석 회차를 함께 만듭니다.
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={lectureModalAttendance.enabled}
                    onChange={(event) =>
                      setLectureModalAttendance((prev) => ({
                        ...prev,
                        enabled: event.target.checked,
                      }))
                    }
                    className="h-4 w-4 accent-[#ff824d]"
                  />
                </label>
                {lectureModalAttendance.enabled && (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <label
                        className={`block text-xs font-medium mb-1 ${
                          isDarkMode ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        출석 날짜
                      </label>
                      <input
                        type="date"
                        value={lectureModalAttendance.sessionDate}
                        onChange={(event) =>
                          setLectureModalAttendance((prev) => ({
                            ...prev,
                            sessionDate: event.target.value,
                          }))
                        }
                        className={`w-full px-3 py-2 text-sm ${inputRadiusClass} border ${
                          isDarkMode
                            ? "bg-zinc-800 border-zinc-700 text-white"
                            : "bg-white border-gray-300 text-gray-900"
                        } focus:outline-none focus:ring-2 ${
                          isDarkMode
                            ? "focus:ring-[#ff824d]"
                            : "focus:ring-[#ff824d]/70"
                        }`}
                      />
                    </div>
                    <div>
                      <label
                        className={`block text-xs font-medium mb-1 ${
                          isDarkMode ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        시작 시간
                      </label>
                      <input
                        type="time"
                        value={lectureModalAttendance.startTime}
                        onChange={(event) =>
                          setLectureModalAttendance((prev) => ({
                            ...prev,
                            startTime: event.target.value,
                          }))
                        }
                        className={`w-full px-3 py-2 text-sm ${inputRadiusClass} border ${
                          isDarkMode
                            ? "bg-zinc-800 border-zinc-700 text-white"
                            : "bg-white border-gray-300 text-gray-900"
                        } focus:outline-none focus:ring-2 ${
                          isDarkMode
                            ? "focus:ring-[#ff824d]"
                            : "focus:ring-[#ff824d]/70"
                        }`}
                      />
                    </div>
                    <div>
                      <label
                        className={`block text-xs font-medium mb-1 ${
                          isDarkMode ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        종료 시간
                      </label>
                      <input
                        type="time"
                        value={lectureModalAttendance.endTime}
                        onChange={(event) =>
                          setLectureModalAttendance((prev) => ({
                            ...prev,
                            endTime: event.target.value,
                          }))
                        }
                        className={`w-full px-3 py-2 text-sm ${inputRadiusClass} border ${
                          isDarkMode
                            ? "bg-zinc-800 border-zinc-700 text-white"
                            : "bg-white border-gray-300 text-gray-900"
                        } focus:outline-none focus:ring-2 ${
                          isDarkMode
                            ? "focus:ring-[#ff824d]"
                            : "focus:ring-[#ff824d]/70"
                        }`}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div
              className={`px-4 py-3 border-t flex justify-end gap-2 ${
                isDarkMode ? "border-zinc-700/50" : "border-gray-200"
              }`}
            >
              <button
                type="button"
                onClick={closeLectureModal}
                className={`px-4 py-2 text-sm ${inputRadiusClass} cursor-pointer ${
                  isDarkMode
                    ? "bg-zinc-800 hover:bg-zinc-700 text-gray-200"
                    : "bg-gray-100 hover:bg-zinc-200 text-gray-700"
                }`}
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleCreateLecture}
                disabled={isCreatingLecture}
                className={`px-4 py-2 text-sm ${inputRadiusClass} font-semibold transition-colors ${
                  isCreatingLecture
                    ? isDarkMode
                      ? "bg-[#ff824d]/50 text-white cursor-not-allowed"
                      : "bg-[#ff824d]/55 text-white cursor-not-allowed"
                    : "bg-[#ff824d] hover:bg-[#f26f37] text-white cursor-pointer"
                }`}
              >
                {isCreatingLecture ? "생성 중..." : "생성하기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

export default LeftSidebar;
