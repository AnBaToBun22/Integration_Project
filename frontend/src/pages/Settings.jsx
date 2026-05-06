import React, { useState, useEffect } from 'react';
import { Shield, User, Database, Activity, Filter, Server, Search, Calendar, LogOut, Loader2 } from 'lucide-react';
import { getAuditLogs, getDashboardStats } from '../services/api';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  
  // User Profile Data
  const username = localStorage.getItem('username') || 'Unknown';
  const role = localStorage.getItem('role') || 'Employee';
  const isAdmin = role === 'Admin';
  
  // System Stats Data
  const [sysStats, setSysStats] = useState({
    hr_connected: false,
    payroll_connected: false,
    hr_total_employees: 0,
    payroll_salary_records: 0
  });

  // Audit Logs Data
  const [logs, setLogs] = useState([]);
  const [logMeta, setLogMeta] = useState({ page: 1, total_pages: 1, total: 0 });
  const [filters, setFilters] = useState({ resource: '', action: '' });

  // Fetch initial data
  useEffect(() => {
    if (activeTab === 'system' && isAdmin) {
      fetchSysStats();
    }
    if (activeTab === 'audit' && isAdmin) {
      fetchLogs(1);
    }
  }, [activeTab]);

  const fetchSysStats = async () => {
    try {
      setLoading(true);
      const res = await getDashboardStats();
      setSysStats(res.data);
    } catch (error) {
      console.error("Failed to fetch sys stats", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async (page = 1) => {
    try {
      setLoading(true);
      const res = await getAuditLogs(page, 20, filters.resource, filters.action);
      if (res.data.success) {
        setLogs(res.data.data);
        setLogMeta({
          page: res.data.page,
          total_pages: res.data.total_pages,
          total: res.data.total
        });
      }
    } catch (error) {
      console.error("Failed to fetch logs", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const applyFilters = () => {
    fetchLogs(1);
  };

  const formatDate = (dateString) => {
    const d = new Date(dateString);
    return d.toLocaleString('vi-VN');
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'CREATE': return 'bg-green-100 text-green-800 border-green-200';
      case 'UPDATE': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'DELETE': return 'bg-red-100 text-red-800 border-red-200';
      case 'LOGIN': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Cài đặt Hệ thống</h1>
          <p className="text-gray-500 mt-1">Quản lý tài khoản và cấu hình hệ thống</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col md:flex-row min-h-[600px]">
        
        {/* Sidebar Tabs */}
        <div className="w-full md:w-64 bg-gray-50 border-b md:border-b-0 md:border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold border border-blue-300">
                {username.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-gray-800">{username}</p>
                <div className="flex items-center text-xs text-gray-500 mt-0.5">
                  <Shield size={12} className="mr-1" /> {role}
                </div>
              </div>
            </div>
          </div>
          
          <nav className="p-2 space-y-1">
            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center px-3 py-2.5 rounded-lg transition-colors ${
                activeTab === 'profile' 
                  ? 'bg-blue-50 text-blue-700 font-medium' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <User size={18} className="mr-3" /> Hồ sơ cá nhân
            </button>
            
            {isAdmin && (
              <>
                <button
                  onClick={() => setActiveTab('system')}
                  className={`w-full flex items-center px-3 py-2.5 rounded-lg transition-colors ${
                    activeTab === 'system' 
                      ? 'bg-blue-50 text-blue-700 font-medium' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Server size={18} className="mr-3" /> Trạng thái Server
                </button>
                <button
                  onClick={() => setActiveTab('audit')}
                  className={`w-full flex items-center px-3 py-2.5 rounded-lg transition-colors ${
                    activeTab === 'audit' 
                      ? 'bg-blue-50 text-blue-700 font-medium' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Activity size={18} className="mr-3" /> Nhật ký kiểm toán
                </button>
              </>
            )}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 md:p-8 overflow-y-auto">
          
          {/* TAB: PROFILE */}
          {activeTab === 'profile' && (
            <div className="max-w-2xl">
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                <User className="mr-2 text-blue-600" /> Thông tin Tài khoản
              </h2>
              
              <div className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-1 text-gray-500 font-medium">Tên đăng nhập</div>
                    <div className="col-span-2 text-gray-800 font-semibold">{username}</div>
                    
                    <div className="col-span-1 text-gray-500 font-medium">Quyền hạn (Role)</div>
                    <div className="col-span-2">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                        isAdmin ? 'bg-purple-100 text-purple-800 border-purple-200' 
                                : 'bg-blue-100 text-blue-800 border-blue-200'
                      }`}>
                        {role}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Đổi mật khẩu</h3>
                  <div className="bg-yellow-50 text-yellow-800 p-4 rounded-lg border border-yellow-200 flex items-start">
                    <LogOut className="mr-3 mt-0.5 shrink-0" size={18} />
                    <p className="text-sm">Tính năng đổi mật khẩu đang được phát triển. Vui lòng liên hệ Quản trị viên hệ thống (IT Support) nếu bạn cần thay đổi mật khẩu.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: SYSTEM STATUS */}
          {activeTab === 'system' && isAdmin && (
            <div>
               <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                <Server className="mr-2 text-blue-600" /> Trạng thái Kết nối Hệ thống
              </h2>
              
              {loading ? (
                <div className="flex justify-center items-center h-40">
                  <Loader2 className="animate-spin text-blue-600" size={32} />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* HR DB */}
                  <div className="bg-white border rounded-xl p-5 shadow-sm relative overflow-hidden">
                    <div className={`absolute top-0 right-0 w-2 h-full ${sysStats.hr_connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center">
                        <Database className="text-blue-600 mr-2" size={24} />
                        <h3 className="text-lg font-bold text-gray-800">Cơ sở dữ liệu HR</h3>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                        sysStats.hr_connected ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'
                      }`}>
                        {sysStats.hr_connected ? 'Đã kết nối' : 'Mất kết nối'}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between border-b pb-2">
                        <span className="text-gray-500">Loại Hệ quản trị</span>
                        <span className="font-medium">SQL Server</span>
                      </div>
                      <div className="flex justify-between border-b pb-2">
                        <span className="text-gray-500">Tổng số nhân viên</span>
                        <span className="font-medium">{sysStats.hr_total_employees}</span>
                      </div>
                      <div className="flex justify-between pb-1">
                        <span className="text-gray-500">Quyền truy cập</span>
                        <span className="font-medium text-green-600">Đọc / Ghi</span>
                      </div>
                    </div>
                  </div>

                  {/* Payroll DB */}
                  <div className="bg-white border rounded-xl p-5 shadow-sm relative overflow-hidden">
                    <div className={`absolute top-0 right-0 w-2 h-full ${sysStats.payroll_connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center">
                        <Database className="text-indigo-600 mr-2" size={24} />
                        <h3 className="text-lg font-bold text-gray-800">Cơ sở dữ liệu Payroll</h3>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                        sysStats.payroll_connected ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'
                      }`}>
                        {sysStats.payroll_connected ? 'Đã kết nối' : 'Mất kết nối'}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between border-b pb-2">
                        <span className="text-gray-500">Loại Hệ quản trị</span>
                        <span className="font-medium">MySQL</span>
                      </div>
                      <div className="flex justify-between border-b pb-2">
                        <span className="text-gray-500">Bản ghi lương</span>
                        <span className="font-medium">{sysStats.payroll_salary_records}</span>
                      </div>
                      <div className="flex justify-between pb-1">
                        <span className="text-gray-500">Quyền truy cập</span>
                        <span className="font-medium text-green-600">Đọc / Ghi</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: AUDIT LOGS */}
          {activeTab === 'audit' && isAdmin && (
            <div className="flex flex-col h-full">
              <div className="flex justify-between items-end mb-6">
                <h2 className="text-xl font-bold text-gray-800 flex items-center">
                  <Activity className="mr-2 text-blue-600" /> Nhật ký Kiểm toán (Audit Logs)
                </h2>
                <div className="text-sm text-gray-500">
                  Tổng cộng: <span className="font-bold text-gray-700">{logMeta.total}</span> bản ghi
                </div>
              </div>

              {/* Filters */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex flex-wrap gap-4 mb-6">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Loại hành động</label>
                  <select 
                    name="action" 
                    value={filters.action} 
                    onChange={handleFilterChange}
                    className="w-full border-gray-300 rounded-md shadow-sm text-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Tất cả hành động</option>
                    <option value="CREATE">CREATE (Thêm mới)</option>
                    <option value="UPDATE">UPDATE (Cập nhật)</option>
                    <option value="DELETE">DELETE (Xóa)</option>
                  </select>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Đối tượng (Resource)</label>
                  <select 
                    name="resource" 
                    value={filters.resource} 
                    onChange={handleFilterChange}
                    className="w-full border-gray-300 rounded-md shadow-sm text-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Tất cả đối tượng</option>
                    <option value="Employees">Employees</option>
                    <option value="Departments">Departments</option>
                    <option value="Positions">Positions</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button 
                    onClick={applyFilters}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center"
                  >
                    <Filter size={16} className="mr-2" /> Lọc
                  </button>
                </div>
              </div>

              {/* Logs Table */}
              <div className="flex-1 overflow-auto bg-white border border-gray-200 rounded-lg shadow-sm">
                {loading ? (
                  <div className="flex justify-center items-center h-64">
                    <Loader2 className="animate-spin text-blue-600" size={32} />
                  </div>
                ) : logs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                    <Search size={48} className="text-gray-300 mb-3" />
                    <p>Không tìm thấy bản ghi nhật ký nào phù hợp.</p>
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thời gian</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Người dùng</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hành động</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Đối tượng</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP Address</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 text-sm">
                      {logs.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                            <div className="flex items-center">
                              <Calendar size={14} className="mr-1.5 text-gray-400" />
                              {formatDate(log.created_at)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-gray-900">{log.username}</div>
                            <div className="text-xs text-gray-500">{log.user_role}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full border ${getActionColor(log.action)}`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="font-medium text-gray-800">{log.resource}</span>
                            {log.resource_id && <span className="text-gray-500 ml-1">#{log.resource_id}</span>}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-xs font-mono">
                            {log.ip_address || 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Pagination */}
              {!loading && logMeta.total_pages > 1 && (
                <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4">
                  <span className="text-sm text-gray-700">
                    Trang <span className="font-medium">{logMeta.page}</span> / <span className="font-medium">{logMeta.total_pages}</span>
                  </span>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => fetchLogs(logMeta.page - 1)}
                      disabled={logMeta.page === 1}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Trước
                    </button>
                    <button
                      onClick={() => fetchLogs(logMeta.page + 1)}
                      disabled={logMeta.page === logMeta.total_pages}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Sau
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Settings;
