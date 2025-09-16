import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "../components/layout/TopNav";

const SignupPage = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [role, setRole] = useState("student");
  const [school, setSchool] = useState("");
  const [department, setDepartment] = useState("");
  const [studentId, setStudentId] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    alert("회원가입 준비중");
    navigate("/login");
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0f1a2b]">
      <TopNav />
      <div className="flex-1 flex items-center justify-center">
        <div className="bg-[#17243a] p-8 rounded-2xl shadow-lg w-[520px]">
          <h1 className="text-2xl font-bold text-white text-center mb-6">회원가입</h1>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-sm text-gray-300 mb-1">이름</label>
                <input className="w-full px-3 py-2 rounded bg-[#0f1a2b] text-white outline-none border border-transparent focus:border-blue-500" value={name} onChange={(e)=>setName(e.target.value)} required/>
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">역할</label>
                <select className="w-full px-3 py-2 rounded bg-[#0f1a2b] text-white outline-none border border-transparent focus:border-blue-500" value={role} onChange={(e)=>setRole(e.target.value)}>
                  <option value="student">학생</option>
                  <option value="teacher">선생님</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">학번/교번</label>
                <input className="w-full px-3 py-2 rounded bg-[#0f1a2b] text-white outline-none border border-transparent focus:border-blue-500" value={studentId} onChange={(e)=>setStudentId(e.target.value)} placeholder="예: 20251234"/>
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">학교</label>
                <input className="w-full px-3 py-2 rounded bg-[#0f1a2b] text-white outline-none border border-transparent focus:border-blue-500" value={school} onChange={(e)=>setSchool(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">학과/부서</label>
                <input className="w-full px-3 py-2 rounded bg-[#0f1a2b] text-white outline-none border border-transparent focus:border-blue-500" value={department} onChange={(e)=>setDepartment(e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className="block text-sm text-gray-300 mb-1">이메일</label>
                <input type="email" className="w-full px-3 py-2 rounded bg-[#0f1a2b] text-white outline-none border border-transparent focus:border-blue-500" required />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">비밀번호</label>
                <input type="password" className="w-full px-3 py-2 rounded bg-[#0f1a2b] text-white outline-none border border-transparent focus:border-blue-500" required />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">비밀번호 확인</label>
                <input type="password" className="w-full px-3 py-2 rounded bg-[#0f1a2b] text-white outline-none border border-transparent focus:border-blue-500" required />
              </div>
            </div>
            <button className="w-full py-2.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium transition">회원가입</button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-300">
            이미 계정이 있으신가요? {""}
            <button className="text-blue-400 hover:underline" onClick={() => navigate("/login")}>로그인</button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;


