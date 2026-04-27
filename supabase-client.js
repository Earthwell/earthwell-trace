const SUPABASE_URL     = 'https://zvjwjdokvxttezpthsvy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2andqZG9rdnh0dGV6cHRoc3Z5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMDExNTIsImV4cCI6MjA5Mjg3NzE1Mn0.GSj5BbZqcXUFEQukrl1D1SN2-NPksI-Bxc9MvUHIpNM';

window._sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
