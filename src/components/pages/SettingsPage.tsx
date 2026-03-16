import React, { useState, useRef, useEffect } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import { monitoringApi, userApi } from "../../services/api";

const SettingsPage: React.FC = () => {
  const { isDarkMode } = useTheme();
  const { user, refreshUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [email, setEmail] = useState(user?.email || "");
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

  const [editingField, setEditingField] = useState<"name" | "password" | null>(null);
  const [draftName, setDraftName] = useState(nickname);

  const renderAccountSection = () => (
    <div className="flex flex-col gap-10 max-w-xl">
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

      {/* 상단 사용자 정보 (이름, 이메일) */}
      <div className="flex flex-col gap-1">
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
          {user?.email || email || ""}
        </p>
      </div>

      {/* 이름 / 이메일 / 비밀번호 리스트 */}
      <div className="space-y-6">
        {/* 이름 행 */}
        <div className="border-b pb-4" style={{ borderColor: isDarkMode ? "#404040" : "#ededed" }}>
          <div className="text-[16px]">
            <div className="flex items-center justify-between">
              <div className={isDarkMode ? "text-gray-400" : "text-gray-500"}>이름</div>
              <button
                type="button"
                onClick={() => {
                  setDraftName(nickname);
                  setEditingField("name");
                }}
                className="text-[14px] font-medium cursor-pointer text-[#FFFFFF]"
              >
                Edit
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

        {/* 이메일 행 */}
        <div className="border-b pb-4" style={{ borderColor: isDarkMode ? "#404040" : "#ededed" }}>
          <div className="text-[16px]">
            <div className="flex items-center justify-between">
              <div className={isDarkMode ? "text-gray-400" : "text-gray-500"}>이메일</div>
              <span className="text-[14px] font-medium text-[#FFFFFF]">Edit</span>
            </div>
            <div className="mt-1 text-[14px] text-[#adadad]">{email || "-"}</div>
          </div>
        </div>

        {/* 비밀번호 행 */}
        <div className="border-b pb-4" style={{ borderColor: isDarkMode ? "#404040" : "#ededed" }}>
          <div className="text-[16px]">
            <div className="flex items-center justify-between">
              <div className={isDarkMode ? "text-gray-400" : "text-gray-500"}>비밀번호</div>
              <button
                type="button"
                onClick={() => setEditingField("password")}
                className="text-[14px] font-medium cursor-pointer text-[#FFFFFF]"
              >
                Edit
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
                <button
                  type="button"
                  onClick={() => {
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmPassword("");
                    setEditingField(null);
                  }}
                  className="text-xs text-gray-500 hover:text-gray-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* (중복 UI 제거) 하단 비밀번호/회원탈퇴 블록은 상단 "Edit" 섹션에서 처리 */}
    </div>
  );

  const renderSystemSection = () => (
    <div className="flex flex-col gap-6">
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

  return (
    <div className="h-full flex">
        <nav className="w-80 mr-auto">
          <ul className="space-y-1">
            <li>
              <button
                type="button"
                onClick={() => setSelectedSection("account")}
                className={`w-full text-left px-2 py-1.5 rounded font-semibold text-[16px] transition-colors ${
                  selectedSection === "account" ? "text-[#FFFFFF]" : "text-[#adadad]"
                }`}
              >
                계정
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => setSelectedSection("system")}
                className={`w-full text-left px-2 py-1.5 rounded font-semibold text-[16px] transition-colors ${
                  selectedSection === "system" ? "text-[#FFFFFF]" : "text-[#adadad]"
                }`}
              >
                시스템
              </button>
            </li>
          </ul>
        </nav>
        <main className="flex-1">
          {selectedSection === "account" && renderAccountSection()}
          {selectedSection === "system" && renderSystemSection()}
        </main>
      </div>
  );
};

export default SettingsPage;
