import React, { useState } from 'react'
import axios from 'axios'
import { API_BASE_URL } from '../config/constants'
import { useAuth } from '../context/AuthContext'
import { Link } from 'react-router-dom'

export default function Booking() {
  const { isAuthenticated } = useAuth()
  const [form, setForm] = useState({
    name: '',
    company: '',
    phone: '',
    plan: '',
    seats: '',
    message: ''
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const minByTier = { pro: 10, enterprise: 30 }
  const maxByTier = { starter: 5 }
  const currentPlanKey = String(form.plan || '').toLowerCase()
  const currentMin = minByTier[currentPlanKey] || 1
  const currentMax = maxByTier[currentPlanKey] || null

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      // client-side validation seats per plan
      const planKey = String(form.plan || '').toLowerCase()
      if (['starter','pro','enterprise'].includes(planKey)) {
        const seatCount = Number(form.seats) || 0
        if (planKey === 'starter' && seatCount > 5) {
          setError('Maksimum seats untuk paket starter adalah 5')
          setLoading(false)
          return
        }
        if (planKey === 'pro' && seatCount < 10) {
          setError('Minimum seats untuk paket pro adalah 10')
          setLoading(false)
          return
        }
        if (planKey === 'enterprise' && seatCount < 30) {
          setError('Minimum seats untuk paket enterprise adalah 30')
          setLoading(false)
          return
        }
      }
      const payload = {
        ...form,
        seats: form.seats ? Number(form.seats) : undefined,
      }
      const { data } = await axios.post(`${API_BASE_URL}/api/bookings`, payload)
      setResult({ id: data.id, status: data.status })
      setForm({ name: '', company: '', phone: '', plan: '', seats: '', message: '' })
    } catch (err) {
      setError(err?.response?.data?.message || 'Gagal mengirim booking')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="section">
      <div className="container">
        <h1 className="section-title">Booking Demo</h1>
        <p className="section-subtitle">Isi formulir berikut (wajib login), tim kami akan menghubungi Anda untuk penjadwalan.</p>

        {result && (
          <div className="notification" style={{ position: 'relative' }}>
            Permintaan booking terkirim. ID: <strong>{result.id}</strong>, status: <strong>{result.status}</strong>
          </div>
        )}
        {error && (
          <div className="notification" style={{ background: '#ef4444' }}>
            {error}
          </div>
        )}

        <div className="two-col">
          <div className="surface" style={{ padding: 24 }}>
            {!isAuthenticated && (
              <div className="notification" style={{ marginBottom: 16 }}>
                Booking memerlukan akun. Silakan <Link to="/login" className="nav-link" style={{ padding: 0 }}>Login</Link> atau <Link to="/signup" className="nav-link" style={{ padding: 0 }}>Signup</Link> terlebih dahulu.
              </div>
            )}
            <form onSubmit={handleSubmit} className="modal-form" style={{ position: 'relative', boxShadow: 'none', border: 'none', padding: 0 }}>
              <div className="form-group">
                <label htmlFor="name">Nama</label>
                <input id="name" name="name" className="form-control" value={form.name} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label htmlFor="company">Perusahaan</label>
                <input id="company" name="company" className="form-control" value={form.company} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label htmlFor="phone">Telepon</label>
                <input id="phone" name="phone" className="form-control" value={form.phone} onChange={handleChange} />
              </div>
              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label htmlFor="plan">Paket</label>
                  <select id="plan" name="plan" className="form-control" value={form.plan} onChange={handleChange}>
                    <option value="">Pilih paket</option>
                    <option value="Starter">Starter</option>
                    <option value="Pro">Pro</option>
                    <option value="Enterprise">Enterprise</option>
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label htmlFor="seats">Jumlah Seat</label>
                  <input id="seats" name="seats" type="number" min={currentMin} { ...(currentMax ? { max: currentMax } : {}) } className="form-control" value={form.seats} onChange={handleChange} />
                  {currentMax ? (
                    <div className="muted" style={{ marginTop: 4 }}>Maksimum {currentMax} seat untuk paket {currentPlanKey}</div>
                  ) : minByTier[currentPlanKey] ? (
                    <div className="muted" style={{ marginTop: 4 }}>Minimum {currentMin} seat untuk paket {currentPlanKey}</div>
                  ) : (
                    <div className="muted" style={{ marginTop: 4 }}>Isi jumlah kursi sesuai kebutuhan</div>
                  )}
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="message">Catatan</label>
                <textarea id="message" name="message" className="form-control" rows={4} value={form.message} onChange={handleChange} />
              </div>

              <div className="button-group">
                <button type="submit" className="form-btn form-btn-primary" disabled={loading || !isAuthenticated}>
                  {loading ? 'Mengirim...' : 'Kirim Booking'}
                </button>
              </div>
            </form>
          </div>
          <aside className="surface" style={{ padding: 24 }}>
            <h3 style={{ marginTop: 0 }}>Kenapa Demo SMOOD?</h3>
            <ul className="pricing-features" style={{ marginBottom: 16 }}>
              <li><span className="check">✓</span> Lihat alur kerja VFX end-to-end</li>
              <li><span className="check">✓</span> Diskusi kebutuhan pipeline Anda</li>
              <li><span className="check">✓</span> Rekomendasi setup On-Prem/Cloud</li>
            </ul>
            <div className="quote">
              “SMOOD membantu kami memangkas waktu koordinasi dan mempercepat review.”
              <div className="muted">— Lead Compositor, Studio X</div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  )
}
