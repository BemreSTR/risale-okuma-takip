import { useState } from 'react';
import { ChevronRight } from 'lucide-react';

export default function CalendarView({ logs }) {
    const [currentDate, setCurrentDate] = useState(new Date());

    // Takvim verileri
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();

    // Pazartesi'den başlaması için düzenleme
    const startingDayOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const emptyDays = Array.from({ length: startingDayOffset }, (_, i) => i);

    const [selectedDay, setSelectedDay] = useState(new Date().getDate());

    // Ay isimleri
    const monthNames = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

    const getLogForDay = (day) => {
        const m = month + 1;
        const mStr = m < 10 ? `0${m}` : m;
        const dStr = day < 10 ? `0${day}` : day;
        const dateKey = `${year}-${mStr}-${dStr}`;
        return logs[dateKey] || [];
    };

    const selectedLog = getLogForDay(selectedDay);
    const totalPagesForSelectedDay = selectedLog.reduce((acc, curr) => acc + curr.amount, 0);

    const changeMonth = (offset) => {
        setCurrentDate(new Date(year, month + offset, 1));
        setSelectedDay(1);
    };

    return (
        <div>
            <div className="header-row">
                <button onClick={() => changeMonth(-1)}><ChevronRight size={24} style={{ transform: 'rotate(180deg)' }} /></button>
                <h1 style={{ fontSize: '20px', margin: 0 }}>{monthNames[month]} {year}</h1>
                <button onClick={() => changeMonth(1)}><ChevronRight size={24} /></button>
            </div>

            <div className="card" style={{ display: 'block' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', marginBottom: '8px' }}>
                    {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(d => (
                        <div key={d} style={{ fontSize: '12px', color: '#94a3b8', paddingBottom: '8px' }}>{d}</div>
                    ))}

                    {/* Boş kutular (ayın ilk gününe kadar) */}
                    {emptyDays.map(d => <div key={`empty-${d}`}></div>)}

                    {days.map((day) => {
                        const dayLogs = getLogForDay(day);
                        const dayTotal = dayLogs.reduce((acc, c) => acc + c.amount, 0);
                        const hasReading = dayTotal > 0;
                        const isSelected = day === selectedDay;

                        // Bugünün tarihi mi?
                        const todayObj = new Date();
                        const isToday = todayObj.getDate() === day && todayObj.getMonth() === month && todayObj.getFullYear() === year;

                        // Renk Skalası (Yeşil ve Kırmızı Tonları)
                        let bg = 'transparent';
                        let text = '#1e293b';

                        if (hasReading) {
                            text = 'white';
                            if (dayTotal < 10) {
                                bg = '#a7f3d0'; // Emerald-200
                                text = '#064e3b';
                            }
                            else if (dayTotal < 30) {
                                bg = '#6ee7b7'; // Emerald-300
                                text = '#064e3b';
                            }
                            else if (dayTotal < 50) {
                                bg = '#34d399'; // Emerald-400
                                text = '#064e3b';
                            }
                            else if (dayTotal < 80) bg = '#059669'; // Emerald-600
                            else if (dayTotal < 100) bg = '#065f46'; // Emerald-800
                            else if (dayTotal < 150) bg = '#7767f8ff'; // Blue-700
                            else bg = '#1524cdff'; // Blue-900

                        } else if (isSelected) {
                            text = 'var(--primary-color)';
                        }

                        return (
                            <div
                                key={day}
                                onClick={() => setSelectedDay(day)}
                                style={{
                                    aspectRatio: '1/1',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                    borderRadius: '12px',
                                    border: isSelected ? '2px solid var(--primary-color)' : (isToday ? '1px dashed #cbd5e1' : 'none'),
                                    background: bg,
                                    color: text,
                                    cursor: 'pointer',
                                    position: 'relative',
                                    transition: 'background 0.2s'
                                }}>
                                <span style={{ fontSize: '14px', fontWeight: hasReading || isSelected ? 'bold' : 'normal' }}>{day}</span>
                                {hasReading && <span style={{ fontSize: '9px', opacity: 0.9 }}>{dayTotal}</span>}
                            </div>
                        );
                    })}
                </div>
            </div>

            <h3>{selectedDay} {monthNames[month]} Detayları</h3>
            {selectedLog.length > 0 ? (
                <div className="card" style={{ display: 'block', padding: '0', overflow: 'hidden' }}>
                    {selectedLog.map((log, i) => (
                        <div key={i} style={{
                            padding: '16px',
                            borderBottom: i !== selectedLog.length - 1 ? '1px solid #f1f5f9' : 'none',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary-color)' }}></div>
                                <span style={{ fontWeight: '500' }}>{log.title}</span>
                            </div>
                            <span style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>+{log.amount} sayfa</span>
                        </div>
                    ))}
                    <div style={{ padding: '12px', background: '#f8fafc', fontSize: '13px', color: '#64748b', textAlign: 'center', borderTop: '1px solid #e2e8f0' }}>
                        Toplam: {totalPagesForSelectedDay} sayfa
                    </div>
                </div>
            ) : (
                <div style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>
                    Bu tarihte okuma kaydı bulunmuyor.
                </div>
            )}
        </div>
    );
}
