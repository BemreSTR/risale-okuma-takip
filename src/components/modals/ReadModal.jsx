import { X } from 'lucide-react'

export default function ReadModal({
  isOpen,
  onClose,
  selectedBook,
  pagesInput,
  setPagesInput,
  dateInput,
  setDateInput,
  onSave,
  isSaving = false,
  existingDayAmount = null
}) {
  if (!isOpen) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!isSaving) {
      onSave()
    }
  }

  return (
    <div className="modal-overlay" onClick={() => !isSaving && onClose()}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="header-row">
          <h3>Okuma Ekle</h3>
          <button type="button" onClick={onClose} disabled={isSaving} aria-label="Kapat">
            <X size={20} color="#64748b" />
          </button>
        </div>
        <p style={{ color: '#64748b', marginBottom: existingDayAmount ? '8px' : '24px' }}>
          <span style={{ fontWeight: 600, color: 'var(--primary-color)' }}>{selectedBook?.title}</span> kitabından kaç sayfa okudun?
        </p>

        {existingDayAmount > 0 && (
          <p style={{ color: '#0f766e', background: '#f0fdfa', border: '1px solid #ccfbf1', borderRadius: '8px', padding: '8px 12px', fontSize: '12px', marginBottom: '16px' }}>
            Bu tarihte kayıtlı okuma: <strong>{existingDayAmount} sayfa</strong>. Kaydedince güncellenecektir.
          </p>
        )}

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Tarih</label>
          <input
            type="date"
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
            disabled={isSaving}
            style={{ margin: 0, padding: '12px', fontSize: '16px', textAlign: 'left' }}
          />
        </div>

        <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Sayfa Sayısı</label>
        <input
          type="number"
          value={pagesInput}
          onChange={(e) => setPagesInput(e.target.value)}
          placeholder="Örn: 10"
          autoFocus
          disabled={isSaving}
          style={{ marginTop: 0 }}
        />
        <button
          type="submit"
          className="btn-primary"
          disabled={isSaving}
          style={isSaving ? { opacity: 0.7, cursor: 'not-allowed' } : undefined}
        >
          {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
      </form>
    </div>
  )
}
