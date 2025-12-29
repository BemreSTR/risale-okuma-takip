# Risale-i Nur Okuma Takip Sistemi Proje Planı

## Proje Vizyonu
Risale-i Nur medreselerinde yapılan günlük okumaların dijital ortamda, mobil uyumlu bir web uygulaması ile takip edilmesi. Geleneksel kağıt takibi yerine, kullanıcı ID tabanlı, hem bireysel hem de grup (görevli) takibine imkan veren bir sistem.

## Temel Özellikler

### 1. Kimlik ve Yetkilendirme
*   **Benzersiz ID:** Her kullanıcının kendine ait, paylaşılabilir bir ID'si olacak (örn: TR42X1).
*   **Roller:**
    *   **Bireysel Okuyucu:** Kendi verisini girer ve görür.
    *   **Takipçi (Görevli):** Başka kullanıcıların ID'lerini ekleyerek onların okumalarını salt okunur (veya onaylı) şekilde görür.

### 2. Kitap ve Okuma Mantığı (Önemli Revizyon)
*   **Sabit Külliyat:** Sistemde 14 temel Risale-i Nur kitabı tanımlı olacak.
*   **Sayfa Sayısı Bağımsızlık:** Farklı basımlar olduğu için "Toplam Sayfa / Okunan Sayfa = %" mantığı **KULLANILMAYACAK**.
*   **Süreç:**
    1.  Kullanıcı "Okuduklarım" listesine 14 kitaptan istediklerini ekler.
    2.  Her gün, o kitaptan kaç sayfa okuduğunu girer (örn: +20 sayfa).
    3.  Sistem kümülatif olarak o kitaptan toplam kaç sayfa okunduğunu tutar.
    4.  Kitap bittiğinde kullanıcı **"Kitabı Bitirdim"** butonuna basar.
    5.  Kitabın "Bitirme Sayısı" (Hatim) 1 artar ve sayfa sayacı sıfırlanıp veya arşivlenip yeni bir okuma başlatılabilir.

### 3. Arayüz Sayfaları

#### A. Ana Sayfa (Okuduklarım)
*   Kullanıcının şu an aktif olarak okuduğu kitapların listesi.
*   Kart Görünümü:
    *   Kitap Kapağı/İkonu ve Adı.
    *   "Bu okumada toplam okunan: X sayfa".
    *   Aksiyon: Kitaba tıklayınca "Sayfa Ekle" modalı açılır.
    *   Aksiyon: "Kitabı Bitir" butonu.
*   "Yeni Kitap Ekle" butonu (Listede olmayan 14 kitaptan birini seçmek için).

#### B. Takvim ve Geçmiş
*   Aylık takvim görünümü.
*   Her günün hücresinde "Toplam Okunan Sayfa Sayısı" yazar.
*   Güne tıklandığında detay açılır:
    *   Sözler: 15 sayfa
    *   Lemalar: 10 sayfa

#### C. Takip (Arkadaşlar/Talebeler)
*   "Takip Etmek İçin ID Ekle" butonu.
*   Eklenen kişilerin listesi ve bugün okuyup okumadıkları durumu.

#### D. Profil
*   Kullanıcı ID'si (Kopyalanabilir).
*   Toplam Bitirilen Kitap Sayıları.

## Teknik Plan (React + Vite)

### Veri Yapısı (Mock State)
```javascript
// Aktif Okunan Kitaplar
const activeBooks = [
  { id: 1, title: 'Sözler', currentPagesRead: 145, sessionStartDate: '2023-12-01' },
  { id: 3, title: 'Lemalar', currentPagesRead: 45, sessionStartDate: '2023-12-20' }
];

// Kitap İstatistikleri (Bitirilenler)
const bookStats = {
  'Sözler': { finishedCount: 2, totalPagesReadHistory: 1500 },
  'Mektubat': { finishedCount: 0, totalPagesReadHistory: 0 }
};

// Günlük Loglar
const dailyLogs = {
  '2023-12-29': [
    { bookTitle: 'Sözler', pages: 15 },
    { bookTitle: 'Lemalar', pages: 10 }
  ]
};
```

### Yapılacaklar Listesi
1.  [ ] `App.jsx` içerisindeki kitap veri yapısını yukarıdaki mantığa göre güncelle.
2.  [ ] İlerleme çubuklarını (Progress Bar) kaldır.
3.  [ ] "Kitap Ekle" modalını 14 kitaplık seçim listesine dönüştür.
4.  [ ] "Kitabı Bitir" fonksiyonu ekle (Sayacı istatistiğe aktar ve aktif listeden kaldır/sıfırla).
5.  [ ] Takvim sayfasını detaylı görünüme kavuştur.
