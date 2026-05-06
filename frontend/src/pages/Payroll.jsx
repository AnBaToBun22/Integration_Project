import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  DollarSign, Send, Calendar, CheckCircle, AlertCircle, 
  FileText, User, Printer, Download, CreditCard,
  Clock, CheckCircle2, XCircle
} from 'lucide-react';

const Payroll = () => {
  // Lấy thông tin từ localStorage
  const userRole = localStorage.getItem('role') || 'Employee';
  const userId = localStorage.getItem('user_id') || '1';
  
  const [activeTab, setActiveTab] = useState('mypayroll');

  // State cho Gửi thông báo lương
  const [notifyMonth, setNotifyMonth] = useState('9');
  const [notifyYear, setNotifyYear] = useState('2024');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  // State cho Xem bảng lương cá nhân
  const [myPayroll, setMyPayroll] = useState(null);
  const [payrollMonth, setPayrollMonth] = useState('9');
  const [payrollYear, setPayrollYear] = useState('2024');
  const [isLoadingMy, setIsLoadingMy] = useState(false);

  // Fetch lương cá nhân
  useEffect(() => {
    if (activeTab === 'mypayroll') {
      const fetchMyPayroll = async () => {
        setIsLoadingMy(true);
        try {
          const response = await api.get(`/payroll/my_payroll?month=${payrollMonth}&year=${payrollYear}&employee_id=${userId}`);
          setMyPayroll(response.data);
        } catch (error) {
          console.error("Lỗi khi lấy lương cá nhân:", error);
          setMyPayroll(null);
        } finally {
          setIsLoadingMy(false);
        }
      };
      fetchMyPayroll();
    }
  }, [activeTab, payrollMonth, payrollYear, userId]);

  const handleSendNotification = async (e) => {
    e.preventDefault();
    setIsSending(true);
    setMessage('');

    try {
      const response = await api.post('/payroll/notify', { month: notifyMonth, year: notifyYear });
      setMessage({ type: 'success', text: response.data.message });
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || 'Có lỗi xảy ra';
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setIsSending(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 flex items-center">
            <DollarSign className="mr-3 text-emerald-600 bg-emerald-50 p-2 rounded-xl" size={40} /> 
            Quản lý Lương & Phiếu lương
          </h1>
          <p className="text-gray-500 mt-1">Dữ liệu cá nhân tích hợp từ Payroll (MySQL)</p>
        </div>
        
        <div className="flex bg-gray-100 p-1 rounded-xl shadow-inner">
          <button
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'mypayroll' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('mypayroll')}
          >
            Phiếu lương của tôi
          </button>
          {(userRole === 'HR Manager' || userRole === 'Admin') && (
            <button
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'notify' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('notify')}
            >
              Gửi thông báo lương
            </button>
          )}
        </div>
      </div>

      {/* 2. Tab: Gửi thông báo (Dành cho Manager) */}
      {activeTab === 'notify' && (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-10 animate-in zoom-in-95 duration-500">
          <div className="max-w-xl mx-auto text-center space-y-8">
            <div className="inline-flex p-4 bg-emerald-50 rounded-full text-emerald-600 mb-2">
              <Send size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900">Thông báo kỳ lương</h2>
              <p className="text-gray-500 mt-2">Hệ thống sẽ gửi thông báo đẩy đến tất cả nhân viên có trong kỳ lương đã chọn.</p>
            </div>

            {message && (
              <div className={`p-4 rounded-xl border flex items-center gap-3 text-sm font-medium ${message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                {message.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                {message.text}
              </div>
            )}

            <form onSubmit={handleSendNotification} className="grid grid-cols-2 gap-4">
              <div className="text-left">
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Tháng</label>
                <select value={notifyMonth} onChange={(e) => setNotifyMonth(e.target.value)}
                  className="w-full border-gray-200 rounded-xl py-3 focus:ring-emerald-500">
                  {[...Array(12).keys()].map(m => <option key={m+1} value={m+1}>Tháng {m+1}</option>)}
                </select>
              </div>
              <div className="text-left">
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Năm</label>
                <select value={notifyYear} onChange={(e) => setNotifyYear(e.target.value)}
                  className="w-full border-gray-200 rounded-xl py-3 focus:ring-emerald-500">
                  <option value="2024">2024</option>
                  <option value="2025">2025</option>
                </select>
              </div>
              <button type="submit" disabled={isSending}
                className={`col-span-2 mt-4 py-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-lg flex items-center justify-center gap-2 ${isSending ? 'opacity-50 cursor-not-allowed' : 'hover:-translate-y-1 active:scale-95'}`}>
                {isSending ? 'Đang xử lý...' : <><Send size={20} /> Gửi thông báo ngay</>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 3. Tab: Phiếu lương của tôi (Mọi nhân viên) */}
      {activeTab === 'mypayroll' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-right-4 duration-500">
          {/* Cột trái: Bộ lọc & Info */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Calendar size={18} className="text-emerald-500" /> Chọn kỳ lương
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-400 font-bold uppercase block mb-1">Tháng / Năm</label>
                  <div className="flex gap-2">
                    <select value={payrollMonth} onChange={(e) => setPayrollMonth(e.target.value)}
                      className="flex-1 border-gray-200 rounded-xl text-sm">
                      {[...Array(12).keys()].map(m => <option key={m+1} value={m+1}>T{m+1}</option>)}
                    </select>
                    <select value={payrollYear} onChange={(e) => setPayrollYear(e.target.value)}
                      className="flex-1 border-gray-200 rounded-xl text-sm">
                      <option value="2024">2024</option>
                      <option value="2025">2025</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-emerald-900 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8 opacity-10">
                  <CreditCard size={120} />
               </div>
               <p className="text-emerald-300 text-xs font-bold uppercase mb-1">Thực lĩnh tháng này</p>
               <h2 className="text-3xl font-black">{myPayroll ? formatCurrency(myPayroll.netSalary) : '0 ₫'}</h2>
               <div className="mt-6 flex items-center gap-2 text-sm text-emerald-200">
                  <CheckCircle2 size={16} /> Đã chốt dữ liệu
               </div>
            </div>
          </div>

          {/* Cột phải: Phiếu lương chi tiết */}
          <div className="lg:col-span-2">
            {isLoadingMy ? (
              <div className="bg-white p-20 rounded-2xl border border-gray-100 text-center text-gray-400">Đang truy xuất dữ liệu...</div>
            ) : myPayroll ? (
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                {/* Header phiếu lương */}
                <div className="bg-gray-50 px-8 py-6 border-b border-gray-100 flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-full border border-gray-200 flex items-center justify-center font-black text-emerald-600 text-xl shadow-sm">
                      {myPayroll.fullName?.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-black text-gray-900 text-lg uppercase">{myPayroll.fullName}</h4>
                      <p className="text-gray-500 text-sm">Mã NV: {userId} • Kỳ lương: {myPayroll.salaryMonth}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="p-2 text-gray-400 hover:text-emerald-600 transition-colors bg-white rounded-lg border border-gray-100 shadow-sm">
                      <Printer size={18} />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-emerald-600 transition-colors bg-white rounded-lg border border-gray-100 shadow-sm">
                      <Download size={18} />
                    </button>
                  </div>
                </div>

                {/* Nội dung phiếu lương */}
                <div className="p-8 space-y-8">
                  {/* Row 1: Attendance Summary */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                      <p className="text-xs text-gray-400 font-bold uppercase mb-1 flex items-center gap-1">
                        <Clock size={12} className="text-blue-500" /> Ngày công
                      </p>
                      <p className="text-xl font-black text-gray-800">{myPayroll.workDays} <span className="text-xs font-normal text-gray-400">ngày</span></p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                      <p className="text-xs text-gray-400 font-bold uppercase mb-1 flex items-center gap-1">
                        <CheckCircle2 size={12} className="text-emerald-500" /> Phép năm
                      </p>
                      <p className="text-xl font-black text-gray-800">{myPayroll.leaveDays} <span className="text-xs font-normal text-gray-400">ngày</span></p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                      <p className="text-xs text-gray-400 font-bold uppercase mb-1 flex items-center gap-1">
                        <XCircle size={12} className="text-red-500" /> Vắng mặt
                      </p>
                      <p className="text-xl font-black text-gray-800">{myPayroll.absentDays} <span className="text-xs font-normal text-gray-400">ngày</span></p>
                    </div>
                  </div>

                  {/* Row 2: Earnings & Deductions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Thu nhập */}
                    <div className="space-y-4">
                      <h5 className="text-sm font-black text-gray-900 border-l-4 border-emerald-500 pl-3">KHOẢN THU NHẬP</h5>
                      <div className="space-y-2">
                        <div className="flex justify-between p-3 bg-emerald-50/30 rounded-lg text-sm">
                          <span className="text-gray-600">Lương cơ bản</span>
                          <span className="font-bold text-gray-800">{formatCurrency(myPayroll.baseSalary)}</span>
                        </div>
                        <div className="flex justify-between p-3 bg-emerald-50/30 rounded-lg text-sm">
                          <span className="text-gray-600">Thưởng (Bonus)</span>
                          <span className="font-bold text-emerald-600">+{formatCurrency(myPayroll.bonus)}</span>
                        </div>
                        <div className="flex justify-between p-4 border-t-2 border-emerald-100 mt-2">
                          <span className="font-bold text-gray-900">Tổng thu nhập</span>
                          <span className="font-black text-emerald-600">{formatCurrency(myPayroll.baseSalary + myPayroll.bonus)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Khấu trừ */}
                    <div className="space-y-4">
                      <h5 className="text-sm font-black text-gray-900 border-l-4 border-red-500 pl-3">KHOẢN KHẤU TRỪ</h5>
                      <div className="space-y-2">
                        <div className="flex justify-between p-3 bg-red-50/30 rounded-lg text-sm">
                          <span className="text-gray-600">Khấu trừ / Phạt</span>
                          <span className="font-bold text-red-500">-{formatCurrency(myPayroll.deductions)}</span>
                        </div>
                        <div className="flex justify-between p-3 bg-red-50/30 rounded-lg text-sm">
                          <span className="text-gray-600">Bảo hiểm / Thuế</span>
                          <span className="font-bold text-gray-400">Đã bao gồm</span>
                        </div>
                        <div className="flex justify-between p-4 border-t-2 border-red-100 mt-2">
                          <span className="font-bold text-gray-900">Tổng khấu trừ</span>
                          <span className="font-black text-red-600">-{formatCurrency(myPayroll.deductions)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Row 3: Total Summary */}
                  <div className="mt-4 p-8 bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl text-white flex flex-col md:flex-row justify-between items-center gap-6 shadow-2xl">
                    <div className="text-center md:text-left">
                      <p className="text-gray-400 text-xs font-bold uppercase mb-1">Số tiền thực lĩnh bằng chữ</p>
                      <p className="text-sm italic text-emerald-400">Mười lăm triệu tám trăm ngàn đồng chẵn./.</p>
                    </div>
                    <div className="text-center md:text-right">
                      <p className="text-gray-400 text-xs font-bold uppercase mb-1">Tổng cộng thực nhận</p>
                      <p className="text-4xl font-black text-emerald-400">{formatCurrency(myPayroll.netSalary)}</p>
                    </div>
                  </div>
                </div>

                {/* Footer Phiếu */}
                <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 flex justify-between text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                  <span>DỮ LIỆU ĐƯỢC XÁC THỰC BỞI HỆ THỐNG TÍCH HỢP 2026</span>
                  <span>ENTERPRISE DASHBOARD v2.0</span>
                </div>
              </div>
            ) : (
              <div className="bg-white p-20 rounded-2xl border border-gray-100 text-center space-y-4">
                 <div className="inline-flex p-4 bg-gray-50 rounded-full text-gray-300">
                    <FileText size={48} />
                 </div>
                 <p className="text-gray-500 font-bold">Không tìm thấy phiếu lương</p>
                 <p className="text-sm text-gray-400 max-w-xs mx-auto">Vui lòng chọn kỳ lương khác hoặc liên hệ phòng nhân sự để kiểm tra dữ liệu của bạn.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Payroll;

