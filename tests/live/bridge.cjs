// SOMENTE PARA TESTES. Imita a API do Supabase (RPC + login) usando um PostgreSQL local,
// executando cada chamada com o papel "anon" ou "authenticated", como o Supabase faz.
// Uso: node tests/live/bridge.cjs <porta> <banco>   (variáveis PGHOST/PGPORT/PGUSER para o psql)
const http = require('http');
const { execFileSync } = require('child_process');

const PORT = Number(process.argv[2] || 8099);
const DB = process.argv[3] || 'fanjoy_live';
const USERS = {
  'lilian@fanjoy.test': { password: 'senha-lilian', id: '00000000-0000-0000-0000-00000000000a' },
  'cliente@fanjoy.test': { password: 'senha-cliente', id: '00000000-0000-0000-0000-00000000000b' },
};

const lit = (v) => {
  if (v === null || v === undefined) return 'null';
  const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
  const tag = '$q' + Math.random().toString(36).slice(2, 8) + '$';
  return tag + s + tag;
};

function runRpc(name, args, userId) {
  if (!/^[a-z_]+$/.test(name)) throw new Error('nome inválido');
  const params = Object.entries(args || {}).map(([k, v]) => {
    if (!/^p(_[a-z]+)?$/.test(k)) throw new Error('parâmetro inválido');
    return `${k} => ${lit(v)}`;
  }).join(', ');
  const claims = userId ? JSON.stringify({ sub: userId, role: 'authenticated' }) : '';
  const sql = `set role ${userId ? 'authenticated' : 'anon'};
select set_config('request.jwt.claims', ${lit(claims)}, false);
select '@@' || coalesce(public.${name}(${params})::text, 'null');`;
  try {
    const out = execFileSync('psql', ['-X', '-q', '-At', '-v', 'ON_ERROR_STOP=1', '-d', DB, '-c', sql], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    const line = out.split('\n').find((l) => l.startsWith('@@')) || '@@null';
    const raw = line.slice(2);
    return { data: raw === '' ? null : JSON.parse(raw), error: null };
  } catch (e) {
    const msg = String(e.stderr || e.message).match(/ERROR:\s+(.*)/);
    return { data: null, error: { message: msg ? msg[1] : String(e.stderr || e.message) } };
  }
}

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type, x-user');
  if (req.method === 'OPTIONS') { res.end(); return; }
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    res.setHeader('content-type', 'application/json');
    const input = body ? JSON.parse(body) : {};
    if (req.url === '/login') {
      const u = USERS[String(input.email).toLowerCase()];
      if (!u || u.password !== input.password) { res.end(JSON.stringify({ error: { message: 'Invalid login credentials' } })); return; }
      res.end(JSON.stringify({ user: { id: u.id, email: input.email } }));
      return;
    }
    const m = req.url.match(/^\/rpc\/([a-z_]+)$/);
    if (!m) { res.statusCode = 404; res.end('{}'); return; }
    res.end(JSON.stringify(runRpc(m[1], input, req.headers['x-user'] || '')));
  });
}).listen(PORT, () => console.log(`ponte de testes em http://localhost:${PORT} (banco ${DB})`));
