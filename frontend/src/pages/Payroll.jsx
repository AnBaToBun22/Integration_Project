import React, { useEffect, useState } from 'react';
import { RefreshCw, DollarSign, Calendar } from 'lucide-react';
import { getPayrollList, getPayrollMonths } from '../services/api';

const Payroll = () => {
  const [payrollData, setPayrollData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [availableMonths, setAvailableMonths] = useState([]);

  // Lấy danh sách tháng có dữ liệu
  useEffect(() => {
    getPayrollMonths()
      .then(res => {
        setAvailableMonths(res.data);
        // Nếu có dữ liệu, chọn tháng/năm mới nhất
        if (res.data.length > 0) {
          setMonth(res.data[0].month);
          setYear(res.data[0].year);
        }
      })
      .catch(err => console.error("Lỗi lấy danh sách tháng:", err));
  }, []);

  // Lấy dữ liệu lương khi thay đổi tháng/năm
  useEffect(() => {
    fetchPayroll();
  }, [month, year]);

  const fetchPayroll = () => {
    setLoading(true);
    getPayrollList(month, year)
      .then(res => {
        setPayrollData(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Lỗi lấy dữ liệu lương:", err);
        setLoading(false);
      });
  };

  // Format tiền tệ VNĐ
  const formatMoney = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  // Tính tổng
  const totalNetSalary = payrollData.reduce((sum, item) => sum + (parseFloat(item.NetSalary) || 0), 0);
  const totalBaseSalary = payrollData.reduce((sum, item) => sum + (parseFloat(item.BaseSalary) || 0), 0);
  const totalBonus = payrollData.reduce((sum, item) => sum + (parseFloat(item.Bonus) || 0), 0);
  const totalDeductions = payrollData.reduce((sum, item) => sum + (parseFloat(item.Deductions) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Bảng Lương</h2>
          <p className="text-sm text-gray-500 mt-1">
            Dữ liệu từ hệ thống Payroll (MySQL) • {payrollData.length} bản ghi
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Chọn tháng */}
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
            <Calendar size={16} className="text-gray-400" />
            <select 
              value={month} 
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="outline-none text-sm font-medium bg-transparent"
            >
              {[...Array(12)].map((_, i) => (
                <option key={i+1} value={i+1}>Tháng {i+1}</option>
              ))}
            </select>
            <select 
              value={year} 
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="outline-none text-sm font-medium bg-transparent"
            >
              {[2023, 2024, 2025, 2026].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          
          <button 
            onClick={fetchPayroll}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition shadow-sm text-sm font-medium"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Làm mới
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {!loading && payrollData.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <p className="text-xs font-medium text-gray-500 mb-1">Tổng lương cơ bản</p>
            <p className="text-lg font-bold text-gray-800">{formatMoney(totalBaseSalary)}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <p className="text-xs font-medium text-gray-500 mb-1">Tổng thưởng</p>
            <p className="text-lg font-bold text-emerald-600">+{formatMoney(totalBonus)}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <p className="text-xs font-medium text-gray-500 mb-1">Tổng khấu trừ</p>
            <p className="text-lg font-bold text-red-600">-{formatMoney(totalDeductions)}</p>
          </div>
          <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-4 rounded-xl shadow-sm text-white">
            <p className="text-xs font-medium text-blue-100 mb-1">Tổng thực lãnh</p>
            <p className="text-lg font-bold">{formatMoney(totalNetSalary)}</p>
          </div>
        </div>
      )}

      {/* Bảng lương */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Mã</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Họ Tên Nhân Viên</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Lương Cơ Bản</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Thưởng</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Khấu Trừ</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Thực Lãnh</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-4 py-12 text-center">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-blue-500" />
                    <p className="text-gray-400">Đang tải dữ liệu lương...</p>
                  </td>
                </tr>
              ) : payrollData.length > 0 ? (
                payrollData.map((item, index) => (
                  <tr key={item.SalaryID || index} className="border-b border-gray-100 hover:bg-blue-50/30 transition">
                    <td className="px-4 py-3 text-center text-sm text-gray-500 font-mono">#{item.SalaryID}</td>
                    <td className="px-4 py-3 font-semibold text-gray-800">{item.FullName}</td>
                    <td className="px-4 py-3 text-right text-sm">{formatMoney(item.BaseSalary)}</td>
                    <td className="px-4 py-3 text-right text-sm text-emerald-600 font-medium">+{formatMoney(item.Bonus)}</td>
                    <td className="px-4 py-3 text-right text-sm text-red-600 font-medium">-{formatMoney(item.Deductions)}</td>
                    <td className="px-4 py-3 text-right font-bold text-blue-700 bg-blue-50/50">
                      {formatMoney(item.NetSalary)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-4 py-12 text-center text-gray-400 italic">
                    Chưa có dữ liệu lương cho tháng {month}/{year}
                  </td>
                </tr>
              )}
            </tbody>
            {/* Footer tổng */}
            {!loading && payrollData.length > 0 && (
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-200 font-bold">
                  <td colSpan="2" className="px-4 py-3 text-gray-700">TỔNG CỘNG ({payrollData.length} nhân viên)</td>
                  <td className="px-4 py-3 text-right">{formatMoney(totalBaseSalary)}</td>
                  <td className="px-4 py-3 text-right text-emerald-600">+{formatMoney(totalBonus)}</td>
                  <td className="px-4 py-3 text-right text-red-600">-{formatMoney(totalDeductions)}</td>
                  <td className="px-4 py-3 text-right text-blue-700 bg-blue-50">{formatMoney(totalNetSalary)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};

export default Payroll;