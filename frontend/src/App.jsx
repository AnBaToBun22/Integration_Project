import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Import Layout chuẩn
import Layout from './layouts/DashboardLayout';

// Import các trang con
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Reports from './pages/Reports';
import HRData from './pages/HRData';
import Events from './pages/Events';
import Payroll from './pages/Payroll';
import Department from './pages/Department';
import Positions from './pages/Positions';
import Settings from './pages/Settings';

function App() {
  // Kiểm tra token thật từ localStorage thay vì hardcode
  const token = localStorage.getItem('token');
  const isAuthenticated = !!token;

  return (
    <Router>
      <Routes>
        {/* Trang đăng nhập nằm ngoài Layout chung */}
        <Route path="/login" element={
          isAuthenticated ? <Navigate to="/" /> : <Login />
        } />

        {/* Các trang yêu cầu đăng nhập sẽ nằm bên trong Layout */}
        <Route
          path="/"
          element={isAuthenticated ? <Layout /> : <Navigate to="/login" />}
        >
          {/* Trang chủ mặc định */}
          <Route index element={<Dashboard />} />

          {/* TRANG NHÂN SỰ */}
          <Route path="hr" element={<HRData />} />

          {/* TRANG SỰ KIỆN: UC.14 */}
          <Route path="events" element={<Events />} />

          {/* TRANG LƯƠNG: UC.15 */}
          <Route path="payroll" element={<Payroll />} />

          {/* TRANG BÁO CÁO: UC.11, 12, 13 */}
          <Route path="reports" element={<Reports />} />

          {/* TRANG PHÒNG BAN */}
          <Route path="departments" element={<Department />} />

          {/* TRANG CHỨC VỤ (MỚI) */}
          <Route path="positions" element={<Positions />} />

          {/* TRANG CÀI ĐẶT & AUDIT LOGS */}
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* Chuyển hướng nếu vào link lạ */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;