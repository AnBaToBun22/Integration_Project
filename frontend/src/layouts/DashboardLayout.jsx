import React, { useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
// Giả sử dùng icon từ thư viện lucide-react hoặc react-icons
import { Users, DollarSign, BarChart2, Bell, LogOut, Menu } from 'lucide-react';

const DashboardLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Lấy Role từ tài liệu SRS của bạn (Admin, HR Manager, Payroll Manager, Employee)
  const userRole = "HR Manager"; 

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      
      {/* SIDEBAR */}
      <aside className={`bg-blue-900 text-white transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-20'} flex flex-col`}>
        <div className="h-16 flex items-center justify-center border-b border-blue-800">
          <h1 className={`font-bold text-xl transition-all ${!isSidebarOpen && 'hidden'}`}>
            Company X HR
          </h1>
          {!isSidebarOpen && <span className="font-bold text-xl">X</span>}
        </div>

        <nav className="flex-1 py-4 px-3 space-y-2">
          <Link to="/employees" className="flex items-center px-4 py-3 bg-blue-800 rounded-lg hover:bg-blue-700 transition">
            <Users size={20} />
            <span className={`ml-4 ${!isSidebarOpen && 'hidden'}`}>Quản lý Nhân sự</span>
          </Link>
          <Link to="/payroll" className="flex items-center px-4 py-3 rounded-lg hover:bg-blue-700 transition">
            <DollarSign size={20} />
            <span className={`ml-4 ${!isSidebarOpen && 'hidden'}`}>Quản lý Lương</span>
          </Link>
          <Link to="/reports" className="flex items-center px-4 py-3 rounded-lg hover:bg-blue-700 transition">
            <BarChart2 size={20} />
            <span className={`ml-4 ${!isSidebarOpen && 'hidden'}`}>Báo cáo</span>
          </Link>
          <Link to="/notifications" className="flex items-center px-4 py-3 rounded-lg hover:bg-blue-700 transition">
            <Bell size={20} />
            <span className={`ml-4 ${!isSidebarOpen && 'hidden'}`}>Thông báo</span>
          </Link>
        </nav>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* HEADER */}
        <header className="h-16 bg-white shadow-sm flex items-center justify-between px-6 z-10">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-gray-500 hover:text-blue-600 focus:outline-none">
            <Menu size={24} />
          </button>

          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-700">Phan Quang Hiếu</p>
              <p className="text-xs text-gray-500">{userRole}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold border border-blue-300">
              PQ
            </div>
            <button className="text-gray-400 hover:text-red-500 ml-2">
              <LogOut size={20} />
            </button>
          </div>
        </header>

        {/* PAGE CONTENT (Nơi chứa các trang con như Bảng nhân viên, Báo cáo) */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
          <Outlet /> {/* React Router sẽ render nội dung trang con vào đây */}
        </main>

      </div>
    </div>
  );
};

export default DashboardLayout;