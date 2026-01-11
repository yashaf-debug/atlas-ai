import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jhzpcfedanurpuwqgzyb.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoenBjZmVkYW51cnB1d3FnenliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2OTA3ODIsImV4cCI6MjA4MDI2Njc4Mn0.hp2WiUbOHdBK2zq_OWzp7MGkgEdzXWul8KbcRMkzE4s'

export const supabase = createClient(supabaseUrl, supabaseKey)
