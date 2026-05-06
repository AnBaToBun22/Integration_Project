// src/components/TimeAttendance.jsx
import React, { useState } from 'react';
import * as XLSX from 'xlsx';

const TimeAttendance = () => {
  const [attendanceData] = useState([
    { date: "01/03", weekday: "T2", checkin: "07:55", checkout: "11:30", workHours: 4.0, status: "Đi làm đúng giờ", absentNoPermission: false },
    { date: "02/03", weekday: "T3", checkin: "08:20", checkout: "11:30", workHours: 3.7, status: "Đi muộn 20p", absentNoPermission: false },
    { date: "03/03", weekday: "T4", checkin: "--", checkout: "--", workHours: 0, status: "Có ca nhưng không đến", absentNoPermission: true },
    { date: "04/03", weekday: "T5", checkin: "--", checkout: "--", workHours: 0, status: "Nghỉ có phép", absentNoPermission: false },
    { date: "05/03", weekday: "T6", checkin: "07:58", checkout: "11:30", workHours: 4.0, status: "Đi làm", absentNoPermission: false },
    { date: "05/03", weekday: "T6", checkin: "13:02", checkout: "17:35", workHours: 4.55, status: "Đi làm (+ tăng ca)", absentNoPermission: false },
    { date: "07/03", weekday: "CN", checkin: "--", checkout: "--", workHours: 0, status: "Có ca nhưng không đến", absentNoPermission: true },
    { date: "10/03", weekday: "T3", checkin: "07:50", checkout: "11:30", workHours: 4.0, status: "Đi làm", absentNoPermission: false },
    { date: "10/03", weekday: "T3", checkin: "13:00", checkout: "17:30", workHours: 4.5, status: "Đi làm", absentNoPermission: false },
  ]);

  const totalWorkDays = attendanceData.filter(item => item.workHours > 0 && !item.status.includes("Nghỉ")).length;
  const totalNoPermission = attendanceData.filter(item => item.absentNoPermission).length;
  const totalLate = attendanceData.filter(item => item.status.includes("Đi muộn")).length;
  const totalApprovedLeave = attendanceData.filter(item => item.status.includes("Nghỉ có phép")).length;
  const totalOvertime = attendanceData.reduce((sum, item) => {
    if (item.status.includes("tăng ca")) return sum + 0.5;
    return sum;
  }, 0);
  const totalWorkHours = attendanceData.reduce((sum, item) => sum + item.workHours, 0);
  const role = (localStorage.getItem('role') || '').toLowerCase();
  const currentUserId = localStorage.getItem('user_id') || localStorage.getItem('userId');
  
  const standardDays = 26;
  const standardHours = standardDays * 8;
  const remainingHours = standardHours - totalWorkHours;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-900 to-blue-700 px-6 py-4 rounded-t-lg">
          <h2 className="text-2xl font-bold text-white">📋 BẢNG CHẤM CÔNG THÁNG 03/2025</h2>
          <p className="text-blue-100 mt-1">Chi tiết ngày công và giờ làm việc</p>
        </div>
        
        <div className="p-6">
          <div className="mb-6 pb-4 border-b">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">Họ và tên</p>
                <p className="text-lg font-semibold text-gray-800">Nguyễn Thị Minh Tâm</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Mã nhân viên</p>
                <p className="text-lg font-semibold text-gray-800">NV1024</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Bộ phận</p>
                <p className="text-lg font-semibold text-gray-800">Hành chính - Nhân sự</p>
              </div>
            </div>
          </div>

          {/* I. TỔNG HỢP NGÀY CÔNG */}
          <div className="mb-6">
            <div className="bg-blue-50 px-4 py-2 rounded-t-lg border-l-4 border-blue-600">
              <h3 className="font-bold text-blue-900 text-lg">I. TỔNG HỢP NGÀY CÔNG THÁNG 03/2025</h3>
            </div>
            <div className="bg-white border rounded-b-lg overflow-hidden">
              <table className="w-full border-collapse text-sm">
                <tbody>
                  <tr className="border-b bg-gray-50">
                    <td className="p-3 font-semibold text-gray-700 w-1/2">Số công chuẩn của tháng</td>
                    <td className="p-3 text-right font-bold text-blue-700">{standardDays} ngày ({standardHours} giờ)</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-3 font-semibold text-gray-700">✅ Số ngày đi làm thực tế</td>
                    <td className="p-3 text-right text-green-700 font-bold">{totalWorkDays} ngày</td>
                  </tr>
                  <tr className="border-b bg-gray-50">
                    <td className="p-3 font-semibold text-gray-700">📊 Tổng số giờ làm việc</td>
                    <td className="p-3 text-right text-blue-700 font-bold">{totalWorkHours.toFixed(1)} giờ</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-3 font-semibold text-gray-700">⏰ Số giờ còn thiếu so với chuẩn</td>
                    <td className="p-3 text-right text-orange-600 font-bold">{remainingHours.toFixed(1)} giờ</td>
                  </tr>
                  <tr className="border-b bg-gray-50">
                    <td className="p-3 font-semibold text-gray-700">📅 Số giờ tăng ca (OT)</td>
                    <td className="p-3 text-right text-purple-700 font-bold">{totalOvertime.toFixed(1)} giờ</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="flex justify-end mt-4">
              {(role === 'admin' || role === 'manager' || role === 'employee') && (
                <button onClick={() => {
                  const wsData = [["Ngày","Thứ","Giờ vào","Giờ ra","Số giờ","Trạng thái"]];
                  attendanceData.forEach(d => wsData.push([d.date, d.weekday, d.checkin || '', d.checkout || '', d.workHours || '', d.status || '']));
                  const wb = XLSX.utils.book_new();
                  const ws = XLSX.utils.aoa_to_sheet(wsData);
                  XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
                  const fn = `attendance_export_${localStorage.getItem('user_id') || localStorage.getItem('userId') || 'user'}_${new Date().toISOString().slice(0,10)}.xlsx`;
                  XLSX.writeFile(wb, fn);
                }} className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-semibold">
                  Xuất Excel
                </button>
              )}
            </div>
          </div>

          {/* II. PHÂN TÍCH VI PHẠM */}
          <div className="mb-6">
            <div className="bg-orange-50 px-4 py-2 rounded-t-lg border-l-4 border-orange-500">
              <h3 className="font-bold text-orange-800 text-lg">II. PHÂN TÍCH ĐI MUỘN - VẮNG MẶT</h3>
            </div>
            <div className="bg-white border rounded-b-lg overflow-hidden">
              <table className="w-full">
                <tbody>
                  <tr className="border-b bg-gray-50">
                    <td className="p-3 font-semibold text-gray-700 w-1/2">⚠️ Số ngày đi muộn / về sớm</td>
                    <td className="p-3 text-right text-orange-600 font-bold">{totalLate} ngày</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-3 font-semibold text-gray-700">ℹ️ Số ngày nghỉ có phép</td>
                    <td className="p-3 text-right text-yellow-600 font-bold">{totalApprovedLeave} ngày</td>
                  </tr>
                  <tr className="border-b bg-gray-50">
                    <td className="p-3 font-semibold text-gray-700">❌ Số ngày có ca nhưng không đến</td>
                    <td className="p-3 text-right text-red-600 font-bold">{totalNoPermission} ngày</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-3 font-semibold text-gray-700">📈 Tỷ lệ vắng mặt không phép</td>
                    <td className="p-3 text-right text-red-600 font-bold">{((totalNoPermission / standardDays) * 100).toFixed(1)}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* III. CHI TIẾT THEO NGÀY */}
          <div className="mb-6">
            <div className="bg-green-50 px-4 py-2 rounded-t-lg border-l-4 border-green-600">
              <h3 className="font-bold text-green-800 text-lg">III. CHI TIẾT CHẤM CÔNG THEO NGÀY</h3>
            </div>
            <div className="bg-white border rounded-b-lg overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-100 text-gray-700">
                    <th className="p-3 border text-left">Ngày</th>
                    <th className="p-3 border text-left">Thứ</th>
                    <th className="p-3 border text-left">Giờ vào</th>
                    <th className="p-3 border text-left">Giờ ra</th>
                    <th className="p-3 border text-right">Số giờ</th>
                    <th className="p-3 border text-left">Trạng thái</th>
                    <th className="p-3 border text-center">Có ca nhưng không đến</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceData.map((item, idx) => (
                    <tr key={idx} className={item.absentNoPermission ? 'bg-red-50' : 'border-b hover:bg-gray-50'}>
                      <td className="p-3 border">{item.date}</td>
                      <td className="p-3 border">{item.weekday}</td>
                      <td className="p-3 border">{item.checkin}</td>
                      <td className="p-3 border">{item.checkout}</td>
                      <td className="p-3 border text-right font-mono">{item.workHours.toFixed(1)}</td>
                      <td className="p-3 border">
                        <span className={item.absentNoPermission ? 'text-red-600 font-bold' : (item.status.includes("Đi muộn") ? 'text-orange-500' : 'text-green-600')}>
                          {item.status}
                        </span>
                      </td>
                      <td className="p-3 border text-center">
                        {item.absentNoPermission ? (
                          <span className="text-red-600 font-bold">✔️ CÓ</span>
                        ) : (
                          <span className="text-gray-400">———</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Chú thích */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
            <p className="font-semibold text-gray-700 mb-2">📌 CHÚ THÍCH:</p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>✅ Đi làm đúng giờ</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span>⚠️ Đi muộn / Về sớm</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span>❌ Có ca nhưng không đến</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span>ℹ️ Nghỉ có phép</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <span>📅 Có tăng ca</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-4 pt-3 border-t text-center text-xs text-gray-400">
            <p>Dữ liệu được tổng hợp từ hệ thống chấm công | Cập nhật lần cuối: {new Date().toLocaleDateString('vi-VN')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimeAttendance;