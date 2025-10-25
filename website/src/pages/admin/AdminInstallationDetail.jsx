import React, { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { API_BASE_URL } from '../../config/constants'

export default function AdminInstallationDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [it, setIt] = useState(null)
  const [bookings, setBookings] = useState([])
  const [selectedBookingId, setSelectedBookingId] = useState('')
  const [actionMsg, setActionMsg] = useState(null)
  const [editLink, setEditLink] = useState(false)
  const [appStatus, setAppStatus] = useState('provisioning')
  const [licenseTier, setLicenseTier] = useState('starter')
  const [seatsValue, setSeatsValue] = useState('')
  const [backups, setBackups] = useState([])
  const [backupsLoading, setBackupsLoading] = useState(false)
  const [sourceInstallId, setSourceInstallId] = useState('')
  const [restoreFileName, setRestoreFileName] = useState('')
  const [prereq, setPrereq] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadFile, setUploadFile] = useState(null)

  const statusBg = (status) => {
    const s = String(status || '').toLowerCase()
    if (s === 'running' || s === 'active' || s === 'approved') return '#86efac' // green-300
    if (s === 'stopped' || s === 'rejected') return '#fecaca' // red-200
    if (s === 'pending' || s === 'provisioning') return '#fde68a' // amber-300
    if (s === 'trial') return '#bfdbfe' // blue-200
    return '#e5e7eb' // gray-200
  }

  const downloadBackup = async (fileName) => {
    try {
      if (!fileName) return
      setActionMsg(null)
      const resp = await axios.get(`${API_BASE_URL}/api/admin/installations/${id}/backups/${encodeURIComponent(fileName)}/download`, { responseType: 'blob' })
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

  const onSelectUpload = async (e) => {
    try {
      const f = e.target.files?.[0]
      if (!f) return
      setUploadFile(f)
    } catch (_) {}
  }

  const doUpload = async () => {
    try {
      if (!uploadFile) return
      setUploading(true)
      const arrBuf = await uploadFile.arrayBuffer()
      const b64 = btoa(String.fromCharCode(...new Uint8Array(arrBuf)))
      const payload = { fileBase64: `data:application/octet-stream;base64,${b64}`, filename: uploadFile.name }
      const { data } = await axios.post(`${API_BASE_URL}/api/admin/installations/${id}/backups/upload`, payload)
      setActionMsg(`Upload selesai: ${data?.file?.fileName || uploadFile.name}`)
      setUploadFile(null)
      await refresh()
    } catch (e) {
      const msg = e?.response?.data?.message || 'Gagal upload backup'
      const detail = e?.response?.data?.error
      setActionMsg(detail ? `${msg}: ${detail}` : msg)
    } finally {
      setUploading(false)
    }
  }

  const checkPrereqCall = async () => {
    try {
      setActionMsg(null)
      const { data } = await axios.get(`${API_BASE_URL}/api/admin/installations/${id}/backup-prereq`)
      setPrereq(data?.prereq || null)
      setActionMsg('Prasyarat backup/restore berhasil diambil')
    } catch (e) {
      const msg = e?.response?.data?.message || 'Gagal mengambil prasyarat'
      const detail = e?.response?.data?.error
      setActionMsg(detail ? `${msg}: ${detail}` : msg)
    }
  }

  const handleUpdateSeats = async () => {
    try {
      const v = Number(seatsValue)
      if (!Number.isFinite(v) || v < 1) {
        setActionMsg('Seats harus angka >= 1')
        return
      }
      setActionMsg(null)
      await axios.patch(`${API_BASE_URL}/api/admin/installations/${id}/seats`, { seats: v })
      setActionMsg(`Seats diubah ke ${v}`)
      await refresh()
    } catch (e) {
      setActionMsg(e?.response?.data?.message || 'Gagal update seats')
    }
  }
  const chip = (text, bg) => (
    <span style={{ background: bg || '#e5e7eb', color: '#f97316', padding: '2px 8px', borderRadius: 8, fontWeight: 600 }}>
      {text}
    </span>
  )

  useEffect(() => {
    let alive = true
    const fetchDetail = async () => {
      try {
        setLoading(true)
        setError(null)
        const { data } = await axios.get(`${API_BASE_URL}/api/admin/installations/${id}/insight`)
        if (!alive) return
        setIt(data?.installation || null)
        if (data?.installation?.appStatus) setAppStatus(String(data.installation.appStatus))
        if (data?.installation?.licenseTier) setLicenseTier(String(data.installation.licenseTier))
        if (typeof data?.installation?.seats === 'number') setSeatsValue(String(data.installation.seats))
      } catch (e) {
        if (!alive) return
        setError(e?.response?.data?.message || 'Gagal memuat detail installation')
      } finally {
        if (alive) setLoading(false)
      }
    }
    if (id) fetchDetail()
    return () => { alive = false }
  }, [id])

  useEffect(() => {
    let alive = true
    const fetchBackups = async () => {
      try {
        setBackupsLoading(true)
        const { data } = await axios.get(`${API_BASE_URL}/api/admin/installations/${id}/backups`)
        if (!alive) return
        setBackups(Array.isArray(data?.backups) ? data.backups : [])
      } catch (_) {
      } finally {
        if (alive) setBackupsLoading(false)
      }
    }
    if (id) fetchBackups()
    return () => { alive = false }
  }, [id])

  useEffect(() => {
    let alive = true
    const fetchBookings = async () => {
      try {
        const { data } = await axios.get(`${API_BASE_URL}/api/admin/bookings`)
        if (!alive) return
        setBookings(Array.isArray(data?.bookings) ? data.bookings : [])
      } catch (_) {}
    }
    fetchBookings()
    return () => { alive = false }
  }, [])

  const refresh = async () => {
    const { data } = await axios.get(`${API_BASE_URL}/api/admin/installations/${id}/insight`)
    setIt(data?.installation || null)
    if (data?.installation?.appStatus) setAppStatus(String(data.installation.appStatus))
    if (data?.installation?.licenseTier) setLicenseTier(String(data.installation.licenseTier))
    if (typeof data?.installation?.seats === 'number') setSeatsValue(String(data.installation.seats))
    // refresh backups list
    try {
      const b = await axios.get(`${API_BASE_URL}/api/admin/installations/${id}/backups`)
      setBackups(Array.isArray(b?.data?.backups) ? b.data.backups : [])
    } catch (_) {}
  }

  const doAction = async (action) => {
    try {
      setActionMsg(null)
      await axios.post(`${API_BASE_URL}/api/admin/installations/${id}/${action}`)
      setActionMsg(`${action} sukses`)
      await refresh()
    } catch (e) {
      setActionMsg(e?.response?.data?.message || `Gagal ${action}`)
    }
  }

  const handleUpdateAppStatus = async () => {
    try {
      setActionMsg(null)
      await axios.patch(`${API_BASE_URL}/api/admin/installations/${id}/app-status`, { appStatus })
      setActionMsg(`Status aplikasi diubah ke ${appStatus}`)
      await refresh()
    } catch (e) {
      setActionMsg(e?.response?.data?.message || 'Gagal update status aplikasi')
    }
  }

  const handleSetLicense = async () => {
    try {
      setActionMsg(null)
      await axios.post(`${API_BASE_URL}/api/admin/installations/${id}/license`, { tier: licenseTier })
      setActionMsg(`License diubah ke ${licenseTier}`)
      await refresh()
    } catch (e) {
      setActionMsg(e?.response?.data?.message || 'Gagal update license')
    }
  }

  const linkBooking = async () => {
    try {
      if (!selectedBookingId) return
      setActionMsg(null)
      await axios.post(`${API_BASE_URL}/api/admin/installations/${id}/link-booking`, { bookingId: selectedBookingId })
      setActionMsg('Berhasil menautkan booking')
      await refresh()
      setEditLink(false)
    } catch (e) {
      setActionMsg(e?.response?.data?.message || 'Gagal menautkan booking')
    }
  }

  const createBackup = async () => {
    try {
      setActionMsg(null)
      const { data } = await axios.post(`${API_BASE_URL}/api/admin/installations/${id}/backup`)
      setActionMsg(`Backup dibuat: ${data?.file?.fileName || 'berkas'}`)
      await refresh()
    } catch (e) {
      const msg = e?.response?.data?.message || 'Gagal membuat backup'
      const detail = e?.response?.data?.error
      setActionMsg(detail ? `${msg}: ${detail}` : msg)
    }
  }

  const restoreFromFile = async (fileName) => {
    try {
      if (!fileName) return
      if (!confirm(`Restore database dari backup ${fileName}? Disarankan menghentikan aplikasi terlebih dahulu.`)) return
      setActionMsg(null)
      await axios.post(`${API_BASE_URL}/api/admin/installations/${id}/restore`, { fileName })
      setActionMsg(`Restore dari ${fileName} selesai`)
      await refresh()
    } catch (e) {
      const msg = e?.response?.data?.message || 'Gagal restore backup'
      const detail = e?.response?.data?.error
      setActionMsg(detail ? `${msg}: ${detail}` : msg)
    }
  }

  const restoreFromOther = async () => {
    try {
      if (!sourceInstallId) {
        setActionMsg('sourceInstallationId wajib diisi')
        return
      }
      setActionMsg(null)
      await axios.post(`${API_BASE_URL}/api/admin/installations/${id}/restore-from`, {
        sourceInstallationId: sourceInstallId,
        fileName: restoreFileName || undefined,
      })
      setActionMsg('Restore dari installation lain selesai')
      setRestoreFileName('')
      await refresh()
    } catch (e) {
      const msg = e?.response?.data?.message || 'Gagal restore dari installation lain'
      const detail = e?.response?.data?.error
      setActionMsg(detail ? `${msg}: ${detail}` : msg)
    }
  }

  const online = it?.lastSeenAt ? (Date.now() - new Date(it.lastSeenAt).getTime()) <= 5 * 60 * 1000 : false
  const metrics = it?.metrics || {}
  const storageGB = typeof metrics.storageUsedGB === 'number'
    ? metrics.storageUsedGB
    : (typeof metrics.storageUsedBytes === 'number' ? Math.round((metrics.storageUsedBytes / (1024 ** 3)) * 100) / 100 : null)

  return (
    <section className="section">
      <div className="container">
        <h1 className="section-title">Admin • Installation Detail</h1>
        <p className="section-subtitle">Informasi lengkap instalasi.</p>

        <div style={{ marginBottom: 12 }}>
          <Link className="btn btn-outline" to="/admin/installations">Kembali</Link>
        </div>

        <div className="surface" style={{ padding: 24 }}>
          {error && <div className="notification" style={{ background: '#ef4444', marginBottom: 12 }}>{error}</div>}
          {loading && <div className="notification" style={{ marginBottom: 12 }}>Memuat detail...</div>}

          {it && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: 18 }}>{it.instanceName || it.studioName || it.companyName || '—'}</div>
                <div className="muted">{it.appVersion || 'v?'}</div>
              </div>
              <div className="muted" style={{ marginTop: 6 }}>{it.primaryIp || '—'} • {it.environment || '—'} • {online ? 'Online' : 'Offline'}</div>
              <div className="muted" style={{ marginTop: 6 }}>Last seen: {it.lastSeenAt ? new Date(it.lastSeenAt).toLocaleString() : '—'}</div>

              {it.endpointUrl && (
                <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div className="muted">Endpoint:</div>
                  <code style={{ padding: '2px 6px' }}>{it.endpointUrl}</code>
                  <button className="btn btn-primary" onClick={() => window.open(it.endpointUrl, '_blank')}>Open</button>
                </div>
              )}

              <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <select className="form-control" value={appStatus} onChange={(e) => setAppStatus(e.target.value)}>
                  <option value="provisioning">Provisioning</option>
                  <option value="pending">Pending</option>
                  <option value="running">Running</option>
                  <option value="stopped">Stopped</option>
                </select>
                <button className="btn btn-outline" onClick={handleUpdateAppStatus}>Update App Status</button>
                <button className="btn btn-outline" onClick={() => { if (confirm('Hapus installation ini? Container akan dihapus dan record ini hilang.')) doAction('delete') }}>Delete</button>
              </div>

              <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <select className="form-control" value={licenseTier} onChange={(e) => setLicenseTier(e.target.value)}>
                  <option value="starter">starter</option>
                  <option value="pro">pro</option>
                  <option value="enterprise">enterprise</option>
                </select>
                <button className="btn btn-outline" onClick={handleSetLicense}>Set License</button>
              </div>

              <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                  className="form-control"
                  type="number"
                  min={1}
                  placeholder="Seats (User Limit)"
                  value={seatsValue}
                  onChange={(e) => setSeatsValue(e.target.value)}
                  style={{ width: 180 }}
                />
                <button className="btn btn-outline" onClick={handleUpdateSeats}>Update Seats</button>
                {typeof it?.seats === 'number' && (
                  <div className="muted">Current: {it.seats}</div>
                )}
              </div>

              {actionMsg && <div className="notification" style={{ marginTop: 12 }}>{actionMsg}</div>}

              <div className="divider" />

              <h3>Bridge ke Booking</h3>
              {it.bookingId && !editLink ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div className="muted">Tertaut ke Booking:</div>
                  {chip(it.bookingId, '#e5e7eb')}
                  {it.bookingEmail && chip(it.bookingEmail, '#e5e7eb')}
                  <button className="btn btn-outline" onClick={() => navigate(`/admin/bookings/${it.bookingId}`)}>Lihat Booking</button>
                  <button className="btn" onClick={() => { setSelectedBookingId(''); setEditLink(true) }}>Ganti Tautan</button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <select className="form-control" value={selectedBookingId} onChange={(e) => setSelectedBookingId(e.target.value)}>
                    <option value="">Pilih booking…</option>
                    {bookings.map(b => (
                      <option key={b.id} value={b.id}>{b.company || b.name} • {b.email}</option>
                    ))}
                  </select>
                  <button className="btn btn-outline" disabled={!selectedBookingId} onClick={linkBooking}>Tautkan</button>
                  {it.bookingId && <button className="btn btn-outline" onClick={() => setEditLink(false)}>Batal</button>}
                </div>
              )}

              <div className="features-grid" style={{ marginTop: 8 }}>
                <div className="feature-card">
                  <div className="muted">Hostname</div>
                  <div>{it.hostname || '—'}</div>
                </div>
                <div className="feature-card">
                  <div className="muted">IP Utama</div>
                  <div>{it.primaryIp || '—'}</div>
                </div>
                <div className="feature-card">
                  <div className="muted">Lingkungan</div>
                  <div>{it.environment || '—'}</div>
                </div>
                <div className="feature-card">
                  <div className="muted">Nama Aplikasi</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{it.instanceName || it.studioName || '—'}</div>
                </div>
                <div className="feature-card">
                  <div className="muted">Status Aplikasi</div>
                  <div>{chip(it.appStatus || '—', statusBg(it.appStatus))}</div>
                </div>
                <div className="feature-card">
                  <div>{typeof metrics.users === 'number' ? metrics.users : '—'}</div>
                </div>
                <div className="feature-card">
                  <div className="muted">Projects</div>
                  <div>{typeof metrics.projects === 'number' ? metrics.projects : '—'}</div>
                </div>
                <div className="feature-card">
                  <div className="muted">Storage Terpakai</div>
                  <div>{storageGB != null ? `${storageGB} GB` : '—'}</div>
                </div>
              </div>

              <div className="divider" />

              <h3>Backup & Restore</h3>
              <div className="quote" style={{ marginTop: 8 }}>
                Disarankan mengubah App Status ke <strong>Stopped</strong> sebelum melakukan restore, lalu kembali ke <strong>Running</strong> setelah selesai.
              </div>

              <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <button className="btn" onClick={createBackup} disabled={backupsLoading}>Buat Backup</button>
                <button className="btn btn-outline" onClick={refresh}>Refresh</button>
                <button className="btn btn-outline" onClick={checkPrereqCall}>Check Prasyarat</button>
              </div>

              {prereq && (
                <div className="surface" style={{ padding: 16, marginTop: 12 }}>
                  <h4 style={{ marginTop: 0 }}>Prasyarat</h4>
                  <pre style={{ whiteSpace: 'pre-wrap', overflowX: 'auto' }}>{JSON.stringify(prereq, null, 2)}</pre>
                </div>
              )}

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
              <h4 style={{ marginTop: 0 }}>Restore dari Installation Lain</h4>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    className="form-control"
                    placeholder="sourceInstallationId"
                    value={sourceInstallId}
                    onChange={(e) => setSourceInstallId(e.target.value)}
                    style={{ width: 220 }}
                  />
                  <input
                    className="form-control"
                    placeholder="fileName (opsional, auto pakai terbaru jika kosong)"
                    value={restoreFileName}
                    onChange={(e) => setRestoreFileName(e.target.value)}
                    style={{ width: 360 }}
                  />
                  <button className="btn btn-outline" onClick={restoreFromOther}>Restore</button>
                </div>
              </>)}
          </div>
        </div>
      </section>
  )
}
