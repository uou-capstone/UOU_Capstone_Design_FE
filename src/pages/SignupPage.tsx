import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const SignupPage: React.FC = () => {
  const { isDarkMode } = useTheme();
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    role: 'STUDENT' as 'STUDENT' | 'TEACHER',
  });
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  // 이메일 형식 검증
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // 비밀번호 강도 검증
  const validatePassword = (password: string): { isValid: boolean; message: string } => {
    if (password.length < 8) {
      return { isValid: false, message: '비밀번호는 최소 8자 이상이어야 합니다.' };
    }
    if (!/[A-Za-z]/.test(password)) {
      return { isValid: false, message: '비밀번호에 영문자가 포함되어야 합니다.' };
    }
    if (!/[0-9]/.test(password)) {
      return { isValid: false, message: '비밀번호에 숫자가 포함되어야 합니다.' };
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return { isValid: false, message: '비밀번호에 특수문자가 포함되어야 합니다.' };
    }
    return { isValid: true, message: '' };
  };

  // 이름 검증
  const validateName = (name: string): boolean => {
    return name.trim().length >= 2 && name.trim().length <= 50;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // 실시간 검증
    const newErrors = { ...errors };
    if (name === 'email' && value && !validateEmail(value)) {
      newErrors.email = '올바른 이메일 형식이 아닙니다.';
    } else if (name === 'email') {
      delete newErrors.email;
    }

    if (name === 'password' && value) {
      const passwordValidation = validatePassword(value);
      if (!passwordValidation.isValid) {
        newErrors.password = passwordValidation.message;
      } else {
        delete newErrors.password;
      }
    } else if (name === 'password') {
      delete newErrors.password;
    }

    if (name === 'confirmPassword' && value && formData.password !== value) {
      newErrors.confirmPassword = '비밀번호가 일치하지 않습니다.';
    } else if (name === 'confirmPassword') {
      delete newErrors.confirmPassword;
    }

    if (name === 'fullName' && value && !validateName(value)) {
      newErrors.fullName = '이름은 2자 이상 50자 이하여야 합니다.';
    } else if (name === 'fullName') {
      delete newErrors.fullName;
    }

    setErrors(newErrors);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const newErrors: Record<string, string> = {};

    // 이름 검증
    if (!formData.fullName.trim()) {
      newErrors.fullName = '이름을 입력해주세요.';
    } else if (!validateName(formData.fullName)) {
      newErrors.fullName = '이름은 2자 이상 50자 이하여야 합니다.';
    }

    // 이메일 검증
    if (!formData.email) {
      newErrors.email = '이메일을 입력해주세요.';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = '올바른 이메일 형식이 아닙니다.';
    }

    // 비밀번호 검증
    if (!formData.password) {
      newErrors.password = '비밀번호를 입력해주세요.';
    } else {
      const passwordValidation = validatePassword(formData.password);
      if (!passwordValidation.isValid) {
        newErrors.password = passwordValidation.message;
      }
    }

    // 비밀번호 확인 검증
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = '비밀번호 확인을 입력해주세요.';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = '비밀번호가 일치하지 않습니다.';
    }

    setErrors(newErrors);

    // 에러가 있으면 제출 중단
    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setIsLoading(true);

    try {
      await signup(
        formData.email,
        formData.password,
        formData.fullName,
        formData.role
      );
      // 회원가입 성공 후 로그인 페이지로 이동
      navigate('/login', { 
        state: { 
          message: '회원가입이 완료되었습니다. 로그인해주세요.',
          email: formData.email 
        } 
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '회원가입에 실패했습니다.';
      
      // 이메일 중복 에러인 경우 이메일 필드에 에러 표시
      if (errorMessage.includes('이미 존재하는 이메일') || 
          errorMessage.includes('이미 존재') ||
          errorMessage.includes('중복') ||
          errorMessage.includes('409')) {
        setErrors((prev) => ({
          ...prev,
          email: '이미 사용 중인 이메일입니다.',
        }));
        setError('');
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center transition-colors ${
      isDarkMode ? 'bg-slate-900' : 'bg-gray-50'
    }`}>
      <div className={`w-full max-w-md p-8 rounded-lg shadow-lg ${
        isDarkMode ? 'bg-slate-800' : 'bg-white'
      }`}>
        <div className="text-center mb-8">
          <h1 className={`text-3xl font-bold mb-2 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            회원가입
          </h1>
          <p className={`text-sm ${
            isDarkMode ? 'text-slate-400' : 'text-gray-600'
          }`}>
            AI Tutor LMS 계정을 만들어보세요
          </p>
        </div>

        {error && (
          <div className={`mb-4 p-3 rounded-lg ${
            isDarkMode ? 'bg-red-900/30 text-red-300' : 'bg-red-50 text-red-600'
          }`}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              isDarkMode ? 'text-slate-200' : 'text-gray-700'
            }`}>
              이름
            </label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              required
              className={`w-full px-4 py-2 rounded-lg border ${
                errors.fullName
                  ? isDarkMode
                    ? 'bg-slate-700 border-red-500 text-white placeholder-slate-400'
                    : 'bg-white border-red-500 text-gray-900 placeholder-gray-400'
                  : isDarkMode
                  ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="홍길동"
            />
            <div className="h-4 mt-1">
              {errors.fullName && (
                <p className={`text-xs leading-tight ${
                  isDarkMode ? 'text-red-400' : 'text-red-600'
                }`}>
                  {errors.fullName}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${
              isDarkMode ? 'text-slate-200' : 'text-gray-700'
            }`}>
              이메일
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className={`w-full px-4 py-2 rounded-lg border ${
                errors.email
                  ? isDarkMode
                    ? 'bg-slate-700 border-red-500 text-white placeholder-slate-400'
                    : 'bg-white border-red-500 text-gray-900 placeholder-gray-400'
                  : isDarkMode
                  ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="example@email.com"
            />
            <div className="h-4 mt-1">
              {errors.email && (
                <p className={`text-xs leading-tight ${
                  isDarkMode ? 'text-red-400' : 'text-red-600'
                }`}>
                  {errors.email}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${
              isDarkMode ? 'text-slate-200' : 'text-gray-700'
            }`}>
              역할
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className={`w-full px-4 py-2 rounded-lg border ${
                isDarkMode
                  ? 'bg-slate-700 border-slate-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            >
              <option value="STUDENT">학생</option>
              <option value="TEACHER">선생님</option>
            </select>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${
              isDarkMode ? 'text-slate-200' : 'text-gray-700'
            }`}>
              비밀번호
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className={`w-full px-4 py-2 rounded-lg border ${
                errors.password
                  ? isDarkMode
                    ? 'bg-slate-700 border-red-500 text-white placeholder-slate-400'
                    : 'bg-white border-red-500 text-gray-900 placeholder-gray-400'
                  : isDarkMode
                  ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="영문, 숫자, 특수문자 포함 8자 이상"
            />
            <div className="h-4 mt-1">
              {errors.password && (
                <p className={`text-xs leading-tight ${
                  isDarkMode ? 'text-red-400' : 'text-red-600'
                }`}>
                  {errors.password}
                </p>
              )}
              {!errors.password && formData.password && (
                <p className={`text-xs leading-tight ${
                  isDarkMode ? 'text-green-400' : 'text-green-600'
                }`}>
                  ✓ 비밀번호 형식이 올바릅니다
                </p>
              )}
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${
              isDarkMode ? 'text-slate-200' : 'text-gray-700'
            }`}>
              비밀번호 확인
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              className={`w-full px-4 py-2 rounded-lg border ${
                errors.confirmPassword
                  ? isDarkMode
                    ? 'bg-slate-700 border-red-500 text-white placeholder-slate-400'
                    : 'bg-white border-red-500 text-gray-900 placeholder-gray-400'
                  : isDarkMode
                  ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="비밀번호를 다시 입력하세요"
            />
            <div className="h-4 mt-1">
              {errors.confirmPassword && (
                <p className={`text-xs leading-tight ${
                  isDarkMode ? 'text-red-400' : 'text-red-600'
                }`}>
                  {errors.confirmPassword}
                </p>
              )}
              {!errors.confirmPassword && formData.confirmPassword && formData.password === formData.confirmPassword && (
                <p className={`text-xs leading-tight ${
                  isDarkMode ? 'text-green-400' : 'text-green-600'
                }`}>
                  ✓ 비밀번호가 일치합니다
                </p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 rounded-lg font-medium transition-colors ${
              isLoading
                ? isDarkMode
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : isDarkMode
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
            }`}
          >
            {isLoading ? '가입 중...' : '회원가입'}
          </button>
        </form>

        <div className={`mt-6 text-center text-sm ${
          isDarkMode ? 'text-slate-400' : 'text-gray-600'
        }`}>
          이미 계정이 있으신가요?{' '}
          <Link
            to="/login"
            className={`font-medium hover:underline ${
              isDarkMode ? 'text-emerald-400' : 'text-emerald-600'
            }`}
          >
            로그인
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;

