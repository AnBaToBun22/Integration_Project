import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DollarSign, Send, Calendar, CheckCircle, AlertCircle, FileText } from 'lucide-react';

const Payroll = () => {
  // Giả định role hiện tại (sau này lấy từ context/auth)
  const userRole = 'HR Manager'; 
  const [activeTab, setActiveTab] = useState(userRole === 'HR Manager' || userRole === 'Admin' ? 'notify' : 'mypayroll');
  
  // State cho Gửi thông báo lương
  const [month, setMonth] = useState('12');
  const [year, setYear] = useState('2025');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  // State cho Xem bảng lương cá nhân
  const [myPayroll, setMyPayroll] = useState(null);

  useEffect(() => {
    if (activeTab === 'mypayroll') {
      const fetchPayroll = async () => {
        try {
          const token = localStorage.getItem('token') || 'dummy-token';
          const response = await axios.get('http://localhost:5000/api/payroll/my_payroll?month=12&year=2025', {
            headers: { Authorization: `Bearer ${token}` }
          });
          const pd = response.data;
          setMyPayroll({
            month: '12/2025',
            basicSalary: pd.basic_salary || pd.basicSalary,
            allowance: pd.allowance,
            deduction: pd.deduction,
            tax: pd.tax,
            netSalary: pd.net_salary || pd.netSalary,
            status: pd.status
          });
        } catch (error) {
          console.error("Lỗi khi lấy lương:", error);
        }
      };
      fetchPayroll();
    }
  }, [activeTab]);

  const handleSendNotification = async (e) => {
    e.preventDefault();
    setIsSending(true);
    setMessage('');
    
    try {
      const token = localStorage.getItem('token') || 'dummy-token';
      const response = await axios.post('http://localhost:5000/api/payroll/notify', { month, year }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage({ type: 'success', text: response.data.message });
      setIsSending(false);
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Có lỗi xảy ra';
      setMessage({ type: 'error', text: errorMsg });
      setIsSending(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center">
          <DollarSign className="mr-2 text-green-600" /> Quản lý Lương
        </h1>
        <div className="flex space-x-2">
          {(userRole === 'HR Manager' || userRole === 'Admin') && (
            <button 
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'notify' ? 'bg-green-600 text-white shadow-md' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}
              onClick={() => setActiveTab('notify')}
            >
              Gửi thông báo lương
            </button>
          )}
          <button 
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'mypayroll' ? 'bg-green-600 text-white shadow-md' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}
            onClick={() => setActiveTab('mypayroll')}
          >
            Bảng lương của tôi
          </button>
        </div>
      </div>

      {activeTab === 'notify' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-800">Thông báo lương tháng</h2>
              <p className="text-gray-500 mt-2">Chọn kỳ lương đã được chốt (Approved) để gửi thông báo đến tất cả nhân viên</p>
            </div>

            {message && (
              <div className={`p-4 mb-6 rounded-lg border flex items-center ${message.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                {message.type === 'success' ? <CheckCircle className="mr-2 h-5 w-5" /> : <AlertCircle className="mr-2 h-5 w-5" />}
                {message.text}
              </div>
            )}

            <form onSubmit={handleSendNotification} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tháng</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Calendar size={18} className="text-gray-400" />
                    </div>
                    <select 
                      value={month} 
                      onChange={(e) => setMonth(e.target.value)}
                      className="pl-10 w-full border border-gray-300 rounded-lg py-3 focus:ring-green-500 focus:border-green-500 bg-white shadow-sm"
                    >
                      {[...Array(12).keys()].map(m => (
                        <option key={m+1} value={m+1}>Tháng {m+1}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Năm</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Calendar size={18} className="text-gray-400" />
                    </div>
                    <select 
                      value={year} 
                      onChange={(e) => setYear(e.target.value)}
                      className="pl-10 w-full border border-gray-300 rounded-lg py-3 focus:ring-green-500 focus:border-green-500 bg-white shadow-sm"
                    >
                      {['2024', '2025', '2026'].map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 text-blue-800 p-4 rounded-lg border border-blue-100 flex items-start">
                <AlertCircle className="mt-0.5 mr-3 flex-shrink-0" size={18} />
                <p className="text-sm">
                  <strong>Lưu ý:</strong> Hệ thống sẽ tự động kiểm tra trạng thái bảng lương. Chỉ những bảng lương đã được duyệt (Approved) mới có thể gửi thông báo. Nhân viên sẽ nhận được email và thông báo trên ứng dụng.
                </p>
              </div>

              <div className="flex justify-center pt-4">
                <button 
                  type="submit" 
                  disabled={isSending}
                  className={`px-8 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors shadow-md flex items-center ${isSending ? 'opacity-75 cursor-not-allowed' : ''}`}
                >
                  {isSending ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Đang xử lý...
                    </span>
                  ) : (
                    <span className="flex items-center"><Send size={20} className="mr-2" /> Gửi thông báo lương</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'mypayroll' && myPayroll && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-green-500 px-6 py-8 text-white text-center">
            <h2 className="text-3xl font-bold mb-2">Phiếu lương kỳ {myPayroll.month}</h2>
            <p className="text-green-100">Thông tin lương cá nhân bảo mật</p>
          </div>
          
          <div className="p-8">
            <div className="flex justify-between items-center mb-8 pb-4 border-b">
              <div className="flex items-center">
                <FileText className="text-gray-400 mr-2" size={24} />
                <span className="text-lg font-semibold text-gray-700">Chi tiết các khoản thu nhập</span>
              </div>
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-bold border border-green-200">
                {myPayroll.status}
              </span>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 rounded-lg hover:bg-gray-50">
                <span className="text-gray-600">Lương cơ bản</span>
                <span className="font-semibold text-gray-800">{formatCurrency(myPayroll.basicSalary)}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg hover:bg-gray-50">
                <span className="text-gray-600">Phụ cấp</span>
                <span className="font-semibold text-green-600">+{formatCurrency(myPayroll.allowance)}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg hover:bg-gray-50">
                <span className="text-gray-600">Khấu trừ</span>
                <span className="font-semibold text-red-600">-{formatCurrency(myPayroll.deduction)}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg hover:bg-gray-50">
                <span className="text-gray-600">Thuế TNCN</span>
                <span className="font-semibold text-red-600">-{formatCurrency(myPayroll.tax)}</span>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-dashed border-gray-300">
              <div className="flex justify-between items-center bg-gray-50 p-6 rounded-xl border border-gray-100">
                <span className="text-xl font-bold text-gray-700">Thực nhận</span>
                <span className="text-3xl font-bold text-green-600">{formatCurrency(myPayroll.netSalary)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payroll;
