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

