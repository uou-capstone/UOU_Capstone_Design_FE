import React from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import AppLayout from './components/layout/AppLayout.tsx';

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AppLayout />
    </ThemeProvider>
  );
};

export default App;
