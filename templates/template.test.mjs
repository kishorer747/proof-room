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

test('only the verifier is told how to fetch, and it runs on the other vendor', () => {
  const verifier = template.slice(template.indexOf('- name: "{team}-verifier"'), template.indexOf('- name: "{team}-reporter"'));
  assert.match(verifier, /provider: codex/);
  assert.match(verifier, /fetch_page/);
});

test('the client is in the client desk and not in the proof room', () => {
  const desk = template.slice(template.indexOf('- name: "{team}-client-desk"'), template.indexOf('- name: "{team}-proof-room"'));
  const proof = template.slice(template.indexOf('- name: "{team}-proof-room"'), template.indexOf('docs:'));
  assert.match(desk, /users: \["\{\$creator\}", "\{client_user\}"\]/);
  assert.doesNotMatch(proof, /users:.*client_user/);
  assert.doesNotMatch(desk, /agents:.*(builder|verifier)/);
});
