import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { courseApi } from '../services/api';
import TruckLoader from '../components/common/TruckLoader';

const JoinPage: React.FC = () => {
  const { isDarkMode } = useTheme();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code');
  
  const [isJoining, setIsJoining] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // code가 없으면 홈으로 리다이렉트
    if (!code) {
      navigate('/', { replace: true });
      return;
    }

    // 인증 상태 확인 중이면 대기
    if (isAuthLoading) {
      return;
    }

    // 로그인 안 되어 있으면 로그인 페이지로 리다이렉트 (code를 state로 전달)
    if (!isAuthenticated) {
      navigate('/login', { 
        state: { 
          redirectTo: `/join?code=${code}`,
          message: '수강 신청을 위해 로그인이 필요합니다.'
        },
        replace: true 
      });
      return;
    }

    // 로그인 되어 있으면 확인 다이얼로그 표시
    setShowConfirmDialog(true);
  }, [code, isAuthenticated, isAuthLoading, navigate]);

  const handleConfirm = async () => {
    if (!code) return;

    setIsJoining(true);
    setError(null);
    setShowConfirmDialog(false);

    try {
      const courseDetail = await courseApi.joinCourse(code);
      // 성공 시 강의실로 이동
      navigate(`/courses/${courseDetail.courseId}`, { 
        replace: true,
        state: { 
          message: '수강 신청이 완료되었습니다!' 
        }
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '수강 신청에 실패했습니다.';
      setError(errorMessage);
      setShowConfirmDialog(true); // 에러 발생 시 다시 확인 다이얼로그 표시
    } finally {
      setIsJoining(false);
    }
  };

  const handleCancel = () => {
    navigate('/', { replace: true });
  };

  // 인증 상태 확인 중이거나 로딩 중
  if (isAuthLoading || isJoining) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-slate-900' : 'bg-gray-50'}`}>
        <TruckLoader />
      </div>
    );
  }

  // code가 없거나 로그인 안 되어 있으면 아무것도 렌더링하지 않음 (리다이렉트 중)
  if (!code || !isAuthenticated) {
    return null;
  }

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 ${isDarkMode ? 'bg-slate-900' : 'bg-gray-50'}`}>
      <div className={`w-full max-w-md p-8 rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
        {showConfirmDialog ? (
          <>
            <div className="text-center mb-6">
              <h2 className={`text-2xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                수강 신청
              </h2>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                이 강의실에 수강 신청 하시겠습니까?
              </p>
            </div>

            {error && (
              <div className={`mb-4 p-3 rounded-lg ${isDarkMode ? 'bg-red-900/30 text-red-300' : 'bg-red-50 text-red-600'}`}>
                {error}
              </div>
            )}

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
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                수강 신청
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default JoinPage;

