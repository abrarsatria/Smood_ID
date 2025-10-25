import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { API_BASE_URL } from '../config/constants'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  // Init from localStorage
  useEffect(() => {
    const t = localStorage.getItem('auth_token')
    const u = localStorage.getItem('auth_user')
    if (t) {
      setToken(t)
      axios.defaults.baseURL = API_BASE_URL
      axios.defaults.headers.common['Authorization'] = `Bearer ${t}`
    }
    if (u) setUser(JSON.parse(u))
    const check = async () => {
      try {
        // Inisialisasi sesi user via endpoint client hanya jika sudah ada token (hindari 401 di console)
        if (t) {
          await axios.get(`${API_BASE_URL}/api/client/instance`, { validateStatus: () => true })
        }
      } catch {}
      try {
        const onAdmin = typeof window !== 'undefined' && window.location && window.location.pathname.startsWith('/admin')
        if (onAdmin) {
          const res = await axios.get(`${API_BASE_URL}/api/admin/ping`, { validateStatus: () => true })
          setIsAdmin(res?.status === 200)
        } else {
          setIsAdmin(false)
        }
      } catch {
        setIsAdmin(false)
      } finally {
        setLoading(false)
      }
    }
    check()
  }, [])

  const login = async (email, password) => {
    const { data } = await axios.post(`${API_BASE_URL}/api/auth/login`, { email, password })
    setToken(data.token)
    setUser(data.user)
    localStorage.setItem('auth_token', data.token)
    localStorage.setItem('auth_user', JSON.stringify(data.user))
    axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`
    // Tentukan admin secara silent agar rute admin tidak langsung ditolak oleh guard lain
    try {
      const res = await axios.get(`${API_BASE_URL}/api/admin/ping`, { validateStatus: () => true })
      setIsAdmin(res?.status === 200 || res?.status === 304)
    } catch { setIsAdmin(false) }
    return data.user
  }

  const signup = async (name, email, password) => {
    const { data } = await axios.post(`${API_BASE_URL}/api/auth/signup`, { name, email, password })
    setToken(data.token)
    setUser(data.user)
    localStorage.setItem('auth_token', data.token)
    localStorage.setItem('auth_user', JSON.stringify(data.user))
    axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`
    // Tentukan admin secara silent
    try {
      const res = await axios.get(`${API_BASE_URL}/api/admin/ping`, { validateStatus: () => true })
      setIsAdmin(res?.status === 200 || res?.status === 304)
    } catch { setIsAdmin(false) }
    return data.user
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    setIsAdmin(false)
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
    delete axios.defaults.headers.common['Authorization']
  }

  const updateUser = (patch) => {
    setUser((prev) => {
      const next = { ...(prev || {}), ...(patch || {}) }
      localStorage.setItem('auth_user', JSON.stringify(next))
      return next
    })
  }

  const value = useMemo(() => ({ token, user, loading, login, signup, logout, updateUser, isAuthenticated: !!token, isAdmin }), [token, user, loading, isAdmin])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
