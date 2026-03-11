const BACKEND_URL = 'https://uouaitutor.duckdns.org';
// 일부 TS 설정에서는 import.meta.env 타입 선언이 없어 오류가 나므로 any 캐스트로 우회한다.
const META_ENV = (import.meta as any)?.env ?? {};
export const API_BASE_URL = META_ENV.VITE_API_URL || BACKEND_URL;
const AI_SERVICE_URL = META_ENV.VITE_AI_SERVICE_URL || API_BASE_URL;

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
  profileImageUrl?: string;
  phoneNumber?: string;
  birthDate?: string;
}

export interface Course {
  courseId: number;
  title: string;
  teacherName: string;
  description?: string;
}

export interface CourseDetail extends Course {
  lectures?: Lecture[];
  invitationCode?: string;
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

// 강의실 전체 n주차별 리소스 조회 응답 (/api/courses/{courseId}/contents)
export interface CourseContentsLectureMaterial {
  materialId: number;
  displayName: string;
  materialType: string;
  filePath: string;
  url: string;
}

export interface CourseContentsLectureExamSession {
  examSessionId: number;
  examType: string;
  status: string;
  targetCount: number;
  createdAt: string;
}

export interface CourseContentsLecture {
  lectureId: number;
  title: string;
  weekNumber: number;
  materials: CourseContentsLectureMaterial[];
  examSessions: CourseContentsLectureExamSession[];
}

export interface CourseContentsResponse {
  courseId: number;
  courseTitle: string;
  lectures: CourseContentsLecture[];
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

export const getRefreshToken = (): string | null => {
  return localStorage.getItem('refreshToken');
};

export const setRefreshToken = (token: string): void => {
  localStorage.setItem('refreshToken', token);
};

export const removeRefreshToken = (): void => {
  localStorage.removeItem('refreshToken');
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
  // 개발(localhost)에서는 Vite proxy(/api -> duckdns)를 활용해 CORS를 피한다.
  // API_BASE_URL을 그대로 붙이면 브라우저가 cross-origin 요청을 하면서 CORS/네트워크 오류가 날 수 있음.
  const isDevHost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const shouldUseViteProxy = isDevHost && endpoint.startsWith('/api');
  const url = shouldUseViteProxy ? endpoint : (API_BASE_URL ? `${API_BASE_URL}${endpoint}` : endpoint);
  const isFormData = options.body instanceof FormData;
  const config: RequestInit = {
    ...options,
    headers: {
      ...createHeaders(includeAuth, isFormData),
      ...options.headers,
    },
  };

  try {
    // fetch HeadersInit는 union 타입이라 인덱싱이 어렵기 때문에, 여기서는 단순 객체로 다룬다.
    const finalHeaders: Record<string, string> = {
      ...(config.headers as Record<string, string>),
    };

    if (isFormData) {
      delete finalHeaders['Content-Type'];
      delete finalHeaders['content-type'];
    }

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
const tryFetch = async (baseUrl: string, path: string, signal: AbortSignal): Promise<Response | null> => {
  try {
    const res = await fetch(`${baseUrl}${path}`, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
      signal,
    });
    return res;
  } catch {
    return null;
  }
};

export const checkServerStatus = async (): Promise<{ online: boolean; message?: string }> => {
  const baseUrl = API_BASE_URL || BACKEND_URL;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const paths = ['/api/health', '/actuator/health', '/'];
    for (const path of paths) {
      const response = await tryFetch(baseUrl, path, controller.signal);
      clearTimeout(timeoutId);
      if (response != null && response.status < 500) {
        return { online: true };
      }
      if (response != null) {
        return { online: false, message: '서버 오류' };
      }
    }

    clearTimeout(timeoutId);
    return {
      online: false,
      message: '연결 실패. CORS 설정 또는 /api/health 엔드포인트를 확인해 주세요.',
    };
  } catch (e) {
    clearTimeout(timeoutId);
    if (e instanceof Error && e.name === 'AbortError') {
      return { online: false, message: '서버 응답 시간 초과' };
    }
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
    phoneNumber?: string;
    birthDate?: string;
    grade?: string;
    classNumber?: string;
    schoolName?: string;
    department?: string;
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

    if (response.accessToken) {
      setAuthToken(response.accessToken);
    }
    if (response.refreshToken) {
      setRefreshToken(response.refreshToken);
    }

    return response;
  },

  // 토큰 갱신
  refresh: async (): Promise<TokenResponseDto> => {
    const currentRefreshToken = getRefreshToken();
    if (!currentRefreshToken) {
      throw new Error('리프레시 토큰이 없습니다. 다시 로그인해주세요.');
    }
    const response = await apiRequest<TokenResponseDto>(
      '/api/auth/refresh',
      {
        method: 'POST',
        body: JSON.stringify({ refreshToken: currentRefreshToken }),
      },
      false
    );

    if (response.accessToken) {
      setAuthToken(response.accessToken);
    }
    if (response.refreshToken) {
      setRefreshToken(response.refreshToken);
    }

    return response;
  },

  // 로그아웃
  logout: async (): Promise<void> => {
    try {
      await apiRequest<void>('/api/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      // 인증이 이미 만료된 경우 등은 무시
      console.warn('logout API 호출 실패 (무시 가능):', error);
    }
  },

  // 내 정보 조회
  getMe: async (): Promise<User> => {
    return apiRequest<User>('/api/users/me');
  },
};

// 사용자 API
export const userApi = {
  // 프로필 수정
  updateProfile: async (payload: {
    fullName?: string;
    phoneNumber?: string;
    birthDate?: string;
  }): Promise<User> => {
    return apiRequest<User>('/api/users/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  // 비밀번호 변경
  changePassword: async (payload: {
    currentPassword: string;
    newPassword: string;
    confirmNewPassword: string;
  }): Promise<void> => {
    await apiRequest<void>('/api/users/password', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  // 이메일 중복 확인
  checkEmail: async (email: string): Promise<boolean> => {
    try {
      await apiRequest<unknown>(`/api/users/check-email?email=${encodeURIComponent(email)}`, {
        method: 'GET',
      });
      // 200 응답이면 사용 가능하다고 간주
      return true;
    } catch (error) {
      // 백엔드 에러 메시지를 그대로 던져서 상위에서 처리
      throw error;
    }
  },

  // 회원 탈퇴
  deleteAccount: async (password: string): Promise<void> => {
    await apiRequest<void>('/api/users/account', {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    });
  },
};

// 강의실 API
export const courseApi = {
  // 강의실 생성 (선생님 전용)
  createCourse: async (courseData: {
    title: string;
    description: string;
  }): Promise<CourseDetail> => {
    return apiRequest<CourseDetail>('/api/courses', {
      method: 'POST',
      body: JSON.stringify(courseData),
    });
  },

  // 강의실 전체 조회
  getAllCourses: async (): Promise<Course[]> => {
    return apiRequest<Course[]>('/api/courses');
  },

  // 강의실 상세 조회
  getCourseDetail: async (courseId: number): Promise<CourseDetail> => {
    return apiRequest<CourseDetail>(`/api/courses/${courseId}`);
  },

  // 강의실 수정 (선생님)
  updateCourse: async (courseId: number, courseData: {
    title: string;
    description: string;
  }): Promise<CourseDetail> => {
    return apiRequest<CourseDetail>(`/api/courses/${courseId}`, {
      method: 'PUT',
      body: JSON.stringify(courseData),
    });
  },

  // 강의실 삭제 (선생님)
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

  // 초대 코드로 수강 신청 (학생)
  joinCourse: async (code: string): Promise<CourseDetail> => {
    return apiRequest<CourseDetail>(`/api/courses/join?code=${code}`, {
      method: 'POST',
    });
  },
};

// 강의실 전체 n주차별 리소스 조회 API
export const courseContentsApi = {
  getCourseContents: async (courseId: number): Promise<CourseContentsResponse> => {
    return apiRequest<CourseContentsResponse>(`/api/courses/${encodeURIComponent(courseId)}/contents`, {
      method: 'GET',
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

  // AI 강의 콘텐츠 생성 (선생님) — PDF 업로드 후 강의 생성
  generateContent: async (lectureId: number, body?: { pdfPath?: string }): Promise<void> => {
    return apiRequest<void>(`/api/lectures/${lectureId}/generate-content`, {
      method: 'POST',
      body: body ? JSON.stringify(body) : '{}',
    });
  },

  // AI 콘텐츠 생성 상태 조회
  getAiStatus: async (lectureId: number): Promise<{ status: string; progress?: number; message?: string }> => {
    return apiRequest<{ status: string; progress?: number; message?: string }>(`/api/lectures/${lectureId}/ai-status`, { method: 'GET' });
  },

  // 강의 자료 업로드 (PDF) (선생님)
  uploadMaterial: async (lectureId: number, file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);

    // 백엔드 응답이 문자열 또는 JSON({ fileUrl, message }) 둘 다 올 수 있다고 가정하고 처리
    const rawResponse = await apiRequest<unknown>(
      `/api/lectures/${lectureId}/materials`,
      {
        method: "POST",
        body: formData,
      },
      true // includeAuth = true로 명시
    );

    let fileUrl: string | null = null;

    if (typeof rawResponse === "string") {
      // 구버전: 바로 URL 또는 경로 문자열 반환
      fileUrl = rawResponse;
    } else if (rawResponse && typeof rawResponse === "object") {
      // 공통 래퍼(ApiResponse<T>) 또는 직접 객체 반환 모두 처리
      const anyResp = rawResponse as {
        fileUrl?: unknown;
        url?: unknown;
        data?: unknown;
      };

      // 1차: 최상위에 fileUrl / url 필드가 있는 경우
      if (typeof anyResp.fileUrl === "string") {
        fileUrl = anyResp.fileUrl;
      } else if (typeof anyResp.url === "string") {
        fileUrl = anyResp.url;
      }

      // 2차: data 안에 { fileUrl, url } 혹은 문자열이 들어있는 ApiResponse<T> 형태 처리
      if (!fileUrl && anyResp.data != null) {
        const data: unknown = anyResp.data;
        if (typeof data === "string") {
          fileUrl = data;
        } else if (typeof data === "object") {
          const dataObj = data as { fileUrl?: unknown; url?: unknown };
          if (typeof dataObj.fileUrl === "string") {
            fileUrl = dataObj.fileUrl;
          } else if (typeof dataObj.url === "string") {
            fileUrl = dataObj.url;
          }
        }
      }
    }

    if (!fileUrl) {
      // fileUrl을 파싱하지 못한 경우, 미리보기는 건너뛰되 앱이 깨지지는 않도록 빈 문자열 반환
      console.warn("uploadMaterial: 업로드 응답에서 파일 URL을 찾지 못했습니다.", rawResponse);
      return "";
    }

    // 백엔드가 상대 경로를 반환하는 경우 절대 URL로 변환
    if (!/^https?:\/\//i.test(fileUrl)) {
      const baseUrl = API_BASE_URL || BACKEND_URL;
      if (fileUrl.startsWith("/")) {
        return `${baseUrl}${fileUrl}`;
      }
      return `${baseUrl}/${fileUrl}`;
    }

    return fileUrl;
  },
};

// 강의 자료 API
export const materialApi = {
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
  // 강의실별 평가 목록 조회
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

// 강의 자료 생성 v2 Phase 응답 타입 (필요 부분만 최소 정의)
export interface MaterialsPhase1Request {
  lectureId: number;
  keyword: string;
  pdfPath?: string;
}

export interface MaterialsPhase1Response {
  sessionId: number;
  draftPlan: Record<string, unknown>;
  progressPercentage: number;
  message?: string;
}

export interface MaterialsPhase2Request {
  sessionId: number;
  // BE 스펙: action은 "confirm" 또는 "feedback"만 허용
  action: "confirm" | "feedback";
  feedback?: string;
}

export interface MaterialsPhase2Response {
  sessionId: number;
  draftPlan?: Record<string, unknown>;
  finalizedBrief?: Record<string, unknown>;
  progressPercentage: number;
  message?: string;
}

export interface MaterialsPhase3Request {
  sessionId: number;
}

export interface MaterialsPhase3Response {
  sessionId: number;
  chapterContentList: Record<string, unknown>;
  totalChapters?: number;
  progressPercentage: number;
  message?: string;
}

export interface MaterialsPhase4Request {
  sessionId: number;
}

export interface MaterialsPhase4Response {
  sessionId: number;
  verifiedContent: Record<string, unknown>;
  progressPercentage: number;
  message?: string;
}

export interface MaterialsPhase5Request {
  sessionId: number;
}

export interface MaterialsPhase5Response {
  sessionId: number;
  finalDocument: string;
  documentUrl?: string;
  progressPercentage: number;
  message?: string;
}

// 최근 세션 조회 / 세션 복구 응답 (latest-session, recover 공통)
export interface MaterialsLatestSessionResponse {
  sessionId: number;
  lectureId: number;
  currentPhase: string;
  progressPercentage: number;
  draftPlan?: Record<string, unknown>;
  finalizedBrief?: Record<string, unknown>;
  chapterContentList?: Record<string, unknown>;
  verifiedContent?: Record<string, unknown>;
  finalDocument?: string;
  documentUrl?: string;
  errorMessage?: string;
  // 그 외 추가 필드는 자유 형식
  [key: string]: unknown;
}

// Phase 3~5 비동기 실행 (한 번에 실행)
export interface MaterialsGenerationAsyncRequest {
  sessionId: number;
}

export interface MaterialsGenerationAsyncResponse {
  taskId: string;
  status: string;
  message?: string;
  statusUrl?: string;
}

export interface TaskStatusResponse {
  taskId?: string;
  status: string;
  documentUrl?: string;
  progressPercentage?: number;
  message?: string;
  [key: string]: unknown;
}

// 모니터링 API 타입 (필수 필드만 최소 정의, 나머지는 자유형)
export interface MonitoringOverview {
  timestamp?: string;
  status?: string;
  [key: string]: unknown;
}

export interface RateLimitStats {
  [key: string]: unknown;
}

export interface CacheStats {
  [key: string]: unknown;
}

export interface AgentStats {
  [key: string]: unknown;
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

// 강의 자료 생성 v2 Phase API
export const materialGenerationApi = {
  phase1: async (payload: MaterialsPhase1Request): Promise<MaterialsPhase1Response> => {
    return apiRequest<MaterialsPhase1Response>("/api/materials/generation/phase1", {
      method: "POST",
      body: JSON.stringify({
        keyword: payload.keyword ?? (payload as unknown as { topic?: string }).topic ?? "",
        lectureId: payload.lectureId,
        pdfPath: payload.pdfPath ?? "",
      }),
    });
  },

  phase2: async (payload: MaterialsPhase2Request): Promise<MaterialsPhase2Response> => {
    return apiRequest<MaterialsPhase2Response>("/api/materials/generation/phase2", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  phase3: async (payload: MaterialsPhase3Request): Promise<MaterialsPhase3Response> => {
    return apiRequest<MaterialsPhase3Response>("/api/materials/generation/phase3", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  phase4: async (payload: MaterialsPhase4Request): Promise<MaterialsPhase4Response> => {
    return apiRequest<MaterialsPhase4Response>("/api/materials/generation/phase4", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  phase5: async (payload: MaterialsPhase5Request): Promise<MaterialsPhase5Response> => {
    return apiRequest<MaterialsPhase5Response>("/api/materials/generation/phase5", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // 특정 강의의 최근 세션 조회
  getLatestSessionForLecture: async (lectureId: number): Promise<MaterialsLatestSessionResponse> => {
    return apiRequest<MaterialsLatestSessionResponse>(
      `/api/materials/generation/lectures/${lectureId}/latest-session`,
      { method: "GET" }
    );
  },

  // 세션 복구 (에러 메시지 제거 후 재시도 가능 상태로 변경)
  recoverSession: async (sessionId: number): Promise<MaterialsLatestSessionResponse> => {
    return apiRequest<MaterialsLatestSessionResponse>(
      `/api/materials/generation/${sessionId}/recover`,
      { method: "POST" }
    );
  },

  /** Phase 3~5 한 번에 비동기 실행. taskId 반환 후 /api/tasks/{taskId}/status 로 진행 조회 */
  runAsync: async (payload: MaterialsGenerationAsyncRequest): Promise<MaterialsGenerationAsyncResponse> => {
    return apiRequest<MaterialsGenerationAsyncResponse>("/api/materials/generation/async", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};

export const tasksApi = {
  getStatus: async (taskId: string): Promise<TaskStatusResponse> => {
    return apiRequest<TaskStatusResponse>(`/api/tasks/${encodeURIComponent(taskId)}/status`, { method: "GET" });
  },
};

// 모니터링 API
export const monitoringApi = {
  getOverview: async (): Promise<MonitoringOverview> => {
    return apiRequest<MonitoringOverview>("/api/monitoring");
  },
  getRateLimit: async (): Promise<RateLimitStats> => {
    return apiRequest<RateLimitStats>("/api/monitoring/rate-limit");
  },
  getCache: async (): Promise<CacheStats> => {
    return apiRequest<CacheStats>("/api/monitoring/cache");
  },
  getAgents: async (): Promise<AgentStats> => {
    return apiRequest<AgentStats>("/api/monitoring/agents");
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

// AI 서비스 전용 요청 (시험 생성 등 - ai-service URL 사용)
const aiServiceRequest = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
  const url = `${AI_SERVICE_URL.replace(/\/$/, '')}${endpoint}`;
  const headers: HeadersInit = { 'Content-Type': 'application/json', ...(options.headers as object) };
  const token = getAuthToken();
  if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { ...options, headers, mode: 'cors', credentials: 'omit' });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API Error (${res.status}): ${text}`);
  }
  if (res.status === 204) return {} as T;
  return res.json();
};

/** 시험 생성 API 요청 (문서: camelCase, lectureId/targetCount/lectureContent 등) */
export interface ExamLearningGoal {
  focusAreas: string[];
  targetDepth: "Concept" | "Application" | "Derivation" | "Deep Understanding";
  questionModality: "Mathematical" | "Theoretical" | "Balance";
}

export interface ExamUserStatus {
  proficiencyLevel: "Beginner" | "Intermediate" | "Advanced";
  weaknessFocus: boolean;
}

export interface ExamInteractionStyle {
  languagePreference: "Korean_with_English_Terms" | "Korean_with_Korean_Terms" | "Only_English";
  scenarioBased: boolean;
}

export interface ExamFeedbackPreference {
  strictness: "Strict" | "Lenient";
  explanationDepth: "Answer_Only" | "Detailed_with_Examples";
}

export interface ExamUserProfile {
  learningGoal: ExamLearningGoal;
  userStatus: ExamUserStatus;
  interactionStyle: ExamInteractionStyle;
  feedbackPreference: ExamFeedbackPreference;
  scopeBoundary: "Lecture_Material_Only" | "Allow_External_Knowledge";
}

export interface ExamGenerationRequest {
  lectureId: number;
  examType: string;
  targetCount: number;
  lectureContent: string;
  topic?: string;
  userProfile?: ExamUserProfile;
}

export interface ExamGenerationResponse {
  examSessionId: string;
  status: string;
  progress?: number;
  exam?: { topic: string; questionCount?: number; questions?: unknown[] };
}

// 시험 생성 비동기 요청/응답 (Swagger: /api/exams/generation/async)
export interface ExamGenerationAsyncRequest {
  examType: string;
  targetCount: number;
  lectureContent: string;
  topic?: string;
  userProfile?: ExamUserProfile;
}

export interface ExamGenerationAsyncResponse {
  taskId: string;
  message?: string;
  status: string;
  statusUrl?: string;
}

// 시험 사전 프로필 대화 요청/응답 (/api/exams/generation/profile)
export interface ExamProfileGenerationRequest {
  lectureContent: string;
  examType?: string;
  existingProfile?: ExamUserProfile;
  userMessage?: string;
}

export interface ExamProfileGenerationResponse {
  status: string; // "INCOMPLETE" | "COMPLETE" 등
  agentMessage: string;
  missingInfo?: string[];
  updatedProfile?: ExamUserProfile;
}

// 시험 세션 상세 조회 응답 (/api/exams/generation/{examSessionId})
export interface ExamFlashCard {
  categoryTag: string;
  frontContent: string;
  backContent: string;
  complexityLevel: string;
}

export interface ExamOxProblem {
  questionContent: string;
  correctAnswer: string;
  explanation: string;
  intentType: string;
}

export interface ExamFiveChoiceOption {
  id: string;
  content: string;
  intent: string;
  isCorrect: boolean;
}

export interface ExamFiveChoiceProblem {
  questionContent: string;
  options: ExamFiveChoiceOption[];
  correctAnswer: string;
  intentDiagnosis: string;
}

export interface ExamShortAnswerProblem {
  questionContent: string;
  relatedKeywords: string[];
  bestAnswer: string;
  evaluationCriteria: string;
}

export interface ExamDebateTopic {
  topic: string;
  context: string;
  proSideStand: string;
  conSideStand: string;
  evaluationCriteria: string[];
}

export interface ExamUsedProfile {
  learningGoal?: {
    focusAreas?: string[];
    targetDepth?: string;
    questionModality?: string;
  };
  userStatus?: {
    proficiencyLevel?: string;
    weaknessFocus?: string[];
  };
  interactionStyle?: {
    languagePreference?: string;
    scenarioBased?: boolean;
  };
  feedbackPreference?: {
    strictness?: string;
    explanationDepth?: string;
  };
  scopeBoundary?: string;
}

export interface ExamSessionDetailResponse {
  examSessionId: number;
  examType: string;
  flashCards: ExamFlashCard[];
  oxProblems: ExamOxProblem[];
  fiveChoiceProblems: ExamFiveChoiceProblem[];
  shortAnswerProblems: ExamShortAnswerProblem[];
  debateTopics: ExamDebateTopic[];
  usedProfile: ExamUsedProfile;
  totalCount: number;
}

// 시험 세션 복구 응답 (/api/exams/generation/{examSessionId}/recover) - Swagger가 key/value 임의 맵을 사용
export interface ExamSessionRecoverResponse {
  [key: string]: string;
}

/** 시험 생성 API 요청 본문: API 문서 기준 camelCase */
function buildExamGenerationBody(payload: ExamGenerationRequest): string {
  const body: Record<string, unknown> = {
    lectureId: payload.lectureId,
    examType: payload.examType,
    targetCount: payload.targetCount,
    lectureContent: payload.lectureContent,
  };
  if (payload.topic != null && payload.topic !== '') body.topic = payload.topic;
  if (payload.userProfile != null) body.userProfile = payload.userProfile;
  return JSON.stringify(body);
}

export const examGenerationApi = {
  createExam: async (payload: ExamGenerationRequest): Promise<ExamGenerationResponse> => {
    return aiServiceRequest<ExamGenerationResponse>('/api/exams/generation', {
      method: 'POST',
      body: buildExamGenerationBody(payload),
    });
  },
  runAsync: async (payload: ExamGenerationAsyncRequest): Promise<ExamGenerationAsyncResponse> => {
    return aiServiceRequest<ExamGenerationAsyncResponse>('/api/exams/generation/async', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  generateProfile: async (payload: ExamProfileGenerationRequest): Promise<ExamProfileGenerationResponse> => {
    return aiServiceRequest<ExamProfileGenerationResponse>('/api/exams/generation/profile', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  recoverSession: async (examSessionId: number): Promise<ExamSessionRecoverResponse> => {
    return aiServiceRequest<ExamSessionRecoverResponse>(`/api/exams/generation/${encodeURIComponent(examSessionId)}/recover`, {
      method: 'POST',
    });
  },
  getSession: async (examSessionId: number): Promise<ExamSessionDetailResponse> => {
    return aiServiceRequest<ExamSessionDetailResponse>(`/api/exams/generation/${encodeURIComponent(examSessionId)}`, {
      method: 'GET',
    });
  },
};
