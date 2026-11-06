#!/usr/bin/env node
// MCP server with the builder's two tools: change text in a source page, and publish the site.
//   node site-publish-mcp.mjs [--site DIR] [--stale-once FILE]
//
// The builder has no shell and no general tool for writing files. replace_text changes one
// existing file directly inside src/ and nothing else: no folders, no new files, no links.
// publish runs the site's own publish.mjs and takes no arguments. The site folder comes from
// the person starting the server, never from the agent asking.
//
// --stale-once FILE is for the seeded reject scenario only. The first publish leaves that one
// file in public/ as it was, the way a cached or partial deploy does, and still reports
// success. Later publishes are normal. The builder is not told. See scenarios/reject.md.
import { spawn } from 'node:child_process';
import { existsSync, lstatSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';

export const DEFAULT_SITE = fileURLToPath(new URL('../sample-site/', import.meta.url));
const TIMEOUT_MS = 20_000;
const MAX_OUTPUT = 4_000;

// Runs publish.mjs in siteDir with this same Node, and resolves with what it printed.
// keepStale names one file of public/ to put back as it was before this publish.
export async function publishSite(siteDir, keepStale) {
  const script = join(siteDir, 'publish.mjs');
  if (!existsSync(script)) throw new Error(`no publish.mjs in ${siteDir}`);
  const stalePath = keepStale ? join(siteDir, 'public', basename(keepStale)) : null;
  const before = stalePath && existsSync(stalePath) ? readFileSync(stalePath) : null;
  const text = await runPublish(script, siteDir);
  if (before) writeFileSync(stalePath, before);
  return text;
}

function runPublish(script, siteDir) {
  return new Promise((done, fail) => {
    const child = spawn(process.execPath, [script], { cwd: siteDir, timeout: TIMEOUT_MS });
    let out = '';
    const keep = (chunk) => {
      if (out.length < MAX_OUTPUT) out += chunk;
    };
    child.stdout.on('data', keep);
    child.stderr.on('data', keep);
    child.on('error', fail);
    child.on('close', (code) => {
      const text = out.slice(0, MAX_OUTPUT).trim();
      if (code === 0) done(text);
      else fail(new Error(`publish.mjs exited ${code}: ${text}`));
    });
  });
}

const MAX_SOURCE_BYTES = 200_000;

// Replaces text in one existing regular file directly inside siteDir/src. The name must be a
// bare file name, so no path can leave src/. `find` must occur exactly once unless all is set.
export function replaceText(siteDir, { file, find, replace, all }) {
  if (typeof file !== 'string' || file === '' || file !== basename(file) || file.startsWith('.')) {
    throw new Error('file must be the name of a file in src/, with no folder');
  }
  if (typeof find !== 'string' || find === '') throw new Error('find must be non-empty text');
  if (typeof replace !== 'string') throw new Error('replace must be text');
  const path = join(siteDir, 'src', file);
  if (!existsSync(path)) throw new Error(`no such file in src/: ${file}`);
  if (!lstatSync(path).isFile()) throw new Error(`not a regular file: ${file}`);
  const before = readFileSync(path, 'utf8');
  const count = before.split(find).length - 1;
  if (count === 0) throw new Error(`text not found in ${file}`);
  if (count > 1 && all !== true) throw new Error(`text occurs ${count} times in ${file}: set all to true, or give more context`);
  const after = before.split(find).join(replace);
  if (Buffer.byteLength(after) > MAX_SOURCE_BYTES) throw new Error('result is too large');
  writeFileSync(path, after);
  return `replaced ${count} occurrence${count === 1 ? '' : 's'} in src/${file}`;
}

const REPLACE_TOOL = {
  name: 'replace_text',
  description: 'Replace text in one existing page of src/. Nothing is live until publish runs.',
  inputSchema: {
    type: 'object',
    properties: {
      file: { type: 'string', description: 'File name in src/, such as visit.html. No folders.' },
      find: { type: 'string', description: 'Exact text to replace' },
      replace: { type: 'string', description: 'Text to put in its place' },
      all: { type: 'boolean', description: 'Replace every occurrence. Without it, find must occur exactly once.' },
    },
    required: ['file', 'find', 'replace'],
    additionalProperties: false,
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
};

const TOOL = {
  name: 'publish',
  description: 'Copy src/ to public/ so the running site shows the current source. Takes no arguments.',
  inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
};

// state.staleOnce is consumed by the first successful publish.
export async function handle(msg, siteDir, state = {}) {
  const { method, params } = msg;
  if (method === 'initialize') {
    return {
      protocolVersion: params?.protocolVersion ?? '2025-06-18',
      capabilities: { tools: {} },
      serverInfo: { name: 'proof-room-site-publish', version: '1.0.0' },
    };
  }
  if (method === 'ping') return {};
  if (method === 'tools/list') return { tools: [REPLACE_TOOL, TOOL] };
  if (method === 'tools/call') {
    if (params?.name === REPLACE_TOOL.name) {
      try {
        return { content: [{ type: 'text', text: replaceText(siteDir, params.arguments ?? {}) }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `replace failed: ${err.message}` }], isError: true };
      }
    }
    if (params?.name !== TOOL.name) throw Object.assign(new Error('unknown tool'), { code: -32602 });
    try {
      const text = await publishSite(siteDir, state.staleOnce);
      state.staleOnce = undefined;
      return { content: [{ type: 'text', text }] };
    } catch (err) {
      return { content: [{ type: 'text', text: `publish failed: ${err.message}` }], isError: true };
    }
  }
  throw Object.assign(new Error(`method not found: ${method}`), { code: -32601 });
}

function readStaleOnce() {
  const flag = process.argv.indexOf('--stale-once');
  if (flag === -1) return undefined;
  const raw = process.argv[flag + 1];
  if (!raw || raw !== basename(raw)) {
    console.error('site-publish-mcp: --stale-once needs a file name in public/, with no folder');
    process.exit(1);
  }
  return raw;
}

function readSite() {
  const flag = process.argv.indexOf('--site');
  if (flag === -1) return DEFAULT_SITE;
  const raw = process.argv[flag + 1];
  if (!raw) {
    console.error('site-publish-mcp: --site needs a folder');
    process.exit(1);
  }
  return resolve(raw);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const siteDir = readSite();
  const state = { staleOnce: readStaleOnce() };
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
      send({ id: msg.id, result: await handle(msg, siteDir, state) });
    } catch (err) {
      send({ id: msg.id, error: { code: err.code ?? -32603, message: err.message } });
    }
  });
}
