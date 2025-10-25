import React, { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import axios from 'axios'
import { API_BASE_URL } from '../config/constants'

export default function OAuthCallback() {
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState(null)

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const token = params.get('token')

    const handle = async () => {
      if (!token) {
        setError('Token tidak ditemukan')
        setTimeout(() => navigate('/login', { replace: true }), 1200)
        return
      }
      try {
        // Simpan token & set header untuk session berjalan
        localStorage.setItem('auth_token', token)
        axios.defaults.baseURL = API_BASE_URL
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`

        // Ambil profil user lalu simpan ke localStorage
        const me = await axios.get(`${API_BASE_URL}/api/auth/me`, { validateStatus: () => true })
        if (me?.status !== 200 || !me?.data?.user) {
          throw new Error('Gagal memuat profil user')
        }
        const user = me.data.user
        localStorage.setItem('auth_user', JSON.stringify(user))

        // Selalu arahkan ke client area (reload penuh agar AuthContext re-init dari localStorage)
        window.location.replace('/dashboard')
      } catch (e) {
        setError(e?.message || 'Autentikasi gagal')
        setTimeout(() => navigate('/login', { replace: true }), 1500)
      }
    }

    handle()
  }, [location.search, navigate])

  return (
    <section className="section">
      <div className="container">
        <h1 className="section-title">Memproses Login...</h1>
        {error ? (
          <div className="notification" style={{ background: '#ef4444' }}>{error}</div>
        ) : (
          <div className="notification">Mohon tunggu, sedang menyiapkan sesi Anda.</div>
        )}
      </div>
    </section>
  )
}
