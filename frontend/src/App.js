import React from 'react';
import { Routes, Route } from 'react-router-dom';
import AuthPage from './pages/LoginPage';
import ParentPage from './pages/ParentPage/ParentPage';
import StudentPage from './pages/StudentPage/StudentPage';
import DoctorPage from './pages/DoctorPage';
import AdminPage from './pages/AdminPage/AdminPage';
import Chatbot from './pages/Chatbot';

function App() {
  return (
    <>
    <Chatbot />
    <Routes>
      <Route path="/" element={<AuthPage />} />
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
