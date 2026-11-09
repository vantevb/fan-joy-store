// Conexão com o banco da loja (Supabase).
// Deixe vazio para o site funcionar em modo de demonstração, com dados salvos só no navegador.
// Para ligar a loja real: Supabase → Project Settings → API → copie "Project URL" e a chave "publishable" (sb_publishable_...) ou a antiga "anon public".
// A chave "anon" é pública por natureza: a segurança fica nas regras do banco (supabase/migrations).
// NUNCA coloque aqui a chave "service_role" nem a "secret" (sb_secret_...).
export const SUPABASE_URL = 'https://iqpjrwjeoaufdfthrsvt.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_Tr5dUNTeMZMFbv8ITCDWmA_-uCyim8r';
