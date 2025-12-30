import { ChevronRight } from 'lucide-react';
import { RISALE_BOOKS, COLORS } from '../constants';
import { Card } from "@/components/ui/card";

export default function HatimlerView({ finishedStats, onBack, onEdit }) {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4 mb-2">
                <button onClick={onBack} className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
                    <ChevronRight size={24} className="rotate-180" />
                </button>
                <h1 className="text-xl font-bold text-slate-900">Hatim Detayları</h1>
            </div>

            <div className="grid gap-3">
                {RISALE_BOOKS.map((bookTitle, index) => {
                    const count = finishedStats[bookTitle] || 0;
                    const color = COLORS[index % COLORS.length];
                    return (
                        <Card
                            key={bookTitle}
                            onClick={() => onEdit(bookTitle)}
                            className="p-3 hover:shadow-md transition-all cursor-pointer border-slate-100 group"
                        >
                            <div className="flex items-center gap-4">
                                <div style={{ background: color }} className="w-10 h-14 rounded-lg flex items-center justify-center text-white font-black text-lg shadow-lg shadow-inner opacity-90 group-hover:scale-105 transition-transform">
                                    {bookTitle.substring(0, 1)}
                                </div>
                                <div className="flex-1">
                                    <div className="font-bold text-slate-800 group-hover:text-teal-600 transition-colors">{bookTitle}</div>
                                    <div className="text-xs font-medium text-slate-400">Tamamlanan Devir</div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="text-2xl font-black text-slate-900 leading-none">
                                        {count}
                                    </div>
                                    <ChevronRight size={18} className="text-slate-300" />
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
