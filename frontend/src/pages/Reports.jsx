import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function Reports() {
    const [data, setData] = useState([]);
    const [month, setMonth] = useState('12');
    const [year, setYear] = useState('2025');
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        const fetchReportData = async () => {
            try {
                setErrorMsg(''); 
                
                // GỌI API: Đổi endpoint cho đúng với file report_routes.py (attendance)
                // Lưu ý: Bỏ phần Authorization vì chưa có Login
                const response = await axios.get(`http://localhost:5000/api/reports/attendance?month=${month}&year=${year}`);
                
                setData(response.data); 
                
            } catch (error) {
                console.error("Lỗi khi lấy dữ liệu:", error);
                setErrorMsg("❌ Không thể lấy dữ liệu báo cáo. Vui lòng kiểm tra Backend!");
            }
        };

        fetchReportData();
    }, [month, year]);

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg max-w-5xl mx-auto mt-8">
            <div className="flex justify-between items-center mb-8 border-b pb-4">
                <div>
                    <h2 className="text-2xl font-bold text-blue-900">Báo Cáo Chuyên Cần & Chấm Công</h2>
                    <p className="text-gray-500 text-sm italic">* Dữ liệu tích hợp từ hệ thống Payroll (MySQL)</p>
                </div>
                
                <div className="flex gap-3">
                    <select 
                        value={month} 
                        onChange={(e) => setMonth(e.target.value)}
                        className="border-2 border-blue-100 p-2 rounded-lg focus:border-blue-500 outline-none transition"
                    >
                        {[...Array(12)].map((_, i) => (
                            <option key={i+1} value={i+1}>Tháng {i+1}</option>
                        ))}
                    </select>

                    <select 
                        value={year} 
                        onChange={(e) => setYear(e.target.value)}
                        className="border-2 border-blue-100 p-2 rounded-lg focus:border-blue-500 outline-none transition"
                    >
                        <option value="2024">2024</option>
                        <option value="2025">2025</option>
                    </select>
                </div>
            </div>

            {errorMsg && <div className="text-red-500 font-semibold mb-4 bg-red-50 p-3 rounded-lg border border-red-200">{errorMsg}</div>}

            {/* Hiển thị biểu đồ Recharts */}
            {!errorMsg && data.length > 0 ? (
                <div className="h-[450px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis 
                                dataKey="FullName" 
                                angle={-45} 
                                textAnchor="end" 
                                interval={0} 
                                height={80}
                                tick={{ fontSize: 12 }}
                            />
                            <YAxis />
                            <Tooltip 
                                contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Legend verticalAlign="top" height={36}/>
                            <Bar dataKey="TotalWorkDays" fill="#10B981" name="Ngày công" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="TotalAbsentDays" fill="#EF4444" name="Vắng mặt" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                !errorMsg && <div className="text-center py-20 text-gray-400">Không có dữ liệu cho khoảng thời gian này.</div>
            )}
        </div>
    );
}