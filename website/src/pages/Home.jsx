import React from 'react'
import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="hero">
        <div className="hero-gradient" />
        <div className="container hero-inner">
          <div>
            <p className="kicker">VFX Studio Workflow</p>
            <h1 className="hero-title">Kelola Produksi VFX Lebih Cepat, Rapi, dan Terukur</h1>
            <p className="hero-subtitle">SMOOD menyatukan project tracking, asset, shot, review, presentasi, dan kolaborasi tim dalam satu platform yang mudah dipakai.</p>
            <div className="hero-actions">
              <Link to="/booking" className="btn btn-primary">Booking Demo</Link>
              <Link to="/features" className="btn btn-outline">Lihat Fitur</Link>
            </div>
            <div className="hero-badges">
              <span className="badge">Realtime Review</span>
              <span className="badge">Project Analytics</span>
              <span className="badge">On-Prem / Cloud</span>
            </div>
          </div>
          <div>
            <video
              className="hero-image"
              src="/images/app-hero-demo.mov"
              poster="/images/app-hero-poster.png"
              autoPlay
              loop
              muted
              playsInline
              aria-label="Demo SMOOD"
              style={{ objectFit: 'cover' }}
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="section">
        <div className="container">
          <h2 className="section-title">Fitur yang Membantu Studio Berkembang</h2>
          <p className="section-subtitle">Didesain untuk pipeline VFX modern dengan fokus ke produktivitas dan kualitas.</p>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Project Tracking</h3>
              <p>Pemetaan sequence, shot, dan task dengan status, due date, dan progres real-time.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📦</div>
              <h3>Asset Management</h3>
              <p>Kelola aset, versi, dan preview terpusat agar alur kerja tetap konsisten.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🎬</div>
              <h3>Review & Present</h3>
              <p>Ruang presentasi sinkron dengan komentar, anotasi, dan histori untuk persetujuan cepat.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">⚙️</div>
              <h3>Scheduling</h3>
              <p>Rencanakan penugasan tim dan jadwal produksi guna meminimalkan bottleneck.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
