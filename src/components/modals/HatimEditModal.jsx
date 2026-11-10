import { X } from 'lucide-react'

export default function HatimEditModal({
  isOpen,
  onClose,
  selectedHatimBook,
  hatimCountInput,
  setHatimCountInput,
  onSave,
  isSaving = false
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
          <h3>Hatim Sayısı Düzenle</h3>
          <button type="button" onClick={onClose} disabled={isSaving} aria-label="Kapat">
            <X size={20} color="#64748b" />
          </button>
        </div>
        <p style={{ color: '#64748b', marginBottom: '24px' }}>
          <span style={{ fontWeight: 600, color: 'var(--primary-color)' }}>{selectedHatimBook}</span> kitabını kaç kere bitirdin?
        </p>
        <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Hatim Sayısı</label>
        <input
          type="number"
          value={hatimCountInput}
          onChange={(e) => setHatimCountInput(e.target.value)}
          placeholder="0"
          min="0"
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
