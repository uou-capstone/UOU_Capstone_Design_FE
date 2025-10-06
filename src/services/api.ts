// API 기본 설정 및 유틸리티 함수들
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

// API 응답 타입
export interface ApiResponse<T = any> {
  code: string;
  message: string;
  data?: T;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
}

export interface User {
  userId: number;
  email: string;
  fullName: string;
  role: 'STUDENT' | 'TEACHER';
}

export interface Course {
  courseId: number;
  title: string;
  teacherName: string;
  description?: string;
}

export interface CourseDetail extends Course {
  lectures?: Lecture[];
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

// 토큰 관리
export const getAuthToken = (): string | null => {
  return localStorage.getItem('accessToken');
};

export const setAuthToken = (token: string): void => {
  localStorage.setItem('accessToken', token);
};

export const removeAuthToken = (): void => {
  localStorage.removeItem('accessToken');
};

// API 요청 헤더 생성
const createHeaders = (includeAuth: boolean = true): HeadersInit => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (includeAuth) {
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  return headers;
};

// API 요청 래퍼
const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {},
  includeAuth: boolean = true
): Promise<T> => {
  const url = `${API_BASE_URL}${endpoint}`;
  const config: RequestInit = {
    ...options,
    headers: {
      ...createHeaders(includeAuth),
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    // 204 No Content 응답 처리
    if (response.status === 204) {
      return {} as T;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API Request failed:', error);
    throw error;
  }
};

// 인증 API
export const authApi = {
  // 회원가입
  signup: async (userData: {
    email: string;
    password: string;
    fullName: string;
    role: 'STUDENT' | 'TEACHER';
  }): Promise<ApiResponse<number>> => {
    return apiRequest<ApiResponse<number>>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(userData),
    }, false);
  },

  // 로그인
  login: async (credentials: {
    email: string;
    password: string;
  }): Promise<AuthResponse> => {
    return apiRequest<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }, false);
  },

  // 내 정보 조회
  getMe: async (): Promise<User> => {
    return apiRequest<User>('/api/auth/me');
  },
};

// 과목 API
export const courseApi = {
  // 과목 생성 (선생님 전용)
  createCourse: async (courseData: {
    title: string;
    description: string;
  }): Promise<CourseDetail> => {
    return apiRequest<CourseDetail>('/api/courses', {
      method: 'POST',
      body: JSON.stringify(courseData),
    });
  },

  // 과목 전체 조회
  getAllCourses: async (): Promise<Course[]> => {
    return apiRequest<Course[]>('/api/courses');
  },

  // 과목 상세 조회
  getCourseDetail: async (courseId: number): Promise<CourseDetail> => {
    return apiRequest<CourseDetail>(`/api/courses/${courseId}`);
  },

  // 과목 수정 (선생님)
  updateCourse: async (courseId: number, courseData: {
    title: string;
    description: string;
  }): Promise<CourseDetail> => {
    return apiRequest<CourseDetail>(`/api/courses/${courseId}`, {
      method: 'PUT',
      body: JSON.stringify(courseData),
    });
  },

  // 과목 삭제 (선생님)
  deleteCourse: async (courseId: number): Promise<void> => {
    return apiRequest<void>(`/api/courses/${courseId}`, {
      method: 'DELETE',
    });
  },

  // 수강 신청 (학생)
  enrollCourse: async (courseId: number): Promise<ApiResponse> => {
    return apiRequest<ApiResponse>(`/api/courses/${courseId}/enroll`, {
      method: 'POST',
    });
  },
};

// 강의 API
export const lectureApi = {
  // 강의 생성 및 자료 업로드 (선생님)
  createLecture: async (courseId: number, formData: FormData): Promise<ApiResponse> => {
    return apiRequest<ApiResponse>(`/api/courses/${courseId}/lectures`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
        // Content-Type은 FormData일 때 자동으로 설정됨
      },
      body: formData,
    });
  },

  // 특정 과목의 강의 목록 조회
  getLectures: async (courseId: number): Promise<Lecture[]> => {
    return apiRequest<Lecture[]>(`/api/courses/${courseId}/lectures`);
  },

  // 강의 상세 조회
  getLectureDetail: async (lectureId: number): Promise<Lecture> => {
    return apiRequest<Lecture>(`/api/lectures/${lectureId}`);
  },

  // 보충 자료 업로드 (파일) (선생님)
  uploadMaterial: async (lectureId: number, formData: FormData): Promise<LectureMaterial> => {
    return apiRequest<LectureMaterial>(`/api/lectures/${lectureId}/materials`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
      body: formData,
    });
  },

  // 외부 링크 자료 추가 (선생님)
  addLinkMaterial: async (lectureId: number, materialData: {
    materialType: 'LINK';
    displayName: string;
    url: string;
  }): Promise<LectureMaterial> => {
    return apiRequest<LectureMaterial>(`/api/lectures/${lectureId}/materials`, {
      method: 'POST',
      body: JSON.stringify(materialData),
    });
  },

  // 강의 자료 목록 조회
  getLectureMaterials: async (lectureId: number): Promise<LectureMaterial[]> => {
    return apiRequest<LectureMaterial[]>(`/api/lectures/${lectureId}/materials`);
  },

  // 강의 자료 삭제 (선생님)
  deleteMaterial: async (materialId: number): Promise<void> => {
    return apiRequest<void>(`/api/materials/${materialId}`, {
      method: 'DELETE',
    });
  },
};

// 학습활동 API
export const learningActivityApi = {
  // 손들 질문 제출 (학생)
  submitInquiry: async (lectureId: number, inquiry: Inquiry): Promise<InquiryResponse> => {
    return apiRequest<InquiryResponse>(`/api/lectures/${lectureId}/inquiries`, {
      method: 'POST',
      body: JSON.stringify(inquiry),
    });
  },

  // 자가 진단 퀴즈 생성 (학생)
  generateSelfDiagnosisQuiz: async (lectureId: number): Promise<QuizQuestion[]> => {
    return apiRequest<QuizQuestion[]>(`/api/lectures/${lectureId}/self-diagnosis-quiz`, {
      method: 'POST',
      body: JSON.stringify([]),
    });
  },
};

// 평가 및 제출 API
export const assessmentApi = {
  // 평가 생성 (선생님)
  createAssessment: async (courseId: number, assessment: Assessment): Promise<Assessment> => {
    return apiRequest<Assessment>(`/api/courses/${courseId}/assessments`, {
      method: 'POST',
      body: JSON.stringify(assessment),
    });
  },

  // 평가 상세 조회 (문제 포함)
  getAssessmentDetail: async (assessmentId: number): Promise<Assessment> => {
    return apiRequest<Assessment>(`/api/assessments/${assessmentId}`);
  },

  // 답안 제출 (학생)
  submitAnswers: async (assessmentId: number, answers: SubmissionAnswer[]): Promise<SubmissionResponse> => {
    return apiRequest<SubmissionResponse>(`/api/assessments/${assessmentId}/submissions`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    });
  },

  // 평가 현황 조회 (선생님)
  getAssessmentSubmissions: async (assessmentId: number): Promise<AssessmentSubmission[]> => {
    return apiRequest<AssessmentSubmission[]>(`/api/assessments/${assessmentId}/submissions`);
  },
};
