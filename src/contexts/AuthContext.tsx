import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi, User, getAuthToken, setAuthToken, removeAuthToken } from '../services/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, fullName: string, role: 'STUDENT' | 'TEACHER') => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 초기 로드 시 토큰 확인 및 사용자 정보 가져오기
  useEffect(() => {
    const initAuth = async () => {
      const token = getAuthToken();
      if (!token) {
        // 토큰이 없으면 인증되지 않은 상태로 설정
        setUser(null);
        setIsLoading(false);
        return;
      }
      
      try {
        const userData = await authApi.getMe();
        setUser(userData);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        // 백엔드에 /api/auth/me가 구현되어 있지 않거나 CORS 문제인 경우
        // 토큰은 유지하고 사용자 정보만 null로 설정
        if (errorMessage.includes('네트워크 연결 실패') || 
            errorMessage.includes('Failed to fetch') ||
            errorMessage.includes('404') ||
            errorMessage.includes('405') ||
            errorMessage.includes('Not Found') ||
            errorMessage.includes('Method Not Allowed') ||
            errorMessage.includes('CORS')) {
          // 백엔드에 엔드포인트가 없거나 CORS 문제인 경우 토큰 유지
          setUser(null);
        } else if (errorMessage.includes('인증이 필요합니다')) {
          // 명시적인 인증 오류인 경우에만 토큰 제거
          removeAuthToken();
          setUser(null);
        } else {
          // 기타 오류인 경우 토큰 유지 (백엔드 문제일 수 있음)
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    try {
      const response = await authApi.login({ email, password });
      if (response.accessToken) {
        try {
          const userData = await authApi.getMe();
          setUser(userData);
        } catch (getMeError) {
          // 백엔드에 /api/auth/me가 구현되어 있지 않거나 CORS 문제인 경우
          // 로그인은 성공했으므로 토큰은 유지하고 사용자 정보만 null로 설정
          setUser(null);
        }
      }
    } catch (error) {
      throw error;
    }
  };

  const signup = async (
    email: string,
    password: string,
    fullName: string,
    role: 'STUDENT' | 'TEACHER'
  ): Promise<void> => {
    try {
      await authApi.signup({ email, password, fullName, role });
      // 회원가입만 하고 로그인은 하지 않음 (로그인 페이지로 이동)
    } catch (error) {
      throw error;
    }
  };

  const logout = (): void => {
    removeAuthToken();
    setUser(null);
  };

  const refreshUser = async (): Promise<void> => {
    try {
      const userData = await authApi.getMe();
      setUser(userData);
    } catch (error) {
      removeAuthToken();
      setUser(null);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    signup,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

