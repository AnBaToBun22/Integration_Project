import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api', // Flask backend URL
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

// Employee API functions
export const getEmployees = () => {
  return api.get('/employees');
};

export const createEmployee = (employeeData) => {
  return api.post('/employees', employeeData);
};

export const updateEmployee = (employeeId, employeeData) => {
  return api.put(`/employees/${employeeId}`, employeeData);
};

export const deleteEmployee = (employeeId) => {
  return api.delete(`/employees/${employeeId}`);
};

// Department API functions
export const getDepartments = () => {
  return api.get('/departments/');
};

export const createDepartment = (departmentData) => {
  return api.post('/departments/', departmentData);
};

export const updateDepartment = (departmentId, departmentData) => {
  return api.put(`/departments/${departmentId}`, departmentData);
};

export const deleteDepartment = (departmentId) => {
  return api.delete(`/departments/${departmentId}`);
};

export default api;
