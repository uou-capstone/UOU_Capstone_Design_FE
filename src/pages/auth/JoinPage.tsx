import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { courseApi } from '@/services/api';
import TruckLoader from '@/components/common/TruckLoader/TruckLoader';

function extractBackendErrorCode(message: string): string | null {
  const patterns = [
    /"code"\s*:\s*"([A-Z_]+)"/,
    /\b(INVALID_INVITATION_CODE|JOIN_REQUEST_BLOCKED|JOIN_REQUEST_PENDING_EXISTS|ENROLLMENT_ALREADY_EXISTS)\b/,
  ];
  for (const p of patterns) {
    const m = p.exec(message);
    if (m?.[1]) return m[1];
  }
  return null;
}

function mapJoinRequestErrorMessage(raw: string): string {
  const code = extractBackendErrorCode(raw);
  if (code === 'INVALID_INVITATION_CODE') {
    return '초대 코드가 올바르지 않습니다.';
  }
  if (code === 'JOIN_REQUEST_BLOCKED') {
    return '해당 강의실 가입이 차단되었습니다. 교사에게 문의하세요.';
  }
  if (code === 'JOIN_REQUEST_PENDING_EXISTS') {
    return '이미 대기 중인 요청이 있습니다.';
  }
  if (code === 'ENROLLMENT_ALREADY_EXISTS') {
    return '이미 수강 중인 강의실입니다.';
  }
  return raw;
}

const JoinPage: React.FC = () => {
  const { isDarkMode } = useTheme();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code');
  
  const [isJoining, setIsJoining] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState(code ?? '');

  useEffect(() => {
    // 인증 상태 확인 중이면 대기
    if (isAuthLoading) {
      return;
    }

    // 로그인 안 되어 있으면 로그인 페이지로 리다이렉트
    if (!isAuthenticated) {
      const redirectTo = code ? `/join?code=${code}` : '/join';
      navigate('/login', {
        state: {
          redirectTo,
          message: '수강 신청을 위해 로그인이 필요합니다.',
        },
        replace: true,
      });
      return;
    }

    // 로그인 되어 있고 URL에 code가 있으면 확인 다이얼로그 표시
    if (code) {
      setShowConfirmDialog(true);
      setCodeInput(code);
    }
  }, [code, isAuthenticated, isAuthLoading, navigate]);

  const joinWithCode = async (joinCode: string) => {
    const trimmedCode = joinCode.trim();
    if (!trimmedCode) {
      setError('초대 코드를 입력해주세요.');
      return;
    }

    setIsJoining(true);
    setError(null);
    setShowConfirmDialog(false);

    try {
      const created = await courseApi.requestJoinByInvitationCode(trimmedCode);
      navigate('/', {
        replace: true,
        state: {
          message:
            `'${created.courseTitle}' 가입 요청이 전송되었습니다. 교사 승인 후 입장됩니다.`,
        },
      });
    } catch (err) {
      const rawMessage = err instanceof Error ? err.message : '수강 신청에 실패했습니다.';
      const mapped = mapJoinRequestErrorMessage(rawMessage);
      setError(mapped);
      if (extractBackendErrorCode(rawMessage) === 'ENROLLMENT_ALREADY_EXISTS') {
        navigate('/', { replace: true });
      }
      setShowConfirmDialog(true);
    } finally {
      setIsJoining(false);
    }
  };

  const handleConfirm = async () => {
    if (!code) return;
    await joinWithCode(code);
  };

  const handleManualSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await joinWithCode(codeInput);
  };

  const handleCancel = () => {
    navigate('/', { replace: true });
  };

  // 인증 상태 확인 중이거나 로딩 중
  if (isAuthLoading || isJoining) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-[#1A1A1A]' : 'bg-[#f5f1ec]'}`}>
        <TruckLoader />
      </div>
    );
  }

  // 로그인 안 되어 있으면 아무것도 렌더링하지 않음 (리다이렉트 중)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 ${isDarkMode ? 'bg-[#1A1A1A]' : 'bg-gray-100'}`}>
      <div className={`w-full max-w-md p-8 rounded-lg shadow-lg ${isDarkMode ? 'bg-zinc-800' : 'bg-white'}`}>
        <div className="text-center mb-6">
          <h2 className={`text-2xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            수강 신청
          </h2>
          {code && showConfirmDialog ? (
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              초대 링크로 전달받은 강의실에 수강 신청 하시겠습니까?
            </p>
          ) : (
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              선생님이 알려준 초대 코드를 입력하면 가입 요청을 보낼 수 있습니다.
            </p>
          )}
        </div>

        {error && (
          <div className={`mb-4 p-3 rounded-lg ${isDarkMode ? 'bg-red-900/30 text-red-300' : 'bg-red-50 text-red-600'}`}>
            {error}
          </div>
        )}

        {code && showConfirmDialog ? (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleCancel}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                isDarkMode
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
              }`}
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                isDarkMode
                  ? 'bg-[#ff824d] hover:bg-[#f26f37] text-white'
                  : 'bg-[#ff824d] hover:bg-[#f26f37] text-white'
              }`}
            >
              수강 신청
            </button>
          </div>
        ) : (
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div>
              <label
                className={`block text-sm font-medium mb-1 ${
                  isDarkMode ? 'text-gray-200' : 'text-gray-700'
                }`}
              >
                초대 코드
              </label>
              <input
                type="text"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                placeholder="예: 550e8400-e29b-41d4-a716-446655440000"
                className={`w-full px-3 py-2 text-sm rounded border ${
                  isDarkMode
                    ? 'bg-zinc-800 border-zinc-700 text-white placeholder-gray-500'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                } focus:outline-none focus:ring-2 ${
                  isDarkMode ? 'focus:ring-[#ff824d]' : 'focus:ring-[#ff824d]'
                }`}
              />
              <p className={`mt-2 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                초대 링크 또는 교사에게 받은 초대 코드를 입력하세요.
              </p>
            </div>

            <button
              type="submit"
              className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                isDarkMode
                  ? 'bg-[#ff824d] hover:bg-[#f26f37] text-white'
                  : 'bg-[#ff824d] hover:bg-[#f26f37] text-white'
              }`}
            >
              수강 신청
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default JoinPage;
