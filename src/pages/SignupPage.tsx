import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { userApi } from '../services/api';

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
    phoneNumber: '',
    birthDate: '',
    grade: '',
    classNumber: '',
    schoolName: '',
    department: '',
  });
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [emailChecked, setEmailChecked] = useState<null | 'available' | 'unavailable'>(null);
  const [step, setStep] = useState(1);
  const TOTAL_STEPS = 4;

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

  // 생년월일 검증: 미래 날짜 금지, 1900년 이전 금지
  const validateBirthDate = (dateStr: string): { isValid: boolean; message: string } => {
    if (!dateStr.trim()) return { isValid: true, message: '' };
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return { isValid: false, message: '올바른 날짜를 입력해 주세요.' };
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (date > today) return { isValid: false, message: '생년월일은 오늘 이전이어야 합니다.' };
    const minDate = new Date('1900-01-01');
    if (date < minDate) return { isValid: false, message: '생년월일을 확인해 주세요. (1900년 이후만 입력 가능)' };
    return { isValid: true, message: '' };
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // 이메일이 바뀌면 중복 확인 상태 초기화
    if (name === 'email') {
      setEmailChecked(null);
    }

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

    if (name === 'birthDate') {
      const res = validateBirthDate(value);
      if (!res.isValid) newErrors.birthDate = res.message;
      else delete newErrors.birthDate;
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

    // 생년월일 검증 (입력한 경우에만)
    if (formData.birthDate) {
      const birthRes = validateBirthDate(formData.birthDate);
      if (!birthRes.isValid) newErrors.birthDate = birthRes.message;
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
        formData.role,
        {
          phoneNumber: formData.phoneNumber || undefined,
          birthDate: formData.birthDate || undefined,
          grade: formData.grade || undefined,
          classNumber: formData.classNumber || undefined,
          schoolName: formData.schoolName || undefined,
          department: formData.department || undefined,
        }
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
    <div className={`min-h-screen flex items-center justify-center px-4 py-6 sm:py-8 transition-colors ${
      isDarkMode ? 'bg-zinc-900' : 'bg-gray-100'
    }`}>
      <div className={`w-full max-w-md max-h-[calc(100vh-3rem)] overflow-y-auto p-6 sm:p-8 rounded-lg shadow-lg ${
        isDarkMode ? 'bg-zinc-800' : 'bg-white'
      }`}>
        <div className="text-center mb-8">
          <h1 className={`text-3xl font-bold mb-2 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            회원가입
          </h1>
          <p className={`text-sm ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
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

        {/* 단계 표시 */}
        <div className="flex justify-center gap-2 mb-6">
          {[1, 2, 3, 4].map((s) => (
            <span
              key={s}
              className={`w-8 h-1 rounded-full ${
                s <= step ? (isDarkMode ? 'bg-emerald-500' : 'bg-emerald-600') : (isDarkMode ? 'bg-zinc-600' : 'bg-gray-200')
              }`}
              aria-hidden
            />
          ))}
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Step 1: 이름, 생년월일 */}
          {step === 1 && (
            <>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>이름</label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                  className={`w-full px-3 py-1 rounded-lg border text-sm ${
                    errors.fullName ? (isDarkMode ? 'bg-zinc-800 border-red-500 text-white' : 'bg-white border-red-500 text-gray-900') : (isDarkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-gray-300 text-gray-900')
                  } placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="홍길동"
                />
                <div className="h-4 mt-1">{errors.fullName && <p className={`text-xs ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>{errors.fullName}</p>}</div>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>생년월일</label>
                <input
                  type="date"
                  name="birthDate"
                  value={formData.birthDate}
                  onChange={handleChange}
                  max={new Date().toISOString().slice(0, 10)}
                  className={`w-full px-3 py-1 rounded-lg border text-sm ${
                    errors.birthDate ? (isDarkMode ? 'bg-zinc-800 border-red-500 text-white' : 'bg-white border-red-500 text-gray-900') : (isDarkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-gray-300 text-gray-900')
                  } placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
                <div className="h-4 mt-1">{errors.birthDate && <p className={`text-xs ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>{errors.birthDate}</p>}</div>
              </div>
            </>
          )}

          {/* Step 2: 전화번호, 이메일 */}
          {step === 2 && (
            <>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>전화번호</label>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  className={`w-full px-3 py-1 rounded-lg border text-sm ${isDarkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-gray-300 text-gray-900'} placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="010-1234-5678"
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>이메일 (로그인 아이디)</label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className={`flex-1 w-full px-3 py-1 rounded-lg border text-sm ${
                      errors.email ? (isDarkMode ? 'bg-zinc-800 border-red-500 text-white' : 'bg-white border-red-500 text-gray-900') : (isDarkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-gray-300 text-gray-900')
                    } placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="example@email.com"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      if (!formData.email) { setErrors((p) => ({ ...p, email: '이메일을 입력해주세요.' })); return; }
                      if (!validateEmail(formData.email)) { setErrors((p) => ({ ...p, email: '올바른 이메일 형식이 아닙니다.' })); return; }
                      setIsCheckingEmail(true);
                      try {
                        await userApi.checkEmail(formData.email);
                        setEmailChecked('available');
                        setErrors((p) => { const { email, ...rest } = p; return rest; });
                      } catch (err) {
                        const msg = err instanceof Error ? err.message : '이메일 중복 확인에 실패했습니다.';
                        // "인증되지 않은 사용자" = 로그인 요구(401), 이메일 중복이 아님
                        if (msg.includes('인증되지 않은') || msg.includes('인증') && msg.includes('사용자') || msg.includes('401') || msg.includes('로그인')) {
                          setEmailChecked(null);
                          setErrors((p) => ({ ...p, email: '서버에서 로그인을 요구해 확인할 수 없습니다. (이메일 중복이 아닙니다. BE에서 회원가입 전 이메일 확인 API를 비로그인 허용으로 열어주세요.)' }));
                        } else if (msg.includes('이미') || msg.includes('중복')) {
                          setEmailChecked('unavailable');
                          setErrors((p) => ({ ...p, email: '이미 사용 중인 이메일입니다.' }));
                        } else {
                          setEmailChecked(null);
                          setErrors((p) => ({ ...p, email: msg }));
                        }
                      } finally {
                        setIsCheckingEmail(false);
                      }
                    }}
                    disabled={isCheckingEmail}
                    className={`px-3 py-2 text-xs rounded-lg font-medium whitespace-nowrap ${isCheckingEmail ? (isDarkMode ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-500 cursor-not-allowed') : (isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-white cursor-pointer' : 'bg-gray-100 hover:bg-gray-200 text-gray-800 cursor-pointer')}`}
                  >
                    {isCheckingEmail ? '확인 중...' : '중복 확인'}
                  </button>
                </div>
                <div className="h-4 mt-1">
                  {errors.email && <p className={`text-xs ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>{errors.email}</p>}
                  {!errors.email && emailChecked === 'available' && <p className={`text-xs ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>✓ 사용 가능한 이메일입니다</p>}
                </div>
              </div>
            </>
          )}

          {/* Step 3: 역할, 학교 정보 */}
          {step === 3 && (
            <>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>역할</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className={`w-full px-3 py-1 rounded-lg border text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                >
                  <option value="STUDENT">학생</option>
                  <option value="TEACHER">선생님</option>
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>학년</label>
                  <input type="text" name="grade" value={formData.grade} onChange={handleChange} className={`w-full px-3 py-1 rounded-lg border text-sm ${isDarkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-gray-300 text-gray-900'} placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500`} placeholder="예: 3학년" />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>반</label>
                  <input type="text" name="classNumber" value={formData.classNumber} onChange={handleChange} className={`w-full px-3 py-1 rounded-lg border text-sm ${isDarkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-gray-300 text-gray-900'} placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500`} placeholder="예: 2반" />
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>학교명</label>
                <input type="text" name="schoolName" value={formData.schoolName} onChange={handleChange} className={`w-full px-3 py-1 rounded-lg border text-sm ${isDarkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-gray-300 text-gray-900'} placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500`} placeholder="학교 이름" />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>학과 / 부서</label>
                <input type="text" name="department" value={formData.department} onChange={handleChange} className={`w-full px-3 py-1 rounded-lg border text-sm ${isDarkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-gray-300 text-gray-900'} placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500`} placeholder="예: 컴퓨터공학과 / 수학과" />
              </div>
            </>
          )}

          {/* Step 4: 비밀번호 */}
          {step === 4 && (
            <>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>비밀번호</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className={`w-full px-3 py-1 rounded-lg border text-sm ${
                    errors.password ? (isDarkMode ? 'bg-zinc-800 border-red-500 text-white' : 'bg-white border-red-500 text-gray-900') : (isDarkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-gray-300 text-gray-900')
                  } placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="영문, 숫자, 특수문자 포함 8자 이상"
                />
                <div className="h-4 mt-1">
                  {errors.password && <p className={`text-xs ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>{errors.password}</p>}
                  {!errors.password && formData.password && <p className={`text-xs ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>✓ 비밀번호 형식이 올바릅니다</p>}
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>비밀번호 확인</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className={`w-full px-3 py-1 rounded-lg border text-sm ${
                    errors.confirmPassword ? (isDarkMode ? 'bg-zinc-800 border-red-500 text-white' : 'bg-white border-red-500 text-gray-900') : (isDarkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-gray-300 text-gray-900')
                  } placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="비밀번호를 다시 입력하세요"
                />
                <div className="h-4 mt-1">
                  {errors.confirmPassword && <p className={`text-xs ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>{errors.confirmPassword}</p>}
                  {!errors.confirmPassword && formData.confirmPassword && formData.password === formData.confirmPassword && <p className={`text-xs ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>✓ 비밀번호가 일치합니다</p>}
                </div>
              </div>
            </>
          )}

          {/* 이전 / 다음 / 가입 버튼 */}
          <div className="flex gap-2 pt-2">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className={`flex-1 py-2.5 rounded-lg font-medium ${isDarkMode ? 'bg-zinc-700 hover:bg-zinc-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}
              >
                이전
              </button>
            )}
            {step < TOTAL_STEPS ? (
              <button
                type="button"
                onClick={() => {
                  if (step === 1) {
                    if (!formData.fullName.trim()) { setErrors((p) => ({ ...p, fullName: '이름을 입력해주세요.' })); return; }
                    if (!validateName(formData.fullName)) { setErrors((p) => ({ ...p, fullName: '이름은 2자 이상 50자 이하여야 합니다.' })); return; }
                    if (formData.birthDate) {
                      const birthRes = validateBirthDate(formData.birthDate);
                      if (!birthRes.isValid) { setErrors((p) => ({ ...p, birthDate: birthRes.message })); return; }
                    }
                    setStep(2);
                  } else if (step === 2) {
                    if (!formData.email) { setErrors((p) => ({ ...p, email: '이메일을 입력해주세요.' })); return; }
                    if (!validateEmail(formData.email)) { setErrors((p) => ({ ...p, email: '올바른 이메일 형식이 아닙니다.' })); return; }
                    if (errors.email || emailChecked !== 'available') {
                      if (emailChecked !== 'available') setErrors((p) => ({ ...p, email: '이메일 중복 확인을 해주세요.' }));
                      return;
                    }
                    setStep(3);
                  } else if (step === 3) {
                    setStep(4);
                  }
                }}
                className={`${step === 1 ? 'w-full' : 'flex-1'} py-2.5 rounded-lg font-medium bg-emerald-600 hover:bg-emerald-700 text-white`}
              >
                다음
              </button>
            ) : (
              <button
                type="submit"
                disabled={isLoading}
                className={`flex-1 py-2.5 rounded-lg font-medium ${isLoading ? (isDarkMode ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-gray-300 text-gray-500 cursor-not-allowed') : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'}`}
              >
                {isLoading ? '가입 중...' : '회원가입'}
              </button>
            )}
          </div>
        </form>

        <div className={`mt-6 text-center text-sm ${
          isDarkMode ? 'text-gray-400' : 'text-gray-600'
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

