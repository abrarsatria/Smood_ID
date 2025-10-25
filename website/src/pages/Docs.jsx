import React from 'react'
import { API_BASE_URL } from '../config/constants'

export default function Docs() {
  return (
    <section className="section">
      <div className="container">
        <h1 className="section-title">Documentation / API</h1>
        <p className="section-subtitle">Referensi singkat endpoint public untuk integrasi.</p>

        <div className="two-col">
          <div className="surface" style={{ padding: 24 }}>
            <h3 style={{ marginTop: 0 }}>Base URL</h3>
            <div className="feature-card" style={{ marginTop: 8 }}>
              <div className="muted">API_BASE_URL</div>
              <div>{API_BASE_URL}</div>
            </div>

            <div className="divider" />

            <h3>Endpoints</h3>
            <ul className="pricing-features" style={{ marginTop: 8 }}>
              <li><span className="check">✓</span> GET <code>/health</code> — cek status backend</li>
              <li><span className="check">✓</span> POST <code>/api/auth/signup</code> — daftar akun</li>
              <li><span className="check">✓</span> POST <code>/api/auth/login</code> — login dengan email & password</li>
              <li><span className="check">✓</span> GET <code>/api/auth/me</code> — profil user (Bearer token)</li>
              <li><span className="check">✓</span> POST <code>/api/bookings</code> — booking demo</li>
            </ul>

            <div className="divider" />

            <h3>Autentikasi</h3>
            <div className="quote" style={{ marginTop: 8 }}>
              Gunakan header <code>Authorization: Bearer &lt;token&gt;</code> untuk endpoint yang dilindungi.
            </div>
          </div>

          <aside className="surface" style={{ padding: 24 }}>
            <h3 style={{ marginTop: 0 }}>Contoh cURL</h3>
            <pre className="feature-card" style={{ padding: 12, overflowX: 'auto' }}>
{`curl -X POST ${API_BASE_URL}/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"user@example.com","password":"secret"}'`}
            </pre>
          </aside>
        </div>
      </div>
    </section>
  )
}
