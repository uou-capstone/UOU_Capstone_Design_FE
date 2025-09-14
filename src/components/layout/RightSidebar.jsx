import React from "react";

const RightSidebar = () => {
  const studioTools = [
    { id: 1, title: "강의 자료 만들기", icon: "📚", color: "bg-blue-500" },
    { id: 2, title: "AI 오디오", icon: "🔊", color: "bg-purple-500" },
    { id: 3, title: "마인드맵", icon: "🎯", color: "bg-blue-500" },
    { id: 4, title: "시험 생성", icon: "💡", color: "bg-green-500" },
    { id: 5, title: "보고서", icon: "📊", color: "bg-yellow-500" },
    { id: 6, title: "학생 관리", icon: "👥", color: "bg-red-500" },
  ];

  return (
    <aside className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col p-5 overflow-y-auto">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white m-0">스튜디오</h3>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {studioTools.map((tool) => (
          <button
            key={tool.id}
            className="bg-gray-700 border-none p-4 rounded-lg cursor-pointer transition-all flex flex-col items-center gap-2 hover:bg-gray-600 hover:-translate-y-0.5"
          >
            <div
              className={`w-10 h-10 flex items-center justify-center rounded-lg text-white text-2xl ${tool.color}`}
            >
              {tool.icon}
            </div>
            <div className="text-white text-xs text-center leading-tight font-medium">
              {tool.title}
            </div>
          </button>
        ))}
      </div>

      <div className="mb-6">
        <p className="text-gray-400 text-sm leading-relaxed m-0">
          스튜디오는 강의 자료를 활용하여 AI 오디오 리뷰, 학습 가이드, 마인드맵
          등을 생성합니다.
        </p>
      </div>

      <div className="mt-auto">
        <button className="w-full py-3 bg-blue-500 text-white border-none rounded-md text-sm font-medium cursor-pointer transition-all hover:bg-blue-600">
          메모 추가
        </button>
      </div>
    </aside>
  );
};

export default RightSidebar;
