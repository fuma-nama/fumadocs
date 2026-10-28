import { createServer, get, type IncomingMessage } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, expect, test } from 'vitest';
import { createProxy, type Proxy } from '@/server/proxy';

let hits = 0;
const server = createServer(async (req, res) => {
  hits++;
  res.setHeader('access-control-allow-credentials', 'true');
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('clear-site-data', '"cookies"');
  res.setHeader('strict-transport-security', 'max-age=31536000');
  res.setHeader('set-cookie', ['a=1', 'b=2']);
  if (req.url === '/never') return;
  if (req.url === '/999') res.writeHead(999);
  if (req.url === '/same') res.writeHead(302, { location: '/' });
  if (req.url === '/cross') res.writeHead(302, { location: `http://127.0.0.1:${port}/` });

  let body = '';
  for await (const chunk of req) body += chunk;
  res.end(
    JSON.stringify({
      authorization: req.headers.authorization,
      cookie: req.headers.cookie,
      body: body || undefined,
    }),
  );
});
await new Promise<void>((resolve) => server.listen(0, resolve));
const { port } = server.address() as AddressInfo;

afterAll(() => {
  server.close();
});

function request(proxy: Proxy, url: string, init?: RequestInit) {
  return proxy.handle(
    new Request(`https://docs.example.com/api/proxy?url=${encodeURIComponent(url)}`, init),
  );
}

test('refuses private networks by default', async () => {
  const proxy = createProxy();

  for (const host of [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '192.0.0.192',
    '240.0.0.1',
    '[::1]',
    '[::ffff:127.0.0.1]',
    // never resolves, must look the same as private hosts
    'nonexistent.invalid',
  ]) {
    const res = await request(proxy, `http://${host}:${port}`);
    expect(res.status).toBe(400);
    expect(await res.json()).toContain('public address');
  }
  expect((await request(proxy, 'file:///etc/passwd')).status).toBe(400);
  expect(hits).toBe(0);
});

test('never reuses connections opened elsewhere', async () => {
  // leaves a keep-alive socket to the server in the shared pool of `node:http`
  await new Promise((resolve) =>
    get(`http://localhost:${port}`, (res) => res.resume().on('end', resolve)),
  );
  const before = hits;

  expect((await request(createProxy(), `http://localhost:${port}`)).status).toBe(400);
  expect(hits).toBe(before);
});

test('trusts allowed origins', async () => {
  const proxy = createProxy({ allowedOrigins: [`http://localhost:${port}`] });
  const res = await request(proxy, `http://localhost:${port}`);

  expect(res.status).toBe(200);
  expect((await request(proxy, `http://localhost:${port}/999`)).status).toBe(502);
  expect(res.headers.get('content-security-policy')).toBe('sandbox');
  expect(res.headers.getSetCookie()).toEqual(['a=1', 'b=2']);
  for (const key of [
    'access-control-allow-credentials',
    'access-control-allow-origin',
    'clear-site-data',
    'strict-transport-security',
  ]) {
    expect(res.headers.has(key)).toBe(false);
  }
});

test('forwards request bodies', async () => {
  const proxy = createProxy({ allowedOrigins: [`http://localhost:${port}`] });

  // streamed bodies have no `content-length`
  for (const headers of [undefined, { 'content-length': '5' }]) {
    const res = await request(proxy, `http://localhost:${port}`, {
      method: 'POST',
      headers,
      body: 'hello',
    });
    expect(await res.json()).toEqual({ body: 'hello' });
  }
});

test('keeps the dispatcher of `fetch()`', async () => {
  // imports undici
  await request(createProxy(), `http://localhost:${port}`);

  const res = await fetch(`http://localhost:${port}`, {
    method: 'POST',
    headers: { 'content-length': '5' },
    body: 'hello',
  });
  expect(await res.json()).toEqual({ body: 'hello' });
});

test('aborts when the client disconnects', async () => {
  const proxy = createProxy({ allowedOrigins: [`http://localhost:${port}`] });
  const controller = new AbortController();
  const received = new Promise<IncomingMessage>((resolve) => server.once('request', resolve));
  const res = request(proxy, `http://localhost:${port}/never`, { signal: controller.signal });

  const upstream = await received;
  controller.abort();
  await new Promise((resolve) => upstream.socket.once('close', resolve));
  expect((await res).status).toBe(500);
});

test('sends credentials to the same origin only', async () => {
  const proxy = createProxy({
    allowedOrigins: [`http://localhost:${port}`, `http://127.0.0.1:${port}`],
  });
  const init = { headers: { authorization: 'Bearer token', cookie: 'a=1' } };

  const same = await request(proxy, `http://localhost:${port}/same`, init);
  expect(await same.json()).toEqual({ authorization: 'Bearer token', cookie: 'a=1' });

  const cross = await request(proxy, `http://localhost:${port}/cross`, init);
  expect(await cross.json()).toEqual({});
});

// last, it changes the global dispatcher
test('works with the global dispatcher of undici', async () => {
  const { Agent, setGlobalDispatcher } = await import('undici');
  // like `EnvHttpProxyAgent` installed by apps
  setGlobalDispatcher(new Agent());
  const proxy = createProxy({ allowedOrigins: [`http://localhost:${port}`] });
  const res = await request(proxy, `http://localhost:${port}`, {
    method: 'POST',
    headers: { 'content-length': '5' },
    body: 'hello',
  });

  expect(await res.json()).toEqual({ body: 'hello' });
});
