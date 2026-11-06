// node --test "tools/*.test.mjs"
import assert from 'node:assert/strict';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { DEFAULT_SITE, handle, publishSite } from './site-publish-mcp.mjs';

let site;
let elsewhere;

before(() => {
  site = mkdtempSync(join(tmpdir(), 'proof-room-site-'));
  elsewhere = mkdtempSync(join(tmpdir(), 'proof-room-other-'));
  mkdirSync(join(site, 'src'));
  writeFileSync(join(site, 'src', 'index.html'), '<p>first</p>');
  copyFileSync(fileURLToPath(new URL('../sample-site/publish.mjs', import.meta.url)), join(site, 'publish.mjs'));
});

after(() => {
  rmSync(site, { recursive: true, force: true });
  rmSync(elsewhere, { recursive: true, force: true });
});

test('publishing copies the current source to public', async () => {
  const text = await publishSite(site);
  assert.match(text, /published 1 files/);
  assert.equal(readFileSync(join(site, 'public', 'index.html'), 'utf8'), '<p>first</p>');

  writeFileSync(join(site, 'src', 'index.html'), '<p>second</p>');
  assert.equal(readFileSync(join(site, 'public', 'index.html'), 'utf8'), '<p>first</p>', 'not live before publish');
  await publishSite(site);
  assert.equal(readFileSync(join(site, 'public', 'index.html'), 'utf8'), '<p>second</p>');
});

test('a tool call cannot choose the folder or the script', async () => {
  const res = await handle(
    { method: 'tools/call', params: { name: 'publish', arguments: { site: elsewhere, script: '/bin/sh', cwd: elsewhere } } },
    site,
  );
  assert.equal(res.isError, undefined);
  assert.match(res.content[0].text, /published 1 files/);
  assert.equal(existsSync(join(elsewhere, 'public')), false);
});

test('a folder with no publish script comes back as a tool error', async () => {
  const res = await handle({ method: 'tools/call', params: { name: 'publish' } }, elsewhere);
  assert.equal(res.isError, true);
  assert.match(res.content[0].text, /publish failed: no publish\.mjs/);
});

test('lists one tool that takes no arguments and rejects unknown methods', async () => {
  const { tools } = await handle({ method: 'tools/list' }, site);
  assert.deepEqual(tools.map((t) => t.name), ['publish']);
  assert.deepEqual(tools[0].inputSchema.properties, {});
  await assert.rejects(handle({ method: 'tools/call', params: { name: 'run' } }, site), /unknown tool/);
  await assert.rejects(handle({ method: 'resources/list' }, site), /method not found/);
});

test('the default folder is this repo sample site', () => {
  assert.equal(existsSync(join(DEFAULT_SITE, 'publish.mjs')), true);
});

test('the seeded fault leaves one page stale once, then publishes normally', async () => {
  writeFileSync(join(site, 'src', 'index.html'), '<p>old</p>');
  writeFileSync(join(site, 'src', 'visit.html'), '<p>old</p>');
  await publishSite(site);
  writeFileSync(join(site, 'src', 'index.html'), '<p>new</p>');
  writeFileSync(join(site, 'src', 'visit.html'), '<p>new</p>');

  const state = { staleOnce: 'visit.html' };
  const first = await handle({ method: 'tools/call', params: { name: 'publish' } }, site, state);
  assert.match(first.content[0].text, /published 2 files/);
  assert.equal(readFileSync(join(site, 'public', 'index.html'), 'utf8'), '<p>new</p>');
  assert.equal(readFileSync(join(site, 'public', 'visit.html'), 'utf8'), '<p>old</p>', 'stale after the first publish');

  await handle({ method: 'tools/call', params: { name: 'publish' } }, site, state);
  assert.equal(readFileSync(join(site, 'public', 'visit.html'), 'utf8'), '<p>new</p>', 'fresh after the second');
});

test('without the seeded fault every page is published', async () => {
  writeFileSync(join(site, 'src', 'visit.html'), '<p>newer</p>');
  await handle({ method: 'tools/call', params: { name: 'publish' } }, site);
  assert.equal(readFileSync(join(site, 'public', 'visit.html'), 'utf8'), '<p>newer</p>');
});
