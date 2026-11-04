// node --test "tools/*.test.mjs"
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { after, before, test } from 'node:test';
import { fetchPage, handle, pageUrl } from './page-fetch-mcp.mjs';

let site, other, port, otherHits = 0;

const listen = (handler) =>
  new Promise((resolve) => {
    const s = createServer(handler);
    s.listen(0, '127.0.0.1', () => resolve(s));
  });

before(async () => {
  other = await listen((_req, res) => {
    otherHits += 1;
    res.end('secret from another service');
  });
  site = await listen((req, res) => {
    if (req.url === '/moved') {
      res.writeHead(302, { location: `http://127.0.0.1:${other.address().port}/` });
      res.end();
      return;
    }
    res.end(`method=${req.method} url=${req.url}`);
  });
  port = site.address().port;
});

after(() => {
  site.close();
  other.close();
});

test('returns status and body of a page on the configured port', async () => {
  const text = await fetchPage('/visit.html', port);
  assert.match(text, /^GET \/visit\.html -> 200/);
  assert.match(text, /method=GET url=\/visit\.html/);
});

test('refuses every path that would leave the configured origin', () => {
  const escapes = [
    '//evil.example/',
    '//127.0.0.1:5499/',
    'http://evil.example/',
    'evil.example',
    '@evil.example',
    '',
    undefined,
    { href: 'http://evil.example' },
  ];
  for (const path of escapes) assert.throws(() => pageUrl(path, port), Error, JSON.stringify(path));
});

test('a path cannot change the host by way of credentials or backslashes', () => {
  for (const path of ['/@evil.example', '/\\evil.example', '/..//evil.example']) {
    let url;
    try {
      url = pageUrl(path, port);
    } catch {
      continue; // Refusing is also correct.
    }
    assert.equal(url.host, `127.0.0.1:${port}`, path);
  }
});

test('does not follow a redirect to another local service', async () => {
  const text = await fetchPage('/moved', port);
  assert.match(text, /-> 302/);
  assert.equal(otherHits, 0);
  assert.doesNotMatch(text, /secret from another service/);
});

test('a tool call cannot choose the port, and a bad path comes back as a tool error', async () => {
  const ok = await handle(
    { method: 'tools/call', params: { name: 'fetch_page', arguments: { path: '/x', port: other.address().port } } },
    port,
  );
  assert.match(ok.content[0].text, /method=GET url=\/x/);
  assert.equal(otherHits, 0);

  const bad = await handle(
    { method: 'tools/call', params: { name: 'fetch_page', arguments: { path: '//evil.example/' } } },
    port,
  );
  assert.equal(bad.isError, true);
});

test('lists one read-only tool and rejects unknown methods', async () => {
  const { tools } = await handle({ method: 'tools/list' }, port);
  assert.deepEqual(tools.map((t) => t.name), ['fetch_page']);
  assert.equal(tools[0].annotations.readOnlyHint, true);
  await assert.rejects(handle({ method: 'resources/list' }, port), /method not found/);
});
