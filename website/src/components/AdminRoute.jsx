import React, { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import axios from 'axios'
import { API_BASE_URL } from '../config/constants'
import { useAuth } from '../context/AuthContext'

export default function AdminRoute({ children }) {
  const { isAuthenticated, isAdmin, loading } = useAuth()
  const location = useLocation()
  // Mulai dengan checking=true jika user sudah login tapi flag isAdmin belum true,
  // untuk mencegah redirect prematur ke dashboard sebelum ping admin selesai.
  const [checking, setChecking] = useState(() => isAuthenticated && !isAdmin)
  const [allow, setAllow] = useState(false)

  useEffect(() => {
    let alive = true
    const run = async () => {
      if (!isAuthenticated || isAdmin) {
        setChecking(false)
        setAllow(isAdmin)
        return
      }
      setChecking(true)
      try {
        const res = await axios.get(`${API_BASE_URL}/api/admin/ping`, { validateStatus: () => true })
        if (!alive) return
        setAllow(res?.status === 200 || res?.status === 304)
      } finally {
        if (alive) setChecking(false)
      }
    }
    run()
    return () => { alive = false }
  }, [isAuthenticated, isAdmin])

  if (loading || checking) {
    return (
      <section className="section">
        <div className="container">
          <div className="surface" style={{ padding: 24 }}>Memuat...</div>
        </div>
      </section>
    )
  }

  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />
  // Hanya redirect jika sudah selesai cek (checking=false) dan tidak diizinkan
  if (!checking && !isAdmin && !allow) return <Navigate to="/dashboard" replace />

  return children
}
