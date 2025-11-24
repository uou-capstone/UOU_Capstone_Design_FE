import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { checkServerStatus } from '../services/api';

const LoginPage: React.FC = () => {
  const { isDarkMode } = useTheme();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [serverStatus, setServerStatus] = useState<{ online: boolean; message?: string } | null>(null);
  const [isCheckingServer, setIsCheckingServer] = useState(true);
  const [isInfoOpen, setIsInfoOpen] = useState(true);

  // 서버 상태 확인
  useEffect(() => {
    const checkStatus = async () => {
      setIsCheckingServer(true);
      const status = await checkServerStatus();
      setServerStatus(status);
      setIsCheckingServer(false);
    };
    
    checkStatus();
    
    // 30초마다 서버 상태 확인
    const interval = setInterval(checkStatus, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // 회원가입 완료 후 전달된 메시지와 이메일 처리
  useEffect(() => {
    if (location.state) {
      const state = location.state as { message?: string; email?: string };
      if (state.message) {
        setSuccessMessage(state.message);
      }
      if (state.email) {
        setEmail(state.email);
      }
      // state를 사용했으므로 제거 (뒤로가기 시 메시지가 다시 나타나지 않도록)
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center transition-colors ${
      isDarkMode ? 'bg-slate-900' : 'bg-gray-50'
    }`}>
      <div className={`w-full max-w-md p-8 rounded-lg shadow-lg ${
        isDarkMode ? 'bg-slate-800' : 'bg-white'
      }`}>
        <div className="text-center mb-8">
          <h1 className={`text-3xl font-bold mb-2 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            로그인
          </h1>
          <p className={`text-sm ${
            isDarkMode ? 'text-slate-400' : 'text-gray-600'
          }`}>
            AI Tutor LMS에 오신 것을 환영합니다
          </p>
        </div>

        {successMessage && (
          <div className={`mb-4 p-3 rounded-lg ${
            isDarkMode ? 'bg-green-900/30 text-green-300' : 'bg-green-50 text-green-600'
          }`}>
            {successMessage}
          </div>
        )}
        {/* 서버 상태 표시 */}
        {serverStatus && (
          <div className={`mb-4 flex items-center gap-2 text-sm ${
            isDarkMode ? 'text-slate-400' : 'text-gray-600'
          }`}>
            <span>서버상태:</span>
            <div className={`w-3 h-3 rounded-full ${
              isCheckingServer 
                ? 'bg-yellow-500 animate-pulse' 
                : serverStatus.online 
                  ? 'bg-green-500' 
                  : 'bg-red-500'
            }`}></div>
          </div>
        )}
        
        {error && (
          <div className={`mb-4 p-3 rounded-lg ${
            isDarkMode ? 'bg-red-900/30 text-red-300' : 'bg-red-50 text-red-600'
          }`}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              isDarkMode ? 'text-slate-200' : 'text-gray-700'
            }`}>
              이메일
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={`w-full px-4 py-2 rounded-lg border ${
                isDarkMode
                  ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="example@email.com"
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${
              isDarkMode ? 'text-slate-200' : 'text-gray-700'
            }`}>
              비밀번호
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={`w-full px-4 py-2 rounded-lg border ${
                isDarkMode
                  ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="비밀번호를 입력하세요"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 rounded-lg font-medium transition-colors ${
              isLoading
                ? isDarkMode
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : isDarkMode
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
            }`}
          >
            {isLoading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <div className={`mt-6 text-center text-sm ${
          isDarkMode ? 'text-gray-400' : 'text-gray-600'
        }`}>
          계정이 없으신가요?{' '}
          <Link
            to="/signup"
            className={`font-medium hover:underline ${
              isDarkMode ? 'text-emerald-400' : 'text-emerald-600'
            }`}
          >
            회원가입
          </Link>
        </div>
      </div>

      {/* 구현 기능 안내창 */}
      <div className={`fixed bottom-4 right-4 z-50 transition-all duration-300 ${
        isInfoOpen ? 'w-80' : 'w-12'
      }`}>
        <div className={`rounded-lg shadow-xl border transition-all ${
          isDarkMode 
            ? 'bg-slate-800 border-slate-600' 
            : 'bg-white border-gray-200'
        }`}>
          {/* 헤더 */}
          <button
            type="button"
            onClick={() => setIsInfoOpen(!isInfoOpen)}
            className={`w-full flex items-center justify-between p-3 rounded-t-lg transition-colors cursor-pointer ${
              isDarkMode
                ? 'hover:bg-slate-700'
                : 'hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {isInfoOpen && (
                <span className={`text-sm font-semibold ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  구현된 기능
                </span>
              )}
            </div>
            <svg 
              className={`w-5 h-5 transition-transform ${
                isInfoOpen ? 'rotate-180' : ''
              } ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* 내용 */}
          {isInfoOpen && (
            <div className={`p-4 max-h-96 overflow-y-auto scrollbar-thin ${
              isDarkMode ? 'scrollbar-thumb-slate-600' : 'scrollbar-thumb-gray-300'
            }`}>
              <div className="space-y-4">
                {/* 학생용 기능 */}
                <div>
                  <h3 className={`text-sm font-semibold mb-2 ${
                    isDarkMode ? 'text-blue-400' : 'text-blue-600'
                  }`}>
                    👨‍🎓 학생
                  </h3>
                  <ul className={`text-xs space-y-1 ${
                    isDarkMode ? 'text-slate-300' : 'text-gray-700'
                  }`}>
                    <li>• 로그인 / 회원가입</li>
                    <li>• 강의실 (과목 목록 조회)</li>
                    <li>• 강의 자료 보기 (PDF, 마크다운)</li>
                    <li>• 프로필 사진 변경</li>
                    <li>• 이메일/닉네임 수정</li>
                    <li>• 비밀번호 변경</li>
                    <li>• 다크 모드 전환</li>
                  </ul>
                </div>

                {/* 선생님용 기능 */}
                <div>
                  <h3 className={`text-sm font-semibold mb-2 ${
                    isDarkMode ? 'text-emerald-400' : 'text-emerald-600'
                  }`}>
                    👨‍🏫 선생님
                  </h3>
                  <ul className={`text-xs space-y-1 ${
                    isDarkMode ? 'text-slate-300' : 'text-gray-700'
                  }`}>
                    <li>• 로그인 / 회원가입</li>
                    <li>• 강의실 (과목 목록 조회)</li>
                    <li>• 과목 생성/수정/삭제</li>
                    <li>• 강의 생성/삭제</li>
                    <li>• 강의 자료 업로드 (PDF, PPT, DOC 등)</li>
                    <li>• AI 강의 콘텐츠 생성</li>
                    <li>• 강의 자료 마크다운 표시</li>
                    <li>• 프로필 사진 변경</li>
                    <li>• 이메일/닉네임 수정</li>
                    <li>• 비밀번호 변경</li>
                    <li>• 다크 모드 전환</li>
                  </ul>
                </div>

                {/* 공통 UI/UX */}
                <div>
                  <h3 className={`text-sm font-semibold mb-2 ${
                    isDarkMode ? 'text-purple-400' : 'text-purple-600'
                  }`}>
                    🎨 공통 기능
                  </h3>
                  <ul className={`text-xs space-y-1 ${
                    isDarkMode ? 'text-slate-300' : 'text-gray-700'
                  }`}>
                    <li>• 반응형 3단 레이아웃</li>
                    <li>• 사이드바 리사이저 (드래그/더블클릭)</li>
                    <li>• 다크 모드 지원</li>
                    <li>• 서버 상태 실시간 확인</li>
                  </ul>
                </div>

                {/* 미구현 기능 */}
                <div>
                  <h3 className={`text-sm font-semibold mb-2 ${
                    isDarkMode ? 'text-slate-400' : 'text-gray-500'
                  }`}>
                    🚧 미구현
                  </h3>
                  <ul className={`text-xs space-y-1 ${
                    isDarkMode ? 'text-slate-500' : 'text-gray-500'
                  }`}>
                    <li>• 대시보드</li>
                    <li>• 과제</li>
                    <li>• 시험생성</li>
                    <li>• 보고서</li>
                    <li>• 학생관리</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

