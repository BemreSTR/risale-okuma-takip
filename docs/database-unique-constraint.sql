-- Database Unique Constraint for Public ID
-- Bu script Supabase SQL Editor'da çalıştırılmalıdır

-- 1. Public ID column'ına unique constraint ekle
ALTER TABLE users
ADD CONSTRAINT users_public_id_key UNIQUE (public_id);

-- 2. Eğer var olan duplicate kayıtlar varsa temizlemek için (opsiyonel)
-- Bu kısmı sadece duplicate kayıtlar varsa çalıştırın

-- Duplicate public_id'leri bul
SELECT public_id, COUNT(*) as count
FROM users
GROUP BY public_id
HAVING COUNT(*) > 1;

-- 3. Database trigger ile otomatik public_id oluşturma (alternatif yaklaşım)
-- Bu, client-side race condition sorununu çözer

CREATE OR REPLACE FUNCTION generate_unique_public_id()
RETURNS TEXT AS $$
DECLARE
  new_id TEXT;
  id_exists BOOLEAN;
BEGIN
  -- Benzersiz bir ID bulunana kadar döngü
  LOOP
    -- TR + 4 rakam + X + 4 rakam formatında ID oluştur
    new_id := 'TR' || LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0') || 'X' || LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0');

    -- ID'nin benzersiz olup olmadığını kontrol et
    SELECT EXISTS(SELECT 1 FROM users WHERE public_id = new_id) INTO id_exists;

    -- Benzersiz ise döngüden çık
    IF NOT id_exists THEN
      EXIT;
    END IF;
  END LOOP;

  RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- 4. Otomatik public_id ataması için trigger
CREATE OR REPLACE FUNCTION set_public_id_before_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Eğer public_id boşsa otomatik oluştur
  IF NEW.public_id IS NULL OR NEW.public_id = '' THEN
    NEW.public_id := generate_unique_public_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger'ı users tablosuna ekle
DROP TRIGGER IF EXISTS set_public_id_trigger ON users;
CREATE TRIGGER set_public_id_trigger
BEFORE INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION set_public_id_before_insert();

-- 5. İndeks performans için
CREATE INDEX IF NOT EXISTS idx_users_public_id ON users(public_id);

-- Not: Bu trigger'ı ekledikten sonra client-side public_id oluşturma
-- kodunu kaldırabilirsiniz. Database otomatik olarak benzersiz ID atayacaktır.
