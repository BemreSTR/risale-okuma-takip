import { X } from 'lucide-react';

export default function ReadModal({ isOpen, onClose, selectedBook, pagesInput, setPagesInput, dateInput, setDateInput, onSave }) {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="header-row">
                    <h3>Okuma Ekle</h3>
                    <button onClick={onClose}><X size={20} color="#64748b" /></button>
                </div>
                <p style={{ color: '#64748b', marginBottom: '24px' }}>
                    <span style={{ fontWeight: 600, color: 'var(--primary-color)' }}>{selectedBook?.title}</span> kitabından kaç sayfa okudun?
                </p>

                <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Tarih</label>
                    <input
                        type="date"
                        value={dateInput}
                        onChange={e => setDateInput(e.target.value)}
                        style={{ margin: 0, padding: '12px', fontSize: '16px', textAlign: 'left' }}
                    />
                </div>

                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Sayfa Sayısı</label>
                <input
                    type="number"
                    value={pagesInput}
                    onChange={e => setPagesInput(e.target.value)}
                    placeholder="Örn: 10"
                    autoFocus
                    style={{ marginTop: 0 }}
                />
                <button className="btn-primary" onClick={onSave}>Kaydet</button>
            </div>
        </div>
    );
}
