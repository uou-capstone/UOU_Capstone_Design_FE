import React, { useState, useEffect } from "react";
import { RefreshIcon } from "@/components/common/Icons";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import { monitoringApi, notificationsApi, userApi, type TeacherNotificationPreference } from "../../services/api";

const SettingsPage: React.FC = () => {
  const { isDarkMode } = useTheme();
  const { user, refreshUser } = useAuth();

  const [nickname, setNickname] = useState(user?.fullName || "");
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || "");
  const [birthDate, setBirthDate] = useState(user?.birthDate || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isMonitoringLoading, setIsMonitoringLoading] = useState(false);
  const [monitoringError, setMonitoringError] = useState<string | null>(null);
  const [overview, setOverview] = useState<any | null>(null);
  const [rateLimit, setRateLimit] = useState<any | null>(null);
  const [cacheStats, setCacheStats] = useState<any | null>(null);
  const [agentStats, setAgentStats] = useState<any | null>(null);
  const [teacherNotificationPrefs, setTeacherNotificationPrefs] =
    useState<TeacherNotificationPreference | null>(null);
  const [isPrefsSaving, setIsPrefsSaving] = useState(false);
  const [selectedSection, setSelectedSection] = useState<"account" | "system">("account");

  // 사용자 정보가 변경되면 폼 업데이트
  useEffect(() => {
    if (user) {
      setNickname(user.fullName || "");
      setPhoneNumber(user.phoneNumber || "");
      setBirthDate(user.birthDate || "");
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

  const loadTeacherNotificationPrefs = async () => {
    if (!user || user.role !== "TEACHER") return;
    try {
      setTeacherNotificationPrefs(await notificationsApi.getTeacherPreferences());
    } catch {
      setTeacherNotificationPrefs(null);
    }
  };

  const updateTeacherNotificationPrefs = async (
    next: TeacherNotificationPreference,
  ) => {
    setIsPrefsSaving(true);
    try {
      const saved = await notificationsApi.updateTeacherPreferences(next);
      setTeacherNotificationPrefs(saved);
    } finally {
      setIsPrefsSaving(false);
    }
  };

  useEffect(() => {
    // 선생님 계정에서만 자동 로드
    if (user?.role === "TEACHER") {
      void loadMonitoring();
      void loadTeacherNotificationPrefs();
    }
  }, [user]);

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
  const accountInputClass = `w-full px-3 py-2 rounded-lg border text-sm ${
    isDarkMode
      ? "border-[#343434] bg-[#202020] text-white placeholder-gray-500"
      : "border-[#dedbd5] bg-white text-gray-900 placeholder-gray-500"
  } focus:outline-none focus:ring-1 focus:ring-[#ff824d]/40`;
  const accountSaveButtonClass = (disabled: boolean) =>
    `px-4 py-1.5 rounded-lg text-xs font-medium ${
      disabled
        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
        : "bg-[#ff824d] text-white hover:bg-[#f26f37]"
    }`;

  const renderAccountSection = () => (
    <div className="flex flex-col w-full">
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
          {user?.email || ""}
        </p>
      </div>

      {/* 개인 정보 - 이메일과 gap-12 */}
      <p className={`text-2xl font-semibold mt-12 ${isDarkMode ? "text-white" : "text-[#141414]"}`}>
        개인 정보
      </p>
      {/* 이름 등 폼 - 개인정보 헤더와 gap-4 */}
      <div className="space-y-6 mt-4">
        {/* 이름 행 */}
        <div className="border-b pb-3.5" style={{ borderColor: isDarkMode ? "#404040" : "#ededed" }}>
          <div className="text-base">
            <div className="flex items-center justify-between">
              <div className={isDarkMode ? "text-[#FFFFFF]" : "text-[#141414]"}>이름</div>
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
                className={`text-sm font-medium cursor-pointer ${isDarkMode ? "text-[#FFFFFF]" : "text-[#141414]"}`}
              >
                {editingField === "name" ? "Cancel" : "Edit"}
              </button>
            </div>
            {editingField === "name" ? (
              <div className="mt-2 space-y-2">
                <input
                  autoFocus
                  type="text"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  className={accountInputClass}
                  placeholder="이름을 입력하세요"
                />
                <div className="flex items-center justify-end">
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
                    className={accountSaveButtonClass(isSaving || !draftName)}
                  >
                    {isSaving ? "저장 중..." : "Save"}
                  </button>
                </div>
              </div>
            ) : (
              <div className={`mt-1 text-sm ${isDarkMode ? "text-[#adadad]" : "text-[#707070]"}`}>{nickname || "-"}</div>
            )}
          </div>
        </div>

        {/* 전화번호 행 */}
        <div className="border-b pb-3.5" style={{ borderColor: isDarkMode ? "#404040" : "#ededed" }}>
          <div className="text-base">
            <div className="flex items-center justify-between">
              <div className={isDarkMode ? "text-[#FFFFFF]" : "text-[#141414]"}>전화번호</div>
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
                className={`text-sm font-medium cursor-pointer ${isDarkMode ? "text-[#FFFFFF]" : "text-[#141414]"}`}
              >
                {editingField === "phone" ? "Cancel" : "Edit"}
              </button>
            </div>
            {editingField === "phone" ? (
              <div className="mt-2 space-y-2">
                <input
                  autoFocus
                  type="tel"
                  value={draftPhoneNumber}
                  onChange={(e) => setDraftPhoneNumber(e.target.value)}
                  className={accountInputClass}
                  placeholder="010-0000-0000"
                />
                <div className="flex items-center justify-end">
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
                    className={accountSaveButtonClass(isSaving)}
                  >
                    {isSaving ? "저장 중..." : "Save"}
                  </button>
                </div>
              </div>
            ) : (
              <div className={`mt-1 text-sm ${isDarkMode ? "text-[#adadad]" : "text-[#707070]"}`}>{phoneNumber || "-"}</div>
            )}
          </div>
        </div>

        {/* 생년월일 행 */}
        <div className="border-b pb-3.5" style={{ borderColor: isDarkMode ? "#404040" : "#ededed" }}>
          <div className="text-base">
            <div className="flex items-center justify-between">
              <div className={isDarkMode ? "text-[#FFFFFF]" : "text-[#141414]"}>생년월일</div>
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
                className={`text-sm font-medium cursor-pointer ${isDarkMode ? "text-[#FFFFFF]" : "text-[#141414]"}`}
              >
                {editingField === "birth" ? "Cancel" : "Edit"}
              </button>
            </div>
            {editingField === "birth" ? (
              <div className="mt-2 space-y-2">
                <input
                  autoFocus
                  type="date"
                  value={draftBirthDate}
                  onChange={(e) => setDraftBirthDate(e.target.value)}
                  className={accountInputClass}
                />
                <div className="flex items-center justify-end">
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
                    className={accountSaveButtonClass(isSaving)}
                  >
                    {isSaving ? "저장 중..." : "Save"}
                  </button>
                </div>
              </div>
            ) : (
              <div className={`mt-1 text-sm ${isDarkMode ? "text-[#adadad]" : "text-[#707070]"}`}>{birthDate || "-"}</div>
            )}
          </div>
        </div>

        {/* 비밀번호 행 */}
        <div className="border-b pb-3.5" style={{ borderColor: isDarkMode ? "#404040" : "#ededed" }}>
          <div className="text-base">
            <div className="flex items-center justify-between">
              <div className={isDarkMode ? "text-[#FFFFFF]" : "text-[#141414]"}>비밀번호</div>
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
                className={`text-sm font-medium cursor-pointer ${isDarkMode ? "text-[#FFFFFF]" : "text-[#141414]"}`}
              >
                {editingField === "password" ? "Cancel" : "Edit"}
              </button>
            </div>
            {editingField === "password" ? (
              <div className="mt-2 space-y-2">
              <input
                autoFocus
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={accountInputClass}
                placeholder="현재 비밀번호"
              />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={accountInputClass}
                placeholder="새 비밀번호"
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={accountInputClass}
                placeholder="새 비밀번호 확인"
              />
              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={handleChangePassword}
                  disabled={isSaving || !currentPassword || !newPassword || !confirmPassword}
                  className={accountSaveButtonClass(isSaving || !currentPassword || !newPassword || !confirmPassword)}
                >
                  {isSaving ? "변경 중..." : "Save"}
                </button>
              </div>
              </div>
            ) : (
              <div className={`mt-1 text-sm ${isDarkMode ? "text-[#adadad]" : "text-[#707070]"}`}>••••••••</div>
            )}
          </div>
        </div>

        {/* 계정 관리 */}
        <div className="pt-8 space-y-6">
          <p className={`text-2xl font-semibold ${isDarkMode ? "text-white" : "text-[#141414]"}`}>
            계정 관리
          </p>
          <div className="border-b pb-3.5" style={{ borderColor: isDarkMode ? "#404040" : "#ededed" }}>
            <div className="text-base">
              <div className="flex items-center justify-between">
                <div className={isDarkMode ? "text-[#FFFFFF]" : "text-[#141414]"}>계정 삭제</div>
                <button
                  type="button"
                  onClick={() => {
                    const confirmed = window.confirm("정말로 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.");
                    if (confirmed) {
                      window.alert("계정 삭제 기능은 준비 중입니다.");
                    }
                  }}
                  className="text-sm font-medium cursor-pointer text-[#ff824d] hover:opacity-80"
                >
                  삭제
                </button>
              </div>
              <div className={`mt-1 text-sm ${isDarkMode ? "text-[#adadad]" : "text-[#707070]"}`}>
                계정을 영구적으로 삭제합니다. 복구할 수 없습니다.
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="h-12.5" aria-hidden />
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
          <div
            className={`flex flex-col gap-3 rounded-xl border p-4 ${
              isDarkMode
                ? "border-zinc-700 bg-zinc-900/60"
                : "border-gray-200 bg-gray-50"
            }`}
          >
            <div className="flex flex-col gap-1">
              <span className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                교사 알림 수신 설정
              </span>
              <span className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                자기 활동 알림 포함 여부를 설정합니다.
              </span>
            </div>
            <label className="flex items-center justify-between gap-4 text-sm">
              <span className={isDarkMode ? "text-gray-200" : "text-gray-800"}>
                자기 활동 알림 포함
              </span>
              <input
                type="checkbox"
                checked={!!teacherNotificationPrefs?.includeSelfActionNotifications}
                disabled={isPrefsSaving || teacherNotificationPrefs == null}
                onChange={(event) =>
                  void updateTeacherNotificationPrefs({
                    includeSelfActionNotifications: event.target.checked,
                  })
                }
              />
            </label>
          </div>

          <div className="flex items-center justify-between">
            <span className={`text-sm font-medium ${isDarkMode ? "text-white" : "text-gray-900"}`}>
              시스템 모니터링
            </span>
            <button
              type="button"
              onClick={loadMonitoring}
              disabled={isMonitoringLoading}
              aria-label="새로고침"
              title="새로고침"
              className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium cursor-pointer ${
                isMonitoringLoading
                  ? isDarkMode
                    ? "bg-zinc-900 text-gray-400 cursor-not-allowed"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-[#ff824d] hover:bg-[#f26f37] text-white"
              }`}
            >
              <RefreshIcon className={`h-4 w-4 ${isMonitoringLoading ? "animate-spin" : ""}`} />
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
                    className={`px-2 py-0.5 rounded-full text-xs ${
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
                        <dt className="text-xs text-gray-500">{key}</dt>
                        <dd className="text-xs font-medium text-right truncate max-w-[60%]">
                          {String(value)}
                        </dd>
                      </div>
                    ))
                ) : (
                  <p className="text-xs text-gray-500">데이터 없음</p>
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
                        <dt className="text-xs text-gray-500">{key}</dt>
                        <dd className="text-xs font-medium text-right truncate max-w-[60%]">
                          {typeof value === "object" ? JSON.stringify(value) : String(value)}
                        </dd>
                      </div>
                    ))
                ) : (
                  <p className="text-xs text-gray-500">데이터 없음</p>
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
                        <dt className="text-xs text-gray-500">{key}</dt>
                        <dd className="text-xs font-medium text-right truncate max-w-[60%]">
                          {typeof value === "object" ? JSON.stringify(value) : String(value)}
                        </dd>
                      </div>
                    ))
                ) : (
                  <p className="text-xs text-gray-500">데이터 없음</p>
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
                        <dt className="text-xs text-gray-500">{key}</dt>
                        <dd className="text-xs font-medium text-right truncate max-w-[60%]">
                          {typeof value === "object" ? JSON.stringify(value) : String(value)}
                        </dd>
                      </div>
                    ))
                ) : (
                  <p className="text-xs text-gray-500">데이터 없음</p>
                )}
              </dl>
            </div>
          </div>
        </>
      )}
    </div>
  );

  const navButtonClass = (isActive: boolean) =>
    `w-auto lg:w-full text-left flex items-center gap-2 rounded font-semibold text-base transition-colors ${
      isActive
        ? isDarkMode
          ? "text-[#FFFFFF]"
          : "text-[#141414]"
        : "text-[#adadad]"
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
      {/* 데스크톱: 좌측 사이드바 (lg 브레이크포인트 이상에서만 표시) */}
      <nav className="hidden lg:block w-85 shrink-0 self-start">
        <ul className="grid grid-flow-row gap-0.5">
          {navItems}
        </ul>
      </nav>
      {/* 메인 콘텐츠 - 고정 (줄어들지 않음) */}
      <div className="flex-1 min-w-0 shrink-0">
        {selectedSection === "account" && renderAccountSection()}
        {selectedSection === "system" && renderSystemSection()}
      </div>
      {/* 우측 여백 - 기본 `21.875rem`, 페이지 너비 줄일 때 먼저 줄어듦 */}
      <aside className="hidden lg:block w-[21.875rem] min-w-0 shrink pl-8" />
    </div>
  );
};

export default SettingsPage;
