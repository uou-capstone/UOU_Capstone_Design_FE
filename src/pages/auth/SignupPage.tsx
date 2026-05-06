import React, { useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { userApi } from '@/services/api';

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
  const [emailAvailableMessage, setEmailAvailableMessage] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const TOTAL_STEPS = 4;
  const [birthParts, setBirthParts] = useState<{ year: string; month: string; day: string }>({
    year: '',
    month: '',
    day: '',
  });

  const birthYearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years: string[] = [];
    for (let y = currentYear; y >= 1900; y -= 1) years.push(String(y));
    return years;
  }, []);

  const birthMonthOptions = useMemo(
    () => Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')),
    [],
  );

  const birthDayOptions = useMemo(() => {
    if (!birthParts.year || !birthParts.month) return [];
    const y = Number(birthParts.year);
    const m = Number(birthParts.month);
    if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) return [];
    const daysInMonth = new Date(y, m, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => String(i + 1).padStart(2, '0'));
  }, [birthParts.year, birthParts.month]);

  const setBirthPart = (part: 'year' | 'month' | 'day', value: string) => {
    setBirthParts((prev) => {
      const next = { ...prev, [part]: value };
      const iso =
        next.year && next.month && next.day ? `${next.year}-${next.month}-${next.day}` : '';

      setFormData((fdPrev) => ({ ...fdPrev, birthDate: iso }));

      const newErrors = { ...errors };
      if (!iso) {
        delete newErrors.birthDate;
      } else {
        const res = validateBirthDate(iso);
        if (!res.isValid) newErrors.birthDate = res.message;
        else delete newErrors.birthDate;
      }
      setErrors(newErrors);

      // year/month 변경으로 day가 유효하지 않게 되면 day 초기화
      if (part === 'year' || part === 'month') {
        if (next.day) {
          const y = Number(next.year);
          const m = Number(next.month);
          if (Number.isFinite(y) && Number.isFinite(m) && m >= 1 && m <= 12) {
            const daysInMonth = new Date(y, m, 0).getDate();
            const dayNum = Number(next.day);
            if (!Number.isFinite(dayNum) || dayNum < 1 || dayNum > daysInMonth) {
              return { ...next, day: '' };
            }
          } else {
            return { ...next, day: '' };
          }
        }
      }

      return next;
    });
  };

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

  // 전화번호 검증 (필수 입력 + 형식 검증)
  const validatePhoneNumber = (phone: string): boolean => {
    const phoneRegex = /^01[0-9]-?\d{3,4}-?\d{4}$/;
    return phoneRegex.test(phone.trim());
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
      setEmailAvailableMessage(null);
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

    if (name === 'phoneNumber' && !value.trim()) {
      newErrors.phoneNumber = '전화번호를 입력해주세요.';
    } else if (name === 'phoneNumber' && !validatePhoneNumber(value)) {
      newErrors.phoneNumber = '전화번호 형식이 올바르지 않습니다.';
    } else if (name === 'phoneNumber') {
      delete newErrors.phoneNumber;
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

    // 전화번호 검증
    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = '전화번호를 입력해주세요.';
    } else if (!validatePhoneNumber(formData.phoneNumber)) {
      newErrors.phoneNumber = '전화번호 형식이 올바르지 않습니다.';
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
    <div className={`min-h-screen flex items-center justify-center transition-colors px-4 py-6 sm:py-8 ${
      isDarkMode ? 'bg-[#141414]' : 'bg-gray-100'
    }`}>
      <div className={`w-full max-w-md max-h-[calc(100vh-3rem)] overflow-y-auto p-6 sm:p-8 rounded-lg shadow-lg ${
        isDarkMode ? 'bg-zinc-800' : 'bg-white'
      }`}>
        <div className="text-center mb-3">
          <h1 className={`text-2xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-2 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            회원가입
          </h1>
          <p className={`text-xs sm:text-sm md:text-base lg:text-lg ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            AI Tutor LMS 계정을 만들어보세요
          </p>
        </div>

        {/* 진행 상태 표시 (로그인 서버 상태 영역 구조와 동일) */}
        <div className={`mb-3 text-xs sm:text-sm md:text-base ${
          isDarkMode ? 'text-gray-400' : 'text-gray-600'
        }`}>
          <div className="flex items-center min-h-8">
            <span className="flex-1 flex items-center justify-center gap-1.5 px-1 sm:px-2 py-0.5 sm:py-1">
              {[1, 2, 3, 4].map((s) => (
                <span
                  key={s}
                  className={`w-8 h-1 rounded-full ${
                    s <= step ? 'bg-[#ff824d]' : (isDarkMode ? 'bg-zinc-600' : 'bg-gray-200')
                  }`}
                  aria-hidden
                />
              ))}
            </span>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 md:space-y-6">
            {/* Step 1: 이름, 생년월일 */}
            {step === 1 && (
              <>
                <div>
                  <div className="flex items-end justify-between gap-2 mb-2">
                    <label className={`block text-xs sm:text-sm md:text-base font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>이름</label>
                    {(errors.fullName || error) && (
                      <span className={`max-w-[65%] text-right text-xs ${isDarkMode ? 'text-red-300' : 'text-red-600'}`}>
                        <span className="line-clamp-1">{errors.fullName || error}</span>
                      </span>
                    )}
                  </div>
                    <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                    className={`w-full max-w-96 px-3 py-2 text-sm rounded-lg border ${
                      errors.fullName ? (isDarkMode ? 'bg-zinc-800 border-red-500 text-white' : 'bg-white border-red-500 text-gray-900') : (isDarkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-gray-300 text-gray-900')
                    } placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff824d]/60 focus:border-[#ff824d]`}
                    placeholder="홍길동"
                  />
                  </div>
                  
                <div>
                  <div className="flex items-end justify-between gap-2 mb-2">
                    <label className={`block text-xs sm:text-sm md:text-base font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>생년월일</label>
                    {errors.birthDate && (
                      <span className={`max-w-[65%] text-right text-xs ${isDarkMode ? 'text-red-300' : 'text-red-600'}`}>
                        <span className="line-clamp-1">{errors.birthDate}</span>
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <select
                      name="birthYear"
                      value={birthParts.year}
                      onChange={(e) => setBirthPart('year', e.target.value)}
                      className={`w-full px-3 py-2 text-sm leading-5 rounded-lg border ${
                        errors.birthDate
                          ? (isDarkMode ? 'bg-zinc-800 border-red-500 text-white' : 'bg-white border-red-500 text-gray-900')
                          : (isDarkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-gray-300 text-gray-900')
                      } focus:outline-none focus:ring-2 focus:ring-[#ff824d]/60 focus:border-[#ff824d]`}
                    >
                      <option value="">년</option>
                      {birthYearOptions.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                    <select
                      name="birthMonth"
                      value={birthParts.month}
                      onChange={(e) => setBirthPart('month', e.target.value)}
                      disabled={!birthParts.year}
                      className={`w-full px-3 py-2 text-sm leading-5 rounded-lg border ${
                        errors.birthDate
                          ? (isDarkMode ? 'bg-zinc-800 border-red-500 text-white' : 'bg-white border-red-500 text-gray-900')
                          : (isDarkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-gray-300 text-gray-900')
                      } ${!birthParts.year ? 'opacity-60 cursor-not-allowed' : ''} focus:outline-none focus:ring-2 focus:ring-[#ff824d]/60 focus:border-[#ff824d]`}
                    >
                      <option value="">월</option>
                      {birthMonthOptions.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                    <select
                      name="birthDay"
                      value={birthParts.day}
                      onChange={(e) => setBirthPart('day', e.target.value)}
                      disabled={!birthParts.year || !birthParts.month}
                      className={`w-full px-3 py-2 text-sm leading-5 rounded-lg border ${
                        errors.birthDate
                          ? (isDarkMode ? 'bg-zinc-800 border-red-500 text-white' : 'bg-white border-red-500 text-gray-900')
                          : (isDarkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-gray-300 text-gray-900')
                      } ${!birthParts.year || !birthParts.month ? 'opacity-60 cursor-not-allowed' : ''} focus:outline-none focus:ring-2 focus:ring-[#ff824d]/60 focus:border-[#ff824d]`}
                    >
                      <option value="">일</option>
                      {birthDayOptions.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                  <input type="hidden" name="birthDate" value={formData.birthDate} readOnly />
                </div>
              </>
            )}

            {/* Step 2: 전화번호, 이메일 */}
            {step === 2 && (
              <>
                <div>
                  <div className="flex items-end justify-between gap-2 mb-2">
                    <label className={`block text-xs sm:text-sm md:text-base font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>전화번호</label>
                    {(errors.phoneNumber || error) && (
                      <span className={`max-w-[65%] text-right text-xs ${isDarkMode ? 'text-red-300' : 'text-red-600'}`}>
                        <span className="line-clamp-1">{errors.phoneNumber || error}</span>
                      </span>
                    )}
                  </div>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  className={`w-full max-w-96 px-3 py-2 text-sm rounded-lg border ${isDarkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-gray-300 text-gray-900'} placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff824d]/60 focus:border-[#ff824d]`}
                  placeholder="010-1234-5678"
                />
              </div>
              <div>
                <div className="flex items-end justify-between gap-2 mb-2">
                  <label className={`block text-xs sm:text-sm md:text-base font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>이메일</label>
                  {errors.email ? (
                    <span className={`max-w-[65%] text-right text-xs ${isDarkMode ? 'text-red-300' : 'text-red-600'}`}>
                      <span className="line-clamp-1">{errors.email}</span>
                    </span>
                  ) : emailChecked === 'available' ? (
                    <span className={`max-w-[65%] text-right text-xs ${isDarkMode ? 'text-emerald-300' : 'text-emerald-600'}`}>
                      <span className="line-clamp-1">{emailAvailableMessage || '사용 가능한 이메일입니다.'}</span>
                    </span>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className={`w-full max-w-96 px-3 py-2 text-sm rounded-lg border ${
                      errors.email ? (isDarkMode ? 'bg-zinc-800 border-red-500 text-white' : 'bg-white border-red-500 text-gray-900') : (isDarkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-gray-300 text-gray-900')
                    } placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff824d]/60 focus:border-[#ff824d]`}
                    placeholder="example@email.com"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      if (!formData.email) { setErrors((p) => ({ ...p, email: '이메일을 입력해주세요.' })); return; }
                      if (!validateEmail(formData.email)) { setErrors((p) => ({ ...p, email: '올바른 이메일 형식이 아닙니다.' })); return; }
                      setIsCheckingEmail(true);
                      try {
                        const res = await userApi.checkEmail(formData.email);
                        if (res.available) {
                          setEmailChecked('available');
                          setEmailAvailableMessage(res.message || '사용 가능한 이메일입니다.');
                          // 이메일 관련 에러 제거
                          setErrors((p) => {
                            const { email, ...rest } = p;
                            return rest;
                          });
                        } else {
                          setEmailChecked('unavailable');
                          setEmailAvailableMessage(null);
                          setErrors((p) => ({ ...p, email: res.message || '이미 사용 중인 이메일입니다.' }));
                        }
                      } catch (err) {
                        const msg = err instanceof Error ? err.message : '이메일 중복 확인에 실패했습니다.';
                        setEmailChecked(null);
                        setEmailAvailableMessage(null);
                        setErrors((p) => ({ ...p, email: msg }));
                      } finally {
                        setIsCheckingEmail(false);
                      }
                    }}
                    disabled={isCheckingEmail}
                    className={`shrink-0 px-3 py-2 text-sm rounded-lg font-medium whitespace-nowrap ${isCheckingEmail ? (isDarkMode ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-500 cursor-not-allowed') : (isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-white cursor-pointer' : 'bg-gray-100 hover:bg-gray-200 text-gray-800 cursor-pointer')}`}
                  >
                    {isCheckingEmail ? '확인 중...' : '중복 확인'}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Step 3: 역할, 학교 정보 */}
          {step === 3 && (
            <>
              <div className="flex gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-end justify-between gap-2 mb-2">
                    <label className={`block text-xs sm:text-sm md:text-base font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>역할</label>
                    {error && (
                      <span className={`max-w-[65%] text-right text-xs ${isDarkMode ? 'text-red-300' : 'text-red-600'}`}>
                        <span className="line-clamp-1">{error}</span>
                      </span>
                    )}
                  </div>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className={`w-full max-w-96 px-3 py-2 text-sm rounded-lg border ${isDarkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:outline-none focus:ring-2 focus:ring-[#ff824d]/60 focus:border-[#ff824d]`}
                  >
                    <option value="STUDENT">학생</option>
                    <option value="TEACHER">선생님</option>
                  </select>
                </div>

                <div className="flex-1 min-w-0">
                  <label className={`block text-xs sm:text-sm md:text-base font-medium mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>학교명</label>
                  <input
                    type="text"
                    name="schoolName"
                    value={formData.schoolName}
                    onChange={handleChange}
                    className={`w-full max-w-96 px-3 py-2 text-sm rounded-lg border ${isDarkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-gray-300 text-gray-900'} placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff824d]/60 focus:border-[#ff824d]`}
                    placeholder="학교 이름"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-1 min-w-0">
                  <label className={`block text-xs sm:text-sm md:text-base font-medium mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>학과 / 부서</label>
                  <input
                    type="text"
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    className={`w-full max-w-96 px-3 py-2 text-sm rounded-lg border ${isDarkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-gray-300 text-gray-900'} placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff824d]/60 focus:border-[#ff824d]`}
                    placeholder="예: 컴퓨터공학과 / 수학과"
                  />
                </div>

                <div className="flex-none min-w-0">
                  <label className={`block text-xs sm:text-sm md:text-base font-medium mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>학년</label>
                  <input
                    type="text"
                    name="grade"
                    value={formData.grade}
                    onChange={handleChange}
                    className={`w-20 max-w-full px-3 py-2 text-sm rounded-lg border ${isDarkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-gray-300 text-gray-900'} placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff824d]/60 focus:border-[#ff824d]`}
                    placeholder="예: 3"
                  />
                </div>

                <div className="flex-none min-w-0">
                  <label className={`block text-xs sm:text-sm md:text-base font-medium mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>반</label>
                  <input
                    type="text"
                    name="classNumber"
                    value={formData.classNumber}
                    onChange={handleChange}
                    className={`w-20 max-w-full px-3 py-2 text-sm rounded-lg border ${isDarkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-gray-300 text-gray-900'} placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff824d]/60 focus:border-[#ff824d]`}
                    placeholder="예: 2"
                  />
                </div>
              </div>
            </>
          )}

          {/* Step 4: 비밀번호 */}
          {step === 4 && (
            <>
              <div>
                <div className="flex items-end justify-between gap-2 mb-2">
                  <label className={`block text-xs sm:text-sm md:text-base font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>비밀번호</label>
                  {(errors.password || error) && (
                    <span className={`max-w-[65%] text-right text-xs ${isDarkMode ? 'text-red-300' : 'text-red-600'}`}>
                      <span className="line-clamp-1">{errors.password || error}</span>
                    </span>
                  )}
                </div>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className={`w-full max-w-96 px-3 py-2 text-sm rounded-lg border ${
                    errors.password ? (isDarkMode ? 'bg-zinc-800 border-red-500 text-white' : 'bg-white border-red-500 text-gray-900') : (isDarkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-gray-300 text-gray-900')
                  } placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff824d]/60 focus:border-[#ff824d]`}
                  placeholder="영문, 숫자, 특수문자 포함 8자 이상"
                />
              </div>
              <div>
                <div className="flex items-end justify-between gap-2 mb-2">
                  <label className={`block text-xs sm:text-sm md:text-base font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>비밀번호 확인</label>
                  {errors.confirmPassword && (
                    <span className={`max-w-[65%] text-right text-xs ${isDarkMode ? 'text-red-300' : 'text-red-600'}`}>
                      <span className="line-clamp-1">{errors.confirmPassword}</span>
                    </span>
                  )}
                </div>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className={`w-full max-w-96 px-3 py-2 text-sm rounded-lg border ${
                    errors.confirmPassword ? (isDarkMode ? 'bg-zinc-800 border-red-500 text-white' : 'bg-white border-red-500 text-gray-900') : (isDarkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-gray-300 text-gray-900')
                  } placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff824d]/60 focus:border-[#ff824d]`}
                  placeholder="비밀번호를 다시 입력하세요"
                />
              </div>
              </>
            )}

          {/* 이전 / 다음 / 가입 버튼 (항상 같은 위치) */}
          <div className="flex w-full max-w-96 gap-2">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className={`flex-1 py-3 rounded-lg font-medium text-sm transition-colors ${
                  isDarkMode ? 'bg-zinc-700 hover:bg-zinc-600 text-white cursor-pointer' : 'bg-gray-200 hover:bg-gray-300 text-gray-800 cursor-pointer'
                }`}
              >
                이전
              </button>
            )}
            {step < TOTAL_STEPS ? (
              <button
                type="button"
                onClick={() => {
                  if (step === 1) {
                    const stepErrors: Record<string, string> = {};
                    if (!formData.fullName.trim()) {
                      stepErrors.fullName = '이름을 입력해주세요.';
                    } else if (!validateName(formData.fullName)) {
                      stepErrors.fullName = '이름은 2자 이상 50자 이하여야 합니다.';
                    }
                    if (!birthParts.year || !birthParts.month || !birthParts.day) {
                      stepErrors.birthDate = '생년월일을 선택해주세요.';
                    } else {
                      const birthRes = validateBirthDate(formData.birthDate);
                      if (!birthRes.isValid) stepErrors.birthDate = birthRes.message;
                    }
                    if (Object.keys(stepErrors).length > 0) {
                      setErrors((p) => ({ ...p, ...stepErrors }));
                      return;
                    }
                    setStep(2);
                  } else if (step === 2) {
                    const stepErrors: Record<string, string> = {};
                    if (!formData.phoneNumber.trim()) {
                      stepErrors.phoneNumber = '전화번호를 입력해주세요.';
                    } else if (!validatePhoneNumber(formData.phoneNumber)) {
                      stepErrors.phoneNumber = '전화번호 형식이 올바르지 않습니다.';
                    }
                    if (!formData.email) {
                      stepErrors.email = '이메일을 입력해주세요.';
                    } else if (!validateEmail(formData.email)) {
                      stepErrors.email = '올바른 이메일 형식이 아닙니다.';
                    }

                    // 입력/형식 오류가 있으면 먼저 표시
                    if (Object.keys(stepErrors).length > 0) {
                      setErrors((p) => ({ ...p, ...stepErrors }));
                      return;
                    }

                    // 중복확인 통과면(available) stale 에러가 있어도 무시하고 진행
                    if (emailChecked === 'available') {
                      if (errors.email) {
                        setErrors((p) => {
                          const { email, ...rest } = p;
                          return rest;
                        });
                      }
                      setStep(3);
                      return;
                    }

                    // 중복확인 결과(또는 서버 에러)가 이미 있으면 덮어쓰지 않음
                    if (errors.email) {
                      setErrors((p) => ({ ...p, ...stepErrors }));
                      return;
                    }

                    setErrors((p) => ({ ...p, email: '이메일 중복 확인을 해주세요.' }));
                    return;
                  } else if (step === 3) {
                    setStep(4);
                  }
                }}
                className={`${step === 1 ? 'w-full' : 'flex-1'} py-3 rounded-lg font-medium text-sm transition-colors bg-[#ff824d] hover:bg-[#ff6b33] text-white cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff824d]/60`}
              >
                다음
              </button>
            ) : (
              <button
                type="submit"
                disabled={isLoading}
                className={`flex-1 py-3 rounded-lg font-medium text-sm transition-colors ${
                  isLoading
                    ? (isDarkMode ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-gray-300 text-gray-500 cursor-not-allowed')
                    : 'bg-[#ff824d] hover:bg-[#ff6b33] text-white cursor-pointer'
                } focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff824d]/60`}
              >
                {isLoading ? '가입 중...' : '회원가입'}
              </button>
            )}
          </div>
        </form>

        <div className={`mt-4 sm:mt-6 text-center text-xs sm:text-sm md:text-base ${
          isDarkMode ? 'text-gray-400' : 'text-gray-600'
        }`}>
          계정이 있으신가요?{' '}
          <Link
            to="/login"
            className="font-medium hover:underline text-[#ff824d]"
          >
            로그인
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;

