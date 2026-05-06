import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { 
    TrendingUp, Users, DollarSign, Calendar, 
    Download, FileText, Filter, ChevronRight,
    Award, AlertTriangle, CheckCircle2
} from 'lucide-react';

export default function Reports() {
    const [activeTab, setActiveTab] = useState('summary');
    const [month, setMonth] = useState('9');
    const [year, setYear] = useState('2024');
    
    const [summary, setSummary] = useState(null);
    const [attendanceData, setAttendanceData] = useState([]);
    const [salaryData, setSalaryData] = useState([]);
    
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const userRole = localStorage.getItem('role') || 'Employee';


    // Fetch Tổng quan
    useEffect(() => {
        const fetchSummary = async () => {
            try {
                const res = await api.get('/reports/summary');
                setSummary(res.data);
            } catch (err) { console.error("Lỗi load summary:", err); }
        };
        fetchSummary();
    }, []);

    // Fetch dữ liệu theo tab và thời gian
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setErrorMsg('');
            try {
                if (activeTab === 'attendance') {
                    const res = await api.get(`/reports/attendance?month=${month}&year=${year}&showall=true`);
                    setAttendanceData(res.data);
                } else if (activeTab === 'salary') {
                    const res = await api.get(`/reports/payroll_list?month=${month}&year=${year}`);
                    setSalaryData(res.data);
                }
            } catch (error) {
                setErrorMsg("Không thể tải dữ liệu báo cáo. Vui lòng thử lại.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [month, year, activeTab]);


    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'];

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Header Section */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight">Hệ Thống Báo Cáo Tích Hợp</h2>
                    <p className="text-gray-500 mt-1 flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-emerald-500" /> 
                        Dữ liệu realtime từ HR (SQL Server) & Payroll (MySQL)
                    </p>
                </div>
                
                <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-2 px-3 border-r border-gray-200">
                        <Filter size={16} className="text-gray-400" />
                        <span className="text-xs font-bold text-gray-400 uppercase">Kỳ báo cáo</span>
                    </div>
                    <select value={month} onChange={(e) => setMonth(e.target.value)}
                        className="bg-transparent border-none text-sm font-bold text-gray-700 focus:ring-0 cursor-pointer">
                        {[...Array(12)].map((_, i) => <option key={i+1} value={i+1}>Tháng {i+1}</option>)}
                    </select>
                    <select value={year} onChange={(e) => setYear(e.target.value)}
                        className="bg-transparent border-none text-sm font-bold text-gray-700 focus:ring-0 cursor-pointer">
                        <option value="2024">2024</option>
                        <option value="2025">2025</option>
                    </select>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex flex-wrap gap-2">
                {[
                    { id: 'summary', label: 'Tổng quan', icon: TrendingUp },
                    { id: 'attendance', label: 'Chấm công', icon: Calendar },
                    { id: 'salary', label: 'Chi tiết lương', icon: DollarSign },
                ].map(tab => (
                    <button key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-6 py-3 rounded-2xl font-bold transition-all flex items-center gap-2 shadow-sm ${
                            activeTab === tab.id 
                                ? 'bg-blue-900 text-white shadow-blue-200' 
                                : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-100'
                        }`}
                    >
                        <tab.icon size={18} />
                        {tab.label}
                    </button>
                ))}
                
                <div className="ml-auto flex gap-2">
                    <button className="p-3 bg-white text-gray-400 hover:text-emerald-600 rounded-2xl border border-gray-100 shadow-sm transition-all hover:scale-105">
                        <Download size={20} />
                    </button>
                    <button className="p-3 bg-white text-gray-400 hover:text-blue-600 rounded-2xl border border-gray-100 shadow-sm transition-all hover:scale-105">
                        <FileText size={20} />
                    </button>
                </div>
            </div>

            {errorMsg && (
                <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                    <AlertTriangle size={20} />
                    <span className="font-medium">{errorMsg}</span>
                </div>
            )}

            {/* TAB CONTENT AREA */}
            <div className="min-h-[500px]">
                
                {/* 1. Tab: Tổng quan (Summary) */}
                {activeTab === 'summary' && summary && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4">
                        {/* Stats Cards */}
                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                            <div className="flex justify-between items-start">
                                <div className="p-3 bg-blue-50 rounded-2xl text-blue-600"><Users size={24} /></div>
                                <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-2 py-1 rounded-full">+12%</span>
                            </div>
                            <div>
                                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Tổng nhân sự</p>
                                <h3 className="text-3xl font-black text-gray-900">{summary.hr.total_employees}</h3>
                            </div>
                            <p className="text-xs text-gray-400 italic">Dữ liệu từ HUMAN_2025</p>
                        </div>

                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                            <div className="flex justify-between items-start">
                                <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600"><DollarSign size={24} /></div>
                                <span className="text-[10px] font-black text-blue-500 bg-blue-50 px-2 py-1 rounded-full">Ổn định</span>
                            </div>
                            <div>
                                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Tổng quỹ lương</p>
                                <h3 className="text-2xl font-black text-gray-900">{formatCurrency(summary.payroll.total_salary)}</h3>
                            </div>
                            <p className="text-xs text-gray-400 italic">Dữ liệu từ Payroll DB</p>
                        </div>

                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                            <div className="flex justify-between items-start">
                                <div className="p-3 bg-purple-50 rounded-2xl text-purple-600"><Award size={24} /></div>
                                <span className="text-[10px] font-black text-purple-500 bg-purple-50 px-2 py-1 rounded-full">Active</span>
                            </div>
                            <div>
                                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Phòng ban</p>
                                <h3 className="text-3xl font-black text-gray-900">{summary.hr.departments}</h3>
                            </div>
                            <p className="text-xs text-gray-400 italic">Cấu trúc tổ chức</p>
                        </div>

                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                            <div className="flex justify-between items-start">
                                <div className="p-3 bg-red-50 rounded-2xl text-red-600"><AlertTriangle size={24} /></div>
                                <span className="text-[10px] font-black text-red-500 bg-red-50 px-2 py-1 rounded-full">Cảnh báo</span>
                            </div>
                            <div>
                                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Vắng mặt (Avg)</p>
                                <h3 className="text-3xl font-black text-gray-900">{summary.attendance.total_absent} <span className="text-sm text-gray-300">lượt</span></h3>
                            </div>
                            <p className="text-xs text-gray-400 italic">Cần chú ý nhân sự</p>
                        </div>

                        {/* Summary Charts */}
                        <div className="lg:col-span-3 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                            <h4 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                                <TrendingUp size={20} className="text-blue-600" /> Xu hướng chi phí nhân sự
                            </h4>
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart 
                                        data={[
                                            { name: 'Quỹ Lương', value: summary.payroll.total_salary },
                                            { name: 'Thưởng', value: summary.payroll.total_salary * 0.12 },
                                            { name: 'Bảo hiểm', value: summary.payroll.total_salary * 0.21 }
                                        ]}
                                        margin={{ top: 10, right: 30, left: 40, bottom: 0 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                        <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 500 }} />
                                        <YAxis 
                                            tickFormatter={(value) => value >= 1000000 ? `${(value/1000000).toFixed(0)}M` : value}
                                            tick={{ fontSize: 11, fill: '#94a3b8' }}
                                            width={60}
                                        />
                                        <Tooltip 
                                            formatter={(value) => formatCurrency(value)}
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                        />
                                        <Bar dataKey="value" fill="#3B82F6" radius={[10, 10, 0, 0]} barSize={60} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="lg:col-span-1 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                             <h4 className="font-bold text-gray-800 mb-6">Cơ cấu phòng ban</h4>
                             <div className="h-[300px] flex items-center justify-center">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={[
                                            { name: 'Hoạt động', value: summary.hr.active_employees },
                                            { name: 'Khác', value: summary.hr.total_employees - summary.hr.active_employees }
                                        ]} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                            <Cell fill="#10B981" />
                                            <Cell fill="#f3f4f6" />
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute text-center">
                                    <p className="text-2xl font-black text-emerald-600">{summary.hr.active_employees}</p>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase">Active</p>
                                </div>
                             </div>
                        </div>
                    </div>
                )}

                {/* 2. Tab: Chấm công (Attendance) */}
                {activeTab === 'attendance' && (
                    <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm animate-in fade-in">
                        <div className="flex justify-between items-center mb-8">
                            <h4 className="font-bold text-gray-800 flex items-center gap-2">
                                <Calendar size={20} className="text-emerald-500" /> Phân tích chuyên cần tháng {month}/{year}
                            </h4>
                        </div>
                        {isLoading ? (
                            <div className="h-[400px] flex items-center justify-center text-gray-400">Đang phân tích dữ liệu chấm công...</div>
                        ) : attendanceData.length > 0 ? (
                            <div className="h-[450px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={attendanceData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                        <XAxis dataKey="FullName" angle={-45} textAnchor="end" interval={0} height={80} tick={{ fontSize: 11, fontWeight: 'bold' }} />
                                        <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} width={30} />
                                        <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                        <Legend verticalAlign="top" height={36} iconType="circle" />
                                        <Bar dataKey="TotalWorkDays" fill="#10B981" name="Ngày công" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="TotalLeaveDays" fill="#F59E0B" name="Nghỉ phép" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="TotalAbsentDays" fill="#EF4444" name="Vắng mặt" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="h-[400px] flex items-center justify-center text-gray-400 italic">Không có dữ liệu chấm công cho kỳ này.</div>
                        )}
                    </div>
                )}

                {/* 3. Tab: Chi tiết lương (Salary Details) */}
                {activeTab === 'salary' && (
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden animate-in fade-in">
                        <div className="p-8 border-b border-gray-50 flex justify-between items-center">
                             <h4 className="font-bold text-gray-800">Bảng chi trả lương chi tiết</h4>
                             <span className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full font-bold">Kỳ lương {month}/{year}</span>
                        </div>
                        {isLoading ? (
                            <div className="p-20 text-center text-gray-400">Đang truy xuất bảng lương...</div>
                        ) : salaryData.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-widest">
                                            <th className="px-8 py-5">Họ Tên Nhân Viên</th>
                                            <th className="px-8 py-5 text-right">Lương Cơ Bản</th>
                                            <th className="px-8 py-5 text-right">Thưởng</th>
                                            <th className="px-8 py-5 text-right">Khấu Trừ</th>
                                            <th className="px-8 py-5 text-right">Thực Nhận</th>
                                            <th className="px-8 py-5"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {salaryData.map((row) => (
                                            <tr key={row.SalaryID} className="hover:bg-gray-50/50 transition-colors group">
                                                <td className="px-8 py-4 font-bold text-gray-700">{row.FullName}</td>
                                                <td className="px-8 py-4 text-right text-gray-500 font-medium">{formatCurrency(row.BaseSalary)}</td>
                                                <td className="px-8 py-4 text-right text-emerald-600 font-bold">+{formatCurrency(row.Bonus)}</td>
                                                <td className="px-8 py-4 text-right text-red-500 font-bold">-{formatCurrency(row.Deductions)}</td>
                                                <td className="px-8 py-4 text-right font-black text-blue-900">{formatCurrency(row.NetSalary)}</td>
                                                <td className="px-8 py-4 text-center">
                                                    <ChevronRight size={16} className="text-gray-300 group-hover:text-blue-500 transition-colors cursor-pointer" />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-blue-900 text-white font-black">
                                            <td className="px-8 py-6">TỔNG CỘNG QUỸ LƯƠNG</td>
                                            <td className="px-8 py-6 text-right opacity-70">{formatCurrency(salaryData.reduce((s, r) => s + r.BaseSalary, 0))}</td>
                                            <td className="px-8 py-6 text-right text-emerald-400">+{formatCurrency(salaryData.reduce((s, r) => s + r.Bonus, 0))}</td>
                                            <td className="px-8 py-6 text-right text-red-300">-{formatCurrency(salaryData.reduce((s, r) => s + r.Deductions, 0))}</td>
                                            <td className="px-8 py-6 text-right text-yellow-400 text-xl">{formatCurrency(salaryData.reduce((s, r) => s + r.NetSalary, 0))}</td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        ) : (
                            <div className="p-20 text-center text-gray-400 italic">Không tìm thấy dữ liệu lương.</div>
                        )}
                    </div>
                )}


            </div>

        </div>
    );
}