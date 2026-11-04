// Serves public/ and nothing else, on 127.0.0.1.
//   node server.mjs [--port N]     or     PORT=N node server.mjs
// Files are read on every request and marked no-store, so a fetch shows what is
// in public/ right now.
import { createServer } from 'node:http';
import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { extname, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_PORT = 4180;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

function fail(message) {
  console.error(`server: ${message}`);
  process.exit(1);
}

function readPort() {
  const flag = process.argv.indexOf('--port');
  const raw = flag === -1 ? process.env.PORT : process.argv[flag + 1];
  if (raw === undefined || raw === '') return DEFAULT_PORT;
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    fail(`invalid port "${raw}": use a whole number from 1 to 65535`);
  }
  return port;
}

const port = readPort();
const publicDir = fileURLToPath(new URL('./public', import.meta.url));

if (!existsSync(join(publicDir, 'index.html'))) {
  fail(`nothing to serve in ${publicDir}. Run "node publish.mjs" first.`);
}
const root = realpathSync(publicDir);

// Returns a file path inside public/, or null for anything else. The realpath
// check covers both ../ in the URL and symlinks pointing out of public/.
function resolveFile(pathname) {
  try {
    let target = realpathSync(join(root, decodeURIComponent(pathname)));
    if (target !== root && !target.startsWith(root + sep)) return null;
    if (statSync(target).isDirectory()) target = realpathSync(join(target, 'index.html'));
    if (!target.startsWith(root + sep)) return null;
    return statSync(target).isFile() ? target : null;
  } catch {
    return null;
  }
}

const server = createServer((req, res) => {
  const send = (status, headers, body) => {
    res.writeHead(status, { 'Cache-Control': 'no-store', ...headers });
    res.end(req.method === 'HEAD' ? undefined : body);
  };

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    send(405, { Allow: 'GET, HEAD', 'Content-Type': 'text/plain; charset=utf-8' }, 'Method not allowed\n');
    return;
  }

  const text = { 'Content-Type': 'text/plain; charset=utf-8' };
  let pathname;
  try {
    pathname = new URL(req.url, 'http://localhost').pathname;
  } catch {
    send(400, text, 'Bad request\n');
    return;
  }

  const file = resolveFile(pathname);
  if (!file) {
    send(404, text, 'Not found\n');
    return;
  }
  // A publish can remove the file after resolveFile found it.
  let body;
  try {
    body = readFileSync(file);
  } catch {
    send(404, text, 'Not found\n');
    return;
  }
  send(200, { 'Content-Type': TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream' }, body);
});

server.on('error', (err) => {
  fail(err.code === 'EADDRINUSE' ? `port ${port} is in use. Pick another with --port.` : err.message);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`serving ${root} at http://127.0.0.1:${port}/`);
});
