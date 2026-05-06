import React, { useState, useEffect } from 'react';
import AuditLogs from './AuditLogs';
import api from '../services/api';
import { Settings as SettingsIcon, ClipboardList, Users, Database, Shield, Trash2, Edit2, CheckCircle2, XCircle, Lock, Eye, EyeOff, RefreshCw, Server, HardDrive } from 'lucide-react';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('logs');
  const currentRole = localStorage.getItem('role') || 'Employee';

  const tabs = [
    { id: 'logs', label: 'Lịch Sử Hệ Thống', icon: ClipboardList },
    { id: 'account', label: 'Tài Khoản Auth', icon: Users },
    { id: 'database', label: 'Kết Nối Database', icon: Database },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white p-5 rounded-xl shadow-md">
        <div className="flex items-center gap-3 mb-5 border-b pb-4">
          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
            <SettingsIcon size={20} className="text-gray-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Cài Đặt & Cấu Hình</h2>
            <p className="text-sm text-gray-500">Quản lý hệ thống, tài khoản và kết nối cơ sở dữ liệu</p>
          </div>
        </div>
        <div className="flex space-x-2">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 font-semibold rounded-lg transition-all ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
                }`}>
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="w-full">
        {activeTab === 'logs' && <AuditLogs />}
        {activeTab === 'account' && <AccountTab currentRole={currentRole} />}
        {activeTab === 'database' && <DatabaseTab />}
      </div>
    </div>
  );
};

// ==========================================
// TAB: QUẢN LÝ TÀI KHOẢN
// ==========================================
const AccountTab = ({ currentRole }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUserId, setEditingUserId] = useState(null);
  const [newRole, setNewRole] = useState('');
  const [message, setMessage] = useState(null);

  // Đổi mật khẩu
  const [showPwForm, setShowPwForm] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  const fetchUsers = async () => {
    if (currentRole !== 'Admin') { setLoading(false); return; }
    try {
      const res = await api.get('/auth/users');
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleUpdateRole = async (userId) => {
    try {
      const res = await api.put(`/auth/users/${userId}/role`, { role: newRole });
      setMessage({ type: 'success', text: res.data.message });
      setEditingUserId(null);
      fetchUsers();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Lỗi cập nhật role' });
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (!window.confirm(`Bạn chắc chắn muốn xóa tài khoản "${username}"?`)) return;
    try {
      const res = await api.delete(`/auth/users/${userId}`);
      setMessage({ type: 'success', text: res.data.message });
      fetchUsers();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Lỗi xóa user' });
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPw !== confirmPw) { setMessage({ type: 'error', text: 'Mật khẩu xác nhận không khớp!' }); return; }
    try {
      const res = await api.put('/auth/change-password', { current_password: currentPw, new_password: newPw });
      setMessage({ type: 'success', text: res.data.message });
      setShowPwForm(false); setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Lỗi đổi mật khẩu' });
    }
  };

  const getRoleBadge = (role) => {
    const styles = { 'Admin': 'bg-red-100 text-red-700', 'HR Manager': 'bg-blue-100 text-blue-700', 'Employee': 'bg-gray-100 text-gray-700' };
    return styles[role] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="space-y-6">
      {message && (
        <div className={`p-4 rounded-lg border flex items-center gap-2 ${message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {message.type === 'success' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
          <span className="font-medium">{message.text}</span>
          <button onClick={() => setMessage(null)} className="ml-auto text-gray-400 hover:text-gray-600"><XCircle size={16} /></button>
        </div>
      )}

      {/* Đổi mật khẩu */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center"><Lock size={18} className="text-amber-600" /></div>
            <h3 className="text-lg font-bold text-gray-800">Đổi Mật Khẩu</h3>
          </div>
          <button onClick={() => setShowPwForm(!showPwForm)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${showPwForm ? 'bg-gray-200 text-gray-600' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}>
            {showPwForm ? 'Đóng' : 'Đổi mật khẩu'}
          </button>
        </div>
        {showPwForm && (
          <form onSubmit={handleChangePassword} className="p-6 space-y-4 max-w-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu hiện tại</label>
              <div className="relative">
                <input type={showCurrentPw ? 'text' : 'password'} value={currentPw} onChange={e => setCurrentPw(e.target.value)} required
                  className="w-full border rounded-lg px-4 py-2.5 pr-10 focus:ring-2 focus:ring-amber-500 outline-none" placeholder="Nhập mật khẩu hiện tại" />
                <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showCurrentPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu mới</label>
              <div className="relative">
                <input type={showNewPw ? 'text' : 'password'} value={newPw} onChange={e => setNewPw(e.target.value)} required minLength={4}
                  className="w-full border rounded-lg px-4 py-2.5 pr-10 focus:ring-2 focus:ring-amber-500 outline-none" placeholder="Tối thiểu 4 ký tự" />
                <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showNewPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Xác nhận mật khẩu mới</label>
              <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} required
                className="w-full border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-amber-500 outline-none" placeholder="Nhập lại mật khẩu mới" />
            </div>
            <button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white font-medium px-6 py-2.5 rounded-lg transition shadow-sm">
              Lưu mật khẩu mới
            </button>
          </form>
        )}
      </div>

      {/* Danh sách user - chỉ Admin */}
      {currentRole === 'Admin' && (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center"><Shield size={18} className="text-indigo-600" /></div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">Quản Lý Tài Khoản</h3>
                <p className="text-sm text-gray-500">{users.length} tài khoản trong hệ thống</p>
              </div>
            </div>
            <button onClick={fetchUsers} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-600 transition">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Tải lại
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Username</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Ngày tạo</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  [...Array(3)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-8"></div></td>
                      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20 mx-auto"></div></td>
                      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-28"></div></td>
                      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16 mx-auto"></div></td>
                    </tr>
                  ))
                ) : users.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50/50 transition">
                    <td className="px-6 py-3.5 text-sm text-gray-500 font-mono">#{user.id}</td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold">
                          {user.username.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-gray-800">{user.username}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      {editingUserId === user.id ? (
                        <div className="flex items-center justify-center gap-2">
                          <select value={newRole} onChange={e => setNewRole(e.target.value)}
                            className="text-sm border rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none">
                            <option value="Admin">Admin</option>
                            <option value="HR Manager">HR Manager</option>
                            <option value="Employee">Employee</option>
                          </select>
                          <button onClick={() => handleUpdateRole(user.id)} className="text-emerald-600 hover:text-emerald-800 text-sm font-semibold">Lưu</button>
                          <button onClick={() => setEditingUserId(null)} className="text-gray-400 hover:text-gray-600 text-sm">Hủy</button>
                        </div>
                      ) : (
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${getRoleBadge(user.role)}`}>{user.role}</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-sm text-gray-500">{user.created_at}</td>
                    <td className="px-6 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => { setEditingUserId(user.id); setNewRole(user.role); }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Đổi role">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDeleteUser(user.id, user.username)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition" title="Xóa">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {currentRole !== 'Admin' && (
        <div className="bg-white rounded-xl shadow-md p-8 text-center">
          <Shield size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-bold text-gray-600 mb-2">Quyền hạn hạn chế</h3>
          <p className="text-gray-400">Chỉ Admin mới có thể quản lý danh sách tài khoản. Bạn có thể đổi mật khẩu của chính mình ở phần trên.</p>
        </div>
      )}
    </div>
  );
};

// ==========================================
// TAB: KẾT NỐI DATABASE
// ==========================================
const DatabaseTab = () => {
  const [dbStatus, setDbStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await api.get('/system/db-status');
      setDbStatus(res.data);
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchStatus(); }, []);

  const StatusBadge = ({ status }) => (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${status === 'connected' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
      }`}>
      {status === 'connected' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
      {status === 'connected' ? 'Đã kết nối' : 'Mất kết nối'}
    </span>
  );

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-xl shadow-md p-6 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!dbStatus) return <div className="bg-white rounded-xl shadow-md p-10 text-center text-gray-400">Không thể tải trạng thái kết nối.</div>;

  const databases = [
    {
      key: 'hr', icon: Server, color: 'blue', data: dbStatus.hr, infoRows: [
        { label: 'Driver', value: dbStatus.hr?.driver },
        { label: 'Server', value: dbStatus.hr?.server },
        { label: 'Database', value: dbStatus.hr?.database },
      ]
    },
    {
      key: 'payroll', icon: HardDrive, color: 'emerald', data: dbStatus.payroll, infoRows: [
        { label: 'Host', value: dbStatus.payroll?.host },
        { label: 'Port', value: dbStatus.payroll?.port },
        { label: 'Database', value: dbStatus.payroll?.database },
        { label: 'User', value: dbStatus.payroll?.user },
      ]
    },
    {
      key: 'auth', icon: Lock, color: 'amber', data: dbStatus.auth, infoRows: [
        { label: 'File', value: dbStatus.auth?.file },
        { label: 'Số tài khoản', value: dbStatus.auth?.user_count },
        { label: 'Số audit logs', value: dbStatus.auth?.log_count },
      ]
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Trạng thái kết nối realtime của tất cả database trong hệ thống</p>
        <button onClick={fetchStatus} className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-600 transition">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Kiểm tra lại
        </button>
      </div>

      {databases.map(db => (
        <div key={db.key} className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className={`px-6 py-4 border-b border-gray-100 flex items-center justify-between`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 bg-${db.color}-100 rounded-lg flex items-center justify-center`}>
                <db.icon size={20} className={`text-${db.color}-600`} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">{db.data?.name}</h3>
              </div>
            </div>
            <StatusBadge status={db.data?.status} />
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {db.infoRows.map((row, i) => (
                <div key={i} className="flex items-center justify-between py-2 px-4 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-500 font-medium">{row.label}</span>
                  <span className="text-sm font-semibold text-gray-800 font-mono">{row.value || 'N/A'}</span>
                </div>
              ))}
            </div>
            {db.data?.tables?.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-600 mb-2">Bảng dữ liệu ({db.data.tables.length}):</p>
                <div className="flex flex-wrap gap-2">
                  {db.data.tables.map((table, i) => (
                    <span key={i} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-mono font-medium border border-gray-200">
                      {table}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {db.data?.error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 font-mono break-all">
                ❌ {db.data.error}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Settings;