import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { API_BASE_URL } from '../../config/constants'

export default function AdminInstallations() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [rows, setRows] = useState([])
  const navigate = useNavigate()

  const statusBg = (status) => {
    const s = String(status || '').toLowerCase()
    if (s === 'running' || s === 'active' || s === 'approved') return '#86efac' // green-300
    if (s === 'stopped' || s === 'rejected') return '#fecaca' // red-200
    if (s === 'pending' || s === 'provisioning') return '#fde68a' // amber-300
    if (s === 'trial') return '#bfdbfe' // blue-200
    return '#e5e7eb' // gray-200
  }
  const chip = (text, bg) => (
    <span style={{ background: bg || '#e5e7eb', color: '#f97316', padding: '2px 8px', borderRadius: 8, fontWeight: 600 }}>
      {text}
    </span>
  )

  useEffect(() => {
    let alive = true
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        // Coba pakai insights (lebih kaya). Fallback ke installations jika belum tersedia
        let insights = null
        try {
          const res = await axios.get(`${API_BASE_URL}/api/admin/installation-insights`)
          insights = Array.isArray(res?.data?.insights) ? res.data.insights : null
        } catch (_) {}
        if (!alive) return
        if (insights) {
          setRows(insights)
        } else {
          const { data } = await axios.get(`${API_BASE_URL}/api/admin/installations`)
          if (!alive) return
          setRows(Array.isArray(data?.installations) ? data.installations : [])
        }
      } catch (e) {
        if (!alive) return
        setError(e?.response?.data?.message || 'Gagal memuat installations')
      } finally {
        if (alive) setLoading(false)
      }
    }
    fetchData()
    return () => { alive = false }
  }, [])

  const refresh = async () => {
    try {
      setError(null)
      const res = await axios.get(`${API_BASE_URL}/api/admin/installation-insights`)
      const insights = Array.isArray(res?.data?.insights) ? res.data.insights : null
      if (insights) setRows(insights)
    } catch (e) {}
  }

  return (
    <section className="section">
      <div className="container">
        <h1 className="section-title">Admin • Installations</h1>
        <p className="section-subtitle">Daftar instalasi yang terdaftar.</p>

        <div className="surface" style={{ padding: 24 }}>
          {error && <div className="notification" style={{ background: '#ef4444', marginBottom: 12 }}>{error}</div>}
          {loading && <div className="notification" style={{ marginBottom: 12 }}>Memuat data...</div>}

          <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" onClick={() => navigate('/admin/installations/new')}>
              Install New
            </button>
          </div>

          <div className="features-grid">
            {rows.map((it) => {
              const online = typeof it.online === 'boolean' ? it.online : (it.lastSeenAt ? (Date.now() - new Date(it.lastSeenAt).getTime()) <= 5 * 60 * 1000 : false)
              const metrics = it.metrics || {}
              const storageGB = typeof metrics.storageUsedGB === 'number'
                ? metrics.storageUsedGB
                : (typeof metrics.storageUsedBytes === 'number' ? Math.round((metrics.storageUsedBytes / (1024 ** 3)) * 100) / 100 : null)
              return (
                <div key={it.id} className="feature-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 700 }}>{it.studioName || it.companyName || it.instanceName || '—'}</div>
                    <div className="muted">{it.appVersion || 'v?'}</div>
                  </div>
                  <div className="muted" style={{ marginTop: 6 }}>{it.primaryIp || '—'} • {it.environment || '—'} • {online ? 'Online' : 'Offline'}</div>
                  <div className="muted" style={{ marginTop: 6 }}>Last seen: {it.lastSeenAt ? new Date(it.lastSeenAt).toLocaleString() : '—'}</div>
                  {it.endpointUrl && (
                    <div className="muted" style={{ marginTop: 6 }}>Endpoint: {it.endpointUrl}</div>
                  )}
                  <div style={{ marginTop: 6 }}>App status: {chip(it.appStatus || '—', statusBg(it.appStatus))}</div>
                  {(it.bookingEmail || it.bookingId) && (
                    <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span className="muted">Bridge:</span>
                      {it.bookingEmail && chip(it.bookingEmail, '#e5e7eb')}
                      {!it.bookingEmail && it.bookingId && chip(it.bookingId, '#e5e7eb')}
                    </div>
                  )}

                  <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button className="btn btn-outline" onClick={() => navigate(`/admin/installations/${it.id}`)}>
                      Detail
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
