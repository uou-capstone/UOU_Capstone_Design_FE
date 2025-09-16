import React from "react";

const rows = Array.from({ length: 12 }).map((_, i) => ({
  id: i + 1,
  name: `학생 ${i + 1}`,
  level: ["낮음", "중간", "높음"][i % 3],
  progress: Math.floor(Math.random() * 100),
  score: [77, 71, 56, 57, 97, 50, 52, 0, 94, 0, 50, 0][i] || 0,
}));

const StudentManagement = () => {
  return (
    <div className="max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">학생 관리</h2>
      <div className="bg-gray-800 rounded-xl overflow-hidden">
        <div className="grid grid-cols-6 gap-4 px-6 py-4 text-sm text-gray-300 border-b border-gray-700">
          <div>학생</div>
          <div>수업 역량</div>
          <div>강의 진행 상황</div>
          <div>성취도 (0-10)</div>
          <div>퀴즈 점수</div>
          <div></div>
        </div>
        {rows.map((r) => (
          <div key={r.id} className="grid grid-cols-6 gap-4 px-6 py-4 text-sm items-center border-b border-gray-700">
            <div className="text-white">{r.name}</div>
            <div>
              <span className={`px-2 py-1 rounded text-xs ${r.level === "높음" ? "bg-green-600" : r.level === "중간" ? "bg-yellow-600" : "bg-red-600"}`}>{r.level}</span>
            </div>
            <div>
              <div className="w-full bg-gray-700 rounded h-2">
                <div className="bg-blue-500 h-2 rounded" style={{ width: `${r.progress}%` }} />
              </div>
            </div>
            <div className="text-yellow-400">{"★".repeat((r.id % 5) + 1)}{"☆".repeat(5 - ((r.id % 5) + 1))}</div>
            <div className="text-gray-300">{r.score ? `${r.score} / 100` : "N/A"}</div>
            <div>
              <button className="text-blue-400 hover:underline">보고서 보기</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StudentManagement;


