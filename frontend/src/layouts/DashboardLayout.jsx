import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Home, Users, DollarSign, BarChart2, Settings, Bell, LogOut, Menu, Briefcase, Building2, AlertTriangle } from 'lucide-react';

const DashboardLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Lấy thông tin user thật từ localStorage (được lưu khi login)
  const username = localStorage.getItem('username') || 'User';
  const userRole = localStorage.getItem('role') || 'Employee';

  // Hàm đăng xuất
  const handleLogout = () => {
    setIsLoggingOut(true);
    setTimeout(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('username');
      localStorage.removeItem('user_id');
      navigate('/login');
      window.location.reload();
    }, 500);
  };

  // Menu items
  const menuItems = [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/hr', icon: Users, label: 'Nhân viên' },
    { path: '/departments', icon: Building2, label: 'Phòng ban' },
    { path: '/positions', icon: Briefcase, label: 'Chức vụ' },
    { path: '/payroll', icon: DollarSign, label: 'Bảng lương' },
    { path: '/reports', icon: BarChart2, label: 'Báo cáo' },
    { path: '/alerts', icon: AlertTriangle, label: 'Cảnh báo' },
    { path: '/settings', icon: Settings, label: 'Cài đặt' },
  ];

  const isActive = (path) => location.pathname === path ? "bg-blue-800" : "hover:bg-blue-700";

  return (
    <div className={`flex h-screen bg-gray-50 font-sans transition-opacity duration-500 ${isLoggingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
      
      {/* SIDEBAR */}
      <aside className={`bg-blue-900 text-white transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-20'} flex flex-col`}>
        <div className="h-16 flex items-center justify-center border-b border-blue-800">
          <h1 className={`font-bold text-xl transition-all ${!isSidebarOpen && 'hidden'}`}>
            EnterpriseDash
          </h1>
          {!isSidebarOpen && <span className="font-bold text-xl">ED</span>}
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link 
                key={item.path}
                to={item.path} 
                className={`flex items-center px-4 py-3 rounded-lg transition ${isActive(item.path)}`}
              >
                <Icon size={20} />
                <span className={`ml-4 ${!isSidebarOpen && 'hidden'}`}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Nút Logout ở cuối Sidebar */}
        <div className="p-4 border-t border-blue-800">
          <button 
            onClick={handleLogout} 
            disabled={isLoggingOut}
            className="flex items-center text-gray-300 hover:text-white transition-all duration-300 hover:translate-x-1 w-full px-2"
          >
            {isLoggingOut ? (
              <svg className="animate-spin h-5 w-5 text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <LogOut size={20} />
            )}
            <span className={`ml-4 ${!isSidebarOpen && 'hidden'}`}>
              {isLoggingOut ? 'Đang thoát...' : 'Đăng xuất'}
            </span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* HEADER */}
        <header className="h-16 bg-white shadow-sm flex items-center justify-between px-6 z-10">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-gray-500 hover:text-blue-600 focus:outline-none">
            <Menu size={24} />
          </button>

          <div className="flex items-center space-x-4">
            <Link to="/alerts" className="text-gray-400 hover:text-blue-600 relative">
              <Bell size={20} />
              <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"></span>
            </Link>
            <div className="text-right ml-4">
              <p className="text-sm font-semibold text-gray-700">{username}</p>
              <p className="text-xs text-gray-500">{userRole}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold border border-blue-300">
              {username.substring(0, 2).toUpperCase()}
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
          <Outlet /> 
        </main>

      </div>
    </div>
  );
};

export default DashboardLayout;