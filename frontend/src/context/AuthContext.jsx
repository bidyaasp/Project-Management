import React, { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('pm_user'))
    } catch { return null }
  })
  const [token, setToken] = useState(() => localStorage.getItem('pm_token'))

  // ⬇️ Listen for token-expired event (401)
  useEffect(() => {
    const autoLogout = () => logout()

    window.addEventListener('pm_force_logout', autoLogout)
    return () => window.removeEventListener('pm_force_logout', autoLogout)
  }, [])

  const login = async (email, password) => {
    const resp = await api.post('/auth/token', { email: email, password })
    const jwt = resp.data.access_token || resp.data.token || resp.data.access || resp.data
    localStorage.setItem('pm_token', jwt)
    setToken(jwt)

    const me = await api.get('/users/me', {
      headers: { Authorization: `Bearer ${jwt}` }
    })

    setUser(me.data)
    localStorage.setItem('pm_user', JSON.stringify(me.data))
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('pm_token')
    localStorage.removeItem('pm_user')
  }

  return (
    <AuthContext.Provider value={{ user, setUser, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
