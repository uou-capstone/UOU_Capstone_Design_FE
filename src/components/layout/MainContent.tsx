import React, { useState, useEffect } from "react";
import { useParams, useLocation } from "react-router-dom";
import { useTheme } from "../../contexts/ThemeContext";
import { useLearningActivity } from "../../hooks/useLearningActivity";
import { useAssessments } from "../../hooks/useAssessments";
import { MainContentProps, SubmissionAnswer } from "../../types";

const MainContent: React.FC<MainContentProps> = ({ aiGeneratedContent }) => {
  const [content, setContent] = useState<string>(aiGeneratedContent || "");
  const [showInquiryForm, setShowInquiryForm] = useState<boolean>(false);
  const [inquiryText, setInquiryText] = useState<string>("");
  const [showQuiz, setShowQuiz] = useState<boolean>(false);
  const [showAssessment, setShowAssessment] = useState<boolean>(false);
  const [assessmentAnswers, setAssessmentAnswers] = useState<SubmissionAnswer[]>([]);
  const { week } = useParams<{ week?: string }>();
  const { isDarkMode } = useTheme();
  const { inquiryResponse, quizQuestions, isLoading, submitInquiry, generateSelfDiagnosisQuiz, clearInquiryResponse, clearQuizQuestions } = useLearningActivity();
  const { submitAnswers, getAssessmentSubmissions, isLoading: assessmentLoading } = useAssessments();
  const location = useLocation();

  // URL에서 lectureId 추출
  const getLectureId = (): number | null => {
    const pathParts = location.pathname.split('/');
    const lecturePart = pathParts[pathParts.length - 1];
    const lectureId = parseInt(lecturePart);
    return isNaN(lectureId) ? null : lectureId;
  };

  const lectureId = getLectureId();

  // 질문 제출 핸들러
  const handleSubmitInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lectureId || !inquiryText.trim()) return;

    const result = await submitInquiry(lectureId, { inquiryText });
    if (result.success) {
      setInquiryText("");
      setShowInquiryForm(false);
    }
  };

  // 퀴즈 생성 핸들러
  const handleGenerateQuiz = async () => {
    if (!lectureId) return;

    const result = await generateSelfDiagnosisQuiz(lectureId);
    if (result.success) {
      setShowQuiz(true);
    }
  };

  // 평가 제출 핸들러
  const handleSubmitAssessment = async () => {
    if (!lectureId) {
      alert("강의가 선택되지 않았습니다.");
      return;
    }

    // 임시 평가 ID (실제로는 URL에서 가져와야 함)
    const assessmentId = 1;
    
    const result = await submitAnswers(assessmentId, assessmentAnswers);
    if (result.success) {
      alert("답안이 성공적으로 제출되었습니다!");
      setShowAssessment(false);
      setAssessmentAnswers([]);
    } else {
      alert(`답안 제출에 실패했습니다: ${result.error}`);
    }
  };

  // 평가 현황 조회 핸들러 (선생님용)
  const handleViewAssessmentStatus = async () => {
    if (!lectureId) {
      alert("강의가 선택되지 않았습니다.");
      return;
    }

    // 임시 평가 ID (실제로는 URL에서 가져와야 함)
    const assessmentId = 1;
    
    const submissions = await getAssessmentSubmissions(assessmentId);
    console.log("Assessment submissions:", submissions);
    alert(`평가 현황: ${submissions.length}명의 학생이 제출했습니다.`);
  };

  // 마크다운을 HTML로 변환하는 간단한 함수
  const renderMarkdown = (markdown: string): string => {
    if (!markdown) return "";
    
    const textColor = isDarkMode ? "text-white" : "text-black";
    const textSecondaryColor = isDarkMode ? "text-gray-300" : "text-gray-700";
    const textTertiaryColor = isDarkMode ? "text-gray-400" : "text-gray-600";
    const bgColor = isDarkMode ? "bg-gray-700" : "bg-gray-100";
    const bgSecondaryColor = isDarkMode ? "bg-gray-600" : "bg-gray-200";
    const borderColor = isDarkMode ? "border-gray-600" : "border-gray-300";
    const codeColor = isDarkMode ? "text-green-400" : "text-green-600";
    
    return markdown
      .replace(/^# (.*$)/gim, `<h1 class="text-3xl font-bold ${textColor} mb-4">$1</h1>`)
      .replace(/^## (.*$)/gim, `<h2 class="text-2xl font-semibold ${textColor} mb-3 mt-6">$1</h2>`)
      .replace(/^### (.*$)/gim, `<h3 class="text-xl font-medium ${textColor} mb-2 mt-4">$1</h3>`)
      .replace(/^\- (.*$)/gim, `<li class="${textSecondaryColor} mb-1">• $1</li>`)
      .replace(/^\d+\. (.*$)/gim, `<li class="${textSecondaryColor} mb-1">$1</li>`)
      .replace(/```([\s\S]*?)```/g, `<pre class="${bgColor} p-4 rounded-lg overflow-x-auto my-4"><code class="${codeColor}">$1</code></pre>`)
      .replace(/`([^`]+)`/g, `<code class="${bgSecondaryColor} px-2 py-1 rounded ${codeColor}">$1</code>`)
      .replace(/---/g, `<hr class="border ${borderColor} my-6">`)
      .replace(/\*\*(.*?)\*\*/g, `<strong class="${textColor} font-semibold">$1</strong>`)
      .replace(/\*(.*?)\*/g, `<em class="${textTertiaryColor} italic">$1</em>`)
      .replace(/\n\n/g, `</p><p class="${textSecondaryColor} mb-4">`)
      .replace(/^(?!<[h|l|p|d|s])(.*$)/gim, `<p class="${textSecondaryColor} mb-4">$1</p>`);
  };

  // AI 생성된 콘텐츠가 변경될 때마다 업데이트
  useEffect(() => {
    if (aiGeneratedContent) {
      setContent(aiGeneratedContent);
    }
  }, [aiGeneratedContent]);

  // 주차별 컨텐츠 생성
  const getWeekContent = (): string => {
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
    <div className={`flex-1 min-h-0 p-6 overflow-y-auto scrollbar-hide transition-colors ${
      isDarkMode ? "bg-gray-800" : "bg-white"
    }`}>
      <div className="max-w-4xl mx-auto">
        <div 
          className={`prose max-w-none ${
            isDarkMode ? "prose-invert" : "prose-gray"
          }`}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(displayContent) }}
        />

        {/* 학습활동 섹션 - 특정 강의에서만 표시 */}
        {lectureId && (
          <div className={`mt-8 p-6 rounded-lg border ${
            isDarkMode ? "bg-gray-700 border-gray-600" : "bg-gray-50 border-gray-200"
          }`}>
            <h3 className={`text-xl font-semibold mb-4 ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}>학습활동</h3>

            {/* 학습활동 버튼들 */}
            <div className="flex gap-4 mb-6">
              <button
                onClick={() => setShowInquiryForm(!showInquiryForm)}
                className={`px-4 py-2 rounded-md transition-colors ${
                  isDarkMode 
                    ? "bg-blue-600 hover:bg-blue-700 text-white" 
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                🤚 손들 질문
              </button>
              <button
                onClick={handleGenerateQuiz}
                disabled={isLoading}
                className={`px-4 py-2 rounded-md transition-colors ${
                  isLoading 
                    ? "bg-gray-400 cursor-not-allowed" 
                    : isDarkMode 
                      ? "bg-green-600 hover:bg-green-700 text-white" 
                      : "bg-green-600 hover:bg-green-700 text-white"
                }`}
              >
                {isLoading ? "생성 중..." : "📝 자가 진단 퀴즈"}
              </button>
              <button
                onClick={() => setShowAssessment(!showAssessment)}
                className={`px-4 py-2 rounded-md transition-colors ${
                  isDarkMode 
                    ? "bg-purple-600 hover:bg-purple-700 text-white" 
                    : "bg-purple-600 hover:bg-purple-700 text-white"
                }`}
              >
                📋 평가 제출
              </button>
              <button
                onClick={handleViewAssessmentStatus}
                className={`px-4 py-2 rounded-md transition-colors ${
                  isDarkMode 
                    ? "bg-orange-600 hover:bg-orange-700 text-white" 
                    : "bg-orange-600 hover:bg-orange-700 text-white"
                }`}
              >
                📊 평가 현황
              </button>
            </div>

            {/* 질문 폼 */}
            {showInquiryForm && (
              <div className={`mb-6 p-4 rounded-lg ${
                isDarkMode ? "bg-gray-600" : "bg-white border"
              }`}>
                <h4 className={`text-lg font-medium mb-3 ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}>질문하기</h4>
                <form onSubmit={handleSubmitInquiry}>
                  <textarea
                    value={inquiryText}
                    onChange={(e) => setInquiryText(e.target.value)}
                    placeholder="강의 내용에 대해 궁금한 점을 질문해주세요..."
                    className={`w-full h-24 p-3 rounded-md border resize-none ${
                      isDarkMode 
                        ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400" 
                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                    }`}
                    required
                  />
                  <div className="flex justify-end gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => setShowInquiryForm(false)}
                      className={`px-4 py-2 rounded-md transition-colors ${
                        isDarkMode 
                          ? "bg-gray-600 hover:bg-gray-500 text-white" 
                          : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                      }`}
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading || !inquiryText.trim()}
                      className={`px-4 py-2 rounded-md transition-colors ${
                        isLoading || !inquiryText.trim()
                          ? "bg-gray-400 cursor-not-allowed" 
                          : "bg-blue-600 hover:bg-blue-700 text-white"
                      }`}
                    >
                      {isLoading ? "제출 중..." : "질문 제출"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* AI 응답 */}
            {inquiryResponse && (
              <div className={`mb-6 p-4 rounded-lg ${
                isDarkMode ? "bg-blue-900 border border-blue-700" : "bg-blue-50 border border-blue-200"
              }`}>
                <div className="flex justify-between items-start mb-2">
                  <h4 className={`font-medium ${
                    isDarkMode ? "text-blue-200" : "text-blue-900"
                  }`}>🤖 AI 답변</h4>
                  <button
                    onClick={clearInquiryResponse}
                    className={`text-sm ${
                      isDarkMode ? "text-blue-300 hover:text-blue-200" : "text-blue-600 hover:text-blue-800"
                    }`}
                  >
                    ✕
                  </button>
                </div>
                <p className={`${
                  isDarkMode ? "text-blue-100" : "text-blue-800"
                }`}>
                  {inquiryResponse.answerText}
                </p>
              </div>
            )}

            {/* 자가 진단 퀴즈 */}
            {showQuiz && quizQuestions.length > 0 && (
              <div className={`p-4 rounded-lg ${
                isDarkMode ? "bg-green-900 border border-green-700" : "bg-green-50 border border-green-200"
              }`}>
                <div className="flex justify-between items-start mb-3">
                  <h4 className={`font-medium ${
                    isDarkMode ? "text-green-200" : "text-green-900"
                  }`}>📝 자가 진단 퀴즈</h4>
                  <button
                    onClick={() => {
                      setShowQuiz(false);
                      clearQuizQuestions();
                    }}
                    className={`text-sm ${
                      isDarkMode ? "text-green-300 hover:text-green-200" : "text-green-600 hover:text-green-800"
                    }`}
                  >
                    ✕
                  </button>
                </div>
                <div className="space-y-4">
                  {quizQuestions.map((question, index) => (
                    <div key={index} className={`p-3 rounded ${
                      isDarkMode ? "bg-green-800" : "bg-white"
                    }`}>
                      <p className={`font-medium mb-2 ${
                        isDarkMode ? "text-green-100" : "text-green-900"
                      }`}>
                        Q{index + 1}. {question.questionText}
                      </p>
                      {question.questionType === "OX" && (
                        <div className="flex gap-2">
                          <button className={`px-3 py-1 rounded text-sm ${
                            isDarkMode ? "bg-green-700 hover:bg-green-600 text-green-100" : "bg-green-200 hover:bg-green-300 text-green-800"
                          }`}>
                            O
                          </button>
                          <button className={`px-3 py-1 rounded text-sm ${
                            isDarkMode ? "bg-green-700 hover:bg-green-600 text-green-100" : "bg-green-200 hover:bg-green-300 text-green-800"
                          }`}>
                            X
                          </button>
                        </div>
                      )}
                      {question.questionType === "ESSAY" && (
                        <textarea
                          placeholder="답변을 입력해주세요..."
                          className={`w-full h-20 p-2 rounded border resize-none ${
                            isDarkMode 
                              ? "bg-green-700 border-green-600 text-green-100 placeholder-green-300" 
                              : "bg-white border-green-300 text-green-900 placeholder-green-500"
                          }`}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 평가 제출 폼 */}
            {showAssessment && (
              <div className={`p-4 rounded-lg ${
                isDarkMode ? "bg-purple-900 border border-purple-700" : "bg-purple-50 border border-purple-200"
              }`}>
                <div className="flex justify-between items-start mb-3">
                  <h4 className={`font-medium ${
                    isDarkMode ? "text-purple-200" : "text-purple-900"
                  }`}>📋 평가 제출</h4>
                  <button
                    onClick={() => {
                      setShowAssessment(false);
                      setAssessmentAnswers([]);
                    }}
                    className={`text-sm ${
                      isDarkMode ? "text-purple-300 hover:text-purple-200" : "text-purple-600 hover:text-purple-800"
                    }`}
                  >
                    ✕
                  </button>
                </div>
                
                <div className="space-y-4">
                  <p className={`text-sm ${
                    isDarkMode ? "text-purple-300" : "text-purple-700"
                  }`}>
                    평가 문제에 답변을 제출해주세요.
                  </p>
                  
                  {/* 샘플 평가 문제 */}
                  <div className={`p-3 rounded border ${
                    isDarkMode ? "bg-purple-800 border-purple-600" : "bg-white border-purple-300"
                  }`}>
                    <h5 className={`font-medium mb-2 ${
                      isDarkMode ? "text-purple-200" : "text-purple-900"
                    }`}>
                      문제 1: 운영체제의 역할이 아닌 것은?
                    </h5>
                    <div className="space-y-2">
                      {[
                        { id: 1, text: "자원 관리", isCorrect: false },
                        { id: 2, text: "인터페이스 제공", isCorrect: false },
                        { id: 3, text: "컴파일러 제공", isCorrect: true },
                        { id: 4, text: "프로세스 관리", isCorrect: false }
                      ].map((option) => (
                        <label key={option.id} className={`flex items-center cursor-pointer ${
                          isDarkMode ? "text-purple-200" : "text-purple-800"
                        }`}>
                          <input
                            type="radio"
                            name="question1"
                            value={option.id}
                            onChange={(e) => {
                              const newAnswer: SubmissionAnswer = {
                                questionId: 1,
                                chosenOptionId: parseInt(e.target.value)
                              };
                              setAssessmentAnswers(prev => 
                                prev.filter(a => a.questionId !== 1).concat(newAnswer)
                              );
                            }}
                            className="mr-2"
                          />
                          {option.text}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleSubmitAssessment}
                      disabled={assessmentLoading}
                      className={`px-4 py-2 rounded-md transition-colors ${
                        assessmentLoading 
                          ? "bg-gray-400 cursor-not-allowed" 
                          : isDarkMode 
                            ? "bg-purple-600 hover:bg-purple-700 text-white" 
                            : "bg-purple-600 hover:bg-purple-700 text-white"
                      }`}
                    >
                      {assessmentLoading ? "제출 중..." : "답안 제출"}
                    </button>
                    <button
                      onClick={() => setShowAssessment(false)}
                      className={`px-4 py-2 rounded-md border transition-colors ${
                        isDarkMode 
                          ? "border-purple-600 text-purple-300 hover:bg-purple-800" 
                          : "border-purple-300 text-purple-700 hover:bg-purple-100"
                      }`}
                    >
                      취소
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MainContent;
