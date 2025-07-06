// إعدادات Supabase
const SUPABASE_CONFIG = {
    url: 'https://muybjakkabthiasapnzb.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11eWJqYWtrYWJ0aGlhc2FwbnpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA0NTk3MjUsImV4cCI6MjA2NjAzNTcyNX0.VK30D4Egk7lPRhirmWKm2QWzzKp3wgYn1UYvuuUWkA4',
    tables: {
        employees: 'employees',
        attendance: 'attendance',
        finances: 'finances',
        branches: 'branches'
    }
};

function validateSupabaseConfig() {
    const { url, anonKey } = SUPABASE_CONFIG;
    
    if (url === 'YOUR_SUPABASE_URL') {
        console.error('⚠️ يرجى تحديث SUPABASE URL في ملف supabase-config.js');
        return false;
    }
    
    if (anonKey === 'YOUR_SUPABASE_ANON_KEY') {
        console.error('⚠️ يرجى تحديث SUPABASE ANON KEY في ملف supabase-config.js');
        return false;
    }
    
    return true;
} 