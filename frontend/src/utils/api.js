import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg = err.response?.data?.error || err.message || 'Unknown error';
    return Promise.reject(new Error(msg));
  }
);

// Requests
export const fetchRequests  = (params) => api.get('/api/requests', { params }).then(r => r.data);
export const fetchRequest   = (id)     => api.get(`/api/requests/${id}`).then(r => r.data);
export const submitRequest  = (body)   => api.post('/api/requests', body).then(r => r.data);
export const fetchAuditLog  = (id)     => api.get(`/api/requests/${id}/audit`).then(r => r.data);

// Reviews
export const fetchReview    = (id)     => api.get(`/api/reviews/${id}`).then(r => r.data);
export const updateReview   = (id, body) => api.put(`/api/reviews/${id}`, body).then(r => r.data);

// Clearances
export const issueClearance = (body)   => api.post('/api/clearances', body).then(r => r.data);
export const verifyClearance= (hash)   => api.get(`/api/clearances/verify/${hash}`).then(r => r.data);
export const revokeClearance= (id, reason) => api.post(`/api/clearances/${id}/revoke`, { reason }).then(r => r.data);

// Missions & Departments
export const fetchMissions    = ()     => api.get('/api/missions').then(r => r.data);
export const createMission    = (body) => api.post('/api/missions', body).then(r => r.data);
export const fetchDepartments = ()     => api.get('/api/departments').then(r => r.data);
export const fetchCategories  = ()     => api.get('/api/categories').then(r => r.data);

// Reports
export const fetchStats       = ()     => api.get('/api/reports/stats').then(r => r.data);

export default api;
