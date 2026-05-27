import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation, useSearchParams } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { checkServerStatus } from '@/services/api';
import { sanitizePostLoginNext } from '@/utils/sanitizePostLoginNext';

const LoginPage: React.FC = () => {
  const { isDarkMode } = useTheme();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [serverStatus, setServerStatus] = useState<{ online: boolean; message?: string } | null>(null);
  const [isCheckingServer, setIsCheckingServer] = useState(true);

  const summarizeLoginError = (msg: string): string => {
    const m = msg.toLowerCase();
    if (
      m.includes('401') ||
      m.includes('unauthorized') ||
      m.includes('invalid') ||
      m.includes('로그인') ||
      m.includes('인증')
    ) {
      return '이메일 또는 비밀번호를 확인해주세요.';
    }
    if (m.includes('네트워크') || m.includes('failed to fetch') || m.includes('fetch')) {
      return '서버 통신에 실패했습니다.';
    }
    if (msg.trim().length === 0) return '로그인에 실패했습니다.';
    return msg.trim().length > 38 ? `${msg.trim().slice(0, 38)}…` : msg.trim();
  };

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
      const nextFromQuery = searchParams.get('next');
      const state = location.state as { redirectTo?: string } | null;
      const raw = nextFromQuery ?? state?.redirectTo;
      const target =
        raw != null && raw !== '' ? sanitizePostLoginNext(raw) : '/';
      navigate(target, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center transition-colors px-4 py-6 sm:py-8 ${
      isDarkMode ? 'bg-[#313130]' : 'bg-gray-100'
    }`}>
      <div className={`w-full max-w-md max-h-[calc(100vh-3rem)] overflow-y-auto p-6 sm:p-8 rounded-lg shadow-lg ${
        isDarkMode ? 'bg-zinc-800' : 'bg-white'
      }`}>
        <div className="text-center mb-3">
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

        {/* 서버 상태 표시 (초기부터 고정 렌더링해 레이아웃 흔들림 방지) */}
        <div className={`mb-3 text-xs sm:text-sm md:text-base ${
          isDarkMode ? 'text-gray-400' : 'text-gray-600'
        }`}>
          <div className="flex items-center min-h-8 w-full min-w-0">
            <span className="shrink-0 whitespace-nowrap">서버:</span>
            <span
              className={`shrink-0 whitespace-nowrap text-base font-semibold tracking-wide pl-1 rounded ${
                isCheckingServer
                  ? `animate-pulse ${isDarkMode ? 'text-yellow-200' : 'text-yellow-700'}`
                  : serverStatus?.online
                    ? (isDarkMode ? 'text-green-200' : 'text-green-700')
                    : (isDarkMode ? 'text-red-200' : 'text-red-700')
              }`}
            >
              {isCheckingServer
                ? 'CHECKING...'
                : serverStatus?.online
                  ? 'ONLINE'
                  : 'OFFLINE'}
            </span>
            {error && (!serverStatus || serverStatus.online) ? (
              <span
                className={`ml-auto text-xs sm:text-sm ${
                  isDarkMode ? 'text-red-300' : 'text-red-600'
                } font-medium whitespace-nowrap`}
              >
                {summarizeLoginError(error)}
              </span>
            ) : successMessage ? (
              <span
                className={`ml-auto text-xs sm:text-sm ${
                  isDarkMode ? 'text-emerald-300' : 'text-emerald-600'
                } font-medium whitespace-nowrap`}
              >
                {successMessage}
              </span>
            ) : null}
          </div>
        </div>


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
              className={`w-full max-w-96 px-3 py-2 text-sm rounded-lg border ${
                isDarkMode
                  ? 'bg-zinc-800 border-zinc-700 text-white placeholder-gray-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              } focus:outline-none focus:ring-2 focus:ring-[#ff824d]/60 focus:border-[#ff824d]`}
              placeholder="example@email.com"
            />
          </div>

          <div>
              <label className={`block text-xs sm:text-sm md:text-base font-medium mb-2 ${
                isDarkMode ? 'text-gray-200' : 'text-gray-700'
              }`}>
                비밀번호
              </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={`w-full max-w-96 px-3 py-2 text-sm rounded-lg border ${
                isDarkMode
                  ? 'bg-zinc-800 border-zinc-700 text-white placeholder-gray-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              } focus:outline-none focus:ring-2 focus:ring-[#ff824d]/60 focus:border-[#ff824d]`}
              placeholder="비밀번호를 입력하세요"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full max-w-96 py-3 mx-auto rounded-lg font-medium text-sm flex items-center justify-center transition-colors ${
              isLoading
                ? isDarkMode
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : isDarkMode
                ? 'bg-[#ff824d] hover:bg-[#ff6b33] text-white cursor-pointer'
                : 'bg-[#ff824d] hover:bg-[#ff6b33] text-white cursor-pointer'
            } focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff824d]/60`}
          >
            {isLoading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <div className={`mt-4 sm:mt-6 text-center text-xs sm:text-sm md:text-base ${
          isDarkMode ? 'text-gray-400' : 'text-gray-600'
        }`}>
          계정이 없으신가요?{' '}
          <Link
            to="/signup"
            className={`font-medium hover:underline ${
              'text-[#ff824d]'
            }`}
          >
            회원가입
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

