import React, { useEffect, useState } from 'react';
import axios from 'axios';

const AuditLogs = () => {
    const [logs, setLogs] = useState([]);

    useEffect(() => {
        axios.get('http://127.0.0.1:5000/api/logs')
            .then(res => setLogs(res.data))
            .catch(err => console.error("Lỗi lấy logs:", err));
    }, []);

    return (
        <div className="bg-white p-6 rounded-xl shadow-md max-w-5xl mx-auto mt-8">
            <h2 className="text-2xl font-bold text-blue-900 mb-6 border-b pb-4">Lịch Sử Hệ Thống (Audit Logs)</h2>
            
            <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-gray-800 text-white">
                            <th className="p-3 text-left rounded-tl-lg">Thời Gian</th>
                            <th className="p-3 text-left">Người Thao Tác</th>
                            <th className="p-3 text-center">Hành Động</th>
                            <th className="p-3 text-left rounded-tr-lg">Chi Tiết</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.length > 0 ? (
                            logs.map((log) => (
                                <tr key={log.id} className="border-b hover:bg-gray-50">
                                    <td className="p-3 text-sm text-gray-500 font-mono">{log.timestamp}</td>
                                    <td className="p-3 font-semibold text-gray-700">{log.username}</td>
                                    <td className="p-3 text-center">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                                            log.action === 'THÊM MỚI' ? 'bg-green-100 text-green-700' :
                                            log.action === 'CẬP NHẬT' ? 'bg-blue-100 text-blue-700' :
                                            'bg-red-100 text-red-700'
                                        }`}>
                                            {log.action}
                                        </span>
                                    </td>
                                    <td className="p-3 text-gray-600">{log.detail}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="4" className="p-10 text-center text-gray-400">Chưa có dữ liệu thao tác...</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AuditLogs;