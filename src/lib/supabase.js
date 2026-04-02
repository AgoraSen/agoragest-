// src/lib/supabase.js
// ⚠️  SOSTITUISCI con le tue credenziali Supabase
// Le trovi in: Supabase Dashboard → Settings → API

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || 'https://TUO-PROGETTO.supabase.co'
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || 'TUA-ANON-KEY'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
