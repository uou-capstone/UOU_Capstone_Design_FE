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

/** POST /api/lectures/{lectureId}/materials 응답 (materialId, fileUrl/url, displayName 등) */
export interface LectureMaterialUploadResult {
  materialId?: number;
  fileUrl: string;
  displayName?: string;
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
  /** 목록 표시 이름. 없으면 FE에서 `${examType} · N문항`으로 표시 */
  displayName?: string | null;
  /** 시험 출제 기준 업로드 PDF(material). BE가 내려주면 자료별 목록 필터에 사용 */
  sourceMaterialId?: number | null;
  sourceGenerationSessionId?: number | null;
}

/** GET /courses/.../contents 시험 항목에서 자료 식별자 추출 (camelCase·snake_case·구 필드 호환) */
export function readCourseExamSessionResourceIds(
  raw: CourseContentsLectureExamSession & Record<string, unknown>,
): {
  sourceMaterialId?: number;
  sourceGenerationSessionId?: number;
} {
  const num = (x: unknown): number | undefined =>
    typeof x === "number" && Number.isFinite(x) ? x : undefined;
  const mid =
    num(raw.sourceMaterialId) ??
    num(raw.source_material_id) ??
    num(raw.materialId) ??
    num(raw.material_id);
  const gid =
    num(raw.sourceGenerationSessionId) ??
    num(raw.source_generation_session_id) ??
    num(raw.materialGenerationSessionId) ??
    num(raw.material_generation_session_id) ??
    num(raw.generationSessionId) ??
    num(raw.generation_session_id);
  const out: {
    sourceMaterialId?: number;
    sourceGenerationSessionId?: number;
  } = {};
  if (mid != null) out.sourceMaterialId = mid;
  if (gid != null) out.sourceGenerationSessionId = gid;
  return out;
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

/** 이전: answerText 단일 필드. 이후: status + explanation + steps (POST /api/inquiries/answer 응답) */
export interface InquiryResponse {
  answerText: string;
}

/** POST /api/inquiries/answer 응답 — AI 강의 질문에 대한 학생 답변 피드백 */
export interface RemedialStep {
  concept: string;
  explanation: string;
  question: string;
}

export interface InquiryAnswerResponse {
  status: 'GOOD' | 'BAD';
  explanation: string | null;
  steps: RemedialStep[] | null;
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
      
      // 401 Unauthorized — TOKEN_EXPIRED | INVALID_TOKEN | UNAUTHORIZED 등 code 확인
      if (response.status === 401) {
        const fallback =
          errorJson?.message ||
          errorJson?.title ||
          errorText ||
          "인증이 필요합니다. (응답 본문의 code를 백엔드에 전달해 주세요.)";
        const obj =
          errorJson != null && typeof errorJson === "object" && !Array.isArray(errorJson)
            ? (errorJson as Record<string, unknown>)
            : null;
        throw new Error(formatSpring401ForDisplay(obj, String(fallback)));
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
      try {
        const data = await response.json();
        return data;
      } catch {
        // 빈 본문 등으로 JSON 파싱 실패 시 (DELETE 200 등)
        return {} as T;
      }
    } else {
      const text = await response.text();
      return text as T;
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (error instanceof TypeError && (msg === 'Failed to fetch' || msg.includes('fetch'))) {
      throw new Error('네트워크 연결 실패. 백엔드 서버가 켜져 있는지 확인해주세요.');
    }
    if (msg.includes('ERR_EMPTY_RESPONSE') || msg.includes('EMPTY_RESPONSE')) {
      throw new Error('서버에서 응답이 없습니다. 백엔드 서버 상태와 프록시 설정을 확인해주세요.');
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

  /** 강의 자료 삭제 - DELETE /api/lectures/{lectureId}/materials/{materialId} (BE에서 이 경로로 로그 수신 확인) */
  deleteMaterial: async (lectureId: number, materialId: number): Promise<void> => {
    return apiRequest<void>(`/api/lectures/${lectureId}/materials/${materialId}`, {
      method: 'DELETE',
    });
  },

  // 강의 자료 업로드 (PDF) (선생님) - POST /api/lectures/{lectureId}/materials, multipart/form-data file
  // 응답: { materialId, displayName, materialType, url, fileUrl } (Swagger 명세)
  uploadMaterial: async (lectureId: number, file: File): Promise<LectureMaterialUploadResult> => {
    const formData = new FormData();
    formData.append("file", file);

    const rawResponse = await apiRequest<unknown>(
      `/api/lectures/${lectureId}/materials`,
      {
        method: "POST",
        body: formData,
      },
      true
    );

    let materialId: number | undefined;
    let fileUrl: string | null = null;
    let displayName: string | undefined;

    if (typeof rawResponse === "string") {
      fileUrl = rawResponse;
    } else if (rawResponse && typeof rawResponse === "object") {
      const anyResp = rawResponse as {
        materialId?: unknown;
        fileUrl?: unknown;
        url?: unknown;
        displayName?: unknown;
        data?: unknown;
      };

      if (typeof anyResp.materialId === "number") {
        materialId = anyResp.materialId;
      }
      if (typeof anyResp.displayName === "string") {
        displayName = anyResp.displayName;
      }
      if (typeof anyResp.fileUrl === "string") {
        fileUrl = anyResp.fileUrl;
      } else if (typeof anyResp.url === "string") {
        fileUrl = anyResp.url;
      }

      if (!fileUrl && anyResp.data != null) {
        const data = anyResp.data as Record<string, unknown> | string;
        if (typeof data === "string") {
          fileUrl = data;
        } else if (data && typeof data === "object") {
          if (typeof (data as { materialId?: unknown }).materialId === "number") {
            materialId = (data as { materialId: number }).materialId;
          }
          if (typeof (data as { displayName?: unknown }).displayName === "string") {
            displayName = (data as { displayName: string }).displayName;
          }
          const urlVal = (data as { fileUrl?: unknown; url?: unknown }).fileUrl ?? (data as { url?: unknown }).url;
          if (typeof urlVal === "string") {
            fileUrl = urlVal;
          }
        }
      }
    }

    if (!fileUrl && materialId == null) {
      console.warn("uploadMaterial: 업로드 응답에서 fileUrl/materialId를 찾지 못했습니다.", rawResponse);
      return { materialId: undefined, fileUrl: "", displayName: displayName ?? file.name };
    }

    if (fileUrl && !/^https?:\/\//i.test(fileUrl)) {
      const baseUrl = API_BASE_URL || BACKEND_URL;
      fileUrl = fileUrl.startsWith("/") ? `${baseUrl}${fileUrl}` : `${baseUrl}/${fileUrl}`;
    }

    return {
      materialId,
      fileUrl: fileUrl ?? "",
      displayName: displayName ?? file.name,
    };
  },
};

// 강의 자료 API
export const materialApi = {
  deleteMaterial: async (materialId: number): Promise<void> => {
    return apiRequest<void>(`/api/materials/${materialId}`, {
      method: 'DELETE',
    });
  },

  /** 강의 자료(PDF) 다운로드/미리보기 - application/pdf 바이트 반환, 인증 필요 */
  getMaterialFile: async (materialId: number): Promise<Blob> => {
    const isDevHost =
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const endpoint = `/api/materials/${materialId}/file`;
    const baseUrl = API_BASE_URL || BACKEND_URL;
    const url = isDevHost && endpoint.startsWith('/api')
      ? endpoint
      : `${baseUrl}${endpoint}`;
    const token = getAuthToken();
    const doFetch = (targetUrl: string) =>
      fetch(targetUrl, {
        method: 'GET',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'omit',
        mode: 'cors',
      });

    let res = await doFetch(url);

    // 개발 환경: 프록시 경유 시 502면 백엔드 직접 URL로 한 번 재시도
    if (!res.ok && res.status === 502 && isDevHost && url === endpoint) {
      const directUrl = `${baseUrl}${endpoint}`;
      res = await doFetch(directUrl);
    }

    if (!res.ok) {
      const status = res.status;
      if (status === 401) {
        throw new Error('접근 권한이 없습니다.');
      }
      if (status === 502 || status === 503 || status === 504) {
        const hint = isDevHost
          ? ` 백엔드(${baseUrl})가 켜져 있는지 확인해 주세요.`
          : '';
        throw new Error(
          `서버가 일시적으로 응답하지 않습니다 (${status}). 잠시 후 다시 시도해 주세요.${hint}`
        );
      }
      const text = await res.text();
      throw new Error(text || `파일을 불러올 수 없습니다. (${status})`);
    }
    return res.blob();
  },
};

/** AI 강의 질문 답변 요청 (POST /api/inquiries/answer) */
export interface InquiryAnswerRequest {
  aiQuestionId: string;
  answerText: string;
}

// 학습활동 API
export const learningActivityApi = {
  // 손들 질문 제출 (학생)
  submitInquiry: async (lectureId: number, inquiry: Inquiry): Promise<InquiryResponse> => {
    return apiRequest<InquiryResponse>(`/api/lectures/${lectureId}/inquiries`, {
      method: 'POST',
      body: JSON.stringify(inquiry),
    });
  },

  /** AI 강의 질문에 학생 답변 후 정답/오답·해설·하위 개념 질문 수신 (POST /api/inquiries/answer) */
  answerInquiry: async (payload: InquiryAnswerRequest): Promise<InquiryAnswerResponse> => {
    return apiRequest<InquiryAnswerResponse>('/api/inquiries/answer', {
      method: 'POST',
      body: JSON.stringify(payload),
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

/** Phase 2 응답: draftPlan(기본), updatedPlan(수정 요청 후 갱신된 기획안), finalizedBrief(확정 시) */
export interface MaterialsPhase2Response {
  sessionId: number;
  draftPlan?: Record<string, unknown>;
  updatedPlan?: Record<string, unknown>;
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

interface LearningSessionState {
  sessionId: string;
  lectureId: number;
}

export interface IntegratedLearningMessage {
  type: string;
  text: string;
  waitingForAnswer?: boolean;
  questionId?: string;
  final?: boolean;
  raw?: Record<string, unknown>;
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

  /** [삭제] 생성 세션 전체 삭제 (Phase 1~5). 해당 강의 소유 교사만 삭제 가능 */
  deleteSession: async (sessionId: number): Promise<void> => {
    return apiRequest<void>(`/api/materials/generation/${sessionId}`, { method: "DELETE" });
  },

  /** [삭제] Phase 5 산출물(최종 문서)만 삭제. 세션은 유지, Phase 4 상태로 되돌아감 */
  deleteSessionDocument: async (sessionId: number): Promise<void> => {
    return apiRequest<void>(`/api/materials/generation/${sessionId}/document`, { method: "DELETE" });
  },

  /** [미구현→추가] 최종 문서 다운로드/조회. 완료된 세션의 문서 URL 또는 메타 정보 반환 */
  getDocument: async (sessionId: number): Promise<{ documentUrl?: string; url?: string; [key: string]: unknown }> => {
    return apiRequest<{ documentUrl?: string; url?: string; [key: string]: unknown }>(
      `/api/materials/generation/${sessionId}/document`,
      { method: "GET" }
    );
  },

  /** [미구현→추가] 생성 상태 조회 (세션 단위) */
  getSessionStatus: async (sessionId: number): Promise<{ status: string; documentUrl?: string; progressPercentage?: number; message?: string; [key: string]: unknown }> => {
    return apiRequest(
      `/api/materials/generation/${sessionId}/status`,
      { method: "GET" }
    );
  },

  /** [미구현→추가] 실시간 진행 상황 조회 */
  getProgress: async (sessionId: number): Promise<{ progressPercentage?: number; message?: string; [key: string]: unknown }> => {
    return apiRequest(
      `/api/materials/generation/${sessionId}/progress`,
      { method: "GET" }
    );
  },

  /** [미구현→추가] Phase 3~5 삭제 후 기획안(Phase 2)으로 되돌리기 */
  rollbackToPhase2: async (sessionId: number): Promise<{ sessionId: number; [key: string]: unknown }> => {
    return apiRequest(
      `/api/materials/generation/${sessionId}/rollback-to-phase2`,
      { method: "POST" }
    );
  },

  /**
   * Phase N 스트리밍 (GET /api/materials/generation/phaseN/stream?sessionId=...)
   * 인증이 필요하므로 SSE도 EventSource가 아닌 fetch + ReadableStream(`iterateSseDataPayloadsFromResponse`)로 수신.
   * 비-SSE 응답은 동일하게 fetch 본문을 reader로 읽는다.
   */
  streamPhase: (
    sessionId: number,
    phase: 1 | 2 | 3 | 4 | 5,
    callbacks: {
      onProgress?: (data: { progressPercentage?: number; message?: string; currentPhase?: string }) => void;
      onContent?: (chunk: string) => void;
      onDone?: (data: { finalDocument?: string; documentUrl?: string }) => void;
      onError?: (err: Error) => void;
    }
  ): (() => void) => {
    const endpoint = `/api/materials/generation/phase${phase}/stream?sessionId=${encodeURIComponent(sessionId)}`;
    const isDevHost =
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
    const shouldUseViteProxy = isDevHost && endpoint.startsWith("/api");
    const url = shouldUseViteProxy ? endpoint : (API_BASE_URL ? `${API_BASE_URL}${endpoint}` : endpoint);
    const token = getAuthToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    let cancelled = false;
    const abortController = new AbortController();

    (async () => {
      try {
        const res = await fetch(url, { method: "GET", headers, mode: "cors", credentials: "omit", signal: abortController.signal });
        if (!res.ok) {
          callbacks.onError?.(new Error(`스트림 요청 실패: ${res.status}`));
          return;
        }
        const contentType = (res.headers.get("Content-Type") || "").toLowerCase();
        const isSSE = contentType.includes("text/event-stream");
        if (isSSE) {
          try {
            for await (const eventData of iterateSseDataPayloadsFromResponse(res, {
              signal: abortController.signal,
            })) {
              if (cancelled) break;
              try {
                const data = eventData ? (JSON.parse(eventData) as Record<string, unknown>) : {};
                if (data.finalDocument != null || data.documentUrl != null) {
                  callbacks.onDone?.({
                    finalDocument: typeof data.finalDocument === "string" ? data.finalDocument : undefined,
                    documentUrl: typeof data.documentUrl === "string" ? data.documentUrl : undefined,
                  });
                } else if (data.progressPercentage != null || data.message != null || data.currentPhase != null) {
                  callbacks.onProgress?.({
                    progressPercentage: typeof data.progressPercentage === "number" ? data.progressPercentage : undefined,
                    message: typeof data.message === "string" ? data.message : undefined,
                    currentPhase: typeof data.currentPhase === "string" ? data.currentPhase : undefined,
                  });
                } else if (typeof data.chunk === "string") {
                  callbacks.onContent?.(data.chunk);
                }
              } catch {
                /* ignore parse error for non-JSON lines */
              }
            }
          } catch (e) {
            if (!cancelled && e instanceof Error && e.name !== "AbortError") {
              callbacks.onError?.(e);
            }
          }
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) {
          callbacks.onError?.(new Error("스트림 본문을 읽을 수 없습니다."));
          return;
        }
        const decoder = new TextDecoder();
        let buffer = "";
        while (!cancelled) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          callbacks.onContent?.(buffer);
          buffer = "";
        }
        if (buffer.trim()) callbacks.onContent?.(buffer);
      } catch (e) {
        if (!cancelled && e instanceof Error && e.name !== "AbortError") callbacks.onError?.(e);
      }
    })();

    return () => {
      cancelled = true;
      abortController.abort();
    };
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

const learningSessionByLecture = new Map<number, LearningSessionState>();

/**
 * 인증(Authorization) 헤더가 필요한 SSE는 브라우저 `EventSource`로 설정할 수 없다.
 * `fetch` 후 `Response.body`(ReadableStream)에서 `getReader()`로 읽고 `data:` 줄만 파싱한다.
 */
async function* iterateSseDataPayloadsFromResponse(
  response: Response,
  options?: { signal?: AbortSignal },
): AsyncGenerator<string, void, undefined> {
  const stream = response.body;
  if (!stream) return;

  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      if (options?.signal?.aborted) {
        await reader.cancel();
        return;
      }
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n");
      buffer = parts.pop() ?? "";
      for (const rawLine of parts) {
        const line = rawLine.replace(/\r$/, "").trimEnd();
        if (!line.startsWith("data:")) continue;
        yield line.slice("data:".length).trimStart();
      }
    }

    const tail = buffer.replace(/\r$/, "").trimEnd();
    if (tail.startsWith("data:")) {
      yield tail.slice("data:".length).trimStart();
    }
  } finally {
    reader.releaseLock();
  }
}

/** Spring `Flux<ServerSentEvent>` / 표준 SSE: `event:` + `data:` 블록이 빈 줄(`\\n\\n`)로 구분됨 */
type LegacyLectureNextSseYield =
  | { kind: "delta"; text: string; raw: Record<string, unknown> }
  | { kind: "done"; payload: Record<string, unknown> }
  | { kind: "error"; message: string; raw?: Record<string, unknown> };

function consumeDoubleNewlineBlock(buffer: string): { block: string; rest: string } | null {
  const rn = buffer.indexOf("\r\n\r\n");
  const n = buffer.indexOf("\n\n");
  let end = -1;
  let sep = 2;
  if (rn !== -1 && (n === -1 || rn <= n)) {
    end = rn;
    sep = 4;
  } else if (n !== -1) {
    end = n;
    sep = 2;
  } else {
    return null;
  }
  return { block: buffer.slice(0, end), rest: buffer.slice(end + sep) };
}

function mapLegacyNextSseBlock(eventName: string, dataJoined: string): LegacyLectureNextSseYield[] {
  const ev = eventName.trim().toLowerCase();
  let parsed: Record<string, unknown> | null = null;
  if (dataJoined.trim()) {
    try {
      parsed = JSON.parse(dataJoined) as Record<string, unknown>;
    } catch {
      if (ev === "error") {
        return [{ kind: "error", message: dataJoined.trim() }];
      }
      return [{ kind: "delta", text: dataJoined, raw: { type: "delta", delta: dataJoined } }];
    }
  } else {
    parsed = {};
  }

  const t = String(parsed?.type ?? "").toLowerCase();
  if (ev === "error" || t === "error") {
    const msg =
      pickFirstString(parsed ?? {}, ["message", "error"]) ?? "스트림 오류";
    return [{ kind: "error", message: msg, raw: parsed ?? undefined }];
  }
  if (ev === "done" || t === "done") {
    return [{ kind: "done", payload: parsed ?? {} }];
  }

  const delta =
    pickFirstString(parsed ?? {}, ["delta", "text", "content", "chunk"]) ?? "";
  if (delta) {
    return [{ kind: "delta", text: delta, raw: parsed ?? {} }];
  }
  if (t === "delta") {
    return [{ kind: "delta", text: "", raw: parsed ?? {} }];
  }
  return [];
}

async function* iterateLegacyLectureNextSse(
  response: Response,
  options?: { signal?: AbortSignal },
): AsyncGenerator<LegacyLectureNextSseYield, void, undefined> {
  const stream = response.body;
  if (!stream) return;

  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const flushBlock = function* (block: string): Generator<LegacyLectureNextSseYield, void, undefined> {
    let ev = "";
    const dataLines: string[] = [];
    for (const rawLine of block.split(/\r?\n/)) {
      const line = rawLine.replace(/\r$/, "");
      if (line.startsWith("event:")) {
        ev = line.slice("event:".length).trim();
        continue;
      }
      if (line.startsWith("data:")) {
        dataLines.push(line.slice("data:".length).trimStart());
        continue;
      }
    }
    const dataJoined = dataLines.join("\n");
    for (const y of mapLegacyNextSseBlock(ev, dataJoined)) {
      yield y;
    }
  };

  try {
    while (true) {
      if (options?.signal?.aborted) {
        await reader.cancel();
        return;
      }
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      for (;;) {
        const consumed = consumeDoubleNewlineBlock(buffer);
        if (!consumed) break;
        buffer = consumed.rest;
        if (consumed.block.trim()) {
          for (const y of flushBlock(consumed.block)) {
            yield y;
          }
        }
      }
    }
    const tail = buffer.trim();
    if (tail) {
      for (const y of flushBlock(buffer)) {
        yield y;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

const normalizeSseData = (value: unknown): Record<string, unknown> | null => {
  if (value == null) return null;
  if (typeof value === "object") return value as Record<string, unknown>;
  if (typeof value !== "string") return null;
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const toBool = (value: unknown): boolean | undefined => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const lowered = value.toLowerCase();
    if (lowered === "true") return true;
    if (lowered === "false") return false;
  }
  return undefined;
};

const pickFirstString = (obj: Record<string, unknown>, keys: string[]): string | undefined => {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === "string" && v.trim().length > 0) return v;
  }
  return undefined;
};

/** 브라우저에서 /api 프록시(로컬) vs 절대 백엔드 URL */
const resolveBrowserApiUrl = (endpoint: string): string => {
  const isDevHost =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
  const shouldUseViteProxy = isDevHost && endpoint.startsWith("/api");
  if (shouldUseViteProxy) return endpoint;
  return API_BASE_URL ? `${String(API_BASE_URL).replace(/\/$/, "")}${endpoint}` : endpoint;
};

/** Spring 401 JSON (`RestAuthenticationEntryPoint` 등): code·message 파싱 */
const parseSpringErrorJsonFromText = (text: string): Record<string, unknown> | null => {
  const t = text.trim();
  if (!t) return null;
  try {
    const o = JSON.parse(t) as unknown;
    if (o != null && typeof o === "object" && !Array.isArray(o)) {
      return o as Record<string, unknown>;
    }
  } catch {
    /* ignore */
  }
  return null;
};

const formatSpring401ForDisplay = (
  parsed: Record<string, unknown> | null | undefined,
  fallback: string,
): string => {
  if (!parsed) return fallback;
  const code = parsed.code != null ? String(parsed.code).trim() : "";
  const msg =
    (typeof parsed.message === "string" && parsed.message.trim()) ||
    (typeof parsed.detail === "string" && parsed.detail.trim()) ||
    fallback;
  return code ? `[${code}] ${msg}` : msg;
};

/** Spring 공통 래핑 `{ data: { ... } }` / 중첩 data 병합 */
const unwrapSpringSessionJson = (raw: Record<string, unknown>): Record<string, unknown> => {
  let cur: Record<string, unknown> = { ...raw };
  const d1 = cur.data;
  if (d1 != null && typeof d1 === "object" && !Array.isArray(d1)) {
    cur = { ...cur, ...(d1 as Record<string, unknown>) };
  }
  return cur;
};

/**
 * 통합 학습 v3 — POST /api/learning/sessions/{lectureId}
 * 쿼리: pdfPath, sessionId(선택, 기존 세션 재사용)
 * 401 시 refreshToken이 있으면 1회 갱신 후 재시도.
 */
const ensureLearningSession = async (
  lectureId: number,
  pdfPath?: string,
  opts?: { sessionId?: string },
): Promise<LearningSessionState> => {
  if (!opts?.sessionId) {
    const cached = learningSessionByLecture.get(lectureId);
    if (cached) return cached;
  }

  const sp = new URLSearchParams();
  if (pdfPath) sp.set("pdfPath", pdfPath);
  if (opts?.sessionId) sp.set("sessionId", opts.sessionId);
  const qs = sp.toString();
  const path = `/api/learning/sessions/${encodeURIComponent(lectureId)}${qs ? `?${qs}` : ""}`;

  const postOnce = (bearer: string) =>
    fetch(resolveBrowserApiUrl(path), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${bearer.trim()}`,
      },
      body: JSON.stringify({}),
      mode: "cors",
      credentials: "omit",
    });

  let bearer = getAuthToken();
  if (!bearer?.trim()) {
    throw new Error("로그인이 필요합니다. 통합학습을 쓰려면 먼저 로그인해 주세요.");
  }

  const throwIfFailed = (
    res: Response,
    parsed: Record<string, unknown>,
    text: string,
  ): never => {
    const flat = unwrapSpringSessionJson(parsed);
    const rawMsg =
      (typeof flat.message === "string" && flat.message) ||
      (typeof flat.detail === "string" && flat.detail) ||
      (typeof parsed.message === "string" && parsed.message) ||
      text ||
      `학습 세션 요청 실패 (${res.status})`;
    const msg = formatSpring401ForDisplay(flat, rawMsg);
    if (res.status === 401) {
      const code = String(flat.code ?? parsed.code ?? "").trim();
      const hint =
        code === "TOKEN_EXPIRED"
          ? "토큰이 만료된 경우입니다. 다시 로그인한 뒤 시도해 주세요."
          : code === "INVALID_TOKEN"
            ? "JWT 검증 실패입니다. 재로그인 후에도 동일하면 백엔드(키·인스턴스)를 확인해 주세요."
            : code === "UNAUTHORIZED"
              ? "서버가 인증 헤더를 받지 못한 경우입니다. Network 탭에서 Authorization 전송 여부를 확인해 주세요."
              : code === "4010"
                ? "백엔드 애플리케이션 전용 code로 보입니다. (RestAuthenticationEntryPoint의 TOKEN_EXPIRED 등과 다를 수 있음.) " +
                  "동일 Bearer로 GET /api/users/me가 200인지 Network에서 확인한 뒤, 4010을 내는 컨트롤러/필터/글로벌 핸들러 위치를 백엔드에 문의해 주세요."
                : "Bearer를 보냈는데도 401이면, 같은 토큰으로 GET /api/users/me 성공 여부와 응답 code 전체 JSON을 백엔드에 전달해 주세요.";
      throw new Error(`${msg}\n\n${hint}`);
    }
    throw new Error(msg);
  };

  for (let attempt = 0; attempt < 2; attempt++) {
    bearer = getAuthToken();
    if (!bearer?.trim()) {
      throw new Error("로그인이 필요합니다. 통합학습을 쓰려면 먼저 로그인해 주세요.");
    }

    const res = await postOnce(bearer);
    const text = await res.text();
    let parsed: Record<string, unknown> = {};
    if (text.trim()) {
      try {
        parsed = JSON.parse(text) as Record<string, unknown>;
      } catch {
        parsed = {};
      }
    }

    if (!res.ok) {
      if (
        res.status === 401 &&
        attempt === 0 &&
        getRefreshToken()
      ) {
        try {
          await authApi.refresh();
          continue;
        } catch {
          /* 첫 응답 기준으로 실패 처리 */
        }
      }
      throwIfFailed(res, parsed, text);
    }

    const merged = unwrapSpringSessionJson(parsed);
    const rawSessionId = merged.session_id ?? merged.sessionId;
    if (rawSessionId == null) {
      throw new Error("학습 세션 생성 응답에 session_id가 없습니다.");
    }
    const session = { sessionId: String(rawSessionId), lectureId };
    learningSessionByLecture.set(lectureId, session);
    return session;
  }

  throw new Error("학습 세션을 열 수 없습니다.");
};

/** 요청 바디: { type, …필드 } 평탄화 (payload 중첩 제거). lectureId는 쿼리로만 전달 */
const flattenLearningEventBody = (eventBody: {
  type: string;
  payload?: Record<string, unknown>;
}): Record<string, unknown> => {
  const flat: Record<string, unknown> = { type: eventBody.type };
  const p = eventBody.payload;
  if (p != null && typeof p === "object" && !Array.isArray(p)) {
    Object.assign(flat, p);
  }
  return flat;
};

/**
 * 통합 학습 v3 — POST /api/learning/sessions/{sessionId}/event (+ SSE)
 * Accept: text/event-stream. data: JSON — heartbeat 무시, agent_delta 누적 렌더는 매퍼에서 처리.
 */
const postLearningEventAndCollect = async (
  sessionId: string,
  eventBody: {
    type: string;
    lectureId?: number;
    payload?: Record<string, unknown>;
  },
  lectureId?: number,
): Promise<Record<string, unknown>[]> => {
  const lectureIdForQuery = eventBody.lectureId ?? lectureId;
  const query =
    lectureIdForQuery != null
      ? `?lectureId=${encodeURIComponent(String(lectureIdForQuery))}`
      : "";
  const endpoint = `/api/learning/sessions/${encodeURIComponent(sessionId)}/event${query}`;
  const token = getAuthToken();
  if (!token?.trim()) {
    throw new Error("로그인이 필요합니다. 학습 이벤트(SSE) 요청에는 Bearer 토큰이 필요합니다.");
  }
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "text/event-stream",
    Authorization: `Bearer ${token.trim()}`,
  };

  const requestBody = flattenLearningEventBody({
    type: eventBody.type,
    payload: eventBody.payload ?? {},
  });

  const fetchEvent = () =>
    fetch(resolveBrowserApiUrl(endpoint), {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
      mode: "cors",
      credentials: "omit",
    });

  let res = await fetchEvent();

  if (!res.ok && res.status === 401 && getRefreshToken()) {
    try {
      await authApi.refresh();
      const t2 = getAuthToken();
      if (t2?.trim()) {
        headers.Authorization = `Bearer ${t2.trim()}`;
        res = await fetchEvent();
      }
    } catch {
      /* 아래 동일 에러 처리 */
    }
  }

  if (!res.ok) {
    const text = await res.text();
    const ep = parseSpringErrorJsonFromText(text);
    const merged401 = ep ? unwrapSpringSessionJson(ep) : null;
    const base = text || "학습 이벤트 요청 실패";
    const line =
      res.status === 401
        ? formatSpring401ForDisplay(merged401 ?? ep, base)
        : base;
    throw new Error(`API Error (${res.status}): ${line}`);
  }

  const reader = res.body?.getReader();
  if (!reader) return [];
  const decoder = new TextDecoder();
  const events: Record<string, unknown>[] = [];
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;
      const payload = line.startsWith("data:")
        ? line.slice(5).trim()
        : line;
      const parsed = normalizeSseData(payload);
      if (!parsed) continue;
      const eventType = String(parsed.type ?? "");
      if (eventType === "heartbeat") continue;
      events.push(parsed);
      if (eventType === "done" || toBool(parsed.final) === true) {
        return events;
      }
      if (eventType === "error") {
        return events;
      }
    }
  }

  const tail = buffer.trim();
  if (tail.length > 0) {
    const payload = tail.startsWith("data:") ? tail.slice(5).trim() : tail;
    const parsed = normalizeSseData(payload);
    if (parsed) events.push(parsed);
  }

  return events;
};

/** 연속 agent_delta 청크를 하나로 합쳐 스트림 표시와 매핑을 단순화 */
const coalesceLearningStreamEvents = (
  events: Record<string, unknown>[],
): Record<string, unknown>[] => {
  const out: Record<string, unknown>[] = [];
  let acc = "";
  const flushDelta = () => {
    if (acc.length === 0) return;
    out.push({ type: "agent_delta", delta: acc });
    acc = "";
  };
  const deltaPiece = (ev: Record<string, unknown>): string => {
    const payload = (ev.payload as Record<string, unknown> | undefined) ?? {};
    return (
      pickFirstString(ev, ["delta", "content", "message", "text"]) ??
      pickFirstString(payload, ["delta", "content", "message", "text"]) ??
      ""
    );
  };
  for (const ev of events) {
    const t = String(ev.type ?? "").toLowerCase();
    if (t === "heartbeat") continue;
    if (t === "agent_delta") {
      acc += deltaPiece(ev);
      continue;
    }
    flushDelta();
    out.push(ev);
  }
  flushDelta();
  return out;
};

const mapLearningEventsToNextResponse = (
  lectureId: number,
  events: Record<string, unknown>[]
): StreamNextResponse => {
  const merged = coalesceLearningStreamEvents(events);
  let waitingForAnswer = false;
  let aiQuestionId: string | undefined;
  let hasMore = true;
  let status = "COMPLETED";
  let contentType: ContentType | string = "CONCEPT";
  const chunks: string[] = [];

  for (const event of merged) {
    const type = String(event.type ?? "").toLowerCase();
    const message =
      pickFirstString(event, ["delta", "content", "message", "text", "main", "thought"]) ??
      pickFirstString((event.payload as Record<string, unknown>) ?? {}, ["delta", "content", "message", "text"]);
    if (message) chunks.push(message);

    const boolWaiting = toBool(event.waiting_for_answer ?? event.waitingForAnswer);
    if (boolWaiting != null) waitingForAnswer = boolWaiting;
    const qid = pickFirstString(event, ["ai_question_id", "aiQuestionId", "question_id", "questionId"]);
    if (qid) aiQuestionId = qid;

    if (type === "agent_delta") {
      contentType = "SCRIPT";
    } else if (type.includes("question") || boolWaiting === true || qid) {
      contentType = "QUESTION";
    } else if (type.includes("supplement")) {
      contentType = "SUPPLEMENTARY";
    }

    if (type === "error") {
      status = "ERROR";
      hasMore = false;
      break;
    }
    if (type === "done" || toBool(event.final) === true) {
      hasMore = false;
      status = "COMPLETED";
      break;
    }
  }

  return {
    status,
    lectureId,
    contentType,
    contentData: chunks.join("\n").trim(),
    hasMore,
    waitingForAnswer,
    ...(aiQuestionId ? { aiQuestionId } : {}),
  };
};

const mapLearningEventsToIntegratedMessages = (
  events: Record<string, unknown>[],
): IntegratedLearningMessage[] => {
  const merged = coalesceLearningStreamEvents(events);
  const out: IntegratedLearningMessage[] = [];
  for (const event of merged) {
    const type = String(event.type ?? event.event ?? "message").toLowerCase();
    if (type === "heartbeat") continue;
    const payload =
      (event.payload as Record<string, unknown> | undefined) ?? {};
    const text =
      pickFirstString(event, [
        "delta",
        "content",
        "message",
        "text",
        "answer",
        "main",
        "thought",
      ]) ??
      pickFirstString(payload, [
        "delta",
        "content",
        "message",
        "text",
        "answer",
        "main",
        "thought",
      ]) ??
      "";
    const doneData =
      event.data != null && typeof event.data === "object"
        ? (event.data as Record<string, unknown>)
        : {};
    const doneUi =
      doneData.ui != null && typeof doneData.ui === "object"
        ? (doneData.ui as Record<string, unknown>)
        : {};
    const widget = pickFirstString(doneUi, ["widget"]);
    const modal = pickFirstString(doneUi, ["modal"]);
    const doneUiText =
      widget != null
        ? `다음 단계: ${widget}`
        : modal != null
          ? `선택 필요: ${modal}`
          : "";
    out.push({
      type,
      text: text || doneUiText,
      waitingForAnswer:
        toBool(event.waiting_for_answer ?? event.waitingForAnswer) ?? false,
      questionId: pickFirstString(event, [
        "ai_question_id",
        "aiQuestionId",
        "question_id",
        "questionId",
      ]),
      final: toBool(event.final) ?? type === "done",
      raw: event,
    });
  }
  return out;
};

const unwrapLegacyLecturePayload = (raw: unknown): Record<string, unknown> => {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  if (o.data != null && typeof o.data === "object" && !Array.isArray(o.data)) {
    return { ...o, ...(o.data as Record<string, unknown>) };
  }
  return o;
};

const normalizeLegacyStreamNext = (raw: unknown, lectureId: number): StreamNextResponse => {
  const r = unwrapLegacyLecturePayload(raw);
  return {
    status: String(r.status ?? "OK"),
    lectureId: Number(r.lectureId ?? r.lecture_id ?? lectureId),
    contentType: String(r.contentType ?? r.content_type ?? "SCRIPT") as ContentType | string,
    contentData: String(r.contentData ?? r.content_data ?? r.message ?? r.text ?? ""),
    chapterTitle: pickFirstString(r, ["chapterTitle", "chapter_title"]),
    hasMore: toBool(r.hasMore ?? r.has_more) ?? false,
    waitingForAnswer: toBool(r.waitingForAnswer ?? r.waiting_for_answer) ?? false,
    aiQuestionId: pickFirstString(r, ["aiQuestionId", "ai_question_id", "questionId", "question_id"]),
  };
};

/** GET /stream/next SSE 마지막 `done` 이벤트 + 누적 delta → StreamNextResponse */
const legacySseDoneToStreamNext = (
  done: Record<string, unknown>,
  lectureId: number,
  accumulatedDelta: string,
): StreamNextResponse => {
  const waiting = toBool(done.waitingForAnswer ?? done.waiting_for_answer) ?? false;
  const statusRaw = String(done.status ?? "").toUpperCase();
  const status =
    statusRaw === "WAITING_FOR_ANSWER" || waiting
    ? "WAITING_FOR_ANSWER"
    : String(done.status ?? "COMPLETED");
  return {
    status,
    lectureId: Number(done.lectureId ?? done.lecture_id ?? lectureId),
    contentType: String(done.contentType ?? done.content_type ?? "SCRIPT") as ContentType | string,
    contentData:
      accumulatedDelta.trim().length > 0
        ? accumulatedDelta
        : String(done.contentData ?? done.content_data ?? ""),
    chapterTitle: pickFirstString(done, ["chapterTitle", "chapter_title"]),
    hasMore: toBool(done.hasMore ?? done.has_more) ?? false,
    waitingForAnswer: waiting,
    aiQuestionId: pickFirstString(done, ["aiQuestionId", "ai_question_id", "questionId", "question_id"]),
  };
};

function buildLectureLegacyStreamNextUrl(
  lectureId: number,
  query: { pageNumber?: string; page?: string; userMessage?: string },
): string {
  const path = `/api/lectures/${encodeURIComponent(lectureId)}/stream/next`;
  const sp = new URLSearchParams();
  if (query.pageNumber != null && query.pageNumber !== "") {
    sp.set("pageNumber", query.pageNumber);
  }
  if (query.page != null && query.page !== "") {
    sp.set("page", query.page);
  }
  if (query.userMessage != null && query.userMessage !== "") {
    sp.set("userMessage", query.userMessage);
  }
  const qs = sp.toString();
  const withQuery = qs ? `${path}?${qs}` : path;
  const isDevHost =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
  if (isDevHost && withQuery.startsWith("/api")) return withQuery;
  return `${String(API_BASE_URL).replace(/\/$/, "")}${withQuery}`;
}

/**
 * 강의 AI Legacy (`/api/lectures/{lectureId}/stream/*`).
 * - `stream/next`: GET + `text/event-stream` (Spring SSE `message` / `done` / `error`), fetch+ReadableStream
 * - 그 외: 기존 initialize/answer/cancel 등 POST/GET
 */
export const lectureAiLegacyStreamApi = {
  getSession: async (lectureId: number): Promise<StreamSessionState> => {
    const raw = await apiRequest<Record<string, unknown>>(
      `/api/lectures/${encodeURIComponent(lectureId)}/stream/session`,
      { method: "GET" },
    );
    const r = unwrapLegacyLecturePayload(raw);
    return {
      status: String(r.status ?? "ACTIVE"),
      lectureId: Number(r.lectureId ?? r.lecture_id ?? lectureId),
      serviceStatus: "LEGACY_STREAM",
      chapters: r.chapters as Record<string, unknown> | undefined,
      createdAt:
        typeof r.createdAt === "string"
          ? r.createdAt
          : typeof r.created_at === "string"
            ? r.created_at
            : undefined,
      updatedAt:
        typeof r.updatedAt === "string"
          ? r.updatedAt
          : typeof r.updated_at === "string"
            ? r.updated_at
            : undefined,
      error:
        (r.error as Record<string, unknown> | null | undefined) === undefined
          ? null
          : (r.error as Record<string, unknown> | null),
    };
  },
  initialize: async (
    lectureId: number,
    options?: { pageNumber?: number; materialId?: number },
  ): Promise<StreamInitializeResponse> => {
    const body: Record<string, unknown> = {};
    if (options?.pageNumber != null) {
      body.pageNumber = options.pageNumber;
      body.page = options.pageNumber;
    }
    if (options?.materialId != null) {
      body.materialId = options.materialId;
    }
    const raw = await apiRequest<unknown>(
      `/api/lectures/${encodeURIComponent(lectureId)}/stream/initialize`,
      { method: "POST", body: JSON.stringify(body) },
    );
    const r = unwrapLegacyLecturePayload(raw);
    const chaptersRaw = r.chapters;
    const chapters = Array.isArray(chaptersRaw)
      ? (chaptersRaw as Array<Record<string, unknown>>).map((c) => ({
          title: String(c.title ?? ""),
          startPage: Number(c.startPage ?? c.start_page ?? 0),
          endPage: Number(c.endPage ?? c.end_page ?? 0),
        }))
      : [];
    return {
      status: String(r.status ?? "ACTIVE"),
      lectureId: Number(r.lectureId ?? r.lecture_id ?? lectureId),
      totalChapters: Number(r.totalChapters ?? r.total_chapters ?? chapters.length),
      chapters,
    };
  },
  /**
   * GET `text/event-stream` — Spring SSE(`message`/`done`/`error`).
   * EventSource 대신 fetch + ReadableStream + Authorization.
   */
  next: async (
    lectureId: number,
    options?: {
      pageNumber?: number;
      userMessage?: string | null;
      signal?: AbortSignal;
      /** NDJSON 청크마다 호출 → 타이핑 UX */
      onDelta?: (chunk: string) => void;
    },
  ): Promise<StreamNextResponse> => {
    const page = options?.pageNumber;
    const um = options?.userMessage?.trim();
    const url = buildLectureLegacyStreamNextUrl(lectureId, {
      ...(page != null ? { page: String(page), pageNumber: String(page) } : {}),
      ...(um ? { userMessage: um } : {}),
    });
    const token = getAuthToken();
    const headers: Record<string, string> = {
      Accept: "text/event-stream",
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(url, {
      method: "GET",
      headers,
      mode: "cors",
      credentials: "omit",
      signal: options?.signal,
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`API Error (${res.status}): ${t || "stream/next 요청 실패"}`);
    }
    let accumulated = "";
    let lastDone: Record<string, unknown> | null = null;
    for await (const ev of iterateLegacyLectureNextSse(res, { signal: options?.signal })) {
      if (ev.kind === "delta") {
        if (ev.text) {
          accumulated += ev.text;
          options?.onDelta?.(ev.text);
        }
      } else if (ev.kind === "done") {
        lastDone = ev.payload;
        break;
      } else {
        throw new Error(ev.message);
      }
    }
    if (lastDone) {
      return legacySseDoneToStreamNext(lastDone, lectureId, accumulated);
    }
    return normalizeLegacyStreamNext(
      {
        status: "COMPLETED",
        type: "done",
        lectureId,
        contentData: accumulated,
        hasMore: false,
        waitingForAnswer: false,
      },
      lectureId,
    );
  },
  answer: async (
    lectureId: number,
    payload: StreamAnswerRequest,
  ): Promise<StreamAnswerResponse> => {
    const raw = await apiRequest<unknown>(
      `/api/lectures/${encodeURIComponent(lectureId)}/stream/answer`,
      { method: "POST", body: JSON.stringify(payload) },
    );
    const r = unwrapLegacyLecturePayload(raw);
    return {
      status: String(r.status ?? "COMPLETED"),
      lectureId: Number(r.lectureId ?? r.lecture_id ?? lectureId),
      aiQuestionId: String(r.aiQuestionId ?? r.ai_question_id ?? payload.aiQuestionId),
      question: pickFirstString(r, ["question", "questionText", "question_text"]),
      chapterTitle: pickFirstString(r, ["chapterTitle", "chapter_title"]),
      canContinue: toBool(r.canContinue ?? r.can_continue) ?? true,
      supplementary:
        typeof r.supplementary === "string"
          ? r.supplementary
          : typeof r.supplementaryContent === "string"
            ? r.supplementaryContent
            : undefined,
    };
  },
  cancel: async (lectureId: number): Promise<void> => {
    await apiRequest(`/api/lectures/${encodeURIComponent(lectureId)}/stream/cancel`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  },
};

/** 강의 학습 탭 — Spring `POST /api/learning/sessions` + `.../event` SSE */
export const streamingApi = {
  getSession: async (lectureId: number): Promise<StreamSessionState> => {
    const session = await ensureLearningSession(lectureId);
    return {
      status: "ACTIVE",
      lectureId,
      serviceStatus: "LEARNING_SESSION_V3",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      chapters: { sessionId: session.sessionId },
    };
  },
  initialize: async (lectureId: number, _options?: { pageNumber?: number }): Promise<StreamInitializeResponse> => {
    const session = await ensureLearningSession(lectureId);
    await postLearningEventAndCollect(
      session.sessionId,
      {
        type: "SESSION_ENTERED",
        lectureId,
        payload: {},
      },
      lectureId
    );
    return {
      status: "ACTIVE",
      lectureId,
      totalChapters: 0,
      chapters: [],
    };
  },
  next: async (lectureId: number, options?: { pageNumber?: number }): Promise<StreamNextResponse> => {
    const session = await ensureLearningSession(lectureId);
    const eventType = options?.pageNumber != null ? "PAGE_CHANGED" : "NEXT_PAGE_DECISION";
    const payload: Record<string, unknown> = {};
    if (options?.pageNumber != null) {
      payload.page = options.pageNumber;
    } else {
      payload.accept = true;
    }
    const events = await postLearningEventAndCollect(
      session.sessionId,
      { type: eventType, lectureId, payload },
      lectureId,
    );
    return mapLearningEventsToNextResponse(lectureId, events);
  },
  answer: async (lectureId: number, payload: StreamAnswerRequest): Promise<StreamAnswerResponse> => {
    const session = await ensureLearningSession(lectureId);
    await postLearningEventAndCollect(
      session.sessionId,
      {
        type: "QUIZ_SUBMITTED",
        lectureId,
        payload: {
          aiQuestionId: payload.aiQuestionId,
          answer: payload.answer,
        },
      },
      lectureId
    );
    return {
      status: "COMPLETED",
      lectureId,
      aiQuestionId: payload.aiQuestionId,
      canContinue: true,
    };
  },
  cancel: async (lectureId: number): Promise<void> => {
    const session = learningSessionByLecture.get(lectureId);
    if (!session) return;
    try {
      await postLearningEventAndCollect(
        session.sessionId,
        { type: "SAVE_AND_EXIT", lectureId, payload: {} },
        lectureId,
      );
    } finally {
      learningSessionByLecture.delete(lectureId);
    }
  },
};

export const integratedLearningApi = {
  openSession: async (
    lectureId: number,
    options?: { pdfPath?: string; sessionId?: string },
  ): Promise<{ sessionId: string; lectureId: number }> => {
    const s = await ensureLearningSession(lectureId, options?.pdfPath, {
      sessionId: options?.sessionId,
    });
    return { sessionId: s.sessionId, lectureId: s.lectureId };
  },
  sendEvent: async (
    lectureId: number,
    sessionId: string,
    eventType: string,
    payload?: Record<string, unknown>,
  ): Promise<IntegratedLearningMessage[]> => {
    const events = await postLearningEventAndCollect(
      sessionId,
      { type: eventType, lectureId, payload: payload ?? {} },
      lectureId,
    );
    return mapLearningEventsToIntegratedMessages(events);
  },
  closeSession: async (lectureId: number): Promise<void> => {
    const session = learningSessionByLecture.get(lectureId);
    if (!session) return;
    try {
      await postLearningEventAndCollect(
        session.sessionId,
        { type: "SAVE_AND_EXIT", lectureId, payload: {} },
        lectureId,
      );
    } finally {
      learningSessionByLecture.delete(lectureId);
    }
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
  /** 출제 기준 업로드 PDF (선택). BE가 저장·목록 필터에 반영 */
  sourceMaterialId?: number;
  /** 출제 기준 AI 생성 문서 세션 (선택) */
  sourceGenerationSessionId?: number;
}

export interface ExamGenerationResponse {
  examSessionId: string;
  status: string;
  progress?: number;
  exam?: { topic: string; questionCount?: number; questions?: unknown[] };
}

// 시험 생성 비동기 요청/응답 (Swagger: /api/exams/generation/async)
export interface ExamGenerationAsyncRequest {
  lectureId: number;
  examType: string;
  targetCount: number;
  lectureContent: string;
  topic?: string;
  userProfile?: ExamUserProfile;
  /** 시험 목록 표시용 이름(선택). 미전달 시 BE 기본 규칙에 따름 */
  displayName?: string;
  sourceMaterialId?: number;
  sourceGenerationSessionId?: number;
  /**
   * 업로드 PDF 미리보기 기준 출제 시: 사용자가 보고 있는 페이지(1-based).
   * BE가 해당 필드를 지원하면 이 페이지 범위만 출제에 사용할 수 있음.
   */
  sourcePdfPage?: number;
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
  /** 백엔드가 내려주는 경우 출제 의도(진단) 텍스트 */
  intentDiagnosis?: string;
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
  usedProfile?: ExamUsedProfile;
  totalCount: number;
}

/** BE가 snake_case로 보낼 수 있으므로 camelCase로 정규화 */
function normalizeExamSessionDetail(raw: Record<string, unknown>): ExamSessionDetailResponse {
  const arr = (key: string, alt: string) => {
    const v = raw[key] ?? raw[alt];
    return Array.isArray(v) ? v : [];
  };
  return {
    examSessionId: Number(raw.examSessionId ?? raw.exam_session_id ?? 0),
    examType: String(raw.examType ?? raw.exam_type ?? ''),
    flashCards: arr('flashCards', 'flash_cards') as ExamFlashCard[],
    oxProblems: arr('oxProblems', 'ox_problems') as ExamOxProblem[],
    fiveChoiceProblems: arr('fiveChoiceProblems', 'five_choice_problems') as ExamFiveChoiceProblem[],
    shortAnswerProblems: arr('shortAnswerProblems', 'short_answer_problems') as ExamShortAnswerProblem[],
    debateTopics: arr('debateTopics', 'debate_topics') as ExamDebateTopic[],
    usedProfile: (raw.usedProfile ?? raw.used_profile) as ExamUsedProfile | undefined,
    totalCount: Number(raw.totalCount ?? raw.total_count ?? 0),
  };
}

// 시험 세션 복구 응답 (/api/exams/generation/{examSessionId}/recover) - Swagger가 key/value 임의 맵을 사용
export interface ExamSessionRecoverResponse {
  [key: string]: string;
}

/** 단답형 Gemini 채점 요청 — 문제별 입력(JSON). BE는 lectureId/materialId로 강의자료 PDF 경로를 해석 */
export interface ExamShortAnswerGradeProblemPayload {
  problemNumber: number;
  questionContent: string;
  keyKeywords: string[];
  gradingIntent: string;
  userAnswer: string;
}

export interface ExamShortAnswerGradeRequest {
  lectureId?: number;
  materialId?: number | null;
  problems: ExamShortAnswerGradeProblemPayload[];
}

export interface ExamShortAnswerGradeResultItem {
  problemNumber: number;
  /** 0~1, 0.1 단위 권장 */
  score: number;
  gradingReason: string;
  feedback: string;
  pointsDeducted?: boolean;
  deductionReason?: string;
}

export interface ExamShortAnswerGradeResponse {
  results: ExamShortAnswerGradeResultItem[];
}

function normalizeExamShortAnswerGradeResponse(
  raw: Record<string, unknown>,
): ExamShortAnswerGradeResponse {
  const pickArray = (): unknown[] => {
    const v =
      raw.results ??
      raw.gradingResults ??
      raw.grading_results ??
      (raw.data as Record<string, unknown> | undefined)?.results ??
      (raw.data as Record<string, unknown> | undefined)?.gradingResults;
    return Array.isArray(v) ? v : [];
  };
  const results: ExamShortAnswerGradeResultItem[] = pickArray().map((item) => {
    const o = item as Record<string, unknown>;
    const scoreRaw = Number(o.score ?? 0);
    const score = Math.min(1, Math.max(0, Number.isFinite(scoreRaw) ? scoreRaw : 0));
    return {
      problemNumber: Number(o.problemNumber ?? o.problem_number ?? 0),
      score,
      gradingReason: String(o.gradingReason ?? o.grading_reason ?? ""),
      feedback: String(o.feedback ?? ""),
      pointsDeducted:
        o.pointsDeducted === true ||
        o.points_deducted === true ||
        o.pointsDeducted === "true",
      deductionReason:
        o.deductionReason != null
          ? String(o.deductionReason)
          : o.deduction_reason != null
            ? String(o.deduction_reason)
            : undefined,
    };
  });
  return { results };
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
  if (payload.sourceMaterialId != null) {
    body.sourceMaterialId = payload.sourceMaterialId;
    body.source_material_id = payload.sourceMaterialId;
  }
  if (payload.sourceGenerationSessionId != null) {
    body.sourceGenerationSessionId = payload.sourceGenerationSessionId;
    body.source_generation_session_id = payload.sourceGenerationSessionId;
  }
  return JSON.stringify(body);
}

/**
 * 시험 생성/조회/삭제는 메인 백엔드만 호출(apiRequest → VITE_API_URL 또는 /api 프록시).
 * 응답에 ai-service/bridge 등이 보이면 그건 BE 내부 호출 실패 메시지이며, FE에서 bridge URL을 쓰지 않음.
 */
export const examGenerationApi = {
  createExam: async (payload: ExamGenerationRequest): Promise<ExamGenerationResponse> => {
    return apiRequest<ExamGenerationResponse>('/api/exams/generation', {
      method: 'POST',
      body: buildExamGenerationBody(payload),
    });
  },
  runAsync: async (payload: ExamGenerationAsyncRequest): Promise<ExamGenerationAsyncResponse> => {
    const body: Record<string, unknown> = { ...payload };
    if (payload.sourceMaterialId != null) {
      body.source_material_id = payload.sourceMaterialId;
    }
    if (payload.sourceGenerationSessionId != null) {
      body.source_generation_session_id = payload.sourceGenerationSessionId;
    }
    if (
      payload.sourcePdfPage != null &&
      Number.isFinite(payload.sourcePdfPage) &&
      payload.sourcePdfPage >= 1
    ) {
      const p = Math.floor(payload.sourcePdfPage);
      body.sourcePdfPage = p;
      body.source_pdf_page = p;
      body.pageNumber = p;
      body.page_number = p;
      body.page = p;
    }
    /** 목록 표시명: snake_case 바인딩만 쓰는 BE 대비 (camelCase는 spread로 이미 포함) */
    if (payload.displayName != null && String(payload.displayName).trim() !== "") {
      body.display_name = String(payload.displayName).trim();
    }
    return apiRequest<ExamGenerationAsyncResponse>('/api/exams/generation/async', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
  generateProfile: async (payload: ExamProfileGenerationRequest): Promise<ExamProfileGenerationResponse> => {
    return apiRequest<ExamProfileGenerationResponse>('/api/exams/generation/profile', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  recoverSession: async (examSessionId: number): Promise<ExamSessionRecoverResponse> => {
    return apiRequest<ExamSessionRecoverResponse>(`/api/exams/generation/${encodeURIComponent(examSessionId)}/recover`, {
      method: 'POST',
    });
  },
  getSession: async (examSessionId: number): Promise<ExamSessionDetailResponse> => {
    const raw = await apiRequest<Record<string, unknown>>(`/api/exams/generation/${encodeURIComponent(examSessionId)}`, {
      method: 'GET',
    });
    return normalizeExamSessionDetail(raw as Record<string, unknown>);
  },
  /** [삭제] 시험 세션 삭제. 해당 강의 소유 교사만 삭제 가능. DELETE /api/exams/generation/{examSessionId} */
  deleteExamSession: async (examSessionId: number): Promise<void> => {
    return apiRequest<void>(`/api/exams/generation/${encodeURIComponent(examSessionId)}`, {
      method: 'DELETE',
    });
  },
  /**
   * 단답형/서술형 Gemini 채점. POST /api/exams/generation/{examSessionId}/short-answer/grade
   * BE가 다른 경로를 쓰면 이 메서드만 수정하면 됨.
   */
  gradeShortAnswers: async (
    examSessionId: number,
    payload: ExamShortAnswerGradeRequest,
  ): Promise<ExamShortAnswerGradeResponse> => {
    const raw = await apiRequest<unknown>(
      `/api/exams/generation/${encodeURIComponent(examSessionId)}/short-answer/grade`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
    const obj =
      raw && typeof raw === 'object'
        ? (raw as Record<string, unknown>)
        : {};
    const inner =
      obj.data != null && typeof obj.data === 'object' && !Array.isArray(obj.data)
        ? (obj.data as Record<string, unknown>)
        : obj;
    return normalizeExamShortAnswerGradeResponse(inner);
  },
};

/** 강의 보조 SSE — 레거시 BE에는 없을 수 있음. 프론트는 `lectureAiLegacyStreamApi` 사용 권장. */
export type LectureAssistantStreamMode = "explain_page" | "answer_followup";

export interface LectureAssistantStreamRequestBody {
  materialId: number;
  pageNumber: number;
  mode: LectureAssistantStreamMode;
  userMessage?: string | null;
}

export interface LectureAssistantStreamCallbacks {
  onThoughtDelta?: (chunk: string) => void;
  onThoughtComplete?: () => void;
  onAnswerDelta?: (chunk: string) => void;
  onDone?: () => void;
  onError?: (err: Error) => void;
}

function dispatchAssistantSsePayload(
  parsed: Record<string, unknown>,
  cbs: LectureAssistantStreamCallbacks,
): "done" | "error" | "continue" {
  const type = String(parsed.type ?? parsed.event ?? "").toLowerCase();
  const delta = pickFirstString(parsed, ["delta", "text", "content", "chunk"]) ?? "";

  if (type === "error" || typeof parsed.error === "string") {
    const msg = pickFirstString(parsed, ["message", "error"]) ?? "스트림 오류";
    cbs.onError?.(new Error(msg));
    return "error";
  }
  if (type === "done" || toBool(parsed.final) === true) {
    cbs.onDone?.();
    return "done";
  }
  if (
    type === "thought_done" ||
    type === "thinking_complete" ||
    type === "thought_complete" ||
    (type.includes("thought") && type.includes("complete"))
  ) {
    cbs.onThoughtComplete?.();
    return "continue";
  }
  if (
    (type === "thought" ||
      type === "thinking" ||
      type === "thought_delta" ||
      type.includes("thought")) &&
    delta
  ) {
    cbs.onThoughtDelta?.(delta);
    return "continue";
  }
  if (
    delta &&
    (type === "answer" ||
      type === "content" ||
      type === "message" ||
      type === "delta" ||
      type === "")
  ) {
    cbs.onAnswerDelta?.(delta);
    return "continue";
  }
  if (delta) {
    cbs.onAnswerDelta?.(delta);
  }
  return "continue";
}

/**
 * 강의 보조 SSE — `EventSource` 대신 `fetch`(Authorization 가능) +
 * `iterateSseDataPayloadsFromResponse`(ReadableStream)로 수신한다.
 * `data: {...json}` 줄 단위. type: thought|thought_done|answer|done|error, delta 권장.
 */
export const streamLectureAssistant = (
  lectureId: number,
  body: LectureAssistantStreamRequestBody,
  callbacks: LectureAssistantStreamCallbacks,
): (() => void) => {
  const isDevHost =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
  const path = `/api/lectures/${encodeURIComponent(lectureId)}/assistant/stream`;
  const url =
    isDevHost && path.startsWith("/api")
      ? path
      : `${String(API_BASE_URL).replace(/\/$/, "")}${path}`;
  const token = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "text/event-stream",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const ac = new AbortController();
  let cancelled = false;

  void (async () => {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        mode: "cors",
        credentials: "omit",
        signal: ac.signal,
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(
          `API Error (${res.status}): ${t || "강의 보조 스트림 요청 실패"}`,
        );
      }
      for await (const payload of iterateSseDataPayloadsFromResponse(res, {
        signal: ac.signal,
      })) {
        if (cancelled) return;
        if (!payload) continue;
        if (payload === "[DONE]") {
          callbacks.onDone?.();
          return;
        }
        let parsed: Record<string, unknown>;
        try {
          parsed = JSON.parse(payload) as Record<string, unknown>;
        } catch {
          callbacks.onAnswerDelta?.(payload);
          continue;
        }
        const r = dispatchAssistantSsePayload(parsed, callbacks);
        if (r === "done" || r === "error") return;
      }
      if (!cancelled) callbacks.onDone?.();
    } catch (e) {
      if (cancelled || (e instanceof Error && e.name === "AbortError")) return;
      callbacks.onError?.(e instanceof Error ? e : new Error(String(e)));
    }
  })();

  return () => {
    cancelled = true;
    ac.abort();
  };
};
