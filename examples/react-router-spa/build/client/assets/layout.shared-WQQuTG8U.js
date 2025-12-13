import { r as g, a as sn, j as x, d as Q, h as cn } from './index-CT70PKhW.js';
import {
  h as xe,
  P as ie,
  p as an,
  a as ln,
  c as st,
  d as De,
  e as ne,
  q as Ne,
  r as ct,
  t as K,
  S as at,
  o as lt,
  u as _e,
  z as fn,
  s as un,
  M as dn,
  A as pn,
  n as hn,
  j as mn,
  g as ft,
  v as gn,
  R as xn,
  f as le,
  w as vn,
  F as wn,
  D as yn,
  l as bn,
  b as An,
} from './button-345GfI1w.js';
var Cn = 'Portal',
  ut = g.forwardRef((e, t) => {
    const { container: n, ...o } = e,
      [r, i] = g.useState(!1);
    xe(() => i(!0), []);
    const s = n || (r && globalThis?.document?.body);
    return s ? sn.createPortal(x.jsx(ie.div, { ...o, ref: t }), s) : null;
  });
ut.displayName = Cn;
function Te(e) {
  return e.length > 1 && e.endsWith('/') ? e.slice(0, -1) : e;
}
function dt(e, t, n = !0) {
  return ((e = Te(e)), (t = Te(t)), e === t || (n && t.startsWith(`${e}/`)));
}
function fr(e, t) {
  return e.urls ? e.urls.has(Te(t)) : dt(e.url, t, !0);
}
var pt = g.forwardRef(
  (
    {
      href: e = '#',
      external: t = e.match(/^\w+:/) || e.startsWith('//'),
      prefetch: n,
      ...o
    },
    r,
  ) =>
    t
      ? x.jsx('a', {
          ref: r,
          href: e,
          rel: 'noreferrer noopener',
          target: '_blank',
          ...o,
          children: o.children,
        })
      : x.jsx(an, { ref: r, href: e, prefetch: n, ...o }),
);
pt.displayName = 'Link';
function ur({ ref: e, item: t, ...n }) {
  const o = ln(),
    r = t.active ?? 'url',
    i = r !== 'none' && dt(t.url, o, r === 'nested-url');
  return x.jsx(pt, {
    ref: e,
    href: t.url,
    external: t.external,
    ...n,
    'data-active': i,
    children: n.children,
  });
}
function dr(e = [], t) {
  let n = e ?? [];
  return (
    t &&
      (n = [
        ...n,
        {
          type: 'icon',
          url: t,
          text: 'Github',
          label: 'GitHub',
          icon: x.jsx('svg', {
            role: 'img',
            viewBox: '0 0 24 24',
            fill: 'currentColor',
            children: x.jsx('path', {
              d: 'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12',
            }),
          }),
          external: !0,
        },
      ]),
    n
  );
}
st('StylesContext', { tocNav: 'xl:hidden', toc: 'max-xl:hidden' });
const ht = st('NavContext', { isTransparent: !1 });
function pr({ transparentMode: e = 'none', children: t }) {
  const [n, o] = g.useState(e !== 'none');
  return (
    g.useEffect(() => {
      if (e !== 'top') return;
      const r = () => {
        o(window.scrollY < 10);
      };
      return (
        r(),
        window.addEventListener('scroll', r),
        () => {
          window.removeEventListener('scroll', r);
        }
      );
    }, [e]),
    x.jsx(ht.Provider, {
      value: g.useMemo(() => ({ isTransparent: n }), [n]),
      children: t,
    })
  );
}
function hr() {
  return ht.use();
}
function mr(e) {
  const t = e + 'CollectionProvider',
    [n, o] = De(t),
    [r, i] = n(t, { collectionRef: { current: null }, itemMap: new Map() }),
    s = (m) => {
      const { scope: v, children: w } = m,
        y = Q.useRef(null),
        b = Q.useRef(new Map()).current;
      return x.jsx(r, { scope: v, itemMap: b, collectionRef: y, children: w });
    };
  s.displayName = t;
  const c = e + 'CollectionSlot',
    a = Ne(c),
    f = Q.forwardRef((m, v) => {
      const { scope: w, children: y } = m,
        b = i(c, w),
        A = ne(v, b.collectionRef);
      return x.jsx(a, { ref: A, children: y });
    });
  f.displayName = c;
  const l = e + 'CollectionItemSlot',
    u = 'data-radix-collection-item',
    p = Ne(l),
    d = Q.forwardRef((m, v) => {
      const { scope: w, children: y, ...b } = m,
        A = Q.useRef(null),
        C = ne(v, A),
        R = i(l, w);
      return (
        Q.useEffect(
          () => (
            R.itemMap.set(A, { ref: A, ...b }),
            () => void R.itemMap.delete(A)
          ),
        ),
        x.jsx(p, { [u]: '', ref: C, children: y })
      );
    });
  d.displayName = l;
  function h(m) {
    const v = i(e + 'CollectionConsumer', m);
    return Q.useCallback(() => {
      const y = v.collectionRef.current;
      if (!y) return [];
      const b = Array.from(y.querySelectorAll(`[${u}]`));
      return Array.from(v.itemMap.values()).sort(
        (R, S) => b.indexOf(R.ref.current) - b.indexOf(S.ref.current),
      );
    }, [v.collectionRef, v.itemMap]);
  }
  return [{ Provider: s, Slot: f, ItemSlot: d }, h, o];
}
function gr({
  hideIfDisabled: e,
  size: t = 'icon-sm',
  color: n = 'ghost',
  ...o
}) {
  const { setOpenSearch: r, enabled: i } = ct();
  return e && !i
    ? null
    : x.jsx('button', {
        type: 'button',
        className: K(lt({ size: t, color: n }), o.className),
        'data-search': '',
        'aria-label': 'Open Search',
        onClick: () => {
          r(!0);
        },
        children: x.jsx(at, {}),
      });
}
function xr({ hideIfDisabled: e, ...t }) {
  const { enabled: n, hotKey: o, setOpenSearch: r } = ct(),
    { text: i } = _e();
  return e && !n
    ? null
    : x.jsxs('button', {
        type: 'button',
        'data-search-full': '',
        ...t,
        className: K(
          'inline-flex items-center gap-2 rounded-lg border bg-fd-secondary/50 p-1.5 ps-2 text-sm text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground',
          t.className,
        ),
        onClick: () => {
          r(!0);
        },
        children: [
          x.jsx(at, { className: 'size-4' }),
          i.search,
          x.jsx('div', {
            className: 'ms-auto inline-flex gap-0.5',
            children: o.map((s, c) =>
              x.jsx(
                'kbd',
                {
                  className: 'rounded-md border bg-fd-background px-1.5',
                  children: s.display,
                },
                c,
              ),
            ),
          }),
        ],
      });
}
const qe = hn('size-6.5 rounded-full p-1.5 text-fd-muted-foreground', {
    variants: {
      active: {
        true: 'bg-fd-accent text-fd-accent-foreground',
        false: 'text-fd-muted-foreground',
      },
    },
  }),
  Ge = [
    ['light', un],
    ['dark', dn],
    ['system', pn],
  ];
function vr({ className: e, mode: t = 'light-dark', ...n }) {
  const { setTheme: o, theme: r, resolvedTheme: i } = fn(),
    [s, c] = g.useState(!1);
  g.useLayoutEffect(() => {
    c(!0);
  }, []);
  const a = K('inline-flex items-center rounded-full border p-1', e);
  if (t === 'light-dark') {
    const l = s ? i : null;
    return x.jsx('button', {
      className: a,
      'aria-label': 'Toggle Theme',
      onClick: () => o(l === 'light' ? 'dark' : 'light'),
      'data-theme-toggle': '',
      ...n,
      children: Ge.map(([u, p]) => {
        if (u !== 'system')
          return x.jsx(
            p,
            { fill: 'currentColor', className: K(qe({ active: l === u })) },
            u,
          );
      }),
    });
  }
  const f = s ? r : null;
  return x.jsx('div', {
    className: a,
    'data-theme-toggle': '',
    ...n,
    children: Ge.map(([l, u]) =>
      x.jsx(
        'button',
        {
          'aria-label': l,
          className: K(qe({ active: f === l })),
          onClick: () => o(l),
          children: x.jsx(u, { className: 'size-full', fill: 'currentColor' }),
        },
        l,
      ),
    ),
  });
}
const Pn = ['top', 'right', 'bottom', 'left'],
  Z = Math.min,
  $ = Math.max,
  ve = Math.round,
  me = Math.floor,
  V = (e) => ({ x: e, y: e }),
  Rn = { left: 'right', right: 'left', bottom: 'top', top: 'bottom' },
  Sn = { start: 'end', end: 'start' };
function Me(e, t, n) {
  return $(e, Z(t, n));
}
function q(e, t) {
  return typeof e == 'function' ? e(t) : e;
}
function G(e) {
  return e.split('-')[0];
}
function se(e) {
  return e.split('-')[1];
}
function ke(e) {
  return e === 'x' ? 'y' : 'x';
}
function Fe(e) {
  return e === 'y' ? 'height' : 'width';
}
const On = new Set(['top', 'bottom']);
function B(e) {
  return On.has(G(e)) ? 'y' : 'x';
}
function $e(e) {
  return ke(B(e));
}
function En(e, t, n) {
  n === void 0 && (n = !1);
  const o = se(e),
    r = $e(e),
    i = Fe(r);
  let s =
    r === 'x'
      ? o === (n ? 'end' : 'start')
        ? 'right'
        : 'left'
      : o === 'start'
        ? 'bottom'
        : 'top';
  return (t.reference[i] > t.floating[i] && (s = we(s)), [s, we(s)]);
}
function Nn(e) {
  const t = we(e);
  return [Le(e), t, Le(t)];
}
function Le(e) {
  return e.replace(/start|end/g, (t) => Sn[t]);
}
const Ke = ['left', 'right'],
  Ze = ['right', 'left'],
  Tn = ['top', 'bottom'],
  Mn = ['bottom', 'top'];
function Ln(e, t, n) {
  switch (e) {
    case 'top':
    case 'bottom':
      return n ? (t ? Ze : Ke) : t ? Ke : Ze;
    case 'left':
    case 'right':
      return t ? Tn : Mn;
    default:
      return [];
  }
}
function jn(e, t, n, o) {
  const r = se(e);
  let i = Ln(G(e), n === 'start', o);
  return (
    r && ((i = i.map((s) => s + '-' + r)), t && (i = i.concat(i.map(Le)))),
    i
  );
}
function we(e) {
  return e.replace(/left|right|bottom|top/g, (t) => Rn[t]);
}
function Dn(e) {
  return { top: 0, right: 0, bottom: 0, left: 0, ...e };
}
function mt(e) {
  return typeof e != 'number'
    ? Dn(e)
    : { top: e, right: e, bottom: e, left: e };
}
function ye(e) {
  const { x: t, y: n, width: o, height: r } = e;
  return {
    width: o,
    height: r,
    top: n,
    left: t,
    right: t + o,
    bottom: n + r,
    x: t,
    y: n,
  };
}
function Ue(e, t, n) {
  let { reference: o, floating: r } = e;
  const i = B(t),
    s = $e(t),
    c = Fe(s),
    a = G(t),
    f = i === 'y',
    l = o.x + o.width / 2 - r.width / 2,
    u = o.y + o.height / 2 - r.height / 2,
    p = o[c] / 2 - r[c] / 2;
  let d;
  switch (a) {
    case 'top':
      d = { x: l, y: o.y - r.height };
      break;
    case 'bottom':
      d = { x: l, y: o.y + o.height };
      break;
    case 'right':
      d = { x: o.x + o.width, y: u };
      break;
    case 'left':
      d = { x: o.x - r.width, y: u };
      break;
    default:
      d = { x: o.x, y: o.y };
  }
  switch (se(t)) {
    case 'start':
      d[s] -= p * (n && f ? -1 : 1);
      break;
    case 'end':
      d[s] += p * (n && f ? -1 : 1);
      break;
  }
  return d;
}
const _n = async (e, t, n) => {
  const {
      placement: o = 'bottom',
      strategy: r = 'absolute',
      middleware: i = [],
      platform: s,
    } = n,
    c = i.filter(Boolean),
    a = await (s.isRTL == null ? void 0 : s.isRTL(t));
  let f = await s.getElementRects({ reference: e, floating: t, strategy: r }),
    { x: l, y: u } = Ue(f, o, a),
    p = o,
    d = {},
    h = 0;
  for (let m = 0; m < c.length; m++) {
    const { name: v, fn: w } = c[m],
      {
        x: y,
        y: b,
        data: A,
        reset: C,
      } = await w({
        x: l,
        y: u,
        initialPlacement: o,
        placement: p,
        strategy: r,
        middlewareData: d,
        rects: f,
        platform: s,
        elements: { reference: e, floating: t },
      });
    ((l = y ?? l),
      (u = b ?? u),
      (d = { ...d, [v]: { ...d[v], ...A } }),
      C &&
        h <= 50 &&
        (h++,
        typeof C == 'object' &&
          (C.placement && (p = C.placement),
          C.rects &&
            (f =
              C.rects === !0
                ? await s.getElementRects({
                    reference: e,
                    floating: t,
                    strategy: r,
                  })
                : C.rects),
          ({ x: l, y: u } = Ue(f, p, a))),
        (m = -1)));
  }
  return { x: l, y: u, placement: p, strategy: r, middlewareData: d };
};
async function fe(e, t) {
  var n;
  t === void 0 && (t = {});
  const { x: o, y: r, platform: i, rects: s, elements: c, strategy: a } = e,
    {
      boundary: f = 'clippingAncestors',
      rootBoundary: l = 'viewport',
      elementContext: u = 'floating',
      altBoundary: p = !1,
      padding: d = 0,
    } = q(t, e),
    h = mt(d),
    v = c[p ? (u === 'floating' ? 'reference' : 'floating') : u],
    w = ye(
      await i.getClippingRect({
        element:
          (n = await (i.isElement == null ? void 0 : i.isElement(v))) == null ||
          n
            ? v
            : v.contextElement ||
              (await (i.getDocumentElement == null
                ? void 0
                : i.getDocumentElement(c.floating))),
        boundary: f,
        rootBoundary: l,
        strategy: a,
      }),
    ),
    y =
      u === 'floating'
        ? { x: o, y: r, width: s.floating.width, height: s.floating.height }
        : s.reference,
    b = await (i.getOffsetParent == null
      ? void 0
      : i.getOffsetParent(c.floating)),
    A = (await (i.isElement == null ? void 0 : i.isElement(b)))
      ? (await (i.getScale == null ? void 0 : i.getScale(b))) || { x: 1, y: 1 }
      : { x: 1, y: 1 },
    C = ye(
      i.convertOffsetParentRelativeRectToViewportRelativeRect
        ? await i.convertOffsetParentRelativeRectToViewportRelativeRect({
            elements: c,
            rect: y,
            offsetParent: b,
            strategy: a,
          })
        : y,
    );
  return {
    top: (w.top - C.top + h.top) / A.y,
    bottom: (C.bottom - w.bottom + h.bottom) / A.y,
    left: (w.left - C.left + h.left) / A.x,
    right: (C.right - w.right + h.right) / A.x,
  };
}
const kn = (e) => ({
    name: 'arrow',
    options: e,
    async fn(t) {
      const {
          x: n,
          y: o,
          placement: r,
          rects: i,
          platform: s,
          elements: c,
          middlewareData: a,
        } = t,
        { element: f, padding: l = 0 } = q(e, t) || {};
      if (f == null) return {};
      const u = mt(l),
        p = { x: n, y: o },
        d = $e(r),
        h = Fe(d),
        m = await s.getDimensions(f),
        v = d === 'y',
        w = v ? 'top' : 'left',
        y = v ? 'bottom' : 'right',
        b = v ? 'clientHeight' : 'clientWidth',
        A = i.reference[h] + i.reference[d] - p[d] - i.floating[h],
        C = p[d] - i.reference[d],
        R = await (s.getOffsetParent == null ? void 0 : s.getOffsetParent(f));
      let S = R ? R[b] : 0;
      (!S || !(await (s.isElement == null ? void 0 : s.isElement(R)))) &&
        (S = c.floating[b] || i.floating[h]);
      const L = A / 2 - C / 2,
        k = S / 2 - m[h] / 2 - 1,
        M = Z(u[w], k),
        D = Z(u[y], k),
        _ = M,
        E = S - m[h] - D,
        O = S / 2 - m[h] / 2 + L,
        F = Me(_, O, E),
        N =
          !a.arrow &&
          se(r) != null &&
          O !== F &&
          i.reference[h] / 2 - (O < _ ? M : D) - m[h] / 2 < 0,
        T = N ? (O < _ ? O - _ : O - E) : 0;
      return {
        [d]: p[d] + T,
        data: {
          [d]: F,
          centerOffset: O - F - T,
          ...(N && { alignmentOffset: T }),
        },
        reset: N,
      };
    },
  }),
  Fn = function (e) {
    return (
      e === void 0 && (e = {}),
      {
        name: 'flip',
        options: e,
        async fn(t) {
          var n, o;
          const {
              placement: r,
              middlewareData: i,
              rects: s,
              initialPlacement: c,
              platform: a,
              elements: f,
            } = t,
            {
              mainAxis: l = !0,
              crossAxis: u = !0,
              fallbackPlacements: p,
              fallbackStrategy: d = 'bestFit',
              fallbackAxisSideDirection: h = 'none',
              flipAlignment: m = !0,
              ...v
            } = q(e, t);
          if ((n = i.arrow) != null && n.alignmentOffset) return {};
          const w = G(r),
            y = B(c),
            b = G(c) === c,
            A = await (a.isRTL == null ? void 0 : a.isRTL(f.floating)),
            C = p || (b || !m ? [we(c)] : Nn(c)),
            R = h !== 'none';
          !p && R && C.push(...jn(c, m, h, A));
          const S = [c, ...C],
            L = await fe(t, v),
            k = [];
          let M = ((o = i.flip) == null ? void 0 : o.overflows) || [];
          if ((l && k.push(L[w]), u)) {
            const O = En(r, s, A);
            k.push(L[O[0]], L[O[1]]);
          }
          if (
            ((M = [...M, { placement: r, overflows: k }]),
            !k.every((O) => O <= 0))
          ) {
            var D, _;
            const O = (((D = i.flip) == null ? void 0 : D.index) || 0) + 1,
              F = S[O];
            if (
              F &&
              (!(u === 'alignment' ? y !== B(F) : !1) ||
                M.every((P) =>
                  B(P.placement) === y ? P.overflows[0] > 0 : !0,
                ))
            )
              return {
                data: { index: O, overflows: M },
                reset: { placement: F },
              };
            let N =
              (_ = M.filter((T) => T.overflows[0] <= 0).sort(
                (T, P) => T.overflows[1] - P.overflows[1],
              )[0]) == null
                ? void 0
                : _.placement;
            if (!N)
              switch (d) {
                case 'bestFit': {
                  var E;
                  const T =
                    (E = M.filter((P) => {
                      if (R) {
                        const j = B(P.placement);
                        return j === y || j === 'y';
                      }
                      return !0;
                    })
                      .map((P) => [
                        P.placement,
                        P.overflows
                          .filter((j) => j > 0)
                          .reduce((j, z) => j + z, 0),
                      ])
                      .sort((P, j) => P[1] - j[1])[0]) == null
                      ? void 0
                      : E[0];
                  T && (N = T);
                  break;
                }
                case 'initialPlacement':
                  N = c;
                  break;
              }
            if (r !== N) return { reset: { placement: N } };
          }
          return {};
        },
      }
    );
  };
function Je(e, t) {
  return {
    top: e.top - t.height,
    right: e.right - t.width,
    bottom: e.bottom - t.height,
    left: e.left - t.width,
  };
}
function Qe(e) {
  return Pn.some((t) => e[t] >= 0);
}
const $n = function (e) {
    return (
      e === void 0 && (e = {}),
      {
        name: 'hide',
        options: e,
        async fn(t) {
          const { rects: n } = t,
            { strategy: o = 'referenceHidden', ...r } = q(e, t);
          switch (o) {
            case 'referenceHidden': {
              const i = await fe(t, { ...r, elementContext: 'reference' }),
                s = Je(i, n.reference);
              return {
                data: { referenceHiddenOffsets: s, referenceHidden: Qe(s) },
              };
            }
            case 'escaped': {
              const i = await fe(t, { ...r, altBoundary: !0 }),
                s = Je(i, n.floating);
              return { data: { escapedOffsets: s, escaped: Qe(s) } };
            }
            default:
              return {};
          }
        },
      }
    );
  },
  gt = new Set(['left', 'top']);
async function In(e, t) {
  const { placement: n, platform: o, elements: r } = e,
    i = await (o.isRTL == null ? void 0 : o.isRTL(r.floating)),
    s = G(n),
    c = se(n),
    a = B(n) === 'y',
    f = gt.has(s) ? -1 : 1,
    l = i && a ? -1 : 1,
    u = q(t, e);
  let {
    mainAxis: p,
    crossAxis: d,
    alignmentAxis: h,
  } = typeof u == 'number'
    ? { mainAxis: u, crossAxis: 0, alignmentAxis: null }
    : {
        mainAxis: u.mainAxis || 0,
        crossAxis: u.crossAxis || 0,
        alignmentAxis: u.alignmentAxis,
      };
  return (
    c && typeof h == 'number' && (d = c === 'end' ? h * -1 : h),
    a ? { x: d * l, y: p * f } : { x: p * f, y: d * l }
  );
}
const Wn = function (e) {
    return (
      e === void 0 && (e = 0),
      {
        name: 'offset',
        options: e,
        async fn(t) {
          var n, o;
          const { x: r, y: i, placement: s, middlewareData: c } = t,
            a = await In(t, e);
          return s === ((n = c.offset) == null ? void 0 : n.placement) &&
            (o = c.arrow) != null &&
            o.alignmentOffset
            ? {}
            : { x: r + a.x, y: i + a.y, data: { ...a, placement: s } };
        },
      }
    );
  },
  Hn = function (e) {
    return (
      e === void 0 && (e = {}),
      {
        name: 'shift',
        options: e,
        async fn(t) {
          const { x: n, y: o, placement: r } = t,
            {
              mainAxis: i = !0,
              crossAxis: s = !1,
              limiter: c = {
                fn: (v) => {
                  let { x: w, y } = v;
                  return { x: w, y };
                },
              },
              ...a
            } = q(e, t),
            f = { x: n, y: o },
            l = await fe(t, a),
            u = B(G(r)),
            p = ke(u);
          let d = f[p],
            h = f[u];
          if (i) {
            const v = p === 'y' ? 'top' : 'left',
              w = p === 'y' ? 'bottom' : 'right',
              y = d + l[v],
              b = d - l[w];
            d = Me(y, d, b);
          }
          if (s) {
            const v = u === 'y' ? 'top' : 'left',
              w = u === 'y' ? 'bottom' : 'right',
              y = h + l[v],
              b = h - l[w];
            h = Me(y, h, b);
          }
          const m = c.fn({ ...t, [p]: d, [u]: h });
          return {
            ...m,
            data: { x: m.x - n, y: m.y - o, enabled: { [p]: i, [u]: s } },
          };
        },
      }
    );
  },
  zn = function (e) {
    return (
      e === void 0 && (e = {}),
      {
        options: e,
        fn(t) {
          const { x: n, y: o, placement: r, rects: i, middlewareData: s } = t,
            { offset: c = 0, mainAxis: a = !0, crossAxis: f = !0 } = q(e, t),
            l = { x: n, y: o },
            u = B(r),
            p = ke(u);
          let d = l[p],
            h = l[u];
          const m = q(c, t),
            v =
              typeof m == 'number'
                ? { mainAxis: m, crossAxis: 0 }
                : { mainAxis: 0, crossAxis: 0, ...m };
          if (a) {
            const b = p === 'y' ? 'height' : 'width',
              A = i.reference[p] - i.floating[b] + v.mainAxis,
              C = i.reference[p] + i.reference[b] - v.mainAxis;
            d < A ? (d = A) : d > C && (d = C);
          }
          if (f) {
            var w, y;
            const b = p === 'y' ? 'width' : 'height',
              A = gt.has(G(r)),
              C =
                i.reference[u] -
                i.floating[b] +
                ((A && ((w = s.offset) == null ? void 0 : w[u])) || 0) +
                (A ? 0 : v.crossAxis),
              R =
                i.reference[u] +
                i.reference[b] +
                (A ? 0 : ((y = s.offset) == null ? void 0 : y[u]) || 0) -
                (A ? v.crossAxis : 0);
            h < C ? (h = C) : h > R && (h = R);
          }
          return { [p]: d, [u]: h };
        },
      }
    );
  },
  Bn = function (e) {
    return (
      e === void 0 && (e = {}),
      {
        name: 'size',
        options: e,
        async fn(t) {
          var n, o;
          const { placement: r, rects: i, platform: s, elements: c } = t,
            { apply: a = () => {}, ...f } = q(e, t),
            l = await fe(t, f),
            u = G(r),
            p = se(r),
            d = B(r) === 'y',
            { width: h, height: m } = i.floating;
          let v, w;
          u === 'top' || u === 'bottom'
            ? ((v = u),
              (w =
                p ===
                ((await (s.isRTL == null ? void 0 : s.isRTL(c.floating)))
                  ? 'start'
                  : 'end')
                  ? 'left'
                  : 'right'))
            : ((w = u), (v = p === 'end' ? 'top' : 'bottom'));
          const y = m - l.top - l.bottom,
            b = h - l.left - l.right,
            A = Z(m - l[v], y),
            C = Z(h - l[w], b),
            R = !t.middlewareData.shift;
          let S = A,
            L = C;
          if (
            ((n = t.middlewareData.shift) != null && n.enabled.x && (L = b),
            (o = t.middlewareData.shift) != null && o.enabled.y && (S = y),
            R && !p)
          ) {
            const M = $(l.left, 0),
              D = $(l.right, 0),
              _ = $(l.top, 0),
              E = $(l.bottom, 0);
            d
              ? (L = h - 2 * (M !== 0 || D !== 0 ? M + D : $(l.left, l.right)))
              : (S = m - 2 * (_ !== 0 || E !== 0 ? _ + E : $(l.top, l.bottom)));
          }
          await a({ ...t, availableWidth: L, availableHeight: S });
          const k = await s.getDimensions(c.floating);
          return h !== k.width || m !== k.height
            ? { reset: { rects: !0 } }
            : {};
        },
      }
    );
  };
function Ae() {
  return typeof window < 'u';
}
function ce(e) {
  return xt(e) ? (e.nodeName || '').toLowerCase() : '#document';
}
function I(e) {
  var t;
  return (
    (e == null || (t = e.ownerDocument) == null ? void 0 : t.defaultView) ||
    window
  );
}
function X(e) {
  var t;
  return (t = (xt(e) ? e.ownerDocument : e.document) || window.document) == null
    ? void 0
    : t.documentElement;
}
function xt(e) {
  return Ae() ? e instanceof Node || e instanceof I(e).Node : !1;
}
function W(e) {
  return Ae() ? e instanceof Element || e instanceof I(e).Element : !1;
}
function Y(e) {
  return Ae() ? e instanceof HTMLElement || e instanceof I(e).HTMLElement : !1;
}
function et(e) {
  return !Ae() || typeof ShadowRoot > 'u'
    ? !1
    : e instanceof ShadowRoot || e instanceof I(e).ShadowRoot;
}
const Vn = new Set(['inline', 'contents']);
function de(e) {
  const { overflow: t, overflowX: n, overflowY: o, display: r } = H(e);
  return /auto|scroll|overlay|hidden|clip/.test(t + o + n) && !Vn.has(r);
}
const Yn = new Set(['table', 'td', 'th']);
function Xn(e) {
  return Yn.has(ce(e));
}
const qn = [':popover-open', ':modal'];
function Ce(e) {
  return qn.some((t) => {
    try {
      return e.matches(t);
    } catch {
      return !1;
    }
  });
}
const Gn = ['transform', 'translate', 'scale', 'rotate', 'perspective'],
  Kn = ['transform', 'translate', 'scale', 'rotate', 'perspective', 'filter'],
  Zn = ['paint', 'layout', 'strict', 'content'];
function Ie(e) {
  const t = We(),
    n = W(e) ? H(e) : e;
  return (
    Gn.some((o) => (n[o] ? n[o] !== 'none' : !1)) ||
    (n.containerType ? n.containerType !== 'normal' : !1) ||
    (!t && (n.backdropFilter ? n.backdropFilter !== 'none' : !1)) ||
    (!t && (n.filter ? n.filter !== 'none' : !1)) ||
    Kn.some((o) => (n.willChange || '').includes(o)) ||
    Zn.some((o) => (n.contain || '').includes(o))
  );
}
function Un(e) {
  let t = U(e);
  for (; Y(t) && !oe(t); ) {
    if (Ie(t)) return t;
    if (Ce(t)) return null;
    t = U(t);
  }
  return null;
}
function We() {
  return typeof CSS > 'u' || !CSS.supports
    ? !1
    : CSS.supports('-webkit-backdrop-filter', 'none');
}
const Jn = new Set(['html', 'body', '#document']);
function oe(e) {
  return Jn.has(ce(e));
}
function H(e) {
  return I(e).getComputedStyle(e);
}
function Pe(e) {
  return W(e)
    ? { scrollLeft: e.scrollLeft, scrollTop: e.scrollTop }
    : { scrollLeft: e.scrollX, scrollTop: e.scrollY };
}
function U(e) {
  if (ce(e) === 'html') return e;
  const t = e.assignedSlot || e.parentNode || (et(e) && e.host) || X(e);
  return et(t) ? t.host : t;
}
function vt(e) {
  const t = U(e);
  return oe(t)
    ? e.ownerDocument
      ? e.ownerDocument.body
      : e.body
    : Y(t) && de(t)
      ? t
      : vt(t);
}
function ue(e, t, n) {
  var o;
  (t === void 0 && (t = []), n === void 0 && (n = !0));
  const r = vt(e),
    i = r === ((o = e.ownerDocument) == null ? void 0 : o.body),
    s = I(r);
  if (i) {
    const c = je(s);
    return t.concat(
      s,
      s.visualViewport || [],
      de(r) ? r : [],
      c && n ? ue(c) : [],
    );
  }
  return t.concat(r, ue(r, [], n));
}
function je(e) {
  return e.parent && Object.getPrototypeOf(e.parent) ? e.frameElement : null;
}
function wt(e) {
  const t = H(e);
  let n = parseFloat(t.width) || 0,
    o = parseFloat(t.height) || 0;
  const r = Y(e),
    i = r ? e.offsetWidth : n,
    s = r ? e.offsetHeight : o,
    c = ve(n) !== i || ve(o) !== s;
  return (c && ((n = i), (o = s)), { width: n, height: o, $: c });
}
function He(e) {
  return W(e) ? e : e.contextElement;
}
function te(e) {
  const t = He(e);
  if (!Y(t)) return V(1);
  const n = t.getBoundingClientRect(),
    { width: o, height: r, $: i } = wt(t);
  let s = (i ? ve(n.width) : n.width) / o,
    c = (i ? ve(n.height) : n.height) / r;
  return (
    (!s || !Number.isFinite(s)) && (s = 1),
    (!c || !Number.isFinite(c)) && (c = 1),
    { x: s, y: c }
  );
}
const Qn = V(0);
function yt(e) {
  const t = I(e);
  return !We() || !t.visualViewport
    ? Qn
    : { x: t.visualViewport.offsetLeft, y: t.visualViewport.offsetTop };
}
function eo(e, t, n) {
  return (t === void 0 && (t = !1), !n || (t && n !== I(e)) ? !1 : t);
}
function ee(e, t, n, o) {
  (t === void 0 && (t = !1), n === void 0 && (n = !1));
  const r = e.getBoundingClientRect(),
    i = He(e);
  let s = V(1);
  t && (o ? W(o) && (s = te(o)) : (s = te(e)));
  const c = eo(i, n, o) ? yt(i) : V(0);
  let a = (r.left + c.x) / s.x,
    f = (r.top + c.y) / s.y,
    l = r.width / s.x,
    u = r.height / s.y;
  if (i) {
    const p = I(i),
      d = o && W(o) ? I(o) : o;
    let h = p,
      m = je(h);
    for (; m && o && d !== h; ) {
      const v = te(m),
        w = m.getBoundingClientRect(),
        y = H(m),
        b = w.left + (m.clientLeft + parseFloat(y.paddingLeft)) * v.x,
        A = w.top + (m.clientTop + parseFloat(y.paddingTop)) * v.y;
      ((a *= v.x),
        (f *= v.y),
        (l *= v.x),
        (u *= v.y),
        (a += b),
        (f += A),
        (h = I(m)),
        (m = je(h)));
    }
  }
  return ye({ width: l, height: u, x: a, y: f });
}
function Re(e, t) {
  const n = Pe(e).scrollLeft;
  return t ? t.left + n : ee(X(e)).left + n;
}
function bt(e, t) {
  const n = e.getBoundingClientRect(),
    o = n.left + t.scrollLeft - Re(e, n),
    r = n.top + t.scrollTop;
  return { x: o, y: r };
}
function to(e) {
  let { elements: t, rect: n, offsetParent: o, strategy: r } = e;
  const i = r === 'fixed',
    s = X(o),
    c = t ? Ce(t.floating) : !1;
  if (o === s || (c && i)) return n;
  let a = { scrollLeft: 0, scrollTop: 0 },
    f = V(1);
  const l = V(0),
    u = Y(o);
  if ((u || (!u && !i)) && ((ce(o) !== 'body' || de(s)) && (a = Pe(o)), Y(o))) {
    const d = ee(o);
    ((f = te(o)), (l.x = d.x + o.clientLeft), (l.y = d.y + o.clientTop));
  }
  const p = s && !u && !i ? bt(s, a) : V(0);
  return {
    width: n.width * f.x,
    height: n.height * f.y,
    x: n.x * f.x - a.scrollLeft * f.x + l.x + p.x,
    y: n.y * f.y - a.scrollTop * f.y + l.y + p.y,
  };
}
function no(e) {
  return Array.from(e.getClientRects());
}
function oo(e) {
  const t = X(e),
    n = Pe(e),
    o = e.ownerDocument.body,
    r = $(t.scrollWidth, t.clientWidth, o.scrollWidth, o.clientWidth),
    i = $(t.scrollHeight, t.clientHeight, o.scrollHeight, o.clientHeight);
  let s = -n.scrollLeft + Re(e);
  const c = -n.scrollTop;
  return (
    H(o).direction === 'rtl' && (s += $(t.clientWidth, o.clientWidth) - r),
    { width: r, height: i, x: s, y: c }
  );
}
const tt = 25;
function ro(e, t) {
  const n = I(e),
    o = X(e),
    r = n.visualViewport;
  let i = o.clientWidth,
    s = o.clientHeight,
    c = 0,
    a = 0;
  if (r) {
    ((i = r.width), (s = r.height));
    const l = We();
    (!l || (l && t === 'fixed')) && ((c = r.offsetLeft), (a = r.offsetTop));
  }
  const f = Re(o);
  if (f <= 0) {
    const l = o.ownerDocument,
      u = l.body,
      p = getComputedStyle(u),
      d =
        (l.compatMode === 'CSS1Compat' &&
          parseFloat(p.marginLeft) + parseFloat(p.marginRight)) ||
        0,
      h = Math.abs(o.clientWidth - u.clientWidth - d);
    h <= tt && (i -= h);
  } else f <= tt && (i += f);
  return { width: i, height: s, x: c, y: a };
}
const io = new Set(['absolute', 'fixed']);
function so(e, t) {
  const n = ee(e, !0, t === 'fixed'),
    o = n.top + e.clientTop,
    r = n.left + e.clientLeft,
    i = Y(e) ? te(e) : V(1),
    s = e.clientWidth * i.x,
    c = e.clientHeight * i.y,
    a = r * i.x,
    f = o * i.y;
  return { width: s, height: c, x: a, y: f };
}
function nt(e, t, n) {
  let o;
  if (t === 'viewport') o = ro(e, n);
  else if (t === 'document') o = oo(X(e));
  else if (W(t)) o = so(t, n);
  else {
    const r = yt(e);
    o = { x: t.x - r.x, y: t.y - r.y, width: t.width, height: t.height };
  }
  return ye(o);
}
function At(e, t) {
  const n = U(e);
  return n === t || !W(n) || oe(n) ? !1 : H(n).position === 'fixed' || At(n, t);
}
function co(e, t) {
  const n = t.get(e);
  if (n) return n;
  let o = ue(e, [], !1).filter((c) => W(c) && ce(c) !== 'body'),
    r = null;
  const i = H(e).position === 'fixed';
  let s = i ? U(e) : e;
  for (; W(s) && !oe(s); ) {
    const c = H(s),
      a = Ie(s);
    (!a && c.position === 'fixed' && (r = null),
      (
        i
          ? !a && !r
          : (!a && c.position === 'static' && !!r && io.has(r.position)) ||
            (de(s) && !a && At(e, s))
      )
        ? (o = o.filter((l) => l !== s))
        : (r = c),
      (s = U(s)));
  }
  return (t.set(e, o), o);
}
function ao(e) {
  let { element: t, boundary: n, rootBoundary: o, strategy: r } = e;
  const s = [
      ...(n === 'clippingAncestors'
        ? Ce(t)
          ? []
          : co(t, this._c)
        : [].concat(n)),
      o,
    ],
    c = s[0],
    a = s.reduce(
      (f, l) => {
        const u = nt(t, l, r);
        return (
          (f.top = $(u.top, f.top)),
          (f.right = Z(u.right, f.right)),
          (f.bottom = Z(u.bottom, f.bottom)),
          (f.left = $(u.left, f.left)),
          f
        );
      },
      nt(t, c, r),
    );
  return {
    width: a.right - a.left,
    height: a.bottom - a.top,
    x: a.left,
    y: a.top,
  };
}
function lo(e) {
  const { width: t, height: n } = wt(e);
  return { width: t, height: n };
}
function fo(e, t, n) {
  const o = Y(t),
    r = X(t),
    i = n === 'fixed',
    s = ee(e, !0, i, t);
  let c = { scrollLeft: 0, scrollTop: 0 };
  const a = V(0);
  function f() {
    a.x = Re(r);
  }
  if (o || (!o && !i))
    if (((ce(t) !== 'body' || de(r)) && (c = Pe(t)), o)) {
      const d = ee(t, !0, i, t);
      ((a.x = d.x + t.clientLeft), (a.y = d.y + t.clientTop));
    } else r && f();
  i && !o && r && f();
  const l = r && !o && !i ? bt(r, c) : V(0),
    u = s.left + c.scrollLeft - a.x - l.x,
    p = s.top + c.scrollTop - a.y - l.y;
  return { x: u, y: p, width: s.width, height: s.height };
}
function Oe(e) {
  return H(e).position === 'static';
}
function ot(e, t) {
  if (!Y(e) || H(e).position === 'fixed') return null;
  if (t) return t(e);
  let n = e.offsetParent;
  return (X(e) === n && (n = n.ownerDocument.body), n);
}
function Ct(e, t) {
  const n = I(e);
  if (Ce(e)) return n;
  if (!Y(e)) {
    let r = U(e);
    for (; r && !oe(r); ) {
      if (W(r) && !Oe(r)) return r;
      r = U(r);
    }
    return n;
  }
  let o = ot(e, t);
  for (; o && Xn(o) && Oe(o); ) o = ot(o, t);
  return o && oe(o) && Oe(o) && !Ie(o) ? n : o || Un(e) || n;
}
const uo = async function (e) {
  const t = this.getOffsetParent || Ct,
    n = this.getDimensions,
    o = await n(e.floating);
  return {
    reference: fo(e.reference, await t(e.floating), e.strategy),
    floating: { x: 0, y: 0, width: o.width, height: o.height },
  };
};
function po(e) {
  return H(e).direction === 'rtl';
}
const ho = {
  convertOffsetParentRelativeRectToViewportRelativeRect: to,
  getDocumentElement: X,
  getClippingRect: ao,
  getOffsetParent: Ct,
  getElementRects: uo,
  getClientRects: no,
  getDimensions: lo,
  getScale: te,
  isElement: W,
  isRTL: po,
};
function Pt(e, t) {
  return (
    e.x === t.x && e.y === t.y && e.width === t.width && e.height === t.height
  );
}
function mo(e, t) {
  let n = null,
    o;
  const r = X(e);
  function i() {
    var c;
    (clearTimeout(o), (c = n) == null || c.disconnect(), (n = null));
  }
  function s(c, a) {
    (c === void 0 && (c = !1), a === void 0 && (a = 1), i());
    const f = e.getBoundingClientRect(),
      { left: l, top: u, width: p, height: d } = f;
    if ((c || t(), !p || !d)) return;
    const h = me(u),
      m = me(r.clientWidth - (l + p)),
      v = me(r.clientHeight - (u + d)),
      w = me(l),
      b = {
        rootMargin: -h + 'px ' + -m + 'px ' + -v + 'px ' + -w + 'px',
        threshold: $(0, Z(1, a)) || 1,
      };
    let A = !0;
    function C(R) {
      const S = R[0].intersectionRatio;
      if (S !== a) {
        if (!A) return s();
        S
          ? s(!1, S)
          : (o = setTimeout(() => {
              s(!1, 1e-7);
            }, 1e3));
      }
      (S === 1 && !Pt(f, e.getBoundingClientRect()) && s(), (A = !1));
    }
    try {
      n = new IntersectionObserver(C, { ...b, root: r.ownerDocument });
    } catch {
      n = new IntersectionObserver(C, b);
    }
    n.observe(e);
  }
  return (s(!0), i);
}
function go(e, t, n, o) {
  o === void 0 && (o = {});
  const {
      ancestorScroll: r = !0,
      ancestorResize: i = !0,
      elementResize: s = typeof ResizeObserver == 'function',
      layoutShift: c = typeof IntersectionObserver == 'function',
      animationFrame: a = !1,
    } = o,
    f = He(e),
    l = r || i ? [...(f ? ue(f) : []), ...ue(t)] : [];
  l.forEach((w) => {
    (r && w.addEventListener('scroll', n, { passive: !0 }),
      i && w.addEventListener('resize', n));
  });
  const u = f && c ? mo(f, n) : null;
  let p = -1,
    d = null;
  s &&
    ((d = new ResizeObserver((w) => {
      let [y] = w;
      (y &&
        y.target === f &&
        d &&
        (d.unobserve(t),
        cancelAnimationFrame(p),
        (p = requestAnimationFrame(() => {
          var b;
          (b = d) == null || b.observe(t);
        }))),
        n());
    })),
    f && !a && d.observe(f),
    d.observe(t));
  let h,
    m = a ? ee(e) : null;
  a && v();
  function v() {
    const w = ee(e);
    (m && !Pt(m, w) && n(), (m = w), (h = requestAnimationFrame(v)));
  }
  return (
    n(),
    () => {
      var w;
      (l.forEach((y) => {
        (r && y.removeEventListener('scroll', n),
          i && y.removeEventListener('resize', n));
      }),
        u?.(),
        (w = d) == null || w.disconnect(),
        (d = null),
        a && cancelAnimationFrame(h));
    }
  );
}
const xo = Wn,
  vo = Hn,
  wo = Fn,
  yo = Bn,
  bo = $n,
  rt = kn,
  Ao = zn,
  Co = (e, t, n) => {
    const o = new Map(),
      r = { platform: ho, ...n },
      i = { ...r.platform, _c: o };
    return _n(e, t, { ...r, platform: i });
  };
var Po = typeof document < 'u',
  Ro = function () {},
  ge = Po ? g.useLayoutEffect : Ro;
function be(e, t) {
  if (e === t) return !0;
  if (typeof e != typeof t) return !1;
  if (typeof e == 'function' && e.toString() === t.toString()) return !0;
  let n, o, r;
  if (e && t && typeof e == 'object') {
    if (Array.isArray(e)) {
      if (((n = e.length), n !== t.length)) return !1;
      for (o = n; o-- !== 0; ) if (!be(e[o], t[o])) return !1;
      return !0;
    }
    if (((r = Object.keys(e)), (n = r.length), n !== Object.keys(t).length))
      return !1;
    for (o = n; o-- !== 0; ) if (!{}.hasOwnProperty.call(t, r[o])) return !1;
    for (o = n; o-- !== 0; ) {
      const i = r[o];
      if (!(i === '_owner' && e.$$typeof) && !be(e[i], t[i])) return !1;
    }
    return !0;
  }
  return e !== e && t !== t;
}
function Rt(e) {
  return typeof window > 'u'
    ? 1
    : (e.ownerDocument.defaultView || window).devicePixelRatio || 1;
}
function it(e, t) {
  const n = Rt(e);
  return Math.round(t * n) / n;
}
function Ee(e) {
  const t = g.useRef(e);
  return (
    ge(() => {
      t.current = e;
    }),
    t
  );
}
function So(e) {
  e === void 0 && (e = {});
  const {
      placement: t = 'bottom',
      strategy: n = 'absolute',
      middleware: o = [],
      platform: r,
      elements: { reference: i, floating: s } = {},
      transform: c = !0,
      whileElementsMounted: a,
      open: f,
    } = e,
    [l, u] = g.useState({
      x: 0,
      y: 0,
      strategy: n,
      placement: t,
      middlewareData: {},
      isPositioned: !1,
    }),
    [p, d] = g.useState(o);
  be(p, o) || d(o);
  const [h, m] = g.useState(null),
    [v, w] = g.useState(null),
    y = g.useCallback((P) => {
      P !== R.current && ((R.current = P), m(P));
    }, []),
    b = g.useCallback((P) => {
      P !== S.current && ((S.current = P), w(P));
    }, []),
    A = i || h,
    C = s || v,
    R = g.useRef(null),
    S = g.useRef(null),
    L = g.useRef(l),
    k = a != null,
    M = Ee(a),
    D = Ee(r),
    _ = Ee(f),
    E = g.useCallback(() => {
      if (!R.current || !S.current) return;
      const P = { placement: t, strategy: n, middleware: p };
      (D.current && (P.platform = D.current),
        Co(R.current, S.current, P).then((j) => {
          const z = { ...j, isPositioned: _.current !== !1 };
          O.current &&
            !be(L.current, z) &&
            ((L.current = z),
            cn.flushSync(() => {
              u(z);
            }));
        }));
    }, [p, t, n, D, _]);
  ge(() => {
    f === !1 &&
      L.current.isPositioned &&
      ((L.current.isPositioned = !1), u((P) => ({ ...P, isPositioned: !1 })));
  }, [f]);
  const O = g.useRef(!1);
  (ge(
    () => (
      (O.current = !0),
      () => {
        O.current = !1;
      }
    ),
    [],
  ),
    ge(() => {
      if ((A && (R.current = A), C && (S.current = C), A && C)) {
        if (M.current) return M.current(A, C, E);
        E();
      }
    }, [A, C, E, M, k]));
  const F = g.useMemo(
      () => ({ reference: R, floating: S, setReference: y, setFloating: b }),
      [y, b],
    ),
    N = g.useMemo(() => ({ reference: A, floating: C }), [A, C]),
    T = g.useMemo(() => {
      const P = { position: n, left: 0, top: 0 };
      if (!N.floating) return P;
      const j = it(N.floating, l.x),
        z = it(N.floating, l.y);
      return c
        ? {
            ...P,
            transform: 'translate(' + j + 'px, ' + z + 'px)',
            ...(Rt(N.floating) >= 1.5 && { willChange: 'transform' }),
          }
        : { position: n, left: j, top: z };
    }, [n, c, N.floating, l.x, l.y]);
  return g.useMemo(
    () => ({ ...l, update: E, refs: F, elements: N, floatingStyles: T }),
    [l, E, F, N, T],
  );
}
const Oo = (e) => {
    function t(n) {
      return {}.hasOwnProperty.call(n, 'current');
    }
    return {
      name: 'arrow',
      options: e,
      fn(n) {
        const { element: o, padding: r } = typeof e == 'function' ? e(n) : e;
        return o && t(o)
          ? o.current != null
            ? rt({ element: o.current, padding: r }).fn(n)
            : {}
          : o
            ? rt({ element: o, padding: r }).fn(n)
            : {};
      },
    };
  },
  Eo = (e, t) => ({ ...xo(e), options: [e, t] }),
  No = (e, t) => ({ ...vo(e), options: [e, t] }),
  To = (e, t) => ({ ...Ao(e), options: [e, t] }),
  Mo = (e, t) => ({ ...wo(e), options: [e, t] }),
  Lo = (e, t) => ({ ...yo(e), options: [e, t] }),
  jo = (e, t) => ({ ...bo(e), options: [e, t] }),
  Do = (e, t) => ({ ...Oo(e), options: [e, t] });
var _o = 'Arrow',
  St = g.forwardRef((e, t) => {
    const { children: n, width: o = 10, height: r = 5, ...i } = e;
    return x.jsx(ie.svg, {
      ...i,
      ref: t,
      width: o,
      height: r,
      viewBox: '0 0 30 10',
      preserveAspectRatio: 'none',
      children: e.asChild ? n : x.jsx('polygon', { points: '0,0 30,0 15,10' }),
    });
  });
St.displayName = _o;
var ko = St;
function Fo(e) {
  const [t, n] = g.useState(void 0);
  return (
    xe(() => {
      if (e) {
        n({ width: e.offsetWidth, height: e.offsetHeight });
        const o = new ResizeObserver((r) => {
          if (!Array.isArray(r) || !r.length) return;
          const i = r[0];
          let s, c;
          if ('borderBoxSize' in i) {
            const a = i.borderBoxSize,
              f = Array.isArray(a) ? a[0] : a;
            ((s = f.inlineSize), (c = f.blockSize));
          } else ((s = e.offsetWidth), (c = e.offsetHeight));
          n({ width: s, height: c });
        });
        return (o.observe(e, { box: 'border-box' }), () => o.unobserve(e));
      } else n(void 0);
    }, [e]),
    t
  );
}
var ze = 'Popper',
  [Ot, Et] = De(ze),
  [$o, Nt] = Ot(ze),
  Tt = (e) => {
    const { __scopePopper: t, children: n } = e,
      [o, r] = g.useState(null);
    return x.jsx($o, { scope: t, anchor: o, onAnchorChange: r, children: n });
  };
Tt.displayName = ze;
var Mt = 'PopperAnchor',
  Lt = g.forwardRef((e, t) => {
    const { __scopePopper: n, virtualRef: o, ...r } = e,
      i = Nt(Mt, n),
      s = g.useRef(null),
      c = ne(t, s),
      a = g.useRef(null);
    return (
      g.useEffect(() => {
        const f = a.current;
        ((a.current = o?.current || s.current),
          f !== a.current && i.onAnchorChange(a.current));
      }),
      o ? null : x.jsx(ie.div, { ...r, ref: c })
    );
  });
Lt.displayName = Mt;
var Be = 'PopperContent',
  [Io, Wo] = Ot(Be),
  jt = g.forwardRef((e, t) => {
    const {
        __scopePopper: n,
        side: o = 'bottom',
        sideOffset: r = 0,
        align: i = 'center',
        alignOffset: s = 0,
        arrowPadding: c = 0,
        avoidCollisions: a = !0,
        collisionBoundary: f = [],
        collisionPadding: l = 0,
        sticky: u = 'partial',
        hideWhenDetached: p = !1,
        updatePositionStrategy: d = 'optimized',
        onPlaced: h,
        ...m
      } = e,
      v = Nt(Be, n),
      [w, y] = g.useState(null),
      b = ne(t, (ae) => y(ae)),
      [A, C] = g.useState(null),
      R = Fo(A),
      S = R?.width ?? 0,
      L = R?.height ?? 0,
      k = o + (i !== 'center' ? '-' + i : ''),
      M =
        typeof l == 'number'
          ? l
          : { top: 0, right: 0, bottom: 0, left: 0, ...l },
      D = Array.isArray(f) ? f : [f],
      _ = D.length > 0,
      E = { padding: M, boundary: D.filter(zo), altBoundary: _ },
      {
        refs: O,
        floatingStyles: F,
        placement: N,
        isPositioned: T,
        middlewareData: P,
      } = So({
        strategy: 'fixed',
        placement: k,
        whileElementsMounted: (...ae) =>
          go(...ae, { animationFrame: d === 'always' }),
        elements: { reference: v.anchor },
        middleware: [
          Eo({ mainAxis: r + L, alignmentAxis: s }),
          a &&
            No({
              mainAxis: !0,
              crossAxis: !1,
              limiter: u === 'partial' ? To() : void 0,
              ...E,
            }),
          a && Mo({ ...E }),
          Lo({
            ...E,
            apply: ({
              elements: ae,
              rects: Xe,
              availableWidth: tn,
              availableHeight: nn,
            }) => {
              const { width: on, height: rn } = Xe.reference,
                he = ae.floating.style;
              (he.setProperty('--radix-popper-available-width', `${tn}px`),
                he.setProperty('--radix-popper-available-height', `${nn}px`),
                he.setProperty('--radix-popper-anchor-width', `${on}px`),
                he.setProperty('--radix-popper-anchor-height', `${rn}px`));
            },
          }),
          A && Do({ element: A, padding: c }),
          Bo({ arrowWidth: S, arrowHeight: L }),
          p && jo({ strategy: 'referenceHidden', ...E }),
        ],
      }),
      [j, z] = kt(N),
      Ye = mn(h);
    xe(() => {
      T && Ye?.();
    }, [T, Ye]);
    const Zt = P.arrow?.x,
      Ut = P.arrow?.y,
      Jt = P.arrow?.centerOffset !== 0,
      [Qt, en] = g.useState();
    return (
      xe(() => {
        w && en(window.getComputedStyle(w).zIndex);
      }, [w]),
      x.jsx('div', {
        ref: O.setFloating,
        'data-radix-popper-content-wrapper': '',
        style: {
          ...F,
          transform: T ? F.transform : 'translate(0, -200%)',
          minWidth: 'max-content',
          zIndex: Qt,
          '--radix-popper-transform-origin': [
            P.transformOrigin?.x,
            P.transformOrigin?.y,
          ].join(' '),
          ...(P.hide?.referenceHidden && {
            visibility: 'hidden',
            pointerEvents: 'none',
          }),
        },
        dir: e.dir,
        children: x.jsx(Io, {
          scope: n,
          placedSide: j,
          onArrowChange: C,
          arrowX: Zt,
          arrowY: Ut,
          shouldHideArrow: Jt,
          children: x.jsx(ie.div, {
            'data-side': j,
            'data-align': z,
            ...m,
            ref: b,
            style: { ...m.style, animation: T ? void 0 : 'none' },
          }),
        }),
      })
    );
  });
jt.displayName = Be;
var Dt = 'PopperArrow',
  Ho = { top: 'bottom', right: 'left', bottom: 'top', left: 'right' },
  _t = g.forwardRef(function (t, n) {
    const { __scopePopper: o, ...r } = t,
      i = Wo(Dt, o),
      s = Ho[i.placedSide];
    return x.jsx('span', {
      ref: i.onArrowChange,
      style: {
        position: 'absolute',
        left: i.arrowX,
        top: i.arrowY,
        [s]: 0,
        transformOrigin: {
          top: '',
          right: '0 0',
          bottom: 'center 0',
          left: '100% 0',
        }[i.placedSide],
        transform: {
          top: 'translateY(100%)',
          right: 'translateY(50%) rotate(90deg) translateX(-50%)',
          bottom: 'rotate(180deg)',
          left: 'translateY(50%) rotate(-90deg) translateX(50%)',
        }[i.placedSide],
        visibility: i.shouldHideArrow ? 'hidden' : void 0,
      },
      children: x.jsx(ko, {
        ...r,
        ref: n,
        style: { ...r.style, display: 'block' },
      }),
    });
  });
_t.displayName = Dt;
function zo(e) {
  return e !== null;
}
var Bo = (e) => ({
  name: 'transformOrigin',
  options: e,
  fn(t) {
    const { placement: n, rects: o, middlewareData: r } = t,
      s = r.arrow?.centerOffset !== 0,
      c = s ? 0 : e.arrowWidth,
      a = s ? 0 : e.arrowHeight,
      [f, l] = kt(n),
      u = { start: '0%', center: '50%', end: '100%' }[l],
      p = (r.arrow?.x ?? 0) + c / 2,
      d = (r.arrow?.y ?? 0) + a / 2;
    let h = '',
      m = '';
    return (
      f === 'bottom'
        ? ((h = s ? u : `${p}px`), (m = `${-a}px`))
        : f === 'top'
          ? ((h = s ? u : `${p}px`), (m = `${o.floating.height + a}px`))
          : f === 'right'
            ? ((h = `${-a}px`), (m = s ? u : `${d}px`))
            : f === 'left' &&
              ((h = `${o.floating.width + a}px`), (m = s ? u : `${d}px`)),
      { data: { x: h, y: m } }
    );
  },
});
function kt(e) {
  const [t, n = 'center'] = e.split('-');
  return [t, n];
}
var Vo = Tt,
  Ft = Lt,
  Yo = jt,
  Xo = _t,
  Se = 'Popover',
  [$t] = De(Se, [Et]),
  pe = Et(),
  [qo, J] = $t(Se),
  It = (e) => {
    const {
        __scopePopover: t,
        children: n,
        open: o,
        defaultOpen: r,
        onOpenChange: i,
        modal: s = !1,
      } = e,
      c = pe(t),
      a = g.useRef(null),
      [f, l] = g.useState(!1),
      [u, p] = bn({ prop: o, defaultProp: r ?? !1, onChange: i, caller: Se });
    return x.jsx(Vo, {
      ...c,
      children: x.jsx(qo, {
        scope: t,
        contentId: An(),
        triggerRef: a,
        open: u,
        onOpenChange: p,
        onOpenToggle: g.useCallback(() => p((d) => !d), [p]),
        hasCustomAnchor: f,
        onCustomAnchorAdd: g.useCallback(() => l(!0), []),
        onCustomAnchorRemove: g.useCallback(() => l(!1), []),
        modal: s,
        children: n,
      }),
    });
  };
It.displayName = Se;
var Wt = 'PopoverAnchor',
  Go = g.forwardRef((e, t) => {
    const { __scopePopover: n, ...o } = e,
      r = J(Wt, n),
      i = pe(n),
      { onCustomAnchorAdd: s, onCustomAnchorRemove: c } = r;
    return (
      g.useEffect(() => (s(), () => c()), [s, c]),
      x.jsx(Ft, { ...i, ...o, ref: t })
    );
  });
Go.displayName = Wt;
var Ht = 'PopoverTrigger',
  zt = g.forwardRef((e, t) => {
    const { __scopePopover: n, ...o } = e,
      r = J(Ht, n),
      i = pe(n),
      s = ne(t, r.triggerRef),
      c = x.jsx(ie.button, {
        type: 'button',
        'aria-haspopup': 'dialog',
        'aria-expanded': r.open,
        'aria-controls': r.contentId,
        'data-state': qt(r.open),
        ...o,
        ref: s,
        onClick: le(e.onClick, r.onOpenToggle),
      });
    return r.hasCustomAnchor
      ? c
      : x.jsx(Ft, { asChild: !0, ...i, children: c });
  });
zt.displayName = Ht;
var Ve = 'PopoverPortal',
  [Ko, Zo] = $t(Ve, { forceMount: void 0 }),
  Bt = (e) => {
    const { __scopePopover: t, forceMount: n, children: o, container: r } = e,
      i = J(Ve, t);
    return x.jsx(Ko, {
      scope: t,
      forceMount: n,
      children: x.jsx(ft, {
        present: n || i.open,
        children: x.jsx(ut, { asChild: !0, container: r, children: o }),
      }),
    });
  };
Bt.displayName = Ve;
var re = 'PopoverContent',
  Vt = g.forwardRef((e, t) => {
    const n = Zo(re, e.__scopePopover),
      { forceMount: o = n.forceMount, ...r } = e,
      i = J(re, e.__scopePopover);
    return x.jsx(ft, {
      present: o || i.open,
      children: i.modal
        ? x.jsx(Jo, { ...r, ref: t })
        : x.jsx(Qo, { ...r, ref: t }),
    });
  });
Vt.displayName = re;
var Uo = Ne('PopoverContent.RemoveScroll'),
  Jo = g.forwardRef((e, t) => {
    const n = J(re, e.__scopePopover),
      o = g.useRef(null),
      r = ne(t, o),
      i = g.useRef(!1);
    return (
      g.useEffect(() => {
        const s = o.current;
        if (s) return gn(s);
      }, []),
      x.jsx(xn, {
        as: Uo,
        allowPinchZoom: !0,
        children: x.jsx(Yt, {
          ...e,
          ref: r,
          trapFocus: n.open,
          disableOutsidePointerEvents: !0,
          onCloseAutoFocus: le(e.onCloseAutoFocus, (s) => {
            (s.preventDefault(), i.current || n.triggerRef.current?.focus());
          }),
          onPointerDownOutside: le(
            e.onPointerDownOutside,
            (s) => {
              const c = s.detail.originalEvent,
                a = c.button === 0 && c.ctrlKey === !0,
                f = c.button === 2 || a;
              i.current = f;
            },
            { checkForDefaultPrevented: !1 },
          ),
          onFocusOutside: le(e.onFocusOutside, (s) => s.preventDefault(), {
            checkForDefaultPrevented: !1,
          }),
        }),
      })
    );
  }),
  Qo = g.forwardRef((e, t) => {
    const n = J(re, e.__scopePopover),
      o = g.useRef(!1),
      r = g.useRef(!1);
    return x.jsx(Yt, {
      ...e,
      ref: t,
      trapFocus: !1,
      disableOutsidePointerEvents: !1,
      onCloseAutoFocus: (i) => {
        (e.onCloseAutoFocus?.(i),
          i.defaultPrevented ||
            (o.current || n.triggerRef.current?.focus(), i.preventDefault()),
          (o.current = !1),
          (r.current = !1));
      },
      onInteractOutside: (i) => {
        (e.onInteractOutside?.(i),
          i.defaultPrevented ||
            ((o.current = !0),
            i.detail.originalEvent.type === 'pointerdown' && (r.current = !0)));
        const s = i.target;
        (n.triggerRef.current?.contains(s) && i.preventDefault(),
          i.detail.originalEvent.type === 'focusin' &&
            r.current &&
            i.preventDefault());
      },
    });
  }),
  Yt = g.forwardRef((e, t) => {
    const {
        __scopePopover: n,
        trapFocus: o,
        onOpenAutoFocus: r,
        onCloseAutoFocus: i,
        disableOutsidePointerEvents: s,
        onEscapeKeyDown: c,
        onPointerDownOutside: a,
        onFocusOutside: f,
        onInteractOutside: l,
        ...u
      } = e,
      p = J(re, n),
      d = pe(n);
    return (
      vn(),
      x.jsx(wn, {
        asChild: !0,
        loop: !0,
        trapped: o,
        onMountAutoFocus: r,
        onUnmountAutoFocus: i,
        children: x.jsx(yn, {
          asChild: !0,
          disableOutsidePointerEvents: s,
          onInteractOutside: l,
          onEscapeKeyDown: c,
          onPointerDownOutside: a,
          onFocusOutside: f,
          onDismiss: () => p.onOpenChange(!1),
          children: x.jsx(Yo, {
            'data-state': qt(p.open),
            role: 'dialog',
            id: p.contentId,
            ...d,
            ...u,
            ref: t,
            style: {
              ...u.style,
              '--radix-popover-content-transform-origin':
                'var(--radix-popper-transform-origin)',
              '--radix-popover-content-available-width':
                'var(--radix-popper-available-width)',
              '--radix-popover-content-available-height':
                'var(--radix-popper-available-height)',
              '--radix-popover-trigger-width':
                'var(--radix-popper-anchor-width)',
              '--radix-popover-trigger-height':
                'var(--radix-popper-anchor-height)',
            },
          }),
        }),
      })
    );
  }),
  Xt = 'PopoverClose',
  er = g.forwardRef((e, t) => {
    const { __scopePopover: n, ...o } = e,
      r = J(Xt, n);
    return x.jsx(ie.button, {
      type: 'button',
      ...o,
      ref: t,
      onClick: le(e.onClick, () => r.onOpenChange(!1)),
    });
  });
er.displayName = Xt;
var tr = 'PopoverArrow',
  nr = g.forwardRef((e, t) => {
    const { __scopePopover: n, ...o } = e,
      r = pe(n);
    return x.jsx(Xo, { ...r, ...o, ref: t });
  });
nr.displayName = tr;
function qt(e) {
  return e ? 'open' : 'closed';
}
var or = It,
  rr = zt,
  ir = Bt,
  Gt = Vt;
const sr = or,
  cr = rr,
  Kt = g.forwardRef(
    ({ className: e, align: t = 'center', sideOffset: n = 4, ...o }, r) =>
      x.jsx(ir, {
        children: x.jsx(Gt, {
          ref: r,
          align: t,
          sideOffset: n,
          side: 'bottom',
          className: K(
            'z-50 origin-(--radix-popover-content-transform-origin) overflow-y-auto max-h-(--radix-popover-content-available-height) min-w-[240px] max-w-[98vw] rounded-xl border bg-fd-popover/60 backdrop-blur-lg p-2 text-sm text-fd-popover-foreground shadow-lg focus-visible:outline-none data-[state=closed]:animate-fd-popover-out data-[state=open]:animate-fd-popover-in',
            e,
          ),
          ...o,
        }),
      }),
  );
Kt.displayName = Gt.displayName;
function wr(e) {
  const t = _e();
  if (!t.locales) throw new Error('Missing `<I18nProvider />`');
  return x.jsxs(sr, {
    children: [
      x.jsx(cr, {
        'aria-label': t.text.chooseLanguage,
        ...e,
        className: K(
          lt({ color: 'ghost', className: 'gap-1.5 p-1.5' }),
          e.className,
        ),
        children: e.children,
      }),
      x.jsxs(Kt, {
        className: 'flex flex-col overflow-x-hidden p-0',
        children: [
          x.jsx('p', {
            className: 'mb-1 p-2 text-xs font-medium text-fd-muted-foreground',
            children: t.text.chooseLanguage,
          }),
          t.locales.map((n) =>
            x.jsx(
              'button',
              {
                type: 'button',
                className: K(
                  'p-2 text-start text-sm',
                  n.locale === t.locale
                    ? 'bg-fd-primary/10 font-medium text-fd-primary'
                    : 'hover:bg-fd-accent hover:text-fd-accent-foreground',
                ),
                onClick: () => {
                  t.onChange?.(n.locale);
                },
                children: n.name,
              },
              n.locale,
            ),
          ),
        ],
      }),
    ],
  });
}
function yr(e) {
  const t = _e(),
    n = t.locales?.find((o) => o.locale === t.locale)?.name;
  return x.jsx('span', { ...e, children: n });
}
function br() {
  return { nav: { title: 'React Router' } };
}
export {
  ur as B,
  pt as L,
  pr as N,
  sr as P,
  gr as S,
  vr as T,
  xr as a,
  wr as b,
  mr as c,
  yr as d,
  br as e,
  fr as f,
  dr as g,
  cr as h,
  dt as i,
  Kt as j,
  hr as u,
};
