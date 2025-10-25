import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Signup() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await signup(form.name, form.email, form.password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err?.response?.data?.message || 'Signup gagal')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="section">
      <div className="container">
        <h1 className="section-title">Daftar</h1>
        <p className="section-subtitle">Buat akun untuk mengakses client area.</p>

        {error && (
          <div className="notification" style={{ background: '#ef4444' }}>{error}</div>
        )}

        <div className="two-col">
          <div className="surface" style={{ padding: 24 }}>
            <form onSubmit={handleSubmit} className="modal-form" style={{ position: 'relative', boxShadow: 'none', border: 'none', padding: 0 }}>
              <div className="form-group">
                <label htmlFor="name">Nama</label>
                <input id="name" name="name" className="form-control" value={form.name} onChange={handleChange} required />
              </div>
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
                  {loading ? 'Memproses...' : 'Daftar'}
                </button>
              </div>
            </form>
          </div>
          <aside className="surface" style={{ padding: 24 }}>
            <div>Sudah punya akun? <Link to="/login" className="nav-link" style={{ padding: 0 }}>Masuk</Link></div>
          </aside>
        </div>
      </div>
    </section>
  )
}
