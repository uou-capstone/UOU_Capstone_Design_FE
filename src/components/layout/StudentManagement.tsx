import React from "react";
import { useTheme } from "../../contexts/ThemeContext";

interface StudentRow {
  id: number;
  name: string;
  level: string;
  progress: number;
  score: number;
}

const StudentManagement: React.FC = () => {
  const { isDarkMode } = useTheme();
  const rows: StudentRow[] = Array.from({ length: 12 }).map((_, i) => ({
    id: i + 1,
    name: `학생 ${i + 1}`,
    level: ["낮음", "중간", "높음"][i % 3],
    progress: Math.floor(Math.random() * 100),
    score: [77, 71, 56, 57, 97, 50, 52, 0, 94, 0, 50, 0][i] || 0,
  }));

  return (
    <div className="max-w-6xl mx-auto">
      <h2 className={`text-2xl font-bold mb-6 transition-colors ${
        isDarkMode ? "text-white" : "text-gray-900"
      }`}>학생 관리</h2>
      <div className={`rounded-xl overflow-hidden transition-colors ${
        isDarkMode ? "bg-gray-700" : "bg-white border border-gray-200"
      }`}>
        <div className={`grid grid-cols-6 gap-4 px-6 py-4 text-sm border-b transition-colors ${
          isDarkMode 
            ? "text-gray-300 border-gray-700" 
            : "text-gray-600 border-gray-200"
        }`}>
          <div>학생</div>
          <div>수업 역량</div>
          <div>강의 진행 상황</div>
          <div>성취도 (0-10)</div>
          <div>퀴즈 점수</div>
          <div></div>
        </div>
        {rows.map((r) => (
          <div key={r.id} className={`grid grid-cols-6 gap-4 px-6 py-4 text-sm items-center border-b transition-colors ${
            isDarkMode 
              ? "border-gray-600 hover:bg-gray-600" 
              : "border-gray-200 hover:bg-gray-50"
          }`}>
            <div className={`transition-colors ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}>{r.name}</div>
            <div>
              <span className={`px-2 py-1 rounded text-xs ${
                r.level === "높음" ? "bg-green-600" : 
                r.level === "중간" ? "bg-yellow-600" : "bg-red-600"
              }`}>{r.level}</span>
            </div>
            <div>
              <div className={`w-full rounded h-2 transition-colors ${
                isDarkMode ? "bg-gray-600" : "bg-gray-200"
              }`}>
                <div className="bg-blue-500 h-2 rounded" style={{ width: `${r.progress}%` }} />
              </div>
            </div>
            <div className="text-yellow-400">{"★".repeat((r.id % 5) + 1)}{"☆".repeat(5 - ((r.id % 5) + 1))}</div>
            <div className={`transition-colors ${
              isDarkMode ? "text-gray-300" : "text-gray-600"
            }`}>{r.score ? `${r.score} / 100` : "N/A"}</div>
            <div>
              <button className={`transition-colors hover:underline ${
                isDarkMode ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-500"
              }`}>보고서 보기</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StudentManagement;
