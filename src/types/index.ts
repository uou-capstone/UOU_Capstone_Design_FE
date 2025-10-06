// 공통 타입 정의
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'teacher' | 'student';
}

export interface Classroom {
  id: number;
  title: string;
  subtitle?: string;
  color?: string;
  isCreate?: boolean;
}

export interface DevPage {
  name: string;
  path: string;
  current?: boolean;
}

export interface Week {
  id: number;
  title: string;
  date: string;
}

export interface StudioTool {
  id: number;
  title: string;
  icon: string;
  color: string;
}

export interface AIOption {
  id: number;
  key: string;
  title: string;
  icon: string;
}

export interface FileSource {
  id: string;
  name: string;
  type: string;
}

export interface Lecture {
  lectureId: number;
  title: string;
  week_no: number;
  contents?: LectureContent[];
}

export interface LectureContent {
  contentType: 'SCRIPT' | 'SUMMARY' | 'QUIZ';
  contentData: string;
}

export interface LectureMaterial {
  materialId: number;
  displayName: string;
  materialType: 'FILE' | 'LINK';
  url: string;
}

export interface Inquiry {
  inquiryText: string;
}

export interface InquiryResponse {
  answerText: string;
}

export interface QuizQuestion {
  questionText: string;
  questionType: 'ESSAY' | 'OX' | 'MULTIPLE_CHOICE';
}

export interface AssessmentOption {
  optionText: string;
  isCorrect: boolean;
}

export interface AssessmentQuestion {
  questionText: string;
  questionType: 'MCQ' | 'OX' | 'ESSAY';
  options?: AssessmentOption[];
}

export interface Assessment {
  assessmentId?: number;
  title: string;
  assessmentType: 'QUIZ' | 'EXAM' | 'ASSIGNMENT';
  dueDate: string;
  questions: AssessmentQuestion[];
}

export interface AssessmentSubmission {
  submissionId: number;
  studentName: string;
  status: 'SUBMITTED' | 'GRADED';
  score?: number;
}

export interface SubmissionAnswer {
  questionId: number;
  chosenOptionId: number;
}

export interface SubmissionResponse {
  submissionId: number;
  message: string;
}

// 컴포넌트 Props 타입
export interface AppLayoutProps {
  children?: React.ReactNode;
}

export interface RightSidebarProps {
  onAIGenerate: (markdownContent: string) => void;
}

export interface MainContentProps {
  aiGeneratedContent: string;
}

