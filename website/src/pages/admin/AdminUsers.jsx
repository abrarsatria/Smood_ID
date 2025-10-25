import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { API_BASE_URL } from '../../config/constants'

export default function AdminUsers() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [rows, setRows] = useState([])

  useEffect(() => {
    let alive = true
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        const { data } = await axios.get(`${API_BASE_URL}/api/admin/users`)
        if (!alive) return
        setRows(Array.isArray(data?.users) ? data.users : [])
      } catch (e) {
        if (!alive) return
        setError(e?.response?.data?.message || 'Gagal memuat users')
      } finally {
        if (alive) setLoading(false)
      }
    }
    fetchData()
    return () => { alive = false }
  }, [])

  return (
    <section className="section">
      <div className="container">
        <h1 className="section-title">Admin • Users</h1>
        <p className="section-subtitle">Daftar pengguna yang terdaftar di sistem.</p>

        <div className="surface" style={{ padding: 24 }}>
          {error && <div className="notification" style={{ background: '#ef4444', marginBottom: 12 }}>{error}</div>}
          {loading && <div className="notification" style={{ marginBottom: 12 }}>Memuat data...</div>}

          <div className="features-grid">
            {rows.map((u) => (
              <div key={u.id} className="feature-card">
                <div style={{ fontWeight: 700 }}>{u.name}</div>
                <div className="muted" style={{ marginTop: 6 }}>{u.email}</div>
                <div className="muted" style={{ marginTop: 6 }}>Dibuat: {new Date(u.createdAt).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
