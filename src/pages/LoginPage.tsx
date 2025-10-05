import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "../components/layout/TopNav";

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const handleSessionLogin = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigate("/");
    }, 800);
  };

  const handleOAuth = (provider: string): void => {
    // 실제 연동 시 provider에 맞는 OAuth 플로우로 이동
    alert(`${provider} 로그인 준비중`);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0f1a2b]">
      <TopNav />
      <div className="flex-1 flex items-center justify-center">
      <div className="bg-[#17243a] p-8 rounded-2xl shadow-lg w-[420px]">
        <h1 className="text-xl font-semibold text-white text-center mb-6">로그인</h1>

        <form onSubmit={handleSessionLogin} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 rounded bg-[#0f1a2b] text-white outline-none border border-transparent focus:border-blue-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 rounded bg-[#0f1a2b] text-white outline-none border border-transparent focus:border-blue-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium transition disabled:opacity-60"
          >
            {loading ? "로그인 중..." : "이메일로 로그인"}
          </button>
        </form>

        <div className="flex items-center my-5 text-gray-400">
          <div className="flex-1 h-px bg-gray-700" />
          <span className="px-3 text-sm">또는</span>
          <div className="flex-1 h-px bg-gray-700" />
        </div>

        <div className="space-y-3">
          <button
            onClick={() => handleOAuth("Google")}
            className="w-full py-2.5 rounded bg-white text-gray-800 font-medium hover:bg-gray-100"
          >
            Google 계정으로 로그인
          </button>
          <button
            onClick={() => handleOAuth("Kakao")}
            className="w-full py-2.5 rounded bg-[#FEE500] text-[#191600] font-medium hover:brightness-95"
          >
            카카오 계정으로 로그인
          </button>
        </div>

        <div className="mt-5 text-center text-sm text-gray-300">
          계정이 없으신가요? <a className="text-blue-400 hover:underline" href="/signup">회원가입</a>
        </div>
        <p className="mt-3 text-center text-xs text-gray-400">실제 로그인 연동은 추후 OAuth/세션 API 연결 시 동작합니다.</p>
      </div>
      </div>
    </div>
  );
};

export default LoginPage;
