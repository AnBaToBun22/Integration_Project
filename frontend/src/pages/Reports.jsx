import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { RefreshCw } from 'lucide-react';
import { getAttendanceReport } from '../services/api';

export default function Reports() {
    const [data, setData] = useState([]);
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [errorMsg, setErrorMsg] = useState('');
    const [loading, setLoading] = useState(false);
    const [showAll, setShowAll] = useState(true);

    const fetchReportData = async () => {
        try {
            setErrorMsg('');
            setLoading(true);
            const response = await getAttendanceReport(month, year, showAll);
            setData(response.data); 
        } catch (error) {
            console.error("Lỗi khi lấy dữ liệu:", error);
            setErrorMsg("❌ Không thể lấy dữ liệu báo cáo. Vui lòng kiểm tra Backend!");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReportData();
    }, [month, year, showAll]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Báo Cáo Chuyên Cần & Chấm Công</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Dữ liệu tích hợp từ hệ thống Payroll (MySQL) • {data.length} nhân viên
                    </p>
                </div>
                
                <div className="flex items-center gap-3">
                    <select 
                        value={month} 
                        onChange={(e) => setMonth(parseInt(e.target.value))}
                        className="border border-gray-200 p-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
                    >
                        {[...Array(12)].map((_, i) => (
                            <option key={i+1} value={i+1}>Tháng {i+1}</option>
                        ))}
                    </select>

                    <select 
                        value={year} 
                        onChange={(e) => setYear(parseInt(e.target.value))}
                        className="border border-gray-200 p-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
                    >
                        {[2023, 2024, 2025, 2026].map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>

                    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                        <input 
                            type="checkbox" 
                            checked={showAll}
                            onChange={(e) => setShowAll(e.target.checked)}
                            className="rounded"
                        />
                        Hiển thị tất cả
                    </label>

                    <button 
                        onClick={fetchReportData}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition shadow-sm text-sm font-medium"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        Tải lại
                    </button>
                </div>
            </div>

            {errorMsg && (
                <div className="text-red-500 font-semibold bg-red-50 p-4 rounded-xl border border-red-200">{errorMsg}</div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                {loading ? (
                    <div className="h-[450px] flex items-center justify-center">
                        <RefreshCw size={24} className="animate-spin text-blue-500" />
                    </div>
                ) : data.length > 0 ? (
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
                                <Bar dataKey="TotalLeaveDays" fill="#F59E0B" name="Nghỉ phép" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="TotalAbsentDays" fill="#EF4444" name="Vắng mặt" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="h-[300px] flex items-center justify-center text-gray-400 italic">
                        Không có dữ liệu cho tháng {month}/{year}
                    </div>
                )}
            </div>
        </div>
    );
}