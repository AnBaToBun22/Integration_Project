import React, { useEffect, useState } from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import { getEmployees, createEmployee, updateEmployee, deleteEmployee } from '../services/api';

const HRData = () => {
  const [employees, setEmployees] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({ 
    FullName: '', 
    Email: '', 
    PhoneNumber: '',
    DateOfBirth: '1995-01-01',
    Gender: 'Nam',
    HireDate: new Date().toISOString().split('T')[0],
    DepartmentID: '', 
    PositionID: '', 
    Status: 'Đang làm việc' 
  });

  const loadEmployees = () => {
    getEmployees()
      .then(res => setEmployees(res.data))
      .catch(err => console.error("Lỗi kết nối API:", err));
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const handleSaveEmployee = async () => {
    // Kiểm tra nhập liệu
    if (!formData.FullName || !formData.Email || !formData.DepartmentID || !formData.PositionID) {
      alert("Vui lòng nhập đầy đủ các thông tin bắt buộc!");
      return;
    }

    try {
      let response;
      
      if (editingId) {
        // Sửa nhân viên (PUT)
        response = await updateEmployee(editingId, formData);
        if (response.status === 200) {
          alert("✅ Sửa nhân viên thành công!");
        }
      } else {
        // Thêm nhân viên mới (POST)
        response = await createEmployee(formData);
        if (response.status === 201) {
          alert("✅ Thêm nhân viên thành công!");
        }
      }
      
      setShowForm(false);
      setEditingId(null);
      loadEmployees();
      resetForm();
    } catch (error) {
      alert("❌ Lỗi: " + (error.response?.data?.error || "Không thể kết nối Server"));
    }
  };

  const handleEditEmployee = (employee) => {
    setFormData({
      FullName: employee.FullName,
      Email: employee.Email,
      PhoneNumber: employee.PhoneNumber || '',
      DateOfBirth: employee.DateOfBirth || '1995-01-01',
      Gender: employee.Gender || 'Nam',
      HireDate: employee.HireDate || new Date().toISOString().split('T')[0],
      DepartmentID: employee.DepartmentID,
      PositionID: employee.PositionID || '',
      Status: employee.Status || 'Đang làm việc'
    });
    setEditingId(employee.EmployeeID);
    setShowForm(true);
  };

  const handleDeleteEmployee = async (employeeId, employeeName) => {
    if (!window.confirm(`Bạn chắc chắn muốn xóa nhân viên "${employeeName}"?`)) {
      return;
    }

    try {
      const response = await deleteEmployee(employeeId);
      if (response.status === 200) {
        alert("✅ Xóa nhân viên thành công!");
        loadEmployees();
      }
    } catch (error) {
      alert("❌ Lỗi: " + (error.response?.data?.error || "Không thể xóa nhân viên"));
    }
  };

  const resetForm = () => {
    setFormData({
      FullName: '', Email: '', PhoneNumber: '', DateOfBirth: '1995-01-01', Gender: 'Nam',
      HireDate: new Date().toISOString().split('T')[0],
      DepartmentID: '', PositionID: '', Status: 'Đang làm việc'
    });
    setEditingId(null);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    resetForm();
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-blue-900">Quản lý Nhân viên (Integration System)</h2>
        <button 
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow-lg"
        >
          + Thêm nhân viên mới
        </button>
      </div>

      {/* Bảng danh sách */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 text-gray-700">
              <th className="p-3 border text-left">Họ Tên</th>
              <th className="p-3 border text-left">Email</th>
              <th className="p-3 border text-center">Phòng ban</th>
              <th className="p-3 border text-center">Trạng thái</th>
              <th className="p-3 border text-center">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {employees.filter(emp => emp.Status === 'Đang làm việc').length > 0 ? (
              employees.filter(emp => emp.Status === 'Đang làm việc').map((emp, index) => (
                <tr key={emp.EmployeeID || index} className="border-b hover:bg-gray-50 transition">
                  <td className="p-3 border font-medium">{emp.FullName}</td>
                  <td className="p-3 border text-gray-600">{emp.Email}</td>
                  <td className="p-3 border text-center">
                    <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-sm">
                      Mã: {emp.DepartmentID}
                    </span>
                  </td>
                  <td className="p-3 border text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      emp.Status === 'Đang làm việc' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {emp.Status}
                    </span>
                  </td>
                  <td className="p-3 border text-center">
                    <button 
                      onClick={() => handleEditEmployee(emp)}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition mr-2"
                    >
                      <Edit2 size={16} /> Sửa
                    </button>
                    <button 
                      onClick={() => handleDeleteEmployee(emp.EmployeeID, emp.FullName)}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition"
                    >
                      <Trash2 size={16} /> Xóa
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="p-10 text-center text-gray-400 italic">Đang tải dữ liệu hoặc chưa có nhân viên nào...</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold mb-6 text-blue-800 border-b pb-2">
              {editingId ? '✏️ Sửa thông tin nhân viên' : '➕ Thêm nhân viên mới'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700">Họ và Tên</label>
                <input 
                  type="text" className="w-full border p-2 rounded-lg mt-1 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.FullName}
                  onChange={(e) => setFormData({...formData, FullName: e.target.value})}
                  placeholder="Nguyễn Văn A"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700">Email công việc</label>
                <input 
                  type="email" className="w-full border p-2 rounded-lg mt-1 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.Email}
                  onChange={(e) => setFormData({...formData, Email: e.target.value})}
                  placeholder="email@company.com"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700">Số điện thoại</label>
                <input 
                  type="tel" className="w-full border p-2 rounded-lg mt-1 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.PhoneNumber}
                  onChange={(e) => setFormData({...formData, PhoneNumber: e.target.value})}
                  placeholder="0912345678"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700">Giới tính</label>
                <select 
                  className="w-full border p-2 rounded-lg mt-1 outline-none"
                  value={formData.Gender}
                  onChange={(e) => setFormData({...formData, Gender: e.target.value})}
                >
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700">Ngày sinh</label>
                <input 
                  type="date" className="w-full border p-2 rounded-lg mt-1 outline-none"
                  value={formData.DateOfBirth}
                  onChange={(e) => setFormData({...formData, DateOfBirth: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700">Mã Phòng</label>
                <input 
                  type="number" className="w-full border p-2 rounded-lg mt-1 outline-none"
                  value={formData.DepartmentID}
                  onChange={(e) => setFormData({...formData, DepartmentID: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700">Mã Chức vụ</label>
                <input 
                  type="number" className="w-full border p-2 rounded-lg mt-1 outline-none"
                  value={formData.PositionID}
                  onChange={(e) => setFormData({...formData, PositionID: e.target.value})}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700">Trạng thái</label>
                <select 
                  className="w-full border p-2 rounded-lg mt-1 outline-none"
                  value={formData.Status}
                  onChange={(e) => setFormData({...formData, Status: e.target.value})}
                >
                  <option value="Đang làm việc">Đang làm việc</option>
                  <option value="Đã nghỉ việc">Đã nghỉ việc</option>
                  <option value="Thử việc">Thử việc</option>
                </select>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-8">
              <button onClick={handleCloseForm} className="px-5 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 font-medium transition">Hủy</button>
              <button onClick={handleSaveEmployee} className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition shadow-md">
                {editingId ? '💾 Cập nhật' : '➕ Lưu nhân viên'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HRData;