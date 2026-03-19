import React, { useState, useCallback, useRef, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { useTheme } from "../../contexts/ThemeContext";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// pdfjs worker 설정 (Vite 환경)
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 1.5;
const ZOOM_STEP = 0.1;
const MAX_PAGE_WIDTH = 1200;

interface PdfViewerProps {
  fileUrl: string;
  title?: string;
  className?: string;
  /** 현재 보고 있는 페이지 변경 시 호출 (1-based 페이지 번호) */
  onPageChange?: (pageNumber: number) => void;
}

const PdfViewer: React.FC<PdfViewerProps> = ({
  fileUrl,
  title,
  className = "",
  onPageChange,
}) => {
  const { isDarkMode } = useTheme();
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState("");
  const [zoom, setZoom] = useState(1);
  const [zoomInputOpen, setZoomInputOpen] = useState(false);
  const [zoomInputValue, setZoomInputValue] = useState("");
  const zoomInputRef = useRef<HTMLInputElement>(null);
  const [baseWidth, setBaseWidth] = useState(800);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const pageWidth = Math.min(
    Math.round(baseWidth * zoom),
    MAX_PAGE_WIDTH,
    Math.max(0, baseWidth - 24)
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateWidth = () => {
      const w = el.clientWidth || 800;
      setBaseWidth(Math.min(Math.max(400, w - 96), MAX_PAGE_WIDTH));
    };
    updateWidth();
    const ro = new ResizeObserver(updateWidth);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const onDocumentLoadSuccess = useCallback(
    ({ numPages: n }: { numPages: number }) => {
      setNumPages(n);
      setCurrentPage(1);
      setPageInput("1");
      onPageChange?.(1);
    },
    [onPageChange]
  );

  const scrollToPage = useCallback(
    (page: number) => {
      if (!numPages || page < 1 || page > numPages) return;
      const el = scrollRef.current?.querySelector(`[data-page="${page}"]`) as HTMLElement | null;
      el?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      setCurrentPage(page);
      setPageInput(String(page));
      onPageChange?.(page);
    },
    [numPages, onPageChange]
  );

  // 방향키(←/→)로 페이지 이동
  useEffect(() => {
    if (!numPages) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        scrollToPage(currentPage - 1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        scrollToPage(currentPage + 1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [numPages, currentPage, scrollToPage]);

  // IntersectionObserver로 현재 보이는 페이지 감지 (가로 스크롤 기준)
  useEffect(() => {
    if (!numPages || !onPageChange) return;
    const root = scrollRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible: { page: number; ratio: number }[] = [];
        entries.forEach((entry) => {
          const page = Number(entry.target.getAttribute("data-page"));
          if (!Number.isNaN(page) && entry.intersectionRatio > 0) {
            visible.push({ page, ratio: entry.intersectionRatio });
          }
        });
        if (visible.length > 0) {
          const best = visible.reduce((a, b) =>
            a.ratio >= b.ratio ? a : b
          );
          setCurrentPage(best.page);
          setPageInput(String(best.page));
          onPageChange(best.page);
        }
      },
      {
        root,
        rootMargin: "0px -20% 0px -20%",
        threshold: [0, 0.25, 0.5, 0.75, 1],
      }
    );

    const elements = root.querySelectorAll("[data-page]");
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [numPages, onPageChange]);

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseInt(pageInput, 10);
    if (Number.isFinite(n)) scrollToPage(n);
  };

  const handleOpenInNewTab = () => {
    window.open(fileUrl, "_blank", "noopener");
  };

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = fileUrl;
    a.download = title || "document.pdf";
    a.click();
  };

  const handleZoomIn = () => {
    setZoom((z) => Math.min(z + ZOOM_STEP, MAX_ZOOM));
  };

  const handleZoomOut = () => {
    setZoom((z) => Math.max(z - ZOOM_STEP, MIN_ZOOM));
  };

  const openZoomInput = () => {
    setZoomInputValue(String(Math.round(zoom * 100)));
    setZoomInputOpen(true);
    setTimeout(() => zoomInputRef.current?.focus(), 0);
  };

  const applyZoomInput = () => {
    const n = parseInt(zoomInputValue.replace(/%/g, ""), 10);
    if (Number.isFinite(n) && n >= MIN_ZOOM * 100 && n <= MAX_ZOOM * 100) {
      setZoom(n / 100);
    }
    setZoomInputOpen(false);
  };

  const handleZoomInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      applyZoomInput();
    }
    if (e.key === "Escape") {
      setZoomInputOpen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden ${className}`}
      aria-label={title || "PDF 미리보기"}
    >
      {/* 상단 툴바 - 라이트: bg #FFFFFF / 메뉴 #141414, 다크: bg #141414 / 메뉴 #FFFFFF (ThemeContext 기준) */}
      {numPages != null && (
        <div
          className="shrink-0 flex items-center justify-center gap-2 px-3 py-2 border-b"
          style={{
            backgroundColor: isDarkMode ? "#141414" : "#FFFFFF",
            color: isDarkMode ? "#FFFFFF" : "#141414",
            borderColor: isDarkMode ? "#404040" : "#e5e7eb",
          }}
        >
          <button
            type="button"
            onClick={() => scrollToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className="p-1.5 rounded hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:opacity-40 transition-opacity"
            aria-label="이전 페이지"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <form onSubmit={handlePageInputSubmit} className="flex items-center gap-1">
            <input
              type="text"
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onBlur={() => setPageInput(String(currentPage))}
              className="w-12 px-2 py-1 text-center text-sm rounded border focus:outline-none focus:ring-2 focus:ring-emerald-500"
              style={{
                backgroundColor: isDarkMode ? "#27272a" : "#ffffff",
                color: isDarkMode ? "#FFFFFF" : "#141414",
                borderColor: isDarkMode ? "#52525b" : "#d1d5db",
              }}
              aria-label="페이지 번호"
            />
            <span className="text-sm opacity-80">/ {numPages}</span>
          </form>
          <button
            type="button"
            onClick={() => scrollToPage(currentPage + 1)}
            disabled={currentPage >= numPages}
            className="p-1.5 rounded hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:opacity-40 transition-opacity"
            aria-label="다음 페이지"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <div
            className="w-px h-5"
            style={{ backgroundColor: isDarkMode ? "#52525b" : "#d1d5db" }}
          />
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoom <= MIN_ZOOM}
              className="p-1.5 rounded hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
              title="축소"
              aria-label="축소"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
              </svg>
            </button>
            {zoomInputOpen ? (
              <input
                ref={zoomInputRef}
                type="text"
                value={zoomInputValue}
                onChange={(e) => setZoomInputValue(e.target.value)}
                onBlur={applyZoomInput}
                onKeyDown={handleZoomInputKeyDown}
                className="w-14 px-1 py-0.5 text-center text-sm rounded border focus:outline-none focus:ring-2 focus:ring-emerald-500"
                style={{
                  backgroundColor: isDarkMode ? "#27272a" : "#ffffff",
                  color: isDarkMode ? "#FFFFFF" : "#141414",
                  borderColor: "#FFFFFF",
                }}
                aria-label="배율 입력"
              />
            ) : (
              <button
                type="button"
                onClick={openZoomInput}
                className="min-w-[3rem] px-2 py-0.5 text-center text-sm rounded border hover:opacity-80 transition-opacity cursor-pointer"
                style={{ borderColor: "#FFFFFF" }}
                title="클릭하여 배율 직접 입력"
              >
                {Math.round(zoom * 100)}%
              </button>
            )}
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoom >= MAX_ZOOM}
              className="p-1.5 rounded hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
              title="확대"
              aria-label="확대"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
              </svg>
            </button>
          </div>
          <div
            className="w-px h-5"
            style={{ backgroundColor: isDarkMode ? "#52525b" : "#d1d5db" }}
          />
          <button
            type="button"
            onClick={handleOpenInNewTab}
            className="p-1.5 rounded hover:opacity-80 transition-opacity"
            title="새 탭에서 열기 (인쇄 등)"
            aria-label="새 탭에서 열기"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="p-1.5 rounded hover:opacity-80 transition-opacity"
            title="다운로드"
            aria-label="다운로드"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
        </div>
      )}

      {/* PDF 스크롤 영역 - 가로 스크롤, pageWidth는 MAX_PAGE_WIDTH(1200px)로 제한 */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden pdf-scroll-area flex items-start snap-x snap-mandatory"
      >
      <Document
        file={fileUrl}
        onLoadSuccess={onDocumentLoadSuccess}
        loading={
          <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
            PDF 로딩 중…
          </div>
        }
        error={
          <div className="flex-1 flex items-center justify-center text-red-500 text-sm">
            PDF를 불러올 수 없습니다.
          </div>
        }
      >
        {numPages != null && (
          <div className="flex flex-nowrap gap-12 py-8 px-8 min-h-full">
            {Array.from({ length: numPages }, (_, i) => {
              const pageNum = i + 1;
              return (
                <div
                  key={pageNum}
                  data-page={pageNum}
                  className="flex-shrink-0 flex justify-center items-center bg-gray-100 dark:bg-zinc-900 p-4 snap-center"
                >
                  <Page
                    pageNumber={pageNum}
                    width={pageWidth}
                    renderTextLayer
                    renderAnnotationLayer
                    className="shadow-sm"
                  />
                </div>
              );
            })}
          </div>
        )}
      </Document>
      </div>
    </div>
  );
};

export default PdfViewer;
