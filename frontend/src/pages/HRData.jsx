import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { createEmployee } from "../services/api";

const HRData = () => {
  const [employees, setEmployees] = useState([]);
  const [showForm, setShowForm] = useState(false);
  
  // 1. Cập nhật formData đủ 5 trường
  const [formData, setFormData] = useState({ 
    FullName: '', 
    Email: '', 
    DepartmentID: '', 
    PositionID: '', 
    Status: 'Đang làm việc' 
  });

  const loadEmployees = () => {
    axios.get('http://127.0.0.1:5000/api/employees')
      .then(res => setEmployees(res.data))
      .catch(err => console.error("Lỗi:", err));
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const handleSaveEmployee = async () => {
    // Kiểm tra nhập liệu cơ bản
    if (!formData.FullName || !formData.Email || !formData.DepartmentID || !formData.PositionID) {
      alert("Vui lòng nhập đầy đủ các thông tin bắt buộc!");
      return;
    }

    try {
      const response = await createEmployee(formData);
      if (response.status === 201) {
        alert("Thêm nhân viên thành công!");
        setShowForm(false); 
        loadEmployees(); 
        // Reset form về mặc định
        setFormData({ FullName: '', Email: '', DepartmentID: '', PositionID: '', Status: 'Đang làm việc' });
      }
    } catch (error) {
      alert("Lỗi: " + (error.response?.data?.error || "Không thể kết nối Server"));
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-blue-900">Danh sách Nhân viên (HUMAN_2025)</h2>
        <button 
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          + Thêm nhân viên mới
        </button>
      </div>

      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-3 border text-left">Họ Tên</th>
            <th className="p-3 border text-left">Email</th>
            <th className="p-3 border text-center">Mã Phòng</th>
            <th className="p-3 border text-center">Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {employees.map(emp => (
            <tr key={emp.EmployeeID} className="border-b hover:bg-gray-50">
              <td className="p-3 border">{emp.FullName}</td>
              <td className="p-3 border">{emp.Email}</td>
              <td className="p-3 border text-center">{emp.DepartmentID}</td>
              <td className="p-3 border text-center">
                <span className={`px-2 py-1 rounded text-xs ${emp.Status === 'Đang làm việc' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {emp.Status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 2. Modal Form nhập đủ 5 thông tin */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
            <h3 className="text-xl font-bold mb-4 text-blue-800">Nhập thông tin nhân viên mới</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Họ và Tên</label>
                <input 
                  type="text" className="w-full border p-2 rounded mt-1"
                  value={formData.FullName}
                  onChange={(e) => setFormData({...formData, FullName: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input 
                  type="email" className="w-full border p-2 rounded mt-1"
                  value={formData.Email}
                  onChange={(e) => setFormData({...formData, Email: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Mã Phòng (ID)</label>
                  <input 
                    type="number" className="w-full border p-2 rounded mt-1"
                    value={formData.DepartmentID}
                    onChange={(e) => setFormData({...formData, DepartmentID: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Mã Chức vụ (ID)</label>
                  <input 
                    type="number" className="w-full border p-2 rounded mt-1"
                    value={formData.PositionID}
                    onChange={(e) => setFormData({...formData, PositionID: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Trạng thái</label>
                <select 
                  className="w-full border p-2 rounded mt-1"
                  value={formData.Status}
                  onChange={(e) => setFormData({...formData, Status: e.target.value})}
                >
                  <option value="Đang làm việc">Đang làm việc</option>
                  <option value="Đã nghỉ việc">Đã nghỉ việc</option>
                  <option value="Thử việc">Thử việc</option>
                </select>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-8">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300">Hủy</button>
              <button onClick={handleSaveEmployee} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Lưu nhân viên</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HRData;