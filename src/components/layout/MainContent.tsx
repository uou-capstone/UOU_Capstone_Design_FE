import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTheme } from "../../contexts/ThemeContext";
import type { Course, CourseDetail } from "../../services/api";

type ViewMode = "course-list" | "course-detail";

interface MainContentProps {
  viewMode: ViewMode;
  courses: Course[];
  isCoursesLoading: boolean;
  coursesError: string | null;
  onSelectCourse: (courseId: number) => void;
  onBackToCourses: () => void;
  courseDetail: CourseDetail | null;
  isCourseDetailLoading: boolean;
  courseDetailError: string | null;
  selectedLectureId: number | null;
  onSelectLecture: (lectureId: number) => void;
  lectureMarkdown?: string;
  fileUrl?: string;
  fileName?: string;
}

const MainContent: React.FC<MainContentProps> = ({
  viewMode,
  courses,
  isCoursesLoading,
  coursesError,
  onSelectCourse,
  onBackToCourses,
  courseDetail,
  isCourseDetailLoading,
  courseDetailError,
  selectedLectureId,
  onSelectLecture,
  lectureMarkdown,
  fileUrl,
  fileName,
}) => {
  const { isDarkMode } = useTheme();

  const renderCourseList = () => {
    if (isCoursesLoading) {
      return (
        <div
          className={`h-full flex items-center justify-center ${
            isDarkMode ? "text-gray-400" : "text-gray-500"
          }`}
        >
          <div className="text-center">
            <p className="text-lg font-medium mb-2">과목 목록을 불러오는 중...</p>
            <p className="text-sm">잠시만 기다려주세요.</p>
          </div>
        </div>
      );
    }

    if (coursesError) {
      return (
        <div
          className={`h-full flex items-center justify-center ${
            isDarkMode ? "text-red-400" : "text-red-600"
          }`}
        >
          <div className="text-center">
            <p className="text-lg font-medium mb-2">과목 목록을 불러오지 못했습니다.</p>
            <p className="text-sm">{coursesError}</p>
          </div>
        </div>
      );
    }

    if (!courses.length) {
      return (
        <div
          className={`h-full flex items-center justify-center ${
            isDarkMode ? "text-gray-400" : "text-gray-500"
          }`}
        >
          <div className="text-center space-y-2">
            <p className="text-lg font-medium">등록된 과목이 없습니다.</p>
            <p className="text-sm">
              오른쪽 사이드바의 + 버튼을 눌러 과목을 생성해보세요.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold mb-1">내 과목</h2>
          <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
            등록된 과목을 선택하면 상세 정보를 확인하고 강의를 생성할 수 있습니다.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {courses.map((course) => (
            <button
              key={course.courseId}
              onClick={() => onSelectCourse(course.courseId)}
              className={`text-left p-5 rounded-xl border shadow-sm transition-all ${
                isDarkMode
                  ? "bg-gray-800 border-gray-700 hover:border-blue-500 hover:shadow-blue-500/30"
                  : "bg-white border-gray-200 hover:border-blue-500/40 hover:shadow-blue-500/20"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-lg font-semibold">{course.title}</h3>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    isDarkMode ? "bg-blue-600/30 text-blue-200" : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {course.teacherName}
                </span>
              </div>
              {course.description && (
                <p
                  className={`mt-3 text-sm line-clamp-3 ${
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  {course.description}
                </p>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderCourseDetail = () => {
    if (isCourseDetailLoading) {
      return (
        <div
          className={`h-full flex items-center justify-center ${
            isDarkMode ? "text-gray-400" : "text-gray-500"
          }`}
        >
          <div className="text-center">
            <p className="text-lg font-medium mb-2">과목 정보를 불러오는 중...</p>
            <p className="text-sm">잠시만 기다려주세요.</p>
          </div>
        </div>
      );
    }

    if (courseDetailError || !courseDetail) {
      return (
        <div
          className={`h-full flex items-center justify-center ${
            isDarkMode ? "text-red-400" : "text-red-600"
          }`}
        >
          <div className="text-center space-y-2">
            <p className="text-lg font-medium">과목 정보를 불러오지 못했습니다.</p>
            {courseDetailError && <p className="text-sm">{courseDetailError}</p>}
            <button
              onClick={onBackToCourses}
              className={`mt-2 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg ${
                isDarkMode
                  ? "bg-gray-800 hover:bg-gray-700 text-white"
                  : "bg-gray-200 hover:bg-gray-300 text-gray-800"
              }`}
            >
              과목 목록으로 돌아가기
            </button>
          </div>
        </div>
      );
    }

    const hasLectureContent = Boolean(lectureMarkdown) || Boolean(fileUrl);

    return (
      <div className="flex flex-col gap-6 h-full">
        <div
          className={`p-6 rounded-xl border ${
            isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <button
                onClick={onBackToCourses}
                className={`text-sm mb-3 inline-flex items-center gap-1 ${
                  isDarkMode ? "text-blue-300 hover:text-blue-200" : "text-blue-600 hover:text-blue-500"
                }`}
              >
                ← 과목 목록으로
              </button>
              <h2 className="text-2xl font-semibold">{courseDetail.title}</h2>
              <div className={`mt-2 text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                담당: {courseDetail.teacherName}
              </div>
            </div>
          </div>
          {courseDetail.description && (
            <p className={`mt-4 text-sm ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
              {courseDetail.description}
            </p>
          )}
        </div>

        <div
          className={`flex-1 rounded-xl border overflow-hidden ${
            isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
          }`}
        >
          <div
            className={`flex items-center justify-between px-6 py-4 border-b ${
              isDarkMode ? "border-gray-700" : "border-gray-200"
            }`}
          >
            <div>
              <h3 className="text-lg font-semibold">강의 목록</h3>
              <p className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                강의를 선택하면 오른쪽에서 자료 생성 및 업로드를 진행할 수 있습니다.
              </p>
            </div>
            <span
              className={`text-xs px-2 py-1 rounded-full ${
                isDarkMode ? "bg-blue-600/30 text-blue-200" : "bg-blue-100 text-blue-700"
              }`}
            >
              총 {courseDetail.lectures?.length ?? 0}개
            </span>
          </div>

          <div className="max-h-[50vh] overflow-y-auto divide-y divide-gray-200/20">
            {courseDetail.lectures && courseDetail.lectures.length > 0 ? (
              courseDetail.lectures.map((lecture) => {
                const isSelected = selectedLectureId === lecture.lectureId;
                return (
                  <button
                    key={lecture.lectureId}
                    onClick={() => onSelectLecture(lecture.lectureId)}
                    className={`w-full text-left px-6 py-4 transition-colors ${
                      isSelected
                        ? isDarkMode
                          ? "bg-blue-600/20 text-blue-200"
                          : "bg-blue-50 text-blue-700"
                        : isDarkMode
                        ? "hover:bg-gray-700 text-gray-200"
                        : "hover:bg-gray-100 text-gray-700"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{lecture.title}</span>
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full ${
                          isDarkMode ? "bg-gray-700 text-gray-300" : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {lecture.weekNumber}주차
                      </span>
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full ${
                          lecture.aiGeneratedStatus === "COMPLETED"
                            ? "bg-green-500/20 text-green-400"
                            : lecture.aiGeneratedStatus === "PROCESSING"
                            ? "bg-yellow-500/20 text-yellow-500"
                            : lecture.aiGeneratedStatus === "FAILED"
                            ? "bg-red-500/20 text-red-400"
                            : "bg-gray-500/20 text-gray-400"
                        }`}
                      >
                        {lecture.aiGeneratedStatus}
                      </span>
                    </div>
                  </button>
                );
              })
            ) : (
              <div
                className={`px-6 py-12 text-center ${
                  isDarkMode ? "text-gray-400" : "text-gray-500"
                }`}
              >
                아직 등록된 강의가 없습니다.
              </div>
            )}
          </div>
        </div>

        {hasLectureContent ? (
          <div className="flex flex-col gap-6">
            {lectureMarkdown && (
              <div
                className={`p-6 rounded-xl shadow-sm border transition-colors overflow-y-auto max-h-full ${
                  isDarkMode
                    ? "bg-gray-800 border-gray-700 text-gray-100"
                    : "bg-white border-gray-200 text-gray-900"
                }`}
                style={{ maxHeight: "60vh" }}
              >
                <h2 className="text-xl font-semibold mb-4">AI 생성 강의 자료</h2>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  className={`prose prose-sm max-w-none leading-relaxed ${
                    isDarkMode ? "prose-invert" : ""
                  }`}
                >
                  {lectureMarkdown}
                </ReactMarkdown>
              </div>
            )}

            {fileUrl && (
              <div className="flex-1 min-h-0">
                {fileName?.toLowerCase().endsWith(".pdf") ? (
                  <iframe
                    src={fileUrl}
                    className="w-full h-[60vh] border-0 rounded-lg shadow-sm"
                    title={fileName}
                  />
                ) : (
                  <div
                    className={`h-full flex items-center justify-center rounded-xl border transition-colors ${
                      isDarkMode
                        ? "border-gray-700 bg-gray-800 text-gray-200"
                        : "border-gray-200 bg-white text-gray-700"
                    }`}
                  >
                    <div className="text-center">
                      <p className="text-lg font-medium mb-2">파일 다운로드</p>
                      <a
                        href={fileUrl}
                        download={fileName}
                        className={`inline-block px-4 py-2 rounded-lg ${
                          isDarkMode
                            ? "bg-blue-600 hover:bg-blue-700 text-white"
                            : "bg-blue-500 hover:bg-blue-600 text-white"
                        }`}
                      >
                        {fileName} 다운로드
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div
            className={`flex-1 flex items-center justify-center rounded-xl border ${
              isDarkMode
                ? "border-gray-800 bg-gray-900 text-gray-500"
                : "border-gray-200 bg-white text-gray-500"
            }`}
          >
            <div className="text-center space-y-2">
              <p className="text-lg font-medium">
                오른쪽 사이드바에서 강의를 생성하거나 선택해주세요.
              </p>
              <p className="text-sm">AI 생성 결과와 업로드 파일이 이 영역에 표시됩니다.</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={`flex-1 min-h-0 p-6 overflow-y-auto scrollbar-hide transition-colors ${
        isDarkMode ? "bg-gray-900" : "bg-gray-50"
      }`}
    >
      {viewMode === "course-list" ? renderCourseList() : renderCourseDetail()}
    </div>
  );
};

export default MainContent;
