import { CheckCircle, ArrowRight, Bell, BellOff } from 'lucide-react';
import { RISALE_BOOKS } from '../constants';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function ProfileView({ finishedStats, onShowHatimler, publicId, name, onLogout, requestNotifPermission, notifPermission, onEditName }) {
    // Hatim Calculation - Lowest count of all 14 books
    const hatimCount = Math.min(...RISALE_BOOKS.map(title => finishedStats[title] || 0));

    // Progress towards next hatim
    const booksTowardsNext = RISALE_BOOKS.filter(title => (finishedStats[title] || 0) > hatimCount).length;
    const progressPercent = Math.round((booksTowardsNext / 14) * 100);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center px-1">
                <h1 className="text-2xl font-bold text-slate-900">Profil</h1>
                <Button variant="ghost" size="sm" onClick={onLogout} className="text-red-500 hover:text-red-600 hover:bg-red-50 font-semibold">
                    Çıkış Yap
                </Button>
            </div>

            <Card className="p-8 border-none shadow-lg shadow-slate-200/50 bg-gradient-to-br from-white to-slate-50 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 rounded-full -mr-16 -mt-16 pointer-events-none" />
                <div className="relative flex flex-col items-center text-center">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-white mb-4 shadow-xl shadow-teal-500/20 text-4xl font-extrabold ring-4 ring-white">
                        {name ? name.substring(0, 1).toUpperCase() : '??'}
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-1">{name}</h2>
                    <p className="text-slate-500 text-sm font-medium mb-6">Nur Talebesi</p>

                    <div
                        className="group relative cursor-pointer active:scale-95 transition-all"
                        onClick={() => {
                            navigator.clipboard.writeText(publicId);
                            alert("Kopyalandı: " + publicId);
                        }}
                    >
                        <div className="bg-white border-2 border-slate-100 rounded-2xl py-3 px-6 shadow-sm group-hover:border-teal-400 group-hover:shadow-md transition-all">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Takip Kodun</div>
                            <div className="text-2xl font-black text-slate-900 tracking-wider font-mono uppercase">{publicId}</div>
                        </div>
                        <div className="absolute -top-2 -right-2 bg-slate-900 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                            <ArrowRight size={12} className="-rotate-45" />
                        </div>
                    </div>
                </div>
            </Card>

            {/* Hatim Progress Stats */}
            <Card
                className="p-5 border-none shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                onClick={onShowHatimler}
            >
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Toplam Külliyat Bitirme</div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-4xl font-black text-teal-600 leading-none">{hatimCount}</span>
                            <span className="text-sm font-bold text-slate-400 uppercase">Hatim</span>
                        </div>
                    </div>
                    <div className="bg-teal-50 p-2 rounded-xl text-teal-600">
                        <CheckCircle size={24} />
                    </div>
                </div>

                <div className="space-y-3 pt-2">
                    <div className="flex justify-between text-xs font-bold items-end">
                        <span className="text-slate-500 uppercase">Sonraki Hatime Doğru</span>
                        <span className="text-teal-600 text-sm">{booksTowardsNext} / 14 Kitap</span>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                        <div
                            className="h-full bg-gradient-to-r from-teal-400 to-teal-600 rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium">
                        {hatimCount + 1}. Hatim için {14 - booksTowardsNext} kitap kaldı. Detaylar için dokun.
                    </p>
                </div>
            </Card>

            {/* Notifications Toggle */}
            <Card className="p-4 border-none shadow-sm bg-white">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl transition-colors ${notifPermission === 'granted' ? 'bg-teal-100 text-teal-600' : 'bg-slate-100 text-slate-400'}`}>
                            {notifPermission === 'granted' ? <Bell size={20} /> : <BellOff size={20} />}
                        </div>
                        <div>
                            <div className="text-sm font-bold text-slate-800">Akşam Hatırlatması</div>
                            <div className="text-[11px] text-slate-500 font-medium leading-tight">Saat 21:00'de bugün okuma<br />yapılmadıysa uyarı ver.</div>
                        </div>
                    </div>
                    {notifPermission !== 'granted' ? (
                        <Button size="sm" onClick={requestNotifPermission} className="h-9 px-4 rounded-xl shadow-lg shadow-teal-500/10">
                            Etkinleştir
                        </Button>
                    ) : (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 text-teal-600 rounded-xl text-[10px] font-black uppercase tracking-wider">
                            <div className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                            Aktif
                        </div>
                    )}
                </div>
            </Card>

            <div className="text-center pt-2">
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest leading-loose">
                    Risale-i Nur Okuma Takip Sistemi<br />
                    Bu dünya, bir misafirhanedir.
                </p>
            </div>
        </div>
    );
}
