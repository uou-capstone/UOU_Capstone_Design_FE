import React, { useState, useRef, useCallback, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import {
  lectureApi,
  courseApi,
  getAuthToken,
  type LectureDetailResponseDto,
  type CourseDetail,
  type LectureResponseDto,
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
  onCourseCreated: (course: CourseDetail) => void;
  onLectureCreated: (lecture: LectureResponseDto) => void;
}

const RightSidebar: React.FC<RightSidebarProps> = ({
  onLectureDataChange,
  width = 360,
  lectureId,
  courseId,
  viewMode,
  courseDetail,
  onCourseCreated,
  onLectureCreated,
}) => {
  const { isDarkMode } = useTheme();
  const { isAuthenticated } = useAuth();
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isCreatingCourse, setIsCreatingCourse] = useState(false);
  const [isCreatingLecture, setIsCreatingLecture] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isFetchingNext, setIsFetchingNext] = useState(false);
  const [waitingForAnswer, setWaitingForAnswer] = useState(false);
  const [currentAiQuestionId, setCurrentAiQuestionId] = useState<string | null>(null);
  const [hasMoreStream, setHasMoreStream] = useState<boolean>(false);
  const [currentLectureId, setCurrentLectureId] = useState<number | null>(lectureId || null);
  const [currentCourseId, setCurrentCourseId] = useState<number | null>(courseId || null);
  const [uploadedFileDisplayUrl, setUploadedFileDisplayUrl] = useState<string>("");
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [hasUploadedMaterial, setHasUploadedMaterial] = useState<boolean>(false);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [courseModalTitle, setCourseModalTitle] = useState("");
  const [courseModalDescription, setCourseModalDescription] = useState("");
  const [isLectureModalOpen, setIsLectureModalOpen] = useState(false);
  const [lectureModalTitle, setLectureModalTitle] = useState("");
  const [lectureModalWeek, setLectureModalWeek] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dragCounterRef = useRef<number>(0);
  const previewObjectUrlRef = useRef<string | null>(null);
  const actionMenuContainerRef = useRef<HTMLDivElement>(null);

  const allowedFileTypes = ['.pdf', '.ppt', '.pptx', '.doc', '.docx'];
  
  // 사용할 courseId 결정 (prop 또는 입력값 또는 생성된 값)
  const targetCourseId = currentCourseId || courseId || null;

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

  // 레거시 generate-content 제거에 따라 상세 폴링/마크다운 조합 로직 삭제

  // Course 생성 함수
  const createCourse = async (
    overrides?: { title?: string; description?: string }
  ): Promise<number> => {
    const formTitle = overrides?.title ?? courseModalTitle;
    const formDescription = overrides?.description ?? courseModalDescription;

    if (!formTitle.trim()) {
      throw new Error('과목 제목을 입력해주세요.');
    }

    setIsCreatingCourse(true);
    
    const createMessage: ChatMessage = {
      id: Date.now(),
      text: '과목을 생성하는 중...',
      isUser: false,
      isLoading: true,
    };
    setMessages((prev) => [...prev, createMessage]);

    try {
      const course = await courseApi.createCourse({
        title: formTitle.trim(),
        description: formDescription.trim() || '',
      });
      
      setCurrentCourseId(course.courseId);
      
      // 성공 메시지 추가
      const successMessage: ChatMessage = {
        id: Date.now() + 1,
        text: `과목 생성 완료!\n제목: ${course.title}`,
        isUser: false,
        isLoading: false,
      };
      setMessages((prev) => 
        prev.map((msg) => 
          msg.id === createMessage.id 
            ? successMessage 
            : msg
        )
      );
      
      // 입력 필드 초기화
      setCourseModalTitle("");
      setCourseModalDescription("");
      setIsCourseModalOpen(false);

      // 자동으로 OT 강의 생성
      try {
        const otLecture = await lectureApi.createLecture(course.courseId, {
          title: "OT",
          weekNumber: 0,
          description: "오리엔테이션",
        });
        
        const otMessage: ChatMessage = {
          id: Date.now() + 2,
          text: `OT 강의가 자동으로 생성되었습니다. (0주차)`,
          isUser: false,
          isLoading: false,
        };
        setMessages((prev) => [...prev, otMessage]);
        
        // OT 강의 생성 후 과목 정보 전달 (강의 목록 포함)
        onCourseCreated({
          ...course,
          lectures: [otLecture],
        });
      } catch (otError) {
        // OT 생성 실패해도 과목은 생성되었으므로 계속 진행
        console.error("OT 강의 자동 생성 실패:", otError);
        onCourseCreated(course);
      }
      
      setCurrentLectureId(null);
      setHasUploadedMaterial(false);
      setUploadedFileDisplayUrl("");
      setUploadedFileName("");

      return course.courseId;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '알 수 없는 오류';
      const errorMessage: ChatMessage = {
        id: Date.now() + 1,
        text: `과목 생성 실패: ${errorMsg}`,
        isUser: false,
        isLoading: false,
      };
      setMessages((prev) => 
        prev.map((msg) => 
          msg.id === createMessage.id 
            ? errorMessage 
            : msg
        )
      );
      
      // CORS 에러인 경우 추가 안내
      if (errorMsg.includes('CORS')) {
        const corsMessage: ChatMessage = {
          id: Date.now() + 2,
          text: '💡 이 문제는 백엔드 설정 문제입니다. 백엔드 개발자에게 문의해주세요.',
          isUser: false,
          isLoading: false,
        };
        setMessages((prev) => [...prev, corsMessage]);
      }
      
      throw error;
    } finally {
      setIsCreatingCourse(false);
    }
  };

  const createLectureForCourse = async (
    courseIdForLecture: number,
    options: { title: string; weekNumber: number }
  ): Promise<LectureResponseDto> => {
    if (!options.title.trim()) {
      throw new Error("강의 제목을 입력해주세요.");
    }

    if (options.weekNumber === undefined || options.weekNumber === null || options.weekNumber < 0) {
      throw new Error("주차 번호를 입력해주세요. (0 이상)");
    }

    // 중복 주차 체크
    if (courseDetail?.lectures) {
      const existingWeek = courseDetail.lectures.find(
        (lecture) => lecture.weekNumber === options.weekNumber
      );
      if (existingWeek) {
        throw new Error(`${options.weekNumber}주차는 이미 존재합니다. 다른 주차를 선택해주세요.`);
      }
    }

    setIsCreatingLecture(true);

    const createMessage: ChatMessage = {
      id: Date.now(),
      text: "강의를 생성하는 중...",
      isUser: false,
      isLoading: true,
    };
    setMessages((prev) => [...prev, createMessage]);

    try {
      const lecture = await lectureApi.createLecture(courseIdForLecture, {
        title: options.title.trim(),
        weekNumber: options.weekNumber,
      });

      const successMessage: ChatMessage = {
        id: Date.now() + 1,
        text: `강의 생성 완료!\n강의 ID: ${lecture.lectureId}\n제목: ${lecture.title}\n주차: ${lecture.weekNumber}주차`,
        isUser: false,
        isLoading: false,
      };
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === createMessage.id ? successMessage : msg
        )
      );

      setCurrentLectureId(lecture.lectureId);
      onLectureCreated(lecture);

      return lecture;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "알 수 없는 오류";
      const errorMessage: ChatMessage = {
        id: Date.now() + 1,
        text: `강의 생성 실패: ${errorMsg}`,
        isUser: false,
        isLoading: false,
      };
      setMessages((prev) => [...prev, errorMessage]);

      if (errorMsg.includes("CORS")) {
        const corsMessage: ChatMessage = {
          id: Date.now() + 2,
          text: "💡 이 문제는 백엔드 설정 문제입니다. 백엔드 개발자에게 문의해주세요.",
          isUser: false,
          isLoading: false,
        };
        setMessages((prev) => [...prev, corsMessage]);
      }

      throw error;
    } finally {
      setIsCreatingLecture(false);
    }
  };

  const revokePreviewUrl = () => {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
    }
  };

  useEffect(() => {
    setCurrentCourseId(courseId ?? null);
  }, [courseId]);

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

    const targetCourseId = currentCourseId || courseId || null;
    if (!targetCourseId) {
      alert('과목을 먼저 생성해주세요. + 버튼에서 "과목 생성"을 선택할 수 있습니다.');
      return;
    }

    const targetLectureId = currentLectureId;
    if (!targetLectureId) {
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
      // Swagger 문서의 API 사용: /api/lectures/{lectureId}/materials
      const fileUrl = await lectureApi.uploadMaterial(targetLectureId!, file);

      setHasUploadedMaterial(true);

      if (typeof fileUrl === "string" && isValidHttpUrl(fileUrl)) {
        // 백엔드에서 실제 URL을 반환한 경우 해당 URL로 업데이트
        revokePreviewUrl();
        setUploadedFileDisplayUrl(fileUrl);
        onLectureDataChange("", fileUrl, file.name);
        // 로컬 스토리지에 저장
        saveUploadToStorage(currentLectureId, file.name, fileUrl);
      } else {
        // 백엔드가 메시지만 반환한 경우 프리뷰 URL 유지
        setUploadedFileDisplayUrl(previewUrl);
        onLectureDataChange("", previewUrl, file.name);
        // 로컬 스토리지에 저장
        saveUploadToStorage(currentLectureId, file.name, previewUrl);
      }

      // 업로드 완료 메시지 추가
      const successMessage: ChatMessage = {
        id: Date.now() + 1,
        text: "파일이 업로드되었습니다. Enter를 눌러 학습을 시작하세요.",
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

  const handleSelectCourseCreation = () => {
    setIsActionMenuOpen(false);
    setCourseModalTitle("");
    setCourseModalDescription("");
    setIsCourseModalOpen(true);
  };

  const closeCourseModal = () => {
    if (isCreatingCourse) return;
    setIsCourseModalOpen(false);
  };

  const handleSelectLectureCreation = () => {
    setIsActionMenuOpen(false);

    if (!targetCourseId) {
      alert('과목을 먼저 생성하거나 선택해주세요.');
      return;
    }

    setLectureModalTitle("");
    setLectureModalWeek("");
    setIsLectureModalOpen(true);
  };

  const closeLectureModal = () => {
    if (isCreatingLecture) return;
    setIsLectureModalOpen(false);
  };

  const handleLectureModalSubmit = async () => {
    if (!targetCourseId) {
      alert('과목을 먼저 선택해주세요.');
      setIsLectureModalOpen(false);
      return;
    }

    if (!lectureModalTitle.trim()) {
      alert("강의 제목을 입력해주세요.");
      return;
    }

    if (!lectureModalWeek || Number(lectureModalWeek) < 1) {
      alert("주차 번호를 입력해주세요.");
      return;
    }

    try {
      await createLectureForCourse(targetCourseId, {
        title: lectureModalTitle,
        weekNumber: Number(lectureModalWeek),
      });
      setLectureModalTitle("");
      setLectureModalWeek("");
      setIsLectureModalOpen(false);
    } catch (error) {
      // 에러 메시지는 createLectureForCourse에서 처리됨
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
  }, []);

  // generate-content 제거로 해당 핸들러 삭제

  // 스트리밍: 다음 세그먼트 가져오기
  const fetchNextSegment = async () => {
    if (!currentLectureId || isFetchingNext) return;
    setIsFetchingNext(true);
    try {
      const res = await streamingApi.next(currentLectureId);
      await mapNextToMessages(
        res,
        setMessages,
        setWaitingForAnswer,
        setCurrentAiQuestionId,
        setHasMoreStream
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "다음 세그먼트 수신 실패";
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), text: `오류: ${msg}`, isUser: false },
      ]);
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

  const handleCourseModalSubmit = async () => {
    if (!courseModalTitle.trim()) {
      alert("과목 제목을 입력해주세요.");
      return;
    }

    if (isCreatingCourse) {
      return;
    }

    try {
      await createCourse({
        title: courseModalTitle,
        description: courseModalDescription,
      });
    } catch (error) {
      // createCourse에서 이미 처리함
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

    // 질문 대기 시: 사용자의 답변 전송
    if (isStreaming && waitingForAnswer && currentAiQuestionId && currentLectureId) {
      if (!trimmed) return;
      const userText = inputText.trim();
      const userMsg: ChatMessage = {
        id: Date.now(),
        text: userText,
        isUser: true,
      };
      setMessages((prev) => [...prev, userMsg]);
      resetInputText();

      // 보조 설명 대기 메시지
      const pendingReply: ChatMessage = {
        id: Date.now() + 1,
        text: "답변 평가 및 보충 설명 생성 중...",
        isUser: false,
        isLoading: true,
      };
      setMessages((prev) => [...prev, pendingReply]);

      streamingApi
        .answer(currentLectureId, { aiQuestionId: currentAiQuestionId, answer: userText })
        .then((res) => {
          // 보충 설명 메시지
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
          // 이어서 다음 세그먼트가 있으면 자동 진행
          if (res.canContinue) {
            void fetchNextSegment();
          }
        })
        .catch((err) => {
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

    // 질문 대기가 아닐 때: Enter로 다음 세그먼트 진행
    if (isStreaming && !waitingForAnswer) {
      resetInputText(); // 입력창 비우기
      void fetchNextSegment();
      return;
    }

    // 파일이 업로드되었고 스트리밍이 시작되지 않았을 때: Enter로 스트리밍 시작
    if (!isStreaming && hasUploadedMaterial && currentLectureId) {
      resetInputText(); // 입력창 비우기
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), text: "스트리밍 세션 초기화 중...", isUser: false, isLoading: true },
      ]);
      streamingApi.initialize(currentLectureId)
        .then(() => {
          setIsStreaming(true);
          setMessages((prev) =>
            prev.map((m) =>
              m.isLoading ? { ...m, text: "스트리밍 세션 시작!", isLoading: false } : m
            )
          );
          return fetchNextSegment();
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
        isDarkMode ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100"
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
          isDarkMode ? "bg-gray-900/90" : "bg-white/90"
        }`}>
          <div className={`p-8 rounded-lg border-2 border-dashed ${
            isDarkMode ? "border-blue-500 bg-gray-800" : "border-blue-500 bg-blue-50"
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
        className={`flex-1 overflow-y-auto scrollbar-hide p-4 space-y-3 ${
          isDarkMode ? "bg-gray-900" : "bg-gray-50"
        }`}
      >
        {messages.length === 0 ? (
          <div className={`text-center text-sm mt-8 ${
            isDarkMode ? "text-gray-500" : "text-gray-400"
          }`}>
            메시지가 없습니다.
            <br />
            <span className="text-xs mt-2 block">
              파일을 드래그하거나 + 버튼을 클릭하세요
            </span>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isUser ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`${message.markdown ? "w-full" : "max-w-[80%]"} px-3 py-2 rounded-lg text-sm ${
                  message.isUser
                    ? isDarkMode
                      ? "bg-blue-600 text-white"
                      : "bg-blue-500 text-white"
                    : isDarkMode
                    ? "bg-gray-800 text-gray-200"
                    : "bg-gray-200 text-gray-900"
                }`}
              >
                {message.isLoading && (
                  <div className="flex items-center gap-2 mb-1">
                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
                    <span>처리 중...</span>
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
          ))
        )}
      </div>

      {/* 채팅 입력창 */}
      <div className={`p-3 border-t ${
        isDarkMode ? "border-gray-800 bg-gray-900" : "border-gray-200 bg-gray-50"
      }`}>
        {/* 통합된 입력 컨테이너 */}
        <div className={`flex items-center gap-2 rounded-lg border ${
          isDarkMode
            ? "bg-gray-800 border-gray-700"
            : "bg-gray-50 border-gray-300"
        } focus-within:ring-2 focus-within:ring-blue-500`}>
          {/* 파일 업로드 버튼 (+ 버튼) */}
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
            className="relative flex-shrink-0"
          >
            <button
              onClick={handleToggleActionMenu}
              type="button"
              className={`p-2.5 flex items-center justify-center rounded transition-all ${
                isDarkMode
                  ? "text-gray-400 hover:text-white hover:bg-gray-700"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              } ${isActionMenuOpen ? (isDarkMode ? "bg-gray-700 text-white" : "bg-gray-200 text-gray-800") : ""}`}
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
                    ? "bg-gray-800 border-gray-700 text-gray-200"
                    : "bg-white border-gray-200 text-gray-800"
                }`}
              >
                {viewMode === "course-detail" ? (
                  <>
                    <button
                      type="button"
                      onClick={handleSelectFileUpload}
                      disabled={isUploading}
                      className={`w-full px-4 py-2 text-sm flex items-center gap-2 transition-colors ${
                        isUploading
                          ? "cursor-not-allowed opacity-60"
                          : isDarkMode
                          ? "hover:bg-gray-700"
                          : "hover:bg-gray-100"
                      }`}
                    >
                      <span>📎</span>
                      <span>파일 업로드</span>
                    </button>
                    <div className={isDarkMode ? "h-px bg-gray-700" : "h-px bg-gray-200"} />
                    <button
                      type="button"
                      onClick={handleSelectLectureCreation}
                      className={`w-full px-4 py-2 text-sm flex items-center gap-2 transition-colors ${
                        isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
                      }`}
                    >
                      <span>🎓</span>
                      <span>강의 생성</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleSelectCourseCreation}
                    className={`w-full px-4 py-2 text-sm flex items-center gap-2 transition-colors ${
                      isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
                    }`}
                  >
                    <span>📘</span>
                    <span>과목 생성</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 텍스트 입력창 */}
          <textarea
            ref={textareaRef}
            value={inputText}
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
              isStreaming
                ? (waitingForAnswer ? "AI 질문에 대한 답변을 입력하고 Enter" : "Enter로 다음 세그먼트 진행")
                : hasUploadedMaterial
                  ? "Enter를 눌러 학습을 시작하세요"
                  : "파일을 업로드하고 Enter를 눌러 시작하세요"
            }
            className={`flex-1 py-2.5 text-sm resize-none bg-transparent border-0 focus:outline-none overflow-y-auto ${
              isDarkMode
                ? "text-white placeholder-gray-500"
                : "text-gray-900 placeholder-gray-400"
            }`}
            rows={1}
            style={{ minHeight: "40px", maxHeight: "120px" }}
          />
        </div>
      </div>
    </aside>
      {isCourseModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className={`w-full max-w-md rounded-xl shadow-xl border ${
              isDarkMode
                ? "bg-gray-900 border-gray-700 text-gray-100"
                : "bg-white border-gray-200 text-gray-900"
            }`}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700/50">
              <h2 className="text-sm font-semibold">과목 생성</h2>
              <button
                type="button"
                onClick={closeCourseModal}
                className={`p-1.5 rounded ${
                  isDarkMode
                    ? "hover:bg-gray-800 text-gray-400"
                    : "hover:bg-gray-100 text-gray-500"
                }`}
                aria-label="닫기"
              >
                ✕
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              <div>
                <label
                  className="block text-xs font-medium mb-1"
                >
                  과목 제목
                </label>
                <input
                  type="text"
                  value={courseModalTitle}
                  onChange={(e) => setCourseModalTitle(e.target.value)}
                  placeholder="과목 제목을 입력하세요"
                  className={`w-full px-3 py-2 text-sm rounded border ${
                    isDarkMode
                      ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                      : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">
                  과목 설명 (선택)
                </label>
                <textarea
                  value={courseModalDescription}
                  onChange={(e) => setCourseModalDescription(e.target.value)}
                  placeholder="과목 설명을 입력하세요"
                  rows={3}
                  className={`w-full px-3 py-2 text-sm rounded border resize-none ${
                    isDarkMode
                      ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                      : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
              </div>
            </div>

            <div className="px-5 py-4 border-t border-gray-700/50 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeCourseModal}
                className={`px-4 py-2 text-sm rounded ${
                  isDarkMode
                    ? "bg-gray-800 hover:bg-gray-700 text-gray-300"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                }`}
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleCourseModalSubmit}
                disabled={isCreatingCourse || !courseModalTitle.trim()}
                className={`px-4 py-2 text-sm rounded font-medium transition-colors ${
                  isCreatingCourse || !courseModalTitle.trim()
                    ? isDarkMode
                      ? "bg-blue-900/40 text-blue-300/60 cursor-not-allowed"
                      : "bg-blue-200 text-blue-500 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                {isCreatingCourse ? "생성 중..." : "생성하기"}
              </button>
            </div>
          </div>
        </div>
      )}
      {isLectureModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className={`w-full max-w-md rounded-xl shadow-xl border ${
              isDarkMode
                ? "bg-gray-900 border-gray-700 text-gray-100"
                : "bg-white border-gray-200 text-gray-900"
            }`}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700/50">
              <h2 className="text-sm font-semibold">강의 생성</h2>
              <button
                type="button"
                onClick={closeLectureModal}
                className={`p-1.5 rounded ${
                  isDarkMode
                    ? "hover:bg-gray-800 text-gray-400"
                    : "hover:bg-gray-100 text-gray-500"
                }`}
                aria-label="닫기"
              >
                ✕
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1">강의 제목</label>
                <input
                  type="text"
                  value={lectureModalTitle}
                  onChange={(e) => setLectureModalTitle(e.target.value)}
                  placeholder="강의 제목을 입력하세요"
                  className={`w-full px-3 py-2 text-sm rounded border ${
                    isDarkMode
                      ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                      : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">주차 번호</label>
                <input
                  type="number"
                  min={1}
                  value={lectureModalWeek}
                  onChange={(e) => setLectureModalWeek(e.target.value)}
                  placeholder="주차 번호를 입력하세요"
                  className={`w-full px-3 py-2 text-sm rounded border ${
                    isDarkMode
                      ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                      : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
              </div>
            </div>

            <div className="px-5 py-4 border-t border-gray-700/50 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeLectureModal}
                className={`px-4 py-2 text-sm rounded ${
                  isDarkMode
                    ? "bg-gray-800 hover:bg-gray-700 text-gray-300"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                }`}
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleLectureModalSubmit}
                disabled={isCreatingLecture || !lectureModalTitle.trim() || !lectureModalWeek}
                className={`px-4 py-2 text-sm rounded font-medium transition-colors ${
                  isCreatingLecture || !lectureModalTitle.trim() || !lectureModalWeek
                    ? isDarkMode
                      ? "bg-blue-900/40 text-blue-300/60 cursor-not-allowed"
                      : "bg-blue-200 text-blue-500 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                {isCreatingLecture ? "생성 중..." : "생성하기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RightSidebar;

// 내부 유틸: 다음 세그먼트 응답을 채팅 메시지로 변환
async function mapNextToMessages(
  res: StreamNextResponse,
  append: (msgs: ChatMessage[] | ((p: ChatMessage[]) => ChatMessage[])) => void,
  setWaiting: (v: boolean) => void,
  setQuestionId: (v: string | null) => void,
  setHasMore: (v: boolean) => void
) {
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
  } else {
    setWaiting(false);
    setQuestionId(null);
  }
}
