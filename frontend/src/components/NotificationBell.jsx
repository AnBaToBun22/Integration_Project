import React, { useState, useEffect, useRef } from 'react';
import { Bell, AlertTriangle, AlertCircle, Gift, CheckCircle, Info } from 'lucide-react';
import api from '../services/api';

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const dropdownRef = useRef(null);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const response = await api.get('/alerts');
        if (response.data && response.data.length > 0) {
          setNotifications(response.data);
        }
      } catch (error) {
        console.error("Lỗi khi fetch alerts:", error);
      }
    };

    fetchAlerts();
    const intervalId = setInterval(fetchAlerts, 60000);
    return () => clearInterval(intervalId);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'all') return true;
    return n.type === filter;
  });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden flex flex-col max-h-[600px]">
          
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
            <h3 className="text-xl font-bold text-gray-800">Thông báo</h3>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center">
                <CheckCircle size={16} className="mr-1" /> Đánh dấu đã đọc
              </button>
            )}
          </div>

          <div className="flex px-2 pt-2 bg-gray-50/50 border-b border-gray-100">
            {[
              { id: 'all', label: 'Tất cả', style: 'bg-gray-200 text-gray-800' },
              { id: 'alert', label: 'Lương', style: 'bg-red-100 text-red-700' },
              { id: 'warning', label: 'Nghỉ phép', style: 'bg-yellow-100 text-yellow-700' },
              { id: 'info', label: 'Sự kiện', style: 'bg-blue-100 text-blue-700' },
            ].map(tab => (
              <button key={tab.id}
                onClick={() => setFilter(tab.id)} 
                className={`px-3 py-2 text-sm font-medium rounded-full mb-2 mr-1 transition-colors ${
                  filter === tab.id ? tab.style : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="overflow-y-auto flex-1 p-2 space-y-1">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500 flex flex-col items-center">
                <Bell size={40} className="text-gray-300 mb-3" />
                <p>Không có thông báo nào.</p>
              </div>
            ) : (
              filteredNotifications.map((notif) => (
                <div 
                  key={notif.id} 
                  className={`p-3 rounded-lg border cursor-pointer hover:shadow-md transition-all flex items-start relative overflow-hidden ${getBgColor(notif.type, notif.read)}`}
                  onClick={() => {
                    setNotifications(notifications.map(n => n.id === notif.id ? { ...n, read: true } : n));
                  }}
                >
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

                  {!notif.read && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-blue-600 rounded-full"></div>
                  )}
                </div>
              ))
            )}
          </div>
          
          <div className="p-3 border-t border-gray-100 bg-gray-50 text-center">
            <span className="text-sm text-gray-500">
              {notifications.length} thông báo • {unreadCount} chưa đọc
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
