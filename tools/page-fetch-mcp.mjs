#!/usr/bin/env node
// MCP server with one tool: fetch a page of the sample site, as the verifier's way to see it.
//   node page-fetch-mcp.mjs [--port N]     or     PORT=N node page-fetch-mcp.mjs
//
// The verifier has no shell and no web tools. This is its only route to the site, and it is
// narrow on purpose: GET only, 127.0.0.1 and this one port only, no redirects, and a size
// cap. The port comes from the person starting the server, never from the agent asking. The
// FETCHED time is this server's clock, so the verifier does not need a command to get one.
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';

export const DEFAULT_PORT = 4180;
const MAX_BYTES = 1_000_000;
const TIMEOUT_MS = 5_000;

// Returns the URL to fetch, or throws. The path is resolved against a fixed origin and the
// result compared, so "//evil.example/", "http://other/" and "@evil.example" cannot leave it.
export function pageUrl(path, port) {
  if (typeof path !== 'string' || !path.startsWith('/')) throw new Error('path must start with /');
  const origin = `http://127.0.0.1:${port}`;
  const url = new URL(path, origin);
  if (url.origin !== origin) throw new Error(`path leaves ${origin}`);
  return url;
}

export async function fetchPage(path, port) {
  const url = pageUrl(path, port);
  const res = await fetch(url, {
    method: 'GET',
    redirect: 'manual',
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const buf = Buffer.from(await res.arrayBuffer());
  const body = buf.subarray(0, MAX_BYTES).toString('utf8');
  const truncated = buf.length > MAX_BYTES ? ' truncated' : '';
  const fetched = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  return `GET ${url.pathname}${url.search} -> ${res.status}${truncated}\nFETCHED: ${fetched}\n\n${body}`;
}

const TOOL = {
  name: 'fetch_page',
  description: 'GET one page of the running sample site and return its status, the time it was fetched, and its body.',
  inputSchema: {
    type: 'object',
    properties: { path: { type: 'string', description: 'Path on the site, such as /visit.html' } },
    required: ['path'],
    additionalProperties: false,
  },
  annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
};

export async function handle(msg, port) {
  const { method, params } = msg;
  if (method === 'initialize') {
    return {
      protocolVersion: params?.protocolVersion ?? '2025-06-18',
      capabilities: { tools: {} },
      serverInfo: { name: 'proof-room-page-fetch', version: '1.0.0' },
    };
  }
  if (method === 'ping') return {};
  if (method === 'tools/list') return { tools: [TOOL] };
  if (method === 'tools/call') {
    if (params?.name !== TOOL.name) throw Object.assign(new Error('unknown tool'), { code: -32602 });
    try {
      const text = await fetchPage(params.arguments?.path, port);
      return { content: [{ type: 'text', text }] };
    } catch (err) {
      return { content: [{ type: 'text', text: `fetch failed: ${err.message}` }], isError: true };
    }
  }
  throw Object.assign(new Error(`method not found: ${method}`), { code: -32601 });
}

function readPort() {
  const flag = process.argv.indexOf('--port');
  const raw = flag === -1 ? process.env.PORT : process.argv[flag + 1];
  if (raw === undefined || raw === '') return DEFAULT_PORT;
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error(`page-fetch-mcp: invalid port "${raw}": use a whole number from 1 to 65535`);
    process.exit(1);
  }
  return port;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = readPort();
  const send = (obj) => process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', ...obj })}\n`);
  createInterface({ input: process.stdin }).on('line', async (line) => {
    if (!line.trim()) return;
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      send({ id: null, error: { code: -32700, message: 'parse error' } });
      return;
    }
    if (msg.id === undefined) return; // A notification takes no reply.
    try {
      send({ id: msg.id, result: await handle(msg, port) });
    } catch (err) {
      send({ id: msg.id, error: { code: err.code ?? -32603, message: err.message } });
    }
  });
}
