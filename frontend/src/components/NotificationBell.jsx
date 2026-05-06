import React, { useState, useEffect, useRef } from 'react';
import { Bell, AlertTriangle, AlertCircle, Gift, CheckCircle, Info } from 'lucide-react';

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'alert', 'warning', 'info'
  const dropdownRef = useRef(null);

  const [notifications, setNotifications] = useState([]);

  // Lấy dữ liệu thật từ Backend
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const token = localStorage.getItem('token') || 'dummy-token';
        // Có thể gọi tới localhost:5000/api/alerts
        const response = await fetch('http://localhost:5000/api/alerts', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          // Nếu backend trả về mảng rỗng thì để mảng rỗng, nếu có data thì set
          if (data && data.length > 0) {
            setNotifications(data);
          }
        }
      } catch (error) {
        console.error("Lỗi khi fetch alerts:", error);
      }
    };

    fetchAlerts();
    // Set interval để tự động cập nhật mỗi 1 phút (tùy chọn)
    const intervalId = setInterval(fetchAlerts, 60000);
    return () => clearInterval(intervalId);
  }, []);

  // Đếm số thông báo chưa đọc
  const unreadCount = notifications.filter(n => !n.read).length;

  // Lọc thông báo
  const filteredNotifications = notifications.filter(n => {
    if (filter === 'all') return true;
    return n.type === filter;
  });

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Đánh dấu tất cả đã đọc
  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const getIcon = (type) => {
    switch (type) {
      case 'alert': return <AlertCircle className="text-red-500" size={20} />;
      case 'warning': return <AlertTriangle className="text-yellow-500" size={20} />;
      case 'info': return <Gift className="text-blue-500" size={20} />;
      default: return <Info className="text-gray-500" size={20} />;
    }
  };

  const getBgColor = (type, read) => {
    if (read) return 'bg-white border-gray-100 opacity-75';
    switch (type) {
      case 'alert': return 'bg-red-50 border-red-200';
      case 'warning': return 'bg-yellow-50 border-yellow-200';
      case 'info': return 'bg-blue-50 border-blue-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const getIndicatorColor = (type) => {
    switch (type) {
      case 'alert': return 'bg-red-500';
      case 'warning': return 'bg-yellow-500';
      case 'info': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Nút Chuông báo */}
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="text-gray-500 hover:text-blue-600 focus:outline-none p-2 relative rounded-full hover:bg-gray-100 transition-colors"
      >
        <Bell size={22} className={unreadCount > 0 ? "animate-pulse text-blue-600" : ""} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-sm">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Panel Dropdown - Giao diện Facebook style */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden flex flex-col max-h-[600px] animate-in fade-in slide-in-from-top-5 duration-200">
          
          {/* Header */}
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
            <h3 className="text-xl font-bold text-gray-800">Thông báo</h3>
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center"
              >
                <CheckCircle size={16} className="mr-1" />
                Đánh dấu đã đọc
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex px-2 pt-2 bg-gray-50/50 border-b border-gray-100">
            <button 
              onClick={() => setFilter('all')} 
              className={`px-4 py-2 text-sm font-medium rounded-full mb-2 mr-1 transition-colors ${filter === 'all' ? 'bg-gray-200 text-gray-800' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              Tất cả
            </button>
            <button 
              onClick={() => setFilter('alert')} 
              className={`px-3 py-2 text-sm font-medium rounded-full mb-2 mr-1 transition-colors ${filter === 'alert' ? 'bg-red-100 text-red-700' : 'text-gray-500 hover:bg-red-50 hover:text-red-600'}`}
            >
              Lương (Đỏ)
            </button>
            <button 
              onClick={() => setFilter('warning')} 
              className={`px-3 py-2 text-sm font-medium rounded-full mb-2 mr-1 transition-colors ${filter === 'warning' ? 'bg-yellow-100 text-yellow-700' : 'text-gray-500 hover:bg-yellow-50 hover:text-yellow-600'}`}
            >
              Nghỉ phép (Vàng)
            </button>
            <button 
              onClick={() => setFilter('info')} 
              className={`px-3 py-2 text-sm font-medium rounded-full mb-2 transition-colors ${filter === 'info' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-blue-50 hover:text-blue-600'}`}
            >
              Sự kiện (Xanh)
            </button>
          </div>

          {/* Danh sách thông báo */}
          <div className="overflow-y-auto flex-1 p-2 space-y-1">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500 flex flex-col items-center">
                <Bell size={40} className="text-gray-300 mb-3" />
                <p>Bạn không có thông báo nào ở mục này.</p>
              </div>
            ) : (
              filteredNotifications.map((notif) => (
                <div 
                  key={notif.id} 
                  className={`p-3 rounded-lg border cursor-pointer hover:shadow-md transition-all flex items-start relative overflow-hidden group ${getBgColor(notif.type, notif.read)}`}
                  onClick={() => {
                    // Mark as read when clicked
                    setNotifications(notifications.map(n => n.id === notif.id ? { ...n, read: true } : n));
                  }}
                >
                  {/* Indicator bar at the left edge */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${getIndicatorColor(notif.type)}`}></div>
                  
                  <div className="mt-1 mr-3 p-2 bg-white rounded-full shadow-sm">
                    {getIcon(notif.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <p className={`text-sm font-bold truncate pr-4 ${notif.read ? 'text-gray-700' : 'text-gray-900'}`}>
                        {notif.title}
                      </p>
                      <span className="text-[11px] font-medium text-blue-600 whitespace-nowrap mt-0.5">
                        {notif.time}
                      </span>
                    </div>
                    <p className={`text-sm mt-1 line-clamp-2 ${notif.read ? 'text-gray-500' : 'text-gray-700'}`}>
                      {notif.message}
                    </p>
                  </div>

                  {/* Dot xanh hiển thị chưa đọc */}
                  {!notif.read && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-blue-600 rounded-full"></div>
                  )}
                </div>
              ))
            )}
          </div>
          
          {/* Footer */}
          <div className="p-3 border-t border-gray-100 bg-gray-50 text-center">
            <a href="#" className="text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline">
              Xem tất cả báo cáo và cảnh báo
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
