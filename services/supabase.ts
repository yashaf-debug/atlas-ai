// import { createClient } from '@supabase/supabase-js'

// const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jhzpcfedanurpuwqgzyb.supabase.co'
// const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoenBjZmVkYW51cnB1d3FnenliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2OTA3ODIsImV4cCI6MjA4MDI2Njc4Mn0.hp2WiUbOHdBK2zq_OWzp7MGkgEdzXWul8KbcRMkzE4s'

// export const supabase = createClient(supabaseUrl, supabaseKey)

// MOCK SUPABASE FOR TESTING (Bypass Russia Block)
console.log('Using Mock Supabase Client');
export const supabase = {
    auth: {
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
        signInWithPassword: () => Promise.resolve({ error: { message: 'Supabase is disabled' } }),
        signUp: () => Promise.resolve({ error: { message: 'Supabase is disabled' } }),
        signOut: () => Promise.resolve({ error: null }),
    },
    from: () => ({
        select: () => ({
            eq: () => ({ single: () => Promise.resolve({ data: null, error: null }), maybeSingle: () => Promise.resolve({ data: null, error: null }) }),
            order: () => Promise.resolve({ data: [], error: null }),
            limit: () => Promise.resolve({ data: [], error: null })
        }),
        insert: () => Promise.resolve({ data: null, error: null }),
        update: () => Promise.resolve({ data: null, error: null }),
        upsert: () => Promise.resolve({ data: null, error: null }),
        delete: () => Promise.resolve({ data: null, error: null }),
    })
} as any;
