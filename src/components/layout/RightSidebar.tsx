import React, { useState, useRef, useCallback } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { lectureMaterialApi, LectureMaterialResponse } from "../../services/api";

interface ChatMessage {
  id: number;
  text: string;
  isUser: boolean;
  file?: File;
  isLoading?: boolean;
}

interface RightSidebarProps {
  lectureMarkdown: string;
  onLectureDataChange: (markdown: string, fileUrl: string, fileName: string) => void;
}

const RightSidebar: React.FC<RightSidebarProps> = ({ lectureMarkdown, onLectureDataChange }) => {
  const { isDarkMode } = useTheme();
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef<number>(0);

  const allowedFileTypes = ['.pdf', '.ppt', '.pptx', '.doc', '.docx'];

  const handleFileUpload = async (file: File) => {
    // 파일 타입 검증
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedFileTypes.includes(fileExtension)) {
      alert(`지원하지 않는 파일 형식입니다.\n지원 형식: ${allowedFileTypes.join(', ')}`);
      return;
    }

    setIsUploading(true);

    // 파일 업로드 메시지 추가
    const uploadMessage: ChatMessage = {
      id: Date.now(),
      text: `파일 업로드 중: ${file.name}`,
      isUser: true,
      file: file,
      isLoading: true,
    };
    setMessages((prev) => [...prev, uploadMessage]);

    try {
      const response: LectureMaterialResponse = await lectureMaterialApi.uploadAndGenerate(file);

      // 성공 메시지 추가
      const successMessage: ChatMessage = {
        id: Date.now() + 1,
        text: `강의 자료가 생성되었습니다: ${response.fileName}`,
        isUser: false,
        isLoading: false,
      };
      setMessages((prev) => [...prev, successMessage]);

      // 강의 설명과 파일 정보 업데이트
      onLectureDataChange(response.markdown, response.fileUrl, response.fileName);

      // 업로드 메시지 업데이트
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === uploadMessage.id
            ? { ...msg, text: `파일 업로드 완료: ${file.name}`, isLoading: false }
            : msg
        )
      );
    } catch (error) {
      console.error('파일 업로드 실패:', error);
      const errorMessage: ChatMessage = {
        id: Date.now() + 1,
        text: `파일 업로드 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
        isUser: false,
        isLoading: false,
      };
      setMessages((prev) => [...prev, errorMessage]);

      // 업로드 메시지 제거
      setMessages((prev) => prev.filter((msg) => msg.id !== uploadMessage.id));
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

  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    const newMessage: ChatMessage = {
      id: Date.now(),
      text: inputText.trim(),
      isUser: true,
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputText("");

    // 스크롤을 하단으로 이동
    setTimeout(() => {
      const chatContainer = document.getElementById("chat-messages");
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }, 0);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <aside
      className={`w-80 flex flex-col border-l transition-colors relative ${
        isDarkMode ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100"
      }`}
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
                className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
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
                {message.file && (
                  <div className="mb-1 text-xs opacity-80">
                    📎 {message.file.name}
                  </div>
                )}
                {message.text}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 채팅 입력창 */}
      <div className={`p-4 border-t ${
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
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className={`flex-shrink-0 p-2.5 flex items-center justify-center rounded transition-all ${
              isUploading
                ? isDarkMode
                  ? "text-gray-600 cursor-not-allowed"
                  : "text-gray-400 cursor-not-allowed"
                : isDarkMode
                ? "text-gray-400 hover:text-white hover:bg-gray-700 cursor-pointer"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
            }`}
            title="파일 업로드"
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

          {/* 텍스트 입력창 */}
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="무엇이든 물어보세요"
            className={`flex-1 py-2.5 text-sm resize-none bg-transparent border-0 focus:outline-none ${
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
  );
};

export default RightSidebar;
