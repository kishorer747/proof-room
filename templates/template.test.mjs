// node --test "templates/*.test.mjs"
// Text checks only, because the repo has no YAML dependency. Applying the template is the real test.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const template = read('./proof-room.template.yaml');
const protocol = read('../material/proof-protocol.md');

const dedent = (text, spaces) =>
  text
    .split('\n')
    .map((line) => line.slice(spaces))
    .join('\n');

test('the room document is the protocol file, word for word', () => {
  const start = template.indexOf('          # Proof protocol');
  const end = template.indexOf('\nlinks:', start);
  assert.notEqual(start, -1);
  assert.equal(dedent(template.slice(start, end), 10).trim(), protocol.trim());
});

test('no agent bypasses permission checks', () => {
  assert.doesNotMatch(template, /auto_approve:\s*true/);
});

const agent = (name, next) =>
  template.slice(template.indexOf(`- name: "{team}-${name}"`), template.indexOf(`- name: "{team}-${next}"`));

test('only the verifier is told how to fetch, from a folder of its own', () => {
  const verifier = agent('verifier', 'reporter');
  assert.match(verifier, /fetch_page/);
  assert.match(verifier, /directory: "\{verifier_dir\}"/);
  assert.doesNotMatch(template.replace(verifier, ''), /fetch_page/);
});

test('only the builder is told to publish, and it works in the site folder', () => {
  const builder = agent('builder', 'verifier');
  assert.match(builder, /publish tool/);
  assert.match(builder, /directory: "\{site_dir\}"/);
  assert.doesNotMatch(template.replace(builder, ''), /publish tool/);
});

test('no agent is told to run a command', () => {
  assert.doesNotMatch(template, /`node |`date |curl/);
});

test('the folder tool configs name one server each', () => {
  const servers = (rel) => Object.keys(JSON.parse(read(rel)).mcpServers);
  assert.deepEqual(servers('../sample-site/.mcp.json'), ['site_publish']);
  assert.deepEqual(servers('../verifier/.mcp.json'), ['page_fetch']);
});

test('the client is in the client desk and not in the proof room', () => {
  const desk = template.slice(template.indexOf('- name: "{team}-client-desk"'), template.indexOf('- name: "{team}-proof-room"'));
  const proof = template.slice(template.indexOf('- name: "{team}-proof-room"'), template.indexOf('docs:'));
  assert.match(desk, /users: \["\{\$creator\}", "\{client_user\}"\]/);
  assert.doesNotMatch(proof, /users:.*client_user/);
  assert.doesNotMatch(desk, /agents:.*(builder|verifier)/);
});

test('the only agent the client can address is not in the proof room', () => {
  const proof = template.slice(template.indexOf('- name: "{team}-proof-room"'), template.indexOf('docs:'));
  assert.doesNotMatch(proof, /agents:.*intake/);
  const open = [...template.matchAll(/- name: "(\{team\}-[a-z]+)"[\s\S]*?addressing: (\S+)/g)]
    .filter((m) => m[2] === 'anyone')
    .map((m) => m[1]);
  assert.deepEqual(open, ['{team}-intake']);
});
