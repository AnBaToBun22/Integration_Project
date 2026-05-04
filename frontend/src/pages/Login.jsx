import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  // Tạo state để lưu thông tin nhập từ bàn phím
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Gọi API đăng nhập thật từ Flask
      const response = await axios.post('http://127.0.0.1:5000/api/login', {
        username: username,
        password: password
      });

      // 2. Nếu thành công, Backend sẽ trả về token và role
      const { token, role, full_name } = response.data;

      // 3. Lưu vào localStorage để các trang khác sử dụng
      localStorage.setItem('token', token);
      localStorage.setItem('role', role);
      localStorage.setItem('user_name', full_name);

      // 4. Chuyển hướng về trang chủ
      navigate('/');
      
    } catch (err) {
      // Xử lý khi sai mật khẩu hoặc tài khoản
      setError(err.response?.data?.message || "Đăng nhập thất bại. Thử lại nhé!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        <div className="p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Enterprise<span className="text-blue-600">Dash</span></h2>
            <p className="text-gray-500 mt-2">Đăng nhập để quản lý hệ thống tích hợp</p>
          </div>
          
          {/* Hiển thị thông báo lỗi nếu đăng nhập sai */}
          {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm text-center font-medium">{error}</div>}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tài khoản</label>
              <input 
                type="text" 
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                placeholder="Nhập tên đăng nhập..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mật khẩu</label>
              <input 
                type="password" 
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-all flex justify-center shadow-lg active:scale-95 disabled:bg-gray-400"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Đang xác thực...
                </span>
              ) : 'Đăng Nhập'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;