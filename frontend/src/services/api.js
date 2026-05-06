import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor for attaching JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor for handling 401 (expired token) — auto redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token hết hạn hoặc không hợp lệ → logout
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('username');
      localStorage.removeItem('user_id');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Employee API functions
export const getEmployees = () => api.get('/employees');
export const createEmployee = (data) => api.post('/employees', data);
export const updateEmployee = (id, data) => api.put(`/employees/${id}`, data);
export const deleteEmployee = (id) => api.delete(`/employees/${id}`);

// Department API functions
export const getDepartments = () => api.get('/departments/');
export const createDepartment = (data) => api.post('/departments/', data);
export const updateDepartment = (id, data) => api.put(`/departments/${id}`, data);
export const deleteDepartment = (id) => api.delete(`/departments/${id}`);

// Position API functions (MỚI)
export const getPositions = () => api.get('/positions/');
export const createPosition = (data) => api.post('/positions/', data);
export const updatePosition = (id, data) => api.put(`/positions/${id}`, data);
export const deletePosition = (id) => api.delete(`/positions/${id}`);

// Report API functions
export const getPayrollMonths = () => api.get('/payroll/months');
export const getPayrollDetails = (month, year) => api.get(`/payroll/details?month=${month}&year=${year}`);
export const getPayrollList = (month, year) => api.get(`/reports/payroll_list?month=${month}&year=${year}`);
export const getAttendanceReport = (month, year) => api.get(`/reports/attendance?month=${month}&year=${year}&showall=true`);
export const getSummaryReport = () => api.get('/reports/summary');

// Dashboard
export const getDashboardStats = () => api.get('/dashboard/stats');
export const getAuditLogs = () => api.get('/logs');

// Alerts
export const getAlerts = () => api.get('/alerts');

export default api;
