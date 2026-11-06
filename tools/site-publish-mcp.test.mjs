// node --test "tools/*.test.mjs"
import assert from 'node:assert/strict';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { DEFAULT_SITE, handle, publishSite, replaceText } from './site-publish-mcp.mjs';

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

test('lists the two tools, publish takes no arguments, and unknown methods are rejected', async () => {
  const { tools } = await handle({ method: 'tools/list' }, site);
  assert.deepEqual(tools.map((t) => t.name), ['replace_text', 'publish']);
  assert.deepEqual(tools[1].inputSchema.properties, {});
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

test('replace_text changes one page of src and nothing is live until publish', async () => {
  writeFileSync(join(site, 'src', 'index.html'), '<p>Open 7 to 4</p>');
  await publishSite(site);
  const res = await handle({ method: 'tools/call', params: { name: 'replace_text', arguments: { file: 'index.html', find: '7 to 4', replace: '8 to 6' } } }, site);
  assert.equal(res.isError, undefined);
  assert.match(res.content[0].text, /replaced 1 occurrence in src\/index\.html/);
  assert.equal(readFileSync(join(site, 'src', 'index.html'), 'utf8'), '<p>Open 8 to 6</p>');
  assert.equal(readFileSync(join(site, 'public', 'index.html'), 'utf8'), '<p>Open 7 to 4</p>');
});

test('replace_text cannot reach a file outside src', () => {
  writeFileSync(join(site, 'outside.txt'), 'keep');
  writeFileSync(join(elsewhere, 'target.txt'), 'keep');
  symlinkSync(join(elsewhere, 'target.txt'), join(site, 'src', 'link.html'));
  const escapes = ['../outside.txt', '../publish.mjs', 'sub/page.html', '/etc/hosts', join(site, 'outside.txt'), '..', '.', '', '.hidden', 'link.html', 'missing.html'];
  for (const file of escapes) {
    assert.throws(() => replaceText(site, { file, find: 'keep', replace: 'changed' }), Error, JSON.stringify(file));
  }
  assert.equal(readFileSync(join(site, 'outside.txt'), 'utf8'), 'keep');
  assert.equal(readFileSync(join(elsewhere, 'target.txt'), 'utf8'), 'keep');
  rmSync(join(site, 'src', 'link.html'));
});

test('replace_text needs one clear match, and a bad call comes back as a tool error', async () => {
  writeFileSync(join(site, 'src', 'visit.html'), '<p>48 hours</p><p>48 hours</p>');
  assert.throws(() => replaceText(site, { file: 'visit.html', find: '48 hours', replace: '72 hours' }), /occurs 2 times/);
  assert.throws(() => replaceText(site, { file: 'visit.html', find: 'absent', replace: 'x' }), /not found/);
  assert.match(replaceText(site, { file: 'visit.html', find: '48 hours', replace: '72 hours', all: true }), /replaced 2 occurrences/);
  const bad = await handle({ method: 'tools/call', params: { name: 'replace_text', arguments: { file: '../publish.mjs', find: 'a', replace: 'b' } } }, site);
  assert.equal(bad.isError, true);
  assert.match(bad.content[0].text, /replace failed: file must be the name of a file in src/);
});
