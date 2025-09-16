import React, { useState } from "react";
import { useParams, useLocation } from "react-router-dom";

const MainContent = ({ aiGeneratedContent }) => {
  const [content, setContent] = useState(aiGeneratedContent || "");
  const { week } = useParams();
  const location = useLocation();

  // 마크다운을 HTML로 변환하는 간단한 함수
  const renderMarkdown = (markdown) => {
    if (!markdown) return "";
    
    return markdown
      .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold text-white mb-4">$1</h1>')
      .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-semibold text-white mb-3 mt-6">$1</h2>')
      .replace(/^### (.*$)/gim, '<h3 class="text-xl font-medium text-white mb-2 mt-4">$1</h3>')
      .replace(/^\- (.*$)/gim, '<li class="text-gray-300 mb-1">• $1</li>')
      .replace(/^\d+\. (.*$)/gim, '<li class="text-gray-300 mb-1">$1</li>')
      .replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-800 p-4 rounded-lg overflow-x-auto my-4"><code class="text-green-400">$1</code></pre>')
      .replace(/`([^`]+)`/g, '<code class="bg-gray-700 px-2 py-1 rounded text-green-400">$1</code>')
      .replace(/---/g, '<hr class="border-gray-600 my-6">')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="text-gray-300 italic">$1</em>')
      .replace(/\n\n/g, '</p><p class="text-gray-300 mb-4">')
      .replace(/^(?!<[h|l|p|d|s])(.*$)/gim, '<p class="text-gray-300 mb-4">$1</p>');
  };

  // AI 생성된 콘텐츠가 변경될 때마다 업데이트
  React.useEffect(() => {
    if (aiGeneratedContent) {
      setContent(aiGeneratedContent);
    }
  }, [aiGeneratedContent]);

  // 주차별 컨텐츠 생성
  const getWeekContent = () => {
    if (week) {
      return `# ${week}주차 강의자료

## 개요
이 문서는 ${week}주차 강의자료입니다.

## 주요 내용
- 주차: ${week}주차
- 생성 시간: ${new Date().toLocaleString()}

## 상세 내용
${week}주차 강의자료 내용이 여기에 표시됩니다.

### 1. 핵심 개념
- 개념 1
- 개념 2
- 개념 3

### 2. 실습 예제
\`\`\`python
# ${week}주차 예제 코드
print("Week ${week} Example!")
\`\`\`

### 3. 연습 문제
1. 문제 1
2. 문제 2
3. 문제 3

---
*이 문서는 ${week}주차 강의자료입니다.*`;
    } else {
      return `# 전체 강의자료

## 개요
모든 주차의 강의자료를 한번에 볼 수 있습니다.

## 주차별 요약
- 1주차: 기초 개념
- 2주차: 심화 내용
- 3주차: 실습 예제
- ... (모든 주차)

## 전체 목차
1. 1주차 - 기초 개념
2. 2주차 - 심화 내용
3. 3주차 - 실습 예제
4. 4주차 - 프로젝트
5. 5주차 - 고급 주제
6. 6주차 - 종합 실습
7. 7주차 - 팀 프로젝트
8. 8주차 - 발표 및 평가
9. 9주차 - 심화 학습
10. 10주차 - 실무 적용
11. 11주차 - 최종 프로젝트
12. 12주차 - 종합 평가

---
*전체 강의자료 요약입니다.*`;
    }
  };

  const displayContent = content || getWeekContent();

  return (
    <div className="flex-1 min-h-0 p-6 overflow-y-auto bg-gray-900">
      <div className="max-w-4xl mx-auto">
        <div 
          className="prose prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(displayContent) }}
        />
      </div>
    </div>
  );
};

export default MainContent;
