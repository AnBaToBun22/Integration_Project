import React, { useState } from 'react';
import AuditLogs from './AuditLogs'; // Import cái bảng log vào đây

const Settings = () => {
  // State để lưu trữ xem Tab nào đang được chọn (mặc định là 'logs')
  const [activeTab, setActiveTab] = useState('logs');

  return (
    <div className="flex flex-col gap-6">
      {/* Thanh Menu Tabs */}
      <div className="bg-white p-4 rounded-xl shadow-md">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b pb-2">Cài Đặt & Cấu Hình</h2>
        
        <div className="flex space-x-2">
          {/* Nút Tab: Lịch sử hệ thống */}
          <button 
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 font-semibold rounded-lg transition-colors ${
              activeTab === 'logs' 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Lịch Sử Hệ Thống
          </button>

          {/* Nút Tab: Cấu hình tài khoản (Ví dụ thêm) */}
          <button 
            onClick={() => setActiveTab('account')}
            className={`px-4 py-2 font-semibold rounded-lg transition-colors ${
              activeTab === 'account' 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Tài Khoản Auth
          </button>

          {/* Nút Tab: Cài đặt kết nối (Ví dụ thêm) */}
          <button 
            onClick={() => setActiveTab('database')}
            className={`px-4 py-2 font-semibold rounded-lg transition-colors ${
              activeTab === 'database' 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Kết Nối Database
          </button>
        </div>
      </div>

      {/* Khu vực hiển thị nội dung tùy theo Tab được chọn */}
      <div className="w-full">
        {activeTab === 'logs' && (
          // Khúc này tôi bỏ bớt cái padding và margin thừa của AuditLogs để nó vừa khít
          <div className="-mt-8"> 
            <AuditLogs />
          </div>
        )}
        
        {activeTab === 'account' && (
          <div className="bg-white p-6 rounded-xl shadow-md text-center text-gray-500 py-20">
            <h3 className="text-xl font-bold mb-2">Quản Lý Tài Khoản (Pending)</h3>
            <p>Tính năng đổi mật khẩu và phân quyền sẽ hiển thị ở đây.</p>
          </div>
        )}

        {activeTab === 'database' && (
          <div className="bg-white p-6 rounded-xl shadow-md text-center text-gray-500 py-20">
            <h3 className="text-xl font-bold mb-2">Kết Nối Hệ Thống (Pending)</h3>
            <p>Thông tin kết nối đến HUMAN_2025 và PAYROLL sẽ hiển thị ở đây.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;