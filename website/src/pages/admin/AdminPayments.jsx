import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { API_BASE_URL } from '../../config/constants'

export default function AdminPayments() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [invoices, setInvoices] = useState([])
  const [filter, setFilter] = useState({ email: '' })

  const summary = useMemo(() => {
    const counts = { total: invoices.length, awaiting_payment: 0, paid: 0, cancelled: 0, expired: 0 }
    invoices.forEach((i) => { counts[i.status] = (counts[i.status] || 0) + 1 })
    return counts
  }, [invoices])

  const load = async () => {
    try {
      setLoading(true)
      setError(null)
      const params = {}
      if (filter.email.trim()) params.email = filter.email.trim()
      const { data } = await axios.get(`${API_BASE_URL}/api/admin/invoices`, { params })
      setInvoices(Array.isArray(data?.invoices) ? data.invoices : [])
    } catch (e) {
      setError(e?.response?.data?.message || 'Gagal memuat data pembayaran')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let alive = true
    ;(async () => { if (alive) await load() })()
    return () => { alive = false }
  }, [])

  // Perubahan status dilakukan di halaman detail invoice

  return (
    <section className="section">
      <div className="container">
        <h1 className="section-title">Admin • Payments</h1>
        <p className="section-subtitle">Verifikasi pembayaran dan kelola invoice.</p>

        <div className="surface" style={{ padding: 24 }}>
          {error && <div className="notification" style={{ background: '#ef4444', marginBottom: 12 }}>{error}</div>}
          {loading && <div className="notification" style={{ marginBottom: 12 }}>Memuat data...</div>}

          <h3 style={{ marginTop: 0 }}>Ringkasan</h3>
          <div className="features-grid" style={{ marginTop: 8 }}>
            <div className="feature-card">
              <div className="muted">Invoices</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{summary.total}</div>
            </div>
            <div className="feature-card">
              <div className="muted">Awaiting Payment</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{summary.awaiting_payment}</div>
            </div>
            <div className="feature-card">
              <div className="muted">Paid</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{summary.paid}</div>
            </div>
            <div className="feature-card">
              <div className="muted">Cancelled</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{summary.cancelled}</div>
            </div>
            <div className="feature-card">
              <div className="muted">Expired</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{summary.expired}</div>
            </div>
          </div>

          <div className="divider" />

          <h3>Filter</h3>
          <div className="form-row" style={{ marginBottom: 12 }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="email">Email</label>
              <input id="email" type="email" className="form-control" value={filter.email} onChange={(e) => setFilter((p) => ({ ...p, email: e.target.value }))} placeholder="Filter berdasarkan email" />
            </div>
            <div className="button-group" style={{ alignSelf: 'flex-end' }}>
              <button className="form-btn" onClick={load}>Terapkan</button>
            </div>
          </div>

          <div className="divider" />

          <h3>Daftar Invoice</h3>
          {invoices.length === 0 ? (
            <div className="quote" style={{ marginTop: 8 }}>Belum ada data invoice.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th align="left">No. Invoice</th>
                    <th align="left">Email</th>
                    <th align="left">Tier</th>
                    <th align="left">Seats</th>
                    <th align="left">Amount</th>
                    <th align="left">Issued</th>
                    <th align="left">Due</th>
                    <th align="left">Proof</th>
                    <th align="left">Status</th>
                    <th align="left">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id}>
                      <td>{inv.number}</td>
                      <td>{inv.email}</td>
                      <td>{inv.tier}</td>
                      <td>{inv.seats}</td>
                      <td>IDR {new Intl.NumberFormat('id-ID').format(inv.amount)}</td>
                      <td>{new Date(inv.issuedAt).toLocaleDateString()}</td>
                      <td>{new Date(inv.dueAt).toLocaleDateString()}</td>
                      <td>
                        {inv.proofUrl ? (
                          (() => {
                            const href = inv.proofUrl.startsWith('/') ? `${API_BASE_URL}${inv.proofUrl}` : inv.proofUrl
                            return <a className="nav-link" style={{ padding: 0 }} href={href} target="_blank" rel="noreferrer">Lihat</a>
                          })()
                        ) : (
                          <span className="muted">-</span>
                        )}
                      </td>
                      <td>{inv.status}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          <a className="btn btn-outline" href={`/admin/payments/${inv.id}`}>Detail</a>
                        </div>
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
