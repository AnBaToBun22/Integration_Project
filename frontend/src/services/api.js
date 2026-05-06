import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor: Tự động gắn JWT token vào mỗi request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor: Xử lý token hết hạn → tự động redirect về login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token hết hạn hoặc không hợp lệ
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('username');
      localStorage.removeItem('user_id');
      
      // Chỉ redirect nếu không đang ở trang login
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// =============================================
// Employee API
// =============================================
export const getEmployees = () => api.get('/employees');
export const createEmployee = (data) => api.post('/employees', data);
export const updateEmployee = (id, data) => api.put(`/employees/${id}`, data);
export const deleteEmployee = (id) => api.delete(`/employees/${id}`);
export const searchEmployees = (query) => api.get(`/employees/search?q=${query}`);

// =============================================
// Department API
// =============================================
export const getDepartments = () => api.get('/departments/');
export const createDepartment = (data) => api.post('/departments/', data);
export const updateDepartment = (id, data) => api.put(`/departments/${id}`, data);
export const deleteDepartment = (id) => api.delete(`/departments/${id}`);

// =============================================
// Position API
// =============================================
export const getPositions = () => api.get('/positions/');
export const createPosition = (data) => api.post('/positions/', data);
export const updatePosition = (id, data) => api.put(`/positions/${id}`, data);
export const deletePosition = (id) => api.delete(`/positions/${id}`);

// =============================================
// Payroll API
// =============================================
export const getPayrollMonths = () => api.get('/payroll/months');
export const getPayrollDetails = (month, year) => api.get(`/payroll/details?month=${month}&year=${year}`);
export const getPayrollList = (month, year) => api.get(`/reports/payroll_list?month=${month}&year=${year}`);

// =============================================
// Reports API
// =============================================
export const getAttendanceReport = (month, year, showAll = false) => 
  api.get(`/reports/attendance?month=${month}&year=${year}&showall=${showAll}`);

// =============================================
// Alerts API
// =============================================
export const getAlerts = (leaveThreshold = 3) => 
  api.get(`/alerts?leave_threshold=${leaveThreshold}`);

// =============================================
// Audit Logs API
// =============================================
export const getAuditLogs = (page = 1, perPage = 50, resource = '', action = '') => {
  let url = `/audit-logs?page=${page}&per_page=${perPage}`;
  if (resource) url += `&resource=${resource}`;
  if (action) url += `&action=${action}`;
  return api.get(url);
};

// =============================================
// Dashboard API
// =============================================
export const getDashboardStats = () => api.get('/dashboard/stats');

export default api;
