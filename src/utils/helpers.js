/**
 * Bugünün tarihini YYYY-MM-DD formatında döndürür
 */
export const getTodayStr = () => new Date().toISOString().split('T')[0];

/**
 * Sayfa girişi validasyonu
 */
export const validatePagesInput = (value) => {
    const num = parseInt(value);
    if (isNaN(num)) return { valid: false, error: 'Geçerli bir sayfa sayısı giriniz' };
    if (num < 1) return { valid: false, error: 'En az 1 sayfa girmelisiniz' };
    if (num > 1000) return { valid: false, error: 'Günlük maksimum 1000 sayfa girebilirsiniz' };
    return { valid: true, value: num };
};

/**
 * İsim validasyonu
 */
export const validateName = (value) => {
    if (!value || value.trim().length === 0) return { valid: false, error: 'İsim gereklidir' };
    if (value.length > 100) return { valid: false, error: 'İsim 100 karakterden uzun olamaz' };
    // XSS koruması
    if (/<[^>]*>/.test(value)) return { valid: false, error: 'Geçersiz karakterler' };
    return { valid: true };
};

/**
 * Şifre validasyonu
 */
export const validatePassword = (pwd) => {
    if (pwd.length < 8) return { valid: false, error: 'Şifre en az 8 karakter olmalı' };
    return { valid: true };
};

/**
 * Benzersiz public ID oluşturucu
 * Format: TR + 4 rakam + X + 4 rakam (Örn: TR1234X5678)
 * Bu format 100.000.000 (yüz milyon) farklı kombinasyon sağlar.
 */
export const generatePublicId = () => {
    const r1 = Math.floor(Math.random() * 9000 + 1000);
    const r2 = Math.floor(Math.random() * 9000 + 1000);
    return `TR${r1}X${r2}`;
};

/**
 * YYYY-MM-DD formatında geçerli takvim tarihi doğrulaması
 */
export const validateDateInput = (dateStr) => {
  if (typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return { valid: false, error: 'Lütfen geçerli bir tarih seçiniz' }
  }
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  const isRealDate =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  if (!isRealDate) {
    return { valid: false, error: 'Geçersiz takvim tarihi' }
  }
  return { valid: true, value: dateStr }
}

/**
 * Kullanıcı, kitap ve gün bazlı tekil okuma kaydı doküman ID'si üretir
 */
export const getReadingLogDocId = (uid, bookId, dateStr) => `${uid}_${bookId}_${dateStr}`

/**
 * Kullanıcı ve kitap adına göre tekil hatim istatistiği doküman ID'si üretir
 */
export const getBookStatDocId = (uid, bookTitle) => `${uid}_${encodeURIComponent(bookTitle)}`

/**
 * Okuma kaydının son kitap bitirme (reset) zamanından sonra olup olmadığını kontrol eder
 */
export const isLogAfterReset = (log, lastReset) => {
  if (!lastReset) return true
  const resetTime = new Date(lastReset).getTime()
  if (Number.isNaN(resetTime)) return true

  if (log.date) {
    const resetDateStr = lastReset.split('T')[0]
    if (log.date < resetDateStr) return false
    if (log.date > resetDateStr) return true
    if (log.created_at) {
      const createdTime = new Date(log.created_at).getTime()
      if (!Number.isNaN(createdTime)) return createdTime > resetTime
    }
    return false
  }

  if (log.created_at) {
    const createdTime = new Date(log.created_at).getTime()
    return Number.isNaN(createdTime) ? true : createdTime > resetTime
  }

  return true
}

/**
 * Bir kitabın mevcut turdaki toplam okunan sayfasını loglardan hesaplar
 */
export const calculateBookProgress = (book, logs) => {
  let total = 0
  Object.values(logs || {}).flat().forEach((log) => {
    if (log.book_id === book.id && isLogAfterReset(log, book.last_reset)) {
      total += log.amount || 0
    }
  })
  return total
}
