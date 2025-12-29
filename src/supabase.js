
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ncrgyyywcywqzymxgkkv.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jcmd5eXl3Y3l3cXp5bXhna2t2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwMzQ2MjUsImV4cCI6MjA4MjYxMDYyNX0.BSB8VBldcYKbJnopDapCxRXb15vJOtW8zE6Q0Y-1ftk'

export const supabase = createClient(supabaseUrl, supabaseKey)
