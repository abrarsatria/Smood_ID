import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { API_BASE_URL } from '../config/constants'

export default function ManageApps() {
  // State untuk data dari API (fallback ke placeholder awal)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionMsg, setActionMsg] = useState(null)
  const [installations, setInstallations] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [metrics, setMetrics] = useState({
    storageUsedGB: 0,
    storageQuotaGB: 30, // default kuota VPS
    users: 0,
    installsOnline: 0,
    installsTotal: 0,
    versions: [],
  })

  // Detail installation terpilih
  const [instance, setInstance] = useState({
    studioName: '',
    subdomain: '',
    endpointUrl: '',
    appStatus: '',
    bookingStatus: '',
    appVersion: '',
    plan: null,
    seats: null,
    licenseTier: null,
    licenseStatus: null,
    trialEndsAt: null,
    daysLeft: null,
  })
  const [users, setUsers] = useState([])
  // Backup state
  const [backups, setBackups] = useState([])
  const [backupsLoading, setBackupsLoading] = useState(false)
  const [uploadFile, setUploadFile] = useState(null)
  const [uploading, setUploading] = useState(false)

  const statusBg = (status) => {
    const s = String(status || '').toLowerCase()
    if (s === 'running' || s === 'active' || s === 'approved') return '#86efac' // green-300
    if (s === 'stopped' || s === 'rejected') return '#fecaca' // red-200
    if (s === 'pending' || s === 'provisioning') return '#fde68a' // amber-300
    if (s === 'trial') return '#bfdbfe' // blue-200
    return '#e5e7eb' // gray-200
  }
  const chip = (text, bg) => (
    <span style={{ background: bg || '#e5e7eb', color: '#f97316', padding: '2px 8px', borderRadius: 8, fontWeight: 600 }}>
      {text}
    </span>
  )

  // Load daftar installations + metrics + users
  useEffect(() => {
    let alive = true
    const fetchInit = async () => {
      try {
        setLoading(true)
        setError(null)
        const [listRes, metRes, usrRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/client/installations`),
          axios.get(`${API_BASE_URL}/api/client/metrics`),
          axios.get(`${API_BASE_URL}/api/client/users`),
        ])
        if (!alive) return
        setInstallations(Array.isArray(listRes?.data?.installations) ? listRes.data.installations : [])
        const met = metRes?.data || {}
        setMetrics((prev) => ({
          storageUsedGB: typeof met.storageUsedGB === 'number' ? met.storageUsedGB : prev.storageUsedGB,
          storageQuotaGB: typeof met.storageQuotaGB === 'number' ? met.storageQuotaGB : prev.storageQuotaGB,
          users: typeof met.users === 'number' ? met.users : prev.users,
          installsOnline: typeof met.installsOnline === 'number' ? met.installsOnline : prev.installsOnline,
          installsTotal: typeof met.installsTotal === 'number' ? met.installsTotal : prev.installsTotal,
          versions: Array.isArray(met.versions) ? met.versions : prev.versions,
        }))
        const u = usrRes?.data?.users || []
        setUsers(Array.isArray(u) ? u : [])
      } catch (e) {
        if (!alive) return
        setError(e?.response?.data?.message || 'Gagal memuat data Manage Apps')
      } finally {
        if (alive) setLoading(false)
      }
    }
    fetchInit()
    return () => { alive = false }
  }, [])

  // Load detail installation saat dipilih
  useEffect(() => {
    let alive = true
    const fetchDetail = async () => {
      if (!selectedId) return
      try {
        setActionMsg(null)
        const { data } = await axios.get(`${API_BASE_URL}/api/client/installations/${selectedId}`)
        if (!alive) return
        const inst = data?.installation || {}
        setInstance((prev) => ({
          studioName: inst.instanceName ?? prev.studioName,
          subdomain: inst.subdomain ?? prev.subdomain,
          endpointUrl: inst.endpointUrl ?? prev.endpointUrl,
          appStatus: inst.appStatus ?? prev.appStatus,
          bookingStatus: inst.bookingStatus ?? prev.bookingStatus,
          appVersion: inst.appVersion ?? prev.appVersion,
          plan: inst.licenseTier ?? prev.plan,
          seats: inst.seats ?? prev.seats,
          licenseTier: inst.licenseTier ?? prev.licenseTier,
          licenseStatus: inst.licenseStatus ?? prev.licenseStatus,
          trialEndsAt: prev.trialEndsAt,
          daysLeft: prev.daysLeft,
        }))
        // Muat users untuk instalasi terpilih
        try {
          const u = await axios.get(`${API_BASE_URL}/api/client/users`, { params: { installationId: selectedId } })
          if (!alive) return
          const arr = Array.isArray(u?.data?.users) ? u.data.users : []
          setUsers(arr)
        } catch (_) {}
      } catch (e) {
        if (!alive) return
        setError(e?.response?.data?.message || 'Gagal memuat detail instalasi')
      }
    }
    const fetchBackups = async () => {
      if (!selectedId) return
      try {
        setBackupsLoading(true)
        const { data } = await axios.get(`${API_BASE_URL}/api/client/installations/${selectedId}/backups`)
        if (!alive) return
        setBackups(Array.isArray(data?.backups) ? data.backups : [])
      } catch (_) {
      } finally {
        if (alive) setBackupsLoading(false)
      }
    }
    fetchDetail()
    fetchBackups()
    return () => { alive = false }
  }, [selectedId])

  const storagePct = metrics.storageQuotaGB > 0
    ? Math.round((metrics.storageUsedGB / metrics.storageQuotaGB) * 100)
    : 0

  const onSelectUpload = async (e) => {
    try {
      const f = e.target.files?.[0]
      if (!f) return
      setUploadFile(f)
    } catch (_) {}
  }

  const doUpload = async () => {
    try {
      if (!selectedId || !uploadFile) return
      setUploading(true)
      const arrBuf = await uploadFile.arrayBuffer()
      const b64 = btoa(String.fromCharCode(...new Uint8Array(arrBuf)))
      const payload = { fileBase64: `data:application/octet-stream;base64,${b64}`, filename: uploadFile.name }
      const { data } = await axios.post(`${API_BASE_URL}/api/client/installations/${selectedId}/backups/upload`, payload)
      setActionMsg(`Upload selesai: ${data?.file?.fileName || uploadFile.name}`)
      setUploadFile(null)
      // refresh backups
      const b = await axios.get(`${API_BASE_URL}/api/client/installations/${selectedId}/backups`)
      setBackups(Array.isArray(b?.data?.backups) ? b.data.backups : [])
    } catch (e) {
      const msg = e?.response?.data?.message || 'Gagal upload backup'
      const detail = e?.response?.data?.error
      setActionMsg(detail ? `${msg}: ${detail}` : msg)
    } finally {
      setUploading(false)
    }
  }

  const createBackup = async () => {
    try {
      if (!selectedId) return
      setActionMsg(null)
      const { data } = await axios.post(`${API_BASE_URL}/api/client/installations/${selectedId}/backup`)
      setActionMsg(`Backup dibuat: ${data?.file?.fileName || 'berkas'}`)
      const b = await axios.get(`${API_BASE_URL}/api/client/installations/${selectedId}/backups`)
      setBackups(Array.isArray(b?.data?.backups) ? b.data.backups : [])
    } catch (e) {
      const msg = e?.response?.data?.message || 'Gagal membuat backup'
      const detail = e?.response?.data?.error
      setActionMsg(detail ? `${msg}: ${detail}` : msg)
    }
  }

  const restoreFromFile = async (fileName) => {
    try {
      if (!selectedId || !fileName) return
      if (!confirm(`Restore database dari backup ${fileName}? Disarankan menghentikan aplikasi terlebih dahulu.`)) return
      setActionMsg(null)
      await axios.post(`${API_BASE_URL}/api/client/installations/${selectedId}/restore`, { fileName })
      setActionMsg(`Restore dari ${fileName} selesai`)
    } catch (e) {
      const msg = e?.response?.data?.message || 'Gagal restore backup'
      const detail = e?.response?.data?.error
      setActionMsg(detail ? `${msg}: ${detail}` : msg)
    }
  }

  const downloadBackup = async (fileName) => {
    try {
      if (!selectedId || !fileName) return
      setActionMsg(null)
      const resp = await axios.get(`${API_BASE_URL}/api/client/installations/${selectedId}/backups/${encodeURIComponent(fileName)}/download`, { responseType: 'blob' })
      const blob = new Blob([resp.data], { type: 'application/octet-stream' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (e) {
      const msg = e?.response?.data?.message || 'Gagal mengunduh backup'
      const detail = e?.response?.data?.error
      setActionMsg(detail ? `${msg}: ${detail}` : msg)
    }
  }

  return (
    <section className="section">
      <div className="container">
        <h1 className="section-title">Manage Apps</h1>
        <p className="section-subtitle">Kelola instalasi aplikasi, lisensi, dan konfigurasi.</p>

        {/* Daftar Installations */}
        <h3 className="section-subtitle" style={{ marginTop: 0 }}>Instalasi Saya</h3>
        {installations.length === 0 ? (
          <div className="surface" style={{ padding: 16, marginBottom: 12 }}>
            <div className="quote">Belum ada instalasi tertaut atau booking.</div>
          </div>
        ) : (
          <div className="surface" style={{ padding: 16, marginBottom: 12 }}>
            <div className="features-grid">
              {installations.map((it) => (
                <div key={it.id} className="feature-card" style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{it.instanceName || '—'}</div>
                    <div className="muted" style={{ marginTop: 4 }}>{it.endpointUrl || '—'}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-outline" onClick={() => setSelectedId(it.id)}>Detail</button>
                    {it.endpointUrl && <a className="btn" href={it.endpointUrl} target="_blank" rel="noreferrer">Open</a>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="surface" style={{ padding: 24 }}>
          {error && (
            <div className="notification" style={{ background: '#ef4444', marginBottom: 12 }}>{error}</div>
          )}
          {loading && (
            <div className="notification" style={{ marginBottom: 12 }}>Memuat data...</div>
          )}
          {actionMsg && (
            <div className="notification" style={{ marginBottom: 12 }}>{actionMsg}</div>
          )}
          {/* Masa Tenggat Banner */}
          {selectedId && instance.licenseTier === 'trial' && (
            <div className="notification" style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <strong>Masa tenggat</strong>{' '}
                  {typeof instance.daysLeft === 'number' && (
                    <>
                      — sisa {instance.daysLeft} hari{instance.trialEndsAt ? ` (berakhir ${new Date(instance.trialEndsAt).toLocaleDateString()})` : ''}
                    </>
                  )}
                </div>
                <a href="/client/payment" className="btn btn-primary">Upgrade License</a>
              </div>
            </div>
          )}
          {/* Detail Instansi Terpilih */}
          {selectedId ? (
            <>
              <h3 style={{ marginTop: 0 }}>Detail Instalasi</h3>
              <div className="features-grid" style={{ marginTop: 8 }}>
                <div className="feature-card">
                  <div className="muted">Nama Aplikasi</div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{instance.studioName}</div>
                </div>
                <div className="feature-card">
                  <div className="muted">Endpoint</div>
                  <div>
                    {instance.endpointUrl ? (
                      <a href={instance.endpointUrl} className="nav-link" style={{ padding: 0 }} target="_blank" rel="noreferrer">{instance.endpointUrl}</a>
                    ) : (
                      <span className="muted">-</span>
                    )}
                  </div>
                </div>
                <div className="feature-card">
                  <div className="muted">Status Aplikasi</div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{chip(instance.appStatus || '-', statusBg(instance.appStatus))}</div>
                </div>
                <div className="feature-card">
                  <div className="muted">Status Booking</div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{chip(instance.bookingStatus || '-', statusBg(instance.bookingStatus))}</div>
                </div>
                <div className="feature-card">
                  <div className="muted">Plan / Seats</div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{instance.plan} • {instance.seats}</div>
                </div>
              </div>
            </>
          ) : (
            <div className="quote">Pilih salah satu instalasi untuk melihat detail.</div>
          )}

          {selectedId && (
            <>
              <div className="divider" />

              {/* Metrik Utama */}
              <h3 style={{ marginTop: 0 }}>Metrik Utama</h3>
              <div className="features-grid" style={{ marginTop: 8 }}>
                <div className="feature-card">
                  <div className="muted">Penyimpanan Terpakai</div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{metrics.storageUsedGB.toFixed(1)} GB</div>
                  <div className="muted">Dari {metrics.storageQuotaGB} GB • {storagePct}%</div>
                </div>
                <div className="feature-card">
                  <div className="muted">Jumlah User</div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{users.length}</div>
                  <div className="muted">Aktif</div>
                </div>
                <div className="feature-card">
                  <div className="muted">Instalasi Online</div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{metrics.installsOnline}/{metrics.installsTotal}</div>
                  <div className="muted">Heartbeat {'<'} 5 menit</div>
                </div>
                <div className="feature-card">
                  <div className="muted">Versi Aplikasi</div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>
                    {instance.appVersion || '-'}
                  </div>
                  <div className="muted">Versi untuk instalasi ini</div>
                </div>
              </div>

              <div className="divider" />

              {/* Penyimpanan */}
              <h3>Penyimpanan</h3>
              <div className="grid-container" style={{ marginTop: 8 }}>
                <div className="feature-card">
                  <div className="muted">Total</div>
                  <div>{metrics.storageQuotaGB} GB</div>
                </div>
                <div className="feature-card">
                  <div className="muted">Terpakai</div>
                  <div>{metrics.storageUsedGB.toFixed(1)} GB ({storagePct}%)</div>
                </div>
                <div className="feature-card">
                  <div className="muted">Sisa</div>
                  <div>{(metrics.storageQuotaGB - metrics.storageUsedGB).toFixed(1)} GB</div>
                </div>
              </div>

              <div className="divider" />

              {/* Pengguna */}
              <h3>Pengguna</h3>
              <div className="grid-container" style={{ marginTop: 8 }}>
                <div className="feature-card">
                  <div className="muted">Total User</div>
                  <div>{users.length}</div>
                </div>
              </div>

              {/* Daftar Pengguna Detail */}
              <h4 style={{ marginTop: 12 }}>Daftar Pengguna</h4>
              {users.length === 0 ? (
                <div className="quote" style={{ marginTop: 8 }}>Belum ada data pengguna.</div>
              ) : (
                <div className="features-grid" style={{ marginTop: 8 }}>
                  {users.map((u) => (
                    <div key={u.id} className="feature-card">
                      <div style={{ fontWeight: 700 }}>{u.username}</div>
                      <div className="muted" style={{ marginTop: 6 }}>{u.email}</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {selectedId && (
            <>
              <div className="divider" />
              {/* Backup & Restore untuk instalasi terpilih */}
              <h3>Backup & Restore</h3>
              <div className="quote" style={{ marginTop: 8 }}>
                Disarankan menghentikan aplikasi terlebih dahulu sebelum restore, lalu jalankan kembali setelah selesai.
              </div>
              <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <button className="btn" onClick={createBackup} disabled={backupsLoading}>Buat Backup</button>
                <button className="btn btn-outline" onClick={async () => {
                  setBackupsLoading(true)
                  try {
                    const { data } = await axios.get(`${API_BASE_URL}/api/client/installations/${selectedId}/backups`)
                    setBackups(Array.isArray(data?.backups) ? data.backups : [])
                  } finally { setBackupsLoading(false) }
                }}>Refresh</button>
              </div>

              <div className="surface" style={{ padding: 16, marginTop: 12 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
                  <input type="file" accept=".dump" onChange={onSelectUpload} />
                  <button className="btn" disabled={!uploadFile || uploading} onClick={doUpload}>{uploading ? 'Uploading…' : 'Upload Backup'}</button>
                  {uploadFile && <span className="muted">{uploadFile.name}</span>}
                </div>

                {backupsLoading ? (
                  <div className="notification">Memuat daftar backup…</div>
                ) : backups.length === 0 ? (
                  <div className="quote">Belum ada backup.</div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th align="left">File</th>
                          <th align="left">Ukuran</th>
                          <th align="left">Diubah</th>
                          <th align="left">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {backups.map((b) => (
                          <tr key={b.fileName}>
                            <td>
                              {b.url ? (
                                <a href={b.url} className="nav-link" style={{ padding: 0 }} target="_blank" rel="noreferrer">{b.fileName}</a>
                              ) : (
                                b.fileName
                              )}
                            </td>
                            <td>{typeof b.size === 'number' ? `${(b.size / (1024 * 1024)).toFixed(2)} MB` : '-'}</td>
                            <td>{b.modifiedAt ? new Date(b.modifiedAt).toLocaleString() : '-'}</td>
                            <td>
                              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                <button className="btn btn-outline" onClick={() => restoreFromFile(b.fileName)}>Restore</button>
                                <button className="btn" onClick={() => downloadBackup(b.fileName)}>Download</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

        </div>
      </div>
    </section>
  )
}
