// API 기본 설정 및 유틸리티 함수들
// 개발 환경에서는 Vite 프록시를 사용하므로 상대 경로 사용
// 프로덕션에서는 환경 변수 또는 기본값 사용
const API_BASE_URL = import.meta.env.PROD 
  ? (import.meta.env.VITE_API_URL || 'https://michal-unvulnerable-benita.ngrok-free.dev')
  : ''; // 개발 환경에서는 프록시 사용 (빈 문자열 = 같은 도메인)

console.log('[API Config] PROD:', import.meta.env.PROD);
console.log('[API Config] API_BASE_URL:', API_BASE_URL);
console.log('[API Config] VITE_API_URL:', import.meta.env.VITE_API_URL);

// API 응답 타입
export interface ApiResponse<T = any> {
  code: string;
  message: string;
  data?: T;
}

export interface TokenResponseDto {
  accessToken: string;
  refreshToken: string;
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
  weekNumber: number;
  description?: string;
  aiGeneratedStatus?: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  contents?: LectureContent[];
}

export interface LectureContent {
  contentId: number;
  contentType: 'SCRIPT' | 'SUMMARY' | 'VISUAL_AID';
  contentData: string;
}

export interface LectureDetailResponseDto {
  lectureId: number;
  title: string;
  weekNumber: number;
  description?: string;
  aiGeneratedStatus: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  contents: LectureContent[];
}

export interface LectureResponseDto {
  lectureId: number;
  title: string;
  weekNumber: number;
  aiGeneratedStatus: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
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
  type: 'QUIZ' | 'ASSIGNMENT';
  dueDate: string;
  questions: AssessmentQuestion[];
}

export interface AssessmentSimpleDto {
  assessmentId: number;
  title: string;
  type: 'QUIZ' | 'ASSIGNMENT';
  dueDate: string;
}

export interface AssessmentDetailDto {
  assessmentId: number;
  title: string;
  type: 'QUIZ' | 'ASSIGNMENT';
  dueDate: string;
  questions: QuestionResponseDto[];
}

export interface QuestionResponseDto {
  questionId: number;
  text: string;
  type: 'FLASHCARD' | 'OX' | 'MULTICHOICE' | 'ESSAY';
  options?: OptionResponseDto[];
}

export interface OptionResponseDto {
  optionId: number;
  text: string;
}

export interface AssessmentSubmission {
  submissionId: number;
  studentId: number;
  studentName: string;
  submittedAt: string;
  status: 'SUBMITTED' | 'GRADED';
}

export interface SubmissionStatusDto {
  submissionId: number;
  studentId: number;
  studentName: string;
  submittedAt: string;
  status: 'SUBMITTED' | 'GRADED';
}

export interface StudentAnswerRequestDto {
  questionId: number;
  choiceOptionId?: number;
  descriptiveAnswer?: string;
}

export interface SubmissionRequestDto {
  answers: StudentAnswerRequestDto[];
}

export interface StudentAnswerResponseDto {
  questionId: number;
  questionText: string;
  questionType: 'FLASHCARD' | 'OX' | 'MULTICHOICE' | 'ESSAY';
  choiceOptionId?: number;
  choiceOptionText?: string;
  descriptiveAnswer?: string;
  isCorrect?: boolean;
  score?: number;
  teacherComment?: string;
}

export interface SubmissionResponseDto {
  submissionId: number;
  assessmentId: number;
  assessmentTitle: string;
  submittedAt: string;
  status: 'SUBMITTED' | 'GRADED';
  answers: StudentAnswerResponseDto[];
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
const createHeaders = (includeAuth: boolean = true, isFormData: boolean = false): HeadersInit => {
  const headers: HeadersInit = {};

  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

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
  // 개발 환경에서는 프록시 사용 (빈 문자열이면 상대 경로)
  // 프로덕션에서는 전체 URL 사용
  const url = API_BASE_URL ? `${API_BASE_URL}${endpoint}` : endpoint;
  const isFormData = options.body instanceof FormData;
  const config: RequestInit = {
    ...options,
    headers: {
      ...createHeaders(includeAuth, isFormData),
      ...options.headers,
    },
  };

  try {
    // ngrok 브라우저 경고 우회를 위한 추가 헤더
    const finalHeaders: HeadersInit = {
      ...config.headers,
      'ngrok-skip-browser-warning': 'true',
    };
    
    const finalConfig: RequestInit = {
      ...config,
      headers: finalHeaders,
      mode: 'cors', // CORS 모드 명시
      credentials: 'omit', // 쿠키 전송 안 함
    };

    console.log('API Request:', {
      url,
      method: finalConfig.method || 'GET',
      headers: finalHeaders,
      body: config.body ? (typeof config.body === 'string' ? config.body : '[FormData or other]') : undefined,
      isDev: !import.meta.env.PROD,
      usingProxy: !API_BASE_URL,
    });

    const response = await fetch(url, finalConfig);
    
    if (!response.ok) {
      let errorText = '';
      let errorJson: any = null;
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          errorJson = await response.json();
          errorText = JSON.stringify(errorJson, null, 2);
        } else {
          errorText = await response.text();
        }
      } catch (e) {
        errorText = '응답 본문을 읽을 수 없습니다';
      }
      
      // ngrok HTML 에러 페이지 감지
      if (errorText.includes('ERR_NGROK') || errorText.includes('ngrok') || errorText.includes('<!DOCTYPE html>')) {
        if (errorText.includes('ERR_NGROK_3200') || errorText.includes('is offline')) {
          throw new Error(`API Error (${response.status} ${response.statusText}): ngrok 터널이 오프라인 상태입니다. 터널이 종료되었거나 연결이 끊어진 것 같습니다.`);
        } else {
          throw new Error(`API Error (${response.status} ${response.statusText}): ngrok 관련 오류가 발생했습니다. 터널 상태를 확인해주세요.`);
        }
      }
      
      // 백엔드에서 보낸 에러 메시지가 있으면 사용
      const backendMessage = errorJson?.message || errorJson?.title || errorText;
      throw new Error(`API Error (${response.status} ${response.statusText}): ${backendMessage}`);
    }

    // 204 No Content 응답 처리
    if (response.status === 204) {
      return {} as T;
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      return data;
    } else {
      const text = await response.text();
      return text as T;
    }
  } catch (error) {
    console.error('API Request failed:', error);
    console.error('Request URL:', url);
    console.error('Request Config:', config);
    console.error('API_BASE_URL:', API_BASE_URL);
    console.error('Is Production:', import.meta.env.PROD);
    
    // 네트워크 에러인 경우 더 자세한 정보 제공
    if (error instanceof TypeError && (error.message === 'Failed to fetch' || error.message.includes('fetch'))) {
      const isUsingProxy = !API_BASE_URL;
      let errorMessage = `네트워크 연결 실패: ${url}\n\n`;
      
      if (isUsingProxy) {
        errorMessage += `프록시 모드 사용 중 (개발 환경)\n`;
        errorMessage += `프록시가 /api 요청을 백엔드로 전달해야 합니다.\n\n`;
        errorMessage += `가능한 원인:\n`;
        errorMessage += `1. 개발 서버를 재시작하지 않았을 수 있음 (vite.config.ts 변경 후 재시작 필요)\n`;
        errorMessage += `2. 백엔드 서버가 응답하지 않음\n`;
        errorMessage += `3. 프록시 설정 오류\n\n`;
        errorMessage += `해결 방법:\n`;
        errorMessage += `1. 개발 서버 재시작: yarn dev 중지 후 다시 시작\n`;
        errorMessage += `2. 터미널에서 프록시 로그 확인 (Proxy Request: POST /api/courses)\n`;
        errorMessage += `3. 브라우저 Network 탭에서 실제 요청 확인\n`;
      } else {
        errorMessage += `직접 연결 모드 사용 중 (프로덕션 환경)\n\n`;
        errorMessage += `가능한 원인:\n`;
        errorMessage += `1. CORS 정책 문제 - 백엔드에서 CORS 설정 필요\n`;
        errorMessage += `2. 서버가 응답하지 않음 - 백엔드 서버 상태 확인\n`;
        errorMessage += `3. ngrok 브라우저 경고 - 브라우저에서 직접 ngrok URL 접속 후 "Visit Site" 클릭 필요\n`;
        errorMessage += `4. 네트워크 연결 문제\n\n`;
        errorMessage += `해결 방법:\n`;
        errorMessage += `1. 브라우저에서 https://michal-unvulnerable-benita.ngrok-free.dev 접속\n`;
        errorMessage += `2. ngrok 경고 페이지에서 "Visit Site" 버튼 클릭\n`;
        errorMessage += `3. 그 후 API 테스트 다시 시도`;
      }
      
      throw new Error(errorMessage);
    }
    
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
  }): Promise<string> => {
    return apiRequest<string>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(userData),
    }, false);
  },

  // 로그인
  login: async (credentials: {
    email: string;
    password: string;
  }): Promise<TokenResponseDto> => {
    const response = await apiRequest<TokenResponseDto>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }, false);
    
    // 토큰 저장
    if (response.accessToken) {
      setAuthToken(response.accessToken);
    }
    
    return response;
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
  enrollCourse: async (courseId: number): Promise<string> => {
    return apiRequest<string>(`/api/courses/${courseId}/enroll`, {
      method: 'POST',
    });
  },
};

// 강의 API
export const lectureApi = {
  // 강의 생성 (선생님)
  createLecture: async (courseId: number, lectureData: {
    title: string;
    weekNumber: number;
    description?: string;
  }): Promise<LectureResponseDto> => {
    return apiRequest<LectureResponseDto>(`/api/courses/${courseId}/lectures`, {
      method: 'POST',
      body: JSON.stringify(lectureData),
    });
  },

  // 강의 상세 조회
  getLectureDetail: async (lectureId: number): Promise<LectureDetailResponseDto> => {
    return apiRequest<LectureDetailResponseDto>(`/api/lectures/${lectureId}`);
  },

  // 강의 정보 수정 (선생님)
  updateLecture: async (lectureId: number, lectureData: {
    title?: string;
    weekNumber?: number;
    description?: string;
  }): Promise<LectureResponseDto> => {
    return apiRequest<LectureResponseDto>(`/api/lectures/${lectureId}`, {
      method: 'PUT',
      body: JSON.stringify(lectureData),
    });
  },

  // 강의 삭제 (선생님)
  deleteLecture: async (lectureId: number): Promise<void> => {
    return apiRequest<void>(`/api/lectures/${lectureId}`, {
      method: 'DELETE',
    });
  },

  // AI 강의 콘텐츠 생성 (선생님)
  generateAiContent: async (lectureId: number): Promise<string> => {
    return apiRequest<string>(`/api/lectures/${lectureId}/generate-content`, {
      method: 'POST',
    });
  },

  // 강의 자료 업로드 (PDF) (선생님)
  uploadMaterial: async (lectureId: number, file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    
    return apiRequest<string>(`/api/lectures/${lectureId}/materials`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
        // Content-Type은 FormData일 때 자동으로 설정됨
      },
      body: formData,
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
  // 과목별 평가 목록 조회
  getAssessmentsForCourse: async (courseId: number): Promise<AssessmentSimpleDto[]> => {
    return apiRequest<AssessmentSimpleDto[]>(`/api/assessments/courses/${courseId}`);
  },

  // 평가 생성 (선생님)
  createAssessment: async (courseId: number, assessment: {
    title: string;
    type: 'QUIZ' | 'ASSIGNMENT';
    dueDate: string;
    questions: Array<{
      text: string;
      type: 'FLASHCARD' | 'OX' | 'MULTICHOICE' | 'ESSAY';
      createdBy?: 'TEACHER' | 'AI';
      choiceOptions?: Array<{
        text: string;
        correct: boolean;
      }>;
    }>;
  }): Promise<string> => {
    return apiRequest<string>(`/api/assessments/courses/${courseId}`, {
      method: 'POST',
      body: JSON.stringify(assessment),
    });
  },

  // 평가 상세 조회 (문제 포함)
  getAssessmentDetail: async (assessmentId: number): Promise<AssessmentDetailDto> => {
    return apiRequest<AssessmentDetailDto>(`/api/assessments/${assessmentId}`);
  },

  // 답안 제출 현황 조회 (선생님)
  getSubmissionsForAssessment: async (assessmentId: number): Promise<SubmissionStatusDto[]> => {
    return apiRequest<SubmissionStatusDto[]>(`/api/assessments/${assessmentId}/submissions`);
  },

  // 답안 제출 (학생)
  createSubmission: async (assessmentId: number, submission: SubmissionRequestDto): Promise<string> => {
    return apiRequest<string>(`/api/assessments/${assessmentId}/submissions`, {
      method: 'POST',
      body: JSON.stringify(submission),
    });
  },

  // 제출 결과 조회 (학생)
  getSubmissionResult: async (submissionId: number): Promise<SubmissionResponseDto> => {
    return apiRequest<SubmissionResponseDto>(`/api/submissions/${submissionId}`);
  },
};
