import React from "react";
import { useTheme } from "../../contexts/ThemeContext";

interface MainContentProps {
  fileUrl?: string;
  fileName?: string;
}

const MainContent: React.FC<MainContentProps> = ({ fileUrl, fileName }) => {
  const { isDarkMode } = useTheme();

  return (
    <div
      className={`flex-1 min-h-0 p-6 overflow-y-auto scrollbar-hide transition-colors ${
        isDarkMode ? "bg-gray-900" : "bg-gray-50"
      }`}
    >
      {fileUrl ? (
        <div className="h-full">
          {fileName?.endsWith('.pdf') ? (
            <iframe
              src={fileUrl}
              className="w-full h-full border-0 rounded-lg"
              title={fileName}
            />
          ) : (
            <div className={`h-full flex items-center justify-center ${
              isDarkMode ? "text-gray-400" : "text-gray-500"
            }`}>
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
      ) : (
        <div className={`h-full flex items-center justify-center ${
          isDarkMode ? "text-gray-400" : "text-gray-500"
        }`}>
          <div className="text-center">
            <p className="text-lg font-medium mb-2">강의 PDF 파일이 나오는 곳</p>
            <p className="text-sm">파일을 업로드하면 여기에 표시됩니다</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MainContent;
