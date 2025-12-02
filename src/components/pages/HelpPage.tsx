import React from "react";
import { useTheme } from "../../contexts/ThemeContext";

const HelpPage: React.FC = () => {
  const { isDarkMode } = useTheme();

  return (
    <div className="flex flex-col gap-1.5 h-full">
      <div>
        <header className="mb-2">
          <h1 className={`text-xl font-semibold mb-2 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
            사용 가이드
          </h1>
          <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
            AI 튜터링 시스템을 효과적으로 사용하는 방법을 안내합니다.
          </p>
        </header>

        <div className="space-y-6">
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
                <li>좌측 사이드바에서 "강의" 메뉴를 선택합니다.</li>
                <li>교수자 권한이 있다면 "새 강의실 만들기" 버튼을 클릭하여 강의실을 생성할 수 있습니다.</li>
                <li>생성된 강의실을 클릭하면 해당 강의실의 상세 페이지로 이동합니다.</li>
              </ul>
            </div>
            <div>
              <h3 className={`font-medium mb-2 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                2. 강의 생성
              </h3>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>강의실 상세 페이지에서 우측 사이드바의 "새 강의 만들기" 버튼을 클릭합니다.</li>
                <li>강의 제목, 주차 번호, 설명을 입력하여 강의를 생성합니다.</li>
                <li>생성된 강의는 좌측 사이드바의 강의 목록에 표시됩니다.</li>
              </ul>
            </div>
            <div>
              <h3 className={`font-medium mb-2 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                3. 학습 자료 업로드
              </h3>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>학습할 강의를 좌측 사이드바에서 선택합니다.</li>
                <li>우측 채팅창에 학습 자료 PDF 파일을 드래그 앤 드롭합니다.</li>
                <li>지원되는 파일 형식: PDF만 가능합니다</li>
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
                <li>파일을 업로드한 후, 채팅 입력창에서 <kbd className={`px-2 py-1 rounded text-xs font-mono ${isDarkMode ? "bg-zinc-800 text-emerald-400" : "bg-gray-100 text-emerald-600"}`}>Enter</kbd> 키를 눌러 학습을 시작합니다.</li>
                <li>AI가 학습 자료를 분석하고 개념 설명을 제공합니다.</li>
              </ul>
            </div>
            <div>
              <h3 className={`font-medium mb-2 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                2. 학습 진행
              </h3>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>AI가 개념 설명을 제공한 후, <kbd className={`px-2 py-1 rounded text-xs font-mono ${isDarkMode ? "bg-zinc-800 text-emerald-400" : "bg-gray-100 text-emerald-600"}`}>Enter</kbd> 키를 눌러 다음 세그먼트(질문)로 진행합니다.</li>
                <li>AI가 질문을 제시하면, 답변을 입력하고 <kbd className={`px-2 py-1 rounded text-xs font-mono ${isDarkMode ? "bg-zinc-800 text-emerald-400" : "bg-gray-100 text-emerald-600"}`}>Enter</kbd> 키를 눌러 제출합니다.</li>
                <li>AI가 답변에 대한 보충 설명을 제공하고, 학습이 계속 진행됩니다.</li>
              </ul>
            </div>
            <div>
              <h3 className={`font-medium mb-2 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                3. 학습 중지
              </h3>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>학습 중에는 채팅창 오른쪽에 중지 버튼이 표시됩니다.</li>
                <li>중지 버튼을 클릭하면 현재 학습 세션을 중지할 수 있습니다.</li>
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
                <li><strong>강의 수정:</strong> 강의 목록에서 강의를 우클릭하거나 메뉴 버튼을 클릭하여 제목, 주차, 설명을 수정할 수 있습니다.</li>
                <li><strong>강의 삭제:</strong> 강의 메뉴에서 삭제 옵션을 선택하여 강의를 삭제할 수 있습니다.</li>
                <li><strong>강의실 수정/삭제:</strong> 강의실 목록에서 강의실을 수정하거나 삭제할 수 있습니다.</li>
              </ul>
            </div>
            <div>
              <h3 className={`font-medium mb-2 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                초대 링크 (교수자)
              </h3>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>강의실 상세 페이지에서 "초대 링크 복사" 버튼을 클릭하여 학생을 초대할 수 있습니다.</li>
                <li>복사된 링크를 학생에게 공유하면 해당 강의실에 참여할 수 있습니다.</li>
              </ul>
            </div>
            <div>
              <h3 className={`font-medium mb-2 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                사이드바 조절
              </h3>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>좌측 사이드바는 화면 왼쪽 상단의 토글 버튼으로 접기/펼치기가 가능합니다.</li>
                <li>우측 사이드바는 구분선을 드래그하여 너비를 조절할 수 있습니다.</li>
                <li>우측 사이드바 구분선을 더블클릭하면 기본 너비로 복원됩니다.</li>
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
        <section className={`p-4 rounded-lg border ${isDarkMode ? "bg-zinc-800/50 border-zinc-700" : "bg-gray-50 border-gray-200"}`}>
          <h2 className={`text-lg font-semibold mb-4 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
            ❓ 문제 해결
          </h2>
          <div className={`space-y-4 text-sm ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
            <div>
              <h3 className={`font-medium mb-2 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                파일 업로드가 안 될 때
              </h3>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>PDF 파일 형식인지 확인하세요 (PDF만 지원됩니다)</li>
                <li>파일 크기가 너무 크지 않은지 확인하세요</li>
                <li>로그인이 되어 있는지 확인하세요</li>
                <li>페이지를 새로고침하고 다시 시도해보세요</li>
              </ul>
            </div>
            <div>
              <h3 className={`font-medium mb-2 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                학습이 시작되지 않을 때
              </h3>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>파일이 정상적으로 업로드되었는지 확인하세요</li>
                <li>강의가 선택되어 있는지 확인하세요</li>
                <li>네트워크 연결 상태를 확인하세요</li>
                <li>잠시 후 다시 시도하거나 페이지를 새로고침하세요</li>
              </ul>
            </div>
            <div>
              <h3 className={`font-medium mb-2 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                기타 문제
              </h3>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>문제가 지속되면 페이지를 새로고침하세요</li>
                <li>브라우저 캐시를 삭제하고 다시 시도해보세요</li>
                <li>다른 브라우저에서 시도해보세요</li>
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

