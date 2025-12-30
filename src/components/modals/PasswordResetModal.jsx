import { X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

export default function PasswordResetModal({ isOpen, onClose, newPassword, setNewPassword, onSave }) {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <Card className="w-[90%] max-w-sm p-6 animate-in slide-in-from-bottom-5 duration-300" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold">Yeni Şifre Belirle</h3>
                    <button onClick={onClose} className="text-slate-400"><X size={20} /></button>
                </div>
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="new-password">Yeni Şifre</Label>
                        <Input
                            id="new-password"
                            type="password"
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            placeholder="En az 6 karakter"
                            autoFocus
                            className="text-left h-11"
                        />
                    </div>
                    <Button className="w-full h-11 shadow-lg shadow-teal-500/10" onClick={onSave}>
                        Şifreyi Güncelle
                    </Button>
                </div>
            </Card>
        </div>
    );
}
