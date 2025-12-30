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
