import React, { useState, useEffect } from "react";
import { Trash2, Edit2, Plus } from "lucide-react";
import { getDepartments, createDepartment, updateDepartment, deleteDepartment } from "../services/api";

const Department = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
  });

  const [editingId, setEditingId] = useState(null);

  // Lấy danh sách phòng ban từ API khi component load
  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const response = await getDepartments();

      if (response.data.success) {
        setDepartments(response.data.data);
        setError(null);
      } else {
        setError(response.data.message);
      }
    } catch (err) {
      setError(`Lỗi: ${err.message}`);
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleAddDepartment = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert("Vui lòng nhập tên phòng ban");
      return;
    }

    try {
      let response;
      
      if (editingId) {
        // Cập nhật phòng ban
        response = await updateDepartment(editingId, formData);
      } else {
        // Thêm phòng ban mới
        response = await createDepartment(formData);
      }

      if (response.data.success) {
        alert(response.data.message);
        fetchDepartments();
        setFormData({ name: "" });
        setEditingId(null);
      } else {
        alert(response.data.message);
      }
    } catch (err) {
      alert(`Lỗi: ${err.message}`);
      console.error("Error:", err);
    }
  };

  const handleEdit = (dept) => {
    setFormData({ name: dept.name });
    setEditingId(dept.id);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Bạn chắc chắn muốn xóa phòng ban này?")) {
      try {
        const response = await deleteDepartment(id);

        if (response.data.success) {
          alert(response.data.message);
          fetchDepartments();
        } else {
          alert(response.data.message);
        }
      } catch (err) {
        alert(`Lỗi: ${err.message}`);
        console.error("Error:", err);
      }
    }
  };

  const handleCancel = () => {
    setFormData({ name: "" });
    setEditingId(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Quản lý Phòng ban
          </h1>
          <p className="text-gray-600">
            Quản lý toàn bộ các phòng ban trong tổ chức
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Thêm/Sửa Phòng ban */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 sticky top-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                {editingId ? "Sửa Phòng ban" : "Thêm Phòng ban"}
              </h2>

              <form onSubmit={handleAddDepartment} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tên Phòng ban *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Nhập tên phòng ban"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition flex items-center justify-center gap-2"
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

          {/* Danh sách Phòng ban */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              {/* Table Header */}
              <div className="bg-gray-100 px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  Danh sách Phòng ban {loading ? "..." : `(${departments.length})`}
                </h3>
              </div>

              {/* Loading State */}
              {loading && (
                <div className="px-6 py-8 text-center text-gray-500">
                  Đang tải dữ liệu...
                </div>
              )}

              {/* Table Body */}
              {!loading && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                          STT
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                          Tên Phòng ban
                        </th>
                        <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">
                          Hành động
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {departments.length > 0 ? (
                        departments.map((dept, index) => (
                          <tr
                            key={dept.id}
                            className="border-b border-gray-200 hover:bg-gray-50 transition"
                          >
                            <td className="px-6 py-4 text-sm text-gray-700">
                              {index + 1}
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">
                              {dept.name}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleEdit(dept)}
                                  className="text-blue-600 hover:text-blue-800 p-2 rounded hover:bg-blue-50 transition"
                                  title="Sửa"
                                >
                                  <Edit2 size={18} />
                                </button>
                                <button
                                  onClick={() => handleDelete(dept.id)}
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
                            Chưa có phòng ban nào.
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

export default Department;
