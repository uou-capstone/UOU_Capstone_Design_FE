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
    <div className={`min-h-screen flex items-center justify-center transition-colors px-4 py-6 sm:py-8 ${
      isDarkMode ? 'bg-[#141414]' : 'bg-gray-100'
    }`}>
      <div className={`w-full max-w-md max-h-[calc(100vh-3rem)] overflow-y-auto p-6 sm:p-8 rounded-lg shadow-lg ${
        isDarkMode ? 'bg-zinc-800' : 'bg-white'
      }`}>
        <div className="text-center mb-6 sm:mb-4">
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
            <div className="flex items-center">
              <span>서버상태:</span>
              <span className={`text-base font-semibold tracking-wide px-1 sm:px-2 py-0.5 sm:py-1 rounded ${
                isCheckingServer
                  ? (isDarkMode ? 'text-yellow-200' : 'text-yellow-700')
                  : serverStatus.online
                    ? (isDarkMode ? 'text-green-200' : 'text-green-700')
                    : (isDarkMode ? 'text-red-200' : 'text-red-700')
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
              className={`w-[384px] max-w-full px-3 py-2 text-sm rounded-lg border ${
                isDarkMode
                  ? 'bg-zinc-800 border-zinc-700 text-white placeholder-gray-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              } focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500`}
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
                className={`text-xs hover:underline ${
                  'text-[#ff824d]'
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
              className={`w-[384px] max-w-full px-3 py-2 text-sm rounded-lg border ${
                isDarkMode
                  ? 'bg-zinc-800 border-zinc-700 text-white placeholder-gray-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              } focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500`}
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

