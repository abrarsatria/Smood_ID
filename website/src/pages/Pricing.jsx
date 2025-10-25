import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { API_BASE_URL } from '../config/constants'

export default function Pricing() {
  const [rates, setRates] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const byTier = useMemo(() => {
    const m = {}
    for (const r of rates) m[String(r.tier).toLowerCase()] = r
    return m
  }, [rates])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const { data } = await axios.get(`${API_BASE_URL}/api/public/payment-rates`)
        if (!alive) return
        setRates(Array.isArray(data?.rates) ? data.rates : [])
      } catch (e) {
        if (alive) setError(e?.response?.data?.message || 'Gagal memuat pricing')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

  const fmt = (amt) => `IDR ${new Intl.NumberFormat('id-ID').format(amt || 0)}`

  return (
    <section className="section">
      <div className="container">
        <h1 className="section-title">Pricing</h1>
        <p className="section-subtitle">Pilih paket sesuai kebutuhan tim dan skala studio Anda.</p>

        {error && <div className="notification" style={{ background: '#ef4444', marginBottom: 12 }}>{error}</div>}
        {loading && <div className="notification" style={{ marginBottom: 12 }}>Memuat pricing...</div>}

        <div className="pricing-grid">
          <div className="pricing-card surface">
            <div className="pricing-header">
              <h3>Starter</h3>
              <div className="price">{byTier.starter ? fmt(byTier.starter.amountPerSeat) : '—'} <small>/ seat</small></div>
            </div>
            <div className="divider" />
            <ul className="pricing-features">
              <li><span className="check">✓</span> Maksimum 5 seat</li>
              <li><span className="check">✓</span> Basic tracking</li>
              <li><span className="check">✓</span> Email support</li>
            </ul>
            <button className="btn btn-outline">Mulai Trial</button>
          </div>

          <div className="pricing-card highlight">
            <div className="pricing-header">
              <h3>Pro</h3>
              <div className="price">{byTier.pro ? fmt(byTier.pro.amountPerSeat) : '—'} <small>/ seat</small></div>
            </div>
            <div className="divider" />
            <ul className="pricing-features">
              <li><span className="check">✓</span> Minimum 10 seat</li>
              <li><span className="check">✓</span> Advanced analytics</li>
              <li><span className="check">✓</span> Priority support</li>
              <li><span className="check">✓</span> Presentasi sinkron</li>
            </ul>
            <button className="btn btn-primary">Pilih Pro</button>
          </div>

          <div className="pricing-card surface">
            <div className="pricing-header">
              <h3>Enterprise</h3>
              <div className="price">{byTier.enterprise ? fmt(byTier.enterprise.amountPerSeat) : 'Hubungi'} <small>{byTier.enterprise ? '/ seat' : 'kami'}</small></div>
            </div>
            <div className="divider" />
            <ul className="pricing-features">
              <li><span className="check">✓</span> Minimum 30 seat</li>
              <li><span className="check">✓</span> Pengguna tanpa batas</li>
              <li><span className="check">✓</span> On-Prem / Cloud</li>
              <li><span className="check">✓</span> Dedicated support</li>
              <li><span className="check">✓</span> Integrasi kustom</li>
            </ul>
            <button className="btn btn-outline">Contact Sales</button>
          </div>
        </div>
      </div>
    </section>
  )
}
