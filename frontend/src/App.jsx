import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';

function App() {
  // Simple auth check simulation
  const isAuthenticated = true;

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Protected Routes */}
        <Route 
          path="/" 
          element={isAuthenticated ? <Layout /> : <Navigate to="/login" />}
        >
          <Route index element={<Dashboard />} />
          <Route path="hr" element={<div className="p-4">HR Data Module (Pending)</div>} />
          <Route path="payroll" element={<div className="p-4">Payroll Module (Pending)</div>} />
          <Route path="settings" element={<div className="p-4">Settings Module (Pending)</div>} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
