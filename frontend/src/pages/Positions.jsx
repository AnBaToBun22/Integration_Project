import React, { useState, useEffect } from "react";
import { Trash2, Edit2, Plus, Briefcase } from "lucide-react";
import { getPositions, createPosition, updatePosition, deletePosition } from "../services/api";

const Positions = () => {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({ name: "" });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchPositions();
  }, []);

  const fetchPositions = async () => {
    try {
      setLoading(true);
      const response = await getPositions();
      if (response.data.success) {
        setPositions(response.data.data);
        setError(null);
      } else {
        setError(response.data.message);
      }
    } catch (err) {
      setError(`Lỗi: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert("Vui lòng nhập tên chức vụ");
      return;
    }

    try {
      let response;
      if (editingId) {
        response = await updatePosition(editingId, formData);
      } else {
        response = await createPosition(formData);
      }

      if (response.data.success) {
        alert(response.data.message);
        fetchPositions();
        setFormData({ name: "" });
        setEditingId(null);
      } else {
        alert(response.data.message);
      }
    } catch (err) {
      alert(`Lỗi: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleEdit = (pos) => {
    setFormData({ name: pos.name });
    setEditingId(pos.id);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Bạn chắc chắn muốn xóa chức vụ này?")) {
      try {
        const response = await deletePosition(id);
        if (response.data.success) {
          alert(response.data.message);
          fetchPositions();
        } else {
          alert(response.data.message);
        }
      } catch (err) {
        alert(`Lỗi: ${err.response?.data?.message || err.message}`);
      }
    }
  };

  const handleCancel = () => {
    setFormData({ name: "" });
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Quản lý Chức vụ</h2>
        <p className="text-sm text-gray-500 mt-1">
          Quản lý toàn bộ các chức vụ • Tự động đồng bộ sang Payroll (MySQL)
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Briefcase size={20} className="text-purple-600" />
              {editingId ? "Sửa Chức vụ" : "Thêm Chức vụ"}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tên Chức vụ *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ name: e.target.value })}
                  placeholder="Nhập tên chức vụ"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-medium py-2.5 rounded-lg transition flex items-center justify-center gap-2"
                >
                  <Plus size={18} />
                  {editingId ? "Cập nhật" : "Thêm mới"}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 rounded-lg transition"
                  >
                    Hủy
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Table */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">
                Danh sách Chức vụ {loading ? "..." : `(${positions.length})`}
              </h3>
            </div>

            {loading ? (
              <div className="px-6 py-12 text-center text-gray-400">Đang tải dữ liệu...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">STT</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">Tên Chức vụ</th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-gray-600">Số NV</th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-gray-600">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {positions.length > 0 ? (
                      positions.map((pos, index) => (
                        <tr key={pos.id} className="border-b border-gray-100 hover:bg-purple-50/30 transition">
                          <td className="px-6 py-4 text-sm text-gray-500">{index + 1}</td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-800">{pos.name}</td>
                          <td className="px-6 py-4 text-center">
                            <span className="bg-purple-100 text-purple-700 px-2.5 py-1 rounded-lg text-xs font-medium">
                              {pos.employee_count || 0} nhân viên
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleEdit(pos)}
                                className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition"
                                title="Sửa"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(pos.id)}
                                className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition"
                                title="Xóa"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="px-6 py-12 text-center text-gray-400 italic">
                          Chưa có chức vụ nào.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Positions;
