import { Home, Calendar, Users, User } from 'lucide-react';

function NavButton({ active, onClick, icon, label }) {
    return (
        <button className={`nav-item flex-1 ${active ? 'active' : ''}`} onClick={onClick}>
            <div className={`p-1 rounded-xl transition-all ${active ? 'bg-teal-50 animate-in zoom-in-95' : ''}`}>
                {icon}
            </div>
            <span className="font-bold tracking-tight">{label}</span>
        </button>
    );
}

export default function NavBar({ activeTab, setActiveTab }) {
    return (
        <div className="nav-bar">
            <NavButton active={activeTab === 'home'} onClick={() => setActiveTab('home')} icon={<Home size={22} />} label="Takip" />
            <NavButton active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} icon={<Calendar size={22} />} label="Geçmiş" />
            <NavButton active={activeTab === 'friends'} onClick={() => setActiveTab('friends')} icon={<Users size={22} />} label="Grup" />
            <NavButton active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={<User size={22} />} label="Profil" />
        </div>
    );
}
