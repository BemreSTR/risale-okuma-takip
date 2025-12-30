# 📖 Risale-i Nur Okuma Takip Sistemi

Risale-i Nur medreselerinde günlük kitap okumalarını dijital ortamda takip etmek için geliştirilmiş mobil uyumlu web uygulaması.

## ✨ Özellikler

### 🔐 Kimlik Doğrulama
- Supabase Authentication ile e-posta/şifre girişi
- Her kullanıcı için benzersiz Public ID (örn: `TR1234X5678`)
- Başka kullanıcıların ID'si ile takip sistemi

### 📚 Okuma Takibi
- **14 Temel Risale-i Nur Kitabı** desteği
- Günlük sayfa ekleme
- Kitap başına ilerleme takibi
- "Kitabı Bitirdim" ile hatim sayacı
- Manuel hatim düzenleme

### 📅 Takvim Görünümü
- Aylık takvim gösterimi
- Her gün için toplam okunan sayfa
- Güne tıklayınca detaylı okuma kaydı
- Renk skalası (okunan sayfa sayısına göre)

### 👥 Takip Sistemi (Medrese Usulü)
- Grup oluşturma (örn: "Liseli Talebeler")
- Public ID ile talebe ekleme
- Talebe okumalarını görüntüleme
- Gruplar arası üye taşıma

### 👤 Profil
- Kullanıcı adı gösterimi
- Paylaşılabilir Kullanıcı ID
- Toplam hatim sayısı
- Karanlık mod
- 21:00 okuma hatırlatıcı bildirimi

### 📱 PWA Desteği
- Ana ekrana yükleme
- İkon ile başlatma
- Offline çalışma desteği (yakında)

---

## 🛠️ Kurulum

### Gereksinimler
- Node.js 18+
- pnpm

### Adımlar

```bash
# Projeyi klonla
git clone <repo-url>
cd okuma-takip

# Bağımlılıkları yükle
pnpm install

# Çalıştır
pnpm dev
```

Tarayıcıda `http://localhost:5173` adresini açın.

---

## 🗄️ Veritabanı (Supabase)

### Tablolar

| Tablo | Açıklama |
|-------|----------|
| `users` | Kullanıcı bilgileri, public_id |
| `books` | Aktif okunan kitaplar |
| `reading_logs` | Günlük okuma kayıtları |
| `book_stats` | Hatim sayaçları |
| `following_groups` | Grup ve üyeler (JSONB) |

---

## 🎨 Teknolojiler

- **Frontend:** React 19 + Vite 7
- **UI:** shadcn/ui (Radix) + Tailwind CSS
- **Auth:** Supabase Auth
- **Database:** Supabase (PostgreSQL + Realtime)
- **Icons:** Lucide React
- **PWA:** vite-plugin-pwa

---

## 📱 Ekran Görüntüleri

### Ana Sayfa
Kitaplarınızı listeleyin, sayfa ekleyin ve bitirdiğinizde işaretleyin.

### Takvim
Geçmiş okumalarınızı günlük olarak görün.

### Arkadaşlar
Talebelerinizi gruplara ayırarak okumalarını takip edin.

### Profil
Hatimlerinizi görün ve ayarları yönetin.

---

## 📄 Lisans

Bu proje açık kaynak kodludur.

---

## 💬 Vecize

*"İman hakikati öyle bir çekirdektir ki, eğer tecessüm etse, bir cennet-i hususiye ondan çıkar, o çekirdeğin şecere-i tûbası olur."*

— **Bediüzzaman Said Nursî**
