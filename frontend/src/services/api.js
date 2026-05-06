// frontend/src/services/api.js
import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor thêm token vào header
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ========== HR APIs (Employees) ==========
export const getEmployees = () => api.get('/employees');
export const getEmployeeById = (id) => api.get(`/employees/${id}`);
export const createEmployee = (data) => api.post('/employees', data);
export const updateEmployee = (id, data) => api.put(`/employees/${id}`, data);
export const deleteEmployee = (id) => api.delete(`/employees/${id}`);

// ========== Department APIs ==========
export const getDepartments = () => api.get('/departments');
export const getDepartmentById = (id) => api.get(`/departments/${id}`);
export const createDepartment = (data) => api.post('/departments', data);
export const updateDepartment = (id, data) => api.put(`/departments/${id}`, data);
export const deleteDepartment = (id) => api.delete(`/departments/${id}`);

// ========== Payroll APIs ==========
export const getPayrollList = (month = null, year = null) => {
  const params = [];
  if (month) params.push(`month=${month}`);
  if (year) params.push(`year=${year}`);
  const qs = params.length ? `?${params.join('&')}` : '';
  return api.get(`/reports/payroll_list${qs}`);
};
export const updatePayroll = (salaryId, data) => api.put(`/reports/payroll/${salaryId}`, data);

// ========== Cập nhật lương và lịch sử lương ==========
export const updateSalaryHistory = (data) => api.post('/payroll/update-salary', data);
export const getSalaryHistory = (employeeId) => api.get(`/payroll/salary-history/${employeeId}`);
export const calculateProrate = (data) => api.post('/payroll/calculate-prorate', data);

// ========== Dashboard APIs ==========
export const getDashboardStats = () => api.get('/dashboard/stats');

// ========== Attendance APIs ==========
export const getAttendanceDetail = (employeeId, month, year) => 
  api.get(`/attendance/detail?employee_id=${employeeId}&month=${month}&year=${year}`);
export const getAttendanceEmployees = () => api.get('/attendance/employees');

// ========== Report APIs ==========
export const getAttendanceReport = (month, year) => 
  api.get(`/reports/attendance?month=${month}&year=${year}`);
export const getPayrollMonths = () => api.get('/payroll/months');
export const getPayrollDetails = (month, year) => 
  api.get(`/payroll/details?month=${month}&year=${year}`);

export default api;