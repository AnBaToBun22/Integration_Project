import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const Login = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    // Toggle giữa form Đăng nhập và Đăng ký
    const [isRegisterMode, setIsRegisterMode] = useState(false);

    // State chung cho cả 2 form
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [role] = useState("Employee");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // ========================
    // XỬ LÝ ĐĂNG NHẬP
    // ========================
    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            // Gọi API đăng nhập từ Flask backend
            const response = await axios.post(
                "http://127.0.0.1:5000/api/auth/login",
                {
                    username: username,
                    password: password,
                },
            );

            // Lưu token + thông tin user vào localStorage
            const { token, user } = response.data;
            localStorage.setItem("token", token);
            localStorage.setItem("role", user.role);
            localStorage.setItem("username", user.username);
            localStorage.setItem("user_id", user.id);

            // Chuyển hướng về Dashboard
            navigate("/");
            // Force reload để App.jsx cập nhật trạng thái isAuthenticated
            window.location.reload();
        } catch (err) {
            setError(
                err.response?.data?.error ||
                "Đăng nhập thất bại. Vui lòng thử lại!",
            );
        } finally {
            setLoading(false);
        }
    };

    // ========================
    // XỬ LÝ ĐĂNG KÝ
    // ========================
    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setSuccess("");

        // Kiểm tra mật khẩu xác nhận
        if (password !== confirmPassword) {
            setError("Mật khẩu xác nhận không khớp!");
            setLoading(false);
            return;
        }

        if (password.length < 4) {
            setError("Mật khẩu phải có ít nhất 4 ký tự!");
            setLoading(false);
            return;
        }

        try {
            await axios.post("http://127.0.0.1:5000/api/auth/register", {
                username: username,
                password: password,
                role: role,
            });

            setSuccess("Đăng ký thành công! Chuyển sang đăng nhập...");

            // Tự chuyển sang form Login sau 1.5 giây
            setTimeout(() => {
                setIsRegisterMode(false);
                setSuccess("");
                setConfirmPassword("");
            }, 1500);
        } catch (err) {
            setError(err.response?.data?.error || "Đăng ký thất bại!");
        } finally {
            setLoading(false);
        }
    };

    // Reset form khi chuyển mode
    const toggleMode = () => {
        setIsRegisterMode(!isRegisterMode);
        setError("");
        setSuccess("");
        setConfirmPassword("");
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center p-4">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500 rounded-full opacity-20 blur-3xl animate-blob"></div>
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-500 rounded-full opacity-20 blur-3xl animate-blob animation-delay-2000"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500 rounded-full opacity-20 blur-3xl animate-blob animation-delay-4000"></div>
            </div>

            <div className="relative max-w-md w-full animate-fade-in-up">
                {/* Card chính */}
                <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden border border-white/20">
                    <div className="p-8">
                        {/* Logo & Tiêu đề */}
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 mb-4 shadow-lg">
                                <svg
                                    className="w-8 h-8 text-white"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                                    />
                                </svg>
                            </div>
                            <h2 className="text-3xl font-bold text-gray-900">
                                Enterprise
                                <span className="text-blue-600">Dash</span>
                            </h2>
                            <p className="text-gray-500 mt-2">
                                {isRegisterMode
                                    ? "Tạo tài khoản mới"
                                    : "Đăng nhập để quản lý hệ thống"}
                            </p>
                        </div>

                        {/* Tab chuyển đổi Login / Register */}
                        <div className="flex mb-6 bg-gray-100 rounded-xl p-1 relative z-10">
                            <button
                                onClick={() => toggleMode()}
                                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-300 transform active:scale-95 ${!isRegisterMode
                                        ? "bg-white text-blue-600 shadow-md scale-100"
                                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
                                    }`}
                            >
                                Đăng Nhập
                            </button>
                            <button
                                onClick={() => toggleMode()}
                                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-300 transform active:scale-95 ${isRegisterMode
                                        ? "bg-white text-blue-600 shadow-md scale-100"
                                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
                                    }`}
                            >
                                Đăng Ký
                            </button>
                        </div>

                        {/* Thông báo lỗi */}
                        {error && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm text-center font-medium flex items-center justify-center gap-2">
                                <svg
                                    className="w-4 h-4 flex-shrink-0"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                                {error}
                            </div>
                        )}

                        {/* Thông báo thành công */}
                        {success && (
                            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm text-center font-medium flex items-center justify-center gap-2">
                                <svg
                                    className="w-4 h-4 flex-shrink-0"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                                {success}
                            </div>
                        )}

                        {/* ========== FORM ĐĂNG NHẬP / ĐĂNG KÝ ========== */}
                        <div
                            key={isRegisterMode ? "register" : "login"}
                            className="animate-form-switch"
                        >
                            {!isRegisterMode ? (
                                <form
                                    onSubmit={handleLogin}
                                    className="space-y-5"
                                >
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Tài khoản
                                        </label>
                                        <div className="relative">
                                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                                                <svg
                                                    className="w-5 h-5"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                                    />
                                                </svg>
                                            </span>
                                            <input
                                                type="text"
                                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none bg-gray-50 focus:bg-white"
                                                placeholder="Nhập tên đăng nhập..."
                                                value={username}
                                                onChange={(e) =>
                                                    setUsername(e.target.value)
                                                }
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Mật khẩu
                                        </label>
                                        <div className="relative">
                                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                                                <svg
                                                    className="w-5 h-5"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                                    />
                                                </svg>
                                            </span>
                                            <input
                                                type="password"
                                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none bg-gray-50 focus:bg-white"
                                                placeholder="••••••••"
                                                value={password}
                                                onChange={(e) =>
                                                    setPassword(e.target.value)
                                                }
                                                required
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all flex justify-center shadow-lg hover:shadow-xl active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <span className="flex items-center">
                                                <svg
                                                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <circle
                                                        className="opacity-25"
                                                        cx="12"
                                                        cy="12"
                                                        r="10"
                                                        stroke="currentColor"
                                                        strokeWidth="4"
                                                    ></circle>
                                                    <path
                                                        className="opacity-75"
                                                        fill="currentColor"
                                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                    ></path>
                                                </svg>
                                                Đang xác thực...
                                            </span>
                                        ) : (
                                            "Đăng Nhập"
                                        )}
                                    </button>
                                </form>
                            ) : (
                                /* ========== FORM ĐĂNG KÝ ========== */
                                <form
                                    onSubmit={handleRegister}
                                    className="space-y-4"
                                >
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Tài khoản
                                        </label>
                                        <div className="relative">
                                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                                                <svg
                                                    className="w-5 h-5"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                                    />
                                                </svg>
                                            </span>
                                            <input
                                                type="text"
                                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none bg-gray-50 focus:bg-white"
                                                placeholder="Nhập tên đăng nhập..."
                                                value={username}
                                                onChange={(e) =>
                                                    setUsername(e.target.value)
                                                }
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Mật khẩu
                                        </label>
                                        <div className="relative">
                                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                                                <svg
                                                    className="w-5 h-5"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                                    />
                                                </svg>
                                            </span>
                                            <input
                                                type="password"
                                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none bg-gray-50 focus:bg-white"
                                                placeholder="Tối thiểu 4 ký tự..."
                                                value={password}
                                                onChange={(e) =>
                                                    setPassword(e.target.value)
                                                }
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Xác nhận mật khẩu
                                        </label>
                                        <div className="relative">
                                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                                                <svg
                                                    className="w-5 h-5"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                                                    />
                                                </svg>
                                            </span>
                                            <input
                                                type="password"
                                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none bg-gray-50 focus:bg-white"
                                                placeholder="Nhập lại mật khẩu..."
                                                value={confirmPassword}
                                                onChange={(e) =>
                                                    setConfirmPassword(
                                                        e.target.value,
                                                    )
                                                }
                                                required
                                            />
                                        </div>
                                    </div>


                                    <button
                                        type="submit"
                                        className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all flex justify-center shadow-lg hover:shadow-xl active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <span className="flex items-center">
                                                <svg
                                                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <circle
                                                        className="opacity-25"
                                                        cx="12"
                                                        cy="12"
                                                        r="10"
                                                        stroke="currentColor"
                                                        strokeWidth="4"
                                                    ></circle>
                                                    <path
                                                        className="opacity-75"
                                                        fill="currentColor"
                                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                    ></path>
                                                </svg>
                                                Đang tạo tài khoản...
                                            </span>
                                        ) : (
                                            "Tạo Tài Khoản"
                                        )}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 text-center">
                        <p className="text-xs text-gray-400">
                            Enterprise Integration Dashboard &copy; 2026
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
