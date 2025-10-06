import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [showDevMenu, setShowDevMenu] = useState<boolean>(false);

  const handleSessionLogin = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError("");
    
    const result = await login(email, password);
    
    if (result.success) {
      navigate("/");
    } else {
      setError(result.error || "로그인에 실패했습니다.");
    }
  };

  const handleOAuth = (provider: string): void => {
    // 실제 연동 시 provider에 맞는 OAuth 플로우로 이동
    alert(`${provider} 로그인 준비중`);
  };

  const devPages = [
    { name: "로그인 화면", path: "/login" },
    { name: "강의실 선택 (메인)", path: "/" },
    { name: "선생님 강의실", path: "/teacher" },
    { name: "학생 강의실", path: "/student" },
  ];

  const handlePageNavigation = (path: string): void => {
    navigate(path);
    setShowDevMenu(false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Dev 버튼만 있는 간단한 헤더 */}
      <div className="flex justify-center p-4">
        <div className="relative">
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors cursor-pointer"
            onClick={() => setShowDevMenu((v) => !v)}
          >
            Dev
          </button>

          {showDevMenu && (
            <div className="dropdown-menu absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
              {devPages.map((page) => (
                <button
                  key={page.path}
                  className={`w-full text-left px-4 py-2 transition-colors first:rounded-t-md last:rounded-b-md ${
                    page.path === "/login"
                      ? "bg-blue-600 text-white cursor-default"
                      : "text-gray-900 hover:bg-gray-100 cursor-pointer"
                  }`}
                  onClick={() => page.path !== "/login" && handlePageNavigation(page.path)}
                  disabled={page.path === "/login"}
                >
                  {page.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-[420px]">
        <h1 className="text-xl font-semibold text-gray-900 text-center mb-6">로그인</h1>

        <form onSubmit={handleSessionLogin} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 rounded bg-gray-100 text-gray-900 outline-none border border-gray-300 focus:border-blue-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 rounded bg-gray-100 text-gray-900 outline-none border border-gray-300 focus:border-blue-500"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center py-2">
              {error}
            </div>
          )}
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium transition disabled:opacity-60"
          >
            {isLoading ? "로그인 중..." : "이메일로 로그인"}
          </button>
        </form>

        <div className="flex items-center my-5 text-gray-500">
          <div className="flex-1 h-px bg-gray-300" />
          <span className="px-3 text-sm">또는</span>
          <div className="flex-1 h-px bg-gray-300" />
        </div>

        <div className="space-y-3">
          <button
            onClick={() => handleOAuth("Kakao")}
            className="w-full py-2.5 rounded bg-[#FEE500] text-[#191600] font-medium hover:brightness-95"
          >
            카카오 계정으로 로그인
          </button>
          <button
            onClick={() => handleOAuth("Google")}
            className="w-full py-2.5 rounded bg-white text-gray-800 font-medium hover:bg-gray-50 border border-gray-300"
          >
            Google 계정으로 로그인
          </button>
        </div>

        <div className="mt-5 text-center text-sm text-gray-600">
          계정이 없으신가요? <a className="text-blue-600 hover:underline" href="/signup">회원가입</a>
        </div>
        <p className="mt-3 text-center text-xs text-gray-500">
          API 서버가 연결되지 않아 임시 로그인만 가능합니다.<br />
          OAuth 로그인은 준비중입니다.
        </p>
      </div>
      </div>
    </div>
  );
};

export default LoginPage;
