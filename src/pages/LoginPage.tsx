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

  // 회원가입 완료 후 전달된 메시지와 이메일 처리, 또는 리다이렉트 메시지
  useEffect(() => {
    if (location.state) {
      const state = location.state as { message?: string; email?: string; redirectTo?: string };
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
      // 로그인 후 리다이렉트 처리
      const state = location.state as { redirectTo?: string } | null;
      if (state?.redirectTo) {
        navigate(state.redirectTo, { replace: true });
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center transition-colors px-4 py-8 ${
      isDarkMode ? 'bg-slate-900' : 'bg-gray-50'
    }`}>
      <div className={`w-full max-w-md p-8 rounded-lg shadow-lg ${
        isDarkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        <div className="text-center mb-6 sm:mb-8">
          <h1 className={`text-2xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-2 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            로그인
          </h1>
          <p className={`text-xs sm:text-sm md:text-base lg:text-lg ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            AI Tutor LMS에 오신 것을 환영합니다
          </p>
        </div>

        {successMessage && (
          <div className={`mb-3 sm:mb-4 p-2 sm:p-3 md:p-4 text-xs sm:text-sm md:text-base rounded-lg ${
            isDarkMode ? 'bg-green-900/30 text-green-300' : 'bg-green-50 text-green-600'
          }`}>
            {successMessage}
          </div>
        )}
        {/* 서버 상태 표시 */}
        {serverStatus && (
          <div className={`mb-3 sm:mb-4 text-xs sm:text-sm md:text-base ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            <div className="flex items-center gap-2">
              <span>서버상태:</span>
              <span className={`text-xs sm:text-sm font-semibold tracking-wide px-2 sm:px-3 py-0.5 sm:py-1 rounded ${
                isCheckingServer
                  ? (isDarkMode ? 'text-yellow-200 bg-yellow-500/20' : 'text-yellow-700 bg-yellow-100')
                  : serverStatus.online
                    ? (isDarkMode ? 'text-green-200 bg-green-500/20' : 'text-green-700 bg-green-100')
                    : (isDarkMode ? 'text-red-200 bg-red-500/20' : 'text-red-700 bg-red-100')
              }`}>
                {isCheckingServer
                  ? 'CHECKING...'
                  : serverStatus.online
                    ? 'ONLINE'
                    : 'OFFLINE'}
              </span>
            </div>
          </div>
        )}
        
        {error && !(serverStatus && !serverStatus.online) && (
          <div className={`mb-3 sm:mb-4 p-2 sm:p-3 md:p-4 text-xs sm:text-sm md:text-base rounded-lg ${
            isDarkMode ? 'bg-red-900/30 text-red-300' : 'bg-red-50 text-red-600'
          }`}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 md:space-y-6">
          <div>
            <label className={`block text-xs sm:text-sm md:text-base font-medium mb-2 ${
              isDarkMode ? 'text-gray-200' : 'text-gray-700'
            }`}>
              이메일
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={`w-[384px] max-w-full px-3 py-3 text-sm rounded-lg border ${
                isDarkMode
                  ? 'bg-zinc-800 border-zinc-700 text-white placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="example@email.com"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={`block text-xs sm:text-sm md:text-base font-medium ${
                isDarkMode ? 'text-gray-200' : 'text-gray-700'
              }`}>
                비밀번호
              </label>
              <Link
                to="/forgot-password"
                onClick={(e) => {
                  e.preventDefault();
                  window.alert('비밀번호 찾기 기능은 준비 중입니다.');
                }}
                className={`text-xs sm:text-sm md:text-base hover:underline ${
                  isDarkMode ? 'text-emerald-400' : 'text-emerald-600'
                }`}
              >
                비밀번호 찾기
              </Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={`w-[384px] max-w-full px-3 py-3 text-sm rounded-lg border ${
                isDarkMode
                  ? 'bg-zinc-800 border-zinc-700 text-white placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="비밀번호를 입력하세요"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-[384px] max-w-full py-3 mx-auto rounded-lg font-medium text-sm flex items-center justify-center transition-colors ${
              isLoading
                ? isDarkMode
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : isDarkMode
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
            }`}
          >
            {isLoading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        {/* 구분선 */}
        <div className="relative my-4 sm:my-5 md:my-6">
          <div className={`absolute inset-0 flex items-center ${
            isDarkMode ? 'border-slate-600' : 'border-gray-300'
          }`}>
            <div className={`w-full border-t ${
              isDarkMode ? 'border-slate-600' : 'border-gray-300'
            }`}></div>
          </div>
          <div className="relative flex justify-center text-xs sm:text-sm md:text-base">
            <span className={`px-2 ${
              isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-white text-gray-500'
            }`}>
              또는
            </span>
          </div>
        </div>

        {/* 소셜 로그인 버튼 */}
        <div className="space-y-2 sm:space-y-3">
          <button
            type="button"
            onClick={() => {
              // 카카오 로그인 처리 (백엔드 연동 필요)
              window.alert('카카오 로그인 기능은 준비 중입니다.');
            }}
            className={`w-[384px] max-w-full py-3 mx-auto rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors ${
              isDarkMode
                ? 'bg-[#FEE500] hover:bg-[#FDD835] text-[#000000] cursor-pointer'
                : 'bg-[#FEE500] hover:bg-[#FDD835] text-[#000000] cursor-pointer'
            }`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3c5.799 0 10.5 3.664 10.5 8.185 0 4.52-4.701 8.184-10.5 8.184a13.5 13.5 0 0 1-1.727-.11l-4.408 2.883c-.501.265-.678.236-.472-.413l.892-3.678c-2.88-1.46-4.785-3.99-4.785-6.866C1.5 6.665 6.201 3 12 3z"/>
            </svg>
            카카오 로그인
          </button>

          <button
            type="button"
            onClick={() => {
              // 구글 로그인 처리 (백엔드 연동 필요)
              window.alert('구글 로그인 기능은 준비 중입니다.');
            }}
            className={`w-[384px] max-w-full py-3 mx-auto rounded-lg font-medium text-sm flex items-center justify-center gap-2 border transition-colors ${
              isDarkMode
                ? 'bg-gray-800 border-gray-600 hover:bg-gray-700 text-white cursor-pointer'
                : 'bg-white border-gray-300 hover:bg-gray-50 text-gray-700 cursor-pointer'
            }`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            구글 로그인
          </button>
        </div>

        <div className={`mt-4 sm:mt-6 text-center text-xs sm:text-sm md:text-base ${
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
            ? 'bg-gray-800 border-gray-600' 
            : 'bg-white border-gray-200'
        }`}>
          {/* 헤더 */}
          <button
            type="button"
            onClick={() => setIsInfoOpen(!isInfoOpen)}
            className={`w-full flex items-center justify-between p-3 rounded-t-lg transition-colors cursor-pointer ${
              isDarkMode
                ? 'hover:bg-gray-700'
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
              } ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}
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
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    <li>• 강의실 조회 및 수강 신청</li>
                    <li>• PDF 자료 보기</li>
                    <li>• AI 학습 (질문-답변 형식)</li>
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
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    <li>• 강의실 생성/수정/삭제</li>
                    <li>• 강의 생성/수정/삭제</li>
                    <li>• PDF 파일 업로드</li>
                    <li>• AI 강의 콘텐츠 생성</li>
                    <li>• 초대 링크 공유</li>
                  </ul>
                </div>

                {/* 공통 기능 */}
                <div>
                  <h3 className={`text-sm font-semibold mb-2 ${
                    isDarkMode ? 'text-purple-400' : 'text-purple-600'
                  }`}>
                    🎨 공통
                  </h3>
                  <ul className={`text-xs space-y-1 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    <li>• 반응형 레이아웃</li>
                    <li>• 다크 모드</li>
                    <li>• 프로필 관리</li>
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

