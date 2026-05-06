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
import Positions from './pages/Positions';
import Alerts from './pages/Alerts';
import Settings from './pages/Settings';

function App() {
  // Kiểm tra trạng thái đăng nhập thật từ localStorage
  const isAuthenticated = !!localStorage.getItem('token');

  return (
    <Router>
      <Routes>
        {/* Trang đăng nhập nằm ngoài Layout chung */}
        <Route path="/login" element={isAuthenticated ? <Navigate to="/" /> : <Login />} />
        
        {/* Các trang yêu cầu đăng nhập sẽ nằm bên trong Layout */}
        <Route 
          path="/" 
          element={isAuthenticated ? <Layout /> : <Navigate to="/login" />}
        >
          {/* Trang chủ mặc định */}
          <Route index element={<Dashboard />} />
          
          {/* TRANG NHÂN SỰ */}
          <Route path="hr" element={<HRData />} />
          
          {/* TRANG LƯƠNG */}
          <Route path="payroll" element={<Payroll />} />
          
          {/* TRANG BÁO CÁO */}
          <Route path="reports" element={<Reports />} /> 

          {/* TRANG PHÒNG BAN */}
          <Route path="departments" element={<Department />} />

          {/* TRANG CHỨC VỤ */}
          <Route path="positions" element={<Positions />} />

          {/* TRANG CẢNH BÁO */}
          <Route path="alerts" element={<Alerts />} />
          
          {/* TRANG CÀI ĐẶT */}
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* Chuyển hướng nếu vào link lạ */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;