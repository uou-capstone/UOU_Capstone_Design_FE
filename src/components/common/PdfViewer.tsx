import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { useTheme } from "../../contexts/ThemeContext";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// pdfjs worker 설정 (Vite 환경)
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const MIN_ZOOM = 0.5;
/** 사용자가 확대할 수 있는 절대 최대 배율 (기본은 뷰포트 fit 최대, 여기서 더 확대 가능) */
const ABSOLUTE_MAX_ZOOM = 3;
const ZOOM_STEP = 0.1;
const MAX_PAGE_WIDTH = 1200;

export type PdfViewerPageChangeSource = "user" | "programmatic";

export type PdfViewerHandle = {
  /** 1-based. 프로그램적 이동(강의 보조·동기화)용 */
  goToPage: (pageNumber: number) => void;
};

interface PdfViewerProps {
  fileUrl: string;
  title?: string;
  className?: string;
  /** 현재 보고 있는 페이지 변경 시 호출 (1-based 페이지 번호) */
  onPageChange?: (
    pageNumber: number,
    meta?: { source: PdfViewerPageChangeSource },
  ) => void;
  /** 문서 로드 완료 시 총 페이지 수 전달 (다음 페이지 버튼 등 상위 로직용) */
  onDocumentLoad?: (info: { numPages: number }) => void;
}

const PdfViewer = forwardRef<PdfViewerHandle, PdfViewerProps>(function PdfViewer(
  {
  fileUrl,
  title,
  className = "",
  onPageChange,
  onDocumentLoad,
},
  ref,
) {
  const { isDarkMode } = useTheme();
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState("");
  const [zoom, setZoom] = useState(1);
  const [zoomInputOpen, setZoomInputOpen] = useState(false);
  const [zoomInputValue, setZoomInputValue] = useState("");
  const [isPageListOpen, setIsPageListOpen] = useState(false);
  const [pageSearchQuery, setPageSearchQuery] = useState("");
  const zoomInputRef = useRef<HTMLInputElement>(null);
  const [baseWidth, setBaseWidth] = useState(800);
  const [scrollAreaWidth, setScrollAreaWidth] = useState(800);
  const [scrollAreaHeight, setScrollAreaHeight] = useState(600);
  const [pageAspectRatio, setPageAspectRatio] = useState<number>(297 / 210); // A4 기본값
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollProgrammaticRef = useRef(false);
  const observerDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFileUrlRef = useRef<string>("");

  // Page는 고정 baseWidth로 렌더, CSS transform scale(zoom)으로 확대/축소 → 캔버스 재렌더 없이 부드럽게
  const pageWidth = Math.min(
    Math.max(400, baseWidth),
    MAX_PAGE_WIDTH,
    Math.max(0, scrollAreaWidth - 48)
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateSize = () => {
      const w = el.clientWidth || 800;
      setBaseWidth(Math.min(Math.max(400, w - 96), MAX_PAGE_WIDTH));
      if (scrollRef.current) {
        setScrollAreaWidth(scrollRef.current.clientWidth || 800);
        setScrollAreaHeight(scrollRef.current.clientHeight || 600);
      }
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;
    const updateScrollSize = () => {
      setScrollAreaWidth(scrollEl.clientWidth || 800);
      setScrollAreaHeight(scrollEl.clientHeight || 600);
    };
    updateScrollSize();
    const ro = new ResizeObserver(updateScrollSize);
    ro.observe(scrollEl);
    return () => ro.disconnect();
  }, [numPages]);

  const onDocumentLoadSuccess = useCallback(
    ({ numPages: n }: { numPages: number }) => {
      setNumPages(n);
      setCurrentPage(1);
      setPageInput("1");
      onDocumentLoad?.({ numPages: n });
      onPageChange?.(1, { source: "programmatic" });
    },
    [onPageChange, onDocumentLoad]
  );

  // PDF 로드 시 세로가 길어 잘리는 경우 배율 자동 조정 (세로 기준 fit) + 한 페이지만 보이도록
  useEffect(() => {
    if (!numPages || !fileUrl) return;
    const root = scrollRef.current;
    if (!root) return;
    if (lastFileUrlRef.current === fileUrl) return;
    lastFileUrlRef.current = fileUrl;

    const fitZoomToView = async () => {
      try {
        const doc = await pdfjs.getDocument(fileUrl).promise;
        const page = await doc.getPage(1);
        const viewport = page.getViewport({ scale: 1 });
        const pageW = viewport.width;
        const pageH = viewport.height;
        setPageAspectRatio(pageH / pageW);

        await new Promise((r) => setTimeout(r, 350));
        const scrollEl = scrollRef.current;
        const containerH = (scrollEl?.clientHeight ?? 600) - 24;
        const containerW = (scrollEl?.clientWidth ?? 800) - 16;

        const maxWidthFromHeight = (containerH * pageW) / pageH;
        const fitPageWidth = Math.min(containerW, maxWidthFromHeight);
        const fitZoom = fitPageWidth / (baseWidth || 700);
        const maxByViewport = Math.min(
          containerW / (baseWidth || 700),
          containerH / ((baseWidth || 700) * (pageH / pageW))
        );
        // 기본 배율 = 뷰포트에 맞춘 최대 (fitMaxZoom), ABSOLUTE_MAX_ZOOM까지 확대 가능
        const newZoom = Math.max(
          MIN_ZOOM,
          Math.min(ABSOLUTE_MAX_ZOOM, fitZoom * 1.15, maxByViewport)
        );
        setZoom(newZoom);
      } catch (e) {
        console.error("PDF fit zoom:", e);
      }
    };
    fitZoomToView();
  }, [numPages, fileUrl, baseWidth]);

  const scrollToPage = useCallback(
    (page: number, source: PdfViewerPageChangeSource = "programmatic") => {
      if (!numPages || page < 1 || page > numPages) return;
      scrollProgrammaticRef.current = true;
      const el = scrollRef.current?.querySelector(`[data-page="${page}"]`) as HTMLElement | null;
      el?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      setCurrentPage(page);
      setPageInput(String(page));
      onPageChange?.(page, { source });
      setTimeout(() => {
        scrollProgrammaticRef.current = false;
      }, 600);
    },
    [numPages, onPageChange]
  );

  useImperativeHandle(
    ref,
    () => ({
      goToPage: (pageNumber: number) => {
        scrollToPage(pageNumber, "programmatic");
      },
    }),
    [scrollToPage],
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
        scrollToPage(currentPage - 1, "user");
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        scrollToPage(currentPage + 1, "user");
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setZoom((z) => Math.min(z + ZOOM_STEP, ABSOLUTE_MAX_ZOOM));
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setZoom((z) => Math.max(z - ZOOM_STEP, MIN_ZOOM));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [numPages, currentPage, scrollToPage]);

  // Ctrl+휠로 배율 조정 (passive: false로 preventDefault 필요) - 스로틀로 깜빡임 감소
  const zoomThrottleRef = useRef<{ last: number; timer: ReturnType<typeof setTimeout> | null; pending: "in" | "out" | null }>({
    last: 0,
    timer: null,
    pending: null,
  });
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const THROTTLE_MS = 60;
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const dir: "in" | "out" = e.deltaY < 0 ? "in" : e.deltaY > 0 ? "out" : zoomThrottleRef.current.pending ?? "in";
        if (e.deltaY !== 0) zoomThrottleRef.current.pending = dir;
        const now = Date.now();
        const doUpdate = () => {
          zoomThrottleRef.current.last = Date.now();
          zoomThrottleRef.current.timer = null;
          const pending = zoomThrottleRef.current.pending;
          zoomThrottleRef.current.pending = null;
          if (pending === "in") {
            setZoom((z) => Math.min(z + ZOOM_STEP, ABSOLUTE_MAX_ZOOM));
          } else if (pending === "out") {
            setZoom((z) => Math.max(z - ZOOM_STEP, MIN_ZOOM));
          }
        };
        if (now - zoomThrottleRef.current.last >= THROTTLE_MS) {
          doUpdate();
        } else if (!zoomThrottleRef.current.timer) {
          zoomThrottleRef.current.timer = setTimeout(doUpdate, THROTTLE_MS - (now - zoomThrottleRef.current.last));
        }
      }
    };
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", handleWheel);
      if (zoomThrottleRef.current.timer) clearTimeout(zoomThrottleRef.current.timer);
    };
  }, []);

  // IntersectionObserver로 현재 보이는 페이지 감지 (가로 스크롤 기준)
  useEffect(() => {
    if (!numPages || !onPageChange) return;
    const root = scrollRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (scrollProgrammaticRef.current) return;
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
          if (best.ratio < 0.2) return;
          if (observerDebounceRef.current) clearTimeout(observerDebounceRef.current);
          observerDebounceRef.current = setTimeout(() => {
            observerDebounceRef.current = null;
            setCurrentPage(best.page);
            setPageInput(String(best.page));
            onPageChange(best.page, { source: "user" });
          }, 100);
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

    return () => {
      observer.disconnect();
      if (observerDebounceRef.current) clearTimeout(observerDebounceRef.current);
    };
  }, [numPages, onPageChange]);

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseInt(pageInput, 10);
    if (Number.isFinite(n)) scrollToPage(n, "user");
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
    setZoom((z) => Math.min(z + ZOOM_STEP, ABSOLUTE_MAX_ZOOM));
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
    if (Number.isFinite(n) && n >= MIN_ZOOM * 100 && n <= ABSOLUTE_MAX_ZOOM * 100) {
      setZoom(Math.min(n / 100, ABSOLUTE_MAX_ZOOM));
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

  const filteredPageNumbers = useMemo(() => {
    if (!numPages) return [];
    const q = pageSearchQuery.trim();
    const pages = Array.from({ length: numPages }, (_, i) => i + 1);
    if (!q) return pages;
    return pages.filter((p) => String(p).includes(q));
  }, [numPages, pageSearchQuery]);

  return (
    <div
      ref={containerRef}
      className={`flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden ${className}`}
      style={{ backgroundColor: isDarkMode ? "#141414" : "#FFFFFF" }}
      aria-label={title || "PDF 미리보기"}
    >
      {/* 상단 툴바 - 라이트: bg #FFFFFF / 메뉴 #141414, 다크: bg #141414 / 메뉴 #FFFFFF (ThemeContext 기준) */}
      {numPages != null && (
        <div
          className="shrink-0 h-10 min-h-10 max-h-10 flex items-center justify-center gap-2 px-3 border-b box-border"
          style={{
            backgroundColor: isDarkMode ? "#141414" : "#FFFFFF",
            color: isDarkMode ? "#FFFFFF" : "#141414",
            borderColor: isDarkMode ? "#404040" : "#e5e7eb",
          }}
        >
          <button
            type="button"
            onClick={() => scrollToPage(currentPage - 1, "user")}
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
              className="w-8 h-7 px-2 py-1 text-center text-sm rounded border focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
            onClick={() => scrollToPage(currentPage + 1, "user")}
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
                className="w-10 min-w-10 px-0 py-0.5 text-center text-sm rounded border focus:outline-none"
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
                className="w-10 min-w-10 py-0.5 text-center text-sm rounded border hover:opacity-80 transition-opacity cursor-pointer focus:outline-none"
                style={{ borderColor: "#FFFFFF" }}
                title="클릭하여 배율 직접 입력"
              >
                {Math.round(zoom * 100)}%
              </button>
            )}
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoom >= ABSOLUTE_MAX_ZOOM}
              className="p-1 rounded hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
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
          <button
            type="button"
            onClick={() => setIsPageListOpen((prev) => !prev)}
            className={`p-1.5 rounded transition-colors cursor-pointer ${
              isPageListOpen
                ? isDarkMode
                  ? "bg-zinc-700 text-white"
                  : "bg-gray-200 text-[#141414]"
                : "hover:opacity-80"
            }`}
            title="페이지 목록"
            aria-label="페이지 목록 토글"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
            </svg>
          </button>
        </div>
      )}

      {/* PDF 스크롤 영역 - 가로(페이지 전환) + 세로(긴 페이지) 스크롤, Ctrl+휠로 배율 조정 */}
      <Document
        file={fileUrl}
        className="h-full min-h-0"
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
        <div className="h-full min-h-0 min-w-0 flex overflow-hidden">
          {isPageListOpen && numPages != null && (
            <aside
              className={`w-56 min-w-[224px] max-w-[240px] min-h-0 border-r flex flex-col overflow-hidden ${
                isDarkMode ? "border-zinc-700 bg-[#141414]" : "border-gray-200 bg-white"
              }`}
            >
              <div className="p-2 border-b" style={{ borderColor: isDarkMode ? "#404040" : "#e5e7eb" }}>
                <input
                  type="text"
                  value={pageSearchQuery}
                  onChange={(e) => setPageSearchQuery(e.target.value.replace(/[^\d]/g, ""))}
                  placeholder="페이지 번호 검색"
                  className="w-full h-8 px-2 text-sm rounded border focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  style={{
                    backgroundColor: isDarkMode ? "#27272a" : "#ffffff",
                    color: isDarkMode ? "#FFFFFF" : "#141414",
                    borderColor: isDarkMode ? "#52525b" : "#d1d5db",
                  }}
                />
              </div>
              <div
                className="page-list-scroll flex-1 min-h-0 overflow-y-scroll overflow-x-hidden pl-1.5 pr-3 py-1.5 space-y-1"
                style={{
                  scrollbarWidth: "thin",
                  scrollbarColor: isDarkMode ? "#52525b #141414" : "#cbd5e0 #ffffff",
                  scrollbarGutter: "stable both-edges",
                }}
              >
                {filteredPageNumbers.length === 0 ? (
                  <p className={`px-2 py-1 text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                    검색 결과가 없습니다.
                  </p>
                ) : (
                  filteredPageNumbers.map((pageNum) => (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => scrollToPage(pageNum, "user")}
                    className={`w-full text-left p-2 rounded text-sm transition-colors cursor-pointer border ${
                        currentPage === pageNum
                        ? "bg-emerald-600/20 border-emerald-400/60 text-emerald-500 ring-1 ring-emerald-500/80"
                          : isDarkMode
                          ? "border-zinc-700 text-gray-200 hover:bg-zinc-800"
                          : "border-gray-200 text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      <div className="flex flex-col items-center">
                        <div
                          className={`overflow-hidden rounded shadow-sm ${
                            isDarkMode ? "bg-zinc-900" : "bg-white"
                          }`}
                        >
                          <Page
                            pageNumber={pageNum}
                            width={120}
                            renderTextLayer={false}
                            renderAnnotationLayer={false}
                            loading={
                              <div
                                className={`h-[156px] w-[120px] animate-pulse ${
                                  isDarkMode ? "bg-zinc-800" : "bg-gray-100"
                                }`}
                              />
                            }
                          />
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </aside>
          )}
          <div
            ref={scrollRef}
            className="flex-1 min-h-0 overflow-x-auto overflow-y-auto pdf-scroll-area flex items-start snap-x snap-mandatory"
            style={{ backgroundColor: isDarkMode ? "#141414" : "#FFFFFF" }}
          >
          {numPages != null && (
            <div className="flex flex-nowrap py-3 min-h-full" style={{ gap: 0 }}>
              {Array.from({ length: numPages }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <div
                    key={pageNum}
                    data-page={pageNum}
                    className="flex-shrink-0 flex justify-center items-start snap-center min-h-full"
                    style={{
                      width: scrollAreaWidth || 800,
                      minWidth: scrollAreaWidth || 800,
                      backgroundColor: isDarkMode ? "#141414" : "#FFFFFF",
                    }}
                  >
                    <div
                      style={{
                        transform: `scale(${zoom})`,
                        transformOrigin: "top center",
                        transition: "transform 0.15s ease-out",
                      }}
                    >
                      <Page
                        pageNumber={pageNum}
                        width={pageWidth}
                        renderTextLayer
                        renderAnnotationLayer
                        className="shadow-sm"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </div>
        </div>
      </Document>
    </div>
  );
});

export default PdfViewer;
