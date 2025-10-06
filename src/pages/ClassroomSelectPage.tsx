import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../hooks/useAuth";
import { useCourses } from "../hooks/useCourses";
import TopNav from "../components/layout/TopNav";
import { Classroom } from "../types";

const ClassroomSelectPage: React.FC = () => {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { courses, isLoading: coursesLoading, fetchCourses, createCourse } = useCourses();

  // API에서 가져온 과목들을 Classroom 형식으로 변환
  const recentClassrooms: Classroom[] = courses.map(course => ({
    id: course.courseId,
    title: course.title,
    subtitle: `${new Date().toLocaleDateString()} · 소스 없음`,
  }));


  const handleClick = (item: Classroom): void => {
    // 선생님 강의실로 이동 (임시)
    navigate("/teacher");
  };

  // 컴포넌트 마운트 시 과목 목록 가져오기
  useEffect(() => {
    if (isAuthenticated) {
      fetchCourses();
    }
  }, [isAuthenticated, fetchCourses]);

  // 인증되지 않은 경우 로그인 페이지로 리다이렉트
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, authLoading, navigate]);

  const handleCreateClassroom = async (): Promise<void> => {
    const title = prompt("강의실 이름을 입력해주세요:");
    if (!title) return;

    const description = prompt("강의실 설명을 입력해주세요 (선택사항):") || "";
    
    const result = await createCourse({ title, description });
    if (result.success) {
      alert("강의실이 생성되었습니다!");
      fetchCourses(); // 목록 새로고침
    } else {
      alert(`강의실 생성에 실패했습니다: ${result.error}`);
    }
  };

  return (
    <div className={`flex flex-col h-screen transition-colors ${
      isDarkMode 
        ? "bg-gray-900 text-white" 
        : "bg-gray-50 text-gray-900"
    }`}>
      <TopNav />
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* 좌측 사이드바 */}
        <aside className={`w-60 h-full overflow-y-auto border-r scrollbar-hide transition-colors ${
          isDarkMode 
            ? "bg-gray-800 border-gray-700" 
            : "bg-white border-gray-100"
        }`}>
          <div className="p-4">
            <h3 className={`text-lg font-semibold m-0 ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}>강의실 관리</h3>
          </div>
          <div className="flex-1">
            {/* 메뉴 아이템들 */}
            <div className="space-y-1 px-4">
              <button
                onClick={handleCreateClassroom}
                className={`w-full text-left px-4 py-3 rounded-md transition-colors cursor-pointer ${
                  isDarkMode
                    ? "text-gray-300 hover:bg-gray-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                새 강의실 만들기
              </button>
            </div>
          </div>
        </aside>

        {/* 메인 컨텐츠 */}
        <main className={`flex-1 min-h-0 p-6 overflow-y-auto scrollbar-hide transition-colors ${
          isDarkMode ? "bg-gray-800" : "bg-white"
        }`}>
          <h2 className={`text-2xl font-bold mb-6 ${
            isDarkMode ? "text-white" : "text-gray-900"
          }`}>강의실</h2>

          {coursesLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className={`text-lg ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
                강의실 목록을 불러오는 중...
              </div>
            </div>
          ) : recentClassrooms.length === 0 ? (
            <div className="flex flex-col justify-center items-center py-12">
              <div className={`text-lg ${isDarkMode ? "text-gray-300" : "text-gray-600"} mb-4`}>
                등록된 강의실이 없습니다
              </div>
              <div className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                좌측 사이드바에서 "새 강의실 만들기"를 클릭하여 강의실을 생성해보세요
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl">
              {recentClassrooms.map((item) => (
              <button
                key={item.id}
                onClick={() => handleClick(item)}
                className={`h-44 rounded-2xl border transition-all duration-200 hover:-translate-y-1 shadow-sm text-left p-6 ${
                  isDarkMode 
                    ? "bg-gray-700 border-gray-600 hover:bg-gray-600" 
                    : "bg-gray-100 border-gray-200 hover:bg-gray-200"
                }`}
              >
                <div className="flex flex-col justify-between h-full">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${
                      isDarkMode 
                        ? "bg-gray-600 text-gray-300" 
                        : "bg-gray-200 text-gray-600"
                    }`}>$</div>
                    <div className={`text-lg font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>{item.title}</div>
                  </div>
                  <div className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>{item.subtitle}</div>
                </div>
              </button>
            ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default ClassroomSelectPage;
