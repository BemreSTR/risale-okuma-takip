import { Plus, CheckCircle, Trash2, BookOpen } from 'lucide-react';
import { COLORS } from '../constants';
import { Button } from "@/components/ui/button";
import { Card, CardDescription } from "@/components/ui/card";

export default function HomeView({ books, finishedStats, getBookProgress, onBookClick, onFinish, onRemove, onAddClick }) {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-900">Okuduklarım</h1>
                <div className="bg-teal-50 p-2 rounded-full text-teal-600">
                    <BookOpen size={20} />
                </div>
            </div>

            {books.length === 0 ? (
                <Card className="p-10 text-center bg-slate-50/50 border-dashed border-2">
                    <BookOpen size={48} className="mx-auto mb-4 text-slate-300" />
                    <CardDescription className="mb-6 text-base text-slate-500">
                        Henüz takip listene bir kitap eklemedin. <br />
                        Külliyattan bir kitap seçerek hemen başla.
                    </CardDescription>
                    <Button onClick={onAddClick} className="shadow-lg shadow-teal-500/20">
                        <Plus className="mr-2 h-4 w-4" /> Kitap Ekle
                    </Button>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {books.map((book, index) => {
                        const color = COLORS[index % COLORS.length];
                        const finishedCount = finishedStats[book.title] || 0;
                        const progress = getBookProgress(book);

                        return (
                            <Card
                                key={book.id}
                                className="group overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer border-slate-100"
                                onClick={() => onBookClick(book)}
                            >
                                <div className="p-4 flex flex-col gap-4">
                                    {/* Top Section */}
                                    <div className="flex items-start gap-4">
                                        <div
                                            style={{ background: color }}
                                            className="w-12 h-16 rounded-lg flex items-center justify-center text-white font-black text-xl shadow-lg shadow-teal-900/10 group-hover:scale-105 transition-transform"
                                        >
                                            {book.title.substring(0, 1)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <h3 className="font-bold text-lg text-slate-800 truncate mb-1">{book.title}</h3>
                                                <button
                                                    onClick={(e) => onRemove(e, book.id)}
                                                    className="p-1.5 text-slate-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-all ml-2"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>

                                            {finishedCount > 0 && (
                                                <div className="flex items-center gap-1">
                                                    <CheckCircle size={10} className="text-amber-500" />
                                                    <span className="text-[10px] uppercase font-black tracking-tighter text-amber-600">
                                                        {finishedCount} Kez Bitirildi
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Stats Section */}
                                    <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                                        <div className="space-y-0.5">
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Şu an okunan</div>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-2xl font-black text-slate-900 leading-tight">{progress}</span>
                                                <span className="text-xs font-bold text-slate-400">sayfa</span>
                                            </div>
                                        </div>

                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={(e) => onFinish(e, book)}
                                            className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 border-none font-bold text-xs h-9 px-4 rounded-xl shadow-sm transition-all active:scale-95"
                                        >
                                            <CheckCircle size={14} className="mr-2" />
                                            Bitirdim
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}

                    <Button
                        variant="ghost"
                        onClick={onAddClick}
                        className="w-full py-8 border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 hover:text-teal-600 hover:border-teal-200 hover:bg-teal-50/50 transition-all font-bold"
                    >
                        <Plus className="mr-2 h-5 w-5" /> Başka Kitap Ekle
                    </Button>
                </div>
            )}
        </div>
    );
}
