import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { API_BASE_URL } from '../config/constants'

export default function InvoiceDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [invoice, setInvoice] = useState(null)
  const [payment, setPayment] = useState(null)
  const [proof, setProof] = useState({ proofUrl: '', paymentMethod: '' })
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [fileState, setFileState] = useState({ file: null, fileName: '' })
  const [result, setResult] = useState(null)

  const load = async () => {
    try {
      setLoading(true)
      setError(null)
      const [invRes, payRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/client/payment/invoices/${id}`),
        axios.get(`${API_BASE_URL}/api/client/payment/info`),
      ])
      setInvoice(invRes?.data?.invoice || null)
      setPayment(payRes?.data?.payment || null)
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

  const submitProof = async (e) => {
    e.preventDefault()
    try {
      setSubmitting(true)
      setError(null)
      setResult(null)
      const payload = { proofUrl: proof.proofUrl, paymentMethod: proof.paymentMethod }
      await axios.post(`${API_BASE_URL}/api/client/payment/invoices/${id}/proof`, payload)
      setResult('Bukti pembayaran telah dikirim. Menunggu verifikasi admin.')
      await load()
    } catch (e) {
      setError(e?.response?.data?.message || 'Gagal mengirim bukti pembayaran')
    } finally {
      setSubmitting(false)
    }
  }

  const onFileChange = (e) => {
    const f = e.target.files?.[0]
    if (!f) {
      setFileState({ file: null, fileName: '' })
      return
    }
    setFileState({ file: f, fileName: f.name })
  }

  const uploadProofFile = async (e) => {
    e.preventDefault()
    if (!fileState.file) {
      setError('Pilih file bukti terlebih dahulu')
      return
    }
    try {
      setUploading(true)
      setError(null)
      setResult(null)
      // convert to base64
      const toBase64 = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const b64 = await toBase64(fileState.file)
      await axios.post(`${API_BASE_URL}/api/client/payment/invoices/${id}/proof-file`, {
        fileBase64: b64,
        filename: fileState.fileName,
        paymentMethod: proof.paymentMethod || 'bank_transfer',
      })
      setResult('Bukti pembayaran (file) telah diunggah. Menunggu verifikasi admin.')
      setFileState({ file: null, fileName: '' })
      await load()
    } catch (e) {
      setError(e?.response?.data?.message || 'Gagal mengunggah bukti pembayaran')
    } finally {
      setUploading(false)
    }
  }

  return (
    <section className="section">
      <div className="container">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 className="section-title">Invoice Detail</h1>
          <button className="btn btn-outline" onClick={() => navigate('/client/payment')}>Kembali</button>
        </div>
        <p className="section-subtitle">Lihat detail invoice, instruksi pembayaran, dan kirim bukti pembayaran.</p>

        <div className="surface" style={{ padding: 24 }}>
          {error && <div className="notification" style={{ background: '#ef4444', marginBottom: 12 }}>{error}</div>}
          {loading && <div className="notification" style={{ marginBottom: 12 }}>Memuat data...</div>}
          {result && <div className="notification" style={{ marginBottom: 12 }}>{result}</div>}

          {invoice && (
            <>
              <h3 style={{ marginTop: 0 }}>Ringkasan Invoice</h3>
              <div className="features-grid" style={{ marginTop: 8 }}>
                <div className="feature-card">
                  <div className="muted">No. Invoice</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{invoice.number}</div>
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
                  <div className="muted">Jatuh Tempo</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{new Date(invoice.dueAt).toLocaleDateString()}</div>
                </div>
                <div className="feature-card">
                  <div className="muted">Status</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{invoice.status}</div>
                </div>
              </div>

              {invoice.proofUrl && (
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

              {invoice.status !== 'paid' && (
                <>
                  <h3>Kirim Bukti Pembayaran</h3>
                  <form onSubmit={submitProof} className="modal-form" style={{ position: 'relative', boxShadow: 'none', border: 'none', padding: 0 }}>
                    <div className="form-row">
                      <div className="form-group" style={{ flex: 1 }}>
                        <label htmlFor="paymentMethod">Metode Pembayaran</label>
                        <select id="paymentMethod" className="form-control" value={proof.paymentMethod} onChange={(e) => setProof((p) => ({ ...p, paymentMethod: e.target.value }))}>
                          <option value="">Pilih metode</option>
                          <option value="bank_transfer">Transfer Bank</option>
                          <option value="qris">QRIS</option>
                          <option value="other">Lainnya</option>
                        </select>
                      </div>
                      <div className="form-group" style={{ flex: 2 }}>
                        <label htmlFor="proofUrl">Link Bukti Pembayaran</label>
                        <input id="proofUrl" type="url" className="form-control" placeholder="Tempel link bukti (Google Drive, Dropbox, atau URL foto)" value={proof.proofUrl} onChange={(e) => setProof((p) => ({ ...p, proofUrl: e.target.value }))} />
                      </div>
                    </div>
                    <div className="button-group">
                      <button type="submit" className="form-btn form-btn-primary" disabled={submitting}>
                        {submitting ? 'Mengirim...' : 'Kirim Bukti'}
                      </button>
                    </div>
                  </form>

                  <div className="divider" />

                  <h3>Atau Unggah File Bukti</h3>
                  <form onSubmit={uploadProofFile} className="modal-form" style={{ position: 'relative', boxShadow: 'none', border: 'none', padding: 0 }}>
                    <div className="form-row">
                      <div className="form-group" style={{ flex: 1 }}>
                        <label htmlFor="file">Pilih File</label>
                        <input id="file" type="file" className="form-control" accept="image/*,application/pdf" onChange={onFileChange} />
                      </div>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label className="muted">File Terpilih</label>
                        <div>{fileState.fileName || '-'}</div>
                      </div>
                    </div>
                    <div className="button-group">
                      <button type="submit" className="form-btn form-btn-primary" disabled={uploading}>
                        {uploading ? 'Mengunggah...' : 'Unggah Bukti'}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  )
}
