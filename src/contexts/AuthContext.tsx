import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
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

// 자동 로그아웃 시간 (밀리초) - 30분
const AUTO_LOGOUT_TIME = 30 * 60 * 1000;

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
  const logoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

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
      
      // getMe 호출 시도 (최대 3번 재시도)
      let userData: User | null = null;
      let lastError: any = null;
      
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          userData = await authApi.getMe();
          if (userData) {
            setUser(userData);
            setIsLoading(false);
            return;
          }
        } catch (error) {
          lastError = error;
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.warn(`초기 로드 getMe 호출 실패 (시도 ${attempt + 1}/3):`, errorMessage);
          
          // 마지막 시도가 아니면 잠시 대기 후 재시도
          if (attempt < 2) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }
      
      // 모든 시도 실패 시
      if (lastError) {
        const errorMessage = lastError instanceof Error ? lastError.message : String(lastError);
        console.error('초기 로드 getMe 호출이 모든 재시도 후에도 실패했습니다:', errorMessage);
        
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
        } else if (errorMessage.includes('인증이 필요합니다') || 
                   errorMessage.includes('401') ||
                   errorMessage.includes('Unauthorized')) {
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
          // getMe 호출 시도 (최대 2번 재시도)
          let userData: User | null = null;
          let lastError: any = null;
          
          for (let attempt = 0; attempt < 3; attempt++) {
            try {
              userData = await authApi.getMe();
              if (userData) {
                setUser(userData);
                return;
              }
            } catch (getMeError) {
              lastError = getMeError;
              console.warn(`getMe 호출 실패 (시도 ${attempt + 1}/3):`, getMeError);
              
              // 마지막 시도가 아니면 잠시 대기 후 재시도
              if (attempt < 2) {
                await new Promise(resolve => setTimeout(resolve, 500));
              }
            }
          }
          
          // 모든 시도 실패 시 에러 로깅
          console.error('getMe 호출이 모든 재시도 후에도 실패했습니다:', lastError);
          const errorMessage = lastError instanceof Error ? lastError.message : String(lastError);
          console.error('에러 상세:', {
            message: errorMessage,
            stack: lastError instanceof Error ? lastError.stack : undefined,
          });
          
          // getMe 실패해도 로그인은 성공한 것으로 간주 (토큰이 있으므로)
          // 하지만 사용자 정보는 null로 설정
          setUser(null);
        } catch (getMeError) {
          // 예상치 못한 에러
          console.error('getMe 호출 중 예상치 못한 에러:', getMeError);
          setUser(null);
        }
      }
    } catch (error) {
      // 로그인 실패 시 에러를 그대로 throw하여 LoginPage에서 처리하도록 함
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

  const logout = useCallback((): void => {
    removeAuthToken();
    setUser(null);
    // 타이머 정리
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }
  }, []);

  // 자동 로그아웃 타이머 설정
  const resetLogoutTimer = useCallback(() => {
    // 기존 타이머 제거
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
    }

    // 사용자가 로그인되어 있을 때만 타이머 설정
    if (user) {
      logoutTimerRef.current = setTimeout(() => {
        logout();
        // 로그인 페이지로 이동
        window.location.href = '/login';
      }, AUTO_LOGOUT_TIME);
    }
  }, [user, logout]);

  // 사용자 활동 감지
  useEffect(() => {
    if (!user) {
      // 로그인되지 않은 경우 타이머 정리
      if (logoutTimerRef.current) {
        clearTimeout(logoutTimerRef.current);
        logoutTimerRef.current = null;
      }
      return;
    }

    // 초기 타이머 설정
    resetLogoutTimer();

    // 사용자 활동 이벤트 리스너
    const handleUserActivity = () => {
      const now = Date.now();
      // 마지막 활동으로부터 1분 이상 지났을 때만 타이머 리셋 (성능 최적화)
      if (now - lastActivityRef.current > 60000) {
        lastActivityRef.current = now;
        resetLogoutTimer();
      }
    };

    // 다양한 사용자 활동 이벤트 감지
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, handleUserActivity, { passive: true });
    });

    return () => {
      // 이벤트 리스너 제거
      events.forEach(event => {
        document.removeEventListener(event, handleUserActivity);
      });
      // 타이머 정리
      if (logoutTimerRef.current) {
        clearTimeout(logoutTimerRef.current);
      }
    };
  }, [user, resetLogoutTimer]);

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

  // isAuthenticated는 토큰 존재 여부로 판단 (getMe 실패해도 토큰이 있으면 로그인 성공)
  const isAuthenticated = !!getAuthToken() || !!user;

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    signup,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

