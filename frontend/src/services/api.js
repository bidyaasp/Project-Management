// src/services/api.js
import axios from 'axios'

const base = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

const api = axios.create({
  baseURL: base,
  timeout: 10000,
})

// 🔐 Automatically attach JWT token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('pm_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// 🚨 Auto logout on 401 (expired token)
api.interceptors.response.use(
  (response) => response,

  (error) => {
    if (error.response && error.response.status === 401) {
      // Fire event so AuthContext can logout
      window.dispatchEvent(new Event('pm_force_logout'))
    }
    return Promise.reject(error)
  }
)

export default api
