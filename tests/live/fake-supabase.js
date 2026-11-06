// SOMENTE PARA TESTES. Substitui o cliente do Supabase no navegador, falando com tests/live/bridge.cjs.
(() => {
  const BRIDGE = window.__FJS_BRIDGE__;
  const KEY = 'fake-sb-user';
  const user = () => { try { return JSON.parse(sessionStorage.getItem(KEY)); } catch { return null; } };
  const post = (path, body, headers = {}) => fetch(BRIDGE + path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body || {}) }).then((r) => r.json());
  window.supabase = {
    createClient() {
      return {
        rpc(name, args) { const u = user(); return post('/rpc/' + name, args, u ? { 'x-user': u.id } : {}); },
        auth: {
          async getSession() { const u = user(); return { data: { session: u ? { user: u } : null } }; },
          async signInWithPassword({ email, password }) {
            const r = await post('/login', { email, password });
            if (r.error) return { data: null, error: r.error };
            sessionStorage.setItem(KEY, JSON.stringify(r.user));
            return { data: { user: r.user }, error: null };
          },
          async signOut() { sessionStorage.removeItem(KEY); return { error: null }; },
        },
      };
    },
  };
})();
