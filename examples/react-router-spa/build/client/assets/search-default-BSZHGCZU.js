import { r as u, j as a } from './index-CT70PKhW.js';
import {
  u as D,
  S as C,
  a as y,
  b as I,
  c as L,
  d as v,
  e as T,
  f as E,
  g as O,
  h as b,
  T as q,
  i as w,
} from './root-72sXvtgv.js';
import { u as F } from './index-C0GeZixz.js';
import { u as H } from './button-345GfI1w.js';
function G({
  defaultTag: o,
  tags: c = [],
  api: n,
  delayMs: i,
  type: g = 'fetch',
  allowClear: m = !1,
  links: s = [],
  footer: x,
  ...S
}) {
  const { locale: l } = H(),
    [r, h] = u.useState(o),
    {
      search: f,
      setSearch: p,
      query: t,
    } = D(
      g === 'fetch'
        ? { type: 'fetch', api: n, locale: l, tag: r, delayMs: i }
        : { type: 'static', from: n, locale: l, tag: r, delayMs: i },
    ),
    d = u.useMemo(
      () =>
        s.length === 0
          ? null
          : s.map(([e, j]) => ({ type: 'page', id: e, content: e, url: j })),
      [s],
    );
  return (
    F(o, (e) => {
      h(e);
    }),
    a.jsxs(C, {
      search: f,
      onSearchChange: p,
      isLoading: t.isLoading,
      ...S,
      children: [
        a.jsx(y, {}),
        a.jsxs(I, {
          children: [
            a.jsxs(L, { children: [a.jsx(v, {}), a.jsx(T, {}), a.jsx(E, {})] }),
            a.jsx(O, { items: t.data !== 'empty' ? t.data : d }),
          ],
        }),
        a.jsxs(b, {
          children: [
            c.length > 0 &&
              a.jsx(q, {
                tag: r,
                onTagChange: h,
                allowClear: m,
                children: c.map((e) =>
                  a.jsx(w, { value: e.value, children: e.name }, e.value),
                ),
              }),
            x,
          ],
        }),
      ],
    })
  );
}
export { G as default };
