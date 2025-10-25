import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { API_BASE_URL } from '../config/constants'

export default function Payment() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [instance, setInstance] = useState({ plan: null, seats: null, licenseTier: null, licenseStatus: null, trialEndsAt: null, daysLeft: null })
  const [req, setReq] = useState({ tier: 'starter', seats: 5, note: '' })
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const [invoices, setInvoices] = useState([])
  const [invLoading, setInvLoading] = useState(false)

  const minByTier = { pro: 10, enterprise: 30 }
  const maxByTier = { starter: 5 }
  const minSeat = minByTier[req.tier] || 1
  const maxSeat = maxByTier[req.tier] || null

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const { data } = await axios.get(`${API_BASE_URL}/api/client/instance`)
        if (!alive) return
        setInstance({
          plan: data?.plan ?? null,
          seats: data?.seats ?? null,
          licenseTier: data?.licenseTier ?? null,
          licenseStatus: data?.licenseStatus ?? null,
          trialEndsAt: data?.trialEndsAt ?? null,
          daysLeft: typeof data?.daysLeft === 'number' ? data.daysLeft : null,
        })
        // load invoices
        setInvLoading(true)
        try {
          const invRes = await axios.get(`${API_BASE_URL}/api/client/payment/invoices`)
          if (alive) setInvoices(invRes?.data?.invoices || [])
        } finally {
          if (alive) setInvLoading(false)
        }
      } catch (e) {
        if (!alive) return
        setError(e?.response?.data?.message || 'Gagal memuat status langganan')
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => { alive = false }
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setReq((p) => {
      if (name === 'seats') {
        let v = Number(value)
        if (!Number.isFinite(v) || v <= 0) v = 1
        const minT = minByTier[p.tier] || 1
        const maxT = maxByTier[p.tier] || null
        if (v < minT) v = minT
        if (maxT && v > maxT) v = maxT
        return { ...p, seats: v }
      }
      if (name === 'tier') {
        const nextTier = value
        const minT = minByTier[nextTier] || 1
        const maxT = maxByTier[nextTier] || null
        let nextSeats = p.seats || minT
        if (nextSeats < minT) nextSeats = minT
        if (maxT && nextSeats > maxT) nextSeats = maxT
        return { ...p, tier: nextTier, seats: nextSeats }
      }
      return { ...p, [name]: value }
    })
  }

  const submitUpgrade = async (e) => {
    e.preventDefault()
    try {
      setSubmitting(true)
      setError(null)
      setResult(null)
      // client-side validation seats (starter = max 5; lainnya = min sesuai tier)
      const seatCount = Number(req.seats) || 0
      const maxT = maxByTier[req.tier] || null
      const minT = minByTier[req.tier] || 1
      if (maxT && seatCount > maxT) {
        setError(`Maksimum seats untuk paket ${req.tier} adalah ${maxT}`)
        setSubmitting(false)
        return
      }
      if (!maxT && seatCount < minT) {
        setError(`Minimum seats untuk paket ${req.tier} adalah ${minT}`)
        setSubmitting(false)
        return
      }
      const payload = { tier: req.tier, seats: Number(req.seats) || 1, note: req.note }
      const { data } = await axios.post(`${API_BASE_URL}/api/client/payment/upgrade-request`, payload)
      setResult(`Permintaan upgrade dikirim. Ticket ID: ${data.id}${data.invoiceNumber ? ` — Invoice: ${data.invoiceNumber}` : ''}`)
      // refresh invoices
      const invRes = await axios.get(`${API_BASE_URL}/api/client/payment/invoices`)
      setInvoices(invRes?.data?.invoices || [])
    } catch (e) {
      setError(e?.response?.data?.message || 'Gagal mengirim permintaan upgrade')
    } finally {
      setSubmitting(false)
    }
  }

  // Konfirmasi pembayaran hanya dilakukan oleh admin dari halaman Admin Payments

  return (
    <section className="section">
      <div className="container">
        <h1 className="section-title">Payment & Billing</h1>
        <p className="section-subtitle">Kelola langganan dan ajukan upgrade lisensi.</p>

        <div className="two-col">
          <div className="surface" style={{ padding: 24 }}>
            {error && <div className="notification" style={{ background: '#ef4444', marginBottom: 12 }}>{error}</div>}
            {loading && <div className="notification" style={{ marginBottom: 12 }}>Memuat data...</div>}

            <h3 style={{ marginTop: 0 }}>Status Langganan</h3>
            <div className="features-grid" style={{ marginTop: 8 }}>
              <div className="feature-card">
                <div className="muted">Paket Saat Ini</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{instance.plan || '-'}</div>
              </div>
              <div className="feature-card">
                <div className="muted">Seats</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{instance.seats ?? '-'}</div>
              </div>
              <div className="feature-card">
                <div className="muted">License Tier</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{instance.licenseTier || '-'}</div>
              </div>
              <div className="feature-card">
                <div className="muted">Status Lisensi</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{instance.licenseStatus || '-'}</div>
              </div>
            </div>

            {/* Masa Tenggat (Trial) */}
            {instance.licenseTier === 'trial' && (
              <div className="notification" style={{ marginTop: 12, marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <strong>Masa tenggat</strong>{' '}
                    {typeof instance.daysLeft === 'number' && (
                      <>
                        — sisa {instance.daysLeft} hari{instance.trialEndsAt ? ` (berakhir ${new Date(instance.trialEndsAt).toLocaleDateString()})` : ''}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Masa Aktif (Non-trial) */}
            {instance.licenseTier && instance.licenseTier !== 'trial' && instance.trialEndsAt && (
              <div className="notification" style={{ marginTop: 12, marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <strong>Masa aktif</strong>{' '}
                    {typeof instance.daysLeft === 'number' && (
                      <>
                        — sisa {instance.daysLeft} hari (berakhir {new Date(instance.trialEndsAt).toLocaleDateString()})
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="divider" />

            <h3>Ajukan Upgrade</h3>
            {result && <div className="notification" style={{ marginBottom: 12 }}>{result}</div>}
            <form onSubmit={submitUpgrade} className="modal-form" style={{ position: 'relative', boxShadow: 'none', border: 'none', padding: 0 }}>
              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label htmlFor="tier">Pilih Paket</label>
                  <select id="tier" name="tier" className="form-control" value={req.tier} onChange={handleChange}>
                    <option value="starter">Starter</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label htmlFor="seats">Jumlah Seat</label>
                  <input id="seats" type="number" name="seats" className="form-control" min={minSeat} max={maxSeat || undefined} value={req.seats} onChange={handleChange} />
                  {maxSeat ? (
                    <div className="muted" style={{ marginTop: 4 }}>Maksimum {maxSeat} seat untuk paket {req.tier}</div>
                  ) : (
                    <div className="muted" style={{ marginTop: 4 }}>Minimum {minSeat} seat untuk paket {req.tier}</div>
                  )}
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="note">Catatan</label>
                <textarea id="note" name="note" className="form-control" rows={3} value={req.note} onChange={handleChange} placeholder="Catatan tambahan (opsional)" />
              </div>
              <div className="button-group">
                <button type="submit" className="form-btn form-btn-primary" disabled={submitting}>
                  {submitting ? 'Mengirim...' : 'Kirim Permintaan Upgrade'}
                </button>
              </div>
            </form>

            <div className="divider" />

            <h3>Invoice Anda</h3>
            {invLoading ? (
              <div className="notification" style={{ marginBottom: 12 }}>Memuat invoice...</div>
            ) : invoices.length === 0 ? (
              <div className="quote">Belum ada invoice.</div>
            ) : (
              <div className="features-grid" style={{ marginTop: 8 }}>
                {invoices.map((inv) => (
                  <div key={inv.id} className="feature-card" style={{ alignItems: 'flex-start' }}>
                    <div className="muted"><a className="nav-link" style={{ padding: 0 }} href={`/client/payment/invoices/${inv.id}`}>{inv.number}</a></div>
                    <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>IDR {new Intl.NumberFormat('id-ID').format(inv.amount)}</div>
                    <div className="muted" style={{ marginTop: 4 }}>Paket: {inv.tier} • Seats: {inv.seats}</div>
                    <div className="muted" style={{ marginTop: 4 }}>Jatuh tempo: {new Date(inv.dueAt).toLocaleDateString()}</div>
                    <div className="muted" style={{ marginTop: 4 }}>Status: {inv.status}</div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                      <a className="btn btn-outline" href={`/client/payment/invoices/${inv.id}`}>Lihat Detail</a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <aside className="surface" style={{ padding: 24 }}>
            <h3 style={{ marginTop: 0 }}>Informasi</h3>
            <div className="quote" style={{ marginTop: 8 }}>
              Setelah permintaan upgrade dikirim, administrator akan menerbitkan invoice dan mengonfirmasi pembayaran. Status lisensi Anda akan diperbarui otomatis setelah dikonfirmasi.
            </div>
          </aside>
        </div>
      </div>
    </section>
  )
}
