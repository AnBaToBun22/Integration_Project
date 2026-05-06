import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { RefreshCw, Search, X, ClipboardList, Filter } from 'lucide-react';

const AuditLogs = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [actionFilter, setActionFilter] = useState('all');

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const res = await api.get('/logs');
            setLogs(res.data);
        } catch (err) {
            console.error("Lỗi lấy logs:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const filteredLogs = logs.filter(log => {
        const matchSearch = !searchTerm ||
            log.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.detail?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchAction = actionFilter === 'all' || log.action === actionFilter;
        return matchSearch && matchAction;
    });

    const getActionBadge = (action) => {
        const styles = {
            'THÊM MỚI': 'bg-emerald-100 text-emerald-700 border-emerald-200',
            'CẬP NHẬT': 'bg-blue-100 text-blue-700 border-blue-200',
            'XÓA': 'bg-red-100 text-red-700 border-red-200',
            'XÓA (NGHỈ VIỆC)': 'bg-orange-100 text-orange-700 border-orange-200',
        };
        return styles[action] || 'bg-gray-100 text-gray-700 border-gray-200';
    };

    // Lấy danh sách action duy nhất
    const uniqueActions = [...new Set(logs.map(l => l.action))];

    return (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                            <ClipboardList size={20} className="text-indigo-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">Lịch Sử Hệ Thống</h2>
                            <p className="text-sm text-gray-500">{filteredLogs.length} / {logs.length} bản ghi</p>
                        </div>
                    </div>
                    <button onClick={fetchLogs} disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition text-sm font-medium text-gray-600">
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        Làm mới
                    </button>
                </div>

                {/* Filters */}
                <div className="flex gap-3">
                    <div className="relative flex-1">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Tìm theo người thao tác, chi tiết..."
                            className="w-full pl-9 pr-9 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                <X size={14} />
                            </button>
                        )}
                    </div>
                    <select
                        value={actionFilter}
                        onChange={(e) => setActionFilter(e.target.value)}
                        className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                        <option value="all">Tất cả hành động</option>
                        {uniqueActions.map(a => (
                            <option key={a} value={a}>{a}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Thời Gian</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Người Thao Tác</th>
                            <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Hành Động</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Chi Tiết</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {loading ? (
                            [...Array(5)].map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-32"></div></td>
                                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
                                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16 mx-auto"></div></td>
                                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-48"></div></td>
                                </tr>
                            ))
                        ) : filteredLogs.length > 0 ? (
                            filteredLogs.map((log) => (
                                <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-3.5 text-sm text-gray-500 font-mono whitespace-nowrap">{log.timestamp}</td>
                                    <td className="px-6 py-3.5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-bold">
                                                {log.username?.substring(0, 2).toUpperCase()}
                                            </div>
                                            <span className="text-sm font-medium text-gray-700">{log.username}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3.5 text-center">
                                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold border ${getActionBadge(log.action)}`}>
                                            {log.action}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3.5 text-sm text-gray-600 max-w-md truncate">{log.detail}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="4" className="px-6 py-16 text-center">
                                    <ClipboardList size={40} className="mx-auto text-gray-300 mb-3" />
                                    <p className="text-gray-400 font-medium">
                                        {logs.length === 0 ? 'Chưa có dữ liệu thao tác...' : 'Không tìm thấy kết quả'}
                                    </p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AuditLogs;