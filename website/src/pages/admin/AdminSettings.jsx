import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { API_BASE_URL } from '../../config/constants'

export default function AdminSettings() {
  const [tab, setTab] = useState('payments')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [msg, setMsg] = useState(null)

  // payments state
  const [rates, setRates] = useState([
    { tier: 'starter', amountPerSeat: '', currency: 'IDR' },
    { tier: 'pro', amountPerSeat: '', currency: 'IDR' },
    { tier: 'enterprise', amountPerSeat: '', currency: 'IDR' },
  ])

  const rateMap = useMemo(() => {
    const m = {}
    for (const r of rates) { m[r.tier] = r }
    return m
  }, [rates])

  const loadRates = async () => {
    try {
      setLoading(true)
      setError(null)
      setMsg(null)
      const { data } = await axios.get(`${API_BASE_URL}/api/admin/payment-rates`)
      const list = Array.isArray(data?.rates) ? data.rates : []
      // normalize to ensure all tiers exist
      const tiers = ['starter', 'pro', 'enterprise']
      const merged = tiers.map((t) => {
        const x = list.find((r) => String(r.tier).toLowerCase() === t)
        return x ? { tier: t, amountPerSeat: x.amountPerSeat, currency: x.currency || 'IDR' } : { tier: t, amountPerSeat: '', currency: 'IDR' }
      })
      setRates(merged)
    } catch (e) {
      setError(e?.response?.data?.message || 'Gagal mengambil payment rates')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (tab === 'payments') {
      loadRates()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  const updateRateField = (tier, field, value) => {
    setRates((prev) => prev.map((r) => r.tier === tier ? { ...r, [field]: field === 'amountPerSeat' ? Number(value) || 0 : value } : r))
  }

  const saveRates = async () => {
    try {
      setLoading(true)
      setError(null)
      setMsg(null)
      // validate minimal
      const payload = { rates: rates.map((r) => ({ tier: r.tier, amountPerSeat: Number(r.amountPerSeat) || 0, currency: r.currency || 'IDR' })) }
      const { data } = await axios.patch(`${API_BASE_URL}/api/admin/payment-rates`, payload)
      setMsg('Rates berhasil disimpan')
      const list = Array.isArray(data?.rates) ? data.rates : []
      const update = rates.map((r) => {
        const x = list.find((i) => i.tier === r.tier)
        return x ? { tier: r.tier, amountPerSeat: x.amountPerSeat, currency: x.currency || 'IDR' } : r
      })
      setRates(update)
    } catch (e) {
      setError(e?.response?.data?.message || 'Gagal menyimpan rates')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="section">
      <div className="container">
        <h1 className="section-title">Admin • Settings</h1>
        <p className="section-subtitle">Konfigurasi sistem.</p>

        <div className="surface" style={{ padding: 24 }}>
          {error && <div className="notification" style={{ background: '#ef4444', marginBottom: 12 }}>{error}</div>}
          {msg && <div className="notification" style={{ marginBottom: 12 }}>{msg}</div>}
          {loading && <div className="notification" style={{ marginBottom: 12 }}>Memuat...</div>}

          <div className="features-grid" style={{ marginBottom: 12 }}>
            <button className={`btn ${tab === 'payments' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('payments')}>Payments</button>
            {/* Future tabs
            <button className={`btn ${tab === 'general' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('general')}>General</button>
            */}
          </div>

          {tab === 'payments' && (
            <div>
              <h3 style={{ marginTop: 0 }}>Rates (per seat)</h3>
              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th align="left">Tier</th>
                      <th align="left">Amount/Seat</th>
                      <th align="left">Currency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rates.map((r) => (
                      <tr key={r.tier}>
                        <td style={{ textTransform: 'capitalize' }}>{r.tier}</td>
                        <td>
                          <input type="number" min={0} className="form-control" value={r.amountPerSeat} onChange={(e) => updateRateField(r.tier, 'amountPerSeat', e.target.value)} />
                        </td>
                        <td>
                          <input type="text" className="form-control" value={r.currency} onChange={(e) => updateRateField(r.tier, 'currency', e.target.value)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="button-group" style={{ marginTop: 12 }}>
                <button className="form-btn form-btn-primary" onClick={saveRates} disabled={loading}>Simpan</button>
                <button className="form-btn" onClick={loadRates} disabled={loading}>Reset</button>
              </div>

              <div className="quote" style={{ marginTop: 12 }}>
                Rate ini akan digunakan saat client mengajukan upgrade untuk menghitung nilai invoice secara otomatis.
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
