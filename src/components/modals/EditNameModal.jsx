import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'

export default function EditNameModal({
  isOpen,
  onClose,
  newNameInput,
  setNewNameInput,
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
      <Card className="w-[90%] max-w-sm p-6 animate-in slide-in-from-bottom-5 duration-300" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold">İsmini Düzenle</h3>
          <button type="button" onClick={onClose} disabled={isSaving} className="text-slate-400" aria-label="Kapat">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="new-name">Yeni Ad Soyad</Label>
            <Input
              id="new-name"
              value={newNameInput}
              onChange={(e) => setNewNameInput(e.target.value)}
              placeholder="Ad Soyad"
              autoFocus
              disabled={isSaving}
              className="text-left h-11"
            />
          </div>
          <Button type="submit" disabled={isSaving} className="w-full h-11 shadow-lg shadow-teal-500/10">
            {isSaving ? 'Güncelleniyor...' : 'Güncelle'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
