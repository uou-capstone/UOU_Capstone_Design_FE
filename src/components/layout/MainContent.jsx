import React from "react";

const MainContent = () => {
  const contentCards = [
    {
      id: 1,
      title: "1주차 강의자료",
      status: "진행중",
      statusColor: "bg-red-500",
      icon: "🎓",
      type: "강의",
      comments: 0,
    },
    {
      id: 2,
      title: "1-1주차 내용기반 추천시스템 프로그래밍",
      status: "수강 완료",
      statusColor: "bg-gray-500",
      icon: "📖",
      type: "노트",
      comments: 0,
    },
    {
      id: 3,
      title: "추천시스템 데이터 & python code",
      status: "수강 완료",
      statusColor: "bg-gray-500",
      icon: "📖",
      type: "노트",
      comments: 0,
    },
  ];

  return (
    <div className="flex-1 p-6 overflow-y-auto bg-gray-900">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-white m-0">1주차</h1>
        <div className="flex gap-2">
          <button className="bg-transparent border-none text-gray-400 text-base p-2 rounded cursor-pointer transition-all hover:text-white hover:bg-gray-700">
            🔍
          </button>
          <button className="bg-transparent border-none text-gray-400 text-base p-2 rounded cursor-pointer transition-all hover:text-white hover:bg-gray-700">
            📋
          </button>
           <button className="bg-transparent border-none text-blue-500 text-base p-2 rounded cursor-pointer transition-all bg-gray-700">
            ⊞
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {contentCards.map((card) => (
          <div
            key={card.id}
             className="bg-gray-800 rounded-xl p-5 border border-gray-700 transition-all cursor-pointer hover:-translate-y-0.5 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/10"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 flex items-center justify-center bg-gray-700 rounded-lg text-2xl">
                {card.icon}
              </div>
              <div
                className={`px-2 py-1 rounded text-xs font-medium text-white ${card.statusColor}`}
              >
                {card.status}
              </div>
            </div>

            <div className="mb-4">
              <h3 className="text-white text-base font-medium leading-snug m-0">
                {card.title}
              </h3>
            </div>

            <div className="flex justify-between items-center text-sm text-gray-400">
              <div className="font-medium">{card.type}</div>
              <div className="flex items-center gap-1">💬 {card.comments}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MainContent;
