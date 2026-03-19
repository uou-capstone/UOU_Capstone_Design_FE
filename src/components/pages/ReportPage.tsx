import React, { useState, useRef, useCallback } from "react";
import { useTheme } from "../../contexts/ThemeContext";

const ReportPage: React.FC = () => {
  const { isDarkMode } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [content, setContent] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [category, setCategory] = useState<"error" | "suggestion" | "other">("error");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addImage = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      setImages((prev) => [...prev, dataUrl]);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(addImage);
      e.target.value = "";
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          addImage(file);
          break;
        }
      }
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      window.alert("내용을 입력해주세요.");
      return;
    }
    setIsSubmitting(true);
    try {
      // TODO: 백엔드 API 연동
      console.log({ category, content, images });
      window.alert("신고가 접수되었습니다. 소중한 의견 감사합니다.");
      setContent("");
      setImages([]);
      setCategory("error");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "전송에 실패했습니다.";
      window.alert(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputBaseClass = isDarkMode
    ? "bg-zinc-800 text-white placeholder-gray-500 border-zinc-600"
    : "bg-gray-100 text-gray-900 placeholder-gray-500 border-gray-200";
  const labelClass = isDarkMode ? "text-gray-200" : "text-gray-700";

  return (
    <div className="h-full flex flex-col lg:flex-row lg:items-start lg:justify-center">
      <div className="flex-1 min-w-0 max-w-2xl w-full">
        <h1
          className={`text-2xl font-semibold mb-2 ${
            isDarkMode ? "text-white" : "text-gray-900"
          }`}
        >
          오류 신고 및 건의
        </h1>
        <p
          className={`text-sm mb-6 ${
            isDarkMode ? "text-gray-400" : "text-gray-500"
          }`}
        >
          사용 중 발생한 오류나 개선 사항을 알려주세요. 스크린샷을 첨부하면 더 빠르게 도움을 드릴 수 있습니다.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className={`block text-sm font-medium mb-2 ${labelClass}`}>
              유형
            </label>
            <select
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as "error" | "suggestion" | "other")
              }
              className={`w-full px-4 py-2.5 rounded-full text-sm border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${inputBaseClass}`}
            >
              <option value="error">오류 신고</option>
              <option value="suggestion">건의 사항</option>
              <option value="other">기타</option>
            </select>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${labelClass}`}>
              내용 *
            </label>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onPaste={handlePaste}
              placeholder="발생한 오류나 건의 사항을 자세히 적어주세요."
              rows={6}
              className={`w-full px-4 py-3 rounded-2xl text-sm border focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-y min-h-[120px] ${inputBaseClass}`}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${labelClass}`}>
              이미지 첨부 (선택)
            </label>
            <p
              className={`text-xs mb-2 ${
                isDarkMode ? "text-gray-500" : "text-gray-400"
              }`}
            >
              스크린샷을 붙여넣기(Ctrl+V)하거나 파일을 선택할 수 있습니다.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed transition-colors cursor-pointer ${
                  isDarkMode
                    ? "border-zinc-600 hover:border-zinc-500 text-gray-400 hover:text-gray-300"
                    : "border-gray-300 hover:border-gray-400 text-gray-500 hover:text-gray-600"
                }`}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 15v4a2 2 0 01-2 2h-14a2 2 0 01-2-2v-4"
                  />
                </svg>
                <span className="text-sm font-medium">이미지 추가</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
              {images.map((src, i) => (
                <div
                  key={i}
                  className="relative group rounded-xl overflow-hidden border border-zinc-600"
                >
                  <img
                    src={src}
                    alt={`첨부 ${i + 1}`}
                    className="w-20 h-20 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                    aria-label="삭제"
                  >
                    <span className="text-white text-xl font-bold">×</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !content.trim()}
              className={`px-6 py-2.5 rounded-full text-sm font-semibold cursor-pointer transition-colors ${
                isSubmitting || !content.trim()
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }`}
            >
              {isSubmitting ? "전송 중..." : "제출하기"}
            </button>
          </div>
        </form>
      </div>
      <aside className="hidden lg:block w-[350px] min-w-0 shrink pl-8" />
    </div>
  );
};

export default ReportPage;
