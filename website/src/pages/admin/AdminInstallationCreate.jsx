import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import { API_BASE_URL } from '../../config/constants'

export default function AdminInstallationCreate() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    companyName: '',
    studioName: '',
    contactEmail: '',
    tier: 'trial',
    driver: 'docker',
    seats: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const onChange = (e) => {
    const { name, value } = e.target
    setForm((s) => ({ ...s, [name]: value }))
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    try {
      setLoading(true)
      const { data } = await axios.post(`${API_BASE_URL}/api/admin/installations/provision`, form)
      const id = data?.id
      if (id) {
        navigate(`/admin/installations/${id}`)
      }
    } catch (e) {
      setError(e?.response?.data?.message || 'Gagal membuat installation baru')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="section">
      <div className="container">
        <h1 className="section-title">Admin • Install New App</h1>
        <p className="section-subtitle">Buat instance aplikasi baru (multi-tenant).</p>

        <div style={{ marginBottom: 12 }}>
          <Link className="btn btn-outline" to="/admin/installations">Kembali</Link>
        </div>

        <div className="surface" style={{ padding: 24, maxWidth: 720 }}>
          {error && <div className="notification" style={{ background: '#ef4444', marginBottom: 12 }}>{error}</div>}
          <form onSubmit={onSubmit}>
            <div className="features-grid" style={{ marginTop: 8 }}>
              <div className="feature-card">
                <label className="muted">Company Name</label>
                <input
                  name="companyName"
                  value={form.companyName}
                  onChange={onChange}
                  placeholder="Contoh: PT Contoh Jaya"
                />
              </div>
              <div className="feature-card">
                <label className="muted">Nama Aplikasi</label>
                <input
                  name="studioName"
                  value={form.studioName}
                  onChange={onChange}
                  placeholder="Contoh: Nama Aplikasi"
                />
              </div>
              <div className="feature-card">
                <label className="muted">Contact Email</label>
                <input
                  required
                  type="email"
                  name="contactEmail"
                  value={form.contactEmail}
                  onChange={onChange}
                  placeholder="admin@contoh.com"
                />
              </div>
              <div className="feature-card">
                <label className="muted">Tier</label>
                <select name="tier" value={form.tier} onChange={onChange}>
                  <option value="trial">trial</option>
                  <option value="starter">starter</option>
                  <option value="pro">pro</option>
                  <option value="enterprise">enterprise</option>
                </select>
              </div>
              <div className="feature-card">
                <label className="muted">Driver</label>
                <select name="driver" value={form.driver} onChange={onChange}>
                  <option value="docker">docker</option>
                </select>
              </div>
              <div className="feature-card">
                <label className="muted">Seats (User Limit)</label>
                <input
                  name="seats"
                  type="number"
                  min={1}
                  value={form.seats}
                  onChange={onChange}
                  placeholder="Contoh: 10"
                />
              </div>
            </div>

            <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" type="submit" disabled={loading}>
                {loading ? 'Memprovision...' : 'Install New'}
              </button>
              <button className="btn btn-outline" type="button" onClick={() => navigate('/admin/installations')}>
                Batal
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  )
}
