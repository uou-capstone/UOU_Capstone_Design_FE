import React, { useMemo, useState } from "react";
import { useTheme } from "../../contexts/ThemeContext";

type UpdatePart = "AI" | "BE" | "FE";
type UpdateRecord = {
  id: string;
  date: string; // YYYY-MM-DD
  part: UpdatePart;
  hash: string;
  title: string;
};

const records: UpdateRecord[] = [
  { id: "5926f0a", date: "2025-09-14", part: "FE", hash: "5926f0a", title: "기본 파일구조 세팅" },
  { id: "1843945", date: "2025-09-14", part: "FE", hash: "1843945", title: "LMS 레이아웃 구현 및 Tailwind CSS 설정" },
  { id: "6e4ad46", date: "2025-09-16", part: "FE", hash: "6e4ad46", title: "레이아웃/목업 업데이트" },
  { id: "f89a8b7", date: "2025-10-05", part: "FE", hash: "f89a8b7", title: "JavaScript -> TypeScript 전환" },
  { id: "e792f3d", date: "2025-10-05", part: "FE", hash: "e792f3d", title: "TypeScript 전환 브랜치 병합" },
  { id: "b30ee32", date: "2025-10-06", part: "FE", hash: "b30ee32", title: "다크모드 구현 완료 및 코드 정리" },
  { id: "6c35638", date: "2025-10-06", part: "FE", hash: "6c35638", title: "TypeScript 전환 후속 병합" },
  { id: "ec83626", date: "2025-10-06", part: "FE", hash: "ec83626", title: "API 연결" },
  { id: "ad9cc2a", date: "2025-10-06", part: "FE", hash: "ad9cc2a", title: "API 연결 변경 병합" },
  { id: "b935c9b", date: "2025-11-08", part: "FE", hash: "b935c9b", title: "대기 중 변경분 동기화" },
  { id: "e8a6f66", date: "2025-11-08", part: "FE", hash: "e8a6f66", title: "동기화 커밋 병합" },
  { id: "6e92148", date: "2025-11-09", part: "FE", hash: "6e92148", title: "API 테스트 페이지 추가 및 백엔드 연동" },
  { id: "b388514", date: "2025-11-09", part: "FE", hash: "b388514", title: "API 테스트 페이지 개선 및 Swagger 링크 추가" },
  { id: "3f25b45", date: "2025-11-09", part: "FE", hash: "3f25b45", title: "채팅 UI 개선 및 파일 업로드 기능 추가" },
  { id: "cca356d", date: "2025-11-10", part: "FE", hash: "cca356d", title: "사이드바 리사이즈 기능 추가 및 README 보완" },
  { id: "348b53c", date: "2025-11-10", part: "FE", hash: "348b53c", title: "강의실 목록 레이아웃/사이드바 워크플로우 개선" },
  { id: "7412d67", date: "2025-11-11", part: "FE", hash: "7412d67", title: "레이아웃 사이드바 및 TopNav 업데이트" },
  { id: "463dfc3", date: "2025-11-11", part: "FE", hash: "463dfc3", title: "사이드바 패딩/테마 토글 조정" },
  { id: "35ff839", date: "2025-11-12", part: "FE", hash: "35ff839", title: "프로필 아바타, 마크다운 채팅, 업로드 지속성, 미사용 코드 정리" },
  { id: "10b96fc", date: "2025-11-16", part: "FE", hash: "10b96fc", title: "스트리밍 학습 플로우 적용 및 마크다운 렌더링 개선" },
  { id: "dd8ea13", date: "2025-11-16", part: "FE", hash: "dd8ea13", title: "스트리밍 플로우 병합" },
  { id: "84f68cc", date: "2025-11-18", part: "FE", hash: "84f68cc", title: "백엔드 서버 주소/프록시 설정 정리" },
  { id: "e06d19f", date: "2025-11-19", part: "FE", hash: "e06d19f", title: "Netlify 프록시 설정으로 Mixed Content 문제 해결" },
  { id: "6cc7eca", date: "2025-11-19", part: "FE", hash: "6cc7eca", title: "재배포 트리거" },
  { id: "7f2689e", date: "2025-11-19", part: "FE", hash: "7f2689e", title: "백엔드 포트 설정 조정(포트 제거)" },
  { id: "66a38a8", date: "2025-11-19", part: "FE", hash: "66a38a8", title: "백엔드 포트 설정 조정(8080 추가)" },
  { id: "d11f4e5", date: "2025-11-19", part: "FE", hash: "d11f4e5", title: "백엔드 서버 HTTPS 도메인 적용" },
  { id: "902bf1a", date: "2025-11-19", part: "FE", hash: "902bf1a", title: "파일 업로드 UX 개선 및 채팅 입력창 동적 높이 조절" },
  { id: "7303083", date: "2025-11-19", part: "FE", hash: "7303083", title: "강의 미선택 상태 안내/버튼 노출 보강" },
  { id: "d1dfe5a", date: "2025-11-19", part: "FE", hash: "d1dfe5a", title: "AI 스트리밍 중지 기능 추가" },
  { id: "15bb711", date: "2025-11-21", part: "FE", hash: "15bb711", title: "스트리밍 PROCESSING 로직 및 중지 버튼 개선" },
  { id: "af070e7", date: "2025-11-21", part: "FE", hash: "af070e7", title: "PROCESSING 에러/질문 응답 대기 안내 개선" },
  { id: "7101f12", date: "2025-11-23", part: "FE", hash: "7101f12", title: "스트리밍 UI 개선 및 자동 로그아웃 기능 추가" },
  { id: "e047efe", date: "2025-11-23", part: "FE", hash: "e047efe", title: "메인 페이지 사이드바 및 설정 페이지 구현" },
  { id: "aaae550", date: "2025-11-24", part: "FE", hash: "aaae550", title: "메뉴 구조/UI 개선 및 버튼 인터랙션 정리" },
  { id: "01e099a", date: "2025-11-24", part: "FE", hash: "01e099a", title: "강의 목록 UI 정렬 개선(OT 우선)" },
  { id: "9dd111b", date: "2025-11-24", part: "FE", hash: "9dd111b", title: "비밀번호 찾기/소셜 로그인 UI/트럭 로더 업데이트" },
  { id: "8b515fb", date: "2025-11-26", part: "FE", hash: "8b515fb", title: "사이드바/로그인/로딩 화면 UI 개선" },
  { id: "774c1b2", date: "2025-11-26", part: "FE", hash: "774c1b2", title: "기능 추가 및 UI 개선" },
  { id: "520fa36", date: "2025-11-26", part: "FE", hash: "520fa36", title: "프로필 영역 레이아웃 및 API 에러 처리 개선" },
  { id: "39f0558", date: "2025-11-26", part: "FE", hash: "39f0558", title: "강의 레이아웃/사이드바 업데이트" },
  { id: "8404e6b", date: "2025-11-27", part: "FE", hash: "8404e6b", title: "사이드바 및 설정 스타일 업데이트" },
  { id: "ffe4fee", date: "2025-11-27", part: "FE", hash: "ffe4fee", title: "우측 사이드바 인터랙션 업데이트" },
  { id: "891c702", date: "2025-11-29", part: "FE", hash: "891c702", title: "OT 페이지 표기/박스 높이 조정" },
  { id: "a0a6c6f", date: "2025-11-30", part: "FE", hash: "a0a6c6f", title: "AppLayout 단순화 및 타입/의존성 오류 정리" },
  { id: "9260bf9", date: "2025-12-02", part: "FE", hash: "9260bf9", title: "HelpPage 추가 및 UI 일관성 개선" },
  { id: "7459284", date: "2025-12-02", part: "FE", hash: "7459284", title: "HelpPage/로그인 기능 리스트 단순화" },
  { id: "2dd5ac0", date: "2025-12-02", part: "FE", hash: "2dd5ac0", title: "중지 버튼 hover/크기 일치 수정" },
  { id: "40229b5", date: "2025-12-06", part: "FE", hash: "40229b5", title: "User 타입 profileImageUrl 속성 추가" },
  { id: "053b582", date: "2026-03-06", part: "FE", hash: "053b582", title: "[v2] 버튼 커서/시험생성·강의실참여 API/강의실 ID 노출 개선" },
  { id: "90d58dd", date: "2026-03-08", part: "FE", hash: "90d58dd", title: "[v2] Phase1~5 자료생성 모달·async 연동·PDF UI 개선" },
  { id: "54e168c", date: "2026-03-10", part: "FE", hash: "54e168c", title: "[v2] 시험/강의자료/스트리밍 UX 개선" },
  { id: "4102cf6", date: "2026-03-10", part: "FE", hash: "4102cf6", title: "[v2] 자료생성/시험생성 에이전트 연동 및 호출 로직 수정" },
  { id: "13159e6", date: "2026-03-10", part: "FE", hash: "13159e6", title: "[v2] backend-be 서브모듈 제거" },
  { id: "3a4b7c8", date: "2026-03-11", part: "FE", hash: "3a4b7c8", title: "최근 사용한 기획안 불러오기(latest-session) 연동" },
  { id: "3eca00b", date: "2026-03-11", part: "FE", hash: "3eca00b", title: "강의자료 업로드/미리보기/삭제 연동 및 에러 안내 보강" },
  { id: "0d6b91f", date: "2026-03-11", part: "FE", hash: "0d6b91f", title: "로그인/회원가입 테마 통일 및 시험/에이전트 UI 개선" },
  { id: "bfc0275", date: "2026-03-12", part: "FE", hash: "bfc0275", title: "강의실 설명 선택 처리/채팅창 개선/리소스 카드 버튼 정리" },
  { id: "93d9007", date: "2026-03-12", part: "FE", hash: "93d9007", title: "시험 생성/강의자료/Q&A 답변 API 및 UI 개선" },
  { id: "77de0a4", date: "2026-03-12", part: "FE", hash: "77de0a4", title: "강의자료 생성 API 보완 및 완료 목록 반영" },
  { id: "817c4fe", date: "2026-03-12", part: "FE", hash: "817c4fe", title: "latest-session 보완: 생성 완료 문서 표시" },
  { id: "63ead33", date: "2026-03-12", part: "FE", hash: "63ead33", title: "강의실 목록/강의 페이지 UI 개선 및 버그 수정" },
  { id: "a72292b", date: "2026-03-15", part: "FE", hash: "a72292b", title: "finalDocument 표시/마크다운 URL fetch 방지/모달 렌더링" },
  { id: "0ae525f", date: "2026-03-15", part: "FE", hash: "0ae525f", title: "강의 자료 미리보기 finalDocument 기반 표시 보완" },
  { id: "8e6c3d2", date: "2026-03-15", part: "FE", hash: "8e6c3d2", title: "시험 유형 코드 SHORT_ANSWER/DEBATE 변경" },
  { id: "f2588e2", date: "2026-03-17", part: "FE", hash: "f2588e2", title: "설정 페이지 복구 및 UI 스타일 정리" },
  { id: "644cb16", date: "2026-03-17", part: "FE", hash: "644cb16", title: "설정 페이지 헤더 정리/TopNav 정렬/리소스 메뉴 개선" },
  { id: "6cad727", date: "2026-03-18", part: "FE", hash: "6cad727", title: "RightSidebar JSX/강의 로딩 병렬화/정렬·버튼 스타일 개선" },
  { id: "6c7d470", date: "2026-03-18", part: "FE", hash: "6c7d470", title: "프로필 메뉴/테마 전환/시험 만들기 옵션화 개선" },
  { id: "bb12ca6", date: "2026-03-18", part: "FE", hash: "bb12ca6", title: "로딩 화면 Newton's cradle 애니메이션 적용" },
  { id: "d4de13d", date: "2026-03-19", part: "FE", hash: "d4de13d", title: "PDF 뷰어 개선 및 신고 페이지 추가" },
  { id: "4282f62", date: "2026-03-19", part: "FE", hash: "4282f62", title: "수정/삭제 모드 UI 개선(헤더 버튼/선택 상태)" },
  { id: "b35805c", date: "2026-03-20", part: "FE", hash: "b35805c", title: "강의 만들기 드롭다운/신고 이동/시험 폴링/PDF 배율 개선" },
  { id: "cfa8eef", date: "2026-03-26", part: "FE", hash: "cfa8eef", title: "마크다운 미리보기 목차/미니맵 및 TOC 파싱" },
  { id: "6bee9c1", date: "2026-03-27", part: "FE", hash: "6bee9c1", title: "시험 생성/레이아웃/마크다운/API 연동 개선" },
  { id: "febbde6", date: "2026-04-01", part: "FE", hash: "febbde6", title: "강의 에이전트 Legacy stream·SSE 연동 및 레이아웃 개선" },
  { id: "fd5f1fe", date: "2026-04-01", part: "FE", hash: "fd5f1fe", title: "통합학습 API learning/sessions 연동·401 처리·프록시" },
  { id: "4d99553", date: "2026-04-02", part: "FE", hash: "4d99553", title: "강의 에이전트 스트림·스웨거 정합" },
  { id: "37fd954", date: "2026-04-03", part: "FE", hash: "37fd954", title: "자료 뷰 50/50 분할/리사이즈, SSE 즉시 스트리밍 반영" },
];

function toDate(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function toKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const UpdatesPage: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [partFilter, setPartFilter] = useState<UpdatePart>("FE");

  const partRecords = useMemo(
    () => records.filter((r) => r.part === partFilter),
    [partFilter],
  );
  const dateCounts = useMemo(() => {
    const map = new Map<string, number>();
    partRecords.forEach((r) => map.set(r.date, (map.get(r.date) ?? 0) + 1));
    return map;
  }, [partRecords]);
  const orderedDates = useMemo(
    () => [...new Set(partRecords.map((r) => r.date))].sort(),
    [partRecords],
  );

  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const last = orderedDates[orderedDates.length - 1];
    const base = last ? toDate(last) : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return orderedDates[orderedDates.length - 1] ?? toKey(new Date());
  });

  const recordsOnSelectedDate = useMemo(
    () => partRecords.filter((r) => r.date === selectedDate),
    [partRecords, selectedDate],
  );

  const cardClass = isDarkMode
    ? "border-zinc-700 bg-zinc-900/60"
    : "border-gray-200 bg-white";
  const textMuted = isDarkMode ? "text-gray-400" : "text-gray-500";
  const textMain = isDarkMode ? "text-white" : "text-gray-900";

  const monthLabel = `${currentMonth.getFullYear()}-${String(
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
    ...Array.from({ length: daysInMonth }).map((_, i) => i + 1),
  ];

  return (
    <div className="h-full min-h-0 overflow-hidden">
      <div className="mx-auto grid h-full w-full max-w-7xl grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        <aside className={`rounded-2xl border p-4 ${cardClass} min-h-0`}>
          <div className="mb-4 flex flex-wrap gap-2">
            {(["AI", "BE", "FE"] as const).map((part) => {
              const selected = partFilter === part;
              return (
                <button
                  key={part}
                  type="button"
                  onClick={() => setPartFilter(part)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium cursor-pointer ${
                    selected
                      ? "bg-emerald-600 text-white"
                      : isDarkMode
                      ? "bg-zinc-800 text-gray-300 hover:bg-zinc-700"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {part}
                </button>
              );
            })}
          </div>

          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() =>
                setCurrentMonth(
                  new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1),
                )
              }
              className={`rounded px-2 py-1 text-sm cursor-pointer ${
                isDarkMode ? "hover:bg-zinc-800" : "hover:bg-gray-100"
              }`}
            >
              ◀
            </button>
            <div className={`text-sm font-semibold ${textMain}`}>{monthLabel}</div>
            <button
              type="button"
              onClick={() =>
                setCurrentMonth(
                  new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1),
                )
              }
              className={`rounded px-2 py-1 text-sm cursor-pointer ${
                isDarkMode ? "hover:bg-zinc-800" : "hover:bg-gray-100"
              }`}
            >
              ▶
            </button>
          </div>

          <div className={`mb-2 grid grid-cols-7 text-center text-xs ${textMuted}`}>
            {["일", "월", "화", "수", "목", "금", "토"].map((w) => (
              <span key={w}>{w}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {dayCells.map((d, idx) => {
              if (d == null) return <div key={`empty-${idx}`} className="h-12" />;
              const key = toKey(
                new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d),
              );
              const count = dateCounts.get(key) ?? 0;
              const selected = selectedDate === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDate(key)}
                  className={`h-12 rounded-md border text-xs cursor-pointer ${
                    selected
                      ? "border-emerald-500 bg-emerald-500/20 text-emerald-500"
                      : isDarkMode
                      ? "border-zinc-700 hover:bg-zinc-800 text-gray-300"
                      : "border-gray-200 hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  <div>{d}</div>
                  {count > 0 ? (
                    <div className="text-[10px] opacity-80">{count}건</div>
                  ) : null}
                </button>
              );
            })}
          </div>
        </aside>

        <section className={`rounded-2xl border p-4 ${cardClass} min-h-0 overflow-y-auto`}>
          <div className="mb-4">
            <h1 className={`text-xl font-semibold ${textMain}`}>업데이트 기록</h1>
            <p className={`text-sm ${textMuted}`}>
              선택한 날짜: {selectedDate} · 파트: {partFilter}
            </p>
          </div>

          {recordsOnSelectedDate.length === 0 ? (
            <div className={`rounded-xl border p-4 ${isDarkMode ? "border-zinc-700" : "border-gray-200"}`}>
              <p className={`text-sm ${textMuted}`}>해당 날짜 기록이 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recordsOnSelectedDate.map((r, idx) => (
                <article
                  key={r.id}
                  className={`rounded-xl border p-4 ${
                    isDarkMode ? "border-zinc-700 bg-zinc-900/40" : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h2 className={`text-sm font-semibold ${textMain}`}>
                      {idx + 1}. {r.title}
                    </h2>
                    <span className={`text-xs ${textMuted}`}>#{r.hash}</span>
                  </div>
                  <ul className={`space-y-1 text-sm ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                    <li>- 목표: 사용자 시나리오 품질과 기능 안정성 개선</li>
                    <li>- 어려운 점: 기존 흐름과 충돌 없이 변경 범위를 최소화해야 함</li>
                    <li>- 에러/리스크: 상태 전환, 라우팅, UI 밀도에 따른 회귀 가능성</li>
                    <li>- 해결 과정: 점진 반영 + 타입/린트 점검 + 동작 검증 순으로 정리</li>
                  </ul>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default UpdatesPage;
