import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import ClassroomSelectPage from './pages/ClassroomSelectPage';
import Student from './pages/Student';
import SignupPage from './pages/SignupPage';
import Students from './pages/Students';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ClassroomSelectPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/teacher" element={<AppLayout />} />
        <Route path="/teacher/:week" element={<AppLayout />} />
        <Route path="/teacher/students" element={<Students />} />
        <Route path="/student" element={<AppLayout />} />
        <Route path="/student/:week" element={<AppLayout />} />
        <Route path="/student/students" element={<Students />} />
      </Routes>
    </Router>
  );
};

export default App;
