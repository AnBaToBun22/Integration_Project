import React, { useEffect, useState } from 'react';
import axios from 'axios';

const Payroll = () => {
  const [payrollData, setPayrollData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Gọi API lấy danh sách lương từ file report_routes.py
    axios.get('http://127.0.0.1:5000/api/reports/payroll_list')
      .then(res => {
        setPayrollData(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Lỗi lấy dữ liệu lương:", err);
        setLoading(false);
      });
  }, []);

  // Hàm format tiền tệ VNĐ
  const formatMoney = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-blue-900">Bảng Lương Tháng 9/2024</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 text-gray-700">
              <th className="p-3 border text-left">Mã Lương</th>
              <th className="p-3 border text-left">Họ Tên Nhân Viên</th>
              <th className="p-3 border text-right">Lương Cơ Bản</th>
              <th className="p-3 border text-right">Thưởng</th>
              <th className="p-3 border text-right">Khấu Trừ</th>
              <th className="p-3 border text-right font-bold">Thực Lãnh</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" className="p-10 text-center text-gray-400">Đang tải dữ liệu lương...</td>
              </tr>
            ) : payrollData.length > 0 ? (
              payrollData.map((item, index) => (
                <tr key={item.SalaryID || index} className="border-b hover:bg-gray-50 transition">
                  <td className="p-3 border text-center font-medium text-gray-600">#{item.SalaryID}</td>
                  <td className="p-3 border font-semibold">{item.FullName}</td>
                  <td className="p-3 border text-right">{formatMoney(item.BaseSalary)}</td>
                  <td className="p-3 border text-right text-green-600">+{formatMoney(item.Bonus)}</td>
                  <td className="p-3 border text-right text-red-600">-{formatMoney(item.Deductions)}</td>
                  <td className="p-3 border text-right font-bold text-blue-700 bg-blue-50">
                    {formatMoney(item.NetSalary)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="p-10 text-center text-gray-400 italic">Chưa có dữ liệu bảng lương...</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Payroll;