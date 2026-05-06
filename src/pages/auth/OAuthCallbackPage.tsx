import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import TruckLoader from '@/components/common/TruckLoader/TruckLoader';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { authApi } from '@/services/api';
import { sanitizePostLoginNext } from '@/utils/sanitizePostLoginNext';

const mapOAuthErrorMessage = (errorCode: string | null): string => {
  if (!errorCode) return '소셜 로그인에 실패했습니다. 다시 시도해주세요.';
  const normalized = errorCode.trim().toUpperCase();
  if (normalized === 'CODE_EXPIRED') return '로그인 코드가 만료되었습니다. 다시 시도해주세요.';
  if (normalized === 'CODE_ALREADY_USED') return '이미 사용된 로그인 코드입니다. 다시 로그인해주세요.';
  if (normalized === 'ACCESS_DENIED') return '소셜 로그인이 취소되었습니다.';
  return '소셜 로그인 처리에 실패했습니다. 다시 시도해주세요.';
};

const OAuthCallbackPage: React.FC = () => {
  const { isDarkMode } = useTheme();
  const { refreshUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [message, setMessage] = React.useState('로그인 정보를 확인하는 중입니다...');

  React.useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const code = searchParams.get('code');
      const errorCode = searchParams.get('errorCode');
      const next = searchParams.get('next');

      if (errorCode) {
        navigate('/login', {
          replace: true,
          state: { message: mapOAuthErrorMessage(errorCode) },
        });
        return;
      }

      if (!code) {
        navigate('/login', {
          replace: true,
          state: { message: mapOAuthErrorMessage(null) },
        });
        return;
      }

      try {
        setMessage('소셜 로그인 교환을 진행하는 중입니다...');
        await authApi.exchangeOAuthCode(code);
        await refreshUser();
        if (!cancelled) {
          const target =
            next && next.startsWith('/') ? sanitizePostLoginNext(next) : '/';
          navigate(target, { replace: true });
        }
      } catch (error) {
        if (cancelled) return;
        const text =
          error instanceof Error && error.message.trim().length > 0
            ? error.message
            : '소셜 로그인 처리에 실패했습니다. 다시 시도해주세요.';
        navigate('/login', {
          replace: true,
          state: { message: text },
        });
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [navigate, refreshUser, searchParams]);

  return (
    <div
      className={`min-h-screen flex items-center justify-center px-4 ${
        isDarkMode ? 'bg-[#141414]' : 'bg-gray-100'
      }`}
    >
      <div
        className={`w-full max-w-md rounded-lg shadow-lg p-8 text-center ${
          isDarkMode ? 'bg-zinc-800 text-white' : 'bg-white text-gray-900'
        }`}
      >
        <div className="flex justify-center mb-5">
          <TruckLoader />
        </div>
        <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{message}</p>
      </div>
    </div>
  );
};

export default OAuthCallbackPage;
