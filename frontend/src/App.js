import React from 'react';
import { Routes, Route } from 'react-router-dom';
import LoginPage from './components/LoginPage';
import ParentPage from './pages/ParentPage';
import StudentPage from './pages/StudentPage';
import DoctorPage from './pages/DoctorPage';
import AdminPage from './pages/AdminPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/parents" element={<ParentPage />} />
      <Route path="/students" element={<StudentPage />} />
      <Route path="/doctors" element={<DoctorPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="*" element={<h1>404 Not Found</h1>} />
    </Routes>
  );
}

export default App;
