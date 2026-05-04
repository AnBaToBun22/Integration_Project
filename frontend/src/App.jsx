import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Import Layout chuẩn
import Layout from './layouts/DashboardLayout'; 

// Import các trang con
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Reports from './pages/Reports';
import HRData from './pages/HRData';
import Payroll from './pages/Payroll'; // 1. ĐÃ IMPORT

function App() {
  // Giả lập trạng thái đăng nhập
  const isAuthenticated = true;

  return (
    <Router>
      <Routes>
        {/* Trang đăng nhập nằm ngoài Layout chung */}
        <Route path="/login" element={<Login />} />
        
        {/* Các trang yêu cầu đăng nhập sẽ nằm bên trong Layout */}
        <Route 
          path="/" 
          element={isAuthenticated ? <Layout /> : <Navigate to="/login" />}
        >
          {/* Trang chủ mặc định */}
          <Route index element={<Dashboard />} />
          
          {/* TRANG NHÂN SỰ */}
          <Route path="hr" element={<HRData />} />
          
          {/* TRANG LƯƠNG: 2. ĐÃ GẮN ĐÚNG COMPONENT */}
          <Route path="payroll" element={<Payroll />} />
          
          {/* TRANG BÁO CÁO */}
          <Route path="reports" element={<Reports />} /> 
          
          {/* TRANG CÀI ĐẶT */}
          <Route path="settings" element={<div className="p-4 text-2xl font-bold text-gray-700">Settings Module (Pending)</div>} />
        </Route>

        {/* Chuyển hướng nếu vào link lạ */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;