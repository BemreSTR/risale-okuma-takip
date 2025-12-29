# Risale-i Nur Takip Sistemi - Proje Planı

Risale-i Nur medreselerindeki okuma takibi ihtiyacına yönelik, mobil uyumlu, ID bazlı takip sistemine sahip web uygulaması.

## 1. Proje Vizyonu ve Mantığı
Geleneksel "toplam sayfa üzerinden ilerleme" takibi yerine, **"Süreklilik ve Bitirme Bazlı"** bir sistem.
*   **Amaç:** İstikrarı sağlamak (her gün en az 1 saat/miktar okuma).
*   **Temel Birim:** Günlük okunan sayfa miktarı veya süre.
*   **Kitap Takibi:** Kitaplar "bitirilme sayısı" ile takip edilir. Sayfa sayısı sabit değildir (farklı basımlar).

## 2. Kullanıcı Rolleri ve Özellikler
Her kullanıcının tek bir rolü vardır (Standart Kullanıcı), ancak başkalarını takip edebilir.
*   **Kişisel ID:** Her kullanıcının benzersiz bir `Paylaşım Kodu` (örn: TR42X1) olacak.
*   **Takip Etme:** Kullanıcılar, başkalarının ID'sini girerek onların günlük okumalarını görebilir (Görevli/Talebe ilişkisi).

## 3. Sayfa ve Modül Yapısı

### A. Ana Sayfa: "Okuduklarım"
Kullanıcının o an okumakta olduğu (aktif) kitapların listesi.
*   **Görünüm:** Kart yapısı.
*   **Kart İçeriği:** Kitap adı (örn: Sözler), Bugün okunan miktar, "Kitap Bitti" butonu.
*   **Aksiyonlar:**
    1.  **Günlük Okuma Ekle:** Seçilen kitaba miktar (sayfa) girilir. (örn: +15 sayfa).
    2.  **Kitap Bitti İşa retle:** Kitabı bitirince basılır. Kitabın "Bitirilme Sayısı" 1 artar. Kitap listeden kalkmaz, sıfırdan başlar gibi devam eder veya arşivlenip yeniden eklenir.
    3.  **Yeni Kitap Başla:** "Kitap Ekle" butonu ile 14 kitaptan biri seçilip listeye eklenir.

### B. Takvim ve İstatistik
Geçmiş performansın görselleşmiş hali.
*   **Takvim Görünümü:** Her gün hücresinde o gün okunan *toplam* miktar yazar.
*   **Detay:** Bir güne tıklayınca, o gün hangi kitaptan kaç sayfa okunduğu detayı açılır.
*   **Haftalık/Aylık Özet:** Toplam okuma hedefine (istikrar) ne kadar uyulduğu.

### C. Arkadaşlar (Talebe Takip)
Başkalarının okumalarını izleme ekranı.
*   **Arkadaş Ekle:** ID (Kod) girerek kişi ekleme.
*   **Liste Görünümü:** Eklenen kişilerin isimleri ve "Bugünlük Durumu" (Okudu / Okumadı / Şu kadar okudu).

### D. Profil
*   Kullanıcı ID'si (Kopyalanabilir).
*   Ayarlar.

## 4. Veri Modeli (Schema Taslağı)

**Kitap Listesi (Sabit Data):**
1. Sözler, 2. Mektubat, 3. Lemalar, 4. Şualar, 5. Asa-yı Musa, 6. Barla Lahikası, 7. Kastamonu Lahikası, 8. Emirdağ Lahikası, 9. Tarihçe-i Hayat, 10. İşaratü'l İcaz, 11. Mesnevi-i Nuriye, 12. Sikke-i Tasdik-i Gaybi, 13. Muhakemat, 14. İman ve Küfür Muvazeneleri.

**Veritabanı Yapısı (Firestore Önerisi):**
*   `users`: { id, name, friendCode, following: [user_ids] }
*   `active_books`: { userId, bookId, startDate, totalReadAmount }
*   `daily_logs`: { userId, date, details: [{ bookId, amount }], totalAmount }
*   `finish_logs`: { userId, bookId, finishDate }

## 5. Teknik Yol Haritası (Fazlar)

### Faz 1: Frontend Prototip (Mevcut Aşama)
*   [x] Proje Kurulumu (Vite + React + Pnpm).
*   [ ] "Okuduklarım" sayfasını yeni mantığa (Sayfa sayısı takibi yerine günlük miktar girişi) göre güncelleme.
*   [ ] "Kitap Bitti" sayacı ve mantığının eklenmesi.
*   [ ] 14 Kitaplık sabit listenin tanımlanması.
*   [ ] Takvim sayfasının dummy data ile hazırlanması.

### Faz 2: Backend ve Veri Bağlantısı
*   [ ] Firebase Entegrasyonu (Auth & Firestore).
*   [ ] Gerçek kayıt ve giriş işlemleri.
*   [ ] Verilerin buluta kaydedilmesi.

### Faz 3: Sosyal Özellikler
*   [ ] ID oluşturma ve paylaşma sistemi.
*   [ ] Arkadaş ekleme ve veri çekme.

## 6. Görev Listesi (Hemen Yapılacaklar)
1.  `App.jsx` içindeki kitap veri yapısını değiştir: `totalPages` kaldır, `finishCount` (bitirme sayısı) ekle.
2.  İlerleme çubuğunu (progress bar) kaldır, yerine günlük girilen veriyi göster.
3.  "Kitap Ekle" modalına 14 kitaplık listeyi koy.
4.  "Kitap Bitti" butonunu ekle.