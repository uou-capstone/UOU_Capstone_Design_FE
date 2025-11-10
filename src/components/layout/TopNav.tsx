import React from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";

const TopNav: React.FC = () => {
  const { isDarkMode, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header
      className={`flex items-center justify-between px-6 p-4 h-16 border-b transition-colors ${
        isDarkMode
          ? "bg-gray-800 border-gray-700"
          : "bg-white border-gray-100"
      }`}
    >
      <div className={`text-lg font-semibold ${
        isDarkMode ? "text-white" : "text-gray-900"
      }`}>
        AI Tutor LMS
      </div>
      <div className="flex items-center gap-4">
        {user && (
          <div className={`flex items-center gap-3 ${
            isDarkMode ? "text-gray-300" : "text-gray-700"
          }`}>
            <div className="text-sm">
              <div className="font-medium">{user.fullName}</div>
              <div className={`text-xs ${
                isDarkMode ? "text-gray-400" : "text-gray-500"
              }`}>
                {user.role === 'TEACHER' ? '선생님' : '학생'}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                isDarkMode
                  ? "bg-gray-700 hover:bg-gray-600 text-white"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-700"
              }`}
            >
              로그아웃
            </button>
          </div>
        )}
        <button
          onClick={toggleTheme}
          className={`p-2 rounded-lg transition-colors cursor-pointer ${
            isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
          }`}
          title={isDarkMode ? "라이트모드로 전환" : "다크모드로 전환"}
        >
          {isDarkMode ? (
            <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>
      </div>
    </header>
  );
};

export default TopNav;
