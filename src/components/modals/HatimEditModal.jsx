import { X } from 'lucide-react';

export default function HatimEditModal({ isOpen, onClose, selectedHatimBook, hatimCountInput, setHatimCountInput, onSave }) {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="header-row">
                    <h3>Hatim Sayısı Düzenle</h3>
                    <button onClick={onClose}><X size={20} color="#64748b" /></button>
                </div>
                <p style={{ color: '#64748b', marginBottom: '24px' }}>
                    <span style={{ fontWeight: 600, color: 'var(--primary-color)' }}>{selectedHatimBook}</span> kitabını kaç kere bitirdin?
                </p>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Hatim Sayısı</label>
                <input
                    type="number"
                    value={hatimCountInput}
                    onChange={e => setHatimCountInput(e.target.value)}
                    placeholder="0"
                    min="0"
                    autoFocus
                    style={{ marginTop: 0 }}
                />
                <button className="btn-primary" onClick={onSave}>Kaydet</button>
            </div>
        </div>
    );
}
