import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { API_BASE_URL } from '../../config/constants'

export default function AdminBookings() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [rows, setRows] = useState([])
  const [actionMsg, setActionMsg] = useState(null)
  // Filters & sorting
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [planFilter, setPlanFilter] = useState('')
  const [sortKey, setSortKey] = useState('createdAt') // createdAt | name | email | plan | status
  const [sortDir, setSortDir] = useState('desc') // asc | desc
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

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

  const norm = (v) => (v == null ? '' : String(v).toLowerCase())
  const filteredSorted = useMemo(() => {
    let arr = Array.isArray(rows) ? [...rows] : []
    // search
    const term = norm(q)
    if (term) {
      arr = arr.filter((b) => {
        return [b.name, b.email, b.company, b.installationName, b.installationEndpointUrl, b.installationSubdomain]
          .map(norm)
          .some((s) => s.includes(term))
      })
    }
    // status
    if (statusFilter) {
      arr = arr.filter((b) => norm(b.status) === norm(statusFilter))
    }
    // plan
    if (planFilter) {
      arr = arr.filter((b) => norm(b.plan) === norm(planFilter))
    }
    // sort
    const dir = sortDir === 'asc' ? 1 : -1
    arr.sort((a, b) => {
      const ka = sortKey
      if (ka === 'createdAt') {
        const av = new Date(a.createdAt).getTime() || 0
        const bv = new Date(b.createdAt).getTime() || 0
        return (av - bv) * dir
      }
      const av = norm(a[ka])
      const bv = norm(b[ka])
      if (av < bv) return -1 * dir
      if (av > bv) return 1 * dir
      return 0
    })
    return arr
  }, [rows, q, statusFilter, planFilter, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / pageSize))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = (safePage - 1) * pageSize
  const current = filteredSorted.slice(start, start + pageSize)

  useEffect(() => {
    let alive = true
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        const { data } = await axios.get(`${API_BASE_URL}/api/admin/bookings`)
        if (!alive) return
        setRows(Array.isArray(data?.bookings) ? data.bookings : [])
      } catch (e) {
        if (!alive) return
        setError(e?.response?.data?.message || 'Gagal memuat bookings')
      } finally {
        if (alive) setLoading(false)
      }
    }
    fetchData()
    return () => { alive = false }
  }, [])

  const refresh = async () => {
    try {
      const { data } = await axios.get(`${API_BASE_URL}/api/admin/bookings`)
      setRows(Array.isArray(data?.bookings) ? data.bookings : [])
    } catch {}
  }

  const onDelete = async (id) => {
    if (!id) return
    const ok = window.confirm('Hapus booking ini? Tindakan ini tidak dapat dibatalkan.')
    if (!ok) return
    try {
      const { data } = await axios.delete(`${API_BASE_URL}/api/admin/bookings/${id}`)
      if (data?.ok) {
        setRows((prev) => prev.filter((b) => b.id !== id))
        setActionMsg('Booking telah dihapus')
        // sesuaikan halaman bila kosong
        setPage((p) => {
          const totalAfter = filteredSorted.length - 1
          const tp = Math.max(1, Math.ceil(totalAfter / pageSize))
          return Math.min(p, tp)
        })
      }
    } catch (e) {
      setActionMsg(e?.response?.data?.message || 'Gagal menghapus booking')
    }
  }

  const resetFilters = () => {
    setQ('')
    setStatusFilter('')
    setPlanFilter('')
    setSortKey('createdAt')
    setSortDir('desc')
    setPage(1)
    setPageSize(10)
  }

  return (
    <section className="section">
      <div className="container">
        <h1 className="section-title">Admin • Bookings</h1>
        <p className="section-subtitle">Daftar seluruh booking terbaru. Gunakan filter dan sort untuk mempercepat pencarian.</p>

        <div className="surface" style={{ padding: 24 }}>
          {error && <div className="notification" style={{ background: '#ef4444', marginBottom: 12 }}>{error}</div>}
          {loading && <div className="notification" style={{ marginBottom: 12 }}>Memuat data...</div>}
          {actionMsg && <div className="notification" style={{ marginBottom: 12 }}>{actionMsg}</div>}

          {/* Controls */}
          <div className="grid-container" style={{ marginBottom: 12, alignItems: 'end' }}>
            <div className="form-group">
              <label>Pencarian</label>
              <input className="form-control" placeholder="Nama, Email, Perusahaan, Endpoint..." value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select className="form-control" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}>
                <option value="">Semua</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="active">Active</option>
              </select>
            </div>
            <div className="form-group">
              <label>Plan</label>
              <select className="form-control" value={planFilter} onChange={(e) => { setPlanFilter(e.target.value); setPage(1) }}>
                <option value="">Semua</option>
                <option value="trial">Trial</option>
                <option value="starter">Starter</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            <div className="form-group">
              <label>Sort</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <select className="form-control" value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
                  <option value="createdAt">Tanggal</option>
                  <option value="name">Nama</option>
                  <option value="email">Email</option>
                  <option value="plan">Plan</option>
                  <option value="status">Status</option>
                </select>
                <select className="form-control" value={sortDir} onChange={(e) => setSortDir(e.target.value)}>
                  <option value="desc">Desc</option>
                  <option value="asc">Asc</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Per halaman</label>
              <select className="form-control" value={pageSize} onChange={(e) => { setPageSize(parseInt(e.target.value) || 10); setPage(1) }}>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <div className="form-group">
              <label>&nbsp;</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn" onClick={refresh}>Refresh</button>
                <button className="btn btn-outline" onClick={resetFilters}>Reset</button>
              </div>
            </div>
          </div>

          {rows.length === 0 ? (
            <div className="quote">Belum ada data.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th align="left">Nama</th>
                    <th align="left">Email</th>
                    <th align="left">Perusahaan</th>
                    <th align="left">Plan</th>
                    <th align="left">Seats</th>
                    <th align="left">Status</th>
                    <th align="left">Aplikasi (bridged)</th>
                    <th align="left">App Status</th>
                    <th align="left">Endpoint</th>
                    <th align="left">Dibuat</th>
                    <th align="left">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {current.map((b) => (
                    <tr key={b.id}>
                      <td>{b.name}</td>
                      <td>{b.email}</td>
                      <td>{b.company || '-'}</td>
                      <td>{b.plan || '-'}</td>
                      <td>{b.seats ?? '-'}</td>
                      <td>{chip(b.status, statusBg(b.status))}</td>
                      <td>{b.installationName ? chip(b.installationName, '#e5e7eb') : '-'}</td>
                      <td>{b.installationAppStatus ? chip(b.installationAppStatus, statusBg(b.installationAppStatus)) : '-'}</td>
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
                      <td style={{ display: 'flex', gap: 8 }}>
                        <a href={`/admin/bookings/${b.id}`} className="btn btn-primary">Detail</a>
                        <button className="btn btn-outline" onClick={() => onDelete(b.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
            <div className="muted">Menampilkan {current.length} dari {filteredSorted.length} data • Hal {safePage} / {totalPages}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-outline" disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
              <button className="btn btn-outline" disabled={safePage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
