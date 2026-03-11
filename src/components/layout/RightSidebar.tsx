import React, { useState, useRef, useCallback, useEffect } from "react";
import { useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import {
  lectureApi,
  getAuthToken,
  type CourseDetail,
  streamingApi,
  type StreamNextResponse,
} from "../../services/api";

interface ChatMessage {
  id: number;
  text: string;
  isUser: boolean;
  file?: File;
  isLoading?: boolean;
  markdown?: string;
}

type ViewMode = "course-list" | "course-detail";

interface RightSidebarProps {
  onLectureDataChange: (markdown: string, fileUrl: string, fileName: string) => void;
  width?: number;
  lectureId?: number;
  courseId?: number;
  viewMode: ViewMode;
  courseDetail?: CourseDetail | null;
}

const RightSidebar: React.FC<RightSidebarProps> = ({
  onLectureDataChange,
  width = 360,
  lectureId,
  courseId,
  viewMode,
  courseDetail,
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
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
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

  // 로컬 스토리지 키 생성
  const getUploadStorageKey = (lectureId: number) => `lecture_upload_${lectureId}`;

  // 업로드 정보 저장
  const saveUploadToStorage = (lectureId: number, fileName: string, fileUrl: string) => {
    try {
      localStorage.setItem(
        getUploadStorageKey(lectureId),
        JSON.stringify({ fileName, fileUrl, timestamp: Date.now() })
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
          return { fileName: data.fileName, fileUrl: data.fileUrl };
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
    
    // 강의 변경 시 저장된 업로드 정보 불러오기
    if (lectureId) {
      const stored = loadUploadFromStorage(lectureId);
      if (stored) {
        setUploadedFileName(stored.fileName);
        setUploadedFileDisplayUrl(stored.fileUrl);
        setHasUploadedMaterial(true);
        onLectureDataChange("", stored.fileUrl, stored.fileName);
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
  }, [messages]);

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
    onLectureDataChange("", previewUrl, file.name);

    setIsUploading(true);

    // 파일 업로드 메시지 추가 (이미지처럼 간단하게)
    const uploadMessage: ChatMessage = {
      id: Date.now(),
      text: file.name,
      isUser: true,
      file: file,
      isLoading: false,
    };
    setMessages((prev) => [...prev, uploadMessage]);

    try {
      const result = await lectureApi.uploadMaterial(targetLectureId!, file);
      const { fileUrl, displayName } = result;
      const displayFileName = displayName ?? file.name;

      setHasUploadedMaterial(true);

      if (typeof fileUrl === "string" && fileUrl.length > 0 && isValidHttpUrl(fileUrl)) {
        revokePreviewUrl();
        setUploadedFileDisplayUrl(fileUrl);
        onLectureDataChange("", fileUrl, displayFileName);
        saveUploadToStorage(targetLectureId, displayFileName, fileUrl);
      } else {
        setUploadedFileDisplayUrl(previewUrl);
        onLectureDataChange("", previewUrl, displayFileName);
        saveUploadToStorage(targetLectureId, displayFileName, previewUrl);
      }

      // 업로드 완료 메시지 추가
      const successMessage: ChatMessage = {
        id: Date.now() + 1,
        text:
          "파일이 업로드되었습니다.\n\n- 강의 콘텐츠 생성: `/generate`\n- 스트리밍 학습 시작: Enter (빈 입력)\n- 현재 세션 상태 조회: `/status`\n- 스트리밍 중단: `/cancel`",
        isUser: false,
        isLoading: false,
      };
      setMessages((prev) => [...prev, successMessage]);
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
      setMessages((prev) => [...prev, errorMessage]);

      // 업로드 메시지 제거
      setMessages((prev) => prev.filter((msg) => msg.id !== uploadMessage.id));

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
          return await streamingApi.next(currentLectureId);
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
      textareaRef.current.style.height = '40px';
    }
  };

  const handleSendMessage = () => {
    const trimmed = inputText.trim();

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

      streamingApi
        .answer(currentLectureId, { aiQuestionId: currentAiQuestionId, answer: userText })
        .then((res) => {
          const status = (res.status || "").toUpperCase();
          if (status === "ALREADY_ANSWERED") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === pendingReply.id
                  ? { ...m, text: "이미 답변이 처리되었습니다.", isLoading: false }
                  : m
              )
            );
            setWaitingForAnswer(false);
            setCurrentAiQuestionId(null);
            if (res.canContinue) void fetchNextSegment();
            return;
          }
          const supplementary = res.supplementary?.trim() || "보충 설명이 제공되지 않았습니다.";
          setMessages((prev) =>
            prev.map((m) =>
              m.id === pendingReply.id
                ? {
                    ...m,
                    text: "보충 설명",
                    markdown: supplementary,
                    isLoading: false,
                  }
                : m
            )
          );
          setWaitingForAnswer(false);
          setCurrentAiQuestionId(null);
          if (res.canContinue) void fetchNextSegment();
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

    // 파일이 업로드되었고 스트리밍이 시작되지 않았을 때:
    // - /generate: generate-content 실행 후 ai-status 완료까지 폴링
    // - Enter(빈 입력): 스트리밍 시작
    if (!isStreaming && hasUploadedMaterial && currentLectureId) {
      if (trimmed === "/generate" || trimmed === "강의 생성") {
        if (isGeneratingContent) {
          resetInputText();
          setMessages((prev) => [...prev, { id: Date.now(), text: "이미 강의 콘텐츠 생성을 진행 중입니다.", isUser: false }]);
          return;
        }
        resetInputText();
        setIsGeneratingContent(true);
        const loadingId = Date.now();
        setMessages((prev) => [...prev, { id: loadingId, text: "", isUser: false, isLoading: true }]);
        lectureApi.generateContent(currentLectureId)
          .then(async () => {
            // ai-status 폴링
            const pollMs = 2500;
            const maxAttempts = 720; // 30분
            for (let i = 0; i < maxAttempts; i++) {
              const st = await lectureApi.getAiStatus(currentLectureId);
              const s = (st.status || "").toUpperCase();
              if (s === "COMPLETED" || s === "DONE" || s === "SUCCESS") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === loadingId
                      ? { ...m, text: "강의 콘텐츠 생성 완료", isLoading: false }
                      : m
                  )
                );
                setMessages((prev) => [...prev, { id: Date.now() + 1, text: "Enter를 눌러 스트리밍 학습을 시작하세요.", isUser: false }]);
                return;
              }
              if (s === "FAILED" || s === "ERROR") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === loadingId
                      ? { ...m, text: `생성 실패: ${st.message || "알 수 없는 오류"}`, isLoading: false }
                      : m
                  )
                );
                return;
              }
              await sleep(pollMs);
            }
            setMessages((prev) =>
              prev.map((m) =>
                m.id === loadingId ? { ...m, text: "생성 시간이 초과되었습니다. `/status`로 상태를 확인하세요.", isLoading: false } : m
              )
            );
          })
          .catch((e) => {
            const msg = e instanceof Error ? e.message : "강의 콘텐츠 생성 시작 실패";
            setMessages((prev) => prev.map((m) => (m.id === loadingId ? { ...m, text: `오류: ${msg}`, isLoading: false } : m)));
          })
          .finally(() => setIsGeneratingContent(false));
        return;
      }

      resetInputText(); // 입력창 비우기
      const initMessageId = Date.now();
      setMessages((prev) => [
        ...prev,
        { id: initMessageId, text: "", isUser: false, isLoading: true },
      ]);
      streamingApi.initialize(currentLectureId)
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

  return (
    <>
      <aside
      className={`flex flex-col border-l transition-colors relative flex-shrink-0 ${
        isDarkMode ? "bg-zinc-800 border-zinc-800" : "bg-white border-gray-200"
      }`}
      style={{ width: `${width}px` }}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* 드래그 앤 드롭 영역 */}
      {isDragging && (
        <div className={`absolute inset-0 z-50 flex items-center justify-center ${
          isDarkMode ? "bg-zinc-800/90" : "bg-white/90"
        }`}>
          <div className={`p-8 rounded-lg border-2 border-dashed ${
            isDarkMode ? "border-gray-600 bg-gray-800" : "border-emerald-500 bg-emerald-50"
          }`}>
            <p className={`text-lg font-medium ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}>
              파일을 여기에 놓으세요
            </p>
          </div>
        </div>
      )}

      {/* 채팅 메시지 영역 */}
      <div
        id="chat-messages"
        className={`flex-1 overflow-y-auto p-1.5 space-y-2 ${
          isDarkMode ? "bg-zinc-800" : "bg-white"
        }`}
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: isDarkMode ? '#4a5568 #1a1a1a' : '#cbd5e0 #ffffff',
        }}
      >
        {messages.length === 0 ? (
          <div
            className={`flex h-full flex-col items-center justify-center text-center text-sm space-y-2 ${
              isDarkMode ? "text-gray-400" : "text-gray-400"
            }`}
          >
            <p className="font-medium">메시지가 없습니다.</p>
            <span className="text-xs">
              파일을 드래그 앤 드롭하세요
            </span>
          </div>
        ) : (
          messages.map((message, index) => {
            const isConsecutiveAgent =
              !message.isUser && index > 0 && !messages[index - 1].isUser;
            const bubbleWidth = message.markdown ? "max-w-[90%]" : "max-w-[80%]";

            return (
              <div
                key={message.id}
                className={`flex ${message.isUser ? "justify-end" : "justify-start"} ${
                  isConsecutiveAgent ? "-mt-1" : ""
                }`}
              >
                <div
                  className={`${bubbleWidth} px-3 py-2 ${commonStyles?.rounded ?? "rounded-lg"} text-sm border ${
                    message.isUser
                      ? isDarkMode
                        ? "bg-emerald-500/85 text-white border-emerald-400/40"
                        : "bg-emerald-600 text-white border-emerald-500"
                      : isDarkMode
                      ? "bg-white/10 text-gray-100 border-white/20"
                      : "bg-white text-gray-800 border-gray-200"
                  } shadow-sm`}
                >
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
                        <span className={`text-xs font-medium animate-pulse ${
                          isDarkMode ? 'text-gray-200' : 'text-gray-700'
                        }`}>{message.text}</span>
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
                  <div>
                    <div className="mb-2 font-semibold">{message.text}</div>
                    <div
                      className={`prose prose-sm max-w-none ${
                        isDarkMode ? "prose-invert" : ""
                      }`}
                    >
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.markdown}
                      </ReactMarkdown>
                    </div>
                  </div>
                ) : (
                  message.text
                )}
              </div>
            </div>
          );
          })
        )}
      </div>

      {/* 채팅 입력창 */}
      <div className={`${
        isDarkMode ? "bg-zinc-800" : "bg-white"
      }`}
      style={{ padding: '6px 6px', height: '55px' }}>
        {/* 통합된 입력 컨테이너 */}
        <div className={`flex items-center rounded-lg border h-full ${
          isDarkMode
            ? "bg-zinc-800 border-zinc-700"
            : "bg-white border-gray-300"
        }`}>
          {/* 파일 업로드 버튼 (+ 버튼) - 강의 상세 페이지에서만 표시 */}
          {viewMode === "course-detail" && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept={allowedFileTypes.join(',')}
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
                disabled={isUploading}
              />
              <div
                ref={actionMenuContainerRef}
                className="relative flex-shrink-0 ml-1.5"
              >
                <button
                  onClick={handleToggleActionMenu}
                  type="button"
                  className={`p-1.5 flex items-center justify-center rounded-lg transition-all cursor-pointer ${
                    isDarkMode
                      ? "text-gray-400 hover:text-gray-300 hover:bg-zinc-700"
                      : "text-gray-500 hover:text-zinc-700 hover:bg-zinc-200"
                  } ${isActionMenuOpen ? (isDarkMode ? "bg-zinc-800 text-white" : "bg-gray-200 text-gray-800") : ""}`}
                  title="작업 선택"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                </button>

                {isActionMenuOpen && (
                  <div
                    className={`absolute bottom-full left-0 mb-2 w-48 rounded-xl shadow-lg overflow-hidden border ${
                      isDarkMode
                        ? "bg-zinc-900 border-zinc-800 text-gray-200"
                        : "bg-white border-gray-200 text-gray-800"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={handleSelectFileUpload}
                      disabled={isUploading}
                      className={`w-full px-4 py-2 text-sm flex items-center gap-2 transition-colors ${
                        isUploading
                          ? "cursor-not-allowed opacity-60"
                          : `cursor-pointer ${isDarkMode ? "hover:bg-zinc-700" : "hover:bg-zinc-200"}`
                      }`}
                    >
                      <span>📎</span>
                      <span>파일 업로드</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* 텍스트 입력창 */}
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
              isAnswerSubmitting
                ? "답변 처리 중..."
                : isStreaming
                  ? (waitingForAnswer ? "AI 질문에 대한 답변을 입력하고 Enter" : "Enter로 다음 세그먼트 진행")
                  : hasUploadedMaterial
                    ? "Enter를 눌러 학습을 시작하세요"
                    : "파일을 드래그 앤 드롭하고 Enter를 눌러 시작하세요"
            }
            className={`flex-1 p-1.5 text-sm resize-none bg-transparent border-0 focus:outline-none overflow-y-auto ${
              isDarkMode
                ? "text-white placeholder-gray-500"
                : "text-gray-900 placeholder-gray-400"
            }`}
            rows={1}
            style={{ maxHeight: "120px" }}
          />

          {/* 중지 버튼 (스트리밍 또는 업로드 중일 때 표시) */}
          {(isStreaming || isUploading || isFetchingNext) && (
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
