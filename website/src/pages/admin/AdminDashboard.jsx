import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { API_BASE_URL } from '../../config/constants'

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [overview, setOverview] = useState({ users: 0, bookings: 0, installsTotal: 0, installsOnline: 0, trialsExpiring: 0 })
  const [insights, setInsights] = useState([])
  const [bookings, setBookings] = useState([])
  const [invoices, setInvoices] = useState([])
  const [updatedAt, setUpdatedAt] = useState(null)

  const statusBg = (status) => {
    const s = String(status || '').toLowerCase()
    if (s === 'running' || s === 'active' || s === 'approved' || s === 'paid') return '#86efac'
    if (s === 'stopped' || s === 'rejected' || s === 'cancelled' || s === 'expired') return '#fecaca'
    if (s === 'pending' || s === 'provisioning' || s === 'awaiting_payment') return '#fde68a'
    if (s === 'trial') return '#bfdbfe'
    return '#e5e7eb'
  }
  const chip = (text, bg) => (
    <span style={{ background: bg || '#e5e7eb', color: '#f97316', padding: '2px 8px', borderRadius: 8, fontWeight: 600 }}>
      {text}
    </span>
  )

  useEffect(() => {
    let alive = true
    const fetchAll = async () => {
      try {
        setLoading(true)
        setError(null)
        const [ov, ins, bks, inv] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/admin/overview`, { validateStatus: () => true }),
          axios.get(`${API_BASE_URL}/api/admin/installation-insights?limit=10`, { validateStatus: () => true }),
          axios.get(`${API_BASE_URL}/api/admin/bookings`, { validateStatus: () => true }),
          axios.get(`${API_BASE_URL}/api/admin/invoices`, { validateStatus: () => true }),
        ])
        if (!alive) return
        if (ov.status === 200) setOverview(ov.data || {})
        if (ins.status === 200) setInsights(Array.isArray(ins.data?.insights) ? ins.data.insights : [])
        if (bks.status === 200) setBookings(Array.isArray(bks.data?.bookings) ? bks.data.bookings : [])
        if (inv.status === 200) setInvoices(Array.isArray(inv.data?.invoices) ? inv.data.invoices : [])
        setUpdatedAt(new Date())
      } catch (e) {
        if (!alive) return
        setError(e?.response?.data?.message || 'Gagal memuat data dashboard')
      } finally {
        if (alive) setLoading(false)
      }
    }
    fetchAll()
    return () => { alive = false }
  }, [])

  const recentBookings = bookings.slice(0, 8)
  const recentInvoices = invoices.slice(0, 8)

  return (
    <section className="section">
      <div className="container">
        <h1 className="section-title">Admin • Dashboard</h1>
        <p className="section-subtitle">Ringkasan metrik sistem dan aktivitas terbaru.</p>

        <div className="surface" style={{ padding: 24 }}>
          {error && <div className="notification" style={{ background: '#ef4444', marginBottom: 12 }}>{error}</div>}
          {loading && <div className="notification" style={{ marginBottom: 12 }}>Memuat data...</div>}

          {/* Ringkasan Sistem */}
          <h3 style={{ marginTop: 0 }}>Ringkasan Sistem</h3>
          <div className="features-grid" style={{ marginTop: 8 }}>
            <div className="feature-card">
              <div className="muted">Total Users</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{overview.users}</div>
            </div>
            <div className="feature-card">
              <div className="muted">Total Bookings</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{bookings.length}</div>
            </div>
            <div className="feature-card">
              <div className="muted">Installations Online</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{overview.installsOnline}/{overview.installsTotal}</div>
            </div>
            <div className="feature-card">
              <div className="muted">Trial Berakhir ≤ 3 hari</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{overview.trialsExpiring || 0}</div>
            </div>
          </div>

          {updatedAt && (
            <div className="muted" style={{ marginTop: 8 }}>Terakhir diperbarui: {updatedAt.toLocaleString()}</div>
          )}

          <div className="divider" />

          {/* Instalasi Terbaru */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ marginTop: 0, marginBottom: 0 }}>Instalasi Terbaru</h3>
            <a href="/admin/installations" className="nav-link" style={{ padding: 0 }}>Lihat semua</a>
          </div>
          {insights.length === 0 ? (
            <div className="quote">Belum ada data instalasi.</div>
          ) : (
            <div className="table-responsive" style={{ marginTop: 8 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th align="left">Nama Aplikasi</th>
                    <th align="left">App Status</th>
                    <th align="left">Online</th>
                    <th align="left">Versi</th>
                    <th align="left">Endpoint</th>
                    <th align="left">Last Seen</th>
                    <th align="left">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {insights.slice(0, 8).map((it) => (
                    <tr key={it.id}>
                      <td>{it.studioName || '-'}</td>
                      <td>{chip(it.appStatus || '-', statusBg(it.appStatus))}</td>
                      <td>{chip(it.online ? 'Online' : 'Offline', it.online ? '#86efac' : '#e5e7eb')}</td>
                      <td>{it.appVersion || '-'}</td>
                      <td>
                        {it.endpointUrl ? (
                          <a href={it.endpointUrl} className="nav-link" style={{ padding: 0 }} target="_blank" rel="noreferrer">{it.endpointUrl}</a>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td>{it.lastSeenAt ? new Date(it.lastSeenAt).toLocaleString() : '-'}</td>
                      <td>
                        <a href={`/admin/installations/${it.id}`} className="btn btn-outline">Detail</a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="divider" />

          {/* Bookings Terbaru */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ marginTop: 0, marginBottom: 0 }}>Bookings Terbaru</h3>
            <a href="/admin/bookings" className="nav-link" style={{ padding: 0 }}>Lihat semua</a>
          </div>
          {recentBookings.length === 0 ? (
            <div className="quote">Belum ada booking.</div>
          ) : (
            <div className="table-responsive" style={{ marginTop: 8 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th align="left">Nama</th>
                    <th align="left">Email</th>
                    <th align="left">Status</th>
                    <th align="left">Aplikasi</th>
                    <th align="left">Endpoint</th>
                    <th align="left">Dibuat</th>
                    <th align="left">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {recentBookings.map((b) => (
                    <tr key={b.id}>
                      <td>{b.name}</td>
                      <td>{b.email}</td>
                      <td>{chip(b.status, statusBg(b.status))}</td>
                      <td>{b.installationName ? chip(b.installationName, '#e5e7eb') : '-'}</td>
                      <td>
                        {b.installationEndpointUrl ? (
                          <a href={b.installationEndpointUrl} className="nav-link" style={{ padding: 0 }} target="_blank" rel="noreferrer">{b.installationEndpointUrl}</a>
                        ) : b.installationSubdomain ? (
                          <a href={`https://${b.installationSubdomain}`} className="nav-link" style={{ padding: 0 }} target="_blank" rel="noreferrer">{b.installationSubdomain}</a>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td>{new Date(b.createdAt).toLocaleString()}</td>
                      <td>
                        <a href={`/admin/bookings/${b.id}`} className="btn btn-outline">Detail</a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="divider" />

          {/* Invoices Terbaru */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ marginTop: 0, marginBottom: 0 }}>Invoices Terbaru</h3>
            <a href="/admin/payments" className="nav-link" style={{ padding: 0 }}>Lihat semua</a>
          </div>
          {recentInvoices.length === 0 ? (
            <div className="quote">Belum ada invoice.</div>
          ) : (
            <div className="table-responsive" style={{ marginTop: 8 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th align="left">No. Invoice</th>
                    <th align="left">Email</th>
                    <th align="left">Jumlah</th>
                    <th align="left">Status</th>
                    <th align="left">Jatuh Tempo</th>
                    <th align="left">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {recentInvoices.map((inv) => (
                    <tr key={inv.id}>
                      <td>{inv.number}</td>
                      <td>{inv.email}</td>
                      <td>{inv.amount?.toLocaleString?.('id-ID') || inv.amount} {inv.currency || 'IDR'}</td>
                      <td>{chip(inv.status, statusBg(inv.status))}</td>
                      <td>{inv.dueAt ? new Date(inv.dueAt).toLocaleDateString() : '-'}</td>
                      <td>
                        <a href={`/admin/payments/${inv.id}`} className="btn btn-outline">Detail</a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
