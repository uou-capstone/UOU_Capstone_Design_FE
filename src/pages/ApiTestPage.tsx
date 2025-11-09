import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { authApi, courseApi, lectureApi, assessmentApi, getAuthToken } from '../services/api';

// 개발 환경에서는 프록시 사용, 프로덕션에서는 환경 변수 사용
const API_BASE_URL = import.meta.env.PROD 
  ? (import.meta.env.VITE_API_URL || 'https://michal-unvulnerable-benita.ngrok-free.dev')
  : 'http://localhost:5173'; // 개발 환경에서는 프록시를 통해 같은 도메인으로 요청

interface ApiEndpoint {
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  endpoint: string;
  category: string;
  requiresAuth: boolean;
  requiresBody: boolean;
  sampleBody?: any;
}

const API_ENDPOINTS: ApiEndpoint[] = [
  // 인증 API
  {
    name: '회원가입',
    method: 'POST',
    endpoint: '/api/auth/signup',
    category: '인증',
    requiresAuth: false,
    requiresBody: true,
    sampleBody: {
      email: 'test@example.com',
      password: 'password123',
      fullName: '테스트 사용자',
      role: 'STUDENT'
    }
  },
  {
    name: '로그인',
    method: 'POST',
    endpoint: '/api/auth/login',
    category: '인증',
    requiresAuth: false,
    requiresBody: true,
    sampleBody: {
      email: 'test@example.com',
      password: 'password123'
    }
  },
  
  // 과목 API
  {
    name: '전체 과목 조회',
    method: 'GET',
    endpoint: '/api/courses',
    category: '과목',
    requiresAuth: true,
    requiresBody: false
  },
  {
    name: '과목 생성',
    method: 'POST',
    endpoint: '/api/courses',
    category: '과목',
    requiresAuth: true,
    requiresBody: true,
    sampleBody: {
      title: '새로운 과목',
      description: '과목 설명'
    }
  },
  {
    name: '과목 상세 조회',
    method: 'GET',
    endpoint: '/api/courses/{courseId}',
    category: '과목',
    requiresAuth: true,
    requiresBody: false
  },
  {
    name: '과목 수정',
    method: 'PUT',
    endpoint: '/api/courses/{courseId}',
    category: '과목',
    requiresAuth: true,
    requiresBody: true,
    sampleBody: {
      title: '수정된 과목명',
      description: '수정된 설명'
    }
  },
  {
    name: '과목 삭제',
    method: 'DELETE',
    endpoint: '/api/courses/{courseId}',
    category: '과목',
    requiresAuth: true,
    requiresBody: false
  },
  {
    name: '수강 신청',
    method: 'POST',
    endpoint: '/api/courses/{courseId}/enroll',
    category: '과목',
    requiresAuth: true,
    requiresBody: false
  },
  
  // 강의 API
  {
    name: '강의 상세 조회',
    method: 'GET',
    endpoint: '/api/lectures/{lectureId}',
    category: '강의',
    requiresAuth: true,
    requiresBody: false
  },
  {
    name: '강의 생성',
    method: 'POST',
    endpoint: '/api/courses/{courseId}/lectures',
    category: '강의',
    requiresAuth: true,
    requiresBody: true,
    sampleBody: {
      title: '새로운 강의',
      weekNumber: 1,
      description: '강의 설명'
    }
  },
  {
    name: '강의 수정',
    method: 'PUT',
    endpoint: '/api/lectures/{lectureId}',
    category: '강의',
    requiresAuth: true,
    requiresBody: true,
    sampleBody: {
      title: '수정된 강의명',
      weekNumber: 1,
      description: '수정된 설명'
    }
  },
  {
    name: '강의 삭제',
    method: 'DELETE',
    endpoint: '/api/lectures/{lectureId}',
    category: '강의',
    requiresAuth: true,
    requiresBody: false
  },
  {
    name: 'AI 강의 콘텐츠 생성',
    method: 'POST',
    endpoint: '/api/lectures/{lectureId}/generate-content',
    category: '강의',
    requiresAuth: true,
    requiresBody: false
  },
  
  // 평가 API
  {
    name: '과목별 평가 목록 조회',
    method: 'GET',
    endpoint: '/api/assessments/courses/{courseId}',
    category: '평가',
    requiresAuth: true,
    requiresBody: false
  },
  {
    name: '평가 생성',
    method: 'POST',
    endpoint: '/api/assessments/courses/{courseId}',
    category: '평가',
    requiresAuth: true,
    requiresBody: true,
    sampleBody: {
      title: '새로운 평가',
      type: 'QUIZ',
      dueDate: '2024-12-31T23:59:59',
      questions: []
    }
  },
  {
    name: '평가 상세 조회',
    method: 'GET',
    endpoint: '/api/assessments/{assessmentId}',
    category: '평가',
    requiresAuth: true,
    requiresBody: false
  },
  {
    name: '답안 제출 현황 조회',
    method: 'GET',
    endpoint: '/api/assessments/{assessmentId}/submissions',
    category: '평가',
    requiresAuth: true,
    requiresBody: false
  },
  {
    name: '답안 제출',
    method: 'POST',
    endpoint: '/api/assessments/{assessmentId}/submissions',
    category: '평가',
    requiresAuth: true,
    requiresBody: true,
    sampleBody: {
      answers: [
        {
          questionId: 1,
          choiceOptionId: 1
        }
      ]
    }
  },
  {
    name: '제출 결과 조회',
    method: 'GET',
    endpoint: '/api/submissions/{submissionId}',
    category: '평가',
    requiresAuth: true,
    requiresBody: false
  }
];

const ApiTestPage: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpoint | null>(null);
  const [requestBody, setRequestBody] = useState<string>('');
  const [pathParams, setPathParams] = useState<Record<string, string>>({});
  const [response, setResponse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [httpStatus, setHttpStatus] = useState<number | null>(null);

  const handleEndpointSelect = (endpoint: ApiEndpoint) => {
    setSelectedEndpoint(endpoint);
    setRequestBody(endpoint.sampleBody ? JSON.stringify(endpoint.sampleBody, null, 2) : '');
    setPathParams({});
    setResponse(null);
    setError(null);
    setHttpStatus(null);
  };

  const executeApiCall = async () => {
    if (!selectedEndpoint) return;

    setIsLoading(true);
    setError(null);
    setResponse(null);
    setHttpStatus(null);

    try {
      let result: any;

      // 경로 파라미터 추출
      const pathParamMatches = selectedEndpoint.endpoint.match(/\{(\w+)\}/g);
      const requiredParams: string[] = pathParamMatches 
        ? pathParamMatches.map(m => m.replace(/[{}]/g, ''))
        : [];

      // 필수 파라미터 확인
      const missingParams = requiredParams.filter(param => !pathParams[param]);
      if (missingParams.length > 0) {
        throw new Error(`필수 경로 파라미터가 없습니다: ${missingParams.join(', ')}`);
      }

      // 요청 본문 파싱 (필요한 경우)
      let parsedBody: any = null;
      if (selectedEndpoint.requiresBody && requestBody) {
        try {
          parsedBody = JSON.parse(requestBody);
        } catch (e) {
          throw new Error(`요청 본문 JSON 파싱 실패: ${e instanceof Error ? e.message : '알 수 없는 오류'}`);
        }
      }

      // API 호출
      switch (selectedEndpoint.category) {
        case '인증':
          if (selectedEndpoint.name === '회원가입') {
            if (!parsedBody) throw new Error('요청 본문이 필요합니다');
            result = await authApi.signup(parsedBody);
          } else if (selectedEndpoint.name === '로그인') {
            if (!parsedBody) throw new Error('요청 본문이 필요합니다');
            result = await authApi.login(parsedBody);
          }
          break;

        case '과목':
          if (selectedEndpoint.name === '전체 과목 조회') {
            result = await courseApi.getAllCourses();
          } else if (selectedEndpoint.name === '과목 생성') {
            if (!parsedBody) throw new Error('요청 본문이 필요합니다');
            result = await courseApi.createCourse(parsedBody);
          } else if (selectedEndpoint.name === '과목 상세 조회') {
            const courseId = parseInt(pathParams.courseId || '0');
            if (isNaN(courseId) || courseId <= 0) throw new Error('courseId는 1 이상의 숫자여야 합니다');
            result = await courseApi.getCourseDetail(courseId);
          } else if (selectedEndpoint.name === '과목 수정') {
            const courseId = parseInt(pathParams.courseId || '0');
            if (isNaN(courseId) || courseId <= 0) throw new Error('courseId는 1 이상의 숫자여야 합니다');
            if (!parsedBody) throw new Error('요청 본문이 필요합니다');
            result = await courseApi.updateCourse(courseId, parsedBody);
          } else if (selectedEndpoint.name === '과목 삭제') {
            const courseId = parseInt(pathParams.courseId || '0');
            if (isNaN(courseId) || courseId <= 0) throw new Error('courseId는 1 이상의 숫자여야 합니다');
            await courseApi.deleteCourse(courseId);
            result = { message: '삭제 완료' };
          } else if (selectedEndpoint.name === '수강 신청') {
            const courseId = parseInt(pathParams.courseId || '0');
            if (isNaN(courseId) || courseId <= 0) throw new Error('courseId는 1 이상의 숫자여야 합니다');
            result = await courseApi.enrollCourse(courseId);
          }
          break;

        case '강의':
          if (selectedEndpoint.name === '강의 상세 조회') {
            const lectureId = parseInt(pathParams.lectureId || '0');
            if (isNaN(lectureId) || lectureId <= 0) throw new Error('lectureId는 1 이상의 숫자여야 합니다');
            result = await lectureApi.getLectureDetail(lectureId);
          } else if (selectedEndpoint.name === '강의 생성') {
            const courseId = parseInt(pathParams.courseId || '0');
            if (isNaN(courseId) || courseId <= 0) throw new Error('courseId는 1 이상의 숫자여야 합니다');
            if (!parsedBody) throw new Error('요청 본문이 필요합니다');
            result = await lectureApi.createLecture(courseId, parsedBody);
          } else if (selectedEndpoint.name === '강의 수정') {
            const lectureId = parseInt(pathParams.lectureId || '0');
            if (isNaN(lectureId) || lectureId <= 0) throw new Error('lectureId는 1 이상의 숫자여야 합니다');
            if (!parsedBody) throw new Error('요청 본문이 필요합니다');
            result = await lectureApi.updateLecture(lectureId, parsedBody);
          } else if (selectedEndpoint.name === '강의 삭제') {
            const lectureId = parseInt(pathParams.lectureId || '0');
            if (isNaN(lectureId) || lectureId <= 0) throw new Error('lectureId는 1 이상의 숫자여야 합니다');
            await lectureApi.deleteLecture(lectureId);
            result = { message: '삭제 완료' };
          } else if (selectedEndpoint.name === 'AI 강의 콘텐츠 생성') {
            const lectureId = parseInt(pathParams.lectureId || '0');
            if (isNaN(lectureId) || lectureId <= 0) throw new Error('lectureId는 1 이상의 숫자여야 합니다');
            result = await lectureApi.generateAiContent(lectureId);
          }
          break;

        case '평가':
          if (selectedEndpoint.name === '과목별 평가 목록 조회') {
            const courseId = parseInt(pathParams.courseId || '0');
            if (isNaN(courseId) || courseId <= 0) throw new Error('courseId는 1 이상의 숫자여야 합니다');
            result = await assessmentApi.getAssessmentsForCourse(courseId);
          } else if (selectedEndpoint.name === '평가 생성') {
            const courseId = parseInt(pathParams.courseId || '0');
            if (isNaN(courseId) || courseId <= 0) throw new Error('courseId는 1 이상의 숫자여야 합니다');
            if (!parsedBody) throw new Error('요청 본문이 필요합니다');
            result = await assessmentApi.createAssessment(courseId, parsedBody);
          } else if (selectedEndpoint.name === '평가 상세 조회') {
            const assessmentId = parseInt(pathParams.assessmentId || '0');
            if (isNaN(assessmentId) || assessmentId <= 0) throw new Error('assessmentId는 1 이상의 숫자여야 합니다');
            result = await assessmentApi.getAssessmentDetail(assessmentId);
          } else if (selectedEndpoint.name === '답안 제출 현황 조회') {
            const assessmentId = parseInt(pathParams.assessmentId || '0');
            if (isNaN(assessmentId) || assessmentId <= 0) throw new Error('assessmentId는 1 이상의 숫자여야 합니다');
            result = await assessmentApi.getSubmissionsForAssessment(assessmentId);
          } else if (selectedEndpoint.name === '답안 제출') {
            const assessmentId = parseInt(pathParams.assessmentId || '0');
            if (isNaN(assessmentId) || assessmentId <= 0) throw new Error('assessmentId는 1 이상의 숫자여야 합니다');
            if (!parsedBody) throw new Error('요청 본문이 필요합니다');
            result = await assessmentApi.createSubmission(assessmentId, parsedBody);
          } else if (selectedEndpoint.name === '제출 결과 조회') {
            const submissionId = parseInt(pathParams.submissionId || '0');
            if (isNaN(submissionId) || submissionId <= 0) throw new Error('submissionId는 1 이상의 숫자여야 합니다');
            result = await assessmentApi.getSubmissionResult(submissionId);
          }
          break;
      }

      setResponse(result);
    } catch (err) {
      let errorMessage = '알 수 없는 오류가 발생했습니다.';
      let statusCode: number | null = null;
      
      if (err instanceof Error) {
        errorMessage = err.message;
        
        // API 에러인 경우 HTTP 상태 코드 추출
        const statusMatch = err.message.match(/API Error \((\d+)/);
        if (statusMatch) {
          statusCode = parseInt(statusMatch[1], 10);
        }
        
        // ngrok 에러 감지 및 처리
        if (errorMessage.includes('ERR_NGROK_3200') || errorMessage.includes('is offline') || errorMessage.includes('<!DOCTYPE html>')) {
          errorMessage = 'ngrok 터널이 오프라인 상태입니다.\n\n터널이 종료되었거나 연결이 끊어진 것 같습니다. 백엔드 서버와 ngrok 터널을 확인해주세요.';
        } else if (errorMessage.includes('ngrok') || errorMessage.includes('ERR_NGROK')) {
          errorMessage = 'ngrok 관련 오류가 발생했습니다.\n\n터널 상태를 확인해주세요.';
        }
      }
      
      setError(errorMessage);
      setHttpStatus(statusCode);
      console.error('API 호출 실패:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getPathParams = (endpoint: string): string[] => {
    const matches = endpoint.match(/\{(\w+)\}/g);
    return matches ? matches.map(m => m.replace(/[{}]/g, '')) : [];
  };

  const getHttpStatusDescription = (status: number): string => {
    const descriptions: Record<number, string> = {
      400: 'Bad Request - 잘못된 요청입니다. 요청 형식이나 파라미터를 확인해주세요.',
      401: 'Unauthorized - 인증이 필요합니다. 로그인을 확인해주세요.',
      403: 'Forbidden - 권한이 없습니다. 접근할 수 없는 리소스입니다.',
      404: 'Not Found - 요청한 리소스를 찾을 수 없습니다.',
      405: 'Method Not Allowed - 허용되지 않은 HTTP 메서드입니다.',
      409: 'Conflict - 요청이 현재 리소스 상태와 충돌합니다.',
      422: 'Unprocessable Entity - 요청은 이해할 수 있지만 처리할 수 없습니다.',
      500: 'Internal Server Error - 서버 내부 오류가 발생했습니다.',
      502: 'Bad Gateway - 게이트웨이 오류가 발생했습니다.',
      503: 'Service Unavailable - 서비스를 사용할 수 없습니다.',
      504: 'Gateway Timeout - 게이트웨이 타임아웃이 발생했습니다.',
    };
    
    if (status >= 400 && status < 500) return descriptions[status] || `Client Error - 클라이언트 오류 (${status})`;
    if (status >= 500) return descriptions[status] || `Server Error - 서버 오류 (${status})`;
    
    return `HTTP ${status} - 알 수 없는 상태 코드입니다.`;
  };

  const categories = Array.from(new Set(API_ENDPOINTS.map(e => e.category)));

  return (
    <div className={`min-h-screen h-screen flex flex-col overflow-hidden transition-colors ${
      isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'
    }`}>
      <div className="flex-1 flex flex-col min-h-0 p-6 overflow-hidden">
        <div className="mb-6 flex-shrink-0">
          <h1 className={`text-3xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            API 테스트 도구
          </h1>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            API Base URL: <span className="font-mono">{API_BASE_URL}</span>
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0 overflow-hidden">
          {/* 좌측: API 목록 */}
          <div className={`lg:col-span-1 rounded-lg p-4 flex flex-col overflow-hidden ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <h2 className={`text-lg font-semibold mb-4 flex-shrink-0 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              API 엔드포인트
            </h2>
            <div className="space-y-2 flex-1 overflow-y-auto">
              {categories.map(category => (
                <div key={category} className="mb-4">
                  <h3 className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {category}
                  </h3>
                  {API_ENDPOINTS.filter(e => e.category === category).map((endpoint, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleEndpointSelect(endpoint)}
                      className={`w-full text-left px-3 py-2 rounded-md mb-1 transition-colors ${
                        selectedEndpoint?.endpoint === endpoint.endpoint
                          ? isDarkMode
                            ? 'bg-blue-600 text-white'
                            : 'bg-blue-100 text-blue-900'
                          : isDarkMode
                            ? 'hover:bg-gray-700 text-gray-300'
                            : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                          endpoint.method === 'GET' ? 'bg-green-500/20 text-green-400' :
                          endpoint.method === 'POST' ? 'bg-blue-500/20 text-blue-400' :
                          endpoint.method === 'PUT' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {endpoint.method}
                        </span>
                        <span className="text-sm truncate">{endpoint.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* 우측: 요청/응답 영역 */}
          <div className={`lg:col-span-2 flex flex-col overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-4`}>
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {selectedEndpoint ? (
              <>
                {/* 선택된 엔드포인트 정보 */}
                <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`text-xs font-mono px-2 py-1 rounded ${
                      selectedEndpoint.method === 'GET' ? 'bg-green-500/20 text-green-400' :
                      selectedEndpoint.method === 'POST' ? 'bg-blue-500/20 text-blue-400' :
                      selectedEndpoint.method === 'PUT' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {selectedEndpoint.method}
                    </span>
                    <span className={`font-mono text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {selectedEndpoint.endpoint}
                    </span>
                    {selectedEndpoint.requiresAuth && (
                      <span className={`text-xs px-2 py-1 rounded ${isDarkMode ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-800'}`}>
                        인증 필요
                      </span>
                    )}
                  </div>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {selectedEndpoint.name}
                  </p>
                </div>

                {/* 경로 파라미터 입력 */}
                {getPathParams(selectedEndpoint.endpoint).length > 0 && (
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      경로 파라미터 <span className="text-red-500">*</span>
                    </label>
                    <div className="space-y-2">
                      {getPathParams(selectedEndpoint.endpoint).map(param => {
                        const isEmpty = !pathParams[param];
                        return (
                          <div key={param}>
                            <input
                              type="text"
                              placeholder={`${param} (필수)`}
                              value={pathParams[param] || ''}
                              onChange={(e) => setPathParams(prev => ({ ...prev, [param]: e.target.value }))}
                              className={`w-full px-3 py-2 rounded-md border ${
                                isEmpty
                                  ? isDarkMode
                                    ? 'bg-gray-700 border-red-500 text-white placeholder-gray-400'
                                    : 'bg-white border-red-300 text-gray-900 placeholder-gray-500'
                                  : isDarkMode
                                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                            />
                            {isEmpty && (
                              <p className={`text-xs mt-1 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                                ⚠ {param}는 필수 입력 항목입니다
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 요청 본문 */}
                {selectedEndpoint.requiresBody && (
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      요청 본문 (JSON) <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={requestBody}
                      onChange={(e) => setRequestBody(e.target.value)}
                      rows={10}
                      className={`w-full px-3 py-2 rounded-md border font-mono text-sm ${
                        !requestBody || requestBody.trim() === ''
                          ? isDarkMode
                            ? 'bg-gray-700 border-red-500 text-white'
                            : 'bg-white border-red-300 text-gray-900'
                          : isDarkMode
                            ? 'bg-gray-700 border-gray-600 text-white'
                            : 'bg-white border-gray-300 text-gray-900'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      placeholder='예: {"title": "새로운 과목", "description": "과목 설명"}'
                    />
                    {(!requestBody || requestBody.trim() === '') && (
                      <p className={`text-xs mt-1 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                        ⚠ 요청 본문을 입력해주세요
                      </p>
                    )}
                    {requestBody && requestBody.trim() !== '' && (() => {
                      try {
                        JSON.parse(requestBody);
                        return null;
                      } catch (e) {
                        return (
                          <p className={`text-xs mt-1 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                            ⚠ 유효하지 않은 JSON 형식입니다
                          </p>
                        );
                      }
                    })()}
                  </div>
                )}

                {/* 실행 버튼 */}
                {(() => {
                  const requiredParams = getPathParams(selectedEndpoint.endpoint);
                  const missingParams = requiredParams.filter(param => !pathParams[param]);
                  
                  // 요청 본문 검증
                  let bodyValid = true;
                  let bodyError = '';
                  if (selectedEndpoint.requiresBody) {
                    if (!requestBody || requestBody.trim() === '') {
                      bodyValid = false;
                      bodyError = '요청 본문이 필요합니다';
                    } else {
                      try {
                        JSON.parse(requestBody);
                      } catch (e) {
                        bodyValid = false;
                        bodyError = '유효하지 않은 JSON 형식입니다';
                      }
                    }
                  }
                  
                  const canExecute = missingParams.length === 0 && bodyValid;
                  
                  return (
                    <div>
                      {missingParams.length > 0 && (
                        <div className={`mb-3 p-3 rounded-md text-sm ${
                          isDarkMode ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-800'
                        }`}>
                          ⚠ 필수 경로 파라미터를 입력해주세요: {missingParams.join(', ')}
                        </div>
                      )}
                      {!bodyValid && (
                        <div className={`mb-3 p-3 rounded-md text-sm ${
                          isDarkMode ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-800'
                        }`}>
                          ⚠ {bodyError}
                        </div>
                      )}
                      <button
                        onClick={executeApiCall}
                        disabled={isLoading || !canExecute}
                        className={`w-full px-4 py-2 rounded-md font-medium transition-colors ${
                          isLoading || !canExecute
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700'
                        } text-white`}
                      >
                        {isLoading ? '실행 중...' : canExecute ? 'API 호출 실행' : '필수 항목을 입력하세요'}
                      </button>
                    </div>
                  );
                })()}

                {/* 인증 토큰 표시 */}
                {selectedEndpoint.requiresAuth && (
                  <div className={`p-3 rounded-md text-sm ${
                    getAuthToken()
                      ? isDarkMode ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-800'
                      : isDarkMode ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-800'
                  }`}>
                    {getAuthToken() ? '✓ 인증 토큰이 설정되어 있습니다' : '⚠ 인증 토큰이 없습니다. 로그인이 필요합니다.'}
                  </div>
                )}

                {/* 응답 */}
                {response !== null && (
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      응답
                    </label>
                    <pre className={`p-4 rounded-md overflow-auto max-h-96 text-sm ${
                      isDarkMode ? 'bg-gray-900 text-green-400' : 'bg-gray-50 text-gray-900'
                    }`}>
                      {JSON.stringify(response, null, 2)}
                    </pre>
                  </div>
                )}

                {/* 에러 */}
                {error && (
                  <div className={`p-4 rounded-md bg-red-500/10 border border-red-500/20`}>
                    <div className="mb-3">
                      <p className={`text-sm font-medium text-red-400 mb-1`}>에러</p>
                      {httpStatus !== null && (
                        <div className={`mb-2 p-2 rounded ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                          <p className={`text-sm font-semibold ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>
                            HTTP 상태 코드: <span className="font-mono">{httpStatus}</span>
                          </p>
                          <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            {getHttpStatusDescription(httpStatus)}
                          </p>
                        </div>
                      )}
                    </div>
                    <pre className={`text-sm text-red-300 whitespace-pre-wrap font-mono`}>{error}</pre>
                  </div>
                )}
              </>
            ) : (
              <div className={`text-center py-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                좌측에서 API 엔드포인트를 선택하세요
              </div>
            )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiTestPage;

