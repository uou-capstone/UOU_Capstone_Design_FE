import { useState, useEffect, useCallback } from 'react';
import { authApi, getAuthToken, setAuthToken, removeAuthToken, User } from '../services/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // 초기 인증 상태 확인
  useEffect(() => {
    const initAuth = async () => {
      const token = getAuthToken();
      if (token) {
        // 토큰이 있으면 인증된 것으로 간주
        // TODO: 백엔드에 사용자 정보 조회 API가 추가되면 여기서 호출
        setAuthState({
          user: null, // 사용자 정보는 로그인 시 저장하거나 별도 API로 조회 필요
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    };

    initAuth();
  }, []);

  // 로그인
  const login = useCallback(async (email: string, password: string) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      const response = await authApi.login({ email, password });
      // 토큰은 login 함수 내부에서 자동 저장됨
      
      // TODO: 사용자 정보는 별도 API로 조회하거나 로그인 응답에 포함되어야 함
      // 현재는 토큰만으로 인증 상태 관리
      setAuthState({
        user: null, // 사용자 정보는 필요시 별도 조회
        isAuthenticated: true,
        isLoading: false,
      });
      
      return { success: true, user: null };
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '로그인에 실패했습니다.' 
      };
    }
  }, []);

  // 회원가입
  const signup = useCallback(async (userData: {
    email: string;
    password: string;
    fullName: string;
    role: 'STUDENT' | 'TEACHER';
  }) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      await authApi.signup(userData);
      setAuthState(prev => ({ ...prev, isLoading: false }));
      
      return { success: true };
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '회원가입에 실패했습니다.' 
      };
    }
  }, []);

  // 로그아웃
  const logout = useCallback(() => {
    removeAuthToken();
    setAuthState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }, []);

  return {
    ...authState,
    login,
    signup,
    logout,
  };
};
