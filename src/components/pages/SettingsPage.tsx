import React, { useState, useRef, useEffect } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";

const SettingsPage: React.FC = () => {
  const { isDarkMode } = useTheme();
  const { user, refreshUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [email, setEmail] = useState(user?.email || "");
  const [nickname, setNickname] = useState(user?.fullName || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileImage, setProfileImage] = useState<string | null>(user?.profileImageUrl || null);
  const [isSaving, setIsSaving] = useState(false);

  // 사용자 정보가 변경되면 폼 업데이트
  useEffect(() => {
    if (user) {
      setEmail(user.email || "");
      setNickname(user.fullName || "");
      setProfileImage(user.profileImageUrl || null);
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
      // TODO: API 호출로 프로필 정보 업데이트
      // await authApi.updateProfile({ email, nickname, profileImage });
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
      // TODO: API 호출로 비밀번호 변경
      // await authApi.changePassword({ currentPassword, newPassword });
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

  return (
    <div className="flex flex-col gap-1.5 h-full">
      <div
        className={`p-6 rounded-xl shadow-sm border transition-colors ${
          isDarkMode
            ? "bg-gray-700 border-gray-700 text-gray-100"
            : "bg-white border-gray-200 text-gray-900"
        }`}
      >
        <header className="mb-6">
          <h1 className={`text-xl font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>설정</h1>
        </header>

        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 프로필 정보 */}
        <section
          className={`p-6 rounded-xl border shadow-sm ${
            isDarkMode ? "bg-gray-700 border-gray-700" : "bg-white border-gray-200"
          }`}
        >
          <h2 className={`text-base font-semibold mb-4 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
            프로필 정보
          </h2>
          <div className="space-y-4">
              {/* 프로필 사진 */}
              <div className="flex flex-col items-center gap-3">
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
                        isDarkMode ? "bg-gray-700 hover:bg-gray-600" : "bg-gray-500 hover:bg-gray-600"
                      } transition-colors`}
                    >
                      {user?.fullName?.charAt(0).toUpperCase() || "?"}
                    </div>
                  )}
                  <div className={`absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white`}>
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

              {/* 이메일 */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                  이메일
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full px-4 py-2 rounded-lg border text-sm ${
                    isDarkMode
                      ? "bg-zinc-800 border-zinc-700 text-white placeholder-gray-500"
                      : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                  } focus:outline-none focus:ring-2 ${isDarkMode ? "focus:ring-zinc-500" : "focus:ring-emerald-500"}`}
                  placeholder="이메일 주소"
                />
              </div>

              {/* 닉네임 */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                  닉네임
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
                  placeholder="닉네임"
                />
              </div>
            </div>
        </section>

        {/* 비밀번호 변경 */}
        <section
          className={`p-6 rounded-xl border shadow-sm ${
            isDarkMode ? "bg-gray-700 border-gray-700" : "bg-white border-gray-200"
          }`}
        >
          <h2 className={`text-base font-semibold mb-3 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
            비밀번호 변경
          </h2>
          <div className="space-y-3">
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
        </section>
          </div>

          {/* 저장 버튼 */}
          <div className="flex justify-end gap-4 pt-4">
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
    </div>
  );
};

export default SettingsPage;
