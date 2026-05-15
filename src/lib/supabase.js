import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://lsmqssxxmnvroqsdquay.supabase.co'
const supabaseAnonKey = 'sb_publishable_LSe6hI5hrOWS6xhIl6yiTw_I975ZSC7'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
