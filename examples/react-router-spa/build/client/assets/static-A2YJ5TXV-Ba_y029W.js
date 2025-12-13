import { r as ee } from './chunk-ZMWYLUDP-oajMeTFk.js';
import { c as z } from './chunk-OTD7MV33-qJr9DjGl.js';
import {
  j as N,
  k as R,
  l as A,
  m as te,
  s as ne,
  n as oe,
  o as $,
  p as E,
  r as P,
  q as _,
  t as Y,
  v as K,
  w as ce,
  x as G,
  D as se,
  y as re,
} from './root-72sXvtgv.js';
import './index-CT70PKhW.js';
import './index-C0GeZixz.js';
import './button-345GfI1w.js';
function ie(e, t) {
  return e.documentsStore.get(e.data.docs, t);
}
function ue(e) {
  return e.documentsStore.count(e.data.docs);
}
const F = 'fulltext',
  le = 'hybrid',
  de = 'vector';
function fe(e, t) {
  return e[1] - t[1];
}
function he(e, t) {
  return t[1] - e[1];
}
function ae(e = 'desc') {
  return e.toLowerCase() === 'asc' ? fe : he;
}
function B(e, t, o) {
  const n = {},
    i = t.map(([d]) => d),
    s = e.documentsStore.getMultiple(e.data.docs, i),
    a = Object.keys(o),
    c = e.index.getSearchablePropertiesWithTypes(e.data.index);
  for (const d of a) {
    let g;
    if (c[d] === 'number') {
      const { ranges: r } = o[d],
        h = r.length,
        y = Array.from({ length: h });
      for (let l = 0; l < h; l++) {
        const b = r[l];
        y[l] = [`${b.from}-${b.to}`, 0];
      }
      g = Object.fromEntries(y);
    }
    n[d] = { count: 0, values: g ?? {} };
  }
  const p = s.length;
  for (let d = 0; d < p; d++) {
    const g = s[d];
    for (const r of a) {
      const h = r.includes('.') ? N(g, r) : g[r],
        y = c[r],
        l = n[r].values;
      switch (y) {
        case 'number': {
          const b = o[r].ranges;
          j(b, l)(h);
          break;
        }
        case 'number[]': {
          const b = new Set(),
            f = o[r].ranges,
            u = j(f, l, b);
          for (const S of h) u(S);
          break;
        }
        case 'boolean':
        case 'enum':
        case 'string': {
          m(l, y)(h);
          break;
        }
        case 'boolean[]':
        case 'enum[]':
        case 'string[]': {
          const u = m(l, y === 'boolean[]' ? 'boolean' : 'string', new Set());
          for (const S of h) u(S);
          break;
        }
        default:
          throw R('FACET_NOT_SUPPORTED', y);
      }
    }
  }
  for (const d of a) {
    const g = n[d];
    if (((g.count = Object.keys(g.values).length), c[d] === 'string')) {
      const r = o[d],
        h = ae(r.sort);
      g.values = Object.fromEntries(
        Object.entries(g.values)
          .sort(h)
          .slice(r.offset ?? 0, r.limit ?? 10),
      );
    }
  }
  return n;
}
function j(e, t, o) {
  return (n) => {
    for (const i of e) {
      const s = `${i.from}-${i.to}`;
      o?.has(s) ||
        (n >= i.from &&
          n <= i.to &&
          (t[s] === void 0 ? (t[s] = 1) : (t[s]++, o?.add(s))));
    }
  };
}
function m(e, t, o) {
  const n = t === 'boolean' ? 'false' : '';
  return (i) => {
    const s = i?.toString() ?? n;
    o?.has(s) || ((e[s] = (e[s] ?? 0) + 1), o?.add(s));
  };
}
const ge = {
    reducer: (e, t, o, n) => ((t[n] = o), t),
    getInitialValue: (e) => Array.from({ length: e }),
  },
  C = ['string', 'number', 'boolean'];
function L(e, t, o) {
  const n = o.properties,
    i = n.length,
    s = e.index.getSearchablePropertiesWithTypes(e.data.index);
  for (let u = 0; u < i; u++) {
    const S = n[u];
    if (typeof s[S] > 'u') throw R('UNKNOWN_GROUP_BY_PROPERTY', S);
    if (!C.includes(s[S]))
      throw R('INVALID_GROUP_BY_PROPERTY', S, C.join(', '), s[S]);
  }
  const a = t.map(([u]) => A(e.internalDocumentIDStore, u)),
    c = e.documentsStore.getMultiple(e.data.docs, a),
    p = c.length,
    d = o.maxResult || Number.MAX_SAFE_INTEGER,
    g = [],
    r = {};
  for (let u = 0; u < i; u++) {
    const S = n[u],
      I = { property: S, perValue: {} },
      x = new Set();
    for (let D = 0; D < p; D++) {
      const v = c[D],
        w = N(v, S);
      if (typeof w > 'u') continue;
      const T = typeof w != 'boolean' ? w : '' + w,
        O = I.perValue[T] ?? { indexes: [], count: 0 };
      O.count >= d ||
        (O.indexes.push(D), O.count++, (I.perValue[T] = O), x.add(w));
    }
    (g.push(Array.from(x)), (r[S] = I));
  }
  const h = X(g),
    y = h.length,
    l = [];
  for (let u = 0; u < y; u++) {
    const S = h[u],
      I = S.length,
      x = { values: [], indexes: [] },
      D = [];
    for (let v = 0; v < I; v++) {
      const w = S[v],
        T = n[v];
      (D.push(r[T].perValue[typeof w != 'boolean' ? w : '' + w].indexes),
        x.values.push(w));
    }
    ((x.indexes = te(D).sort((v, w) => v - w)),
      x.indexes.length !== 0 && l.push(x));
  }
  const b = l.length,
    f = Array.from({ length: b });
  for (let u = 0; u < b; u++) {
    const S = l[u],
      I = o.reduce || ge,
      x = S.indexes.map((T) => ({ id: a[T], score: t[T][1], document: c[T] })),
      D = I.reducer.bind(null, S.values),
      v = I.getInitialValue(S.indexes.length),
      w = x.reduce(D, v);
    f[u] = { values: S.values, result: w };
  }
  return f;
}
function X(e, t = 0) {
  if (t + 1 === e.length) return e[t].map((s) => [s]);
  const o = e[t],
    n = X(e, t + 1),
    i = [];
  for (const s of o)
    for (const a of n) {
      const c = [s];
      (ne(c, a), i.push(c));
    }
  return i;
}
function M(e, t, o, n) {
  const i = oe(t, n);
  if (i.length === 0) return o;
  const s = i.flatMap((f) => f.consequence.promote);
  s.sort((f, u) => f.position - u.position);
  const a = new Set(),
    c = new Map(),
    p = new Set();
  for (const f of s) {
    const u = $(e.internalDocumentIDStore, f.doc_id);
    if (u !== void 0) {
      if (c.has(u)) {
        const S = c.get(u);
        f.position < S && c.set(u, f.position);
        continue;
      }
      p.has(f.position) || (a.add(u), c.set(u, f.position), p.add(f.position));
    }
  }
  if (c.size === 0) return o;
  const d = o.filter(([f]) => !a.has(f)),
    g = 1e6,
    r = [];
  for (const [f, u] of c.entries())
    o.find(([I]) => I === f)
      ? r.push([f, g - u])
      : e.documentsStore.get(e.data.docs, f) && r.push([f, 0]);
  r.sort((f, u) => {
    const S = c.get(f[0]) ?? 1 / 0,
      I = c.get(u[0]) ?? 1 / 0;
    return S - I;
  });
  const h = [],
    y = new Map();
  for (const f of r) {
    const u = c.get(f[0]);
    y.set(u, f);
  }
  let l = 0,
    b = 0;
  for (; b < d.length + r.length; )
    if (y.has(b)) (h.push(y.get(b)), b++);
    else if (l < d.length) (h.push(d[l]), l++, b++);
    else break;
  for (const [f, u] of y.entries()) f >= h.length && h.push(u);
  return h;
}
function Q(e, t, o) {
  const { term: n, properties: i } = t,
    s = e.data.index;
  let a = e.caches.propertiesToSearch;
  if (!a) {
    const r = e.index.getSearchablePropertiesWithTypes(s);
    ((a = e.index.getSearchableProperties(s)),
      (a = a.filter((h) => r[h].startsWith('string'))),
      (e.caches.propertiesToSearch = a));
  }
  if (i && i !== '*') {
    for (const r of i)
      if (!a.includes(r)) throw R('UNKNOWN_INDEX', r, a.join(', '));
    a = a.filter((r) => i.includes(r));
  }
  const c = Object.keys(t.where ?? {}).length > 0;
  let p;
  c && (p = e.index.searchByWhereClause(s, e.tokenizer, t.where, o));
  let d;
  const g = t.threshold !== void 0 && t.threshold !== null ? t.threshold : 1;
  if (n || i) {
    const r = ue(e);
    if (
      ((d = e.index.search(
        s,
        n || '',
        e.tokenizer,
        o,
        a,
        t.exact || !1,
        t.tolerance || 0,
        t.boost || {},
        be(t.relevance),
        r,
        p,
        g,
      )),
      t.exact && n)
    ) {
      const h = n.trim().split(/\s+/);
      d = d.filter(([y]) => {
        const l = e.documentsStore.get(e.data.docs, y);
        if (!l) return !1;
        for (const b of a) {
          const f = ye(l, b);
          if (
            typeof f == 'string' &&
            h.every((S) => new RegExp(`\\b${pe(S)}\\b`).test(f))
          )
            return !0;
        }
        return !1;
      });
    }
  } else if (c) {
    const r = ce(s, t.where);
    r ? (d = r) : (d = (p ? Array.from(p) : []).map((y) => [+y, 0]));
  } else
    d = Object.keys(e.documentsStore.getAll(e.data.docs)).map((h) => [+h, 0]);
  return d;
}
function pe(e) {
  return e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function ye(e, t) {
  const o = t.split('.');
  let n = e;
  for (const i of o)
    if (n && typeof n == 'object' && i in n) n = n[i];
    else return;
  return n;
}
function Se(e, t, o) {
  const n = E();
  function i() {
    const c = Object.keys(e.data.index.vectorIndexes),
      p = t.facets && Object.keys(t.facets).length > 0,
      {
        limit: d = 10,
        offset: g = 0,
        distinctOn: r,
        includeVectors: h = !1,
      } = t,
      y = t.preflight === !0;
    let l = Q(e, t, o);
    if (t.sortBy)
      if (typeof t.sortBy == 'function') {
        const u = l.map(([x]) => x),
          I = e.documentsStore
            .getMultiple(e.data.docs, u)
            .map((x, D) => [l[D][0], l[D][1], x]);
        (I.sort(t.sortBy), (l = I.map(([x, D]) => [x, D])));
      } else
        l = e.sorter
          .sortBy(e.data.sorting, l, t.sortBy)
          .map(([u, S]) => [$(e.internalDocumentIDStore, u), S]);
    else l = l.sort(Y);
    l = M(e, e.data.pinning, l, t.term);
    let b;
    y || (b = r ? Ee(e, l, g, d, r) : Z(e, l, g, d));
    const f = { elapsed: { formatted: '', raw: 0 }, hits: [], count: l.length };
    if ((typeof b < 'u' && ((f.hits = b.filter(Boolean)), h || K(f, c)), p)) {
      const u = B(e, l, t.facets);
      f.facets = u;
    }
    return (
      t.groupBy && (f.groups = L(e, l, t.groupBy)),
      (f.elapsed = e.formatElapsedTime(E() - n)),
      f
    );
  }
  async function s() {
    e.beforeSearch && (await P(e.beforeSearch, e, t, o));
    const c = i();
    return (e.afterSearch && (await _(e.afterSearch, e, t, o, c)), c);
  }
  return e.beforeSearch?.length || e.afterSearch?.length ? s() : i();
}
const V = { k: 1.2, b: 0.75, d: 0.5 };
function be(e) {
  const t = e ?? {};
  return ((t.k = t.k ?? V.k), (t.b = t.b ?? V.b), (t.d = t.d ?? V.d), t);
}
function q(e, t, o) {
  const n = t.vector;
  if (n && (!('value' in n) || !('property' in n)))
    throw R('INVALID_VECTOR_INPUT', Object.keys(n).join(', '));
  const i = e.data.index.vectorIndexes[n.property];
  if (!i) throw R('UNKNOWN_VECTOR_PROPERTY', n.property);
  const s = i.node.size;
  if (n?.value.length !== s)
    throw n?.property === void 0 || n?.value.length === void 0
      ? R('INVALID_INPUT_VECTOR', 'undefined', s, 'undefined')
      : R('INVALID_INPUT_VECTOR', n.property, s, n.value.length);
  const a = e.data.index;
  let c;
  return (
    Object.keys(t.where ?? {}).length > 0 &&
      (c = e.index.searchByWhereClause(a, e.tokenizer, t.where, o)),
    i.node.find(n.value, t.similarity ?? se, c)
  );
}
function Ie(e, t, o = 'english') {
  const n = E();
  function i() {
    let c = q(e, t, o).sort(Y);
    c = M(e, e.data.pinning, c, void 0);
    let p = [];
    t.facets && Object.keys(t.facets).length > 0 && (p = B(e, c, t.facets));
    const g = t.vector.property,
      r = t.includeVectors ?? !1,
      h = t.limit ?? 10,
      y = t.offset ?? 0,
      l = Array.from({ length: h });
    for (let S = 0; S < h; S++) {
      const I = c[S + y];
      if (!I) break;
      const x = e.data.docs.docs[I[0]];
      if (x) {
        r || (x[g] = null);
        const D = {
          id: A(e.internalDocumentIDStore, I[0]),
          score: I[1],
          document: x,
        };
        l[S] = D;
      }
    }
    let b = [];
    t.groupBy && (b = L(e, c, t.groupBy));
    const u = E() - n;
    return {
      count: c.length,
      hits: l.filter(Boolean),
      elapsed: { raw: Number(u), formatted: G(u) },
      ...(p ? { facets: p } : {}),
      ...(b ? { groups: b } : {}),
    };
  }
  async function s() {
    e.beforeSearch && (await P(e.beforeSearch, e, t, o));
    const c = i();
    return (e.afterSearch && (await _(e.afterSearch, e, t, o, c)), c);
  }
  return e.beforeSearch?.length || e.afterSearch?.length ? s() : i();
}
function xe(e, t, o) {
  const n = we(Q(e, t, o)),
    i = q(e, t, o),
    s = t.hybridWeights;
  return Re(n, i, t.term ?? '', s);
}
function De(e, t, o) {
  const n = E();
  function i() {
    let c = xe(e, t, o);
    c = M(e, e.data.pinning, c, t.term);
    let p;
    t.facets && Object.keys(t.facets).length > 0 && (p = B(e, c, t.facets));
    let g;
    t.groupBy && (g = L(e, c, t.groupBy));
    const r = t.offset ?? 0,
      h = t.limit ?? 10,
      y = Z(e, c, r, h).filter(Boolean),
      l = E(),
      b = {
        count: c.length,
        elapsed: { raw: Number(l - n), formatted: G(l - n) },
        hits: y,
        ...(p ? { facets: p } : {}),
        ...(g ? { groups: g } : {}),
      };
    if (!(t.includeVectors ?? !1)) {
      const u = Object.keys(e.data.index.vectorIndexes);
      K(b, u);
    }
    return b;
  }
  async function s() {
    e.beforeSearch && (await P(e.beforeSearch, e, t, o));
    const c = i();
    return (e.afterSearch && (await _(e.afterSearch, e, t, o, c)), c);
  }
  return e.beforeSearch?.length || e.afterSearch?.length ? s() : i();
}
function k(e) {
  return e[1];
}
function we(e) {
  const t = Math.max.apply(Math, e.map(k));
  return e.map(([o, n]) => [o, n / t]);
}
function W(e, t) {
  return e / t;
}
function ve(e, t) {
  return (o, n) => o * e + n * t;
}
function Re(e, t, o, n) {
  const i = Math.max.apply(Math, e.map(k)),
    s = Math.max.apply(Math, t.map(k)),
    a = n && n.text && n.vector,
    { text: c, vector: p } = a ? n : Te(),
    d = new Map(),
    g = e.length,
    r = ve(c, p);
  for (let y = 0; y < g; y++) {
    const [l, b] = e[y],
      f = W(b, i),
      u = r(f, 0);
    d.set(l, u);
  }
  const h = t.length;
  for (let y = 0; y < h; y++) {
    const [l, b] = t[y],
      f = W(b, s),
      u = d.get(l) ?? 0;
    d.set(l, u + r(0, f));
  }
  return [...d].sort((y, l) => l[1] - y[1]);
}
function Te(e) {
  return { text: 0.5, vector: 0.5 };
}
function J(e, t, o) {
  const n = t.mode ?? F;
  if (n === F) return Se(e, t, o);
  if (n === de) return Ie(e, t);
  if (n === le) return De(e, t);
  throw R('INVALID_SEARCH_MODE', n);
}
function Ee(e, t, o, n, i) {
  const s = e.data.docs,
    a = new Map(),
    c = [],
    p = new Set(),
    d = t.length;
  let g = 0;
  for (let r = 0; r < d; r++) {
    const h = t[r];
    if (typeof h > 'u') continue;
    const [y, l] = h;
    if (p.has(y)) continue;
    const b = e.documentsStore.get(s, y),
      f = N(b, i);
    if (
      !(typeof f > 'u' || a.has(f)) &&
      (a.set(f, !0),
      g++,
      !(g <= o) &&
        (c.push({ id: A(e.internalDocumentIDStore, y), score: l, document: b }),
        p.add(y),
        g >= o + n))
    )
      break;
  }
  return c;
}
function Z(e, t, o, n) {
  const i = e.data.docs,
    s = Array.from({ length: n }),
    a = new Set();
  for (let c = o; c < n + o; c++) {
    const p = t[c];
    if (typeof p > 'u') break;
    const [d, g] = p;
    if (!a.has(d)) {
      const r = e.documentsStore.get(i, d);
      ((s[c] = { id: A(e.internalDocumentIDStore, d), score: g, document: r }),
        a.add(d));
    }
  }
  return s;
}
function U(e, t) {
  (e.internalDocumentIDStore.load(e, t.internalDocumentIDStore),
    (e.data.index = e.index.load(e.internalDocumentIDStore, t.index)),
    (e.data.docs = e.documentsStore.load(e.internalDocumentIDStore, t.docs)),
    (e.data.sorting = e.sorter.load(e.internalDocumentIDStore, t.sorting)),
    (e.data.pinning = e.pinning.load(e.internalDocumentIDStore, t.pinning)),
    (e.tokenizer.language = t.language));
}
async function Oe(e, t, o = {}) {
  const n = z(t);
  return (
    await J(e, {
      term: t,
      tolerance: 1,
      ...o,
      boost: { title: 2, ...('boost' in o ? o.boost : void 0) },
    })
  ).hits.map((s) => ({
    type: 'page',
    content: s.document.title,
    breadcrumbs: s.document.breadcrumbs,
    contentWithHighlights: n.highlight(s.document.title),
    id: s.document.url,
    url: s.document.url,
  }));
}
async function Ae(e, t, o = [], { mode: n = 'fulltext', ...i } = {}) {
  typeof o == 'string' && (o = [o]);
  let s = {
    ...i,
    mode: n,
    where: ee({ tags: o.length > 0 ? { containsAll: o } : void 0, ...i.where }),
    groupBy: { properties: ['page_id'], maxResult: 8, ...i.groupBy },
  };
  t.length > 0 &&
    (s = {
      ...s,
      term: t,
      properties: n === 'fulltext' ? ['content'] : ['content', 'embeddings'],
    });
  const a = z(t),
    c = await J(e, s),
    p = [];
  for (const d of c.groups ?? []) {
    const g = d.values[0],
      r = ie(e, g);
    if (r) {
      p.push({
        id: g,
        type: 'page',
        content: r.content,
        breadcrumbs: r.breadcrumbs,
        contentWithHighlights: a.highlight(r.content),
        url: r.url,
      });
      for (const h of d.result)
        h.document.type !== 'page' &&
          p.push({
            id: h.document.id.toString(),
            content: h.document.content,
            breadcrumbs: h.document.breadcrumbs,
            contentWithHighlights: a.highlight(h.document.content),
            type: h.document.type,
            url: h.document.url,
          });
    }
  }
  return p;
}
var H = new Map();
async function Ve({
  from: e = '/api/search',
  initOrama: t = (o) => re({ schema: { _: 'string' }, language: o }),
}) {
  const o = e,
    n = H.get(o);
  if (n) return n;
  async function i() {
    const a = await fetch(e);
    if (!a.ok)
      throw new Error(
        `failed to fetch exported search indexes from ${e}, make sure the search database is exported and available for client.`,
      );
    const c = await a.json(),
      p = new Map();
    if (c.type === 'i18n')
      return (
        await Promise.all(
          Object.entries(c.data).map(async ([g, r]) => {
            const h = await t(g);
            (U(h, r), p.set(g, { type: r.type, db: h }));
          }),
        ),
        p
      );
    const d = await t();
    return (U(d, c), p.set('', { type: c.type, db: d }), p);
  }
  const s = i();
  return (H.set(o, s), s);
}
async function Me(e, t) {
  const { tag: o, locale: n } = t,
    i = (await Ve(t)).get(n ?? '');
  return i ? (i.type === 'simple' ? Oe(i, e) : Ae(i.db, e, o)) : [];
}
export { Me as search };
