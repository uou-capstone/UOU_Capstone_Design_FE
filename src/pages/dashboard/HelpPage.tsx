import React from "react";
import { useTheme } from "../../contexts/ThemeContext";

const HelpPage: React.FC = () => {
  const { isDarkMode } = useTheme();

  return (
    <div className="flex flex-col gap-1.5 h-full">
      <div>
        <header className="mb-2">
          <h1 className={`text-xl font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
            사용 가이드
          </h1>
        </header>

        <div className="grid grid-cols-2 gap-1.5">
        {/* 기본 사용법 */}
        <section className={`p-4 rounded-lg border ${isDarkMode ? "bg-zinc-800/50 border-zinc-700" : "bg-gray-50 border-gray-200"}`}>
          <h2 className={`text-lg font-semibold mb-4 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
            📚 기본 사용법
          </h2>
          <div className={`space-y-4 text-sm ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
            <div>
              <h3 className={`font-medium mb-2 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                1. 강의실 생성 및 선택
              </h3>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>"강의" 메뉴에서 "새 강의실 만들기"로 강의실 생성</li>
                <li>강의실 클릭 시 상세 페이지로 이동</li>
              </ul>
            </div>
            <div>
              <h3 className={`font-medium mb-2 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                2. 강의 생성
              </h3>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>우측 사이드바의 "새 강의 만들기"로 강의 생성</li>
                <li>강의 제목, 주차 번호, 설명 입력</li>
              </ul>
            </div>
            <div>
              <h3 className={`font-medium mb-2 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                3. 학습 자료 업로드
              </h3>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>강의 선택 후 우측 채팅창에 PDF 파일 드래그 앤 드롭</li>
                <li>또는 +버튼으로 파일 업로드</li>
              </ul>
            </div>
          </div>
        </section>

        {/* AI 학습 시작 */}
        <section className={`p-4 rounded-lg border ${isDarkMode ? "bg-zinc-800/50 border-zinc-700" : "bg-gray-50 border-gray-200"}`}>
          <h2 className={`text-lg font-semibold mb-4 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
            🤖 AI 학습 시작하기
          </h2>
          <div className={`space-y-4 text-sm ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
            <div>
              <h3 className={`font-medium mb-2 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                1. 학습 시작
              </h3>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>파일 업로드 후 <kbd className={`px-2 py-1 rounded text-xs font-mono ${isDarkMode ? "bg-zinc-800 text-emerald-400" : "bg-gray-100 text-emerald-600"}`}>Enter</kbd>로 학습 시작</li>
              </ul>
            </div>
            <div>
              <h3 className={`font-medium mb-2 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                2. 학습 진행
              </h3>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>개념 설명 후 <kbd className={`px-2 py-1 rounded text-xs font-mono ${isDarkMode ? "bg-zinc-800 text-emerald-400" : "bg-gray-100 text-emerald-600"}`}>Enter</kbd>로 다음 질문 진행</li>
                <li>질문에 답변 입력 후 <kbd className={`px-2 py-1 rounded text-xs font-mono ${isDarkMode ? "bg-zinc-800 text-emerald-400" : "bg-gray-100 text-emerald-600"}`}>Enter</kbd>로 제출</li>
              </ul>
            </div>
            <div>
              <h3 className={`font-medium mb-2 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                3. 학습 중지
              </h3>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>채팅창 오른쪽 중지 버튼으로 학습 중지</li>
              </ul>
            </div>
          </div>
        </section>

        {/* 주요 기능 */}
        <section className={`p-4 rounded-lg border ${isDarkMode ? "bg-zinc-800/50 border-zinc-700" : "bg-gray-50 border-gray-200"}`}>
          <h2 className={`text-lg font-semibold mb-4 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
            ⚙️ 주요 기능
          </h2>
          <div className={`space-y-4 text-sm ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
            <div>
              <h3 className={`font-medium mb-2 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                강의 관리 (교수자)
              </h3>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>강의 메뉴 버튼으로 수정/삭제</li>
                <li>강의실 목록에서 강의실 수정/삭제</li>
              </ul>
            </div>
            <div>
              <h3 className={`font-medium mb-2 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                초대 링크 (교수자)
              </h3>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>"초대 링크 복사" 버튼으로 학생 초대</li>
              </ul>
            </div>
            <div>
              <h3 className={`font-medium mb-2 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                사이드바 조절
              </h3>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>좌측 사이드바: 토글 버튼으로 접기/펼치기</li>
                <li>우측 사이드바: 구분선 드래그로 너비 조절, 더블클릭으로 기본값 복원</li>
              </ul>
            </div>
          </div>
        </section>

        {/* 키보드 단축키 */}
        <section className={`p-4 rounded-lg border ${isDarkMode ? "bg-zinc-800/50 border-zinc-700" : "bg-gray-50 border-gray-200"}`}>
          <h2 className={`text-lg font-semibold mb-4 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
            ⌨️ 키보드 단축키
          </h2>
          <div className={`space-y-2 text-sm ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
            <div className="flex items-center gap-3">
              <kbd className={`px-3 py-1.5 rounded font-mono text-xs ${isDarkMode ? "bg-zinc-800 text-emerald-400" : "bg-gray-100 text-emerald-600"}`}>
                Enter
              </kbd>
              <span>학습 시작 / 다음 세그먼트 진행 / 답변 제출</span>
            </div>
            <div className="flex items-center gap-3">
              <kbd className={`px-3 py-1.5 rounded font-mono text-xs ${isDarkMode ? "bg-zinc-800 text-emerald-400" : "bg-gray-100 text-emerald-600"}`}>
                Shift + Enter
              </kbd>
              <span>채팅 입력창에서 줄바꿈</span>
            </div>
          </div>
        </section>

        {/* 문제 해결 */}
        <section className={`p-4 pb-4 mb-1.5 col-span-2 rounded-lg border ${isDarkMode ? "bg-zinc-800/50 border-zinc-700" : "bg-gray-50 border-gray-200"}`}>
          <h2 className={`text-lg font-semibold mb-4 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
            ❓ 문제 해결
          </h2>
          <div className={`grid grid-cols-2 gap-4 text-sm ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
            <div>
              <h3 className={`font-medium mb-2 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                파일 업로드가 안 될 때
              </h3>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>PDF 파일 형식 확인 (PDF만 지원)</li>
                <li>로그인 상태 확인</li>
                <li>페이지 새로고침</li>
              </ul>
            </div>
            <div>
              <h3 className={`font-medium mb-2 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                학습이 시작되지 않을 때
              </h3>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>파일 업로드 상태 확인</li>
                <li>강의 선택 여부 확인</li>
                <li>네트워크 연결 확인</li>
              </ul>
            </div>
            <div>
              <h3 className={`font-medium mb-2 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                기타 문제
              </h3>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>페이지 새로고침</li>
                <li>브라우저 캐시 삭제</li>
              </ul>
            </div>
          </div>
        </section>
        </div>
      </div>
    </div>
  );
};

export default HelpPage;

