import React, { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshIcon } from "@/components/common/Icons";
import { useTheme } from "../../contexts/ThemeContext";

type UpdatePart = "ALL" | "AI" | "BE" | "FE";
type RepoPart = Exclude<UpdatePart, "ALL">;

type GitHubRepoConfig = {
  part: RepoPart;
  label: string;
  name: string;
  repo: string;
  url: string;
};

type GitHubCommitResponse = {
  sha: string;
  html_url: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    };
  };
};

type UpdateRecord = {
  id: string;
  date: string;
  isoDate: string;
  part: RepoPart;
  repoName: string;
  repoUrl: string;
  hash: string;
  title: string;
  body?: string;
  author: string;
  url: string;
};

const GITHUB_REPOS: GitHubRepoConfig[] = [
  {
    part: "FE",
    label: "FE",
    name: "Frontend",
    repo: "UOU_Capstone_Design_FE",
    url: "https://github.com/uou-capstone/UOU_Capstone_Design_FE",
  },
  {
    part: "BE",
    label: "BE",
    name: "Backend",
    repo: "UOU_Capstone_Design_BE",
    url: "https://github.com/uou-capstone/UOU_Capstone_Design_BE",
  },
  {
    part: "AI",
    label: "AI",
    name: "AI",
    repo: "UOU_Capstone_Design_AI",
    url: "https://github.com/uou-capstone/UOU_Capstone_Design_AI",
  },
];

function toDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function splitCommitMessage(message: string): { title: string; body?: string } {
  const [title, ...rest] = message.split(/\r?\n/);
  const body = rest.join("\n").trim();
  return {
    title: title.trim() || "제목 없음",
    body: body || undefined,
  };
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDateLabel(value: string): string {
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

function parseGitHubCommit(
  repo: GitHubRepoConfig,
  commit: GitHubCommitResponse,
): UpdateRecord {
  const { title, body } = splitCommitMessage(commit.commit.message);
  const isoDate = commit.commit.author.date;
  return {
    id: `${repo.part}-${commit.sha}`,
    date: toKey(new Date(isoDate)),
    isoDate,
    part: repo.part,
    repoName: repo.repo,
    repoUrl: repo.url,
    hash: commit.sha.slice(0, 7),
    title,
    body,
    author: commit.commit.author.name,
    url: commit.html_url,
  };
}

const UpdatesPage: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [records, setRecords] = useState<UpdateRecord[]>([]);
  const [partFilter, setPartFilter] = useState<UpdatePart>("ALL");
  const [selectedDate, setSelectedDate] = useState<string>(() => toKey(new Date()));
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedAt, setLoadedAt] = useState<string | null>(null);

  const loadUpdates = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const repoRecords = await Promise.all(
        GITHUB_REPOS.map(async (repo) => {
          const response = await fetch(
            `https://api.github.com/repos/uou-capstone/${repo.repo}/commits?per_page=30`,
            {
              headers: {
                Accept: "application/vnd.github+json",
              },
            },
          );

          if (!response.ok) {
            throw new Error(`${repo.repo}: GitHub API ${response.status}`);
          }

          const commits = (await response.json()) as GitHubCommitResponse[];
          return commits.map((commit) => parseGitHubCommit(repo, commit));
        }),
      );

      const nextRecords = repoRecords
        .flat()
        .sort((a, b) => b.isoDate.localeCompare(a.isoDate));

      setRecords(nextRecords);
      setLoadedAt(new Date().toISOString());
    } catch (err) {
      const detail = err instanceof Error ? err.message : "unknown error";
      setError(`GitHub 업데이트 내역을 불러오지 못했습니다. ${detail}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUpdates();
  }, [loadUpdates]);

  const partRecords = useMemo(
    () =>
      partFilter === "ALL"
        ? records
        : records.filter((record) => record.part === partFilter),
    [partFilter, records],
  );

  const orderedDates = useMemo(
    () => [...new Set(partRecords.map((record) => record.date))].sort(),
    [partRecords],
  );

  useEffect(() => {
    const latest = orderedDates[orderedDates.length - 1];
    if (!latest) return;

    if (!orderedDates.includes(selectedDate)) {
      const latestDate = toDate(latest);
      setSelectedDate(latest);
      setCurrentMonth(new Date(latestDate.getFullYear(), latestDate.getMonth(), 1));
    }
  }, [orderedDates, selectedDate]);

  const dateCounts = useMemo(() => {
    const map = new Map<string, number>();
    partRecords.forEach((record) => {
      map.set(record.date, (map.get(record.date) ?? 0) + 1);
    });
    return map;
  }, [partRecords]);

  const recordsOnSelectedDate = useMemo(
    () => partRecords.filter((record) => record.date === selectedDate),
    [partRecords, selectedDate],
  );

  const repoSummaries = useMemo(
    () =>
      GITHUB_REPOS.map((repo) => {
        const repoItems = records.filter((record) => record.part === repo.part);
        return {
          ...repo,
          count: repoItems.length,
          latest: repoItems[0],
        };
      }),
    [records],
  );

  const cardClass = isDarkMode
    ? "border-[#3a332f] bg-[#242220]"
    : "border-[#dfd8d2] bg-white";
  const softCardClass = isDarkMode
    ? "border-[#3a332f] bg-[#2b2825]"
    : "border-[#eadfd7] bg-[#fffaf6]";
  const textMain = isDarkMode ? "text-[#f6f0eb]" : "text-[#1f1a16]";
  const textMuted = isDarkMode ? "text-[#bcb0a8]" : "text-[#6f6258]";
  const subtleText = isDarkMode ? "text-[#9e928a]" : "text-[#8b7a6f]";
  const activeButton = "border-[#ff824d] bg-[#ff824d] text-white";
  const inactiveButton = isDarkMode
    ? "border-[#3a332f] bg-[#2b2825] text-[#d8cec7] hover:bg-[#34302c]"
    : "border-[#dfd8d2] bg-white text-[#554941] hover:bg-[#fff4ec]";
  const chipClass = isDarkMode
    ? "border-[#4a4038] bg-[#312d29] text-[#f0e6df]"
    : "border-[#eadfd7] bg-[#fff7f1] text-[#554941]";

  const monthLabel = `${currentMonth.getFullYear()}.${String(
    currentMonth.getMonth() + 1,
  ).padStart(2, "0")}`;
  const startWeekday = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1,
  ).getDay();
  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0,
  ).getDate();
  const dayCells = [
    ...Array.from({ length: startWeekday }).map(() => null),
    ...Array.from({ length: daysInMonth }).map((_, index) => index + 1),
  ];

  return (
    <div className="h-full min-h-0 overflow-hidden">
      <div className="mx-auto flex h-full w-full max-w-7xl flex-col gap-4">
        <header className={`rounded-2xl border px-5 py-4 ${cardClass}`}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className={`text-sm font-semibold ${subtleText}`}>GitHub Repository Updates</p>
              <h1 className={`mt-1 text-2xl font-semibold ${textMain}`}>업데이트 기록</h1>
              <p className={`mt-1 text-sm ${textMuted}`}>
                uou-capstone의 FE, BE, AI 레포지토리 최신 커밋 내역을 가져옵니다.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {loadedAt ? (
                <span className={`hidden text-xs sm:inline ${subtleText}`}>
                  갱신 {formatDateTime(loadedAt)}
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => void loadUpdates()}
                disabled={isLoading}
                aria-label="업데이트 새로고침"
                title="업데이트 새로고침"
                className={`inline-flex h-10 w-10 items-center justify-center rounded-[var(--app-control-radius)] border transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${inactiveButton}`}
              >
                <RefreshIcon className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {repoSummaries.map((repo) => (
              <a
                key={repo.part}
                href={repo.url}
                target="_blank"
                rel="noreferrer"
                className={`rounded-[var(--app-control-radius)] border p-3 transition-colors ${softCardClass}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="inline-flex rounded-full bg-[#ff824d] px-2.5 py-1 text-xs font-semibold text-white">
                      {repo.label}
                    </span>
                    <p className={`mt-2 text-sm font-semibold ${textMain}`}>{repo.name}</p>
                    <p className={`mt-0.5 truncate text-xs ${subtleText}`}>{repo.repo}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-semibold ${textMain}`}>{repo.count}</p>
                    <p className={`text-xs ${subtleText}`}>최근 커밋</p>
                  </div>
                </div>
                <p className={`mt-3 line-clamp-1 text-xs ${textMuted}`}>
                  {repo.latest ? repo.latest.title : "불러온 기록 없음"}
                </p>
              </a>
            ))}
          </div>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[20rem_1fr]">
          <aside className={`min-h-0 rounded-2xl border p-4 ${cardClass}`}>
            <div className="mb-4 flex flex-wrap gap-2">
              {(
                [
                  { value: "ALL", label: "전체" },
                  { value: "FE", label: "FE" },
                  { value: "BE", label: "BE" },
                  { value: "AI", label: "AI" },
                ] as const
              ).map((part) => {
                const selected = partFilter === part.value;
                return (
                  <button
                    key={part.value}
                    type="button"
                    onClick={() => setPartFilter(part.value)}
                    className={`h-9 rounded-[var(--app-control-radius)] border px-3 text-sm font-medium transition-colors ${
                      selected ? activeButton : inactiveButton
                    }`}
                  >
                    {part.label}
                  </button>
                );
              })}
            </div>

            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                aria-label="이전 달"
                onClick={() =>
                  setCurrentMonth(
                    new Date(
                      currentMonth.getFullYear(),
                      currentMonth.getMonth() - 1,
                      1,
                    ),
                  )
                }
                className={`h-8 w-8 rounded-[var(--app-control-radius)] border text-sm transition-colors ${inactiveButton}`}
              >
                ‹
              </button>
              <div className={`text-sm font-semibold ${textMain}`}>{monthLabel}</div>
              <button
                type="button"
                aria-label="다음 달"
                onClick={() =>
                  setCurrentMonth(
                    new Date(
                      currentMonth.getFullYear(),
                      currentMonth.getMonth() + 1,
                      1,
                    ),
                  )
                }
                className={`h-8 w-8 rounded-[var(--app-control-radius)] border text-sm transition-colors ${inactiveButton}`}
              >
                ›
              </button>
            </div>

            <div className={`mb-2 grid grid-cols-7 text-center text-xs ${subtleText}`}>
              {["일", "월", "화", "수", "목", "금", "토"].map((weekday) => (
                <span key={weekday}>{weekday}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {dayCells.map((day, index) => {
                if (day == null) {
                  return <div key={`empty-${index}`} className="h-11" />;
                }

                const key = toKey(
                  new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day),
                );
                const count = dateCounts.get(key) ?? 0;
                const hasLogs = count > 0;
                const selected = selectedDate === key;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedDate(key)}
                    className={`h-11 rounded-[var(--app-control-radius)] border text-xs transition-colors ${
                      selected
                        ? "border-[#ff824d] bg-[#ff824d] text-white"
                        : hasLogs
                          ? isDarkMode
                            ? "border-[#6f4a37] bg-[#3a302b] text-[#ffb08b] hover:bg-[#43362f]"
                            : "border-[#ffd5c2] bg-[#fff3ec] text-[#d95d26] hover:bg-[#ffe9dc]"
                          : inactiveButton
                    }`}
                  >
                    <span className="flex h-full flex-col items-center justify-center">
                      <span>{day}</span>
                      {hasLogs ? <span className="mt-0.5 text-[10px]">{count}</span> : null}
                    </span>
                  </button>
                );
              })}
            </div>

            {error ? (
              <div
                className={`mt-4 rounded-[var(--app-control-radius)] border px-3 py-2 text-xs ${
                  isDarkMode
                    ? "border-red-900/60 bg-red-950/30 text-red-200"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {error}
              </div>
            ) : null}
          </aside>

          <section
            className={`min-h-0 overflow-y-auto rounded-2xl border p-4 ${cardClass}`}
            aria-busy={isLoading}
          >
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className={`text-sm font-semibold ${subtleText}`}>
                  {partFilter === "ALL" ? "전체 레포지토리" : `${partFilter} 레포지토리`}
                </p>
                <h2 className={`mt-1 text-xl font-semibold ${textMain}`}>
                  {formatDateLabel(selectedDate)}
                </h2>
              </div>
              <span className={`text-sm ${textMuted}`}>
                {recordsOnSelectedDate.length}건의 업데이트
              </span>
            </div>

            {isLoading && records.length === 0 ? (
              <div className={`rounded-[var(--app-control-radius)] border p-5 ${softCardClass}`}>
                <p className={`text-sm ${textMuted}`}>GitHub 업데이트 내역을 불러오는 중입니다.</p>
              </div>
            ) : recordsOnSelectedDate.length === 0 ? (
              <div className={`rounded-[var(--app-control-radius)] border p-5 ${softCardClass}`}>
                <p className={`text-sm ${textMuted}`}>선택한 날짜의 업데이트 기록이 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recordsOnSelectedDate.map((record) => (
                  <article
                    key={record.id}
                    className={`rounded-[var(--app-control-radius)] border p-4 ${softCardClass}`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className="inline-flex rounded-full bg-[#ff824d] px-2.5 py-1 text-xs font-semibold text-white">
                            {record.part}
                          </span>
                          <span className={`rounded-full border px-2.5 py-1 text-xs ${chipClass}`}>
                            {record.repoName}
                          </span>
                          <span className={`rounded-full border px-2.5 py-1 text-xs ${chipClass}`}>
                            #{record.hash}
                          </span>
                        </div>
                        <h3 className={`text-base font-semibold ${textMain}`}>{record.title}</h3>
                        <p className={`mt-1 text-xs ${subtleText}`}>
                          {record.author} · {formatDateTime(record.isoDate)}
                        </p>
                      </div>
                      <a
                        href={record.url}
                        target="_blank"
                        rel="noreferrer"
                        className={`inline-flex shrink-0 items-center justify-center rounded-[var(--app-control-radius)] border px-3 py-2 text-sm font-medium transition-colors ${inactiveButton}`}
                      >
                        GitHub에서 보기
                      </a>
                    </div>

                    {record.body ? (
                      <pre
                        className={`mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded-[var(--app-control-radius)] border p-3 text-xs leading-5 ${
                          isDarkMode
                            ? "border-[#3a332f] bg-[#242220] text-[#d8cec7]"
                            : "border-[#eadfd7] bg-white text-[#554941]"
                        }`}
                      >
                        {record.body}
                      </pre>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default UpdatesPage;
