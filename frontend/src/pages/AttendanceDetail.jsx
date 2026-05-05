// src/pages/AttendanceDetail.jsx
import React, { useState, useEffect } from 'react';
import { getAttendanceDetail, getAttendanceEmployees } from '../services/api';
import * as XLSX from 'xlsx';

const AttendanceDetail = ({ employeeId: propEmployeeId, onClose, month: propMonth, year: propYear }) => {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(propEmployeeId || null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [attendanceData, setAttendanceData] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(propMonth || new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(propYear || new Date().getFullYear());

  // Load danh sách nhân viên
  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const res = await getAttendanceEmployees();
        setEmployees(res.data || []);
        if (propEmployeeId) {
          setSelectedEmployeeId(propEmployeeId);
        }
      } catch (error) {
        console.error('Lỗi tải danh sách nhân viên:', error);
      }
    };
    loadEmployees();
  }, [propEmployeeId]);

  // Sync month/year when parent passes props (Payroll page)
  useEffect(() => {
    if (propMonth) setSelectedMonth(propMonth);
    if (propYear) setSelectedYear(propYear);
  }, [propMonth, propYear]);

  // Load dữ liệu chấm công khi chọn nhân viên
  useEffect(() => {
    if (selectedEmployeeId) {
      fetchAttendance();
    }
  }, [selectedEmployeeId, selectedMonth, selectedYear]);

  // Normalized role and current user id for permission checks
  const role = (localStorage.getItem('role') || '').toLowerCase();
  const currentUserId = localStorage.getItem('user_id') || localStorage.getItem('userId');
  console.log('AttendanceDetail - Role:', role, 'UserId:', currentUserId);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const res = await getAttendanceDetail(selectedEmployeeId, selectedMonth, selectedYear);
      setAttendanceData(res.data);
    } catch (error) {
      console.error('Lỗi tải dữ liệu chấm công:', error);
      setAttendanceData(null);
    } finally {
      setLoading(false);
    }
  };

  const exportAttendance = () => {
    if (!attendanceData) return;
    const role = (localStorage.getItem('role') || '').toLowerCase();
    const currentUserId = localStorage.getItem('user_id') || localStorage.getItem('userId');
    const empId = attendanceData.employee?.EmployeeID;
    if (!(role === 'admin' || role === 'manager' || String(empId) === String(currentUserId))) return;

    const details = attendanceData.attendance_details || [];
    const wsData = [['Ngày','Thứ','Giờ vào','Giờ ra','Số giờ','Trạng thái']];
    details.forEach(d => wsData.push([d.date, d.weekday, d.check_in || '', d.check_out || '', d.work_hours || '', d.status || '']));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
    XLSX.writeFile(wb, `attendance_${empId}_${attendanceData.month}_${attendanceData.year}.xlsx`);
  };

  // Nếu có onClose, đây là modal
  if (onClose) {
    if (!selectedEmployeeId && propEmployeeId) {
      setSelectedEmployeeId(propEmployeeId);
    }
    
    if (loading) {
      return (
        <div className="bg-white rounded-xl shadow-lg p-6 text-center py-20">
          <div className="text-gray-400">Đang tải dữ liệu chấm công...</div>
        </div>
      );
    }

    if (!attendanceData) {
      return (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-4 border-b pb-3">
            <h2 className="text-xl font-bold text-blue-900">📋 Chấm công nhân viên</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
          </div>
          <div className="text-center py-10 text-gray-400">
            Đang tải hoặc không có dữ liệu...
          </div>
        </div>
      );
    }

    const { employee, statistics, month, year } = attendanceData;

    return (
      <div className="bg-white rounded-xl shadow-lg p-6 max-h-[90vh] overflow-y-auto max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-4 border-b pb-3">
          <h2 className="text-xl font-bold text-blue-900">
            📋 Chấm công tháng {month}/{year}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>

        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <p><strong>Họ tên:</strong> {employee?.FullName}</p>
          <p><strong>Mã NV:</strong> {employee?.EmployeeID}</p>
          <p><strong>Bộ phận:</strong> {employee?.Department || '---'}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-green-50 p-3 rounded-lg text-center">
            <div className="text-sm text-green-600">✅ Ngày công</div>
            <div className="text-2xl font-bold text-green-700">{statistics?.work_days || 0}</div>
          </div>
          <div className="bg-red-50 p-3 rounded-lg text-center">
            <div className="text-sm text-red-600">❌ Vắng không phép</div>
            <div className="text-2xl font-bold text-red-700">{statistics?.absent_days || 0}</div>
          </div>
          <div className="bg-yellow-50 p-3 rounded-lg text-center">
            <div className="text-sm text-yellow-600">ℹ️ Nghỉ có phép</div>
            <div className="text-2xl font-bold text-yellow-700">{statistics?.leave_days || 0}</div>
          </div>
          <div className="bg-blue-50 p-3 rounded-lg text-center">
            <div className="text-sm text-blue-600">📅 Công chuẩn</div>
            <div className="text-2xl font-bold text-blue-700">{statistics?.total_days || 0}</div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100 text-gray-700">
                <th className="p-3 border text-left">Ngày</th>
                <th className="p-3 border text-left">Thứ</th>
                <th className="p-3 border text-left">Giờ vào</th>
                <th className="p-3 border text-left">Giờ ra</th>
                <th className="p-3 border text-right">Số giờ</th>
                <th className="p-3 border text-left">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {attendanceData?.attendance_details?.map((day, idx) => (
                <tr key={idx} className="border-b hover:bg-gray-50">
                  <td className="p-3 border text-center">{day.date?.split('-')[2] || day.date}</td>
                  <td className="p-3 border">{day.weekday}</td>
                  <td className="p-3 border text-center">{day.check_in || '---'}</td>
                  <td className="p-3 border text-center">{day.check_out || '---'}</td>
                  <td className="p-3 border text-right">{day.work_hours || '---'}</td>
                  <td className="p-3 border">
                    <span className={day.status_color === 'text-red-600' ? 'text-red-600 font-bold' : 'text-gray-600'}>
                      {day.status_label || day.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end mt-4">
          {(role === 'admin' || role === 'manager') && (
            <button onClick={() => exportAttendance()} className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-semibold">
              Xuất Excel
            </button>
          )}
        </div>

        <div className="mt-4 pt-3 border-t text-xs text-gray-500">
          <span className="text-green-600">✅ Đi làm</span> | 
          <span className="text-orange-500 ml-2">⚠️ Đi muộn/Về sớm</span> | 
          <span className="text-red-600 ml-2 font-bold">❌ Có ca nhưng không đến</span>
        </div>
      </div>
    );
  }

  // ========== GIAO DIỆN FULL PAGE (khi không có onClose) ==========
  if (!selectedEmployeeId) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-blue-900 mb-4">📋 Bảng Chấm Công</h2>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Chọn nhân viên</label>
          <select
            className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg"
            onChange={(e) => setSelectedEmployeeId(parseInt(e.target.value))}
            value=""
          >
            <option value="" disabled>-- Chọn nhân viên --</option>
            {employees.map(emp => (
              <option key={emp.EmployeeID} value={emp.EmployeeID}>
                {emp.EmployeeID} - {emp.FullName}
              </option>
            ))}
          </select>
        </div>
        <div className="text-center py-10 text-gray-400">
          Vui lòng chọn nhân viên để xem chi tiết chấm công
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 text-center py-20">
        <div className="text-gray-400">Đang tải dữ liệu chấm công...</div>
      </div>
    );
  }

  if (!attendanceData) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <button
          onClick={() => setSelectedEmployeeId(null)}
          className="mb-4 text-blue-600 hover:text-blue-800"
        >
          ← Quay lại chọn nhân viên
        </button>
        <div className="text-center py-10 text-red-500">
          Không có dữ liệu chấm công cho nhân viên này
        </div>
      </div>
    );
  }

  const { employee, statistics, month, year } = attendanceData;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <button
        onClick={() => setSelectedEmployeeId(null)}
        className="mb-4 text-blue-600 hover:text-blue-800"
      >
        ← Quay lại chọn nhân viên
      </button>

      <div className="mb-6 pb-4 border-b">
        <h2 className="text-2xl font-bold text-blue-900">
          📋 Bảng Chấm Công Tháng {month}/{year}
        </h2>
        <p className="text-gray-600 mt-1">
          {employee?.FullName} | Mã NV: {employee?.EmployeeID} | {employee?.Department || '---'}
        </p>
      </div>

      <div className="flex gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tháng</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>Tháng {m}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Năm</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            {[2023, 2024, 2025, 2026].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button
            onClick={fetchAttendance}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            🔍 Xem
          </button>
        </div>
      </div>

      <div className="mb-8">
        <h3 className="font-bold text-lg mb-4 text-gray-800">📊 Tổng hợp tháng {month}/{year}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-green-50 p-4 rounded-xl border border-green-200">
            <div className="text-sm text-green-600 font-medium">✅ Ngày công thực tế</div>
            <div className="text-3xl font-bold text-green-700">{statistics?.work_days || 0} <span className="text-lg">ngày</span></div>
          </div>
          <div className="bg-red-50 p-4 rounded-xl border border-red-200">
            <div className="text-sm text-red-600 font-medium">❌ Vắng mặt (không phép)</div>
            <div className="text-3xl font-bold text-red-700">{statistics?.absent_days || 0} <span className="text-lg">ngày</span></div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200">
            <div className="text-sm text-yellow-600 font-medium">ℹ️ Nghỉ có phép</div>
            <div className="text-3xl font-bold text-yellow-700">{statistics?.leave_days || 0} <span className="text-lg">ngày</span></div>
          </div>
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
            <div className="text-sm text-blue-600 font-medium">📅 Tổng ngày công chuẩn</div>
            <div className="text-3xl font-bold text-blue-700">{statistics?.total_days || 0} <span className="text-lg">ngày</span></div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <h3 className="font-bold text-md mb-3 text-gray-700">📋 Chi tiết theo ngày</h3>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2 text-left">Ngày</th>
              <th className="border p-2 text-left">Thứ</th>
              <th className="border p-2 text-left">Giờ vào</th>
              <th className="border p-2 text-left">Giờ ra</th>
              <th className="border p-2 text-right">Số giờ</th>
              <th className="border p-2 text-left">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {attendanceData?.attendance_details?.map((day, idx) => (
              <tr key={idx} className="border-b hover:bg-blue-50">
                <td className="border p-2">{day.date?.split('-')[2] || day.date}</td>
                <td className="border p-2">{day.weekday}</td>
                <td className="border p-2">{day.check_in || '---'}</td>
                <td className="border p-2">{day.check_out || '---'}</td>
                <td className="border p-2 text-right">{day.work_hours || '---'}</td>
                <td className="border p-2">
                  <span className={day.status_color === 'text-red-600' ? 'text-red-600 font-bold' : 'text-gray-600'}>
                    {day.status_label || day.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end mt-4">
        {(role === 'admin' || role === 'manager' || role === 'employee') && (
          <button onClick={() => exportAttendance()} className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-semibold">
            Xuất Excel
          </button>
        )}
      </div>

      <div className="mt-6 pt-4 border-t text-xs text-gray-500">
        <p className="font-semibold mb-2">📌 Chú thích:</p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <span className="text-green-600">✅ Đi làm đúng giờ</span>
          <span className="text-orange-500">⚠️ Đi muộn / Về sớm</span>
          <span className="text-red-600 font-bold">❌ Có ca nhưng không đến</span>
          <span className="text-gray-400">📅 Ngày nghỉ không có ca</span>
          <span className="text-blue-500">📊 Dữ liệu tổng hợp</span>
        </div>
      </div>
    </div>
  );
};

export default AttendanceDetail;