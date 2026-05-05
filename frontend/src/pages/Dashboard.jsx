import React, { useState, useEffect } from "react";
import axios from "axios";
import {
    RefreshCw,
    Users,
    DollarSign,
    Building2,
    Database,
    CheckCircle2,
    XCircle,
    FileText,
    UserCheck,
} from "lucide-react";

const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [lastRefresh, setLastRefresh] = useState(null);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const response = await axios.get(
                "http://127.0.0.1:5000/api/dashboard/stats",
            );
            setStats(response.data);
            setLastRefresh(new Date());
        } catch (error) {
            console.error("Lỗi lấy dữ liệu Dashboard:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    // Format tiền VNĐ
    const formatMoney = (amount) => {
        if (amount >= 1_000_000_000)
            return (amount / 1_000_000_000).toFixed(1) + " tỷ";
        if (amount >= 1_000_000)
            return (amount / 1_000_000).toFixed(0) + " triệu";
        return new Intl.NumberFormat("vi-VN").format(amount);
    };

    const username = localStorage.getItem("username") || "User";
    const userRole = localStorage.getItem("role") || "Employee";

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">
                        Dashboard Tổng Quan
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Xin chào{" "}
                        <span className="font-semibold text-blue-600">
                            {username}
                        </span>{" "}
                        ({userRole})
                        {lastRefresh && (
                            <span className="ml-2">
                                • Cập nhật lúc{" "}
                                {lastRefresh.toLocaleTimeString("vi-VN")}
                            </span>
                        )}
                    </p>
                </div>
                <button
                    onClick={fetchStats}
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-sm hover:shadow-md flex items-center gap-2 active:scale-95"
                >
                    <RefreshCw
                        size={16}
                        className={loading ? "animate-spin" : ""}
                    />
                    {loading ? "Đang tải..." : "Làm mới"}
                </button>
            </div>

            {/* Trạng thái kết nối */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                        stats?.hr_connected
                            ? "bg-emerald-50 border-emerald-200"
                            : "bg-red-50 border-red-200"
                    }`}
                >
                    <Database
                        size={20}
                        className={
                            stats?.hr_connected
                                ? "text-emerald-600"
                                : "text-red-500"
                        }
                    />
                    <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-700">
                            HR Database (SQL Server)
                        </p>
                        <p className="text-xs text-gray-500">
                            HUMAN_2025 • (localdb)\MSSQLLocalDB
                        </p>
                    </div>
                    {stats?.hr_connected ? (
                        <span className="flex items-center gap-1 text-emerald-600 text-sm font-semibold">
                            <CheckCircle2 size={16} /> Đã kết nối
                        </span>
                    ) : (
                        <span className="flex items-center gap-1 text-red-500 text-sm font-semibold">
                            <XCircle size={16} /> Mất kết nối
                        </span>
                    )}
                </div>

                <div
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                        stats?.payroll_connected
                            ? "bg-emerald-50 border-emerald-200"
                            : "bg-red-50 border-red-200"
                    }`}
                >
                    <Database
                        size={20}
                        className={
                            stats?.payroll_connected
                                ? "text-emerald-600"
                                : "text-red-500"
                        }
                    />
                    <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-700">
                            Payroll Database (MySQL)
                        </p>
                        <p className="text-xs text-gray-500">
                            payroll • localhost:3306
                        </p>
                    </div>
                    {stats?.payroll_connected ? (
                        <span className="flex items-center gap-1 text-emerald-600 text-sm font-semibold">
                            <CheckCircle2 size={16} /> Đã kết nối
                        </span>
                    ) : (
                        <span className="flex items-center gap-1 text-red-500 text-sm font-semibold">
                            <XCircle size={16} /> Mất kết nối
                        </span>
                    )}
                </div>
            </div>

            {/* Stat Cards */}
            {loading && !stats ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    {[...Array(4)].map((_, i) => (
                        <div
                            key={i}
                            className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 animate-pulse"
                        >
                            <div className="h-4 bg-gray-200 rounded w-2/3 mb-3"></div>
                            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                        </div>
                    ))}
                </div>
            ) : (
                stats && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                        {/* Card 1: Tổng nhân viên HR */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-sm font-medium text-gray-500">
                                    Nhân viên (HR)
                                </p>
                                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                    <Users
                                        size={20}
                                        className="text-blue-600"
                                    />
                                </div>
                            </div>
                            <p className="text-3xl font-bold text-gray-900">
                                {stats.hr_total_employees}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                                <span className="text-emerald-500 font-medium">
                                    {stats.hr_active_employees} đang làm việc
                                </span>
                            </p>
                        </div>

                        {/* Card 2: Phòng ban */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-sm font-medium text-gray-500">
                                    Phòng ban
                                </p>
                                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                                    <Building2
                                        size={20}
                                        className="text-purple-600"
                                    />
                                </div>
                            </div>
                            <p className="text-3xl font-bold text-gray-900">
                                {stats.hr_departments}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                                Từ hệ thống HR
                            </p>
                        </div>

                        {/* Card 3: Tổng lương */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-sm font-medium text-gray-500">
                                    Tổng lương (Payroll)
                                </p>
                                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                                    <DollarSign
                                        size={20}
                                        className="text-emerald-600"
                                    />
                                </div>
                            </div>
                            <p className="text-3xl font-bold text-gray-900">
                                {formatMoney(stats.payroll_total_salary)} ₫
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                                <span className="text-blue-500 font-medium">
                                    {stats.payroll_salary_records} bản ghi lương
                                </span>
                            </p>
                        </div>

                        {/* Card 4: NV Payroll */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-sm font-medium text-gray-500">
                                    NV Payroll
                                </p>
                                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                                    <UserCheck
                                        size={20}
                                        className="text-amber-600"
                                    />
                                </div>
                            </div>
                            <p className="text-3xl font-bold text-gray-900">
                                {stats.payroll_employee_count}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                                Từ hệ thống Payroll
                            </p>
                        </div>
                    </div>
                )
            )}

            {/* System Overview */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <FileText size={20} className="text-blue-600" />
                    Tổng quan hệ thống tích hợp
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                    <div className="space-y-2">
                        <p className="font-medium text-gray-700">
                            📌 Hệ thống HR (SQL Server)
                        </p>
                        <ul className="list-disc list-inside space-y-1 ml-2 text-gray-500">
                            <li>
                                Database:{" "}
                                <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">
                                    HUMAN_2025
                                </code>
                            </li>
                            <li>Quản lý: Nhân viên, Phòng ban, Chức vụ</li>
                            <li>Chức năng: Xem, Thêm, Sửa, Xóa (CRUD)</li>
                        </ul>
                    </div>
                    <div className="space-y-2">
                        <p className="font-medium text-gray-700">
                            📌 Hệ thống Payroll (MySQL)
                        </p>
                        <ul className="list-disc list-inside space-y-1 ml-2 text-gray-500">
                            <li>
                                Database:{" "}
                                <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">
                                    payrollnew
                                </code>
                            </li>
                            <li>Quản lý: Bảng lương, Chấm công</li>
                            <li>Chức năng: Xem báo cáo, Biểu đồ</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
