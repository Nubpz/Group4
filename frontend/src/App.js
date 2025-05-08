import React from 'react';
import { Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import ParentPage from './pages/ParentPage/ParentPage';
import StudentPage from './pages/StudentPage/StudentPage';
import DoctorPage from './pages/DoctorPage';
import AdminPage from './pages/AdminPage/AdminPage';
import Chatbot from './pages/Chatbot';
import ResetPasswordPage from './pages/ResetPasswordPage';

function App() {
  return (
    <>
    <Chatbot />
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/parents" element={<ParentPage />} />
      <Route path="/students" element={<StudentPage />} />
      <Route path="/doctors" element={<DoctorPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="*" element={<h1>404 Not Found</h1>} />
    </Routes>
    </>
  );
}

export default App;
