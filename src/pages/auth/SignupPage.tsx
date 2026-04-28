import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
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
  const [step, setStep] = useState(1);
  const TOTAL_STEPS = 4;
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [fixedCardHeight, setFixedCardHeight] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (fixedCardHeight != null) return;
    // 1단계 높이를 기준으로 전체 컨테이너 크기 고정
    if (step !== 1) return;
    if (!cardRef.current) return;
    const h = Math.ceil(cardRef.current.getBoundingClientRect().height);
    if (h > 0) setFixedCardHeight(h);
  }, [fixedCardHeight, step]);

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
      isDarkMode ? 'bg-[#141414]' : 'bg-gray-100'
    }`}>
      <div
        ref={cardRef}
        style={fixedCardHeight != null ? { height: fixedCardHeight } : undefined}
        className={`relative w-full max-w-md overflow-hidden p-5 sm:p-6 rounded-lg shadow-lg flex flex-col ${
          isDarkMode ? 'bg-zinc-800' : 'bg-white'
        }`}
      >
        <div className="text-center mb-1">
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

        {error && (
          <div
            className={`absolute left-4 right-4 top-3 z-10 rounded-lg p-3 text-xs sm:text-sm md:text-base shadow-lg ${
              isDarkMode ? 'bg-red-900/30 text-red-300' : 'bg-red-50 text-red-600'
            }`}
          >
            <div className="line-clamp-2">{error}</div>
          </div>
        )}

        {/* 단계 표시 */}
        <div className="flex justify-center gap-2 mb-4">
          {[1, 2, 3, 4].map((s) => (
            <span
              key={s}
              className={`w-8 h-1 rounded-full ${
                s <= step ? 'bg-[#ff824d]' : (isDarkMode ? 'bg-zinc-600' : 'bg-gray-200')
              }`}
              aria-hidden
            />
          ))}
        </div>
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 min-h-0 space-y-1">
            {/* Step 1: 이름, 생년월일 */}
            {step === 1 && (
              <>
                <div>
                  <label className={`block text-xs sm:text-sm md:text-base font-medium mb-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>이름</label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                    className={`w-full px-3 py-2 text-sm rounded-lg border ${
                      errors.fullName ? (isDarkMode ? 'bg-zinc-800 border-red-500 text-white' : 'bg-white border-red-500 text-gray-900') : (isDarkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-gray-300 text-gray-900')
                    } placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff824d]/60 focus:border-[#ff824d]`}
                    placeholder="홍길동"
                  />
                  <p
                    className={`mt-1 text-xs h-5 overflow-hidden ${errors.fullName ? '' : 'invisible'} ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}
                  >
                    <span className="line-clamp-1">{errors.fullName || 'placeholder'}</span>
                  </p>
                </div>
                <div>
                  <label className={`block text-xs sm:text-sm md:text-base font-medium mb-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>생년월일</label>
                  <div className="grid grid-cols-3 gap-2">
                    <select
                      name="birthYear"
                      value={birthParts.year}
                      onChange={(e) => setBirthPart('year', e.target.value)}
                      className={`w-full px-3 py-1.5 text-sm rounded-lg border ${
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
                      className={`w-full px-3 py-1.5 text-sm rounded-lg border ${
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
                      className={`w-full px-3 py-1.5 text-sm rounded-lg border ${
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
                  <p
                    className={`mt-1 text-xs h-5 overflow-hidden ${(formData.birthDate && formData.birthDate > todayIso) || errors.birthDate ? '' : 'invisible'} ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}
                  >
                    <span className="line-clamp-1">
                      {(formData.birthDate && formData.birthDate > todayIso)
                        ? '생년월일은 오늘 이전이어야 합니다.'
                        : (errors.birthDate || 'placeholder')}
                    </span>
                  </p>
                </div>
              </>
            )}

            {/* Step 2: 전화번호, 이메일 */}
            {step === 2 && (
              <>
                <div>
                  <label className={`block text-xs sm:text-sm md:text-base font-medium mb-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>전화번호</label>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  className={`w-full h-10 px-3 text-sm rounded-lg border ${isDarkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-gray-300 text-gray-900'} placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff824d]/60 focus:border-[#ff824d]`}
                  placeholder="010-1234-5678"
                />
                <p className="text-xs h-5 overflow-hidden invisible">
                  <span className="line-clamp-1">placeholder</span>
                </p>
              </div>
              <div>
                <label className={`block text-xs sm:text-sm md:text-base font-medium mb-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>이메일 (로그인 아이디)</label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className={`flex-1 w-full h-10 px-3 text-sm rounded-lg border ${
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
                        await userApi.checkEmail(formData.email);
                        setEmailChecked('available');
                        setErrors((p) => { const { email, ...rest } = p; return rest; });
                      } catch (err) {
                        const msg = err instanceof Error ? err.message : '이메일 중복 확인에 실패했습니다.';
                        // "인증되지 않은 사용자" = 로그인 요구(401), 이메일 중복이 아님
                        if (msg.includes('인증되지 않은') || msg.includes('인증') && msg.includes('사용자') || msg.includes('401') || msg.includes('로그인')) {
                          setEmailChecked(null);
                          setErrors((p) => ({ ...p, email: '서버에서 로그인을 요구해 확인할 수 없습니다.' }));
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
                    className={`shrink-0 h-10 px-3 text-xs rounded-lg font-medium whitespace-nowrap ${isCheckingEmail ? (isDarkMode ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-500 cursor-not-allowed') : (isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-white cursor-pointer' : 'bg-gray-100 hover:bg-gray-200 text-gray-800 cursor-pointer')}`}
                  >
                    {isCheckingEmail ? '확인 중...' : '중복 확인'}
                  </button>
                </div>
                <p
                  className={`text-xs h-5 overflow-hidden ${errors.email || emailChecked === 'available' ? '' : 'invisible'} ${
                    errors.email
                      ? (isDarkMode ? 'text-red-400' : 'text-red-600')
                      : (isDarkMode ? 'text-green-400' : 'text-green-600')
                  }`}
                >
                  <span className="line-clamp-1">
                    {errors.email
                      ? errors.email
                      : emailChecked === 'available'
                        ? '✓ 사용 가능한 이메일입니다'
                        : 'placeholder'}
                  </span>
                </p>
              </div>
            </>
          )}

          {/* Step 3: 역할, 학교 정보 */}
          {step === 3 && (
            <>
              <div>
                <label className={`block text-xs sm:text-sm md:text-base font-medium mb-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>역할</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 text-sm rounded-lg border ${isDarkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:outline-none focus:ring-2 focus:ring-[#ff824d]/60 focus:border-[#ff824d]`}
                >
                  <option value="STUDENT">학생</option>
                  <option value="TEACHER">선생님</option>
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs sm:text-sm md:text-base font-medium mb-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>학년</label>
                  <input type="text" name="grade" value={formData.grade} onChange={handleChange} className={`w-full px-3 py-2 text-sm rounded-lg border ${isDarkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-gray-300 text-gray-900'} placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff824d]/60 focus:border-[#ff824d]`} placeholder="예: 3학년" />
                </div>
                <div>
                  <label className={`block text-xs sm:text-sm md:text-base font-medium mb-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>반</label>
                  <input type="text" name="classNumber" value={formData.classNumber} onChange={handleChange} className={`w-full px-3 py-2 text-sm rounded-lg border ${isDarkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-gray-300 text-gray-900'} placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff824d]/60 focus:border-[#ff824d]`} placeholder="예: 2반" />
                </div>
              </div>
              <div>
                <label className={`block text-xs sm:text-sm md:text-base font-medium mb-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>학교명</label>
                <input type="text" name="schoolName" value={formData.schoolName} onChange={handleChange} className={`w-full px-3 py-2 text-sm rounded-lg border ${isDarkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-gray-300 text-gray-900'} placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff824d]/60 focus:border-[#ff824d]`} placeholder="학교 이름" />
              </div>
              <div>
                <label className={`block text-xs sm:text-sm md:text-base font-medium mb-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>학과 / 부서</label>
                <input type="text" name="department" value={formData.department} onChange={handleChange} className={`w-full px-3 py-2 text-sm rounded-lg border ${isDarkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-gray-300 text-gray-900'} placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff824d]/60 focus:border-[#ff824d]`} placeholder="예: 컴퓨터공학과 / 수학과" />
              </div>
            </>
          )}

          {/* Step 4: 비밀번호 */}
          {step === 4 && (
            <>
              <div>
                <label className={`block text-xs sm:text-sm md:text-base font-medium mb-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>비밀번호</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className={`w-full px-3 py-2 text-sm rounded-lg border ${
                    errors.password ? (isDarkMode ? 'bg-zinc-800 border-red-500 text-white' : 'bg-white border-red-500 text-gray-900') : (isDarkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-gray-300 text-gray-900')
                  } placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff824d]/60 focus:border-[#ff824d]`}
                  placeholder="영문, 숫자, 특수문자 포함 8자 이상"
                />
                <p
                  className={`mt-1 text-xs h-5 overflow-hidden ${errors.password || formData.password ? '' : 'invisible'} ${
                    errors.password
                      ? (isDarkMode ? 'text-red-400' : 'text-red-600')
                      : (isDarkMode ? 'text-green-400' : 'text-green-600')
                  }`}
                >
                  <span className="line-clamp-1">
                    {errors.password
                      ? errors.password
                      : formData.password
                        ? '✓ 비밀번호 형식이 올바릅니다'
                        : 'placeholder'}
                  </span>
                </p>
              </div>
              <div>
                <label className={`block text-xs sm:text-sm md:text-base font-medium mb-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>비밀번호 확인</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className={`w-full px-3 py-2 text-sm rounded-lg border ${
                    errors.confirmPassword ? (isDarkMode ? 'bg-zinc-800 border-red-500 text-white' : 'bg-white border-red-500 text-gray-900') : (isDarkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-gray-300 text-gray-900')
                  } placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff824d]/60 focus:border-[#ff824d]`}
                  placeholder="비밀번호를 다시 입력하세요"
                />
                <p
                  className={`mt-1 text-xs h-5 overflow-hidden ${
                    errors.confirmPassword ||
                    (formData.confirmPassword && formData.password === formData.confirmPassword)
                      ? ''
                      : 'invisible'
                  } ${
                    errors.confirmPassword
                      ? (isDarkMode ? 'text-red-400' : 'text-red-600')
                      : (isDarkMode ? 'text-green-400' : 'text-green-600')
                  }`}
                >
                  <span className="line-clamp-1">
                    {errors.confirmPassword
                      ? errors.confirmPassword
                      : (formData.confirmPassword && formData.password === formData.confirmPassword)
                        ? '✓ 비밀번호가 일치합니다'
                        : 'placeholder'}
                  </span>
                </p>
              </div>
              </>
            )}

          </div>

          {/* 이전 / 다음 / 가입 버튼 (항상 같은 위치) */}
          <div className="flex gap-2 pt-0.5 mt-auto">
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
                    if (!formData.fullName.trim()) { setErrors((p) => ({ ...p, fullName: '이름을 입력해주세요.' })); return; }
                    if (!validateName(formData.fullName)) { setErrors((p) => ({ ...p, fullName: '이름은 2자 이상 50자 이하여야 합니다.' })); return; }
                    if (!birthParts.year || !birthParts.month || !birthParts.day) {
                      setErrors((p) => ({ ...p, birthDate: '생년월일을 선택해주세요.' }));
                      return;
                    }
                    const birthRes = validateBirthDate(formData.birthDate);
                    if (!birthRes.isValid) { setErrors((p) => ({ ...p, birthDate: birthRes.message })); return; }
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
          이미 계정이 있으신가요?{' '}
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

