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
      isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      <div className={`w-full max-w-md p-8 rounded-lg shadow-lg ${
        isDarkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        <div className="text-center mb-8">
          <h1 className={`text-3xl font-bold mb-2 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            로그인
          </h1>
          <p className={`text-sm ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
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
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
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
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
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
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="example@email.com"
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
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
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
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
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : isDarkMode
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
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
              isDarkMode ? 'text-blue-400' : 'text-blue-600'
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

