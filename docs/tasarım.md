### 2. Veritabanı Tasarımı (Mantıksal Yapı)

Kodlamaya başlamadan önce veri yapısını kurmak işin %50'sidir. Supabase üzerinde şöyle bir tablo yapısına ihtiyacın olacak:

1. **Users (Kullanıcılar):**
* `id`: UUID (Benzersiz kimlik)
* `username`: Ad Soyad
* `share_id`: 6 haneli özel kod (Başkalarının onu eklemesi için).


2. **Books (Kitap Listesi - Sabit Veri):**
* `id`: 1, 2, ... 14
* `title`: "Sözler", "Lem'alar", vb. (Görseldeki sıra).


3. **User_Books (Kullanıcının Kitaplığı):**
* `id`: UUID
* `user_id`: Kullanıcı ID'si
* `book_id`: Kitap ID'si
* `status`: "Okunuyor", "Bitti"
* `finish_count`: Kaç kere bitirildi (Sayaç).


4. **Daily_Logs (Günlük Okumalar - Takvim İçin):**
* `id`: UUID
* `user_id`: Kullanıcı
* `book_id`: Hangi kitap
* `page_count`: O gün okunan sayfa sayısı (örn: 15)
* `date`: Tarih (2025-12-29)


5. **Friendships (Takipleşme):**
* `observer_id`: Takip eden (Abi/Görevli)
* `target_id`: Takip edilen (Talebe)



---

### 3. Adım Adım Geliştirme Planı

#### 1. Aşama: Kurulum ve Arayüz İskeleti

* **VS Code Hazırlığı:**
* Eklentiler: *ES7+ React/Redux/React-Native snippets*, *Tailwind CSS IntelliSense*, *Prettier*.


* **Proje Oluşturma:** Terminale `npm create vite@latest rnk-takip -- --template react` yazarak projeyi kur.
* **Mobil Tasarım:** Ekranı mobil boyutunda düşün. Alt kısımda sabit bir navigasyon çubuğu (Bottom Navbar) olsun:
* 🏠 Ana Sayfa (Okuduklarım)
* 📅 Takvim
* 👥 Takip (Talebeler/Arkadaşlar)
* ⚙️ Profil



#### 2. Aşama: Kullanıcı Girişi ve ID Sistemi

* Supabase üzerinden Google veya E-mail ile girişi ayarla.
* Kullanıcı kayıt olduğunda ona otomatik olarak rastgele 6 haneli bir ID ata (Örn: `TR42X1`). Bu ID, başkalarının onu eklemesi için kullanılacak.

#### 3. Aşama: "Okuduklarım" Sayfası (Ana Fonksiyon)

* **Kitap Ekle:** Bir "+" butonu koy. Açılan listeden 14 kitaptan birini seçsin. Seçilen kitap "Şu an okunanlar" kartları arasına düşsün.
* **Veri Girişi:** Eklenen kitabın kartında "Bugün Oku" butonu olsun.
* Tıklayınca bir kutu açılsın: *"Kaç sayfa okudun?"*
* Girilen sayıyı `Daily_Logs` tablosuna kaydet.


* **Kitap Bitirme:** Kartın üzerinde "Kitabı Bitirdim" butonu olsun. Buna basınca:
* `User_Books` tablosundaki sayaç 1 artar.
* Kitap "Okunanlar" listesinden "Geçmiş/Bitenler" listesine düşer veya sıfırlanıp devam eder.



#### 4. Aşama: Takvim Entegrasyonu

* `react-day-picker` veya `react-calendar` kütüphanesini kur.
* Takvimde her günün kutucuğuna veritabanından o tarihe ait `Daily_Logs` verilerini çek.
* **Toplam Alma:** O gün farklı kitaplardan toplam kaç sayfa okunmuşsa (Örn: 5 sayfa Sözler + 10 sayfa Lemalar = 15), takvimde o günün altında küçük bir rozet (badge) ile "15" yazsın.
* Güne tıklayınca altta detay açılsın: "Sözler: 5 syf, Lemalar: 10 syf".

#### 5. Aşama: Takip Sistemi (Medrese Usulü)

* "Öğrenci Ekle" input alanı yap. Buraya karşı tarafın ID'sini girince (örn: `Ahmet-12345`), veritabanında eşleşme varsa listeye ekle.
* Listede ekli olan kişinin ismine tıklayınca, senin gördüğün takvim ekranının aynısını (read-only / sadece okunabilir) modda gör. Böylece o gün okuyup okumadığını denetleyebilirsin.

---

### 5. Kritik Bir Tavsiye: PWA (Uygulamaya Dönüştürme)

Bu sistemi web sitesi olarak yapacaksın ama kullanıcılar her seferinde tarayıcıya girmesin. `vite-plugin-pwa` eklentisini projene dahil et.

Böylece kullanıcı siteye girdiğinde **"Ana Ekrana Ekle"** butonu çıkar. Eklediklerinde, sanki App Store'dan indirilmiş gerçek bir uygulama gibi ikonla açılır, tarayıcı çubuğu gözükmez ve tam ekran çalışır.




---
1. Veritabanı Şeması (Database Schema)
Senin senaryonda en kritik kısım burası. "Hangi sayfadayım" bilgisini tutmak yerine, "Bugün ne kadar okudum" verisini tutacağız.

Tablo 1: users (Kullanıcılar)
id: (Primary Key, UUID)

username: (String)

friend_code: (String, Unique) -> Başkalarının eklemesi için kısa kod (Örn: #4582).

created_at: (Timestamp)

Tablo 2: books (Sabit Kitap Listesi)
Bu tabloyu veritabanına baştan manuel girebilirsin veya kod içinde sabit bir JSON array (sabit liste) olarak tutabilirsin. Veritabanında olması raporlama için daha iyidir.

id: (Primary Key, Integer) -> 1'den 14'e kadar.

title: (String) -> "Sözler", "Lem'alar", "Mektubat"...

order: (Integer) -> Okuma sırasını belirlemek için (Görseldeki sıra).

Tablo 3: daily_reads (Günlük Okuma Logları - Takvim İçin)
Takvimde "O gün ne kadar okudu?" sorusunun cevabı burasıdır.

id: (Primary Key, UUID)

user_id: (Foreign Key -> users.id)

book_id: (Foreign Key -> books.id veya Integer)

page_count: (Integer) -> O giriş için okunan sayfa sayısı (Örn: 15).

read_date: (Date) -> Okumanın yapıldığı tarih (Saat önemli değil, gün bazlı).

Not: Bir kullanıcı aynı gün aynı kitaba birden fazla kayıt girebilir, sorgu yaparken SUM(page_count) ile toplayacaksın.

Tablo 4: book_completions (Kitap Bitirme Sayaçları)
Kullanıcı "Kitabı Bitirdim" butonuna bastığında burası güncellenir.

id: (Primary Key, UUID)

user_id: (Foreign Key -> users.id)

book_id: (Foreign Key -> books.id)

finish_count: (Integer) -> Varsayılan 0. Her bitişte +1 artacak.

Tablo 5: follows (Takipleşme/Medrese Sistemi)
observer_id: (Foreign Key -> users.id) -> Takip eden (Abi/Hoca).

target_id: (Foreign Key -> users.id) -> Takip edilen (Talebe).

2. VS Code Geliştirme Planı (Mobile First Odaklı)
Web sitesi olacak ancak %90 telefondan girilecek. Bu yüzden VS Code'da kodlarken tarayıcının geliştirici araçlarını (F12) açıp sürekli "Mobile View" modunda çalışmalısın.

Aşama 1: İskelet ve Navigasyon (Bottom Bar)
Mobilde en rahat kullanım başparmak ile alt taraftadır. Web sitesi olsa bile "App-like" (Uygulama benzeri) hissettirmeli.

Yapılacak: Ekranın en altına sabit (position: fixed; bottom: 0;) bir navigasyon çubuğu kodla.

Linkler:

Okuma: Ana ekran, kitapların olduğu yer.

Takvim: Geçmiş okumalar.

Talebelerim: Takip edilen kişilerin listesi.

Profil: ID görüntüleme ve Ayarlar.

Aşama 2: "Okuduklarım" Ekranı (Core Logic)
Kullanıcının en çok vakit geçireceği yer.

UI Tasarımı: 14 kitabı alt alta liste veya 2'li grid (kareler) halinde listele. Her kartta kitabın adı ve şu ana kadar kaç kere bitirildiği (finish_count) yazsın.

Aksiyon 1 (Veri Girişi): Kitap kartına tıklandığında veya üzerindeki bir "+" butonuna basıldığında bir Modal (Popup) açtır.

Input: "Bugün kaç sayfa okudun?" (Sadece sayı girilsin).

Kaydet: Girilen sayıyı, o anki tarihle daily_reads tablosuna ekle.

Aksiyon 2 (Bitti Butonu): Kartın köşesine belirgin bir "Bitirdim" butonu koy.

Logic: Tıklandığında book_completions tablosundaki ilgili kitabın sayacını 1 artır ve kullanıcıya tebrik mesajı göster (Confetti efekti vb. motivasyon için iyi olur).

Aşama 3: Takvim Sayfası
Burası kullanıcının muhasebe yapacağı yer.

Görünüm: Mobil ekranda klasik kare takvim zor olabilir. Bunun yerine "Haftalık Şerit" veya "Aylık Liste" görünümü daha kullanışlı olabilir. Ama klasik takvim yapacaksan kütüphane kullanman işini kolaylaştırır.

Veri Çekme Mantığı (Logic):

Veritabanından o aya ait daily_reads verilerini çek.

Verileri tarihe göre grupla (GROUP BY read_date).

Her tarih için SUM(page_count) işlemini yap.

Takvimde o günün hücresine toplam sayfa sayısını yaz (Örn: 25).

Detay: Takvimde bir güne tıklandığında ekranın altında bir "Bottom Sheet" (alttan açılan panel) çıksın ve detayları göstersin: Sözler: 10 syf, Lemalar: 15 syf.

Aşama 4: Arkadaş/Talebe Takip Sistemi
Medrese usulü "çetele" takibinin dijital hali.

Ekleme: "Arkadaş Ekle" input'una karşı tarafın friend_code'u girilecek. Eşleşirse follows tablosuna kayıt atılacak.

Görüntüleme: Listeden bir isme tıklandığında, Aşama 3'te yaptığın Takvim bileşenini (Component) çağıracaksın. Tek fark; bu sefer user_id parametresi olarak kendi ID'sini değil, tıkladığı arkadaşının ID'sini göndereceksin. Böylece onun verilerini görecek (Read-only modda).

3. Mobil Uyum İçin Kritik CSS İpuçları
Web sitesi yapıyorsun ama mobilde uygulama gibi hissettirmek için index.html dosyanın <head> kısmına ve CSS'ine şunları mutlaka ekle:

Zoom Engelleme: Inputlara tıklayınca ekranın yakınlaşmasını (zoom) engellemek için:

HTML

<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0">
Dokunma Alanları: Butonların ve linklerin parmakla rahat basılabilir olması için CSS'te padding değerlerini yüksek tut veya min-height: 44px kuralını uygula.

Input Tipleri: Sayfa sayısı gireceği input'un tipini mutlaka type="number" veya inputmode="numeric" yap. Böylece telefonda direkt rakam klavyesi açılır, kullanıcıyı yormazsın.

Bu planla ilerlersen karmaşık sayfa takipleriyle uğraşmadan, tam istediğin amaca hizmet eden temiz bir yapı kurmuş olursun.