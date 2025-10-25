import React, { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import axios from 'axios'
import { API_BASE_URL } from '../config/constants'

export default function Dashboard() {
  const { user, logout, updateUser } = useAuth()
  const [studioName, setStudioName] = useState('Nama Aplikasi')
  const [installs, setInstalls] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', studioName: '' })

  useEffect(() => {
    let alive = true
    const fetchAll = async () => {
      try {
        setLoading(true)
        setError(null)
        const [instInfo, listRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/client/instance`, { validateStatus: () => true }),
          axios.get(`${API_BASE_URL}/api/client/installations`, { validateStatus: () => true }),
        ])
        if (!alive) return
        if (instInfo?.status === 200 && instInfo?.data?.studioName) setStudioName(instInfo.data.studioName)
        const items = Array.isArray(listRes?.data?.installations) ? listRes.data.installations : []
        setInstalls(items)
      } catch (e) {
        if (!alive) return
        setError(e?.response?.data?.message || 'Gagal memuat dashboard')
      } finally {
        if (alive) setLoading(false)
      }
    }
    fetchAll()
    return () => { alive = false }
  }, [])

  // Sinkronkan form dengan user/studioName yang dimuat
  useEffect(() => {
    setForm({
      name: user?.name || '',
      email: user?.email || '',
      studioName: studioName || '',
    })
  }, [user, studioName])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSavedMsg(null)
    try {
      const payload = { name: form.name, studioName: form.studioName }
      const res = await axios.patch(`${API_BASE_URL}/api/client/profile`, payload, { validateStatus: () => true })
      if (res?.status !== 200) {
        throw new Error(res?.data?.message || 'Gagal menyimpan profil')
      }
      // Update context user dan studioName lokal
      if (payload.name && payload.name !== user?.name) {
        updateUser({ name: payload.name })
      }
      if (typeof payload.studioName === 'string' && payload.studioName.trim().length > 0) {
        setStudioName(payload.studioName.trim())
      }
      setSavedMsg('Profil berhasil disimpan')
    } catch (err) {
      setError(err?.message || 'Gagal menyimpan profil')
    } finally {
      setSaving(false)
      setTimeout(() => setSavedMsg(null), 2000)
    }
  }

  const runningApps = useMemo(() => {
    return installs.filter((it) => String(it.appStatus || '').toLowerCase() === 'running')
  }, [installs])

  return (
    <section className="section">
      <div className="container">
        <h1 className="section-title">Client Dashboard</h1>
        <p className="section-subtitle">Ringkasan akun dan aplikasi yang Anda miliki.</p>

        <div className="two-col">
          {/* Kolom Kiri: Overview & Aktivitas */}
          <div className="surface" style={{ padding: 24 }}>
            {error && <div className="notification" style={{ background: '#ef4444', marginBottom: 12 }}>{error}</div>}
            {loading && <div className="notification" style={{ marginBottom: 12 }}>Memuat data...</div>}

            <h3 style={{ marginTop: 0 }}>Overview</h3>
            <div className="features-grid" style={{ marginTop: 8 }}>
              <div className="feature-card">
                <div className="muted">Aplikasi Saya</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{installs.length}</div>
              </div>
              <div className="feature-card">
                <div className="muted">Berjalan (Running)</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{runningApps.length}</div>
              </div>
            </div>

            <div className="divider" />

            <h3>Aksi Cepat</h3>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <a href="/features" className="btn btn-outline">Lihat Fitur</a>
              <a href="/contact" className="btn btn-outline">Kontak Support</a>
              <a href="/booking" className="btn btn-primary">Upgrade/Booking</a>
            </div>

            <div className="divider" />

            <h3>Menu Client Area</h3>
            <div className="features-grid" style={{ marginTop: 8 }}>
              <div className="feature-card">
                <div style={{ fontWeight: 700 }}>Payment & Billing</div>
                <div className="muted" style={{ marginTop: 6 }}>Kelola tagihan, metode pembayaran, dan paket.</div>
                <div style={{ marginTop: 10 }}>
                  <a href="/client/payment" className="btn btn-primary">Buka Payment</a>
                </div>
              </div>
              <div className="feature-card">
                <div style={{ fontWeight: 700 }}>Manage Apps</div>
                <div className="muted" style={{ marginTop: 6 }}>Instalasi aplikasi, lisensi, dan konfigurasi.</div>
                <div style={{ marginTop: 10 }}>
                  <a href="/client/apps" className="btn btn-primary">Buka Manage Apps</a>
                </div>
              </div>
              <div className="feature-card">
                <div style={{ fontWeight: 700 }}>Documentation / API</div>
                <div className="muted" style={{ marginTop: 6 }}>Referensi API untuk integrasi pipeline Anda.</div>
                <div style={{ marginTop: 10 }}>
                  <a href="/client/docs" className="btn btn-primary">Buka Docs</a>
                </div>
              </div>
            </div>

            <div className="divider" />

            <h3>Aplikasi Berjalan</h3>
            {runningApps.length === 0 ? (
              <div className="quote">Tidak ada aplikasi yang berstatus Running saat ini.</div>
            ) : (
              <div className="features-grid" style={{ marginTop: 8 }}>
                {runningApps.map((it) => (
                  <div key={it.id} className="feature-card">
                    <div style={{ fontWeight: 700 }}>{it.instanceName || '-'}</div>
                    <div className="muted" style={{ marginTop: 6 }}>{it.endpointUrl || '-'}</div>
                    <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {it.endpointUrl && <a href={it.endpointUrl} className="btn" target="_blank" rel="noreferrer">Open</a>}
                      <a href="/client/apps" className="btn btn-outline">Detail</a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Kolom Kanan: Profil Akun (editable) */}
          <aside className="surface" style={{ padding: 24 }}>
            <h3 style={{ marginTop: 0 }}>Akun</h3>
            {savedMsg && <div className="notification" style={{ marginBottom: 12 }}>{savedMsg}</div>}
            <form onSubmit={handleSave} className="modal-form" style={{ position: 'relative', boxShadow: 'none', border: 'none', padding: 0 }}>
              <div className="form-group">
                <label htmlFor="name">Nama</label>
                <input id="name" name="name" type="text" className="form-control" value={form.name} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input id="email" name="email" type="email" className="form-control" value={form.email} disabled readOnly />
              </div>
              <div className="form-group">
                <label htmlFor="studioName">Nama Aplikasi</label>
                <input id="studioName" name="studioName" type="text" className="form-control" value={form.studioName} onChange={handleChange} required />
              </div>
              <div className="button-group">
                <button type="submit" className="form-btn form-btn-primary" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</button>
                <button type="button" className="form-btn" onClick={logout}>Logout</button>
              </div>
            </form>
          </aside>
        </div>
      </div>
    </section>
  )
}
