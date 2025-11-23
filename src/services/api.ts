const BACKEND_URL = 'https://uouaitutor.duckdns.org';

// HTTPS 백엔드이므로 개발/프로덕션 모두 직접 연결
const API_BASE_URL = import.meta.env.VITE_API_URL || BACKEND_URL;

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
  materialReferences?: string[];
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
  const requestEndpoint = endpoint;
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
    const finalHeaders: HeadersInit = { ...config.headers };
    
    if (isFormData) {
      delete (finalHeaders as any)['Content-Type'];
      delete (finalHeaders as any)['content-type'];
    }
    
    // Authorization 헤더 확인 (디버깅용)
    const hasAuthHeader = !!finalHeaders['Authorization'];
    const token = getAuthToken();
    
    const finalConfig: RequestInit = {
      ...config,
      headers: finalHeaders,
      mode: 'cors',
      credentials: 'omit',
    };

    let response: Response;
    try {
      response = await fetch(url, {
        ...finalConfig,
        redirect: 'manual',
      });
    } catch (fetchError) {
      throw fetchError;
    }
    
    // 리다이렉트 응답 처리
    if (response.type === 'opaqueredirect' || response.status === 302 || response.status === 301 || response.status === 307 || response.status === 308) {
      const location = response.headers.get('location');
      
      if (requestEndpoint.includes('/api/auth/login') || requestEndpoint.includes('/api/auth/signup')) {
        // 로그인/회원가입 API는 리다이렉트를 반환하면 안 됨
        // 백엔드 설정 문제: Security 필터가 인증이 필요 없는 엔드포인트까지 보호하고 있음
        const errorMsg = `백엔드 설정 문제: 로그인/회원가입 API가 리다이렉트를 반환하고 있습니다.\n\n` +
          `해결 방법 (백엔드):\n` +
          `1. /api/auth/login, /api/auth/signup 엔드포인트를 Security 필터에서 제외\n` +
          `2. permitAll() 설정 추가\n` +
          `3. OPTIONS 요청(CORS preflight)에 대해 리다이렉트 대신 200 OK 반환\n\n` +
          `현재 요청: ${requestEndpoint}`;
        throw new Error(errorMsg);
      }
      
      // opaqueredirect는 CORS preflight 요청에서 리다이렉트가 발생한 경우일 수 있음
      if (response.type === 'opaqueredirect' && !location) {
        console.warn('CORS preflight 요청에서 리다이렉트가 발생했습니다. 백엔드 CORS 설정을 확인해주세요.', {
          endpoint: requestEndpoint,
          hasToken: !!token,
          hasAuthHeader,
          responseType: response.type,
          responseStatus: response.status,
          url: response.url,
        });
        
        if (token && hasAuthHeader) {
          // 더 자세한 안내 메시지
          const errorMsg = `백엔드 CORS 설정 문제로 인해 요청이 실패했습니다.\n\n` +
            `해결 방법:\n` +
            `1. 백엔드에서 OPTIONS 요청에 대해 리다이렉트 대신 200 OK를 반환하도록 설정\n` +
            `2. CORS 설정에서 Authorization 헤더를 허용하도록 설정\n` +
            `3. Access-Control-Allow-Headers에 "Authorization" 포함\n` +
            `4. CORS 필터가 Security 필터보다 먼저 실행되도록 설정\n\n` +
            `현재 요청: ${requestEndpoint}`;
          throw new Error(errorMsg);
        } else {
          throw new Error('로그인이 필요합니다. 로그인 페이지로 이동해주세요.');
        }
      }
      
      // 인증이 필요한 API인 경우
      if (location && location.includes('/oauth2/authorization/')) {
        if (!token || !hasAuthHeader) {
          throw new Error('로그인이 필요합니다. 로그인 페이지로 이동해주세요.');
        } else {
          // 토큰이 있고 헤더에도 포함되었지만 백엔드가 인식하지 못하는 경우
          // 이는 백엔드 설정 문제일 수 있음
          console.warn('인증 토큰이 헤더에 포함되었지만 백엔드가 인증을 요구합니다.', {
            endpoint: requestEndpoint,
            hasToken: !!token,
            hasAuthHeader,
            location,
            responseType: response.type,
            responseStatus: response.status,
          });
          throw new Error('백엔드 인증 오류가 발생했습니다. 토큰은 유지되며, 잠시 후 다시 시도하거나 브라우저를 새로고침해주세요.');
        }
      }
      
      if (!token || !hasAuthHeader) {
        throw new Error('로그인이 필요합니다. 로그인 페이지로 이동해주세요.');
      } else {
        // 토큰이 있고 헤더에도 포함되었지만 백엔드가 인식하지 못하는 경우
        console.warn('인증 토큰이 헤더에 포함되었지만 백엔드가 인증을 요구합니다.', {
          endpoint: requestEndpoint,
          hasToken: !!token,
          hasAuthHeader,
          location,
          responseType: response.type,
          responseStatus: response.status,
        });
        throw new Error('백엔드 인증 오류가 발생했습니다. 토큰은 유지되며, 잠시 후 다시 시도하거나 브라우저를 새로고침해주세요.');
      }
    }
    
    if (response.status === 0) {
      throw new Error('네트워크 연결 실패');
    }
    
    // 201 Created 응답 처리 (회원가입 성공)
    if (response.status === 201) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        return data;
      } else {
        const text = await response.text();
        return text as T;
      }
    }
    
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
      
      // 401 Unauthorized 처리 (로그인 실패)
      if (response.status === 401) {
        const backendMessage = errorJson?.message || errorJson?.title || errorText || '이메일 또는 비밀번호가 올바르지 않습니다.';
        throw new Error(backendMessage);
      }
      
      // 409 Conflict 처리 (이미 존재하는 이메일)
      if (response.status === 409) {
        const backendMessage = errorJson?.message || errorJson?.title || errorText || '이미 존재하는 이메일입니다.';
        throw new Error(backendMessage);
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
    if (error instanceof TypeError && (error.message === 'Failed to fetch' || error.message.includes('fetch'))) {
      throw new Error(`네트워크 연결 실패: ${url}`);
    }
    throw error;
  }
};

// 서버 상태 확인
export const checkServerStatus = async (): Promise<{ online: boolean; message?: string }> => {
  try {
    const url = API_BASE_URL ? `${API_BASE_URL}/api/health` : `${BACKEND_URL}/api/health`;
    
    // Health check 엔드포인트가 없을 수 있으므로 간단한 요청으로 대체
    // OPTIONS 요청으로 서버 연결 확인
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3초 타임아웃
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      // 200-299 또는 404 (엔드포인트가 없어도 서버는 응답함)면 서버는 온라인
      if (response.status < 500) {
        return { online: true };
      } else {
        return { online: false, message: '서버 오류' };
      }
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      // CORS 오류는 서버가 응답했다는 의미일 수 있음
      if (fetchError instanceof TypeError && fetchError.message.includes('fetch')) {
        // 네트워크 오류인 경우 서버가 오프라인일 가능성
        return { online: false, message: '서버에 연결할 수 없습니다' };
      }
      
      // AbortError는 타임아웃
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return { online: false, message: '서버 응답 시간 초과' };
      }
      
      return { online: false, message: '서버 상태 확인 실패' };
    }
  } catch (error) {
    return { online: false, message: '서버 상태 확인 실패' };
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
  // (스트리밍으로 대체됨) generate-content 제거

  // 강의 자료 업로드 (PDF) (선생님)
  uploadMaterial: async (lectureId: number, file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    
    return apiRequest<string>(`/api/lectures/${lectureId}/materials`, {
      method: 'POST',
      body: formData,
    }, true); // includeAuth = true로 명시
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

// 강의 자료 생성 API (파일 업로드 및 AI 에이전트 처리)
export interface LectureMaterialResponse {
  markdown: string;
  fileUrl: string;
  fileName: string;
}

// 스트리밍 러닝 세션 타입
export interface StreamSessionState {
  status: string;
  lectureId: number;
  serviceStatus?: string;
  chapters?: Record<string, unknown>;
  questions?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
  error?: Record<string, unknown> | null;
}

export interface StreamInitializeResponse {
  status: string;
  lectureId: number;
  totalChapters: number;
  chapters: Array<{
    title: string;
    startPage: number;
    endPage: number;
  }>;
}

export type ContentType = 'CONCEPT' | 'QUESTION' | 'SUPPLEMENTARY' | 'SCRIPT';

export interface StreamNextResponse {
  status: string;
  lectureId: number;
  contentType: ContentType | string;
  contentData: string;
  chapterTitle?: string;
  hasMore: boolean;
  waitingForAnswer: boolean;
  aiQuestionId?: string;
}

export interface StreamAnswerRequest {
  aiQuestionId: string;
  answer: string;
}

export interface StreamAnswerResponse {
  status: string;
  lectureId: number;
  aiQuestionId: string;
  question?: string;
  chapterTitle?: string;
  canContinue: boolean;
  supplementary?: string;
}

export const lectureMaterialApi = {
  // 파일 업로드 및 강의 자료 생성
  uploadAndGenerate: async (file: File): Promise<LectureMaterialResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    
    return apiRequest<LectureMaterialResponse>('/api/lecture-materials/generate', {
      method: 'POST',
      body: formData,
    }, true); // includeAuth = true
  },
};

// 스트리밍 학습 세션 API
export const streamingApi = {
  getSession: async (lectureId: number): Promise<StreamSessionState> => {
    return apiRequest<StreamSessionState>(`/api/lectures/${lectureId}/stream/session`);
  },
  initialize: async (lectureId: number): Promise<StreamInitializeResponse> => {
    return apiRequest<StreamInitializeResponse>(`/api/lectures/${lectureId}/stream/initialize`, {
      method: 'POST',
    });
  },
  next: async (lectureId: number): Promise<StreamNextResponse> => {
    return apiRequest<StreamNextResponse>(`/api/lectures/${lectureId}/stream/next`, {
      method: 'POST',
    });
  },
  answer: async (lectureId: number, payload: StreamAnswerRequest): Promise<StreamAnswerResponse> => {
    return apiRequest<StreamAnswerResponse>(`/api/lectures/${lectureId}/stream/answer`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  cancel: async (lectureId: number): Promise<void> => {
    return apiRequest<void>(`/api/lectures/${lectureId}/stream/cancel`, {
      method: 'POST',
    });
  },
};
