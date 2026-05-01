import React, { useEffect, useState } from 'react';
import axios from 'axios';

const HRData = () => {
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    // Gọi API lấy danh sách nhân viên từ Backend Flask
    axios.get('http://127.0.0.1:5000/api/employees')
      .then(res => setEmployees(res.data))
      .catch(err => console.error("Lỗi kết nối API:", err));
  }, []);

  return (
    <div className="bg-white p-6 rounded-xl shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-blue-900">Danh sách Nhân viên (HUMAN_2025)</h2>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow-sm">
          + Thêm nhân viên mới
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100 text-gray-700">
              <th className="p-3 border font-semibold">ID</th>
              <th className="p-3 border font-semibold">Họ Tên</th>
              <th className="p-3 border font-semibold">Email</th>
              <th className="p-3 border font-semibold text-center">Mã Phòng</th>
              <th className="p-3 border font-semibold">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {employees.length > 0 ? (
              employees.map(emp => (
                <tr key={emp.EmployeeID} className="hover:bg-gray-50 transition border-b">
                  <td className="p-3 border font-medium text-gray-900">{emp.EmployeeID}</td>
                  <td className="p-3 border text-gray-800">{emp.FullName}</td>
                  <td className="p-3 border text-gray-600 italic">{emp.Email}</td>
                  <td className="p-3 border text-center">{emp.DepartmentID}</td>
                  <td className="p-3 border text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                      emp.Status === 'Đang làm việc' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {emp.Status || 'N/A'}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="p-10 text-center text-gray-400">
                  Đang kết nối đến Database hoặc không có dữ liệu...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HRData;