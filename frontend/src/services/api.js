import axios from 'axios';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/token/refresh/`, {
            refresh: refreshToken
          });
          localStorage.setItem('access_token', response.data.access);
          error.config.headers.Authorization = `Bearer ${response.data.access}`;
          return axios(error.config);
        } catch (refreshError) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (userData) => api.post('/auth/register/', userData),
  login: (credentials) => api.post('/auth/login/', credentials),
  logout: () => api.post('/auth/logout/', {
    refresh: localStorage.getItem('refresh_token')
  }),
  getProfile: () => api.get('/users/me/'),
};

export const purchaseAPI = {
  getRequests: () => api.get('/requests/'),
  getRequest: (id) => api.get(`/requests/${id}/`),
  createRequest: (data) => api.post('/requests/', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  updateRequest: (id, data) => api.put(`/requests/${id}/`, data),
  approveRequest: (id, comments = '') => api.patch(`/requests/${id}/approve/`, { comments }),
  rejectRequest: (id, comments = '') => api.patch(`/requests/${id}/reject/`, { comments }),
  submitReceipt: (id, file) => {
    const formData = new FormData();
    formData.append('receipt', file);
    return api.post(`/requests/${id}/submit_receipt/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  getPurchaseOrder: (id) => api.get(`/requests/${id}/purchase_order/`),
};

export default api;