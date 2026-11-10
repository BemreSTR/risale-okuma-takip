import { X, Plus } from 'lucide-react'
import { RISALE_BOOKS } from '../../constants'

export default function AddBookModal({ isOpen, onClose, onAddBook, isSaving = false }) {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={() => !isSaving && onClose()}>
      <div className="modal" style={{ maxHeight: '80vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div className="header-row">
          <h3>Kitap Seç</h3>
          <button type="button" onClick={onClose} disabled={isSaving} aria-label="Kapat">
            <X size={20} color="#64748b" />
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {RISALE_BOOKS.map((title) => (
            <button
              key={title}
              type="button"
              className="card"
              disabled={isSaving}
              style={{
                marginBottom: 0,
                justifyContent: 'space-between',
                padding: '12px',
                opacity: isSaving ? 0.6 : 1,
                cursor: isSaving ? 'not-allowed' : 'pointer'
              }}
              onClick={() => !isSaving && onAddBook(title)}
            >
              <span>{title}</span>
              <Plus size={16} color="var(--primary-color)" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
