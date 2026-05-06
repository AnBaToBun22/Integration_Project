import React, { useEffect, useState } from 'react';
import { Edit2, Trash2, Search, X, User, Mail, Phone, Calendar, Briefcase, Info, CheckCircle, Plus } from 'lucide-react';
import { getEmployees, createEmployee, updateEmployee, deleteEmployee, getDepartments, getPositions } from '../services/api';

const HRData = () => {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Đang làm việc');

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

  const loadDropdowns = () => {
    getDepartments()
      .then(res => {
        if (res.data.success) setDepartments(res.data.data);
      })
      .catch(err => console.error("Lỗi load phòng ban:", err));

    getPositions()
      .then(res => {
        if (res.data.success) setPositions(res.data.data);
      })
      .catch(err => console.error("Lỗi load chức vụ:", err));
  };

  useEffect(() => {
    loadEmployees();
    loadDropdowns();
  }, []);

  // Lọc nhân viên theo tìm kiếm và trạng thái
  const filteredEmployees = employees.filter(emp => {
    const matchSearch = !searchTerm ||
      emp.FullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.Email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.PhoneNumber?.includes(searchTerm);
    const matchStatus = statusFilter === 'all' || emp.Status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleSaveEmployee = async () => {
    if (!formData.FullName || !formData.Email || !formData.DepartmentID || !formData.PositionID) {
      alert("Vui lòng nhập đầy đủ các thông tin bắt buộc!");
      return;
    }

    try {
      let response;

      if (editingId) {
        response = await updateEmployee(editingId, formData);
        if (response.status === 200) {
          alert("✅ Sửa nhân viên thành công!");
        }
      } else {
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
      DepartmentID: employee.DepartmentID || '',
      PositionID: employee.PositionID || '',
      Status: employee.Status || 'Đang làm việc'
    });
    setEditingId(employee.EmployeeID);
    setShowForm(true);
  };

  const handleDeleteEmployee = async (employeeId, employeeName) => {
    if (!window.confirm(`Bạn chắc chắn muốn cho nhân viên "${employeeName}" nghỉ việc?`)) {
      return;
    }

    try {
      const response = await deleteEmployee(employeeId);
      if (response.status === 200) {
        alert("✅ " + response.data.message);
        loadEmployees();
      }
    } catch (error) {
      alert("❌ " + (error.response?.data?.error || "Không thể thực hiện thao tác"));
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

      {/* Search & Filter Bar */}
      <div className="flex gap-4 mb-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm theo tên, email, SĐT..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          )}
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="Đang làm việc">Đang làm việc</option>
          <option value="Đã nghỉ việc">Đã nghỉ việc</option>
          <option value="Thử việc">Thử việc</option>
        </select>
      </div>

      {/* Số kết quả */}
      <p className="text-sm text-gray-500 mb-3">
        Hiển thị {filteredEmployees.length} / {employees.length} nhân viên
      </p>

      {/* Bảng danh sách */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 text-gray-700">
              <th className="p-3 border text-left">Họ Tên</th>
              <th className="p-3 border text-left">Email</th>
              <th className="p-3 border text-center">Phòng ban</th>
              <th className="p-3 border text-center">Chức vụ</th>
              <th className="p-3 border text-center">Trạng thái</th>
              <th className="p-3 border text-center">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.length > 0 ? (
              filteredEmployees.map((emp, index) => (
                <tr key={emp.EmployeeID || index} className="border-b hover:bg-gray-50 transition">
                  <td className="p-3 border font-medium">{emp.FullName}</td>
                  <td className="p-3 border text-gray-600">{emp.Email}</td>
                  <td className="p-3 border text-center">
                    <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-sm">
                      {emp.DepartmentName || `Mã: ${emp.DepartmentID}`}
                    </span>
                  </td>
                  <td className="p-3 border text-center">
                    <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded text-sm">
                      {emp.PositionName || `Mã: ${emp.PositionID}`}
                    </span>
                  </td>
                  <td className="p-3 border text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${emp.Status === 'Đang làm việc' ? 'bg-green-100 text-green-700' :
                      emp.Status === 'Thử việc' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
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
                <td colSpan="6" className="p-10 text-center text-gray-400 italic">
                  {employees.length === 0 ? 'Đang tải dữ liệu hoặc chưa có nhân viên nào...' : 'Không tìm thấy kết quả phù hợp'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50 p-4 transition-all animate-fade-in">
          <div className="glass-modal rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col modal-animate-in">
            {/* Header with Solid Blue */}
            <div className="bg-blue-600 p-6 text-white relative">
              <h3 className="text-2xl font-bold flex items-center gap-3">
                {editingId ? <Edit2 size={24} /> : <Plus size={24} />}
                {editingId ? 'Sửa thông tin nhân viên' : 'Thêm nhân viên mới'}
              </h3>
              <p className="text-blue-50 text-sm mt-1 opacity-80">
                {editingId ? `Đang chỉnh sửa hồ sơ nhân viên ID: ${editingId}` : 'Vui lòng điền các thông tin cần thiết bên dưới'}
              </p>
              <button
                onClick={handleCloseForm}
                className="absolute top-6 right-6 p-2 hover:bg-white/20 rounded-full transition-all text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8 overflow-y-auto">
              <div className="space-y-8">
                {/* Section: Thông tin cá nhân */}
                <div>
                  <h4 className="text-sm font-bold text-blue-600 flex items-center gap-2 mb-4 border-b border-blue-50 pb-2">
                    <User size={16} /> THÔNG TIN CÁ NHÂN
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="premium-label">Họ và Tên <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                          type="text" className="premium-input premium-input-icon"
                          value={formData.FullName}
                          onChange={(e) => setFormData({ ...formData, FullName: e.target.value })}
                          placeholder="Nguyễn Văn A"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="premium-label">Email công việc <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                          type="email" className="premium-input premium-input-icon"
                          value={formData.Email}
                          onChange={(e) => setFormData({ ...formData, Email: e.target.value })}
                          placeholder="email@company.com"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="premium-label">Số điện thoại</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                          type="tel" className="premium-input premium-input-icon"
                          value={formData.PhoneNumber}
                          onChange={(e) => setFormData({ ...formData, PhoneNumber: e.target.value })}
                          placeholder="0912345678"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="premium-label">Giới tính</label>
                      <select
                        className="premium-input appearance-none"
                        value={formData.Gender}
                        onChange={(e) => setFormData({ ...formData, Gender: e.target.value })}
                      >
                        <option value="Nam">Nam</option>
                        <option value="Nữ">Nữ</option>
                        <option value="Khác">Khác</option>
                      </select>
                    </div>

                    <div>
                      <label className="premium-label">Ngày sinh</label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                          type="date" className="premium-input premium-input-icon"
                          value={formData.DateOfBirth}
                          onChange={(e) => setFormData({ ...formData, DateOfBirth: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section: Thông tin công việc */}
                <div>
                  <h4 className="text-sm font-bold text-blue-600 flex items-center gap-2 mb-4 border-b border-blue-50 pb-2">
                    <Briefcase size={16} /> THÔNG TIN CÔNG VIỆC
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="premium-label">Phòng ban <span className="text-red-500">*</span></label>
                      <select
                        className="premium-input"
                        value={formData.DepartmentID}
                        onChange={(e) => setFormData({ ...formData, DepartmentID: e.target.value })}
                      >
                        <option value="">-- Chọn phòng ban --</option>
                        {departments.map(dept => (
                          <option key={dept.id} value={dept.id}>{dept.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="premium-label">Chức vụ <span className="text-red-500">*</span></label>
                      <select
                        className="premium-input"
                        value={formData.PositionID}
                        onChange={(e) => setFormData({ ...formData, PositionID: e.target.value })}
                      >
                        <option value="">-- Chọn chức vụ --</option>
                        {positions.map(pos => (
                          <option key={pos.id} value={pos.id}>{pos.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="premium-label">Ngày vào làm</label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                          type="date" className="premium-input premium-input-icon"
                          value={formData.HireDate}
                          onChange={(e) => setFormData({ ...formData, HireDate: e.target.value })}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="premium-label">Trạng thái</label>
                      <select
                        className="premium-input"
                        value={formData.Status}
                        onChange={(e) => setFormData({ ...formData, Status: e.target.value })}
                      >
                        <option value="Đang làm việc">Đang làm việc</option>
                        <option value="Đã nghỉ việc">Đã nghỉ việc</option>
                        <option value="Thử việc">Thử việc</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-6 bg-gray-50 border-t flex justify-end gap-3">
              <button
                onClick={handleCloseForm}
                className="premium-button-secondary"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveEmployee}
                className="premium-button-primary"
              >
                {editingId ? <CheckCircle size={18} /> : <Plus size={18} />}
                {editingId ? 'Cập nhật hồ sơ' : 'Lưu nhân viên'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HRData;