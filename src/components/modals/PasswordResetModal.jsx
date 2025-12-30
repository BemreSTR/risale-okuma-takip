import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

export default function PasswordResetModal({ isOpen, newPassword, setNewPassword, onSave }) {
    const [showPassword, setShowPassword] = useState(false);

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <Card className="w-[90%] max-w-sm p-6 animate-in slide-in-from-bottom-5 duration-300" onClick={e => e.stopPropagation()}>
                <div className="mb-6">
                    <h3 className="text-lg font-bold">Yeni Şifre Belirle</h3>
                    <p className="text-sm text-slate-500 mt-1">Devam etmek için yeni şifrenizi belirlemelisiniz.</p>
                </div>
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="new-password">Yeni Şifre</Label>
                        <div className="relative">
                            <Input
                                id="new-password"
                                type={showPassword ? "text" : "password"}
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                placeholder="En az 6 karakter"
                                autoFocus
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
                    <Button className="w-full h-11 shadow-lg shadow-teal-500/10" onClick={onSave}>
                        Şifreyi Güncelle
                    </Button>
                </div>
            </Card>
        </div>
    );
}
