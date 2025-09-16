import React from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "../components/layout/TopNav";

const ClassroomSelectPage = () => {
  const navigate = useNavigate();

  const recentClassrooms = [
    { id: 1, title: "새 강의실 만들기", icon: "+", color: "border-2 border-dashed border-gray-600", isCreate: true },
    { id: 2, title: "미시경제학 원론", subtitle: "2023. 10. 26 · 소스 2개", color: "bg-emerald-900/60" },
    { id: 3, title: "AI 추천시스템 01반", subtitle: "2023. 10. 25 · 소스 1개", color: "bg-indigo-900/60" },
    { id: 4, title: "운영체제", subtitle: "2023. 10. 22 · 소스 3개", color: "bg-amber-900/60" },
  ];

  const handleClick = (item) => {
    if (item.isCreate) {
      // 새 강의실 만들기 동작 (임시)
      alert("새 강의실 만들기 (준비중)");
      return;
    }
    // 선생님 강의실로 이동 (임시)
    navigate("/teacher");
  };

  return (
    <div className="min-h-screen bg-[#0f1a2b] text-white">
      <TopNav />
      <header className="flex items-center justify-between px-8 py-6">
      </header>

      <main className="px-8">
        <h2 className="text-2xl font-bold mb-6">최근 강의실</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl">
          {recentClassrooms.map((item) => (
            <button
              key={item.id}
              onClick={() => handleClick(item)}
              className={`h-44 rounded-2xl ${item.color || "bg-gray-800"} transition-transform hover:-translate-y-0.5 shadow-sm text-left p-6`}
            >
              {item.isCreate ? (
                <div className="w-full h-full border-2 border-dashed border-gray-600 rounded-2xl flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-[#16324a] text-blue-300 flex items-center justify-center text-3xl">+</div>
                  <div className="mt-3 text-gray-300">새 강의실 만들기</div>
                </div>
              ) : (
                <div className="flex flex-col justify-between h-full">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-black/30 flex items-center justify-center text-xl">$</div>
                    <div className="text-lg font-semibold">{item.title}</div>
                  </div>
                  <div className="text-sm text-gray-300">{item.subtitle}</div>
                </div>
              )}
            </button>
          ))}
        </div>
      </main>
    </div>
  );
};

export default ClassroomSelectPage;
