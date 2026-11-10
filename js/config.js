// Conexão com o banco da loja (Supabase).
// Deixe vazio para o site funcionar em modo de demonstração, com dados salvos só no navegador.
// Para ligar a loja real: Supabase → Project Settings → API → copie "Project URL" e a chave "publishable" (sb_publishable_...) ou a antiga "anon public".
// A chave "anon" é pública por natureza: a segurança fica nas regras do banco (supabase/migrations).
// NUNCA coloque aqui a chave "service_role" nem a "secret" (sb_secret_...).
export const SUPABASE_URL = 'https://iqpjrwjeoaufdfthrsvt.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_Tr5dUNTeMZMFbv8ITCDWmA_-uCyim8r';

// Pagamento on-line pelo Mercado Pago. Ligue (true) só depois de configurar, no Supabase,
// os segredos MP_ACCESS_TOKEN e MP_WEBHOOK_SECRET das Edge Functions (ver docs/pagamento.md).
// Desligado, o pedido é registrado e a loja combina o pagamento com a cliente.
export const PAGAMENTO_ONLINE = false;
