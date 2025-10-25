import React from 'react'

export default function Features() {
  return (
    <section className="section">
      <div className="container">
        <h1 className="section-title">Fitur Utama</h1>
        <p className="section-subtitle">Semua yang Anda butuhkan untuk mengelola pipeline VFX dari awal hingga delivery.</p>

        {/* Ringkas */}
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Project Tracking</h3>
            <p>Sequence, shot, dan task dengan status, SLA, due date, dan progres real-time.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📦</div>
            <h3>Asset Management</h3>
            <p>Repositori aset terpusat, versi terkelola, dan preview untuk review cepat.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🎬</div>
            <h3>Review & Present</h3>
            <p>Presentasi sinkron dengan komentar, anotasi, dan riwayat perubahan.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📅</div>
            <h3>Scheduling</h3>
            <p>Perencanaan kapasitas dan penugasan untuk menghindari bottleneck produksi.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">💬</div>
            <h3>Messaging</h3>
            <p>Komunikasi tim terintegrasi pada konteks shot/task untuk koordinasi cepat.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📈</div>
            <h3>Analytics</h3>
            <p>Ringkasan kinerja proyek dan tim untuk pengambilan keputusan yang lebih baik.</p>
          </div>
        </div>

        {/* Detail dari aplikasi utama */}
        <div className="surface" style={{ padding: 16, marginTop: 24 }}>
          <h2 style={{ marginTop: 0 }}>Detail Kapabilitas</h2>
          <div className="two-col">
            <div>
              <h3>Manajemen Proyek</h3>
              <ul className="pricing-features">
                <li><span className="check">✓</span> Projects, Sequences, Shots, Assets, Tasks dengan overview per entitas.</li>
                <li><span className="check">✓</span> Status & progress tracking untuk sequence/shot/task.</li>
                <li><span className="check">✓</span> Task List, Card View, dan Gantt untuk penjadwalan.</li>
              </ul>
              <h3>Scheduling & Gantt</h3>
              <ul className="pricing-features">
                <li><span className="check">✓</span> Gantt interaktif (zoom, drag, resize, tooltip).</li>
                <li><span className="check">✓</span> Filter status/priority, assignee, tanggal, relasi shot/asset.</li>
                <li><span className="check">✓</span> Export PDF/PNG/Excel.</li>
              </ul>
              <h3>Presentation & Review</h3>
              <ul className="pricing-features">
                <li><span className="check">✓</span> PresentPanel & Presentation Room Viewer (sinkron, time-coded comment).</li>
                <li><span className="check">✓</span> Anotasi kanvas per frame, laser pointer, broadcast room (open/close/end).</li>
                <li><span className="check">✓</span> Client Approval dengan riwayat.</li>
              </ul>
              <h3>Messaging</h3>
              <ul className="pricing-features">
                <li><span className="check">✓</span> Chat personal & grup, pin, likes (emoji), typing indicator.</li>
                <li><span className="check">✓</span> Thread messages dengan pinned & like per thread.</li>
                <li><span className="check">✓</span> Link ke item proyek (sequence/shot/asset/task) langsung dari chat.</li>
              </ul>
            </div>
            <div>
              <h3>Reports & Analytics</h3>
              <ul className="pricing-features">
                <li><span className="check">✓</span> Project Analytics (status distribution, department progress, user productivity).</li>
                <li><span className="check">✓</span> Timeline prediction, overdue trend, resource utilization, risk assessment.</li>
                <li><span className="check">✓</span> Perbandingan antar proyek dan export CSV.</li>
              </ul>
              <h3>Plans & Kalender</h3>
              <ul className="pricing-features">
                <li><span className="check">✓</span> Rencana per project (Calendar/List), attendees, organizer.</li>
                <li><span className="check">✓</span> Integrasi broadcast presentasi ke plan.</li>
              </ul>
              <h3>Storage Management</h3>
              <ul className="pricing-features">
                <li><span className="check">✓</span> Explorer uploads dengan preview image/video/PDF.</li>
                <li><span className="check">✓</span> Kategori storage, komentar per file, download, delete.</li>
              </ul>
              <h3>Admin & Tools</h3>
              <ul className="pricing-features">
                <li><span className="check">✓</span> Role & Pages access, User Manager, Documents & Spreadsheets editor.</li>
                <li><span className="check">✓</span> Render Farm/Storage settings, Issue Tracking, Hashtag analytics.</li>
              </ul>
            </div>
          </div>
          <div className="quote" style={{ marginTop: 16 }}>
            Fitur di atas diambil dari aplikasi utama untuk memastikan konsistensi alur kerja studio: tracking → produksi → review → delivery.
          </div>
        </div>

        {/* Cuplikan Antarmuka */}
        <h2 className="section-title" style={{ marginTop: 28 }}>Cuplikan Antarmuka</h2>
        <p className="section-subtitle">Beberapa layar utama dari SMOOD untuk gambaran cepat alur kerja.</p>
        <div className="features-grid">
          <div className="feature-card">
            <img src="/images/app-shot-1.png" alt="Tangkapan layar SMOOD 1" style={{ width: '100%', display: 'block', borderRadius: 8 }} />
            <div className="muted" style={{ marginTop: 8, fontSize: 13 }}>Overview Project & Tracking</div>
          </div>
          <div className="feature-card">
            <img src="/images/app-shot-2.png" alt="Tangkapan layar SMOOD 2" style={{ width: '100%', display: 'block', borderRadius: 8 }} />
            <div className="muted" style={{ marginTop: 8, fontSize: 13 }}>Presentasi & Review</div>
          </div>
        </div>
      </div>
    </section>
  )
}
