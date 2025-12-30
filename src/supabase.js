import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Geliştirme ortamında hata fırlat, production'da konsola yaz
if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables. Please check your .env.local file.')
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? 'SET' : 'MISSING')
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseKey ? 'SET' : 'MISSING')
}

// Supabase client - boş URL/key ile de oluşturulabilir (ama çalışmaz)
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder-key'
)
