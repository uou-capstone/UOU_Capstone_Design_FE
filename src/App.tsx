import React, { useState } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import AppLayout from './components/layout/AppLayout.tsx';
import ApiTestPage from './pages/ApiTestPage';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<'main' | 'api-test'>('main');

  return (
    <ThemeProvider>
      {currentPage === 'api-test' ? (
        <div>
          <div className="fixed top-4 right-4 z-50">
            <button
              onClick={() => setCurrentPage('main')}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              메인으로 돌아가기
            </button>
          </div>
          <ApiTestPage />
        </div>
      ) : (
        <AppLayout onNavigateToApiTest={() => setCurrentPage('api-test')} />
      )}
    </ThemeProvider>
  );
};

export default App;
