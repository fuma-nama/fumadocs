import { r as y, j as ae, R as ne } from './index-CT70PKhW.js';
import { c as ue, a as fe } from './button-345GfI1w.js';
const de = 'modulepreload',
  he = function (e) {
    return '/' + e;
  },
  oe = {},
  ve = function (t, o, c) {
    let l = Promise.resolve();
    if (o && o.length > 0) {
      let f = function (a) {
        return Promise.all(
          a.map((m) =>
            Promise.resolve(m).then(
              (w) => ({ status: 'fulfilled', value: w }),
              (w) => ({ status: 'rejected', reason: w }),
            ),
          ),
        );
      };
      document.getElementsByTagName('link');
      const i = document.querySelector('meta[property=csp-nonce]'),
        r = i?.nonce || i?.getAttribute('nonce');
      l = f(
        o.map((a) => {
          if (((a = he(a)), a in oe)) return;
          oe[a] = !0;
          const m = a.endsWith('.css'),
            w = m ? '[rel="stylesheet"]' : '';
          if (document.querySelector(`link[href="${a}"]${w}`)) return;
          const d = document.createElement('link');
          if (
            ((d.rel = m ? 'stylesheet' : de),
            m || (d.as = 'script'),
            (d.crossOrigin = ''),
            (d.href = a),
            r && d.setAttribute('nonce', r),
            document.head.appendChild(d),
            m)
          )
            return new Promise((E, u) => {
              (d.addEventListener('load', E),
                d.addEventListener('error', () =>
                  u(new Error(`Unable to preload CSS for ${a}`)),
                ));
            });
        }),
      );
    }
    function n(i) {
      const r = new Event('vite:preloadError', { cancelable: !0 });
      if (((r.payload = i), window.dispatchEvent(r), !r.defaultPrevented))
        throw i;
    }
    return l.then((i) => {
      for (const r of i || []) r.status === 'rejected' && n(r.reason);
      return t().catch(n);
    });
  };
function ie(e, t) {
  return Array.isArray(e) && Array.isArray(t)
    ? t.length !== e.length || e.some((o, c) => ie(o, t[c]))
    : e !== t;
}
function pe(e, t, o = ie) {
  const [c, l] = y.useState(e);
  o(c, e) && (t(e, c), l(e));
}
const ce = ue('SidebarContext');
function ye() {
  return ce.use();
}
function Ee({ children: e }) {
  const t = y.useRef(!0),
    [o, c] = y.useState(!1),
    [l, n] = y.useState(!1),
    i = fe();
  return (
    pe(i, () => {
      (t.current && c(!1), (t.current = !0));
    }),
    ae.jsx(ce.Provider, {
      value: y.useMemo(
        () => ({
          open: o,
          setOpen: c,
          collapsed: l,
          setCollapsed: n,
          closeOnRedirect: t,
        }),
        [o, l],
      ),
      children: e,
    })
  );
}
var Se =
  'useEffectEvent' in ne
    ? { ...ne }.useEffectEvent
    : (e) => {
        const t = y.useRef(e);
        return ((t.current = e), y.useCallback((...o) => t.current(...o), []));
      };
const re = (e) => typeof e == 'object' && e != null && e.nodeType === 1,
  se = (e, t) => (!t || e !== 'hidden') && e !== 'visible' && e !== 'clip',
  D = (e, t) => {
    if (e.clientHeight < e.scrollHeight || e.clientWidth < e.scrollWidth) {
      const o = getComputedStyle(e, null);
      return (
        se(o.overflowY, t) ||
        se(o.overflowX, t) ||
        ((c) => {
          const l = ((n) => {
            if (!n.ownerDocument || !n.ownerDocument.defaultView) return null;
            try {
              return n.ownerDocument.defaultView.frameElement;
            } catch {
              return null;
            }
          })(c);
          return (
            !!l &&
            (l.clientHeight < c.scrollHeight || l.clientWidth < c.scrollWidth)
          );
        })(e)
      );
    }
    return !1;
  },
  U = (e, t, o, c, l, n, i, r) =>
    (n < e && i > t) || (n > e && i < t)
      ? 0
      : (n <= e && r <= o) || (i >= t && r >= o)
        ? n - e - c
        : (i > t && r < o) || (n < e && r > o)
          ? i - t + l
          : 0,
  me = (e) => {
    const t = e.parentElement;
    return t ?? (e.getRootNode().host || null);
  },
  le = (e, t) => {
    var o, c, l, n;
    if (typeof document > 'u') return [];
    const {
        scrollMode: i,
        block: r,
        inline: f,
        boundary: a,
        skipOverflowHiddenElements: m,
      } = t,
      w = typeof a == 'function' ? a : (v) => v !== a;
    if (!re(e)) throw new TypeError('Invalid target');
    const d = document.scrollingElement || document.documentElement,
      E = [];
    let u = e;
    for (; re(u) && w(u); ) {
      if (((u = me(u)), u === d)) {
        E.push(u);
        break;
      }
      (u != null &&
        u === document.body &&
        D(u) &&
        !D(document.documentElement)) ||
        (u != null && D(u, m) && E.push(u));
    }
    const S =
        (c = (o = window.visualViewport) == null ? void 0 : o.width) != null
          ? c
          : innerWidth,
      W =
        (n = (l = window.visualViewport) == null ? void 0 : l.height) != null
          ? n
          : innerHeight,
      { scrollX: M, scrollY: C } = window,
      {
        height: R,
        width: H,
        top: x,
        right: X,
        bottom: Y,
        left: k,
      } = e.getBoundingClientRect(),
      {
        top: K,
        right: Q,
        bottom: Z,
        left: $,
      } = ((v) => {
        const s = window.getComputedStyle(v);
        return {
          top: parseFloat(s.scrollMarginTop) || 0,
          right: parseFloat(s.scrollMarginRight) || 0,
          bottom: parseFloat(s.scrollMarginBottom) || 0,
          left: parseFloat(s.scrollMarginLeft) || 0,
        };
      })(e);
    let h =
        r === 'start' || r === 'nearest'
          ? x - K
          : r === 'end'
            ? Y + Z
            : x + R / 2 - K + Z,
      p = f === 'center' ? k + H / 2 - $ + Q : f === 'end' ? X + Q : k - $;
    const _ = [];
    for (let v = 0; v < E.length; v++) {
      const s = E[v],
        {
          height: P,
          width: F,
          top: j,
          right: q,
          bottom: z,
          left: N,
        } = s.getBoundingClientRect();
      if (
        i === 'if-needed' &&
        x >= 0 &&
        k >= 0 &&
        Y <= W &&
        X <= S &&
        ((s === d && !D(s)) || (x >= j && Y <= z && k >= N && X <= q))
      )
        return _;
      const T = getComputedStyle(s),
        B = parseInt(T.borderLeftWidth, 10),
        L = parseInt(T.borderTopWidth, 10),
        O = parseInt(T.borderRightWidth, 10),
        A = parseInt(T.borderBottomWidth, 10);
      let g = 0,
        b = 0;
      const I = 'offsetWidth' in s ? s.offsetWidth - s.clientWidth - B - O : 0,
        V = 'offsetHeight' in s ? s.offsetHeight - s.clientHeight - L - A : 0,
        G =
          'offsetWidth' in s
            ? s.offsetWidth === 0
              ? 0
              : F / s.offsetWidth
            : 0,
        J =
          'offsetHeight' in s
            ? s.offsetHeight === 0
              ? 0
              : P / s.offsetHeight
            : 0;
      if (d === s)
        ((g =
          r === 'start'
            ? h
            : r === 'end'
              ? h - W
              : r === 'nearest'
                ? U(C, C + W, W, L, A, C + h, C + h + R, R)
                : h - W / 2),
          (b =
            f === 'start'
              ? p
              : f === 'center'
                ? p - S / 2
                : f === 'end'
                  ? p - S
                  : U(M, M + S, S, B, O, M + p, M + p + H, H)),
          (g = Math.max(0, g + C)),
          (b = Math.max(0, b + M)));
      else {
        ((g =
          r === 'start'
            ? h - j - L
            : r === 'end'
              ? h - z + A + V
              : r === 'nearest'
                ? U(j, z, P, L, A + V, h, h + R, R)
                : h - (j + P / 2) + V / 2),
          (b =
            f === 'start'
              ? p - N - B
              : f === 'center'
                ? p - (N + F / 2) + I / 2
                : f === 'end'
                  ? p - q + O + I
                  : U(N, q, F, B, O + I, p, p + H, H)));
        const { scrollLeft: ee, scrollTop: te } = s;
        ((g =
          J === 0
            ? 0
            : Math.max(0, Math.min(te + g / J, s.scrollHeight - P / J + V))),
          (b =
            G === 0
              ? 0
              : Math.max(0, Math.min(ee + b / G, s.scrollWidth - F / G + I))),
          (h += te - g),
          (p += ee - b));
      }
      _.push({ el: s, top: g, left: b });
    }
    return _;
  },
  ge = (e) =>
    e === !1
      ? { block: 'end', inline: 'nearest' }
      : ((t) => t === Object(t) && Object.keys(t).length !== 0)(e)
        ? e
        : { block: 'start', inline: 'nearest' };
function We(e, t) {
  if (
    !e.isConnected ||
    !((l) => {
      let n = l;
      for (; n && n.parentNode; ) {
        if (n.parentNode === document) return !0;
        n =
          n.parentNode instanceof ShadowRoot ? n.parentNode.host : n.parentNode;
      }
      return !1;
    })(e)
  )
    return;
  const o = ((l) => {
    const n = window.getComputedStyle(l);
    return {
      top: parseFloat(n.scrollMarginTop) || 0,
      right: parseFloat(n.scrollMarginRight) || 0,
      bottom: parseFloat(n.scrollMarginBottom) || 0,
      left: parseFloat(n.scrollMarginLeft) || 0,
    };
  })(e);
  if (((l) => typeof l == 'object' && typeof l.behavior == 'function')(t))
    return t.behavior(le(e, t));
  const c = typeof t == 'boolean' || t == null ? void 0 : t.behavior;
  for (const { el: l, top: n, left: i } of le(e, ge(t))) {
    const r = n - o.top + o.bottom,
      f = i - o.left + o.right;
    l.scroll({ top: r, left: f, behavior: c });
  }
}
export { Ee as S, ve as _, Se as a, ye as b, We as e, pe as u };
