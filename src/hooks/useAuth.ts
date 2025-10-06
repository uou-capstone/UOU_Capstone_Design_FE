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
        try {
          const user = await authApi.getMe();
          setAuthState({
            user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          console.error('Token validation failed:', error);
          removeAuthToken();
          setAuthState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
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
      setAuthToken(response.accessToken);
      
      const user = await authApi.getMe();
      setAuthState({
        user,
        isAuthenticated: true,
        isLoading: false,
      });
      
      return { success: true, user };
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
      
      const response = await authApi.signup(userData);
      setAuthState(prev => ({ ...prev, isLoading: false }));
      
      return { success: true, data: response.data };
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
