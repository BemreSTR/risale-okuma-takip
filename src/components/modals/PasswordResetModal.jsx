import { useState } from 'react'
import { Eye, EyeOff, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'

export default function PasswordResetModal({
  isOpen,
  onClose,
  newPassword,
  setNewPassword,
  onSave,
  isSaving = false
}) {
  const [showPassword, setShowPassword] = useState(false)

  if (!isOpen) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!isSaving) {
      onSave()
    }
  }

  return (
    <div className="modal-overlay" onClick={() => !isSaving && onClose?.()}>
      <Card className="w-[90%] max-w-sm p-6 animate-in slide-in-from-bottom-5 duration-300" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-lg font-bold">Yeni Şifre Belirle</h3>
            <p className="text-sm text-slate-500 mt-1">Devam etmek için yeni şifrenizi belirlemelisiniz.</p>
          </div>
          {onClose && (
            <button type="button" onClick={onClose} disabled={isSaving} className="text-slate-400" aria-label="Kapat">
              <X size={20} />
            </button>
          )}
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="new-password">Yeni Şifre</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="En az 6 karakter"
                autoFocus
                disabled={isSaving}
                className="text-left h-11 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <Button type="submit" disabled={isSaving} className="w-full h-11 shadow-lg shadow-teal-500/10">
            {isSaving ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
