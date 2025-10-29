import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { API_BASE_URL } from '../../config/constants'

export default function AdminBookingDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [booking, setBooking] = useState(null)
  const [installation, setInstallation] = useState(null)
  const [endpointUrl, setEndpointUrl] = useState(null)
  const [actionMsg, setActionMsg] = useState(null)
  const [status, setStatus] = useState('pending')
  const [tier, setTier] = useState('starter')
  const [appStatus, setAppStatus] = useState('provisioning')

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
    const fetchDetail = async () => {
      try {
        setLoading(true)
        setError(null)
        const { data } = await axios.get(`${API_BASE_URL}/api/admin/bookings/${id}?t=${Date.now()}`)
        if (!alive) return
        setBooking(data.booking)
        setInstallation(data.installation || null)
        setEndpointUrl(data.endpointUrl || null)
        setStatus(data.booking?.status || 'pending')
        if (data.installation?.appStatus) setAppStatus(String(data.installation.appStatus))
      } catch (e) {
        if (!alive) return
        setError(e?.response?.data?.message || 'Gagal memuat detail booking')
      } finally {
        if (alive) setLoading(false)
      }
    }
    fetchDetail()
    return () => { alive = false }
  }, [id])

  const refresh = async () => {
    const { data } = await axios.get(`${API_BASE_URL}/api/admin/bookings/${id}?t=${Date.now()}`)
    setBooking(data.booking)
    setInstallation(data.installation || null)
    setEndpointUrl(data.endpointUrl || null)
    if (data.installation?.appStatus) setAppStatus(String(data.installation.appStatus))
  }

  const handleProvision = async () => {
    try {
      setActionMsg(null)
      const { data } = await axios.post(`${API_BASE_URL}/api/admin/bookings/${id}/provision`)
      setActionMsg(`Provisioned: ${data.installation.subdomain}`)
      await refresh()
    } catch (e) {
      setActionMsg(e?.response?.data?.message || 'Gagal provision')
    }
  }

  const handleUpdateStatus = async () => {
    try {
      setActionMsg(null)
      await axios.patch(`${API_BASE_URL}/api/admin/bookings/${id}`, { status })
      setActionMsg(`Status diubah ke ${status}`)
      await refresh()
    } catch (e) {
      setActionMsg(e?.response?.data?.message || 'Gagal update status')
    }
  }

  const handleSetLicense = async () => {
    try {
      setActionMsg(null)
      await axios.post(`${API_BASE_URL}/api/admin/bookings/${id}/license`, { tier })
      setActionMsg(`License diubah ke ${tier}`)
      await refresh()
    } catch (e) {
      setActionMsg(e?.response?.data?.message || 'Gagal update license')
    }
  }

  const handleUpdateAppStatus = async () => {
    try {
      if (!installation?.id) return
      setActionMsg(null)
      await axios.patch(`${API_BASE_URL}/api/admin/installations/${installation.id}/app-status`, { appStatus })
      setActionMsg(`Status aplikasi diubah ke ${appStatus}`)
      await refresh()
    } catch (e) {
      setActionMsg(e?.response?.data?.message || 'Gagal update status aplikasi')
    }
  }

  return (
    <section className="section">
      <div className="container">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 className="section-title">Admin • Booking Detail</h1>
          <button className="btn btn-outline" onClick={() => navigate('/admin/bookings')}>Kembali</button>
        </div>
        <p className="section-subtitle">Kelola status booking, buat instansi, status aplikasi, dan lisensi.</p>

        <div className="surface" style={{ padding: 24 }}>
          {error && <div className="notification" style={{ background: '#ef4444', marginBottom: 12 }}>{error}</div>}
          {loading && <div className="notification" style={{ marginBottom: 12 }}>Memuat data...</div>}
          {actionMsg && <div className="notification" style={{ marginBottom: 12 }}>{actionMsg}</div>}

          {booking && (
            <div className="features-grid" style={{ marginTop: 8 }}>
              <div className="feature-card">
                <div className="muted">Nama</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{booking.name}</div>
              </div>
              <div className="feature-card">
                <div className="muted">Email</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{booking.email}</div>
              </div>
              <div className="feature-card">
                <div className="muted">Perusahaan</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{booking.company || '-'}</div>
              </div>
              <div className="feature-card">
                <div className="muted">Plan/Seats</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{booking.plan || '-'} • {booking.seats ?? '-'}</div>
              </div>
              <div className="feature-card">
                <div className="muted">Status Booking</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{chip(booking.status, statusBg(booking.status))}</div>
              </div>
              <div className="feature-card">
                <div className="muted">Dibuat</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{new Date(booking.createdAt).toLocaleString()}</div>
              </div>
            </div>
          )}

          {booking?.message && (
            <div className="quote" style={{ marginTop: 12 }}>{booking.message}</div>
          )}

          <div className="divider" />

          <h3>Actions</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {!installation && (
              <button className="btn btn-primary" onClick={handleProvision}>Buat Instansi</button>
            )}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select className="form-control" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="pending">pending</option>
                <option value="approved">approved</option>
                <option value="rejected">rejected</option>
                <option value="active">active</option>
              </select>
              <button className="btn btn-outline" onClick={handleUpdateStatus}>Update Status</button>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select className="form-control" value={tier} onChange={(e) => setTier(e.target.value)}>
                <option value="starter">starter</option>
                <option value="pro">pro</option>
                <option value="enterprise">enterprise</option>
              </select>
              <button className="btn btn-outline" onClick={handleSetLicense}>Set License</button>
            </div>
            {installation && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <select className="form-control" value={appStatus} onChange={(e) => setAppStatus(e.target.value)}>
                  <option value="provisioning">Provisioning</option>
                  <option value="pending">Pending</option>
                  <option value="running">Running</option>
                  <option value="stopped">Stopped</option>
                </select>
                <button className="btn btn-outline" onClick={handleUpdateAppStatus}>Update App Status</button>
              </div>
            )}
          </div>

          <div className="divider" />

          <h3>Installation</h3>
          {!installation ? (
            <div className="quote">Belum ada installation terkait booking ini. Lakukan Provision terlebih dahulu.</div>
          ) : (
            <div className="features-grid" style={{ marginTop: 8 }}>
              <div className="feature-card">
                <div className="muted">Installation ID</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{installation.id}</div>
              </div>
              <div className="feature-card">
                <div className="muted">Name</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{installation.studioName}</div>
              </div>
              <div className="feature-card">
                <div className="muted">App Endpoint</div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>
                  {endpointUrl ? (
                    <a href={endpointUrl} target="_blank" rel="noreferrer" className="nav-link" style={{ padding: 0 }}>
                      {endpointUrl}
                    </a>
                  ) : (
                    <span className="muted">-</span>
                  )}
                </div>
              </div>
              <div className="feature-card">
                <div className="muted">Status Aplikasi</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{chip(appStatus, statusBg(appStatus))}</div>
              </div>
              <div className="feature-card">
                <div className="muted">Lisensi</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{installation.licenseTier}</div>
              </div>
              <div className="feature-card">
                <div className="muted">Masa Tenggat</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>
                  {installation.trialStartedAt ? new Date(installation.trialStartedAt).toLocaleDateString() : '-'}
                  {' '}→{' '}
                  {installation.trialEndsAt ? new Date(installation.trialEndsAt).toLocaleDateString() : '-'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
