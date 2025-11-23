import React, { useState, useRef, useEffect } from "react";
import { useTheme, type ThemeMode } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";

const SettingsPage: React.FC = () => {
  const { isDarkMode, themeMode, setThemeMode } = useTheme();
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
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className={`text-2xl font-bold mb-8 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
          설정
        </h1>

        <div className="grid grid-cols-2 gap-6">
          {/* 프로필 사진 */}
          <div className={`p-6 rounded-lg border ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
          <h2 className={`text-lg font-semibold mb-4 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
            프로필 사진
          </h2>
          <div className="flex flex-col items-center gap-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative group focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full"
            >
              <img
                src={profileImage || "/default-avatar.png"}
                alt="Profile"
                className="w-32 h-32 rounded-full object-cover border-2 border-gray-300 transition-opacity group-hover:opacity-80"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%23e5e7eb'/%3E%3Ctext x='50' y='60' text-anchor='middle' font-size='40' fill='%239ca3af'%3E%3F%3C/text%3E%3C/svg%3E";
                }}
              />
              <div className={`absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity ${isDarkMode ? "text-white" : "text-white"}`}>
                <span className="text-sm font-medium">클릭하여 변경</span>
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png"
              onChange={handleProfileImageChange}
              className="hidden"
            />
            <p className={`text-sm text-center ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
              JPG 또는 PNG 파일 (최대 5MB)
            </p>
          </div>
          </div>

          {/* 이메일 */}
          <div className={`p-6 rounded-lg border ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
          <h2 className={`text-lg font-semibold mb-4 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
            이메일
          </h2>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`w-full px-4 py-2 rounded-lg border ${
              isDarkMode
                ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
            } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            placeholder="이메일 주소"
          />
          </div>

          {/* 닉네임 */}
          <div className={`p-6 rounded-lg border ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
          <h2 className={`text-lg font-semibold mb-4 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
            닉네임
          </h2>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className={`w-full px-4 py-2 rounded-lg border ${
              isDarkMode
                ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
            } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            placeholder="닉네임"
          />
          </div>

          {/* 비밀번호 변경 */}
          <div className={`p-6 rounded-lg border ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
          <h2 className={`text-lg font-semibold mb-4 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
            비밀번호 변경
          </h2>
          <div className="space-y-4">
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={`w-full px-4 py-2 rounded-lg border ${
                isDarkMode
                  ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="현재 비밀번호"
            />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={`w-full px-4 py-2 rounded-lg border ${
                isDarkMode
                  ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="새 비밀번호"
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`w-full px-4 py-2 rounded-lg border ${
                isDarkMode
                  ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="새 비밀번호 확인"
            />
            <button
              type="button"
              onClick={handleChangePassword}
              disabled={isSaving || !currentPassword || !newPassword || !confirmPassword}
              className={`px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer ${
                isSaving || !currentPassword || !newPassword || !confirmPassword
                  ? isDarkMode
                    ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : isDarkMode
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              {isSaving ? "변경 중..." : "비밀번호 변경"}
            </button>
          </div>
          </div>

          {/* 테마 설정 */}
          <div className={`p-6 rounded-lg border ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
          <h2 className={`text-lg font-semibold mb-4 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
            테마
          </h2>
          <div className="space-y-3">
            <label className={`flex items-center gap-3 cursor-pointer ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}>
              <input
                type="radio"
                name="theme"
                value="light"
                checked={themeMode === "light"}
                onChange={() => setThemeMode("light")}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
              />
              <span>라이트 모드</span>
            </label>
            <label className={`flex items-center gap-3 cursor-pointer ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}>
              <input
                type="radio"
                name="theme"
                value="dark"
                checked={themeMode === "dark"}
                onChange={() => setThemeMode("dark")}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
              />
              <span>다크 모드</span>
            </label>
            <label className={`flex items-center gap-3 cursor-pointer ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}>
              <input
                type="radio"
                name="theme"
                value="system"
                checked={themeMode === "system"}
                onChange={() => setThemeMode("system")}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
              />
              <span>시스템 모드 (시스템 설정에 따라 자동 변경)</span>
            </label>
          </div>
          </div>
        </div>

        {/* 저장 버튼 */}
        <div className="flex justify-end gap-4 mt-6">
          <button
            type="button"
            onClick={handleSaveProfile}
            disabled={isSaving}
            className={`px-6 py-2 rounded-lg font-medium transition-colors cursor-pointer ${
              isSaving
                ? isDarkMode
                  ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
                : isDarkMode
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            {isSaving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
