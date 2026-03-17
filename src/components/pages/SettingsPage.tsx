import React, { useState, useRef, useEffect } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import { monitoringApi, userApi } from "../../services/api";

const SettingsPage: React.FC = () => {
  const { isDarkMode } = useTheme();
  const { user, refreshUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [nickname, setNickname] = useState(user?.fullName || "");
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || "");
  const [birthDate, setBirthDate] = useState(user?.birthDate || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileImage, setProfileImage] = useState<string | null>(user?.profileImageUrl || null);
  const [isSaving, setIsSaving] = useState(false);
  const [isMonitoringLoading, setIsMonitoringLoading] = useState(false);
  const [monitoringError, setMonitoringError] = useState<string | null>(null);
  const [overview, setOverview] = useState<any | null>(null);
  const [rateLimit, setRateLimit] = useState<any | null>(null);
  const [cacheStats, setCacheStats] = useState<any | null>(null);
  const [agentStats, setAgentStats] = useState<any | null>(null);
  const [selectedSection, setSelectedSection] = useState<"account" | "system">("account");

  // 사용자 정보가 변경되면 폼 업데이트
  useEffect(() => {
    if (user) {
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

  const [editingField, setEditingField] = useState<"name" | "phone" | "birth" | "password" | null>(null);
  const [draftName, setDraftName] = useState(nickname);
  const [draftPhoneNumber, setDraftPhoneNumber] = useState(phoneNumber);
  const [draftBirthDate, setDraftBirthDate] = useState(birthDate);

  const renderAccountSection = () => (
    <div className="flex flex-col w-full">
      {/* 프로필 */}
      <div className="flex flex-col items-start gap-4">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="relative group focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded-full cursor-pointer"
        >
          {profileImage ? (
            <img
              src={profileImage}
              alt="Profile"
              className="w-[120px] h-[120px] rounded-full object-cover transition-opacity group-hover:opacity-80"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%23e5e7eb'/%3E%3Ctext x='50' y='60' text-anchor='middle' font-size='40' fill='%239ca3af'%3E%3F%3C/text%3E%3C/svg%3E";
              }}
            />
          ) : (
            <div
              className={`w-[120px] h-[120px] rounded-full flex items-center justify-center text-white font-semibold text-3xl ${
                isDarkMode ? "bg-gray-700" : "bg-gray-500"
              }`}
            >
              {user?.fullName?.charAt(0).toUpperCase() || "?"}
            </div>
          )}
          <div
            className={`absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white ${
              isDarkMode ? "bg-zinc-700" : "bg-zinc-200"
            }`}
          >
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

      {/* 상단 사용자 정보 (이름, 이메일) - 프로필과 gap-6 */}
      <div className="flex flex-col gap-1 mt-6">
        <h1
          className={`text-2xl font-semibold ${
            isDarkMode ? "text-white" : "text-gray-900"
          }`}
        >
          {user?.fullName || nickname || "이름 없음"}
        </h1>
        <p
          style={{
            fontSize: 14,
            color: isDarkMode ? "#adadad" : "#707070",
          }}
        >
          {user?.email || ""}
        </p>
      </div>

      {/* 개인 정보 - 이메일과 gap-12 */}
      <p className={`text-[24px] font-semibold mt-12 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
        개인 정보
      </p>
      {/* 이름 등 폼 - 개인정보 헤더와 gap-4 */}
      <div className="space-y-6 mt-4">
        {/* 이름 행 */}
        <div className="border-b pb-3.5" style={{ borderColor: isDarkMode ? "#404040" : "#ededed" }}>
          <div className="text-[16px]">
            <div className="flex items-center justify-between">
              <div className={isDarkMode ? "text-[#FFFFFF]" : "text-gray-500"}>이름</div>
              <button
                type="button"
                onClick={() => {
                  if (editingField === "name") {
                    setEditingField(null);
                  } else {
                    setDraftName(nickname);
                    setEditingField("name");
                  }
                }}
                className="text-[14px] font-medium cursor-pointer text-[#FFFFFF]"
              >
                {editingField === "name" ? "Cancel" : "Edit"}
              </button>
            </div>
            <div className="mt-1 text-[14px] text-[#adadad]">{nickname || "-"}</div>
          </div>

          {editingField === "name" && (
            <div className="mt-4 space-y-3 text-sm">
              <div className={isDarkMode ? "text-gray-400" : "text-gray-500"}>
                프로필과 팀 구성원에게 보이는 이름입니다.
              </div>
              <div>
                <div className={isDarkMode ? "text-gray-300 mb-1" : "text-gray-700 mb-1"}>
                  이름
                </div>
                <input
                  type="text"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  className={`w-full px-4 py-2 rounded-full text-sm ${
                    isDarkMode
                      ? "bg-zinc-800 text-white placeholder-gray-500"
                      : "bg-gray-100 text-gray-900 placeholder-gray-500"
                  } focus:outline-none`}
                  placeholder="이름을 입력하세요"
                />
              </div>
              <div className="flex items-center justify-between mt-2">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      setIsSaving(true);
                      await userApi.updateProfile({
                        fullName: draftName,
                        phoneNumber: phoneNumber || undefined,
                        birthDate: birthDate || undefined,
                      });
                      setNickname(draftName);
                      await refreshUser();
                      setEditingField(null);
                    } catch (error) {
                      const msg =
                        error instanceof Error ? error.message : "이름을 저장하는 데 실패했습니다.";
                      window.alert(msg);
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                  disabled={isSaving || !draftName}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium ${
                    isSaving || !draftName
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-black text-white"
                  }`}
                >
                  {isSaving ? "저장 중..." : "Save"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 전화번호 행 */}
        <div className="border-b pb-3.5" style={{ borderColor: isDarkMode ? "#404040" : "#ededed" }}>
          <div className="text-[16px]">
            <div className="flex items-center justify-between">
              <div className={isDarkMode ? "text-[#FFFFFF]" : "text-gray-500"}>전화번호</div>
              <button
                type="button"
                onClick={() => {
                  if (editingField === "phone") {
                    setEditingField(null);
                  } else {
                    setDraftPhoneNumber(phoneNumber);
                    setEditingField("phone");
                  }
                }}
                className="text-[14px] font-medium cursor-pointer text-[#FFFFFF]"
              >
                {editingField === "phone" ? "Cancel" : "Edit"}
              </button>
            </div>
            <div className="mt-1 text-[14px] text-[#adadad]">{phoneNumber || "-"}</div>
          </div>

          {editingField === "phone" && (
            <div className="mt-4 space-y-3 text-sm">
              <div>
                <div className={isDarkMode ? "text-gray-300 mb-1" : "text-gray-700 mb-1"}>
                  전화번호
                </div>
                <input
                  type="tel"
                  value={draftPhoneNumber}
                  onChange={(e) => setDraftPhoneNumber(e.target.value)}
                  className={`w-full px-4 py-2 rounded-full text-sm ${
                    isDarkMode
                      ? "bg-zinc-800 text-white placeholder-gray-500"
                      : "bg-gray-100 text-gray-900 placeholder-gray-500"
                  } focus:outline-none`}
                  placeholder="010-0000-0000"
                />
              </div>
              <div className="flex items-center justify-between mt-2">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      setIsSaving(true);
                      await userApi.updateProfile({
                        fullName: nickname,
                        phoneNumber: draftPhoneNumber || undefined,
                        birthDate: birthDate || undefined,
                      });
                      setPhoneNumber(draftPhoneNumber);
                      await refreshUser();
                      setEditingField(null);
                    } catch (error) {
                      const msg =
                        error instanceof Error ? error.message : "전화번호를 저장하는 데 실패했습니다.";
                      window.alert(msg);
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                  disabled={isSaving}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium ${
                    isSaving
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-black text-white"
                  }`}
                >
                  {isSaving ? "저장 중..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingField(null)}
                  className="text-xs text-gray-500 hover:text-gray-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 생년월일 행 */}
        <div className="border-b pb-3.5" style={{ borderColor: isDarkMode ? "#404040" : "#ededed" }}>
          <div className="text-[16px]">
            <div className="flex items-center justify-between">
              <div className={isDarkMode ? "text-[#FFFFFF]" : "text-gray-500"}>생년월일</div>
              <button
                type="button"
                onClick={() => {
                  if (editingField === "birth") {
                    setEditingField(null);
                  } else {
                    setDraftBirthDate(birthDate);
                    setEditingField("birth");
                  }
                }}
                className="text-[14px] font-medium cursor-pointer text-[#FFFFFF]"
              >
                {editingField === "birth" ? "Cancel" : "Edit"}
              </button>
            </div>
            <div className="mt-1 text-[14px] text-[#adadad]">{birthDate || "-"}</div>
          </div>

          {editingField === "birth" && (
            <div className="mt-4 space-y-3 text-sm">
              <div>
                <div className={isDarkMode ? "text-gray-300 mb-1" : "text-gray-700 mb-1"}>
                  생년월일
                </div>
                <input
                  type="date"
                  value={draftBirthDate}
                  onChange={(e) => setDraftBirthDate(e.target.value)}
                  className={`w-full px-4 py-2 rounded-full text-sm ${
                    isDarkMode
                      ? "bg-zinc-800 text-white placeholder-gray-500"
                      : "bg-gray-100 text-gray-900 placeholder-gray-500"
                  } focus:outline-none`}
                />
              </div>
              <div className="flex items-center justify-between mt-2">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      setIsSaving(true);
                      await userApi.updateProfile({
                        fullName: nickname,
                        phoneNumber: phoneNumber || undefined,
                        birthDate: draftBirthDate || undefined,
                      });
                      setBirthDate(draftBirthDate);
                      await refreshUser();
                      setEditingField(null);
                    } catch (error) {
                      const msg =
                        error instanceof Error ? error.message : "생년월일을 저장하는 데 실패했습니다.";
                      window.alert(msg);
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                  disabled={isSaving}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium ${
                    isSaving
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-black text-white"
                  }`}
                >
                  {isSaving ? "저장 중..." : "Save"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 비밀번호 행 */}
        <div className="border-b pb-3.5" style={{ borderColor: isDarkMode ? "#404040" : "#ededed" }}>
          <div className="text-[16px]">
            <div className="flex items-center justify-between">
              <div className={isDarkMode ? "text-[#FFFFFF]" : "text-gray-500"}>비밀번호</div>
              <button
                type="button"
                onClick={() => {
                  if (editingField === "password") {
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmPassword("");
                    setEditingField(null);
                  } else {
                    setEditingField("password");
                  }
                }}
                className="text-[14px] font-medium cursor-pointer text-[#FFFFFF]"
              >
                {editingField === "password" ? "Cancel" : "Edit"}
              </button>
            </div>
            <div className="mt-1 text-[14px] text-[#adadad]">••••••••</div>
          </div>

          {editingField === "password" && (
            <div className="mt-4 space-y-3 text-sm">
              <div className={isDarkMode ? "text-gray-400" : "text-gray-500"}>
                새 비밀번호를 입력하세요. 최소 8자 이상이어야 합니다.
              </div>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={`w-full px-4 py-2 rounded-full text-sm ${
                  isDarkMode
                    ? "bg-zinc-800 text-white placeholder-gray-500"
                    : "bg-gray-100 text-gray-900 placeholder-gray-500"
                } focus:outline-none`}
                placeholder="현재 비밀번호"
              />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={`w-full px-4 py-2 rounded-full text-sm ${
                  isDarkMode
                    ? "bg-zinc-800 text-white placeholder-gray-500"
                    : "bg-gray-100 text-gray-900 placeholder-gray-500"
                } focus:outline-none`}
                placeholder="새 비밀번호"
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full px-4 py-2 rounded-full text-sm ${
                  isDarkMode
                    ? "bg-zinc-800 text-white placeholder-gray-500"
                    : "bg-gray-100 text-gray-900 placeholder-gray-500"
                } focus:outline-none`}
                placeholder="새 비밀번호 확인"
              />
              <div className="flex items-center justify-between mt-2">
                <button
                  type="button"
                  onClick={handleChangePassword}
                  disabled={isSaving || !currentPassword || !newPassword || !confirmPassword}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium ${
                    isSaving || !currentPassword || !newPassword || !confirmPassword
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-black text-white"
                  }`}
                >
                  {isSaving ? "변경 중..." : "Save"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 계정 관리 */}
        <div className="pt-8 space-y-6">
          <p className={`text-[24px] font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
            계정 관리
          </p>
          <div className="border-b pb-3.5" style={{ borderColor: isDarkMode ? "#404040" : "#ededed" }}>
            <div className="text-[16px]">
              <div className="flex items-center justify-between">
                <div className={isDarkMode ? "text-[#FFFFFF]" : "text-gray-500"}>계정 삭제</div>
                <button
                  type="button"
                  onClick={() => {
                    const confirmed = window.confirm("정말로 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.");
                    if (confirmed) {
                      window.alert("계정 삭제 기능은 준비 중입니다.");
                    }
                  }}
                  className="text-[14px] font-medium cursor-pointer text-[#ff824d] hover:opacity-80"
                >
                  삭제
                </button>
              </div>
              <div className="mt-1 text-[14px] text-[#adadad]">
                계정을 영구적으로 삭제합니다. 복구할 수 없습니다.
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="h-[50px]" aria-hidden />
    </div>
  );

  const renderSystemSection = () => (
    <div className="flex flex-col gap-6 w-full">
      <div>
        <h2 className={`text-xl font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
          시스템
        </h2>
        <p className={`mt-1 text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
          Rate Limit, 캐시, Agent 상태 등 백엔드 모니터링 정보를 확인합니다.
        </p>
      </div>

      {user?.role !== "TEACHER" ? (
        <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
          시스템 모니터링은 선생님 계정에서만 사용할 수 있습니다.
        </p>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <span className={`text-sm font-medium ${isDarkMode ? "text-white" : "text-gray-900"}`}>
              시스템 모니터링
            </span>
            <button
              type="button"
              onClick={loadMonitoring}
              disabled={isMonitoringLoading}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                isMonitoringLoading
                  ? isDarkMode
                    ? "bg-zinc-900 text-gray-400 cursor-not-allowed"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }`}
            >
              {isMonitoringLoading ? "새로고치는 중..." : "새로고침"}
            </button>
          </div>

          {monitoringError && (
            <div
              className={`mb-2 px-3 py-2 rounded-lg text-xs ${
                isDarkMode ? "bg-red-900/30 text-red-300" : "bg-red-50 text-red-600"
              }`}
            >
              {monitoringError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </>
      )}
    </div>
  );

  const navButtonClass = (isActive: boolean) =>
    `w-auto lg:w-full text-left flex items-center gap-2 rounded font-semibold text-[16px] transition-colors ${
      isActive ? "text-[#FFFFFF]" : "text-[#adadad]"
    }`;

  const navItems = (
    <>
      <li className="grid h-10 content-center">
        <button
          type="button"
          onClick={() => setSelectedSection("account")}
          className={navButtonClass(selectedSection === "account")}
        >
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          계정
        </button>
      </li>
      <li className="grid h-10 content-center">
        <button
          type="button"
          onClick={() => setSelectedSection("system")}
          className={navButtonClass(selectedSection === "system")}
        >
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
          </svg>
          시스템
        </button>
      </li>
    </>
  );

  return (
    <div className="h-full flex flex-col lg:flex-row lg:items-start lg:justify-center">
      {/* 모바일: 메뉴가 메인 컨테이너 상단에 가로 배치 */}
      <nav className="lg:hidden shrink-0 pb-1 mb-4 border-b" style={{ borderColor: isDarkMode ? "#404040" : "#ededed" }}>
        <ul className="flex gap-6">
          {navItems}
        </ul>
      </nav>
      {/* 데스크톱: 좌측 사이드바 (1024px 이상에서만 표시) */}
      <nav className="hidden lg:block w-85 shrink-0 self-start">
        <ul className="grid grid-flow-row gap-[2px]">
          {navItems}
        </ul>
      </nav>
      {/* 메인 콘텐츠 - 고정 (줄어들지 않음) */}
      <div className="flex-1 min-w-0 shrink-0">
        {selectedSection === "account" && renderAccountSection()}
        {selectedSection === "system" && renderSystemSection()}
      </div>
      {/* 우측 여백 - 기본 350px, 페이지 너비 줄일 때 먼저 줄어듦 */}
      <aside className="hidden lg:block w-[350px] min-w-0 shrink pl-8" />
    </div>
  );
};

export default SettingsPage;
