import React, { useState, useEffect } from "react";
import { Trash2, Edit2, Plus, Briefcase, Search, X } from "lucide-react";
import { getPositions, createPosition, updatePosition, deletePosition } from "../services/api";

const Positions = () => {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({ name: "" });
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

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

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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

  const filteredPositions = positions.filter((pos) =>
    pos.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <Briefcase className="text-purple-600" size={28} />
            Quản lý Chức vụ
          </h1>
          <p className="text-gray-600">
            Quản lý toàn bộ các chức vụ trong tổ chức — đồng bộ tự động với hệ thống Payroll
          </p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 sticky top-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                {editingId ? "Sửa Chức vụ" : "Thêm Chức vụ"}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tên Chức vụ *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Nhập tên chức vụ"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 rounded-lg transition flex items-center justify-center gap-2"
                  >
                    <Plus size={18} />
                    {editingId ? "Cập nhật" : "Thêm mới"}
                  </button>
                  {editingId && (
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium py-2 rounded-lg transition"
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
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="bg-gray-100 px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Danh sách Chức vụ {loading ? "..." : `(${positions.length})`}
                </h3>
                <div className="relative w-full sm:w-64">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm chức vụ..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                  />
                  {searchTerm && (
                    <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>

              {loading && (
                <div className="px-6 py-8 text-center text-gray-500">
                  Đang tải dữ liệu...
                </div>
              )}

              {!loading && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">STT</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Tên Chức vụ</th>
                        <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPositions.length > 0 ? (
                        filteredPositions.map((pos, index) => (
                          <tr key={pos.id} className="border-b border-gray-200 hover:bg-gray-50 transition">
                            <td className="px-6 py-4 text-sm text-gray-700">{index + 1}</td>
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">{pos.name}</td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleEdit(pos)}
                                  className="text-purple-600 hover:text-purple-800 p-2 rounded hover:bg-purple-50 transition"
                                  title="Sửa"
                                >
                                  <Edit2 size={18} />
                                </button>
                                <button
                                  onClick={() => handleDelete(pos.id)}
                                  className="text-red-600 hover:text-red-800 p-2 rounded hover:bg-red-50 transition"
                                  title="Xóa"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="3" className="px-6 py-8 text-center text-gray-500">
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
    </div>
  );
};

export default Positions;
