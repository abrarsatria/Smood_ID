import React, { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { API_BASE_URL } from '../../config/constants'

export default function AdminInvoiceDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [invoice, setInvoice] = useState(null)
  const [payment, setPayment] = useState(null)
  const [statusSel, setStatusSel] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  const load = async () => {
    try {
      setLoading(true)
      setError(null)
      setMsg(null)
      const [invRes, payRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/admin/invoices/${id}`),
        axios.get(`${API_BASE_URL}/api/client/payment/info`),
      ])
      setInvoice(invRes?.data?.invoice || null)
      setPayment(payRes?.data?.payment || null)
      setStatusSel(invRes?.data?.invoice?.status || '')
      setNotes(invRes?.data?.invoice?.notes || '')
    } catch (e) {
      setError(e?.response?.data?.message || 'Gagal memuat invoice')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let alive = true
    ;(async () => { if (alive) await load() })()
    return () => { alive = false }
  }, [id])

  const save = async () => {
    if (!statusSel) return
    try {
      setSaving(true)
      setError(null)
      setMsg(null)
      const payload = { status: statusSel }
      if (notes && notes.trim()) payload.notes = notes.trim()
      await axios.patch(`${API_BASE_URL}/api/admin/invoices/${id}`, payload)
      setMsg('Perubahan disimpan')
      await load()
    } catch (e) {
      setError(e?.response?.data?.message || 'Gagal menyimpan perubahan')
    } finally {
      setSaving(false)
    }
  }

  const statusBadge = useMemo(() => {
    const s = (invoice?.status || '').toLowerCase()
    const map = {
      awaiting_payment: '#f59e0b',
      paid: '#10b981',
      cancelled: '#ef4444',
      expired: '#6b7280',
    }
    return map[s] || '#6b7280'
  }, [invoice])

  return (
    <section className="section">
      <div className="container">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 className="section-title">Admin • Invoice Detail</h1>
          <button className="btn btn-outline" onClick={() => navigate('/admin/payments')}>Kembali</button>
        </div>
        <p className="section-subtitle">Tinjau bukti pembayaran, instruksi, dan ubah status invoice.</p>

        <div className="surface" style={{ padding: 24 }}>
          {error && <div className="notification" style={{ background: '#ef4444', marginBottom: 12 }}>{error}</div>}
          {loading && <div className="notification" style={{ marginBottom: 12 }}>Memuat data...</div>}
          {msg && <div className="notification" style={{ marginBottom: 12 }}>{msg}</div>}

          {invoice && (
            <>
              <h3 style={{ marginTop: 0 }}>Ringkasan Invoice</h3>
              <div className="features-grid" style={{ marginTop: 8 }}>
                <div className="feature-card">
                  <div className="muted">No. Invoice</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{invoice.number}</div>
                </div>
                <div className="feature-card">
                  <div className="muted">Email</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{invoice.email}</div>
                </div>
                <div className="feature-card">
                  <div className="muted">Total</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>IDR {new Intl.NumberFormat('id-ID').format(invoice.amount)}</div>
                </div>
                <div className="feature-card">
                  <div className="muted">Paket</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{invoice.tier} • Seats: {invoice.seats}</div>
                </div>
                <div className="feature-card">
                  <div className="muted">Issued</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{new Date(invoice.issuedAt).toLocaleDateString()}</div>
                </div>
                <div className="feature-card">
                  <div className="muted">Due</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{new Date(invoice.dueAt).toLocaleDateString()}</div>
                </div>
                <div className="feature-card">
                  <div className="muted">Status</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: statusBadge }}>{invoice.status}</div>
                </div>
              </div>

              {invoice.proofUrl ? (
                <div className="quote" style={{ marginTop: 12 }}>
                  Bukti pembayaran terkirim pada {invoice.proofSubmittedAt ? new Date(invoice.proofSubmittedAt).toLocaleString() : '-'}
                  {invoice.paymentMethod ? ` • Metode: ${invoice.paymentMethod}` : ''}
                  <br />
                  {(() => {
                    const href = invoice.proofUrl.startsWith('/') ? `${API_BASE_URL}${invoice.proofUrl}` : invoice.proofUrl
                    return (
                      <>Link bukti: <a className="nav-link" style={{ padding: 0 }} href={href} target="_blank" rel="noreferrer">{href}</a></>
                    )
                  })()}
                </div>
              ) : (
                <div className="quote" style={{ marginTop: 12 }}>Belum ada bukti pembayaran.</div>
              )}

              <div className="divider" />

              <h3>Instruksi Pembayaran</h3>
              {payment ? (
                <div className="features-grid" style={{ marginTop: 8 }}>
                  <div className="feature-card">
                    <div className="muted">Bank</div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{payment.bankName}</div>
                  </div>
                  <div className="feature-card">
                    <div className="muted">Atas Nama</div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{payment.bankAccountName}</div>
                  </div>
                  <div className="feature-card">
                    <div className="muted">No. Rekening</div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{payment.bankAccountNumber}</div>
                  </div>
                  {payment.paymentQrUrl && (
                    <div className="feature-card">
                      <div className="muted">QRIS</div>
                      <div><a href={payment.paymentQrUrl} className="nav-link" style={{ padding: 0 }} target="_blank" rel="noreferrer">Lihat QR</a></div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="quote">Instruksi pembayaran tidak tersedia.</div>
              )}
              {payment?.instructions && (
                <div className="quote" style={{ marginTop: 8 }}>{payment.instructions}</div>
              )}

              <div className="divider" />

              <h3>Ubah Status</h3>
              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label htmlFor="status">Status</label>
                  <select id="status" className="form-control" value={statusSel} onChange={(e) => setStatusSel(e.target.value)}>
                    <option value="">Pilih status</option>
                    <option value="awaiting_payment">awaiting_payment</option>
                    <option value="paid">paid</option>
                    <option value="cancelled">cancelled</option>
                    <option value="expired">expired</option>
                  </select>
                </div>
                <div className="form-group" style={{ flex: 2 }}>
                  <label htmlFor="notes">Catatan</label>
                  <textarea id="notes" className="form-control" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Catatan admin (opsional)" />
                </div>
              </div>
              <div className="button-group">
                <button className="form-btn form-btn-primary" disabled={!statusSel || saving} onClick={save}>
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
