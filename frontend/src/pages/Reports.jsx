import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

export default function Reports() {
    // 1. Tạo State để lưu trữ bộ lọc và dữ liệu
    const [data, setData] = useState([]);
    const [month, setMonth] = useState('12');
    const [year, setYear] = useState('2025');
    const [errorMsg, setErrorMsg] = useState('');

    // 2. Tự động gọi API mỗi khi month hoặc year thay đổi
    useEffect(() => {
        const fetchReportData = async () => {
            try {
                // Xóa lỗi cũ nếu có
                setErrorMsg(''); 
                
                // Lấy token từ localStorage (sau khi Login)
                const token = localStorage.getItem('token'); 

                // 3. Dùng axios Bắn request kèm tham số month, year và Token
                const response = await axios.get(`http://localhost:5000/api/reports/payroll?month=${month}&year=${year}`, {
                    headers: {
                        Authorization: `Bearer ${token}` // Gắn token vào Header
                    }
                });
                
                // Đổ dữ liệu vào biểu đồ
                setData(response.data); 
                
            } catch (error) {
                // Xử lý lỗi 403 Forbidden từ Backend trả về
                if (error.response && error.response.status === 403) {
                    setErrorMsg("⛔ Bạn không có quyền xem báo cáo tài chính này!");
                    setData([]); // Xóa trắng dữ liệu
                } else {
                    console.error("Lỗi khi lấy dữ liệu:", error);
                }
            }
        };

        fetchReportData();
    }, [month, year]); // Mảng [month, year] nghĩa là: hễ tháng/năm đổi -> chạy lại API

    return (
        <div className="bg-white p-6 rounded-lg shadow-md max-w-4xl mx-auto mt-8">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Báo Cáo Chi Phí Lương</h2>
                
                {/* 4. Bộ Dropdown (Select Box) */}
                <div className="flex gap-4">
                    <select 
                        value={month} 
                        onChange={(e) => setMonth(e.target.value)}
                        className="border p-2 rounded focus:ring-blue-500"
                    >
                        <option value="10">Tháng 10</option>
                        <option value="11">Tháng 11</option>
                        <option value="12">Tháng 12</option>
                    </select>

                    <select 
                        value={year} 
                        onChange={(e) => setYear(e.target.value)}
                        className="border p-2 rounded focus:ring-blue-500"
                    >
                        <option value="2024">2024</option>
                        <option value="2025">2025</option>
                    </select>
                </div>
            </div>

            {/* Hiển thị dòng thông báo lỗi màu đỏ nếu bị 403 */}
            {errorMsg && <div className="text-red-500 font-semibold mb-4 bg-red-100 p-3 rounded">{errorMsg}</div>}

            {/* 5. Biểu đồ */}
            {!errorMsg && (
                <BarChart width={800} height={400} data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)} />
                    <Legend />
                    <Bar dataKey="TotalPayrollCost" fill="#4F46E5" name="Tổng quỹ lương" />
                </BarChart>
            )}
        </div>
    );
}