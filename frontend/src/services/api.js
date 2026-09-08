import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});


api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);


export const login = (data) => api.post('/auth/login', data);
export const register = (data) => api.post('/users', data);


export const getDecisions = () => api.get('/decisions');
export const getDecision = (id) => api.get(`/decisions/${id}`);
export const createDecision = (data) => api.post('/decisions', data);
export const updateDecision = (id, data) => api.put(`/decisions/${id}`, data);
export const deleteDecision = (id) => api.delete(`/decisions/${id}`);
export const submitDecision = (id) => api.post(`/decisions/${id}/submit`);
export const searchDecisions = (params) => api.get('/decisions/search', { params });


export const getAlternatives = (decisionId) => api.get(`/decisions/${decisionId}/alternatives`);
export const createAlternative = (decisionId, data) => api.post(`/decisions/${decisionId}/alternatives`, data);
export const updateAlternative = (id, data) => api.put(`/alternatives/${id}`, data);
export const deleteAlternative = (id) => api.delete(`/alternatives/${id}`);
export const compareAlternatives = (decisionId) => api.get(`/decisions/${decisionId}/alternatives/compare`);


export const getThreads = (decisionId) => api.get(`/decisions/${decisionId}/threads`);
export const createThread = (decisionId, data) => api.post(`/decisions/${decisionId}/threads`, data);
export const getComments = (threadId) => api.get(`/threads/${threadId}/comments`);
export const createComment = (threadId, data) => api.post(`/threads/${threadId}/comments`, data);

export const getEmployeeDashboard = () => api.get('/dashboard/employee');
export const getManagerDashboard = () => api.get('/dashboard/manager');
export const getAdminDashboard = () => api.get('/dashboard/admin');


export const getVersions = (decisionId) => api.get(`/decisions/${decisionId}/versions`);
export const getHistory = (decisionId) => api.get(`/decisions/${decisionId}/history`);


export const getAuditLogs = (params) => api.get('/audit-logs', { params });
export const getSecurityLogs = (params) => api.get('/audit-logs/security', { params });


export const getDecisionReport = (params) => api.get('/reports/decisions', { params });
export const getApprovalReport = (params) => api.get('/reports/approvals', { params });
export const getTeamReport = (params) => api.get('/reports/teams', { params });
export const getAuditReport = (params) => api.get('/reports/audit', { params });
export const exportPDF = (type) => api.get(`/reports/${type}/export/pdf`, { responseType: 'blob' });
export const exportExcel = (type) => api.get(`/reports/${type}/export/excel`, { responseType: 'blob' });

export const getActivities = () => api.get('/activities');

export default api;