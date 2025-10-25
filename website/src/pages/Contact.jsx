import React from 'react'

export default function Contact() {
  return (
    <section className="section">
      <div className="container">
        <div className="surface" style={{ padding: 16 }}>
          <h1 style={{ marginTop: 0 }}>Contact</h1>
          <p className="section-subtitle" style={{ marginTop: 4 }}>
            Butuh bantuan atau ingin berdiskusi kebutuhan studio Anda? Hubungi kami:
          </p>
          <ul className="pricing-features" style={{ marginTop: 12 }}>
            <li><strong>Email</strong>: support@smood.app</li>
            <li><strong>Phone</strong>: +62-812-0000-0000</li>
            <li><strong>Office</strong>: Jakarta, Indonesia</li>
          </ul>
        </div>
      </div>
    </section>
  )
}
