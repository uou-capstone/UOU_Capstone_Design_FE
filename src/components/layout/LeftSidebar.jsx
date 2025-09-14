import React, { useState } from "react";

const LeftSidebar = () => {
  const [selectedWeek, setSelectedWeek] = useState(1);

  const weeks = [
    { id: 1, title: "1주차", date: "09/01 - 09/07" },
    { id: 2, title: "2주차", date: "09/08 - 09/14" },
    { id: 3, title: "3주차", date: "09/15 - 09/21" },
    { id: 4, title: "4주차", date: "09/22 - 09/28" },
    { id: 5, title: "5주차", date: "09/29 - 10/05" },
    { id: 6, title: "6주차", date: "10/06 - 10/12" },
    { id: 7, title: "7주차", date: "10/13 - 10/19" },
    { id: 8, title: "8주차", date: "10/20 - 10/26" },
    { id: 9, title: "9주차", date: "10/27 - 11/02" },
    { id: 10, title: "10주차", date: "11/03 - 11/09" },
    { id: 11, title: "11주차", date: "11/10 - 11/16" },
    { id: 12, title: "12주차", date: "11/17 - 11/23" },
  ];

  return (
    <aside className="w-70 bg-gray-800 border-r border-gray-700 flex flex-col overflow-y-auto">
      <div className="p-5 border-b border-gray-700">
        <h3 className="text-lg font-semibold text-white m-0">전체</h3>
      </div>

      <div className="flex-1 py-4">
        {weeks.map((week) => (
          <div
            key={week.id}
            className={`px-6 py-3 cursor-pointer transition-all border-l-4 border-transparent ${
              selectedWeek === week.id
                ? "bg-gray-700 border-l-blue-500"
                : "hover:bg-gray-700"
            }`}
            onClick={() => setSelectedWeek(week.id)}
          >
            <div className="text-sm font-medium text-white mb-1">
              {week.title}
            </div>
            <div className="text-xs text-gray-400">{week.date}</div>
          </div>
        ))}
      </div>
    </aside>
  );
};

export default LeftSidebar;
