import React, { useState, useEffect } from 'react';
import { Bell, RefreshCw, AlertTriangle, PartyPopper, DollarSign, Clock } from 'lucide-react';
import { getAlerts } from '../services/api';

const Alerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generatedAt, setGeneratedAt] = useState('');
  const [leaveThreshold, setLeaveThreshold] = useState(3);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await getAlerts(leaveThreshold);
      setAlerts(res.data.alerts || []);
      setGeneratedAt(res.data.generated_at || '');
    } catch (err) {
      console.error("Lỗi lấy cảnh báo:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [leaveThreshold]);

  // Icon + style theo severity
  const getAlertStyle = (severity) => {
    switch (severity) {
      case 'danger':
        return {
          bg: 'bg-red-50 border-red-200',
          icon: <AlertTriangle size={20} className="text-red-500" />,
          badge: 'bg-red-100 text-red-700'
        };
      case 'warning':
        return {
          bg: 'bg-amber-50 border-amber-200',
          icon: <Clock size={20} className="text-amber-500" />,
          badge: 'bg-amber-100 text-amber-700'
        };
      case 'success':
        return {
          bg: 'bg-emerald-50 border-emerald-200',
          icon: <PartyPopper size={20} className="text-emerald-500" />,
          badge: 'bg-emerald-100 text-emerald-700'
        };
      default:
        return {
          bg: 'bg-blue-50 border-blue-200',
          icon: <Bell size={20} className="text-blue-500" />,
          badge: 'bg-blue-100 text-blue-700'
        };
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'anniversary': return 'Kỷ niệm';
      case 'excessive_leave': return 'Nghỉ phép';
      case 'excessive_absence': return 'Vắng mặt';
      case 'salary_anomaly': return 'Lương';
      default: return type;
    }
  };

  // Đếm theo loại
  const dangerCount = alerts.filter(a => a.severity === 'danger').length;
  const warningCount = alerts.filter(a => a.severity === 'warning').length;
  const infoCount = alerts.filter(a => a.severity === 'info' || a.severity === 'success').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Bell size={24} className="text-amber-500" />
            Cảnh báo Hệ thống
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Tự động phát hiện các vấn đề cần chú ý
            {generatedAt && <span> • Cập nhật lúc {generatedAt}</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
            <label className="text-sm text-gray-600">Ngưỡng nghỉ:</label>
            <input 
              type="number" 
              min="1" max="30"
              value={leaveThreshold}
              onChange={(e) => setLeaveThreshold(parseInt(e.target.value) || 3)}
              className="w-14 text-center border border-gray-200 rounded-lg py-1 text-sm outline-none"
            />
            <span className="text-sm text-gray-500">ngày</span>
          </div>
          <button 
            onClick={fetchAlerts}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition shadow-sm text-sm font-medium"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Kiểm tra
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
            <AlertTriangle size={20} className="text-red-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-800">{dangerCount}</p>
            <p className="text-xs text-gray-500">Nghiêm trọng</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
            <Clock size={20} className="text-amber-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-800">{warningCount}</p>
            <p className="text-xs text-gray-500">Cảnh báo</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <Bell size={20} className="text-blue-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-800">{infoCount}</p>
            <p className="text-xs text-gray-500">Thông tin</p>
          </div>
        </div>
      </div>

      {/* Alert List */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-amber-500" />
            <p className="text-gray-400">Đang kiểm tra cảnh báo...</p>
          </div>
        ) : alerts.length > 0 ? (
          alerts.map((alert, index) => {
            const style = getAlertStyle(alert.severity);
            return (
              <div key={index} className={`flex items-start gap-4 p-4 rounded-xl border-2 transition-all hover:shadow-sm ${style.bg}`}>
                <div className="flex-shrink-0 mt-0.5">
                  {style.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${style.badge}`}>
                      {getTypeLabel(alert.type)}
                    </span>
                    <h4 className="font-semibold text-gray-800 text-sm">{alert.title}</h4>
                  </div>
                  <p className="text-sm text-gray-600">{alert.message}</p>
                </div>
                <div className="flex-shrink-0 text-2xl">{alert.icon}</div>
              </div>
            );
          })
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
              <span className="text-3xl">✅</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-1">Không có cảnh báo</h3>
            <p className="text-sm text-gray-400">Hệ thống đang hoạt động bình thường</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Alerts;
