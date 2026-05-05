// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Import Layout chuẩn
import Layout from './layouts/DashboardLayout';

// Import các trang con
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Reports from './pages/Reports';
import HRData from './pages/HRData';
import Payroll from './pages/Payroll';
import Department from './pages/Department';
import AttendanceDetail from './pages/AttendanceDetail';

function App() {
  // Kiểm tra trạng thái đăng nhập thật từ localStorage
  const isAuthenticated = !!localStorage.getItem('token');

  return (
    <Router>
      <Routes>
        {/* Trang đăng nhập nằm ngoài Layout chung */}
        {/* Nếu đã login rồi mà vào /login thì redirect về Dashboard */}
        <Route 
          path="/login" 
          element={isAuthenticated ? <Navigate to="/" /> : <Login />} 
        />
        
        {/* Các trang yêu cầu đăng nhập sẽ nằm bên trong Layout */}
        <Route 
          path="/" 
          element={isAuthenticated ? <Layout /> : <Navigate to="/login" />}
        >
          {/* Trang chủ mặc định */}
          <Route index element={<Dashboard />} />
          
          {/* TRANG NHÂN SỰ */}
          <Route path="hr" element={<HRData />} />
          
          {/* TRANG PHÒNG BAN */}
          <Route path="departments" element={<Department />} />
          
          {/* TRANG LƯƠNG - Bảng lương tổng */}
          <Route path="payroll" element={<Payroll />} />
          
          {/* TRANG CHẤM CÔNG (riêng, nếu cần truy cập trực tiếp) */}
          <Route path="attendance" element={<AttendanceDetail />} />
          
          {/* TRANG BÁO CÁO */}
          <Route path="reports" element={<Reports />} /> 

          {/* TRANG CÀI ĐẶT */}
          <Route 
            path="settings" 
            element={<div className="p-4 text-2xl font-bold text-gray-700">Settings Module (Pending)</div>} 
          />
        </Route>

        {/* Chuyển hướng nếu vào link lạ */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;