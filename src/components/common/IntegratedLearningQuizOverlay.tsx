import { useCallback, useEffect, useMemo, useState } from "react";
import { MarkdownContent } from "./MarkdownContent";
import type {
  IntegratedQuizDisplayItem,
  IntegratedQuizOverlayModel,
} from "../../services/api";

type Props = {
  model: IntegratedQuizOverlayModel;
  onClose: () => void;
  isDarkMode: boolean;
};

type OxUserChoice = "O" | "X";
type ExamProblemViewMode = "single" | "all";

function normalizeExamOxCorrectAnswer(raw: string): OxUserChoice | null {
  const t = raw.trim();
  const u = t.toUpperCase();
  if (
    u === "O" ||
    u === "TRUE" ||
    u === "T" ||
    u === "1" ||
    u === "YES" ||
    u === "Y"
  ) {
    return "O";
  }
  if (
    u === "X" ||
    u === "FALSE" ||
    u === "F" ||
    u === "0" ||
    u === "NO" ||
    u === "N"
  ) {
    return "X";
  }
  const k = t.replace(/\s/g, "");
  if (k === "맞음" || k === "참" || k === "옳음" || k === "○") return "O";
  if (k === "틀림" || k === "거짓" || k === "×" || k === "✕") return "X";
  if (t.length === 1) {
    const c = t.toUpperCase();
    if (c === "O") return "O";
    if (c === "X") return "X";
  }
  return null;
}

function isOxAnswerCorrect(userChoice: OxUserChoice, correctRaw: string): boolean {
  const canonical = normalizeExamOxCorrectAnswer(correctRaw);
  if (canonical !== null) return userChoice === canonical;
  const one = correctRaw.trim().slice(0, 1).toUpperCase();
  if (one === "O" || one === "X") return userChoice === one;
  return false;
}

function resolveOxCorrectFromItem(item: IntegratedQuizDisplayItem): string {
  const raw = item.correctAnswer?.trim() ?? "";
  if (!raw) return "";
  const canon = normalizeExamOxCorrectAnswer(raw);
  if (canon) return canon;
  const opts = item.options ?? [];
  const byKey = opts.find((o) => o.key === raw);
  if (byKey) {
    const c = byKey.content.trim().toUpperCase();
    if (c === "O" || c.startsWith("O")) return "O";
    if (c === "X" || c.startsWith("X")) return "X";
  }
  return raw;
}

function fiveChoiceOptionLabelClass(
  selected: boolean,
  mcGraded: boolean,
  optIsCorrect: boolean,
  isDarkMode: boolean,
): string {
  let c =
    "flex items-start gap-2 w-full rounded-lg border text-left transition-colors px-2.5 py-2 ";
  if (mcGraded) {
    if (optIsCorrect) {
      c += isDarkMode
        ? "border-emerald-500/90 bg-emerald-950/35"
        : "border-emerald-500 bg-emerald-50";
    } else if (selected) {
      c += isDarkMode
        ? "border-red-500/80 bg-red-950/30"
        : "border-red-400 bg-red-50";
    } else {
      c += isDarkMode
        ? "border-zinc-800/80 bg-transparent opacity-55"
        : "border-gray-100 bg-transparent opacity-65";
    }
    c += " cursor-default";
  } else if (selected) {
    c += isDarkMode
      ? "border-emerald-500 bg-emerald-950/40 ring-1 ring-emerald-500/30"
      : "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500/25";
    c += " cursor-pointer";
  } else {
    c += isDarkMode
      ? "border-zinc-600 hover:border-zinc-500 hover:bg-zinc-800/40"
      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50";
    c += " cursor-pointer";
  }
  return c;
}

function oxChoiceButtonClass(opts: {
  letter: OxUserChoice;
  choice: OxUserChoice | undefined;
  correctCanonical: OxUserChoice | null;
  graded: boolean;
  isDarkMode: boolean;
}): string {
  const { letter, choice, correctCanonical, graded, isDarkMode } = opts;
  const selected = choice === letter;
  const isCorrectAnswer = correctCanonical === letter;
  let base =
    "inline-flex items-center justify-center min-w-[3rem] px-4 py-2 rounded-lg border text-sm font-semibold transition-colors ";

  if (graded) {
    if (isCorrectAnswer) {
      return (
        base +
        (isDarkMode
          ? "border-emerald-500 bg-emerald-950/40 text-emerald-300 cursor-default"
          : "border-emerald-500 bg-emerald-50 text-emerald-800 cursor-default")
      );
    }
    if (selected) {
      return (
        base +
        (isDarkMode
          ? "border-red-500 bg-red-950/35 text-red-300 cursor-default"
          : "border-red-400 bg-red-50 text-red-700 cursor-default")
      );
    }
    return (
      base +
      (isDarkMode
        ? "border-zinc-700 text-zinc-500 opacity-45 cursor-default"
        : "border-gray-200 text-gray-400 opacity-55 cursor-default")
    );
  }
  if (selected) {
    return (
      base +
      (isDarkMode
        ? "border-emerald-500 bg-emerald-950/45 text-emerald-200 ring-1 ring-emerald-500/35 cursor-pointer"
        : "border-emerald-500 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-500/25 cursor-pointer")
    );
  }
  return (
    base +
    (isDarkMode
      ? "border-zinc-600 text-zinc-200 hover:border-zinc-500 hover:bg-zinc-800/50 cursor-pointer"
      : "border-gray-300 text-gray-800 hover:border-gray-400 hover:bg-gray-50 cursor-pointer")
  );
}

function ExamFlashStyleSideArrows(props: {
  show: boolean;
  isDarkMode: boolean;
  prevDisabled: boolean;
  nextDisabled: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  const { show, isDarkMode, prevDisabled, nextDisabled, onPrev, onNext } = props;
  if (!show) return null;
  const base =
    "absolute top-1/2 z-10 flex h-9 w-9 items-center justify-center rounded-full border disabled:opacity-40 disabled:cursor-not-allowed";
  const skin = isDarkMode
    ? "border-zinc-700 bg-zinc-900/90 text-gray-200"
    : "border-gray-300 bg-white/95 text-gray-700";
  return (
    <>
      <button
        type="button"
        onClick={onPrev}
        disabled={prevDisabled}
        className={`${base} ${skin} left-0 -translate-x-1/2 -translate-y-1/2`}
        aria-label="이전 문항"
        title="이전"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          aria-hidden
        >
          <path
            d="M15 18l-6-6 6-6"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled}
        className={`${base} ${skin} right-0 translate-x-1/2 -translate-y-1/2`}
        aria-label="다음 문항"
        title="다음"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          aria-hidden
        >
          <path
            d="M9 6l6 6-6 6"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </>
  );
}

function examSingleFlashCardShellClass(isDarkMode: boolean): string {
  return `flex w-full min-h-[min(280px,42dvh)] flex-col rounded-xl border p-5 text-left transition-colors ${
    isDarkMode
      ? "border-zinc-700 bg-zinc-900/70"
      : "border-gray-200 bg-gray-50"
  }`;
}

function QuizCardMetaBar(props: {
  current: number;
  total: number;
}) {
  const { current, total } = props;
  return (
    <div className="mb-3 flex items-center justify-end">
      <p className="text-xs tabular-nums opacity-75">
        문항 {current} / {total}
      </p>
    </div>
  );
}

function ExamQuestionProgressDots(props: {
  total: number;
  currentIndex: number | null;
  isAnswered: (index: number) => boolean;
  onSelect?: (index: number) => void;
  isDarkMode: boolean;
}) {
  const { total, currentIndex, isAnswered, onSelect, isDarkMode } = props;
  return (
    <div
      className="flex flex-wrap items-center justify-center gap-2 py-1.5"
      role="list"
      aria-label="문항별 응답 상태"
    >
      {Array.from({ length: total }, (_, i) => {
        const answered = isAnswered(i);
        const current = currentIndex === i;
        const base =
          "h-2 w-2 rounded-full transition-all shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500";
        let cls = `${base} `;
        if (answered) {
          cls += isDarkMode ? "bg-emerald-500" : "bg-emerald-600";
        } else {
          cls += isDarkMode
            ? "border border-zinc-500 bg-transparent"
            : "border border-gray-300 bg-transparent";
        }
        if (current) {
          cls += isDarkMode
            ? " ring-2 ring-zinc-200 ring-offset-2 ring-offset-[#141414]"
            : " ring-2 ring-gray-800 ring-offset-2 ring-offset-white";
        }
        const label = `문항 ${i + 1}${answered ? ", 응답함" : ", 미응답"}`;
        if (onSelect) {
          return (
            <button
              key={i}
              type="button"
              className={cls}
              title={label}
              aria-label={label}
              aria-current={current ? "step" : undefined}
              onClick={() => onSelect(i)}
            />
          );
        }
        return (
          <span key={i} className={cls} title={label} role="listitem" aria-label={label} />
        );
      })}
    </div>
  );
}

function ExamSectionViewModeToggle(props: {
  mode: ExamProblemViewMode;
  onChange: (mode: ExamProblemViewMode) => void;
  isDarkMode: boolean;
}) {
  const { mode, onChange, isDarkMode } = props;
  const nextMode: ExamProblemViewMode = mode === "single" ? "all" : "single";
  const btnClass = `inline-flex items-center justify-center rounded-md border p-1.5 transition-colors shrink-0 ${
    isDarkMode
      ? "border-emerald-500/80 bg-emerald-950/40 text-emerald-200 hover:bg-emerald-950/60"
      : "border-emerald-500 bg-emerald-50 text-emerald-900 hover:bg-emerald-100"
  }`;
  const singleIcon = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <rect x="6" y="4" width="12" height="16" rx="1.5" strokeWidth="2" />
      <path d="M9 9h6M9 12h4" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
  const allIcon = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <circle cx="5" cy="7" r="1.25" fill="currentColor" />
      <circle cx="5" cy="12" r="1.25" fill="currentColor" />
      <circle cx="5" cy="17" r="1.25" fill="currentColor" />
      <path d="M9 7h10M9 12h10M9 17h10" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
  return (
    <button
      type="button"
      className={btnClass}
      onClick={() => onChange(nextMode)}
      title={mode === "single" ? "전체 보기로 전환" : "한 개씩 보기로 전환"}
      aria-label={
        mode === "single"
          ? "한 개씩 보기. 클릭하면 전체 보기로 전환합니다."
          : "전체 보기. 클릭하면 한 개씩 보기로 전환합니다."
      }
      aria-pressed={mode === "single"}
    >
      {mode === "single" ? singleIcon : allIcon}
    </button>
  );
}

function resolveMcqCorrectKey(item: IntegratedQuizDisplayItem): string | null {
  const ca = item.correctAnswer?.trim();
  if (!ca) return null;
  const opts = item.options ?? [];
  if (opts.some((o) => o.key === ca)) return ca;
  const upper = ca.toUpperCase();
  if (/^[A-Z]$/.test(upper)) {
    const idx = upper.charCodeAt(0) - 65;
    if (idx >= 0 && idx < opts.length) return opts[idx].key;
  }
  const n = Number.parseInt(ca, 10);
  if (Number.isFinite(n) && n >= 1 && n <= opts.length) return opts[n - 1].key;
  return null;
}

function backLooksLikeMarkdown(text: string): boolean {
  const t = text.trim();
  return (
    /^#{1,6}\s/m.test(t) ||
    /\*\*[^*]+\*\*/.test(t) ||
    /```/.test(t) ||
    (t.includes("\n") && t.length > 80)
  );
}

function IntegratedFlashExamSection(props: {
  items: IntegratedQuizDisplayItem[];
  isDarkMode: boolean;
}) {
  const { items, isDarkMode } = props;
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setIndex(0);
    setFlipped({});
  }, [items]);

  const current = items[index];
  const id = current.id;
  const isFlipped = !!flipped[id];

  const toggleFlip = () => setFlipped((p) => ({ ...p, [id]: !p[id] }));

  const backText = current.back ?? "";
  const frontText = current.front ?? "";

  return (
    <section className="flex min-h-[min(360px,50dvh)] w-full flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <p className="text-center text-xs opacity-80">
          {index + 1} / {items.length}
        </p>
        <div className="relative w-full flex-1 min-h-0 px-10">
          <ExamFlashStyleSideArrows
            show={items.length > 1}
            isDarkMode={isDarkMode}
            prevDisabled={index <= 0}
            nextDisabled={index >= items.length - 1}
            onPrev={() => setIndex((i) => Math.max(0, i - 1))}
            onNext={() => setIndex((i) => Math.min(items.length - 1, i + 1))}
          />
          <button
            type="button"
            onClick={toggleFlip}
            className={`${examSingleFlashCardShellClass(isDarkMode)} w-full h-full min-h-[260px]`}
          >
            <QuizCardMetaBar
              current={index + 1}
              total={items.length}
            />
            <p className="mb-2 text-[11px] opacity-65">클릭해서 앞·뒤 전환</p>
            {!isFlipped ? (
              <p className="text-base leading-7 whitespace-pre-wrap break-words">
                {frontText || "(앞면 없음)"}
              </p>
            ) : backLooksLikeMarkdown(backText) ? (
              <article
                className={`prose prose-neutral max-w-none text-base leading-7 break-words prose-headings:font-semibold ${
                  isDarkMode ? "prose-invert" : ""
                }`}
              >
                <MarkdownContent>{backText}</MarkdownContent>
              </article>
            ) : (
              <p className="text-base leading-7 whitespace-pre-wrap break-words">
                {backText || "(뒷면 없음)"}
              </p>
            )}
          </button>
        </div>
        {items.length > 1 && (
          <div className="grid max-h-32 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3 md:grid-cols-4">
            {items.map((card, idx) => (
              <button
                key={card.id}
                type="button"
                onClick={() => setIndex(idx)}
                className={`rounded-lg border p-2 text-left text-xs transition-colors ${
                  idx === index
                    ? isDarkMode
                      ? "border-emerald-500 bg-emerald-950/30"
                      : "border-emerald-500 bg-emerald-50"
                    : isDarkMode
                      ? "border-zinc-700 bg-zinc-900/60 hover:bg-zinc-800"
                      : "border-gray-200 bg-white hover:bg-gray-50"
                }`}
              >
                <span className="opacity-70">{idx + 1}</span>
                <p className="mt-1 line-clamp-2 break-words">{card.front ?? ""}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export function IntegratedLearningQuizOverlay({ model, onClose, isDarkMode }: Props) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prev;
    };
  }, [handleKeyDown]);

  const flashItems = useMemo(
    () => model.items.filter((it) => it.kind === "flash"),
    [model.items],
  );
  const oxItems = useMemo(
    () => model.items.filter((it) => it.kind === "ox"),
    [model.items],
  );
  const mcqItems = useMemo(
    () => model.items.filter((it) => it.kind === "mcq"),
    [model.items],
  );
  const shortItems = useMemo(
    () => model.items.filter((it) => it.kind === "short"),
    [model.items],
  );
  const unknownItems = useMemo(
    () => model.items.filter((it) => it.kind === "unknown"),
    [model.items],
  );

  const [oxViewMode, setOxViewMode] = useState<ExamProblemViewMode>("single");
  const [mcqViewMode, setMcqViewMode] = useState<ExamProblemViewMode>("single");
  const [oxSingleIndex, setOxSingleIndex] = useState(0);
  const [mcqSingleIndex, setMcqSingleIndex] = useState(0);
  const [shortSingleIndex, setShortSingleIndex] = useState(0);

  const [oxUserAnswers, setOxUserAnswers] = useState<Record<string, OxUserChoice>>({});
  const [mcqUserAnswers, setMcqUserAnswers] = useState<Record<string, string>>({});
  const [shortUserAnswers, setShortUserAnswers] = useState<Record<string, string>>({});
  const [oxGraded, setOxGraded] = useState(false);
  const [mcqGraded, setMcqGraded] = useState(false);
  const [shortGraded, setShortGraded] = useState(false);

  const modelKey = useMemo(
    () => `${model.title}\0${model.items.map((i) => i.id).join(",")}`,
    [model.title, model.items],
  );

  useEffect(() => {
    setOxViewMode("single");
    setMcqViewMode("single");
    setOxSingleIndex(0);
    setMcqSingleIndex(0);
    setShortSingleIndex(0);
    setOxUserAnswers({});
    setMcqUserAnswers({});
    setShortUserAnswers({});
    setOxGraded(false);
    setMcqGraded(false);
    setShortGraded(false);
  }, [modelKey]);

  const oxStats = useMemo(() => {
    const list = oxItems;
    const allAnswered = list.every((_, idx) => {
      const c = oxUserAnswers[String(idx)];
      return c === "O" || c === "X";
    });
    let correctCount = 0;
    if (oxGraded) {
      for (let idx = 0; idx < list.length; idx++) {
        const q = list[idx];
        const choice = oxUserAnswers[String(idx)];
        const correctStr = resolveOxCorrectFromItem(q);
        if (choice && correctStr && isOxAnswerCorrect(choice, correctStr)) correctCount++;
      }
    }
    return { list, total: list.length, allAnswered, correctCount };
  }, [oxItems, oxUserAnswers, oxGraded]);

  const mcqStats = useMemo(() => {
    const list = mcqItems;
    const allAnswered = list.every((q, idx) => {
      const id = mcqUserAnswers[String(idx)];
      return id != null && id !== "" && (q.options ?? []).some((o) => o.key === id);
    });
    let correctCount = 0;
    if (mcqGraded) {
      for (let idx = 0; idx < list.length; idx++) {
        const q = list[idx];
        const sel = mcqUserAnswers[String(idx)];
        const ck = resolveMcqCorrectKey(q);
        if (ck && sel === ck) correctCount++;
      }
    }
    return { list, total: list.length, allAnswered, correctCount };
  }, [mcqItems, mcqUserAnswers, mcqGraded]);

  const shortStats = useMemo(() => {
    const list = shortItems;
    const allAnswered = list.every((_, idx) => {
      return (shortUserAnswers[String(idx)] ?? "").trim().length > 0;
    });
    return { list, total: list.length, allAnswered };
  }, [shortItems, shortUserAnswers]);

  const handleOxAnswer = (idx: number, letter: OxUserChoice) => {
    if (oxGraded) return;
    setOxUserAnswers((p) => ({ ...p, [String(idx)]: letter }));
  };

  const handleMcqAnswer = (idx: number, key: string) => {
    if (mcqGraded) return;
    setMcqUserAnswers((p) => ({ ...p, [String(idx)]: key }));
  };

  const panelClass = isDarkMode
    ? "border-zinc-600 bg-zinc-900/95 text-white shadow-black/40"
    : "border-gray-200 bg-white/95 text-gray-900 shadow-xl";

  const hasGradableOxMeta = oxItems.some((q) => q.correctAnswer?.trim());

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="integrated-quiz-overlay-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-black/50"
        aria-label="닫기"
        onClick={onClose}
      />
      <div
        className={`group relative z-10 flex max-h-[min(88vh,900px)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border ${panelClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header
          className={`flex shrink-0 items-start justify-between gap-3 border-b px-5 py-4 ${
            isDarkMode ? "border-zinc-600" : "border-gray-200"
          }`}
        >
          <div className="min-w-0 pr-2">
            <h2
              id="integrated-quiz-overlay-title"
              className="text-lg font-semibold leading-snug"
            >
              {model.title}
            </h2>
            <p className={`mt-1 text-xs ${isDarkMode ? "text-zinc-400" : "text-gray-500"}`}>
              아래에서 문항을 풀고 채점할 수 있습니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`shrink-0 rounded-full p-2 transition-opacity cursor-pointer opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100 focus-visible:pointer-events-auto ${
              isDarkMode
                ? "text-zinc-300 hover:bg-zinc-700 hover:text-white"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            }`}
            aria-label="닫기"
            title="닫기"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
              <path
                d="M18 6L6 18M6 6l12 12"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="flex flex-col gap-8">
            {flashItems.length > 0 ? (
              <IntegratedFlashExamSection items={flashItems} isDarkMode={isDarkMode} />
            ) : null}

            {oxStats.total > 0 ? (
              <section className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold opacity-90">O/X 문항</h3>
                  <ExamSectionViewModeToggle
                    mode={oxViewMode}
                    onChange={setOxViewMode}
                    isDarkMode={isDarkMode}
                  />
                </div>
                {oxViewMode === "single" ? (
                  <div className="flex min-h-[min(320px,40dvh)] w-full flex-col gap-3">
                    <div className="relative min-h-0 w-full flex-1 px-10">
                      <ExamFlashStyleSideArrows
                        show={oxStats.total > 1}
                        isDarkMode={isDarkMode}
                        prevDisabled={oxSingleIndex <= 0}
                        nextDisabled={oxSingleIndex >= oxStats.total - 1}
                        onPrev={() => setOxSingleIndex((i) => Math.max(0, i - 1))}
                        onNext={() =>
                          setOxSingleIndex((i) => Math.min(oxStats.total - 1, i + 1))
                        }
                      />
                      {(() => {
                        const idx = oxSingleIndex;
                        const q = oxStats.list[idx];
                        const choice = oxUserAnswers[String(idx)];
                        const correctStr = resolveOxCorrectFromItem(q);
                        const oxCorrectCanon = normalizeExamOxCorrectAnswer(correctStr);
                        const userCorrect =
                          choice != null &&
                          correctStr.length > 0 &&
                          isOxAnswerCorrect(choice, correctStr);
                        return (
                          <div className={examSingleFlashCardShellClass(isDarkMode)}>
                            <QuizCardMetaBar
                              current={idx + 1}
                              total={oxStats.total}
                            />
                            <p className="mb-4 text-base font-medium leading-7 whitespace-pre-wrap break-words">
                              {q.stem}
                            </p>
                            <div className="mt-auto flex h-12 shrink-0 flex-wrap items-center justify-center gap-3">
                              <label
                                className={oxChoiceButtonClass({
                                  letter: "O",
                                  choice,
                                  correctCanonical: oxCorrectCanon,
                                  graded: oxGraded,
                                  isDarkMode,
                                })}
                              >
                                <input
                                  type="radio"
                                  name={`int-ox-${idx}`}
                                  className="sr-only"
                                  checked={choice === "O"}
                                  disabled={oxGraded}
                                  onChange={() => handleOxAnswer(idx, "O")}
                                />
                                <span>O</span>
                              </label>
                              <label
                                className={oxChoiceButtonClass({
                                  letter: "X",
                                  choice,
                                  correctCanonical: oxCorrectCanon,
                                  graded: oxGraded,
                                  isDarkMode,
                                })}
                              >
                                <input
                                  type="radio"
                                  name={`int-ox-${idx}`}
                                  className="sr-only"
                                  checked={choice === "X"}
                                  disabled={oxGraded}
                                  onChange={() => handleOxAnswer(idx, "X")}
                                />
                                <span>X</span>
                              </label>
                            </div>
                            {oxGraded && choice && hasGradableOxMeta && correctStr ? (
                              <div className="mt-4 space-y-1 border-t border-dashed border-gray-300 pt-3 dark:border-zinc-600">
                                <p className="text-[11px]">
                                  <span className="font-semibold">결과:</span>{" "}
                                  <span
                                    className={
                                      userCorrect
                                        ? "font-medium text-emerald-500"
                                        : "font-medium text-red-500"
                                    }
                                  >
                                    {userCorrect ? "정답" : "오답"}
                                  </span>
                                </p>
                                <p className="text-[11px] opacity-90">
                                  <span className="font-semibold">정답:</span>{" "}
                                  {normalizeExamOxCorrectAnswer(correctStr) ?? correctStr}
                                </p>
                                {q.explanation ? (
                                  <p className="text-[11px] whitespace-pre-line opacity-80">
                                    <span className="font-semibold">해설:</span> {q.explanation}
                                  </p>
                                ) : null}
                              </div>
                            ) : null}
                            {oxGraded && choice && !hasGradableOxMeta ? (
                              <p className="mt-3 text-[11px] opacity-70">
                                서버에 정답 필드가 없어 O/X 선택만 표시합니다.
                              </p>
                            ) : null}
                          </div>
                        );
                      })()}
                    </div>
                    <div className="flex min-h-[4rem] w-full shrink-0 flex-col items-center justify-start gap-2 px-2 text-center">
                      {(oxSingleIndex === oxStats.total - 1 || oxStats.total <= 1) && (
                        <>
                          <button
                            type="button"
                            onClick={() => setOxGraded(true)}
                            disabled={!oxStats.allAnswered || oxGraded}
                            className={`inline-flex cursor-pointer items-center justify-center rounded px-3 py-1.5 text-[11px] font-medium disabled:cursor-not-allowed disabled:opacity-50 ${
                              isDarkMode ? "bg-emerald-600 text-white" : "bg-emerald-600 text-white"
                            }`}
                          >
                            채점하기
                          </button>
                          {oxGraded && hasGradableOxMeta ? (
                            <p
                              className={`text-[11px] font-semibold ${isDarkMode ? "text-emerald-300" : "text-emerald-700"}`}
                            >
                              {oxStats.total}문제 중 {oxStats.correctCount}문제 정답
                            </p>
                          ) : null}
                        </>
                      )}
                    </div>
                    <ExamQuestionProgressDots
                      total={oxStats.total}
                      currentIndex={oxSingleIndex}
                      isAnswered={(i) => {
                        const c = oxUserAnswers[String(i)];
                        return c === "O" || c === "X";
                      }}
                      onSelect={(i) => setOxSingleIndex(i)}
                      isDarkMode={isDarkMode}
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {oxStats.list.map((q, idx) => {
                      const choice = oxUserAnswers[String(idx)];
                      const correctStr = resolveOxCorrectFromItem(q);
                      const oxCorrectCanon = normalizeExamOxCorrectAnswer(correctStr);
                      const userCorrect =
                        choice != null &&
                        correctStr.length > 0 &&
                        isOxAnswerCorrect(choice, correctStr);
                      return (
                        <div
                          key={q.id}
                          className={`rounded-lg border p-3 ${isDarkMode ? "border-zinc-700" : "border-gray-200"}`}
                        >
                          <p className="mb-2 text-sm font-medium whitespace-pre-line">
                            <span className="mr-1.5 inline tabular-nums font-semibold">
                              {idx + 1}.
                            </span>
                            {q.stem}
                          </p>
                          <div className="flex flex-wrap items-center gap-2">
                            <label
                              className={oxChoiceButtonClass({
                                letter: "O",
                                choice,
                                correctCanonical: oxCorrectCanon,
                                graded: oxGraded,
                                isDarkMode,
                              })}
                            >
                              <input
                                type="radio"
                                name={`int-ox-all-${idx}`}
                                className="sr-only"
                                checked={choice === "O"}
                                disabled={oxGraded}
                                onChange={() => handleOxAnswer(idx, "O")}
                              />
                              <span>O</span>
                            </label>
                            <label
                              className={oxChoiceButtonClass({
                                letter: "X",
                                choice,
                                correctCanonical: oxCorrectCanon,
                                graded: oxGraded,
                                isDarkMode,
                              })}
                            >
                              <input
                                type="radio"
                                name={`int-ox-all-${idx}`}
                                className="sr-only"
                                checked={choice === "X"}
                                disabled={oxGraded}
                                onChange={() => handleOxAnswer(idx, "X")}
                              />
                              <span>X</span>
                            </label>
                          </div>
                          {oxGraded && choice && hasGradableOxMeta && correctStr ? (
                            <div className="mt-2 space-y-1 border-t border-dashed border-gray-300 pt-2 dark:border-zinc-600">
                              <p className="text-[11px]">
                                <span className="font-semibold">결과:</span>{" "}
                                <span
                                  className={
                                    userCorrect
                                      ? "font-medium text-emerald-500"
                                      : "font-medium text-red-500"
                                  }
                                >
                                  {userCorrect ? "정답" : "오답"}
                                </span>
                              </p>
                              <p className="text-[11px] opacity-90">
                                <span className="font-semibold">정답:</span>{" "}
                                {normalizeExamOxCorrectAnswer(correctStr) ?? correctStr}
                              </p>
                              {q.explanation ? (
                                <p className="text-[11px] whitespace-pre-line opacity-80">
                                  <span className="font-semibold">해설:</span> {q.explanation}
                                </p>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <button
                        type="button"
                        onClick={() => setOxGraded(true)}
                        disabled={!oxStats.allAnswered || oxGraded}
                        className={`inline-flex cursor-pointer items-center justify-center rounded px-3 py-1.5 text-[11px] font-medium disabled:cursor-not-allowed disabled:opacity-50 ${
                          isDarkMode ? "bg-emerald-600 text-white" : "bg-emerald-600 text-white"
                        }`}
                      >
                        채점하기
                      </button>
                      {oxGraded && hasGradableOxMeta ? (
                        <p
                          className={`text-[11px] font-semibold ${isDarkMode ? "text-emerald-300" : "text-emerald-700"}`}
                        >
                          {oxStats.total}문제 중 {oxStats.correctCount}문제 정답
                        </p>
                      ) : (
                        <p className="text-[11px] opacity-70">
                          모든 문항에 답을 고른 뒤 채점하기를 누르세요.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </section>
            ) : null}

            {mcqStats.total > 0 ? (
              <section className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold opacity-90">객관식</h3>
                  <ExamSectionViewModeToggle
                    mode={mcqViewMode}
                    onChange={setMcqViewMode}
                    isDarkMode={isDarkMode}
                  />
                </div>
                {mcqViewMode === "single" ? (
                  <div className="flex min-h-[min(320px,40dvh)] w-full flex-col gap-3">
                    <div className="relative min-h-0 w-full flex-1 px-10">
                      <ExamFlashStyleSideArrows
                        show={mcqStats.total > 1}
                        isDarkMode={isDarkMode}
                        prevDisabled={mcqSingleIndex <= 0}
                        nextDisabled={mcqSingleIndex >= mcqStats.total - 1}
                        onPrev={() => setMcqSingleIndex((i) => Math.max(0, i - 1))}
                        onNext={() =>
                          setMcqSingleIndex((i) => Math.min(mcqStats.total - 1, i + 1))
                        }
                      />
                      {(() => {
                        const idx = mcqSingleIndex;
                        const q = mcqStats.list[idx];
                        const sel = mcqUserAnswers[String(idx)];
                        const ck = resolveMcqCorrectKey(q);
                        const hasKey = !!ck;
                        const userCorrect = hasKey && sel === ck;
                        return (
                          <div className={examSingleFlashCardShellClass(isDarkMode)}>
                            <QuizCardMetaBar
                              current={idx + 1}
                              total={mcqStats.total}
                            />
                            <p className="mb-4 text-base font-medium leading-7 whitespace-pre-wrap break-words">
                              {q.stem}
                            </p>
                            <ul className="mt-auto list-none space-y-2 pl-0">
                              {(q.options ?? []).map((opt) => {
                                const selected = sel === opt.key;
                                const optCorrect = hasKey && opt.key === ck;
                                return (
                                  <li key={opt.key}>
                                    <label
                                      className={fiveChoiceOptionLabelClass(
                                        selected,
                                        mcqGraded,
                                        optCorrect,
                                        isDarkMode,
                                      )}
                                    >
                                      <input
                                        type="radio"
                                        name={`int-mcq-${idx}`}
                                        className="sr-only"
                                        disabled={mcqGraded}
                                        checked={selected}
                                        onChange={() => handleMcqAnswer(idx, opt.key)}
                                      />
                                      <span className="flex min-w-0 flex-1 items-start gap-2 text-sm">
                                        <span className="w-5 shrink-0 text-right font-semibold tabular-nums">
                                          {opt.key}.
                                        </span>
                                        <span className="min-w-0 break-words">{opt.content}</span>
                                        {mcqGraded && optCorrect ? (
                                          <span className="ml-auto shrink-0 text-xs font-semibold text-emerald-500">
                                            정답
                                          </span>
                                        ) : null}
                                      </span>
                                    </label>
                                  </li>
                                );
                              })}
                            </ul>
                            {mcqGraded && sel && hasKey ? (
                              <div className="mt-4 space-y-1 border-t border-dashed border-gray-300 pt-3 dark:border-zinc-600">
                                <p className="text-[11px]">
                                  <span className="font-semibold">결과:</span>{" "}
                                  <span
                                    className={
                                      userCorrect
                                        ? "font-medium text-emerald-500"
                                        : "font-medium text-red-500"
                                    }
                                  >
                                    {userCorrect ? "정답" : "오답"}
                                  </span>
                                </p>
                                {q.explanation ? (
                                  <p className="text-[11px] whitespace-pre-line opacity-80">
                                    <span className="font-semibold">해설:</span> {q.explanation}
                                  </p>
                                ) : null}
                              </div>
                            ) : null}
                            {mcqGraded && !hasKey ? (
                              <p className="mt-3 text-[11px] opacity-70">
                                정답 정보가 없어 선택 결과만 표시합니다.
                              </p>
                            ) : null}
                          </div>
                        );
                      })()}
                    </div>
                    <div className="flex min-h-[4rem] w-full shrink-0 flex-col items-center justify-start gap-2 px-2 text-center">
                      {(mcqSingleIndex === mcqStats.total - 1 || mcqStats.total <= 1) && (
                        <>
                          <button
                            type="button"
                            onClick={() => setMcqGraded(true)}
                            disabled={!mcqStats.allAnswered || mcqGraded}
                            className={`inline-flex cursor-pointer items-center justify-center rounded px-3 py-1.5 text-[11px] font-medium disabled:cursor-not-allowed disabled:opacity-50 ${
                              isDarkMode ? "bg-emerald-600 text-white" : "bg-emerald-600 text-white"
                            }`}
                          >
                            채점하기
                          </button>
                          {mcqGraded && mcqItems.some((q) => resolveMcqCorrectKey(q)) ? (
                            <p
                              className={`text-[11px] font-semibold ${isDarkMode ? "text-emerald-300" : "text-emerald-700"}`}
                            >
                              {mcqStats.total}문제 중 {mcqStats.correctCount}문제 정답
                            </p>
                          ) : null}
                        </>
                      )}
                    </div>
                    <ExamQuestionProgressDots
                      total={mcqStats.total}
                      currentIndex={mcqSingleIndex}
                      isAnswered={(i) => {
                        const id = mcqUserAnswers[String(i)];
                        const q = mcqStats.list[i];
                        return (
                          id != null &&
                          id !== "" &&
                          (q.options ?? []).some((o) => o.key === id)
                        );
                      }}
                      onSelect={(i) => setMcqSingleIndex(i)}
                      isDarkMode={isDarkMode}
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {mcqStats.list.map((q, idx) => {
                      const sel = mcqUserAnswers[String(idx)];
                      const ck = resolveMcqCorrectKey(q);
                      const hasKey = !!ck;
                      const userCorrect = hasKey && sel === ck;
                      return (
                        <div
                          key={q.id}
                          className={`rounded-lg border p-3 ${isDarkMode ? "border-zinc-700" : "border-gray-200"}`}
                        >
                          <p className="mb-2 text-sm font-medium whitespace-pre-line">
                            <span className="mr-1.5 font-semibold tabular-nums">{idx + 1}.</span>
                            {q.stem}
                          </p>
                          <ul className="list-none space-y-2 pl-0">
                            {(q.options ?? []).map((opt) => {
                              const selected = sel === opt.key;
                              const optCorrect = hasKey && opt.key === ck;
                              return (
                                <li key={opt.key}>
                                  <label
                                    className={fiveChoiceOptionLabelClass(
                                      selected,
                                      mcqGraded,
                                      optCorrect,
                                      isDarkMode,
                                    )}
                                  >
                                    <input
                                      type="radio"
                                      name={`int-mcq-all-${idx}`}
                                      className="sr-only"
                                      disabled={mcqGraded}
                                      checked={selected}
                                      onChange={() => handleMcqAnswer(idx, opt.key)}
                                    />
                                    <span className="flex min-w-0 flex-1 items-start gap-2 text-sm">
                                      <span className="w-5 shrink-0 text-right font-semibold tabular-nums">
                                        {opt.key}.
                                      </span>
                                      <span className="min-w-0">{opt.content}</span>
                                      {mcqGraded && optCorrect ? (
                                        <span className="ml-auto text-xs font-semibold text-emerald-500">
                                          정답
                                        </span>
                                      ) : null}
                                    </span>
                                  </label>
                                </li>
                              );
                            })}
                          </ul>
                          {mcqGraded && sel && hasKey ? (
                            <div className="mt-2 space-y-1 border-t border-dashed border-gray-300 pt-2 dark:border-zinc-600">
                              <p className="text-[11px]">
                                <span className="font-semibold">결과:</span>{" "}
                                <span
                                  className={
                                    userCorrect
                                      ? "font-medium text-emerald-500"
                                      : "font-medium text-red-500"
                                  }
                                >
                                  {userCorrect ? "정답" : "오답"}
                                </span>
                              </p>
                              {q.explanation ? (
                                <p className="text-[11px] whitespace-pre-line opacity-80">
                                  <span className="font-semibold">해설:</span> {q.explanation}
                                </p>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setMcqGraded(true)}
                      disabled={!mcqStats.allAnswered || mcqGraded}
                      className={`inline-flex cursor-pointer items-center justify-center rounded px-3 py-1.5 text-[11px] font-medium disabled:cursor-not-allowed disabled:opacity-50 ${
                        isDarkMode ? "bg-emerald-600 text-white" : "bg-emerald-600 text-white"
                      }`}
                    >
                      채점하기
                    </button>
                    {mcqGraded && mcqItems.some((q) => resolveMcqCorrectKey(q)) ? (
                      <p
                        className={`text-[11px] font-semibold ${isDarkMode ? "text-emerald-300" : "text-emerald-700"}`}
                      >
                        {mcqStats.total}문제 중 {mcqStats.correctCount}문제 정답
                      </p>
                    ) : null}
                  </div>
                )}
              </section>
            ) : null}

            {shortStats.total > 0 ? (
              <section className="space-y-3">
                <h3 className="text-sm font-semibold opacity-90">주관식·단답</h3>
                <div className="relative min-h-[min(260px,36dvh)] w-full px-10">
                  <ExamFlashStyleSideArrows
                    show={shortStats.total > 1}
                    isDarkMode={isDarkMode}
                    prevDisabled={shortSingleIndex <= 0}
                    nextDisabled={shortSingleIndex >= shortStats.total - 1}
                    onPrev={() => setShortSingleIndex((i) => Math.max(0, i - 1))}
                    onNext={() =>
                      setShortSingleIndex((i) => Math.min(shortStats.total - 1, i + 1))
                    }
                  />
                  {(() => {
                    const idx = shortSingleIndex;
                    const q = shortStats.list[idx];
                    const val = shortUserAnswers[String(idx)] ?? "";
                    return (
                      <div className={examSingleFlashCardShellClass(isDarkMode)}>
                        <QuizCardMetaBar
                          current={idx + 1}
                          total={shortStats.total}
                        />
                        <p className="mb-3 text-base font-medium leading-7 whitespace-pre-wrap break-words">
                          {q.stem}
                        </p>
                        <textarea
                          value={val}
                          disabled={shortGraded}
                          onChange={(e) =>
                            setShortUserAnswers((p) => ({
                              ...p,
                              [String(idx)]: e.target.value,
                            }))
                          }
                          rows={5}
                          className={`w-full resize-y rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/40 ${
                            isDarkMode
                              ? "border-zinc-600 bg-zinc-950/50 text-zinc-100 placeholder:text-zinc-500"
                              : "border-gray-300 bg-white text-gray-900 placeholder:text-gray-400"
                          }`}
                          placeholder="답안을 입력하세요."
                        />
                        {shortGraded && q.referenceAnswer?.trim() ? (
                          <div className="mt-3 space-y-1 border-t border-dashed border-gray-300 pt-3 text-[11px] dark:border-zinc-600">
                            <p className="font-semibold opacity-90">참고 답안</p>
                            <p className="whitespace-pre-wrap opacity-90">{q.referenceAnswer}</p>
                            {q.explanation ? (
                              <p className="whitespace-pre-line opacity-80">
                                <span className="font-semibold">해설:</span> {q.explanation}
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                        {shortGraded && !q.referenceAnswer?.trim() ? (
                          <p className="mt-3 text-[11px] opacity-70">
                            참고 답안이 없습니다. 스스로 검토해 보세요.
                          </p>
                        ) : null}
                      </div>
                    );
                  })()}
                </div>
                <div className="flex flex-col items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShortGraded(true)}
                    disabled={!shortStats.allAnswered || shortGraded}
                    className={`inline-flex cursor-pointer items-center justify-center rounded px-3 py-1.5 text-[11px] font-medium disabled:cursor-not-allowed disabled:opacity-50 ${
                      isDarkMode ? "bg-emerald-600 text-white" : "bg-emerald-600 text-white"
                    }`}
                  >
                    제출·해설 보기
                  </button>
                  <ExamQuestionProgressDots
                    total={shortStats.total}
                    currentIndex={shortSingleIndex}
                    isAnswered={(i) => (shortUserAnswers[String(i)] ?? "").trim().length > 0}
                    onSelect={(i) => setShortSingleIndex(i)}
                    isDarkMode={isDarkMode}
                  />
                </div>
              </section>
            ) : null}

            {unknownItems.length > 0 ? (
              <section>
                <h3 className="mb-2 text-sm font-semibold opacity-90">기타 문항</h3>
                <ul className="space-y-2 text-sm opacity-90">
                  {unknownItems.map((it) => (
                    <li key={it.id} className="rounded-lg border border-dashed p-3 opacity-80">
                      {it.stem}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
