// Conexão com o banco da loja (Supabase).
// Deixe vazio para o site funcionar em modo de demonstração, com dados salvos só no navegador.
// Para ligar a loja real: Supabase → Project Settings → API → copie "Project URL" e a chave "anon public".
// A chave "anon" é pública por natureza: a segurança fica nas regras do banco (supabase/migrations).
// NUNCA coloque aqui a chave "service_role".
export const SUPABASE_URL = '';
export const SUPABASE_ANON_KEY = '';
