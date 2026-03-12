import React, { useState, useRef, useEffect } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import { monitoringApi, authApi, userApi } from "../../services/api";
import { useNavigate } from "react-router-dom";

const SettingsPage: React.FC = () => {
  const { isDarkMode } = useTheme();
  const { user, refreshUser, logout } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [email, setEmail] = useState(user?.email || "");
  const [nickname, setNickname] = useState(user?.fullName || "");
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || "");
  const [birthDate, setBirthDate] = useState(user?.birthDate || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [profileImage, setProfileImage] = useState<string | null>(user?.profileImageUrl || null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshingToken, setIsRefreshingToken] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMonitoringLoading, setIsMonitoringLoading] = useState(false);
  const [monitoringError, setMonitoringError] = useState<string | null>(null);
  const [overview, setOverview] = useState<any | null>(null);
  const [rateLimit, setRateLimit] = useState<any | null>(null);
  const [cacheStats, setCacheStats] = useState<any | null>(null);
  const [agentStats, setAgentStats] = useState<any | null>(null);

  // 사용자 정보가 변경되면 폼 업데이트
  useEffect(() => {
    if (user) {
      setEmail(user.email || "");
      setNickname(user.fullName || "");
      setPhoneNumber(user.phoneNumber || "");
      setBirthDate(user.birthDate || "");
      setProfileImage(user.profileImageUrl || null);
    }
  }, [user]);

  const loadMonitoring = async () => {
    if (!user || user.role !== "TEACHER") return;
    setIsMonitoringLoading(true);
    setMonitoringError(null);
    try {
      const [overviewRes, rateRes, cacheRes, agentRes] = await Promise.all([
        monitoringApi.getOverview(),
        monitoringApi.getRateLimit(),
        monitoringApi.getCache(),
        monitoringApi.getAgents(),
      ]);
      setOverview(overviewRes);
      setRateLimit(rateRes);
      setCacheStats(cacheRes);
      setAgentStats(agentRes);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "모니터링 정보를 불러오지 못했습니다.";
      setMonitoringError(msg);
    } finally {
      setIsMonitoringLoading(false);
    }
  };

  useEffect(() => {
    // 선생님 계정에서만 자동 로드
    if (user?.role === "TEACHER") {
      void loadMonitoring();
    }
  }, [user]);

  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 이미지 미리보기
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await userApi.updateProfile({
        fullName: nickname,
        phoneNumber: phoneNumber || undefined,
        birthDate: birthDate || undefined,
      });
      await refreshUser();
      window.alert("프로필이 업데이트되었습니다.");
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "프로필 업데이트에 실패했습니다.";
      window.alert(errorMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      window.alert("새 비밀번호가 일치하지 않습니다.");
      return;
    }

    if (newPassword.length < 8) {
      window.alert("비밀번호는 최소 8자 이상이어야 합니다.");
      return;
    }

    setIsSaving(true);
    try {
      await userApi.changePassword({
        currentPassword,
        newPassword,
        confirmNewPassword: confirmPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      window.alert("비밀번호가 변경되었습니다.");
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "비밀번호 변경에 실패했습니다.";
      window.alert(errorMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRefreshToken = async () => {
    setIsRefreshingToken(true);
    try {
      await authApi.refresh();
      window.alert("토큰이 갱신되었습니다.");
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "토큰 갱신에 실패했습니다. 다시 로그인해주세요.";
      window.alert(errorMsg);
    } finally {
      setIsRefreshingToken(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5 h-full">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-1.5">
        {/* 프로필 정보 */}
        <section
          className={`p-6 rounded-xl shadow-sm ${
            isDarkMode ? "bg-zinc-800" : "bg-white"
          }`}
        >
          <h2 className={`text-base font-semibold mb-4 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
            프로필 정보
          </h2>
          <div className="space-y-4">
              {/* 프로필 사진 */}
              <div className="flex flex-col items-center gap-3 w-full">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="relative group focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded-full cursor-pointer"
                >
                  {profileImage ? (
                    <img
                      src={profileImage}
                      alt="Profile"
                      className="w-16 h-16 rounded-full object-cover transition-opacity group-hover:opacity-80"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%23e5e7eb'/%3E%3Ctext x='50' y='60' text-anchor='middle' font-size='40' fill='%239ca3af'%3E%3F%3C/text%3E%3C/svg%3E";
                      }}
                    />
                  ) : (
                    <div
                      className={`w-16 h-16 rounded-full flex items-center justify-center text-white font-semibold text-lg ${
                        isDarkMode ? "bg-gray-700 hover:bg-zinc-700" : "bg-gray-500 hover:bg-zinc-200"
                      } transition-colors`}
                    >
                      {user?.fullName?.charAt(0).toUpperCase() || "?"}
                    </div>
                  )}
                  <div className={`absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white ${
                    isDarkMode ? "bg-zinc-700" : "bg-zinc-200"
                  }`}>
                    <span className="text-xs font-medium">변경</span>
                  </div>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={handleProfileImageChange}
                  className="hidden"
                />
              </div>

              {/* 개인정보 입력창 — 너비 절반 */}
              <div className="max-w-[50%] space-y-4">
              {/* 이메일 (수정 불가) */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                  이메일
                </label>
                <input
                  type="email"
                  value={email}
                  readOnly
                  className={`w-full px-4 py-2 rounded-lg border text-sm ${
                    isDarkMode
                      ? "bg-zinc-800 border-zinc-700 text-white placeholder-gray-500"
                      : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                  } focus:outline-none focus:ring-2 ${isDarkMode ? "focus:ring-zinc-500" : "focus:ring-emerald-500"}`}
                  placeholder="이메일 주소"
                />
              </div>

              {/* 이름(닉네임) */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                  이름
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className={`w-full px-4 py-2 rounded-lg border text-sm ${
                    isDarkMode
                      ? "bg-zinc-800 border-zinc-700 text-white placeholder-gray-500"
                      : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                  } focus:outline-none focus:ring-2 ${isDarkMode ? "focus:ring-zinc-500" : "focus:ring-emerald-500"}`}
                  placeholder="이름"
                />
              </div>

              {/* 전화번호 */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                  전화번호
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className={`w-full px-4 py-2 rounded-lg border text-sm ${
                    isDarkMode
                      ? "bg-zinc-800 border-zinc-700 text-white placeholder-gray-500"
                      : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                  } focus:outline-none focus:ring-2 ${isDarkMode ? "focus:ring-zinc-500" : "focus:ring-emerald-500"}`}
                  placeholder="010-1234-5678"
                />
              </div>

              {/* 생년월일 */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                  생년월일
                </label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className={`w-full px-4 py-2 rounded-lg border text-sm ${
                    isDarkMode
                      ? "bg-zinc-800 border-zinc-700 text-white placeholder-gray-500"
                      : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                  } focus:outline-none focus:ring-2 ${isDarkMode ? "focus:ring-zinc-500" : "focus:ring-emerald-500"}`}
                />
              </div>
              </div>
            </div>
        </section>

        {/* 비밀번호 변경 + 토큰 관리 */}
        <section
          className={`p-6 rounded-xl shadow-sm ${
            isDarkMode ? "bg-zinc-800" : "bg-white"
          }`}
        >
          <h2 className={`text-base font-semibold mb-3 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
            보안 설정
          </h2>
          <div className="space-y-4">
            {/* 비밀번호 변경 — 너비 절반 */}
            <div className="max-w-[50%] space-y-3">
              <h3 className={`text-sm font-medium ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                비밀번호 변경
              </h3>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDarkMode
                    ? "bg-zinc-800 border-zinc-700 text-white placeholder-gray-500"
                    : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                } focus:outline-none focus:ring-2 ${isDarkMode ? "focus:ring-zinc-500" : "focus:ring-emerald-500"}`}
                placeholder="현재 비밀번호"
              />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDarkMode
                    ? "bg-zinc-800 border-zinc-700 text-white placeholder-gray-500"
                    : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                } focus:outline-none focus:ring-2 ${isDarkMode ? "focus:ring-zinc-500" : "focus:ring-emerald-500"}`}
                placeholder="새 비밀번호"
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDarkMode
                    ? "bg-zinc-800 border-zinc-700 text-white placeholder-gray-500"
                    : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                } focus:outline-none focus:ring-2 ${isDarkMode ? "focus:ring-zinc-500" : "focus:ring-emerald-500"}`}
                placeholder="새 비밀번호 확인"
              />
              <button
                type="button"
                onClick={handleChangePassword}
                disabled={isSaving || !currentPassword || !newPassword || !confirmPassword}
                className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                  isSaving || !currentPassword || !newPassword || !confirmPassword
                    ? isDarkMode
                      ? "bg-zinc-800 text-gray-500 cursor-not-allowed"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                }`}
              >
                {isSaving ? "변경 중..." : "비밀번호 변경"}
              </button>
            </div>

            {/* 토큰 갱신 */}
            <div className="pt-4 border-t border-dashed border-gray-200 dark:border-zinc-700">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className={`text-sm font-medium ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                    토큰 갱신
                  </h3>
                  <p className="mt-1 text-xs text-gray-500">
                    액세스 토큰이 만료되기 전에 리프레시 토큰으로 새 토큰을 발급받습니다.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRefreshToken}
                  disabled={isRefreshingToken}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                    isRefreshingToken
                      ? isDarkMode
                        ? "bg-zinc-800 text-gray-500 cursor-not-allowed"
                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white"
                  }`}
                >
                  {isRefreshingToken ? "갱신 중..." : "토큰 갱신"}
                </button>
              </div>
            </div>

            {/* 회원 탈퇴 — 너비 절반 */}
            <div className="pt-4 border-t border-dashed border-gray-200 dark:border-zinc-700 max-w-[50%]">
              <div className="space-y-2">
                <h3 className={`text-sm font-medium ${isDarkMode ? "text-red-300" : "text-red-600"}`}>
                  회원 탈퇴
                </h3>
                <p className="text-xs text-gray-500">
                  계정을 삭제하면 모든 강의실 및 학습 기록이 복구 불가능하게 삭제됩니다. 계속하려면 비밀번호를 입력하세요.
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    className={`flex-1 px-4 py-2 rounded-lg border text-sm ${
                      isDarkMode
                        ? "bg-zinc-800 border-zinc-700 text-white placeholder-gray-500"
                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                    } focus:outline-none focus:ring-2 ${
                      isDarkMode ? "focus:ring-red-500" : "focus:ring-red-500"
                    }`}
                    placeholder="현재 비밀번호"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      if (!deletePassword) {
                        window.alert("비밀번호를 입력해주세요.");
                        return;
                      }
                      const confirmed = window.confirm(
                        "정말로 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
                      );
                      if (!confirmed) return;

                      setIsDeleting(true);
                      try {
                        await userApi.deleteAccount(deletePassword);
                        window.alert("회원 탈퇴가 완료되었습니다.");
                        logout();
                        navigate("/login");
                      } catch (error) {
                        const errorMsg =
                          error instanceof Error
                            ? error.message
                            : "회원 탈퇴에 실패했습니다.";
                        window.alert(errorMsg);
                      } finally {
                        setIsDeleting(false);
                      }
                    }}
                    disabled={isDeleting || !deletePassword}
                    className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer ${
                      isDeleting || !deletePassword
                        ? isDarkMode
                          ? "bg-zinc-800 text-gray-500 cursor-not-allowed"
                          : "bg-gray-200 text-gray-400 cursor-not-allowed"
                        : "bg-red-600 hover:bg-red-700 text-white"
                    }`}
                  >
                    {isDeleting ? "탈퇴 중..." : "회원 탈퇴"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* 저장 버튼 */}
      <div
        className={`rounded-xl ${
          isDarkMode ? "bg-zinc-800" : "bg-white"
        }`}
      >
        <div className="flex flex-col gap-2">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSaveProfile}
              disabled={isSaving}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                isSaving
                  ? isDarkMode
                    ? "bg-zinc-800 text-gray-500 cursor-not-allowed"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }`}
            >
              {isSaving ? "저장 중..." : "저장"}
            </button>
          </div>
        </div>
      </div>

      {/* 시스템 모니터링 (선생님 전용) */}
      {user?.role === "TEACHER" && (
        <section
          className={`p-6 rounded-xl shadow-sm ${
            isDarkMode ? "bg-zinc-800" : "bg-white"
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className={`text-base font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                시스템 모니터링
              </h2>
              <p className={`mt-1 text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                Rate Limit, 캐시, Agent 상태 등 백엔드 모니터링 정보를 확인합니다.
              </p>
            </div>
            <button
              type="button"
              onClick={loadMonitoring}
              disabled={isMonitoringLoading}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                isMonitoringLoading
                  ? isDarkMode
                    ? "bg-zinc-700 text-gray-400 cursor-not-allowed"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }`}
            >
              {isMonitoringLoading ? "새로고치는 중..." : "새로고침"}
            </button>
          </div>

          {monitoringError && (
            <div
              className={`mb-4 px-3 py-2 rounded-lg text-xs ${
                isDarkMode ? "bg-red-900/30 text-red-300" : "bg-red-50 text-red-600"
              }`}
            >
              {monitoringError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* 전체 상태 */}
            <div
              className={`p-3 rounded-lg border text-xs ${
                isDarkMode
                  ? "bg-zinc-900 border-zinc-700 text-gray-200"
                  : "bg-gray-50 border-gray-200 text-gray-800"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold">전체 상태</span>
                {overview?.status && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] ${
                      String(overview.status).toLowerCase() === "up"
                        ? isDarkMode
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-emerald-100 text-emerald-700"
                        : isDarkMode
                        ? "bg-red-500/20 text-red-300"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {String(overview.status).toUpperCase()}
                  </span>
                )}
              </div>
              <dl className="mt-1 space-y-1">
                {overview ? (
                  Object.entries(overview)
                    .filter(([key, value]) => typeof value !== "object" && key !== "status")
                    .slice(0, 5)
                    .map(([key, value]) => (
                      <div key={key} className="flex justify-between gap-2">
                        <dt className="text-[11px] text-gray-500">{key}</dt>
                        <dd className="text-[11px] font-medium text-right truncate max-w-[60%]">
                          {String(value)}
                        </dd>
                      </div>
                    ))
                ) : (
                  <p className="text-[11px] text-gray-500">데이터 없음</p>
                )}
              </dl>
            </div>

            {/* Rate Limit */}
            <div
              className={`p-3 rounded-lg border text-xs ${
                isDarkMode
                  ? "bg-zinc-900 border-zinc-700 text-gray-200"
                  : "bg-gray-50 border-gray-200 text-gray-800"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold">Rate Limit</span>
              </div>
              <dl className="mt-1 space-y-1">
                {rateLimit ? (
                  Object.entries(rateLimit)
                    .slice(0, 6)
                    .map(([key, value]) => (
                      <div key={key} className="flex justify-between gap-2">
                        <dt className="text-[11px] text-gray-500">{key}</dt>
                        <dd className="text-[11px] font-medium text-right truncate max-w-[60%]">
                          {typeof value === "object" ? JSON.stringify(value) : String(value)}
                        </dd>
                      </div>
                    ))
                ) : (
                  <p className="text-[11px] text-gray-500">데이터 없음</p>
                )}
              </dl>
            </div>

            {/* 캐시 */}
            <div
              className={`p-3 rounded-lg border text-xs ${
                isDarkMode
                  ? "bg-zinc-900 border-zinc-700 text-gray-200"
                  : "bg-gray-50 border-gray-200 text-gray-800"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold">캐시</span>
              </div>
              <dl className="mt-1 space-y-1">
                {cacheStats ? (
                  Object.entries(cacheStats)
                    .slice(0, 6)
                    .map(([key, value]) => (
                      <div key={key} className="flex justify-between gap-2">
                        <dt className="text-[11px] text-gray-500">{key}</dt>
                        <dd className="text-[11px] font-medium text-right truncate max-w-[60%]">
                          {typeof value === "object" ? JSON.stringify(value) : String(value)}
                        </dd>
                      </div>
                    ))
                ) : (
                  <p className="text-[11px] text-gray-500">데이터 없음</p>
                )}
              </dl>
            </div>

            {/* Agent */}
            <div
              className={`p-3 rounded-lg border text-xs ${
                isDarkMode
                  ? "bg-zinc-900 border-zinc-700 text-gray-200"
                  : "bg-gray-50 border-gray-200 text-gray-800"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold">Agent</span>
              </div>
              <dl className="mt-1 space-y-1">
                {agentStats ? (
                  Object.entries(agentStats)
                    .slice(0, 6)
                    .map(([key, value]) => (
                      <div key={key} className="flex justify-between gap-2">
                        <dt className="text-[11px] text-gray-500">{key}</dt>
                        <dd className="text-[11px] font-medium text-right truncate max-w-[60%]">
                          {typeof value === "object" ? JSON.stringify(value) : String(value)}
                        </dd>
                      </div>
                    ))
                ) : (
                  <p className="text-[11px] text-gray-500">데이터 없음</p>
                )}
              </dl>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default SettingsPage;
