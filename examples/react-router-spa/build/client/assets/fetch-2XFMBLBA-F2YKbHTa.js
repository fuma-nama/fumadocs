var o = new Map();
async function w(i, { api: h = '/api/search', locale: t, tag: r }) {
  const a = new URL(h, window.location.origin);
  (a.searchParams.set('query', i),
    t && a.searchParams.set('locale', t),
    r && a.searchParams.set('tag', Array.isArray(r) ? r.join(',') : r));
  const e = `${a.pathname}?${a.searchParams}`,
    c = o.get(e);
  if (c) return c;
  const s = await fetch(e);
  if (!s.ok) throw new Error(await s.text());
  const n = await s.json();
  return (o.set(e, n), n);
}
export { w as fetchDocs };
