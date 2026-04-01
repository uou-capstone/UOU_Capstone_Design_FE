import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { CloseIcon, EditIcon, TrashIcon } from "../common/Icons";
import { useParams } from "react-router-dom";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import { MarkdownContent } from "../common/MarkdownContent";
import { useLectureAssistantChat } from "../../hooks/useLectureAssistantChat";
import { useIntegratedLearningChat } from "../../hooks/useIntegratedLearningChat";
import {
  lectureApi,
  getAuthToken,
  type CourseDetail,
  streamingApi,
  type StreamNextResponse,
  learningActivityApi,
  type RemedialStep,
} from "../../services/api";

interface ChatMessage {
  id: number;
  text?: string;
  isUser: boolean;
  file?: File;
  isLoading?: boolean;
  markdown?: string;
  roleBadge?: string;
  assistantVariant?: "educational" | "orchestrator" | "system";
  thoughtSummary?: string;
  thoughtExpanded?: boolean;
  thoughtFinished?: boolean;
  actionButtons?: {
    id: string;
    label: string;
    variant?: "primary" | "muted";
  }[];
}

type ViewMode = "course-list" | "course-detail";
type LearningTab = "study" | "integrated";
const INTEGRATED_BETA_NOTICE_SEEN_KEY = "integrated_learning_beta_notice_seen_v1";

function examTypeMaxQuestionCount(examType: string): number {
  if (examType === "FLASH_CARD") return 30;
  if (examType === "FIVE_CHOICE") return 15;
  if (examType === "SHORT_ANSWER") return 20;
  return 50;
}

/** blur / Enter 시에만 검증·반영 (입력 중 강제 보정 금지) */
function commitExamQuestionCountInput(
  raw: string,
  examType: string,
  setExamCount: (n: number) => void,
): void {
  const trimmed = raw.trim();
  const upper = examTypeMaxQuestionCount(examType);
  if (trimmed === "") {
    window.alert(
      "문항 수가 비어 있습니다. 1 이상의 정수를 입력해 주세요.",
    );
    setExamCount(10);
    return;
  }
  const n = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(n) || n <= 0) {
    window.alert(
      "비정상 입력입니다. 1 이상의 정수만 입력할 수 있습니다.",
    );
    setExamCount(10);
    return;
  }
  if (n > upper) {
    window.alert(
      `문항 수가 너무 많습니다. 이 유형은 최대 ${upper}문항까지 가능합니다.`,
    );
    setExamCount(upper);
    return;
  }
  setExamCount(n);
}

/** 시험 만들기 모드일 때 오른쪽 패널에 표시할 옵션/생성 관련 props */
export interface RightSidebarExamProps {
  examMode: boolean;
  onExamModeChange: (value: boolean) => void;
  isTeacher: boolean;
  examType: string;
  setExamType: (value: string) => void;
  examCount: number;
  setExamCount: (value: number) => void;
  /** 생성 성공·주차 변경 시 폼 초기화용 (값이 바뀌면 시험 이름·주제 입력란 리셋) */
  examFormKey: number;
  /** 난이도 */
  profileProficiencyLevel: "Beginner" | "Intermediate" | "Advanced";
  setProfileProficiencyLevel: (value: "Beginner" | "Intermediate" | "Advanced") => void;
  /** 평가 중점 */
  profileTargetDepth: "Concept" | "Application" | "Derivation" | "Deep Understanding";
  setProfileTargetDepth: (value: "Concept" | "Application" | "Derivation" | "Deep Understanding") => void;
  /** 문제 스타일 */
  profileQuestionModality: "Mathematical" | "Theoretical" | "Balance";
  setProfileQuestionModality: (value: "Mathematical" | "Theoretical" | "Balance") => void;
  /** 백그라운드 비동기 시험 생성 (이름·주제는 입력란 로컬 값으로 전달 — MainContent 리렌더 최소화) */
  onCreateExam: (topic: string, displayName: string) => void;
  submitting: boolean;
  onRecoverSession: () => void;
  recoverOpen: boolean;
  recoverSelectedId: string;
  setRecoverSelectedId: (value: string) => void;
  recoverExams: Array<{ id: string; title: string; examSessionId?: string }>;
  onRecoverSubmit: () => void;
  setRecoverOpen: (value: boolean) => void;
  /** 생성된 시험 클릭 시 상세 열기 */
  onExamClick?: (examSessionId: string) => void;
  /** 수정/삭제 모드 */
  examEditMode?: boolean;
  onExamEditModeChange?: (v: boolean) => void;
  selectedExamIds?: Record<string, boolean>;
  onToggleExamSelect?: (id: string) => void;
  onDeleteSelectedExams?: () => void;
  /** 단일 시험 삭제 (항목 왼쪽 삭제 버튼용) */
  onDeleteExam?: (examSessionId: string) => void;
}

interface RightSidebarProps {
  onLectureDataChange: (
    markdown: string,
    fileUrl: string,
    fileName: string,
    materialId?: number | null,
  ) => void;
  width?: number;
  lectureId?: number;
  courseId?: number;
  viewMode: ViewMode;
  courseDetail?: CourseDetail | null;
  /** PDF 미리보기 시 사용자가 현재 보고 있는 페이지 (1-based). BE API 호출 시 전달 가능 */
  previewCurrentPdfPage?: number | null;
  /** PDF 기반 강의 보조(페이지 설명)용 materialId */
  assistantMaterialId?: number | null;
  /** PDF 미리보기 중이고 마크다운 뷰가 아닐 때만 true */
  assistantPdfActive?: boolean;
  goToPdfPage?: (page: number) => void;
  userPdfNav?: { page: number; at: number } | null;
  /** 강의 상세에서 시험 만들기 시 오른쪽 패널에 프로필 설정 UI 표시 */
  examProps?: RightSidebarExamProps | null;
}

const RightSidebar: React.FC<RightSidebarProps> = ({
  onLectureDataChange,
  width = 360,
  lectureId,
  courseId,
  viewMode,
  courseDetail,
  previewCurrentPdfPage,
  assistantMaterialId,
  assistantPdfActive,
  goToPdfPage,
  userPdfNav,
  examProps,
}) => {
  const { isDarkMode } = useTheme();
  const { isAuthenticated } = useAuth();
  const { courseId: routeCourseIdParam } = useParams<{ courseId?: string }>();
  const parsedRouteCourseId = routeCourseIdParam ? Number(routeCourseIdParam) : null;
  const routeCourseId =
    parsedRouteCourseId !== null && !Number.isNaN(parsedRouteCourseId) ? parsedRouteCourseId : null;
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isFetchingNext, setIsFetchingNext] = useState(false);
  const [waitingForAnswer, setWaitingForAnswer] = useState(false);
  const [currentAiQuestionId, setCurrentAiQuestionId] = useState<string | null>(null);
  const [currentLectureId, setCurrentLectureId] = useState<number | null>(lectureId || null);
  const [currentCourseId, setCurrentCourseId] = useState<number | null>(courseId || null);
  const [uploadedFileDisplayUrl, setUploadedFileDisplayUrl] = useState<string>("");
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [hasUploadedMaterial, setHasUploadedMaterial] = useState<boolean>(false);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dragCounterRef = useRef<number>(0);
  const previewObjectUrlRef = useRef<string | null>(null);
  /** 시험 문항 수: 키보드 입력 중에는 초안만 두고 blur/Enter에서 확정 */
  const examCountFieldFocusedRef = useRef(false);
  const [examCountFieldFocused, setExamCountFieldFocused] = useState(false);
  const [examCountDraft, setExamCountDraft] = useState("");
  /** 시험 이름·주제: 부모(MainContent)로 끌어올리지 않고 로컬에서만 관리 → 마크다운 미리보기 전체 리렌더 방지 */
  const [localExamTopic, setLocalExamTopic] = useState("");
  const [localExamDisplayName, setLocalExamDisplayName] = useState("");
  const [learningTab, setLearningTab] = useState<LearningTab>("study");
  const [showIntegratedBetaNotice, setShowIntegratedBetaNotice] =
    useState(false);
  useEffect(() => {
    if (!examProps?.examMode) {
      examCountFieldFocusedRef.current = false;
      setExamCountFieldFocused(false);
    }
  }, [examProps?.examMode]);

  useEffect(() => {
    if (examProps?.examMode) {
      setLearningTab("study");
    }
  }, [examProps?.examMode]);

  useEffect(() => {
    if (learningTab !== "integrated") {
      setShowIntegratedBetaNotice(false);
      return;
    }
    try {
      const seen = localStorage.getItem(INTEGRATED_BETA_NOTICE_SEEN_KEY);
      setShowIntegratedBetaNotice(seen !== "1");
    } catch {
      // 저장소 접근 실패 시 현재 세션에서만 안내 노출
      setShowIntegratedBetaNotice(true);
    }
  }, [learningTab]);

  useEffect(() => {
    if (!examProps) return;
    setLocalExamTopic("");
    setLocalExamDisplayName("");
    // examProps 객체 참조는 매 렌더마다 바뀔 수 있으므로 examFormKey·lectureId만 의존
  }, [lectureId, examProps?.examFormKey]);
  const actionMenuContainerRef = useRef<HTMLDivElement>(null);
  const shouldAbortPollingRef = useRef<boolean>(false);
  const answeredQuestionIdsRef = useRef<Set<string>>(new Set());
  const [isAnswerSubmitting, setIsAnswerSubmitting] = useState(false);

  useEffect(() => {
    answeredQuestionIdsRef.current = new Set();
  }, [currentLectureId]);

  const allowedFileTypes = ['.pdf', '.ppt', '.pptx', '.doc', '.docx'];
  const commonStyles = {
    rounded: "rounded-lg",
  };
  
  useEffect(() => {
    if (courseId !== undefined && courseId !== null) {
      setCurrentCourseId(courseId);
      return;
    }
    if (routeCourseId !== null) {
      setCurrentCourseId(routeCourseId);
      return;
    }
    setCurrentCourseId(null);
  }, [courseId, routeCourseId]);

  const resolvedCourseId = currentCourseId ?? courseId ?? courseDetail?.courseId ?? routeCourseId ?? null;
  const resolvedLectureId = currentLectureId ?? lectureId ?? courseDetail?.lectures?.[0]?.lectureId ?? null;

  const assistantEnabled = useMemo(
    () =>
      !examProps?.examMode &&
      viewMode === "course-detail" &&
      (assistantMaterialId ?? 0) > 0 &&
      resolvedLectureId != null &&
      assistantPdfActive === true,
    [
      assistantMaterialId,
      assistantPdfActive,
      examProps?.examMode,
      resolvedLectureId,
      viewMode,
    ],
  );

  const lectureAssistant = useLectureAssistantChat({
    enabled: assistantEnabled,
    lectureId: resolvedLectureId,
    materialId: assistantMaterialId ?? null,
    currentPdfPage: previewCurrentPdfPage ?? 1,
    goToPdfPage: goToPdfPage ?? (() => {}),
    userPdfNav: userPdfNav ?? null,
  });

  const integratedLearning = useIntegratedLearningChat({
    enabled:
      !examProps?.examMode &&
      learningTab === "integrated" &&
      viewMode === "course-detail" &&
      resolvedLectureId != null,
    lectureId: resolvedLectureId,
  });
  const integratedModeActive =
    !examProps?.examMode &&
    learningTab === "integrated" &&
    viewMode === "course-detail";
  const displayMessages = integratedModeActive
    ? integratedLearning.messages
    : assistantEnabled
      ? lectureAssistant.messages
      : messages;

  // 로컬 스토리지 키 생성
  const getUploadStorageKey = (lectureId: number) => `lecture_upload_${lectureId}`;

  // 업로드 정보 저장 (materialId: 시험 생성 sourceMaterialId 복구용)
  const saveUploadToStorage = (
    lectureId: number,
    fileName: string,
    fileUrl: string,
    materialId?: number | null,
  ) => {
    try {
      localStorage.setItem(
        getUploadStorageKey(lectureId),
        JSON.stringify({
          fileName,
          fileUrl,
          timestamp: Date.now(),
          ...(materialId != null && materialId > 0 ? { materialId } : {}),
        }),
      );
    } catch (error) {
      console.error('Failed to save upload to storage:', error);
    }
  };

  // 업로드 정보 불러오기
  const loadUploadFromStorage = (lectureId: number) => {
    try {
      const stored = localStorage.getItem(getUploadStorageKey(lectureId));
      if (stored) {
        const data = JSON.parse(stored);
        // 24시간 이내 데이터만 유효
        if (Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
          const mid =
            typeof data.materialId === "number" && data.materialId > 0
              ? data.materialId
              : undefined;
          return { fileName: data.fileName, fileUrl: data.fileUrl, materialId: mid };
        }
      }
    } catch (error) {
      console.error('Failed to load upload from storage:', error);
    }
    return null;
  };

  const revokePreviewUrl = () => {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
    }
  };

  useEffect(() => {
    setCurrentLectureId(lectureId ?? null);
    
    // 강의 변경 시 저장된 업로드 정보 불러오기 (채팅 패널 표시만 — 부모 미리보기는 자료 목록 클릭으로 맞춤.
    // 이전에는 여기서 onLectureDataChange로 이전 PDF를 강제해 시험이 잘못된 sourceMaterialId로 생성됨.)
    if (lectureId) {
      const stored = loadUploadFromStorage(lectureId);
      if (stored) {
        setUploadedFileName(stored.fileName);
        setUploadedFileDisplayUrl(stored.fileUrl);
        setHasUploadedMaterial(true);
      } else {
        // 저장된 정보가 없으면 초기화
        setHasUploadedMaterial(false);
        setUploadedFileDisplayUrl("");
        setUploadedFileName("");
        revokePreviewUrl();
      }
    } else {
      setHasUploadedMaterial(false);
      setUploadedFileDisplayUrl("");
      setUploadedFileName("");
      revokePreviewUrl();
    }
  }, [lectureId]);

  useEffect(() => {
    if (!lectureId && !currentLectureId && courseDetail?.lectures?.length) {
      setCurrentLectureId(courseDetail.lectures[0].lectureId);
    }
  }, [lectureId, currentLectureId, courseDetail?.lectures]);

  const isValidHttpUrl = (value: string | null | undefined) => {
    if (!value) return false;
    return /^https?:\/\//i.test(value);
  };

  useEffect(
    () => () => {
      revokePreviewUrl();
    },
    []
  );

  // 메시지가 추가될 때마다 자동으로 스크롤 내리기
  useEffect(() => {
    const chatContainer = document.getElementById("chat-messages");
    if (chatContainer) {
      // 약간의 딜레이를 두어 DOM 업데이트 후 스크롤
      setTimeout(() => {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }, 0);
    }
  }, [displayMessages]);

  // 스트리밍 취소 함수
  const cancelStreaming = useCallback(async () => {
    if (isStreaming && currentLectureId) {
      shouldAbortPollingRef.current = true;
      try {
        await streamingApi.cancel(currentLectureId);
      } catch (error) {
        console.error('스트리밍 취소 실패:', error);
      }
    }
  }, [isStreaming, currentLectureId]);

  // 컴포넌트 언마운트 또는 lectureId 변경 시 스트리밍 취소
  useEffect(() => {
    return () => {
      void cancelStreaming();
    };
  }, [cancelStreaming]);

  // 페이지 이동/새로고침/탭 닫기 시 스트리밍 취소
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isStreaming && currentLectureId) {
        // 폴링 중단 플래그 설정
        shouldAbortPollingRef.current = true;
        // 동기적으로 취소 요청 시도 (페이지가 닫히기 전에)
        // 주의: beforeunload에서는 비동기 작업이 완료되지 않을 수 있으므로
        // cleanup 함수에서도 처리되도록 보장
        void cancelStreaming();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isStreaming, currentLectureId, cancelStreaming]);


  // 스트리밍 중지 함수
  const handleCancelStream = async () => {
    if (integratedModeActive) {
      await integratedLearning.stop();
      return;
    }
    if (assistantEnabled) {
      lectureAssistant.stop();
      return;
    }
    if (!currentLectureId) return;

    try {
      shouldAbortPollingRef.current = true;
      await streamingApi.cancel(currentLectureId);

      const cancelMessage: ChatMessage = {
        id: Date.now(),
        text: "학습이 중지되었습니다.",
        isUser: false,
        isLoading: false,
      };
      setMessages((prev) => [...prev, cancelMessage]);
    } catch (error) {
      console.error('스트리밍 중지 실패:', error);
      const errorMsg = error instanceof Error ? error.message : '중지에 실패했습니다.';
      const errorMessage: ChatMessage = {
        id: Date.now(),
        text: `중지 오류: ${errorMsg}`,
        isUser: false,
        isLoading: false,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      // API 호출 성공/실패와 관계없이 프론트 측 스트리밍 상태는 중지
      setIsStreaming(false);
      setWaitingForAnswer(false);
      setCurrentAiQuestionId(null);
      setIsFetchingNext(false);
      setMessages((prev) => prev.filter((message) => !message.isLoading));
    }
  };

  const handleFileUpload = async (file: File) => {
    // 파일 타입 검증
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedFileTypes.includes(fileExtension)) {
      alert(`지원하지 않는 파일 형식입니다.\n지원 형식: ${allowedFileTypes.join(', ')}`);
      return;
    }

    // 인증 확인
    const token = getAuthToken();
    if (!token || !isAuthenticated) {
      alert('파일 업로드를 위해서는 로그인이 필요합니다.');
      return;
    }

    const targetCourseId = resolvedCourseId;
    if (targetCourseId === null) {
      alert('강의실을 먼저 생성해주세요.');
      return;
    }

    const targetLectureId = resolvedLectureId;
    if (targetLectureId === null) {
      alert('강의를 먼저 생성해주세요.');
      return;
    }

    // 기존 프리뷰 URL 정리
    revokePreviewUrl();

    // 새 파일에 대한 로컬 프리뷰 URL 생성
    const previewUrl = URL.createObjectURL(file);
    previewObjectUrlRef.current = previewUrl;
    setUploadedFileDisplayUrl(previewUrl);
    setUploadedFileName(file.name);
    setHasUploadedMaterial(false);
    onLectureDataChange("", previewUrl, file.name, null);

    setIsUploading(true);

    // 파일 업로드 메시지 추가 (이미지처럼 간단하게)
    const uploadMessage: ChatMessage = {
      id: Date.now(),
      text: file.name,
      isUser: true,
      file: file,
      isLoading: false,
    };
    if (assistantEnabled) {
      lectureAssistant.appendUserFile(file);
    } else {
      setMessages((prev) => [...prev, uploadMessage]);
    }

    try {
      const result = await lectureApi.uploadMaterial(targetLectureId!, file);
      const { fileUrl, displayName, materialId: uploadedMaterialId } = result;
      const displayFileName = displayName ?? file.name;

      setHasUploadedMaterial(true);

      if (typeof fileUrl === "string" && fileUrl.length > 0 && isValidHttpUrl(fileUrl)) {
        revokePreviewUrl();
        setUploadedFileDisplayUrl(fileUrl);
        onLectureDataChange("", fileUrl, displayFileName, uploadedMaterialId ?? null);
        saveUploadToStorage(
          targetLectureId,
          displayFileName,
          fileUrl,
          uploadedMaterialId ?? null,
        );
      } else {
        setUploadedFileDisplayUrl(previewUrl);
        onLectureDataChange("", previewUrl, displayFileName, uploadedMaterialId ?? null);
        saveUploadToStorage(
          targetLectureId,
          displayFileName,
          previewUrl,
          uploadedMaterialId ?? null,
        );
      }

      // 업로드 완료 메시지 추가
      const successText = assistantEnabled
        ? "파일이 업로드되었습니다.\n\nEnter를 눌러 현재 PDF 페이지 기준 설명을 시작할 수 있습니다.\n중단: `/cancel`"
        : "파일이 업로드되었습니다.\n\n- 스트리밍 학습 시작: Enter (빈 입력)\n- 현재 세션 상태 조회: `/status`\n- 스트리밍 중단: `/cancel`";
      const successMessage: ChatMessage = {
        id: Date.now() + 1,
        text: successText,
        isUser: false,
        isLoading: false,
      };
      if (assistantEnabled) {
        lectureAssistant.appendAssistantNotice(successText);
      } else {
        setMessages((prev) => [...prev, successMessage]);
      }
    } catch (error) {
      console.error('파일 업로드 실패:', error);
      const errorMessageText = error instanceof Error ? error.message : '알 수 없는 오류';
      
      // 백엔드 인증 오류인 경우 토큰을 유지하고 재시도 가능하도록 안내
      const isAuthError = errorMessageText.includes('백엔드 인증 오류') || 
                         errorMessageText.includes('인증 토큰이 유효하지 않거나 만료');
      
      const errorMessage: ChatMessage = {
        id: Date.now() + 1,
        text: `파일 업로드 실패: ${errorMessageText}${isAuthError ? '\n\n잠시 후 다시 시도하거나, 페이지를 새로고침해주세요.' : ''}`,
        isUser: false,
        isLoading: false,
      };
      if (assistantEnabled) {
        lectureAssistant.appendAssistantNotice(errorMessage.text);
      } else {
        setMessages((prev) => [...prev, errorMessage]);
        setMessages((prev) => prev.filter((msg) => msg.id !== uploadMessage.id));
      }

      setHasUploadedMaterial(false);
    } finally {
      setIsUploading(false);

      // 스크롤을 하단으로 이동
      setTimeout(() => {
        const chatContainer = document.getElementById("chat-messages");
        if (chatContainer) {
          chatContainer.scrollTop = chatContainer.scrollHeight;
        }
      }, 0);
    }
  };



  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  // generate-content 제거로 해당 핸들러 삭제

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
    // 같은 파일을 다시 선택할 수 있도록 리셋
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleToggleActionMenu = () => {
    setIsActionMenuOpen((prev) => !prev);
  };

  const handleSelectFileUpload = () => {
    setIsActionMenuOpen(false);
    if (!isUploading) {
      fileInputRef.current?.click();
    }
  };

  useEffect(() => {
    if (!isActionMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        actionMenuContainerRef.current &&
        !actionMenuContainerRef.current.contains(event.target as Node)
      ) {
        setIsActionMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isActionMenuOpen]);

  // 스트리밍: 다음 세그먼트 가져오기
  const fetchNextSegment = async (loadingMessageId?: number) => {
    if (!currentLectureId || isFetchingNext) return;
    shouldAbortPollingRef.current = false;
    setIsFetchingNext(true);

    const parseHttpStatusFromError = (msg: string): number | null => {
      const m = msg.match(/API Error\s*\(\s*(\d{3})/i);
      return m ? Number(m[1]) : null;
    };

    const isKnownTransientStreamError = (msg: string): boolean => {
      // 백엔드(파이썬)에서 간헐적으로 내려오는 내부 오류 문자열
      return /tuple indices must be integers or slices, not str/i.test(msg);
    };

    const callNextWithRetry = async (): Promise<StreamNextResponse> => {
      // 400은 재시도하지 않고 메시지 그대로 사용자에게 전달. 500/일시 오류만 재시도.
      const delaysMs = [500, 1000, 2000];
      let lastErr: unknown;
      for (let attempt = 0; attempt < delaysMs.length + 1; attempt++) {
        if (!currentLectureId || shouldAbortPollingRef.current) {
          throw new Error("요청이 중단되었습니다.");
        }
        try {
          return await streamingApi.next(currentLectureId, {
            pageNumber: previewCurrentPdfPage ?? undefined,
          });
        } catch (e) {
          lastErr = e;
          const msg = e instanceof Error ? e.message : String(e);
          const status = parseHttpStatusFromError(msg);
          if (status === 400) break;
          const shouldRetry = status === 500 || isKnownTransientStreamError(msg);
          if (!shouldRetry || attempt >= delaysMs.length) break;
          await sleep(delaysMs[attempt]);
        }
      }
      throw lastErr instanceof Error ? lastErr : new Error("다음 세그먼트 수신 실패");
    };

    const pollNext = async (): Promise<void> => {
      if (!currentLectureId || shouldAbortPollingRef.current) {
        return;
      }
      const res = await callNextWithRetry();
      const status = (res.status || "").toUpperCase();
      if (status === "PROCESSING") {
        await sleep(2000);
        if (shouldAbortPollingRef.current) {
          return;
        }
        return pollNext();
      }
      const shouldContinue = await mapNextToMessages(
        res,
        setMessages,
        setWaitingForAnswer,
        setCurrentAiQuestionId,
        () => {}, // hasMoreStream은 사용하지 않으므로 빈 함수
        loadingMessageId
      );
      // hasMore === false 또는 status === "COMPLETED" 등 "끝"이면 더 이상 get_next_content 호출하지 않음
      if (res.hasMore === false || (res.status || "").toUpperCase() === "COMPLETED") {
        return;
      }
      
      // 개념 설명 후 자동으로 다음 세그먼트(질문) 가져오기
      if (shouldContinue && !shouldAbortPollingRef.current && currentLectureId) {
        // 질문 로딩 메시지 추가
        const questionLoadingId = Date.now();
        setMessages((prev) => [
          ...prev,
          {
            id: questionLoadingId,
            text: "",
            isUser: false,
            isLoading: true,
          },
        ]);
        
        await sleep(500); // 약간의 딜레이 후 다음 세그먼트 가져오기
        if (!shouldAbortPollingRef.current) {
          // 다음 세그먼트 가져오기 (재귀 호출)
          const nextPoll = async (): Promise<void> => {
            if (!currentLectureId || shouldAbortPollingRef.current) {
              setMessages((prev) => prev.filter((m) => m.id !== questionLoadingId));
              return;
            }
            const nextRes = await callNextWithRetry();
            const nextStatus = (nextRes.status || "").toUpperCase();
            if (nextStatus === "PROCESSING") {
              await sleep(2000);
              if (!shouldAbortPollingRef.current) {
                return nextPoll();
              } else {
                setMessages((prev) => prev.filter((m) => m.id !== questionLoadingId));
              }
            } else {
              // 질문이 도착했으므로 로딩 메시지 제거하고 메시지 추가
              setMessages((prev) => prev.filter((m) => m.id !== questionLoadingId));
              await mapNextToMessages(
                nextRes,
                setMessages,
                setWaitingForAnswer,
                setCurrentAiQuestionId,
                () => {} // hasMoreStream은 사용하지 않으므로 빈 함수
              );
            }
          };
          return nextPoll();
        } else {
          // 중단된 경우 로딩 메시지 제거
          setMessages((prev) => prev.filter((m) => m.id !== questionLoadingId));
        }
      }
    };
    try {
      await pollNext();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "다음 세그먼트 수신 실패";
      if (isKnownTransientStreamError(msg)) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            text:
              "서버 내부 오류가 발생했어요(일시적). 잠시 후 Enter를 다시 눌러 재시도해 주세요. 계속 반복되면 `/cancel` 후 다시 시작해 보세요.",
            isUser: false,
          },
        ]);
        return;
      }
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), text: `오류: ${msg}`, isUser: false },
      ]);
      if (/waiting\s*for\s*answer/i.test(msg)) {
        setWaitingForAnswer(true);
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            text: "질문에 대한 답변을 입력할 차례입니다.",
            isUser: false,
          },
        ]);
      }
    } finally {
      setIsFetchingNext(false);
      setTimeout(() => {
        const chatContainer = document.getElementById("chat-messages");
        if (chatContainer) {
          chatContainer.scrollTop = chatContainer.scrollHeight;
        }
      }, 0);
    }
  };


  // 입력창 초기화 및 높이 리셋
  const resetInputText = () => {
    setInputText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = '44px';
    }
  };

  const handleSendMessage = () => {
    const trimmed = inputText.trim();

    if (integratedModeActive) {
      if (trimmed === "/cancel") {
        void integratedLearning.stop();
        resetInputText();
        return;
      }
      if (trimmed) {
        void integratedLearning.sendUserText(trimmed);
      } else {
        void integratedLearning.startOrContinue();
      }
      resetInputText();
      return;
    }

    if (assistantEnabled) {
      if (trimmed === "/cancel") {
        lectureAssistant.stop();
        resetInputText();
        return;
      }
      if (trimmed === "/status") {
        resetInputText();
        lectureAssistant.appendAssistantNotice(
          "강의 보조 모드에서는 /status를 사용할 수 없습니다.",
        );
        return;
      }
      if (trimmed) {
        lectureAssistant.submitUserText(trimmed);
      } else {
        lectureAssistant.onEmptySubmit();
      }
      resetInputText();
      return;
    }

    // 공통 명령어: 스트리밍 취소
    if (trimmed === "/cancel") {
      if (isStreaming) {
        void cancelStreaming();
      } else {
        setMessages((prev) => [...prev, { id: Date.now(), text: "현재 진행 중인 스트리밍이 없습니다.", isUser: false }]);
      }
      resetInputText();
      return;
    }

    // 공통 명령어: 세션/상태 조회
    if (trimmed === "/status") {
      if (!currentLectureId) return;
      resetInputText();
      setMessages((prev) => [...prev, { id: Date.now(), text: "", isUser: false, isLoading: true }]);
      streamingApi.getSession(currentLectureId)
        .then((res) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.isLoading
                ? { ...m, text: "세션 상태", markdown: "```json\n" + JSON.stringify(res, null, 2) + "\n```", isLoading: false }
                : m
            )
          );
        })
        .catch((e) => {
          const msg = e instanceof Error ? e.message : "상태 조회 실패";
          setMessages((prev) => prev.map((m) => (m.isLoading ? { ...m, text: `오류: ${msg}`, isLoading: false } : m)));
        });
      return;
    }

    // 질문 대기 시: 사용자의 답변 전송 (같은 ai_question_id는 한 번만 제출)
    if (isStreaming && waitingForAnswer && currentAiQuestionId && currentLectureId) {
      if (!trimmed) return;
      if (isAnswerSubmitting) return;
      if (answeredQuestionIdsRef.current.has(currentAiQuestionId)) {
        setMessages((prev) => [...prev, { id: Date.now(), text: "이미 답변이 처리되었습니다. 다음으로 진행합니다.", isUser: false }]);
        setWaitingForAnswer(false);
        setCurrentAiQuestionId(null);
        void fetchNextSegment();
        resetInputText();
        return;
      }
      const userText = inputText.trim();
      const userMsg: ChatMessage = {
        id: Date.now(),
        text: userText,
        isUser: true,
      };
      setMessages((prev) => [...prev, userMsg]);
      resetInputText();
      answeredQuestionIdsRef.current.add(currentAiQuestionId);
      setIsAnswerSubmitting(true);

      const pendingReply: ChatMessage = {
        id: Date.now() + 1,
        text: "",
        isUser: false,
        isLoading: true,
      };
      setMessages((prev) => [...prev, pendingReply]);

      learningActivityApi
        .answerInquiry({ aiQuestionId: currentAiQuestionId, answerText: userText })
        .then((res) => {
          const status = (res.status || "").toUpperCase();
          const explanation = res.explanation ?? "";
          const steps = res.steps ?? [];

          if (status === "GOOD") {
            const displayExplanation = explanation.trim() || "해설 없음";
            setMessages((prev) =>
              prev.map((m) =>
                m.id === pendingReply.id
                  ? {
                      ...m,
                      text: "정답",
                      markdown: displayExplanation,
                      isLoading: false,
                    }
                  : m
              )
            );
          } else {
            const parts: string[] = [];
            if (explanation.trim()) parts.push(`**해설**\n${explanation.trim()}`);
            if (steps.length > 0) {
              parts.push(
                "**하위 개념 학습**",
                ...steps.map(
                  (s: RemedialStep, i: number) =>
                    `\n### ${i + 1}. ${(s.concept || "").trim() || "개념"}\n${(s.explanation || "").trim() || ""}\n${(s.question || "").trim() ? `*추가 질문:* ${s.question.trim()}` : ""}`
                )
              );
            }
            const markdown = parts.length > 0 ? parts.join("\n\n") : "오답입니다. 보충 설명이 제공되지 않았습니다.";
            setMessages((prev) =>
              prev.map((m) =>
                m.id === pendingReply.id
                  ? {
                      ...m,
                      text: "오답 · 보충 학습",
                      markdown,
                      isLoading: false,
                    }
                  : m
              )
            );
          }
          setWaitingForAnswer(false);
          setCurrentAiQuestionId(null);
          void fetchNextSegment();
        })
        .catch((err) => {
          answeredQuestionIdsRef.current.delete(currentAiQuestionId);
          const msg = err instanceof Error ? err.message : "답변 전송 실패";
          setMessages((prev) =>
            prev.map((m) =>
              m.id === pendingReply.id
                ? { ...m, text: `오류: ${msg}`, isLoading: false }
                : m
            )
          );
        })
        .finally(() => {
          setIsAnswerSubmitting(false);
          setTimeout(() => {
            const chatContainer = document.getElementById("chat-messages");
            if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;
          }, 0);
        });
      return;
    }

    // 질문 대기가 아닐 때: Enter로 다음 세그먼트 진행
    if (isStreaming && !waitingForAnswer) {
      resetInputText(); // 입력창 비우기
      void fetchNextSegment();
      return;
    }

    // 강의가 선택되었고 스트리밍이 시작되지 않았을 때:
    // - Enter(빈 입력): v3 세션 초기화 + 스트리밍 학습 시작
    if (!isStreaming && currentLectureId) {
      resetInputText(); // 입력창 비우기
      const initMessageId = Date.now();
      setMessages((prev) => [
        ...prev,
        { id: initMessageId, text: "", isUser: false, isLoading: true },
      ]);
      streamingApi.initialize(currentLectureId, {
        pageNumber: previewCurrentPdfPage ?? undefined,
      })
        .then(() => {
          setIsStreaming(true);
          return fetchNextSegment(initMessageId);
        })
        .catch((e) => {
          const msg = e instanceof Error ? e.message : "세션 초기화 실패";
          setMessages((prev) =>
            prev.map((m) => (m.isLoading ? { ...m, text: `오류: ${msg}`, isLoading: false } : m))
          );
        })
        .finally(() => {
          // 스크롤을 하단으로 이동
          setTimeout(() => {
            const chatContainer = document.getElementById("chat-messages");
            if (chatContainer) {
              chatContainer.scrollTop = chatContainer.scrollHeight;
            }
          }, 0);
        });
      return;
    }

    // 스트리밍 전 일반 텍스트 입력은 무시
    if (!trimmed) return;
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleConfirmIntegratedBetaNotice = useCallback(() => {
    setShowIntegratedBetaNotice(false);
    try {
      localStorage.setItem(INTEGRATED_BETA_NOTICE_SEEN_KEY, "1");
    } catch {
      // ignore
    }
  }, []);

  return (
    <>
      <aside
      className="h-full flex flex-col border-l transition-colors relative flex-shrink-0"
      style={{
        width: `${width}px`,
        backgroundColor: isDarkMode ? "#141414" : "#FFFFFF",
        color: isDarkMode ? "#FFFFFF" : "#141414",
        borderColor: isDarkMode ? "#404040" : "#e5e7eb",
      }}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* 드래그 앤 드롭 영역 */}
      {isDragging && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: isDarkMode ? "rgba(20,20,20,0.9)" : "rgba(255,255,255,0.9)" }}
        >
          <div className={`p-8 rounded-lg border-2 border-dashed ${
            isDarkMode ? "border-gray-600" : "border-emerald-500 bg-emerald-50"
          }`}
          style={isDarkMode ? { backgroundColor: "#27272a" } : undefined}
          >
            <p className="text-lg font-medium" style={{ color: isDarkMode ? "#FFFFFF" : "#141414" }}>
              파일을 여기에 놓으세요
            </p>
          </div>
        </div>
      )}

      {/* 강의 학습 | 시험 만들기 탭 - 설정페이지 모바일 스타일 (항상) */}
      {examProps && viewMode === "course-detail" && examProps.isTeacher && (
        <nav
          className="pl-3 shrink-0 h-10 min-h-10 max-h-10 flex items-center border-b box-border"
          style={{ borderColor: isDarkMode ? "#404040" : "#e5e7eb" }}
        >
          <ul className="w-full flex items-center gap-6 min-h-0">
            <li className="flex items-center">
              <button
                type="button"
                onClick={() => {
                  setLearningTab("study");
                  examProps.onExamModeChange(false);
                }}
                className={`w-auto flex items-center gap-2 rounded font-semibold text-[16px] transition-colors ${
                  !examProps.examMode && learningTab === "study"
                    ? isDarkMode
                      ? "text-[#FFFFFF]"
                      : "text-[#141414]"
                    : "text-[#adadad]"
                }`}
              >
                강의 학습
              </button>
            </li>
            <li className="flex items-center">
              <button
                type="button"
                onClick={() => examProps.onExamModeChange(true)}
                className={`w-auto flex items-center gap-2 rounded font-semibold text-[16px] transition-colors ${
                  examProps.examMode
                    ? isDarkMode
                      ? "text-[#FFFFFF]"
                      : "text-[#141414]"
                    : "text-[#adadad]"
                }`}
              >
                시험
              </button>
            </li>
            <li className="flex items-center">
              <button
                type="button"
                onClick={() => {
                  setLearningTab("integrated");
                  examProps.onExamModeChange(false);
                }}
                className={`w-auto flex items-center gap-2 rounded font-semibold text-[16px] transition-colors ${
                  !examProps.examMode && learningTab === "integrated"
                    ? isDarkMode
                      ? "text-[#FFFFFF]"
                      : "text-[#141414]"
                    : "text-[#adadad]"
                }`}
              >
                통합학습(베타)
              </button>
            </li>
          </ul>
        </nav>
      )}

      {/* 시험 만들기 모드: 옵션 선택 (유형/주제/문항 수 등) */}
      {examProps?.examMode ? (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden exam-select-arrow-left">
          {examProps.recoverOpen && (
            <div className={`shrink-0 flex items-center gap-2 px-3 py-2 border-b ${isDarkMode ? "border-zinc-700" : "border-gray-200"}`}
            style={{ backgroundColor: isDarkMode ? "rgba(39,39,42,0.5)" : "#f9fafb" }}
            >
              <span className="text-xs" style={{ color: isDarkMode ? "#FFFFFF" : "#141414" }}>복구할 시험:</span>
              <select
                value={examProps.recoverSelectedId}
                onChange={(e) => examProps.setRecoverSelectedId(e.target.value)}
                className="text-xs px-2 py-1 rounded border flex-1 max-w-[180px]"
                style={{
                  backgroundColor: isDarkMode ? "#27272a" : "#FFFFFF",
                  borderColor: isDarkMode ? "#52525b" : "#d1d5db",
                  color: isDarkMode ? "#FFFFFF" : "#141414",
                }}
              >
                {examProps.recoverExams.map((e) => (
                  <option key={e.id} value={e.examSessionId ?? ""}>
                    {e.title}
                  </option>
                ))}
              </select>
              <button type="button" onClick={examProps.onRecoverSubmit} className="text-xs px-2 py-1 rounded bg-emerald-600 text-white cursor-pointer">복구 실행</button>
              <button type="button" onClick={() => examProps.setRecoverOpen(false)} className="text-xs px-2 py-1 rounded border border-gray-400 text-gray-600 hover:bg-gray-200 cursor-pointer">취소</button>
            </div>
          )}
          <div className="flex-1 min-h-0 overflow-y-auto pl-3 py-3 flex flex-col gap-3">
            <div className="flex gap-3">
              <div className="flex-1 min-w-0">
                <label className="block text-[14px] font-medium mb-0.5 pl-2" style={{ color: isDarkMode ? "#FFFFFF" : "#141414" }}>시험 유형</label>
                <select value={examProps.examType} onChange={(e) => examProps.setExamType(e.target.value)} className="w-full px-2 py-1.5 text-sm rounded-2xl border" style={{ backgroundColor: isDarkMode ? "#27272a" : "#FFFFFF", borderColor: isDarkMode ? "#52525b" : "#d1d5db", color: isDarkMode ? "#FFFFFF" : "#141414" }}>
                  <option value="FLASH_CARD">플래시카드</option>
                  <option value="OX_PROBLEM">OX 문제</option>
                  <option value="FIVE_CHOICE">5지선다</option>
                  <option value="SHORT_ANSWER">단답/서술형</option>
                </select>
              </div>
              <div className="flex-1 min-w-0">
                <label className="block text-[14px] font-medium mb-0.5 pl-2" style={{ color: isDarkMode ? "#FFFFFF" : "#141414" }}>문항 수</label>
                <div className="min-w-0">
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={
                      examCountFieldFocused
                        ? examCountDraft
                        : String(examProps.examCount)
                    }
                    onFocus={() => {
                      examCountFieldFocusedRef.current = true;
                      setExamCountFieldFocused(true);
                      setExamCountDraft(String(examProps.examCount));
                    }}
                    onChange={(e) => {
                      if (!examCountFieldFocusedRef.current) return;
                      setExamCountDraft(e.target.value.replace(/\D/g, ""));
                    }}
                    onBlur={(e) => {
                      examCountFieldFocusedRef.current = false;
                      setExamCountFieldFocused(false);
                      commitExamQuestionCountInput(
                        e.target.value,
                        examProps.examType,
                        examProps.setExamCount,
                      );
                    }}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;
                      e.preventDefault();
                      (e.currentTarget as HTMLInputElement).blur();
                    }}
                    className="w-full min-w-0 px-2 py-1.5 text-sm rounded-2xl border"
                    style={{ backgroundColor: isDarkMode ? "#27272a" : "#FFFFFF", borderColor: isDarkMode ? "#52525b" : "#d1d5db", color: isDarkMode ? "#FFFFFF" : "#141414" }}
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-[14px] font-medium mb-0.5 pl-2" style={{ color: isDarkMode ? "#FFFFFF" : "#141414" }}>
                시험 이름 <span className="font-normal opacity-70">(선택)</span>
              </label>
              <input
                type="text"
                value={localExamDisplayName}
                onChange={(e) => setLocalExamDisplayName(e.target.value)}
                placeholder="비워 두면 자동 이름 · 직접 입력 시 아래 예시 참고"
                aria-describedby="exam-display-name-hint"
                className="block w-full px-2 py-1.5 text-sm rounded-2xl border m-0"
                style={{ backgroundColor: isDarkMode ? "#27272a" : "#FFFFFF", borderColor: isDarkMode ? "#52525b" : "#d1d5db", color: isDarkMode ? "#FFFFFF" : "#141414" }}
              />
              <p
                id="exam-display-name-hint"
                className="mt-1.5 pl-2 text-[11px] leading-snug space-y-1"
                style={{ color: isDarkMode ? "#a1a1aa" : "#6b7280" }}
              >
                <span className="block">
                  비워 두면{" "}
                  <span className="font-medium opacity-90" style={{ color: isDarkMode ? "#e4e4e7" : "#374151" }}>
                    유형 · 문항 수
                  </span>
                  형식으로 붙습니다. 같은 유형·문항 수 조합이 이미 있으면{" "}
                  <span className="font-medium opacity-90" style={{ color: isDarkMode ? "#e4e4e7" : "#374151" }}>
                    (2), (3)…
                  </span>
                  이 자동으로 붙습니다.
                </span>
                <span className="block pt-0.5">
                  이름 예시 — 개념 정리를 위한 플래시카드, 중간고사 대비 암기용 문제, 빠른 복습용 테스트
                </span>
              </p>
            </div>
            <div>
              <label className="block text-[14px] font-medium mb-0.5 pl-2" style={{ color: isDarkMode ? "#FFFFFF" : "#141414" }}>주제</label>
              <textarea
                rows={1}
                value={localExamTopic}
                onChange={(e) => setLocalExamTopic(e.target.value)}
                placeholder="이 시험이 다룰 내용"
                className="block w-full px-2 py-1.5 text-sm rounded-2xl border resize-none m-0"
                style={{ backgroundColor: isDarkMode ? "#27272a" : "#FFFFFF", borderColor: isDarkMode ? "#52525b" : "#d1d5db", color: isDarkMode ? "#FFFFFF" : "#141414" }}
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1 min-w-0">
                <label className="block text-[14px] font-medium mb-0.5 pl-2" style={{ color: isDarkMode ? "#FFFFFF" : "#141414" }}>난이도</label>
                <select value={examProps.profileProficiencyLevel} onChange={(e) => examProps.setProfileProficiencyLevel(e.target.value as "Beginner" | "Intermediate" | "Advanced")} className="w-full px-2 py-1.5 text-sm rounded-2xl border" style={{ backgroundColor: isDarkMode ? "#27272a" : "#FFFFFF", borderColor: isDarkMode ? "#52525b" : "#d1d5db", color: isDarkMode ? "#FFFFFF" : "#141414" }}>
                  <option value="Beginner">초급</option>
                  <option value="Intermediate">중급</option>
                  <option value="Advanced">고급</option>
                </select>
              </div>
              <div className="flex-1 min-w-0">
                <label className="block text-[14px] font-medium mb-0.5 pl-2" style={{ color: isDarkMode ? "#FFFFFF" : "#141414" }}>평가 중점</label>
                <select value={examProps.profileTargetDepth} onChange={(e) => examProps.setProfileTargetDepth(e.target.value as "Concept" | "Application" | "Derivation" | "Deep Understanding")} className="w-full px-2 py-1.5 text-sm rounded-2xl border" style={{ backgroundColor: isDarkMode ? "#27272a" : "#FFFFFF", borderColor: isDarkMode ? "#52525b" : "#d1d5db", color: isDarkMode ? "#FFFFFF" : "#141414" }}>
                  <option value="Concept">개념 이해</option>
                  <option value="Application">응용</option>
                  <option value="Derivation">증명/유도</option>
                  <option value="Deep Understanding">심화 이해</option>
                </select>
              </div>
              <div className="flex-1 min-w-0">
                <label className="block text-[14px] font-medium mb-0.5 pl-2" style={{ color: isDarkMode ? "#FFFFFF" : "#141414" }}>문제 스타일</label>
                <select value={examProps.profileQuestionModality} onChange={(e) => examProps.setProfileQuestionModality(e.target.value as "Mathematical" | "Theoretical" | "Balance")} className="w-full px-2 py-1.5 text-sm rounded-2xl border" style={{ backgroundColor: isDarkMode ? "#27272a" : "#FFFFFF", borderColor: isDarkMode ? "#52525b" : "#d1d5db", color: isDarkMode ? "#FFFFFF" : "#141414" }}>
                  <option value="Mathematical">수학적</option>
                  <option value="Theoretical">이론적</option>
                  <option value="Balance">균형</option>
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[14px] font-medium pl-2" style={{ color: isDarkMode ? "#FFFFFF" : "#141414" }}>시험목록</span>
                <div className="flex items-center gap-1">
                  {!examProps.examEditMode ? (
                    <button
                      type="button"
                      onClick={() => examProps.onExamEditModeChange?.(true)}
                      className={`flex items-center justify-center w-[24px] h-[24px] rounded-full cursor-pointer transition-colors ${
                        isDarkMode
                          ? "text-gray-400 hover:text-gray-200 hover:bg-zinc-700"
                          : "text-gray-500 hover:text-gray-700 hover:bg-zinc-200"
                      }`}
                      aria-label="수정/삭제 모드"
                      title="수정/삭제 모드"
                    >
                      <EditIcon className="w-4 h-4" />
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          const ids = Object.keys(examProps.selectedExamIds || {}).filter((k) => examProps.selectedExamIds?.[k]);
                          if (ids.length !== 1) {
                            window.alert("수정할 시험을 1개 선택해주세요.");
                            return;
                          }
                          const exam = examProps.recoverExams.find((e) => e.id === ids[0]);
                          if (exam?.examSessionId) examProps.onExamClick?.(exam.examSessionId);
                        }}
                        className={`flex items-center justify-center w-[24px] h-[24px] rounded-full cursor-pointer transition-colors ${
                          isDarkMode
                            ? "text-gray-400 hover:text-gray-200 hover:bg-zinc-700"
                            : "text-gray-500 hover:text-gray-700 hover:bg-zinc-200"
                        }`}
                        aria-label="수정"
                        title="수정"
                      >
                        <EditIcon className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={examProps.onDeleteSelectedExams}
                        className="flex items-center justify-center w-[24px] h-[24px] rounded-full cursor-pointer text-[#ff824d] hover:opacity-80"
                        aria-label="삭제"
                        title="삭제"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => examProps.onExamEditModeChange?.(false)}
                        className={`flex items-center justify-center w-[24px] h-[24px] rounded-full cursor-pointer transition-colors ${
                          isDarkMode
                            ? "bg-[#FFFFFF] text-[#141414] hover:opacity-90"
                            : "bg-[#141414] text-[#FFFFFF] hover:opacity-90"
                        }`}
                        aria-label="취소"
                        title="취소"
                      >
                        <CloseIcon className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                {examProps.recoverExams.map((exam) => {
                  const checked = !!examProps.selectedExamIds?.[exam.id];
                  const inBulkMode = !!examProps.examEditMode;
                  return (
                  <div
                    key={exam.id}
                    role="button"
                    tabIndex={examProps.examEditMode ? -1 : 0}
                    onMouseDown={(e) => {
                      if (examProps.examEditMode) e.preventDefault();
                    }}
                    onClick={() => {
                      if (examProps.examEditMode) {
                        examProps.onToggleExamSelect?.(exam.id);
                      } else if (exam.examSessionId) {
                        examProps.onExamClick?.(exam.examSessionId);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        if (examProps.examEditMode) {
                          examProps.onToggleExamSelect?.(exam.id);
                        } else if (exam.examSessionId) {
                          examProps.onExamClick?.(exam.examSessionId);
                        }
                      }
                    }}
                    className={`flex items-center w-full text-left rounded-2xl truncate cursor-pointer ${
                      isDarkMode
                        ? "border border-zinc-600 hover:bg-white/5"
                        : "border border-gray-300 hover:bg-black/[0.02]"
                    } ${
                      inBulkMode && checked
                        ? isDarkMode
                          ? "shadow-[inset_0_0_0_2px_#FFFFFF]"
                          : "shadow-[inset_0_0_0_2px_#141414]"
                        : ""
                    }`}
                    style={{ color: isDarkMode ? "#FFFFFF" : "#141414", backgroundColor: isDarkMode ? "#27272a" : "#FFFFFF" }}
                  >
                    <span className="flex-1 min-w-0 px-3 py-2 text-sm truncate">
                      {exam.title || `시험 ${exam.id}`}
                    </span>
                  </div>
                );})}
                {examProps.recoverExams.length === 0 && !examProps.submitting && (
                  <div className="flex items-center justify-center py-8">
                    <span className="text-xs opacity-60" style={{ color: isDarkMode ? "#FFFFFF" : "#141414" }}>생성된 시험이 없습니다.</span>
                  </div>
                )}
                {examProps.submitting && (
                  <div
                    className={`flex items-center gap-2 px-3 py-2 rounded-2xl ${
                      isDarkMode ? "bg-white/5 border border-zinc-600" : "bg-black/[0.03] border border-gray-200"
                    }`}
                    style={{ color: isDarkMode ? "#FFFFFF" : "#141414" }}
                  >
                    <div
                      className={`animate-spin rounded-full h-4 w-4 border-2 border-t-transparent shrink-0 ${
                        isDarkMode ? "border-gray-500" : "border-emerald-500"
                      }`}
                    />
                    <span className="text-sm font-medium">시험 생성중</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className={`shrink-0 pl-3 py-2 border-t flex justify-between items-center gap-2 flex-wrap ${isDarkMode ? "border-zinc-700" : "border-gray-200"}`}>
            <button
              type="button"
              onClick={examProps.onRecoverSession}
              className={`shrink-0 text-[14px] px-2 py-1.5 rounded-2xl border cursor-pointer ${isDarkMode ? "border-zinc-600 hover:bg-white/10" : "border-gray-300 hover:bg-black/5"}`}
              style={{ color: isDarkMode ? "#FFFFFF" : "#141414" }}
            >
              세션 복구
            </button>
            <button
              type="button"
              onClick={() =>
                examProps.onCreateExam(
                  localExamTopic.trim(),
                  localExamDisplayName.trim(),
                )
              }
              disabled={examProps.submitting || !localExamTopic.trim()}
              className={`shrink-0 px-3 py-1.5 text-sm rounded-2xl font-medium disabled:opacity-50 cursor-pointer transition-colors ${
                isDarkMode ? "bg-[#FFFFFF] text-[#141414] hover:bg-white/90" : "bg-[#141414] text-white hover:bg-black"
              }`}
            >
              {examProps.submitting ? "생성 시작 중..." : "시험 생성"}
            </button>
          </div>
        </div>
      ) : (
      <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
      {/* 채팅 메시지 영역 */}
      <div
        id="chat-messages"
        className={`relative flex-1 min-w-0 overflow-y-auto overflow-x-hidden px-3 py-4 space-y-2 ${
          integratedModeActive ? "scrollbar-hide" : ""
        }`}
        style={{
          backgroundColor: isDarkMode ? "#141414" : "#FFFFFF",
          ...(!integratedModeActive
            ? {
                scrollbarWidth: "thin" as const,
                scrollbarColor: isDarkMode
                  ? "#4a5568 #141414"
                  : "#cbd5e0 #ffffff",
              }
            : {}),
        }}
      >
        {learningTab === "integrated" && showIntegratedBetaNotice ? (
          <div className="sticky top-0 z-20 flex justify-center pb-2 pointer-events-none">
            <div
              className={`pointer-events-auto w-[min(100%,440px)] rounded-2xl border px-4 py-4 shadow-xl ${
                isDarkMode
                  ? "border-slate-500/60 bg-slate-700/95 text-white"
                  : "border-slate-300 bg-white text-[#141414]"
              }`}
            >
              <p className="text-center text-[16px] leading-relaxed font-semibold whitespace-pre-line">
                맞춤형 학습과 시험 등을{"\n"}통합적으로 관리해주는 AI 에이전트입니다
              </p>
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={handleConfirmIntegratedBetaNotice}
                  className={`px-6 py-2 rounded-full text-base font-semibold cursor-pointer ${
                    isDarkMode
                      ? "bg-blue-600 hover:bg-blue-500 text-white"
                      : "bg-blue-600 hover:bg-blue-500 text-white"
                  }`}
                >
                  확인
                </button>
              </div>
            </div>
          </div>
        ) : null}
        {displayMessages.length === 0 ? (
          <div
            className="flex h-full flex-col items-center justify-center text-center space-y-3"
            style={{ color: isDarkMode ? "#FFFFFF" : "#141414" }}
          >
            <p className="font-medium text-sm">메시지가 없습니다.</p>
            <span className="text-xs">
              {integratedModeActive
                ? "Enter를 눌러 통합학습을 시작하세요"
                : assistantEnabled
                ? "Enter를 눌러 현재 PDF 페이지 설명을 시작하세요"
                : "Enter를 눌러 학습을 시작하세요"}
            </span>
          </div>
        ) : (
          displayMessages.map((message, index) => {
            const isConsecutiveAgent =
              !message.isUser &&
              index > 0 &&
              !displayMessages[index - 1].isUser;
            const bubbleWidth = message.markdown ? "max-w-[90%]" : "max-w-[80%]";

            const assistantBubble =
              !message.isUser && message.assistantVariant === "orchestrator"
                ? isDarkMode
                  ? "bg-[#1e3a5f] border-blue-900/60 text-white"
                  : "bg-[#1e3a8a] border-blue-800 text-white"
                : !message.isUser && message.assistantVariant === "educational"
                  ? isDarkMode
                    ? "bg-emerald-900/75 border-emerald-700/50 text-white"
                    : "bg-emerald-50 border-emerald-200 text-gray-900"
                  : !message.isUser && message.assistantVariant === "system"
                    ? isDarkMode
                      ? "bg-zinc-800 border-zinc-600 text-gray-100"
                      : "bg-gray-100 border-gray-300 text-gray-900"
                    : null;

            return (
              <div
                key={message.id}
                className={`flex min-w-0 flex-col ${message.isUser ? "items-end" : "items-start"} ${
                  isConsecutiveAgent ? "-mt-1" : ""
                }`}
              >
                {message.roleBadge && (
                  <span
                    className={`mb-0.5 block text-[10px] font-semibold tracking-wide opacity-80 ${
                      message.isUser ? "text-right pr-1" : "pl-1"
                    }`}
                    style={{ color: isDarkMode ? "#a1a1aa" : "#6b7280" }}
                  >
                    {message.roleBadge}
                  </span>
                )}
                <div
                  className={`${bubbleWidth} min-w-0 overflow-hidden break-words px-3 py-2 ${commonStyles?.rounded ?? "rounded-lg"} text-sm border ${
                    message.isUser
                      ? isDarkMode
                        ? "bg-emerald-500/85 text-white border-emerald-400/40"
                        : "bg-emerald-600 text-white border-emerald-500"
                      : assistantBubble ??
                        (isDarkMode
                          ? "bg-white/10 border-white/20"
                          : "bg-white border-gray-200")
                  } shadow-sm`}
                  style={
                    !message.isUser && !assistantBubble
                      ? { color: isDarkMode ? "#FFFFFF" : "#141414" }
                      : undefined
                  }
                >
                {message.thoughtSummary != null && assistantEnabled && (
                  <div className="mb-2">
                    <button
                      type="button"
                      onClick={() =>
                        lectureAssistant.toggleThoughtExpanded(message.id)
                      }
                      className="text-xs font-medium underline-offset-2 hover:underline opacity-90"
                    >
                      {message.thoughtExpanded
                        ? "▼ 사고 요약 접기"
                        : "▶ 사고 요약 보기"}
                    </button>
                    {message.thoughtExpanded ? (
                      <pre
                        className={`mt-1 max-h-40 overflow-y-auto whitespace-pre-wrap rounded-md border px-2 py-1.5 text-xs leading-relaxed ${
                          message.assistantVariant === "orchestrator"
                            ? "border-white/25 bg-black/25"
                            : isDarkMode
                              ? "border-white/15 bg-black/20"
                              : "border-gray-200 bg-white/80"
                        }`}
                      >
                        {message.thoughtSummary || "…"}
                      </pre>
                    ) : null}
                  </div>
                )}
                {message.isLoading && (
                  <div className="flex items-center gap-3 py-2">
                    <div className="relative">
                      <div className={`animate-spin rounded-full h-4 w-4 border-2 border-t-transparent ${
                        isDarkMode ? 'border-gray-500' : 'border-gray-400'
                      }`}></div>
                      <div className={`absolute inset-0 animate-ping rounded-full h-4 w-4 border opacity-20 ${
                        isDarkMode ? 'border-gray-500' : 'border-emerald-500'
                      }`}></div>
                    </div>
                    {message.text && (
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-medium animate-pulse" style={{ color: isDarkMode ? "#FFFFFF" : "#141414" }}>{message.text}</span>
                        <div className="flex gap-1">
                          <div className={`h-1 w-1 rounded-full animate-bounce ${
                            isDarkMode ? 'bg-gray-500' : 'bg-gray-400'
                          }`} style={{ animationDelay: '0ms' }}></div>
                          <div className={`h-1 w-1 rounded-full animate-bounce ${
                            isDarkMode ? 'bg-gray-500' : 'bg-gray-400'
                          }`} style={{ animationDelay: '150ms' }}></div>
                          <div className={`h-1 w-1 rounded-full animate-bounce ${
                            isDarkMode ? 'bg-gray-500' : 'bg-gray-400'
                          }`} style={{ animationDelay: '300ms' }}></div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {message.file && message.isUser ? (
                  // 파일 업로드 메시지는 파일명과 아이콘만 표시
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📎</span>
                    <span>{message.file.name}</span>
                  </div>
                ) : message.markdown ? (
                  <div className="min-w-0 overflow-hidden break-words">
                    {message.text?.trim() ? (
                      <div className="mb-2 font-semibold break-words">
                        {message.text}
                      </div>
                    ) : null}
                    <div
                      className={`prose prose-sm prose-neutral max-w-none overflow-hidden break-words [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_code]:break-words prose-headings:font-semibold ${
                        message.assistantVariant === "educational"
                          ? isDarkMode
                            ? "prose-invert"
                            : ""
                          : isDarkMode
                            ? "prose-invert"
                            : ""
                      }`}
                    >
                      <MarkdownContent>{message.markdown}</MarkdownContent>
                    </div>
                  </div>
                ) : (
                  <span className="block min-w-0 overflow-hidden break-words">
                    {message.text}
                  </span>
                )}
                {message.actionButtons &&
                  message.actionButtons.length > 0 &&
                  !message.isLoading &&
                  assistantEnabled && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {message.actionButtons.map((btn) => (
                        <button
                          key={btn.id}
                          type="button"
                          onClick={() => lectureAssistant.handleAction(btn.id)}
                          className={`cursor-pointer rounded-xl px-4 py-2 text-sm font-medium transition-opacity ${
                            btn.variant === "primary"
                              ? "bg-sky-400 text-black hover:opacity-90"
                              : "bg-zinc-200 text-black hover:opacity-90 dark:bg-zinc-600 dark:text-white"
                          }`}
                        >
                          {btn.label}
                        </button>
                      ))}
                    </div>
                  )}
              </div>
            </div>
          );
          })
        )}
      </div>

      {/* 채팅 입력창 */}
      <div
        className="shrink-0 w-full px-3 py-2 h-[55px] flex items-center"
        style={{ backgroundColor: isDarkMode ? "#141414" : "#FFFFFF" }}
      >
        {/* 통합된 입력 컨테이너 */}
        <div
          className="flex items-center w-full rounded-lg border h-full min-h-[44px]"
          style={{
            backgroundColor: isDarkMode ? "#27272a" : "#FFFFFF",
            borderColor: isDarkMode ? "#52525b" : "#d1d5db",
          }}
        >
          {/* 텍스트 입력창 - 세로 중앙 정렬 */}
          <textarea
            ref={textareaRef}
            value={inputText}
            disabled={isAnswerSubmitting}
            onChange={(e) => {
              setInputText(e.target.value);
              // 높이 자동 조절
              if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
                textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
              }
            }}
            onKeyPress={handleKeyPress}
            placeholder={
              integratedModeActive
                ? integratedLearning.busy
                  ? "통합학습 응답 생성 중…"
                  : "질문 또는 요청을 입력하세요 (빈 입력: 시작)"
                : assistantEnabled
                ? lectureAssistant.busy
                  ? "답변 생성 중…"
                  : lectureAssistant.phase === "followup_after_no"
                    ? "추가 질문을 입력하세요"
                    : lectureAssistant.phase === "await_next_page" ||
                        lectureAssistant.phase === "await_explain_confirm"
                      ? "예/아니오 버튼을 사용하거나 질문을 입력하세요"
                      : "질문 또는 요청을 입력하세요 (빈 입력: 현재 페이지 설명)"
                : isAnswerSubmitting
                  ? "답변 처리 중..."
                  : isStreaming
                    ? (waitingForAnswer ? "AI 질문에 대한 답변을 입력하고 Enter" : "Enter로 다음 세그먼트 진행")
                    : "Enter를 눌러 학습을 시작하세요"
            }
            className={`flex-1 min-h-[44px] py-2.5 px-3 text-sm resize-none bg-transparent border-0 focus:outline-none overflow-y-auto leading-6 ${
              integratedModeActive ? "scrollbar-hide" : ""
            } ${isDarkMode ? "placeholder-gray-500" : "placeholder-gray-400"}`}
            style={{
              color: isDarkMode ? "#FFFFFF" : "#141414",
              maxHeight: "120px",
            }}
            rows={1}
          />

          {/* 중지 버튼 (스트리밍 또는 업로드 중일 때 표시) */}
          {(integratedModeActive
            ? integratedLearning.busy
            : assistantEnabled
            ? lectureAssistant.busy || isUploading
            : isStreaming || isUploading || isFetchingNext) && (
            <button
              onClick={handleCancelStream}
              type="button"
              className={`p-1.5 mr-1.5 flex items-center justify-center rounded-lg transition-all flex-shrink-0 cursor-pointer ${
                isDarkMode
                  ? "text-red-400 hover:text-red-300 hover:bg-zinc-700"
                  : "text-red-600 hover:text-red-700 hover:bg-zinc-200"
              }`}
              title="학습 중지"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
                stroke="none"
              >
                <rect x="6" y="6" width="12" height="12" rx="1" />
              </svg>
            </button>
          )}
        </div>
      </div>
      </div>
      )}
    </aside>
    </>
  );
};

export default RightSidebar;

// 내부 유틸: 다음 세그먼트 응답을 채팅 메시지로 변환
// 반환값: 다음 세그먼트를 자동으로 가져올지 여부 (true면 자동으로 다음 세그먼트 가져오기)
async function mapNextToMessages(
  res: StreamNextResponse,
  append: (msgs: ChatMessage[] | ((p: ChatMessage[]) => ChatMessage[])) => void,
  setWaiting: (v: boolean) => void,
  setQuestionId: (v: string | null) => void,
  setHasMore: (v: boolean) => void,
  loadingMessageId?: number
): Promise<boolean> {
  // 첫 번째 콘텐츠가 도착하면 로딩 메시지 제거
  if (loadingMessageId !== undefined) {
    append((prev) => prev.filter((m) => m.id !== loadingMessageId));
  }
  
  const type = (res.contentType || "").toUpperCase();
  const header =
    type === "QUESTION" ? "질문" : type === "SUPPLEMENTARY" ? "보충 설명" : "개념 설명";
  append((prev) => [
    ...prev,
    {
      id: Date.now(),
      text: `${res.chapterTitle ? `[${res.chapterTitle}] ` : ""}${header}`,
      isUser: false,
      markdown: res.contentData,
    },
  ]);
  setHasMore(res.hasMore);
  
  if (res.waitingForAnswer && res.aiQuestionId) {
    setWaiting(true);
    setQuestionId(res.aiQuestionId);
    append((prev) => [
      ...prev,
      {
        id: Date.now() + 1,
        text: "질문에 대한 답을 입력해 주세요.",
        isUser: false,
      },
    ]);
    // 질문이 나왔으므로 자동으로 다음 세그먼트를 가져올 필요 없음
    return false;
  } else {
    setWaiting(false);
    setQuestionId(null);
    // 개념 설명이나 보충 설명이 나왔고, 더 많은 콘텐츠가 있으면 자동으로 다음 세그먼트 가져오기
    return res.hasMore && type !== "QUESTION";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
