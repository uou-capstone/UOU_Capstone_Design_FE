import React from "react";

const TopNav = () => {
  return (
    <header className="flex items-center justify-between px-6 py-4 bg-gray-800 border-b border-gray-700 h-16">
      <div className="flex items-center gap-4">
        <div className="text-xl cursor-pointer">🏠</div>
        <div className="flex items-center gap-2 cursor-pointer">
          <span className="text-base font-semibold">미시경제학 원론</span>
          <span className="text-xs text-gray-400">▼</span>
        </div>
      </div>

      <nav className="flex gap-8">
        <a
          href="#"
           className="text-gray-400 text-sm px-4 py-2 rounded-md transition-all hover:text-white hover:bg-gray-700"
        >
          공지
        </a>
        <a
          href="#"
           className="text-gray-400 text-sm px-4 py-2 rounded-md transition-all hover:text-white hover:bg-gray-700"
        >
          커뮤니티
        </a>
        <a
          href="#"
           className="text-white text-sm px-4 py-2 rounded-md bg-blue-500"
        >
          콘텐츠
        </a>
        <a
          href="#"
           className="text-gray-400 text-sm px-4 py-2 rounded-md transition-all hover:text-white hover:bg-gray-700"
        >
          챌린지
        </a>
        <a
          href="#"
           className="text-gray-400 text-sm px-4 py-2 rounded-md transition-all hover:text-white hover:bg-gray-700"
        >
          내 활동
        </a>
      </nav>

      <div className="flex items-center gap-4">
         <button className="text-gray-400 text-lg p-2 rounded transition-all hover:text-white hover:bg-gray-700">
          🔍
        </button>
         <button className="text-gray-400 text-lg p-2 rounded transition-all hover:text-white hover:bg-gray-700">
          ⚙️
        </button>
         <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-base cursor-pointer">
          👤
        </div>
      </div>
    </header>
  );
};

export default TopNav;
