import React, { useEffect, useState } from 'react';
import { Edit2, Trash2, Search, RefreshCw, UserPlus, X } from 'lucide-react';
import { getEmployees, createEmployee, updateEmployee, deleteEmployee, getDepartments, getPositions, searchEmployees } from '../services/api';

const HRData = () => {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
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

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const res = await getEmployees();
      setEmployees(res.data);
    } catch (err) {
      console.error("Lỗi kết nối API:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadDepartments = async () => {
    try {
      const res = await getDepartments();
      if (res.data.success) {
        setDepartments(res.data.data);
      }
    } catch (err) {
      console.error("Lỗi lấy phòng ban:", err);
    }
  };

  const loadPositions = async () => {
    try {
      const res = await getPositions();
      if (res.data.success) {
        setPositions(res.data.data);
      }
    } catch (err) {
      console.error("Lỗi lấy chức vụ:", err);
    }
  };

  useEffect(() => {
    loadEmployees();
    loadDepartments();
    loadPositions();
  }, []);

  // Lọc nhân viên theo search query và status filter
  const filteredEmployees = employees.filter(emp => {
    const matchSearch = !searchQuery || 
      emp.FullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.Email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.DepartmentName?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchStatus = statusFilter === 'all' || emp.Status === statusFilter;

    return matchSearch && matchStatus;
  });

  const handleSaveEmployee = async () => {
    if (!formData.FullName || !formData.Email || !formData.DepartmentID) {
      alert("Vui lòng nhập đầy đủ: Họ Tên, Email, Phòng ban!");
      return;
    }

    try {
      let response;
      
      if (editingId) {
        response = await updateEmployee(editingId, formData);
        if (response.status === 200) {
          alert("✅ Cập nhật nhân viên thành công!");
        }
      } else {
        response = await createEmployee(formData);
        if (response.status === 201) {
          alert("✅ Thêm nhân viên và đồng bộ Payroll thành công!");
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
      FullName: employee.FullName || '',
      Email: employee.Email || '',
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
    if (!window.confirm(`Bạn chắc chắn muốn chuyển nhân viên "${employeeName}" sang trạng thái nghỉ việc?`)) {
      return;
    }

    try {
      const response = await deleteEmployee(employeeId);
      if (response.status === 200) {
        alert(response.data.message || "✅ Xóa nhân viên thành công!");
        loadEmployees();
      }
    } catch (error) {
      alert("❌ " + (error.response?.data?.error || "Không thể xóa nhân viên"));
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

  // Helper: lấy tên phòng ban từ ID
  const getDeptName = (deptId) => {
    const dept = departments.find(d => d.id === deptId);
    return dept ? dept.name : `ID: ${deptId}`;
  };

  // Helper: lấy tên chức vụ từ ID
  const getPosName = (posId) => {
    const pos = positions.find(p => p.id === posId);
    return pos ? pos.name : posId ? `ID: ${posId}` : 'Chưa gán';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Quản lý Nhân viên</h2>
          <p className="text-sm text-gray-500 mt-1">
            Dữ liệu tích hợp từ HR (SQL Server) • Đồng bộ tự động sang Payroll (MySQL)
          </p>
        </div>
        <button 
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl hover:bg-blue-700 transition shadow-sm hover:shadow-md active:scale-95"
        >
          <UserPlus size={18} /> Thêm nhân viên
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text"
            placeholder="Tìm kiếm theo tên, email, phòng ban..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
          />
        </div>
        <select 
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="Đang làm việc">Đang làm việc</option>
          <option value="Đã nghỉ việc">Đã nghỉ việc</option>
          <option value="Thử việc">Thử việc</option>
        </select>
        <button 
          onClick={loadEmployees}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Làm mới
        </button>
      </div>

      {/* Bảng danh sách */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Họ Tên</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Email</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">SĐT</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Phòng ban</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Chức vụ</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Trạng thái</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-4 py-12 text-center">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-blue-500" />
                    <p className="text-gray-400">Đang tải dữ liệu...</p>
                  </td>
                </tr>
              ) : filteredEmployees.length > 0 ? (
                filteredEmployees.map((emp, index) => (
                  <tr key={emp.EmployeeID || index} className="border-b border-gray-100 hover:bg-blue-50/30 transition">
                    <td className="px-4 py-3 font-medium text-gray-800">{emp.FullName}</td>
                    <td className="px-4 py-3 text-gray-600 text-sm">{emp.Email}</td>
                    <td className="px-4 py-3 text-gray-600 text-sm">{emp.PhoneNumber || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg text-xs font-medium">
                        {emp.DepartmentName || getDeptName(emp.DepartmentID)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="bg-purple-50 text-purple-700 px-2.5 py-1 rounded-lg text-xs font-medium">
                        {emp.PositionName || getPosName(emp.PositionID)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        emp.Status === 'Đang làm việc' ? 'bg-emerald-100 text-emerald-700' :
                        emp.Status === 'Thử việc' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {emp.Status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button 
                          onClick={() => handleEditEmployee(emp)}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition"
                          title="Sửa"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteEmployee(emp.EmployeeID, emp.FullName)}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition"
                          title="Xóa (chuyển nghỉ việc)"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="px-4 py-12 text-center text-gray-400 italic">
                    {searchQuery ? 'Không tìm thấy nhân viên phù hợp' : 'Chưa có dữ liệu nhân viên'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Footer count */}
        {!loading && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 text-sm text-gray-500">
            Hiển thị {filteredEmployees.length} / {employees.length} nhân viên
          </div>
        )}
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fade-in-up">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-800">
                {editingId ? '✏️ Sửa thông tin nhân viên' : '➕ Thêm nhân viên mới'}
              </h3>
              <button onClick={handleCloseForm} className="p-2 hover:bg-gray-100 rounded-lg transition">
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            
            {/* Form Body */}
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Họ và Tên *</label>
                  <input 
                    type="text" className="w-full border border-gray-200 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                    value={formData.FullName}
                    onChange={(e) => setFormData({...formData, FullName: e.target.value})}
                    placeholder="Nguyễn Văn A"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Email công việc *</label>
                  <input 
                    type="email" className="w-full border border-gray-200 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                    value={formData.Email}
                    onChange={(e) => setFormData({...formData, Email: e.target.value})}
                    placeholder="email@company.com"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Số điện thoại</label>
                  <input 
                    type="tel" className="w-full border border-gray-200 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                    value={formData.PhoneNumber}
                    onChange={(e) => setFormData({...formData, PhoneNumber: e.target.value})}
                    placeholder="0912345678"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Giới tính</label>
                  <select 
                    className="w-full border border-gray-200 p-2.5 rounded-lg outline-none"
                    value={formData.Gender}
                    onChange={(e) => setFormData({...formData, Gender: e.target.value})}
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Ngày sinh</label>
                  <input 
                    type="date" className="w-full border border-gray-200 p-2.5 rounded-lg outline-none"
                    value={formData.DateOfBirth}
                    onChange={(e) => setFormData({...formData, DateOfBirth: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Ngày vào làm</label>
                  <input 
                    type="date" className="w-full border border-gray-200 p-2.5 rounded-lg outline-none"
                    value={formData.HireDate}
                    onChange={(e) => setFormData({...formData, HireDate: e.target.value})}
                  />
                </div>

                {/* DROPDOWN Phòng ban (thay vì nhập số) */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Phòng ban *</label>
                  <select
                    className="w-full border border-gray-200 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.DepartmentID}
                    onChange={(e) => setFormData({...formData, DepartmentID: e.target.value})}
                  >
                    <option value="">-- Chọn phòng ban --</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>

                {/* DROPDOWN Chức vụ (thay vì nhập số) */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Chức vụ</label>
                  <select
                    className="w-full border border-gray-200 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.PositionID}
                    onChange={(e) => setFormData({...formData, PositionID: e.target.value})}
                  >
                    <option value="">-- Chọn chức vụ --</option>
                    {positions.map(pos => (
                      <option key={pos.id} value={pos.id}>{pos.name}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Trạng thái</label>
                  <select 
                    className="w-full border border-gray-200 p-2.5 rounded-lg outline-none"
                    value={formData.Status}
                    onChange={(e) => setFormData({...formData, Status: e.target.value})}
                  >
                    <option value="Đang làm việc">Đang làm việc</option>
                    <option value="Đã nghỉ việc">Đã nghỉ việc</option>
                    <option value="Thử việc">Thử việc</option>
                  </select>
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
              <button onClick={handleCloseForm} className="px-5 py-2.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 font-medium transition">Hủy</button>
              <button onClick={handleSaveEmployee} className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition shadow-sm">
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