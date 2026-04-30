import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// SỬA DÒNG NÀY: Trỏ đúng vào file DashboardLayout mà mình và bạn vừa sửa xong
import Layout from './layouts/DashboardLayout'; 

import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Reports from './pages/Reports';

function App() {
  const isAuthenticated = true;

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route 
          path="/" 
          element={isAuthenticated ? <Layout /> : <Navigate to="/login" />}
        >
          <Route index element={<Dashboard />} />
          <Route path="hr" element={<div className="p-4 text-2xl font-bold">HR Data Module (Pending)</div>} />
          <Route path="payroll" element={<div className="p-4 text-2xl font-bold">Payroll Module (Pending)</div>} />
          
          {/* Route này đã chuẩn với Link to="/reports" trong Sidebar */}
          <Route path="reports" element={<Reports />} /> 
          
          <Route path="settings" element={<div className="p-4 text-2xl font-bold">Settings Module (Pending)</div>} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;