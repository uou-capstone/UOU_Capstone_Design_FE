import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "../../contexts/ThemeContext";
import { useLectures } from "../../hooks/useLectures";
import { useAssessments } from "../../hooks/useAssessments";
import { RightSidebarProps, StudioTool, AIOption, FileSource, Assessment, AssessmentQuestion, AssessmentOption } from "../../types";

const RightSidebar: React.FC<RightSidebarProps> = ({ onAIGenerate }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showAIMenu, setShowAIMenu] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const { isDarkMode } = useTheme();
  const { createLecture, uploadMaterial, addLinkMaterial } = useLectures();
  const { createAssessment } = useAssessments();
  const [courseId, setCourseId] = useState<number | null>(null);
  const [showAssessmentForm, setShowAssessmentForm] = useState<boolean>(false);

  // URL에서 courseId 추출
  React.useEffect(() => {
    const pathParts = location.pathname.split('/');
    if (pathParts.length >= 3) {
      const id = parseInt(pathParts[2]);
      if (!isNaN(id)) {
        setCourseId(id);
      }
    }
  }, [location.pathname]);

  const studioTools: StudioTool[] = [
    { id: 1, title: "AI 생성", icon: "🤖", color: "bg-blue-500" },
    { id: 2, title: "학생 관리", icon: "👥", color: "bg-green-500" },
    { id: 3, title: "평가 생성", icon: "📝", color: "bg-purple-500" },
    { id: 4, title: "보고서", icon: "📊", color: "bg-yellow-500" },
    { id: 5, title: "설정", icon: "⚙️", color: "bg-gray-500" },
  ];

  const aiOptions: AIOption[] = [
    { id: 1, key: "lecture", title: "강의자료 만들기", icon: "📚" },
    { id: 2, key: "exam", title: "시험 만들기", icon: "📝" },
    { id: 3, key: "assignment", title: "과제 만들기", icon: "📋" },
  ];

  const [uploadedFileName, setUploadedFileName] = useState<string>("");

  const handleAIGenerate = async (option: AIOption): Promise<void> => {
    if (!courseId) {
      alert("과목이 선택되지 않았습니다.");
      return;
    }

    // 업로드된 파일만 사용
    if (!uploadedFileName) {
      alert("파일을 먼저 업로드해주세요.");
      return;
    }

    // FormData 생성
    const formData = new FormData();
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput && fileInput.files && fileInput.files[0]) {
      formData.append('file', fileInput.files[0]);
    }

    try {
      setIsProcessing(true);
      const result = await createLecture(courseId, formData);
      
      if (result.success) {
        alert("강의가 생성되었습니다!");
        setUploadedFileName("");
        // 파일 입력 초기화
        if (fileInput) {
          fileInput.value = "";
        }
      } else {
        alert(`강의 생성에 실패했습니다: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to create lecture:', error);
      alert("강의 생성 중 오류가 발생했습니다.");
    } finally {
      setIsProcessing(false);
    }
  };

  // 평가 생성 핸들러
  const handleCreateAssessment = async (): Promise<void> => {
    if (!courseId) {
      alert("과목이 선택되지 않았습니다.");
      return;
    }

    // 간단한 평가 생성 (실제로는 더 복잡한 폼이 필요)
    const assessment: Assessment = {
      title: "새로운 퀴즈",
      assessmentType: "QUIZ",
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7일 후
      questions: [
        {
          questionText: "샘플 문제입니다. 실제로는 더 많은 문제를 추가할 수 있습니다.",
          questionType: "MCQ",
          options: [
            { optionText: "선택지 1", isCorrect: false },
            { optionText: "선택지 2", isCorrect: true },
            { optionText: "선택지 3", isCorrect: false },
            { optionText: "선택지 4", isCorrect: false }
          ]
        }
      ]
    };

    const result = await createAssessment(courseId, assessment);
    if (result.success) {
      alert("평가가 생성되었습니다!");
    } else {
      alert(`평가 생성에 실패했습니다: ${result.error}`);
    }
  };

  const generateMarkdown = async (option: AIOption, file: FileSource): Promise<void> => {
    setIsProcessing(true);

    setTimeout(() => {
      const mockMarkdown = `# ${file.name} 기반 ${option.title}

## 개요
이 문서는 "${file.name}" 파일을 기반으로 AI가 생성한 ${option.title}입니다.

## 주요 내용
- 파일 유형: ${file.type}
- 생성 시간: ${new Date().toLocaleString()}

## 상세 내용
AI가 파일을 분석하여 다음과 같은 강의자료를 생성했습니다:

### 1. 핵심 개념
- 개념 1
- 개념 2
- 개념 3

### 2. 실습 예제
\`\`\`python
# 예제 코드
print("Hello, AI Generated Content!")
\`\`\`

### 3. 연습 문제
1. 문제 1
2. 문제 2
3. 문제 3

---
*이 문서는 AI에 의해 자동 생성되었습니다.*`;

      onAIGenerate(mockMarkdown);
      setIsProcessing(false);
      setUploadedFileName("");
    }, 1200);
  };

  return (
    <aside className={`w-60 p-3 overflow-y-auto border-l transition-colors ${
      isDarkMode 
        ? "bg-gray-800 border-gray-700" 
        : "bg-white border-gray-100"
    }`}>
      <div className="mb-6">
        <h3 className={`text-lg font-semibold m-0 ${
          isDarkMode ? "text-white" : "text-gray-900"
        }`}>스튜디오</h3>
      </div>

      <div className="grid gap-2 mb-4">
        {studioTools.map((tool) => (
          <button
            key={tool.id}
            className={`border px-3 py-2 rounded-md cursor-pointer transition-all flex items-center justify-center text-sm ${
              isDarkMode 
                ? "bg-gray-700 border-gray-600 hover:bg-gray-600" 
                : "bg-white border-gray-200 hover:bg-gray-100"
            }`}
            onClick={() => {
              if (tool.id === 1) setShowAIMenu(!showAIMenu);
              if (tool.id === 2) {
                const basePath = location.pathname.includes('/student') ? '/student' : '/teacher';
                navigate(`${basePath}/students`);
              }
              if (tool.id === 3) handleCreateAssessment();
            }}
          >
            <span className="mr-2">{tool.icon}</span>
            <span className={isDarkMode ? "text-white" : "text-gray-900"}>{tool.title}</span>
          </button>
        ))}
      </div>

      {/* AI 생성 메뉴 */}
      {showAIMenu && (
        <div className={`mb-4 p-3 rounded-md border transition-colors ${
          isDarkMode 
            ? "bg-gray-700 border-gray-600" 
            : "bg-white border-gray-200"
        }`}>
          <h4 className={`text-sm font-medium mb-3 ${
            isDarkMode ? "text-white" : "text-gray-900"
          }`}>AI 생성 옵션</h4>
          <div className="space-y-2">
            {aiOptions.map((option) => (
              <button
                key={option.id}
                className={`w-full text-left px-3 py-2 text-sm rounded transition-colors ${
                  isDarkMode 
                    ? "bg-gray-600 text-white hover:bg-gray-500" 
                    : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                }`}
                onClick={() => handleAIGenerate(option)}
              >
                <span className="mr-2">{option.icon}</span>
                {option.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 파일 선택 섹션 */}
      {showAIMenu && (
        <div className={`mb-4 p-3 rounded-md border transition-colors ${
          isDarkMode 
            ? "bg-gray-700 border-gray-600" 
            : "bg-white border-gray-200"
        }`}>
          <h4 className={`text-sm font-medium mb-3 ${
            isDarkMode ? "text-white" : "text-gray-900"
          }`}>파일 업로드</h4>
          <div className="mt-3">
            <input
              type="file"
              className={`block w-full text-xs file:mr-3 file:px-3 file:py-1.5 file:rounded file:border-0 file:text-xs file:font-medium file:bg-blue-600 file:text-white hover:file:bg-blue-700 ${
                isDarkMode ? "text-gray-300" : "text-gray-600"
              }`}
              onChange={(e) => setUploadedFileName(e.target.files?.[0]?.name || "")}
            />
            {uploadedFileName && (
              <div className={`mt-1 text-xs ${
                isDarkMode ? "text-gray-400" : "text-gray-500"
              }`}>업로드됨: {uploadedFileName}</div>
            )}
          </div>
          {/* 제출 버튼 제거: 옵션 클릭 시 즉시 생성 */}
          {isProcessing && (
            <div className="w-full mt-3 px-4 py-2 bg-blue-600 text-white rounded text-center text-sm">
              처리 중...
            </div>
          )}
        </div>
      )}
    </aside>
  );
};

export default RightSidebar;
