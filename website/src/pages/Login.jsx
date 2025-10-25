import React, { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import axios from 'axios'
import { API_BASE_URL } from '../config/constants'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const from = location.state?.from?.pathname || '/dashboard'

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await login(form.email, form.password)
      // Cek admin secara silent untuk menentukan tujuan akhir
      const res = await axios.get(`${API_BASE_URL}/api/admin/ping`, { validateStatus: () => true })
      if (res?.status === 200 || res?.status === 304) {
        const go = (from && from.startsWith('/admin')) ? from : '/admin'
        navigate(go, { replace: true })
      } else {
        // Jika bukan admin, jangan paksa ke admin
        if (from && from.startsWith('/admin')) {
          navigate('/dashboard', { replace: true })
        } else {
          navigate(from, { replace: true })
        }
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Login gagal')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="section">
      <div className="container">
        <h1 className="section-title">Login</h1>
        <p className="section-subtitle">Masuk ke client area Anda.</p>

        {error && (
          <div className="notification" style={{ background: '#ef4444' }}>{error}</div>
        )}

        <div className="two-col">
          <div className="surface" style={{ padding: 24 }}>
            <form onSubmit={handleSubmit} className="modal-form" style={{ position: 'relative', boxShadow: 'none', border: 'none', padding: 0 }}>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input id="email" type="email" name="email" className="form-control" value={form.email} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input id="password" type="password" name="password" className="form-control" value={form.password} onChange={handleChange} required />
              </div>
              <div className="button-group">
                <button type="submit" className="form-btn form-btn-primary" disabled={loading}>
                  {loading ? 'Memproses...' : 'Masuk'}
                </button>
              </div>
            </form>
            <div className="divider" />
            <div>
              <a href={`${API_BASE_URL}/api/auth/google`} className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
                  <path fill="#FFC107" d="M43.611 20.083h-1.8V20H24v8h11.303c-1.651 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.149 7.961 3.039l5.657-5.657C33.64 6.053 29.052 4 24 4 12.954 4 4 12.954 4 24s8.954 20 20 20 20-8.954 20-20c0-1.341-.138-2.651-.389-3.917z"/>
                  <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.252 16.628 18.735 14 24 14c3.059 0 5.842 1.149 7.961 3.039l5.657-5.657C33.64 6.053 29.052 4 24 4c-7.732 0-14.337 4.358-17.694 10.691z"/>
                  <path fill="#4CAF50" d="M24 44c5.17 0 9.86-1.977 13.409-5.197l-6.2-5.238C29.172 34.488 26.708 35.5 24 35.5c-5.187 0-9.6-3.316-11.258-7.967l-6.5 5.016C9.57 39.64 16.227 44 24 44z"/>
                  <path fill="#1976D2" d="M43.611 20.083H42.11V20H24v8h11.303c-.792 2.237-2.27 4.177-4.094 5.566l6.2 5.238C39.241 35.688 44 30.59 44 24c0-1.341-.138-2.651-.389-3.917z"/>
                </svg>
                <span>Login dengan Google</span>
              </a>
            </div>
          </div>
          <aside className="surface" style={{ padding: 24 }}>
            <div>Belum punya akun? <Link to="/signup" className="nav-link" style={{ padding: 0 }}>Daftar</Link></div>
          </aside>
        </div>
      </div>
    </section>
  )
}
