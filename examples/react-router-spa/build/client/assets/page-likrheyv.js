const __vite__mapDeps = (
  i,
  m = __vite__mapDeps,
  d = m.f ||
    (m.f = [
      'assets/index-1mAwFagG.js',
      'assets/index-CT70PKhW.js',
      'assets/test-Da7NcFEw.js',
    ]),
) => i.map((i) => d[i]);
import { r as c, j as r, w as Cn } from './index-CT70PKhW.js';
import {
  e as H,
  k as fe,
  d as ne,
  P as E,
  g as B,
  f as S,
  j as z,
  h as tt,
  t as h,
  l as he,
  b as me,
  c as xe,
  a as Y,
  C as ge,
  n as yn,
  Q as Nn,
  T as Sn,
  U as nt,
  V as Z,
  o as $,
  L as De,
  u as G,
  N as rt,
  W as Tn,
  X as Rn,
  K as ot,
  Y as Pn,
  Z as En,
  _ as In,
  $ as An,
  a0 as _n,
  a1 as kn,
  a2 as Ln,
  a3 as Mn,
} from './button-345GfI1w.js';
import {
  i as be,
  L,
  f as st,
  P as Dn,
  h as Fn,
  j as On,
  u as at,
  S as lt,
  g as zn,
  N as $n,
  B as Fe,
  b as Oe,
  d as Bn,
  T as ze,
  a as Hn,
  c as Vn,
  e as Wn,
} from './layout.shared-WQQuTG8U.js';
import {
  b as F,
  u as re,
  e as Un,
  a as pe,
  _ as $e,
} from './index-C0GeZixz.js';
function Yn(e, [t, n]) {
  return Math.min(n, Math.max(t, e));
}
function Xn(e, t) {
  return c.useReducer((n, o) => t[n][o] ?? n, e);
}
var ve = 'ScrollArea',
  [ct] = ne(ve),
  [Gn, A] = ct(ve),
  it = c.forwardRef((e, t) => {
    const {
        __scopeScrollArea: n,
        type: o = 'hover',
        dir: s,
        scrollHideDelay: l = 600,
        ...a
      } = e,
      [d, i] = c.useState(null),
      [f, u] = c.useState(null),
      [x, m] = c.useState(null),
      [g, b] = c.useState(null),
      [w, p] = c.useState(null),
      [v, j] = c.useState(0),
      [C, P] = c.useState(0),
      [_, D] = c.useState(!1),
      [k, N] = c.useState(!1),
      y = H(t, (I) => i(I)),
      T = fe(s);
    return r.jsx(Gn, {
      scope: n,
      type: o,
      dir: T,
      scrollHideDelay: l,
      scrollArea: d,
      viewport: f,
      onViewportChange: u,
      content: x,
      onContentChange: m,
      scrollbarX: g,
      onScrollbarXChange: b,
      scrollbarXEnabled: _,
      onScrollbarXEnabledChange: D,
      scrollbarY: w,
      onScrollbarYChange: p,
      scrollbarYEnabled: k,
      onScrollbarYEnabledChange: N,
      onCornerWidthChange: j,
      onCornerHeightChange: P,
      children: r.jsx(E.div, {
        dir: T,
        ...a,
        ref: y,
        style: {
          position: 'relative',
          '--radix-scroll-area-corner-width': v + 'px',
          '--radix-scroll-area-corner-height': C + 'px',
          ...e.style,
        },
      }),
    });
  });
it.displayName = ve;
var dt = 'ScrollAreaViewport',
  ut = c.forwardRef((e, t) => {
    const { __scopeScrollArea: n, children: o, nonce: s, ...l } = e,
      a = A(dt, n),
      d = c.useRef(null),
      i = H(t, d, a.onViewportChange);
    return r.jsxs(r.Fragment, {
      children: [
        r.jsx('style', {
          dangerouslySetInnerHTML: {
            __html:
              '[data-radix-scroll-area-viewport]{scrollbar-width:none;-ms-overflow-style:none;-webkit-overflow-scrolling:touch;}[data-radix-scroll-area-viewport]::-webkit-scrollbar{display:none}',
          },
          nonce: s,
        }),
        r.jsx(E.div, {
          'data-radix-scroll-area-viewport': '',
          ...l,
          ref: i,
          style: {
            overflowX: a.scrollbarXEnabled ? 'scroll' : 'hidden',
            overflowY: a.scrollbarYEnabled ? 'scroll' : 'hidden',
            ...e.style,
          },
          children: r.jsx('div', {
            ref: a.onContentChange,
            style: { minWidth: '100%', display: 'table' },
            children: o,
          }),
        }),
      ],
    });
  });
ut.displayName = dt;
var M = 'ScrollAreaScrollbar',
  ft = c.forwardRef((e, t) => {
    const { forceMount: n, ...o } = e,
      s = A(M, e.__scopeScrollArea),
      { onScrollbarXEnabledChange: l, onScrollbarYEnabledChange: a } = s,
      d = e.orientation === 'horizontal';
    return (
      c.useEffect(
        () => (
          d ? l(!0) : a(!0),
          () => {
            d ? l(!1) : a(!1);
          }
        ),
        [d, l, a],
      ),
      s.type === 'hover'
        ? r.jsx(Kn, { ...o, ref: t, forceMount: n })
        : s.type === 'scroll'
          ? r.jsx(qn, { ...o, ref: t, forceMount: n })
          : s.type === 'auto'
            ? r.jsx(ht, { ...o, ref: t, forceMount: n })
            : s.type === 'always'
              ? r.jsx(we, { ...o, ref: t })
              : null
    );
  });
ft.displayName = M;
var Kn = c.forwardRef((e, t) => {
    const { forceMount: n, ...o } = e,
      s = A(M, e.__scopeScrollArea),
      [l, a] = c.useState(!1);
    return (
      c.useEffect(() => {
        const d = s.scrollArea;
        let i = 0;
        if (d) {
          const f = () => {
              (window.clearTimeout(i), a(!0));
            },
            u = () => {
              i = window.setTimeout(() => a(!1), s.scrollHideDelay);
            };
          return (
            d.addEventListener('pointerenter', f),
            d.addEventListener('pointerleave', u),
            () => {
              (window.clearTimeout(i),
                d.removeEventListener('pointerenter', f),
                d.removeEventListener('pointerleave', u));
            }
          );
        }
      }, [s.scrollArea, s.scrollHideDelay]),
      r.jsx(B, {
        present: n || l,
        children: r.jsx(ht, {
          'data-state': l ? 'visible' : 'hidden',
          ...o,
          ref: t,
        }),
      })
    );
  }),
  qn = c.forwardRef((e, t) => {
    const { forceMount: n, ...o } = e,
      s = A(M, e.__scopeScrollArea),
      l = e.orientation === 'horizontal',
      a = se(() => i('SCROLL_END'), 100),
      [d, i] = Xn('hidden', {
        hidden: { SCROLL: 'scrolling' },
        scrolling: { SCROLL_END: 'idle', POINTER_ENTER: 'interacting' },
        interacting: { SCROLL: 'interacting', POINTER_LEAVE: 'idle' },
        idle: {
          HIDE: 'hidden',
          SCROLL: 'scrolling',
          POINTER_ENTER: 'interacting',
        },
      });
    return (
      c.useEffect(() => {
        if (d === 'idle') {
          const f = window.setTimeout(() => i('HIDE'), s.scrollHideDelay);
          return () => window.clearTimeout(f);
        }
      }, [d, s.scrollHideDelay, i]),
      c.useEffect(() => {
        const f = s.viewport,
          u = l ? 'scrollLeft' : 'scrollTop';
        if (f) {
          let x = f[u];
          const m = () => {
            const g = f[u];
            (x !== g && (i('SCROLL'), a()), (x = g));
          };
          return (
            f.addEventListener('scroll', m),
            () => f.removeEventListener('scroll', m)
          );
        }
      }, [s.viewport, l, i, a]),
      r.jsx(B, {
        present: n || d !== 'hidden',
        children: r.jsx(we, {
          'data-state': d === 'hidden' ? 'hidden' : 'visible',
          ...o,
          ref: t,
          onPointerEnter: S(e.onPointerEnter, () => i('POINTER_ENTER')),
          onPointerLeave: S(e.onPointerLeave, () => i('POINTER_LEAVE')),
        }),
      })
    );
  }),
  ht = c.forwardRef((e, t) => {
    const n = A(M, e.__scopeScrollArea),
      { forceMount: o, ...s } = e,
      [l, a] = c.useState(!1),
      d = e.orientation === 'horizontal',
      i = se(() => {
        if (n.viewport) {
          const f = n.viewport.offsetWidth < n.viewport.scrollWidth,
            u = n.viewport.offsetHeight < n.viewport.scrollHeight;
          a(d ? f : u);
        }
      }, 10);
    return (
      U(n.viewport, i),
      U(n.content, i),
      r.jsx(B, {
        present: o || l,
        children: r.jsx(we, {
          'data-state': l ? 'visible' : 'hidden',
          ...s,
          ref: t,
        }),
      })
    );
  }),
  we = c.forwardRef((e, t) => {
    const { orientation: n = 'vertical', ...o } = e,
      s = A(M, e.__scopeScrollArea),
      l = c.useRef(null),
      a = c.useRef(0),
      [d, i] = c.useState({
        content: 0,
        viewport: 0,
        scrollbar: { size: 0, paddingStart: 0, paddingEnd: 0 },
      }),
      f = pt(d.viewport, d.content),
      u = {
        ...o,
        sizes: d,
        onSizesChange: i,
        hasThumb: f > 0 && f < 1,
        onThumbChange: (m) => (l.current = m),
        onThumbPointerUp: () => (a.current = 0),
        onThumbPointerDown: (m) => (a.current = m),
      };
    function x(m, g) {
      return nr(m, a.current, d, g);
    }
    return n === 'horizontal'
      ? r.jsx(Qn, {
          ...u,
          ref: t,
          onThumbPositionChange: () => {
            if (s.viewport && l.current) {
              const m = s.viewport.scrollLeft,
                g = Be(m, d, s.dir);
              l.current.style.transform = `translate3d(${g}px, 0, 0)`;
            }
          },
          onWheelScroll: (m) => {
            s.viewport && (s.viewport.scrollLeft = m);
          },
          onDragScroll: (m) => {
            s.viewport && (s.viewport.scrollLeft = x(m, s.dir));
          },
        })
      : n === 'vertical'
        ? r.jsx(Zn, {
            ...u,
            ref: t,
            onThumbPositionChange: () => {
              if (s.viewport && l.current) {
                const m = s.viewport.scrollTop,
                  g = Be(m, d);
                l.current.style.transform = `translate3d(0, ${g}px, 0)`;
              }
            },
            onWheelScroll: (m) => {
              s.viewport && (s.viewport.scrollTop = m);
            },
            onDragScroll: (m) => {
              s.viewport && (s.viewport.scrollTop = x(m));
            },
          })
        : null;
  }),
  Qn = c.forwardRef((e, t) => {
    const { sizes: n, onSizesChange: o, ...s } = e,
      l = A(M, e.__scopeScrollArea),
      [a, d] = c.useState(),
      i = c.useRef(null),
      f = H(t, i, l.onScrollbarXChange);
    return (
      c.useEffect(() => {
        i.current && d(getComputedStyle(i.current));
      }, [i]),
      r.jsx(xt, {
        'data-orientation': 'horizontal',
        ...s,
        ref: f,
        sizes: n,
        style: {
          bottom: 0,
          left: l.dir === 'rtl' ? 'var(--radix-scroll-area-corner-width)' : 0,
          right: l.dir === 'ltr' ? 'var(--radix-scroll-area-corner-width)' : 0,
          '--radix-scroll-area-thumb-width': oe(n) + 'px',
          ...e.style,
        },
        onThumbPointerDown: (u) => e.onThumbPointerDown(u.x),
        onDragScroll: (u) => e.onDragScroll(u.x),
        onWheelScroll: (u, x) => {
          if (l.viewport) {
            const m = l.viewport.scrollLeft + u.deltaX;
            (e.onWheelScroll(m), wt(m, x) && u.preventDefault());
          }
        },
        onResize: () => {
          i.current &&
            l.viewport &&
            a &&
            o({
              content: l.viewport.scrollWidth,
              viewport: l.viewport.offsetWidth,
              scrollbar: {
                size: i.current.clientWidth,
                paddingStart: te(a.paddingLeft),
                paddingEnd: te(a.paddingRight),
              },
            });
        },
      })
    );
  }),
  Zn = c.forwardRef((e, t) => {
    const { sizes: n, onSizesChange: o, ...s } = e,
      l = A(M, e.__scopeScrollArea),
      [a, d] = c.useState(),
      i = c.useRef(null),
      f = H(t, i, l.onScrollbarYChange);
    return (
      c.useEffect(() => {
        i.current && d(getComputedStyle(i.current));
      }, [i]),
      r.jsx(xt, {
        'data-orientation': 'vertical',
        ...s,
        ref: f,
        sizes: n,
        style: {
          top: 0,
          right: l.dir === 'ltr' ? 0 : void 0,
          left: l.dir === 'rtl' ? 0 : void 0,
          bottom: 'var(--radix-scroll-area-corner-height)',
          '--radix-scroll-area-thumb-height': oe(n) + 'px',
          ...e.style,
        },
        onThumbPointerDown: (u) => e.onThumbPointerDown(u.y),
        onDragScroll: (u) => e.onDragScroll(u.y),
        onWheelScroll: (u, x) => {
          if (l.viewport) {
            const m = l.viewport.scrollTop + u.deltaY;
            (e.onWheelScroll(m), wt(m, x) && u.preventDefault());
          }
        },
        onResize: () => {
          i.current &&
            l.viewport &&
            a &&
            o({
              content: l.viewport.scrollHeight,
              viewport: l.viewport.offsetHeight,
              scrollbar: {
                size: i.current.clientHeight,
                paddingStart: te(a.paddingTop),
                paddingEnd: te(a.paddingBottom),
              },
            });
        },
      })
    );
  }),
  [Jn, mt] = ct(M),
  xt = c.forwardRef((e, t) => {
    const {
        __scopeScrollArea: n,
        sizes: o,
        hasThumb: s,
        onThumbChange: l,
        onThumbPointerUp: a,
        onThumbPointerDown: d,
        onThumbPositionChange: i,
        onDragScroll: f,
        onWheelScroll: u,
        onResize: x,
        ...m
      } = e,
      g = A(M, n),
      [b, w] = c.useState(null),
      p = H(t, (y) => w(y)),
      v = c.useRef(null),
      j = c.useRef(''),
      C = g.viewport,
      P = o.content - o.viewport,
      _ = z(u),
      D = z(i),
      k = se(x, 10);
    function N(y) {
      if (v.current) {
        const T = y.clientX - v.current.left,
          I = y.clientY - v.current.top;
        f({ x: T, y: I });
      }
    }
    return (
      c.useEffect(() => {
        const y = (T) => {
          const I = T.target;
          b?.contains(I) && _(T, P);
        };
        return (
          document.addEventListener('wheel', y, { passive: !1 }),
          () => document.removeEventListener('wheel', y, { passive: !1 })
        );
      }, [C, b, P, _]),
      c.useEffect(D, [o, D]),
      U(b, k),
      U(g.content, k),
      r.jsx(Jn, {
        scope: n,
        scrollbar: b,
        hasThumb: s,
        onThumbChange: z(l),
        onThumbPointerUp: z(a),
        onThumbPositionChange: D,
        onThumbPointerDown: z(d),
        children: r.jsx(E.div, {
          ...m,
          ref: p,
          style: { position: 'absolute', ...m.style },
          onPointerDown: S(e.onPointerDown, (y) => {
            y.button === 0 &&
              (y.target.setPointerCapture(y.pointerId),
              (v.current = b.getBoundingClientRect()),
              (j.current = document.body.style.webkitUserSelect),
              (document.body.style.webkitUserSelect = 'none'),
              g.viewport && (g.viewport.style.scrollBehavior = 'auto'),
              N(y));
          }),
          onPointerMove: S(e.onPointerMove, N),
          onPointerUp: S(e.onPointerUp, (y) => {
            const T = y.target;
            (T.hasPointerCapture(y.pointerId) &&
              T.releasePointerCapture(y.pointerId),
              (document.body.style.webkitUserSelect = j.current),
              g.viewport && (g.viewport.style.scrollBehavior = ''),
              (v.current = null));
          }),
        }),
      })
    );
  }),
  ee = 'ScrollAreaThumb',
  gt = c.forwardRef((e, t) => {
    const { forceMount: n, ...o } = e,
      s = mt(ee, e.__scopeScrollArea);
    return r.jsx(B, {
      present: n || s.hasThumb,
      children: r.jsx(er, { ref: t, ...o }),
    });
  }),
  er = c.forwardRef((e, t) => {
    const { __scopeScrollArea: n, style: o, ...s } = e,
      l = A(ee, n),
      a = mt(ee, n),
      { onThumbPositionChange: d } = a,
      i = H(t, (x) => a.onThumbChange(x)),
      f = c.useRef(void 0),
      u = se(() => {
        f.current && (f.current(), (f.current = void 0));
      }, 100);
    return (
      c.useEffect(() => {
        const x = l.viewport;
        if (x) {
          const m = () => {
            if ((u(), !f.current)) {
              const g = rr(x, d);
              ((f.current = g), d());
            }
          };
          return (
            d(),
            x.addEventListener('scroll', m),
            () => x.removeEventListener('scroll', m)
          );
        }
      }, [l.viewport, u, d]),
      r.jsx(E.div, {
        'data-state': a.hasThumb ? 'visible' : 'hidden',
        ...s,
        ref: i,
        style: {
          width: 'var(--radix-scroll-area-thumb-width)',
          height: 'var(--radix-scroll-area-thumb-height)',
          ...o,
        },
        onPointerDownCapture: S(e.onPointerDownCapture, (x) => {
          const g = x.target.getBoundingClientRect(),
            b = x.clientX - g.left,
            w = x.clientY - g.top;
          a.onThumbPointerDown({ x: b, y: w });
        }),
        onPointerUp: S(e.onPointerUp, a.onThumbPointerUp),
      })
    );
  });
gt.displayName = ee;
var je = 'ScrollAreaCorner',
  bt = c.forwardRef((e, t) => {
    const n = A(je, e.__scopeScrollArea),
      o = !!(n.scrollbarX && n.scrollbarY);
    return n.type !== 'scroll' && o ? r.jsx(tr, { ...e, ref: t }) : null;
  });
bt.displayName = je;
var tr = c.forwardRef((e, t) => {
  const { __scopeScrollArea: n, ...o } = e,
    s = A(je, n),
    [l, a] = c.useState(0),
    [d, i] = c.useState(0),
    f = !!(l && d);
  return (
    U(s.scrollbarX, () => {
      const u = s.scrollbarX?.offsetHeight || 0;
      (s.onCornerHeightChange(u), i(u));
    }),
    U(s.scrollbarY, () => {
      const u = s.scrollbarY?.offsetWidth || 0;
      (s.onCornerWidthChange(u), a(u));
    }),
    f
      ? r.jsx(E.div, {
          ...o,
          ref: t,
          style: {
            width: l,
            height: d,
            position: 'absolute',
            right: s.dir === 'ltr' ? 0 : void 0,
            left: s.dir === 'rtl' ? 0 : void 0,
            bottom: 0,
            ...e.style,
          },
        })
      : null
  );
});
function te(e) {
  return e ? parseInt(e, 10) : 0;
}
function pt(e, t) {
  const n = e / t;
  return isNaN(n) ? 0 : n;
}
function oe(e) {
  const t = pt(e.viewport, e.content),
    n = e.scrollbar.paddingStart + e.scrollbar.paddingEnd,
    o = (e.scrollbar.size - n) * t;
  return Math.max(o, 18);
}
function nr(e, t, n, o = 'ltr') {
  const s = oe(n),
    l = s / 2,
    a = t || l,
    d = s - a,
    i = n.scrollbar.paddingStart + a,
    f = n.scrollbar.size - n.scrollbar.paddingEnd - d,
    u = n.content - n.viewport,
    x = o === 'ltr' ? [0, u] : [u * -1, 0];
  return vt([i, f], x)(e);
}
function Be(e, t, n = 'ltr') {
  const o = oe(t),
    s = t.scrollbar.paddingStart + t.scrollbar.paddingEnd,
    l = t.scrollbar.size - s,
    a = t.content - t.viewport,
    d = l - o,
    i = n === 'ltr' ? [0, a] : [a * -1, 0],
    f = Yn(e, i);
  return vt([0, a], [0, d])(f);
}
function vt(e, t) {
  return (n) => {
    if (e[0] === e[1] || t[0] === t[1]) return t[0];
    const o = (t[1] - t[0]) / (e[1] - e[0]);
    return t[0] + o * (n - e[0]);
  };
}
function wt(e, t) {
  return e > 0 && e < t;
}
var rr = (e, t = () => {}) => {
  let n = { left: e.scrollLeft, top: e.scrollTop },
    o = 0;
  return (
    (function s() {
      const l = { left: e.scrollLeft, top: e.scrollTop },
        a = n.left !== l.left,
        d = n.top !== l.top;
      ((a || d) && t(), (n = l), (o = window.requestAnimationFrame(s)));
    })(),
    () => window.cancelAnimationFrame(o)
  );
};
function se(e, t) {
  const n = z(e),
    o = c.useRef(0);
  return (
    c.useEffect(() => () => window.clearTimeout(o.current), []),
    c.useCallback(() => {
      (window.clearTimeout(o.current), (o.current = window.setTimeout(n, t)));
    }, [n, t])
  );
}
function U(e, t) {
  const n = z(t);
  tt(() => {
    let o = 0;
    if (e) {
      const s = new ResizeObserver(() => {
        (cancelAnimationFrame(o), (o = window.requestAnimationFrame(n)));
      });
      return (
        s.observe(e),
        () => {
          (window.cancelAnimationFrame(o), s.unobserve(e));
        }
      );
    }
  }, [e, n]);
}
var jt = it,
  Ct = ut,
  yt = ft,
  or = bt;
const Nt = c.forwardRef(({ className: e, children: t, ...n }, o) =>
  r.jsxs(jt, {
    ref: o,
    type: 'scroll',
    className: h('overflow-hidden', e),
    ...n,
    children: [t, r.jsx(or, {}), r.jsx(Tt, { orientation: 'vertical' })],
  }),
);
Nt.displayName = jt.displayName;
const St = c.forwardRef(({ className: e, children: t, ...n }, o) =>
  r.jsx(Ct, {
    ref: o,
    className: h('size-full rounded-[inherit]', e),
    ...n,
    children: t,
  }),
);
St.displayName = Ct.displayName;
const Tt = c.forwardRef(
  ({ className: e, orientation: t = 'vertical', ...n }, o) =>
    r.jsx(yt, {
      ref: o,
      orientation: t,
      className: h(
        'flex select-none data-[state=hidden]:animate-fd-fade-out',
        t === 'vertical' && 'h-full w-1.5',
        t === 'horizontal' && 'h-1.5 flex-col',
        e,
      ),
      ...n,
      children: r.jsx(gt, {
        className: 'relative flex-1 rounded-full bg-fd-border',
      }),
    }),
);
Tt.displayName = yt.displayName;
var ae = 'Collapsible',
  [sr] = ne(ae),
  [ar, Ce] = sr(ae),
  Rt = c.forwardRef((e, t) => {
    const {
        __scopeCollapsible: n,
        open: o,
        defaultOpen: s,
        disabled: l,
        onOpenChange: a,
        ...d
      } = e,
      [i, f] = he({ prop: o, defaultProp: s ?? !1, onChange: a, caller: ae });
    return r.jsx(ar, {
      scope: n,
      disabled: l,
      contentId: me(),
      open: i,
      onOpenToggle: c.useCallback(() => f((u) => !u), [f]),
      children: r.jsx(E.div, {
        'data-state': Se(i),
        'data-disabled': l ? '' : void 0,
        ...d,
        ref: t,
      }),
    });
  });
Rt.displayName = ae;
var Pt = 'CollapsibleTrigger',
  Et = c.forwardRef((e, t) => {
    const { __scopeCollapsible: n, ...o } = e,
      s = Ce(Pt, n);
    return r.jsx(E.button, {
      type: 'button',
      'aria-controls': s.contentId,
      'aria-expanded': s.open || !1,
      'data-state': Se(s.open),
      'data-disabled': s.disabled ? '' : void 0,
      disabled: s.disabled,
      ...o,
      ref: t,
      onClick: S(e.onClick, s.onOpenToggle),
    });
  });
Et.displayName = Pt;
var ye = 'CollapsibleContent',
  Ne = c.forwardRef((e, t) => {
    const { forceMount: n, ...o } = e,
      s = Ce(ye, e.__scopeCollapsible);
    return r.jsx(B, {
      present: n || s.open,
      children: ({ present: l }) => r.jsx(lr, { ...o, ref: t, present: l }),
    });
  });
Ne.displayName = ye;
var lr = c.forwardRef((e, t) => {
  const { __scopeCollapsible: n, present: o, children: s, ...l } = e,
    a = Ce(ye, n),
    [d, i] = c.useState(o),
    f = c.useRef(null),
    u = H(t, f),
    x = c.useRef(0),
    m = x.current,
    g = c.useRef(0),
    b = g.current,
    w = a.open || d,
    p = c.useRef(w),
    v = c.useRef(void 0);
  return (
    c.useEffect(() => {
      const j = requestAnimationFrame(() => (p.current = !1));
      return () => cancelAnimationFrame(j);
    }, []),
    tt(() => {
      const j = f.current;
      if (j) {
        ((v.current = v.current || {
          transitionDuration: j.style.transitionDuration,
          animationName: j.style.animationName,
        }),
          (j.style.transitionDuration = '0s'),
          (j.style.animationName = 'none'));
        const C = j.getBoundingClientRect();
        ((x.current = C.height),
          (g.current = C.width),
          p.current ||
            ((j.style.transitionDuration = v.current.transitionDuration),
            (j.style.animationName = v.current.animationName)),
          i(o));
      }
    }, [a.open, o]),
    r.jsx(E.div, {
      'data-state': Se(a.open),
      'data-disabled': a.disabled ? '' : void 0,
      id: a.contentId,
      hidden: !w,
      ...l,
      ref: u,
      style: {
        '--radix-collapsible-content-height': m ? `${m}px` : void 0,
        '--radix-collapsible-content-width': b ? `${b}px` : void 0,
        ...e.style,
      },
      children: w && s,
    })
  );
});
function Se(e) {
  return e ? 'open' : 'closed';
}
var cr = Rt;
const It = cr,
  At = Et,
  Te = c.forwardRef(({ children: e, ...t }, n) => {
    const [o, s] = c.useState(!1);
    return (
      c.useEffect(() => {
        s(!0);
      }, []),
      r.jsx(Ne, {
        ref: n,
        ...t,
        className: h(
          'overflow-hidden',
          o &&
            'data-[state=closed]:animate-fd-collapsible-up data-[state=open]:animate-fd-collapsible-down',
          t.className,
        ),
        children: e,
      })
    );
  });
Te.displayName = Ne.displayName;
function ir(e) {
  return (
    e.startsWith('http://') ||
      e.startsWith('https://') ||
      (e.startsWith('/') || (e = '/' + e),
      e.length > 1 && e.endsWith('/') && (e = e.slice(0, -1))),
    e
  );
}
function dr(e, t, n = {}) {
  const { includeSeparator: o = !0 } = n;
  function s(l) {
    let a;
    for (const d of l) {
      if (t(d)) {
        const i = [];
        return (a && i.push(a), i.push(d), i);
      }
      if (d.type === 'separator' && o) {
        a = d;
        continue;
      }
      if (d.type === 'folder') {
        const i = d.index && t(d.index) ? [d.index] : s(d.children);
        if (i) return (i.unshift(d), a && i.unshift(a), i);
      }
    }
  }
  return s(e) ?? null;
}
function ur(e, t, n) {
  const {
    includePage: o = !1,
    includeSeparator: s = !1,
    includeRoot: l = !1,
  } = n;
  let a = [];
  for (let d = 0; d < t.length; d++) {
    const i = t[d];
    switch (i.type) {
      case 'page':
        o && a.push({ name: i.name, url: i.url });
        break;
      case 'folder':
        if (i.root && !l) {
          a = [];
          break;
        }
        (d === t.length - 1 || i.index !== t[d + 1]) &&
          a.push({ name: i.name, url: i.index?.url });
        break;
      case 'separator':
        i.name && s && a.push({ name: i.name });
        break;
    }
  }
  return (
    l &&
      a.unshift({ name: e.name, url: typeof l == 'object' ? l.url : void 0 }),
    a
  );
}
function He(e, t) {
  const n = ir(t);
  return dr(e, (o) => o.type === 'page' && o.url === n);
}
const _t = xe('TreeContext'),
  kt = xe('PathContext', []);
function fr(e) {
  const t = c.useRef(0),
    n = Y(),
    o = c.useMemo(() => e.tree, [e.tree.$id ?? e.tree]),
    s = c.useMemo(() => {
      let a = He(o.children, n);
      return a || (o.fallback && (a = He(o.fallback.children, n)), a ?? []);
    }, [o, n]),
    l = s.findLast((a) => a.type === 'folder' && a.root) ?? o;
  return (
    l.$id ?? (l.$id = String(t.current++)),
    r.jsx(_t.Provider, {
      value: c.useMemo(() => ({ root: l, full: o }), [l, o]),
      children: r.jsx(kt.Provider, { value: s, children: e.children }),
    })
  );
}
function Re() {
  return kt.use();
}
function Pe() {
  return _t.use('You must wrap this component under <DocsLayout />');
}
function hr(e, t = !1) {
  const [n, o] = c.useState(null);
  return (
    c.useEffect(() => {
      if (t) return;
      const s = window.matchMedia(e),
        l = () => {
          o(s.matches);
        };
      return (
        l(),
        s.addEventListener('change', l),
        () => {
          s.removeEventListener('change', l);
        }
      );
    }, [t, e]),
    n
  );
}
const Ee = yn(
    'relative flex flex-row items-center gap-2 rounded-lg p-2 ps-(--sidebar-item-offset) text-start text-fd-muted-foreground [overflow-wrap:anywhere] [&_svg]:size-4 [&_svg]:shrink-0',
    {
      variants: {
        active: {
          true: 'bg-fd-primary/10 text-fd-primary',
          false:
            'transition-colors hover:bg-fd-accent/50 hover:text-fd-accent-foreground/80 hover:transition-none',
        },
      },
    },
  ),
  Ie = c.createContext(null),
  Lt = c.createContext(null);
function mr({
  defaultOpenLevel: e = 0,
  prefetch: t = !0,
  Mobile: n,
  Content: o,
}) {
  const s = hr('(width < 768px)') ?? !1,
    l = c.useMemo(
      () => ({ defaultOpenLevel: e, prefetch: t, level: 1 }),
      [e, t],
    );
  return r.jsx(Ie.Provider, { value: l, children: s && n != null ? n : o });
}
function xr(e) {
  const { collapsed: t } = F(),
    [n, o] = c.useState(!1),
    s = c.useRef(0),
    l = c.useRef(0);
  return (
    re(t, () => {
      (o(!1), (l.current = Date.now() + 150));
    }),
    r.jsx('aside', {
      id: 'nd-sidebar',
      ...e,
      'data-collapsed': t,
      className: h(
        'fixed left-0 rtl:left-auto rtl:right-(--removed-body-scroll-bar-size,0) flex flex-col items-end top-(--fd-sidebar-top) bottom-(--fd-sidebar-margin) z-20 bg-fd-card text-sm border-e transition-[top,opacity,translate,width] duration-200 max-md:hidden *:w-(--fd-sidebar-width)',
        t && [
          'rounded-xl border translate-x-(--fd-sidebar-offset) rtl:-translate-x-(--fd-sidebar-offset)',
          n ? 'z-50 shadow-lg' : 'opacity-0',
        ],
        e.className,
      ),
      style: {
        ...e.style,
        '--fd-sidebar-offset': n
          ? 'calc(var(--spacing) * 2)'
          : 'calc(16px - 100%)',
        '--fd-sidebar-margin': t ? '0.5rem' : '0px',
        '--fd-sidebar-top':
          'calc(var(--fd-banner-height) + var(--fd-nav-height) + var(--fd-sidebar-margin))',
        width: t
          ? 'var(--fd-sidebar-width)'
          : 'calc(var(--spacing) + var(--fd-sidebar-width) + var(--fd-layout-offset))',
      },
      onPointerEnter: (a) => {
        !t ||
          a.pointerType === 'touch' ||
          l.current > Date.now() ||
          (window.clearTimeout(s.current), o(!0));
      },
      onPointerLeave: (a) => {
        !t ||
          a.pointerType === 'touch' ||
          (window.clearTimeout(s.current),
          (s.current = window.setTimeout(
            () => {
              (o(!1), (l.current = Date.now() + 150));
            },
            Math.min(a.clientX, document.body.clientWidth - a.clientX) > 100
              ? 0
              : 500,
          )));
      },
      children: e.children,
    })
  );
}
function gr({ className: e, children: t, ...n }) {
  const { open: o, setOpen: s } = F(),
    l = o ? 'open' : 'closed';
  return r.jsxs(r.Fragment, {
    children: [
      r.jsx(B, {
        present: o,
        children: r.jsx('div', {
          'data-state': l,
          className:
            'fixed z-40 inset-0 backdrop-blur-xs data-[state=open]:animate-fd-fade-in data-[state=closed]:animate-fd-fade-out',
          onClick: () => s(!1),
        }),
      }),
      r.jsx(B, {
        present: o,
        children: ({ present: a }) =>
          r.jsx('aside', {
            id: 'nd-sidebar-mobile',
            ...n,
            'data-state': l,
            className: h(
              'fixed text-[15px] flex flex-col shadow-lg border-s end-0 inset-y-0 w-[85%] max-w-[380px] z-40 bg-fd-background data-[state=open]:animate-fd-sidebar-in data-[state=closed]:animate-fd-sidebar-out',
              !a && 'invisible',
              e,
            ),
            children: t,
          }),
      }),
    ],
  });
}
function Ve(e) {
  return r.jsx('div', {
    ...e,
    className: h('flex flex-col gap-3 p-4 pb-2', e.className),
    children: e.children,
  });
}
function We(e) {
  return r.jsx('div', {
    ...e,
    className: h('flex flex-col border-t p-4 pt-2', e.className),
    children: e.children,
  });
}
function br(e) {
  return r.jsx(Nt, {
    ...e,
    className: h('h-full', e.className),
    children: r.jsx(St, {
      className: 'p-4 overscroll-contain',
      style: {
        '--sidebar-item-offset': 'calc(var(--spacing) * 2)',
        maskImage:
          'linear-gradient(to bottom, transparent, white 12px, white calc(100% - 12px), transparent)',
      },
      children: e.children,
    }),
  });
}
function pr(e) {
  return r.jsx('p', {
    ...e,
    className: h(
      'inline-flex items-center gap-2 mb-1.5 px-2 ps-(--sidebar-item-offset) empty:mb-0 [&_svg]:size-4 [&_svg]:shrink-0',
      e.className,
    ),
    children: e.children,
  });
}
function Mt({ icon: e, ...t }) {
  const n = Y(),
    o = t.href !== void 0 && be(t.href, n, !1),
    { prefetch: s } = le();
  return r.jsxs(L, {
    ...t,
    'data-active': o,
    className: h(Ee({ active: o }), t.className),
    prefetch: s,
    children: [e ?? (t.external ? r.jsx(Nn, {}) : null), t.children],
  });
}
function Dt({ defaultOpen: e = !1, ...t }) {
  const [n, o] = c.useState(e);
  return (
    re(e, (s) => {
      s && o(s);
    }),
    r.jsx(It, {
      open: n,
      onOpenChange: o,
      ...t,
      children: r.jsx(Lt.Provider, {
        value: c.useMemo(() => ({ open: n, setOpen: o }), [n]),
        children: t.children,
      }),
    })
  );
}
function Ft({ className: e, ...t }) {
  const { open: n } = Bt();
  return r.jsxs(At, {
    className: h(Ee({ active: !1 }), 'w-full', e),
    ...t,
    children: [
      t.children,
      r.jsx(ge, {
        'data-icon': !0,
        className: h('ms-auto transition-transform', !n && '-rotate-90'),
      }),
    ],
  });
}
function Ot(e) {
  const { open: t, setOpen: n } = Bt(),
    { prefetch: o } = le(),
    s = Y(),
    l = e.href !== void 0 && be(e.href, s, !1);
  return r.jsxs(L, {
    ...e,
    'data-active': l,
    className: h(Ee({ active: l }), 'w-full', e.className),
    onClick: (a) => {
      a.target instanceof Element &&
      a.target.matches('[data-icon], [data-icon] *')
        ? (n(!t), a.preventDefault())
        : n(l ? !t : !0);
    },
    prefetch: o,
    children: [
      e.children,
      r.jsx(ge, {
        'data-icon': !0,
        className: h('ms-auto transition-transform', !t && '-rotate-90'),
      }),
    ],
  });
}
function zt(e) {
  const { level: t, ...n } = le();
  return r.jsx(Te, {
    ...e,
    className: h(
      'relative',
      t === 1 && [
        "before:content-[''] before:absolute before:w-px before:inset-y-1 before:bg-fd-border before:start-2.5",
        "**:data-[active=true]:before:content-[''] **:data-[active=true]:before:bg-fd-primary **:data-[active=true]:before:absolute **:data-[active=true]:before:w-px **:data-[active=true]:before:inset-y-2.5 **:data-[active=true]:before:start-2.5",
      ],
      e.className,
    ),
    style: {
      '--sidebar-item-offset': `calc(var(--spacing) * ${(t + 1) * 3})`,
      ...e.style,
    },
    children: r.jsx(Ie.Provider, {
      value: c.useMemo(() => ({ ...n, level: t + 1 }), [n, t]),
      children: e.children,
    }),
  });
}
function Ue({ children: e, ...t }) {
  const { setOpen: n } = F();
  return r.jsx('button', {
    ...t,
    'aria-label': 'Open Sidebar',
    onClick: () => n((o) => !o),
    children: e,
  });
}
function $t(e) {
  const { collapsed: t, setCollapsed: n } = F();
  return r.jsx('button', {
    type: 'button',
    'aria-label': 'Collapse Sidebar',
    'data-collapsed': t,
    ...e,
    onClick: () => {
      n((o) => !o);
    },
    children: e.children,
  });
}
function Bt() {
  const e = c.useContext(Lt);
  if (!e) throw new Error('Missing sidebar folder');
  return e;
}
function le() {
  const e = c.useContext(Ie);
  if (!e) throw new Error('<Sidebar /> component required.');
  return e;
}
function vr(e) {
  const { root: t } = Pe();
  return c.useMemo(() => {
    const { Separator: n, Item: o, Folder: s } = e.components ?? {};
    function l(a, d) {
      return a.map((i, f) => {
        if (i.type === 'separator')
          return n
            ? r.jsx(n, { item: i }, f)
            : r.jsxs(
                pr,
                { className: h(f !== 0 && 'mt-6'), children: [i.icon, i.name] },
                f,
              );
        if (i.type === 'folder') {
          const u = l(i.children, d + 1);
          return s
            ? r.jsx(s, { item: i, level: d, children: u }, f)
            : r.jsx(wr, { item: i, children: u }, f);
        }
        return o
          ? r.jsx(o, { item: i }, i.url)
          : r.jsx(
              Mt,
              {
                href: i.url,
                external: i.external,
                icon: i.icon,
                children: i.name,
              },
              i.url,
            );
      });
    }
    return r.jsx(c.Fragment, { children: l(t.children, 1) }, t.$id);
  }, [e.components, t]);
}
function wr({ item: e, ...t }) {
  const { defaultOpenLevel: n, level: o } = le(),
    s = Re();
  return r.jsxs(Dt, {
    defaultOpen: (e.defaultOpen ?? n >= o) || s.includes(e),
    children: [
      e.index
        ? r.jsxs(Ot, {
            href: e.index.url,
            external: e.index.external,
            ...t,
            children: [e.icon, e.name],
          })
        : r.jsxs(Ft, { ...t, children: [e.icon, e.name] }),
      r.jsx(zt, { children: t.children }),
    ],
  });
}
function Ye({ options: e, placeholder: t, ...n }) {
  const [o, s] = c.useState(!1),
    { closeOnRedirect: l } = F(),
    a = Y(),
    d = c.useMemo(() => e.findLast((u) => st(u, a)), [e, a]),
    i = () => {
      ((l.current = !1), s(!1));
    },
    f = d
      ? r.jsxs(r.Fragment, {
          children: [
            r.jsx('div', {
              className: 'size-9 shrink-0 md:size-5',
              children: d.icon,
            }),
            r.jsxs('div', {
              children: [
                r.jsx('p', {
                  className: 'text-sm font-medium',
                  children: d.title,
                }),
                r.jsx('p', {
                  className:
                    'text-[13px] text-fd-muted-foreground empty:hidden md:hidden',
                  children: d.description,
                }),
              ],
            }),
          ],
        })
      : t;
  return r.jsxs(Dn, {
    open: o,
    onOpenChange: s,
    children: [
      f &&
        r.jsxs(Fn, {
          ...n,
          className: h(
            'flex items-center gap-2 rounded-lg p-2 border bg-fd-secondary/50 text-start text-fd-secondary-foreground transition-colors hover:bg-fd-accent data-[state=open]:bg-fd-accent data-[state=open]:text-fd-accent-foreground',
            n.className,
          ),
          children: [
            f,
            r.jsx(Sn, {
              className: 'shrink-0 ms-auto size-4 text-fd-muted-foreground',
            }),
          ],
        }),
      r.jsx(On, {
        className:
          'flex flex-col gap-1 w-(--radix-popover-trigger-width) p-1 fd-scroll-container',
        children: e.map((u) => {
          const x = d && u.url === d.url;
          if (!(!x && u.unlisted))
            return r.jsxs(
              L,
              {
                href: u.url,
                onClick: i,
                ...u.props,
                className: h(
                  'flex items-center gap-2 rounded-lg p-1.5 hover:bg-fd-accent hover:text-fd-accent-foreground',
                  u.props?.className,
                ),
                children: [
                  r.jsx('div', {
                    className: 'shrink-0 size-9 md:mt-1 md:mb-auto md:size-5',
                    children: u.icon,
                  }),
                  r.jsxs('div', {
                    children: [
                      r.jsx('p', {
                        className: 'text-sm font-medium',
                        children: u.title,
                      }),
                      r.jsx('p', {
                        className:
                          'text-[13px] text-fd-muted-foreground empty:hidden',
                        children: u.description,
                      }),
                    ],
                  }),
                  r.jsx(nt, {
                    className: h(
                      'shrink-0 ms-auto size-3.5 text-fd-primary',
                      !x && 'invisible',
                    ),
                  }),
                ],
              },
              u.url,
            );
        }),
      }),
    ],
  });
}
function jr(e) {
  const { isTransparent: t } = at();
  return r.jsx('header', {
    id: 'nd-subnav',
    ...e,
    className: h(
      'fixed top-(--fd-banner-height) left-0 right-(--removed-body-scroll-bar-size,0) z-30 flex items-center ps-4 pe-2.5 border-b transition-colors backdrop-blur-sm',
      !t && 'bg-fd-background/80',
      e.className,
    ),
    children: e.children,
  });
}
function Cr(e) {
  const { collapsed: t } = F();
  return r.jsx('main', {
    id: 'nd-docs-layout',
    ...e,
    className: h(
      'flex flex-1 flex-col pt-(--fd-nav-height) transition-[padding] fd-default-layout',
      !t && 'mx-(--fd-layout-offset)',
      e.className,
    ),
    style: {
      ...e.style,
      paddingInlineStart: t
        ? 'min(calc(100vw - var(--fd-page-width)), var(--fd-sidebar-width))'
        : 'var(--fd-sidebar-width)',
    },
    children: e.children,
  });
}
function yr() {
  const { collapsed: e } = F();
  return r.jsxs('div', {
    className: h(
      'fixed flex shadow-lg transition-opacity rounded-xl p-0.5 border bg-fd-muted text-fd-muted-foreground z-10 max-md:hidden xl:start-4 max-xl:end-4',
      !e && 'pointer-events-none opacity-0',
    ),
    style: {
      top: 'calc(var(--fd-banner-height) + var(--fd-tocnav-height) + var(--spacing) * 4)',
    },
    children: [
      r.jsx($t, {
        className: h(
          $({ color: 'ghost', size: 'icon-sm', className: 'rounded-lg' }),
        ),
        children: r.jsx(Z, {}),
      }),
      r.jsx(lt, { className: 'rounded-lg', hideIfDisabled: !0 }),
    ],
  });
}
function Nr({ options: e, ...t }) {
  const n = Y(),
    o = c.useMemo(() => e.findLast((s) => st(s, n)), [e, n]);
  return r.jsx('div', {
    ...t,
    className: h('flex flex-row items-end gap-6 overflow-auto', t.className),
    children: e.map((s) => r.jsx(Sr, { selected: o === s, option: s }, s.url)),
  });
}
function Sr({
  option: { title: e, url: t, unlisted: n, props: o },
  selected: s = !1,
}) {
  return r.jsx(L, {
    href: t,
    ...o,
    className: h(
      'inline-flex border-b-2 border-transparent transition-colors items-center pb-1.5 font-medium gap-2 text-fd-muted-foreground text-sm text-nowrap hover:text-fd-accent-foreground',
      n && !s && 'hidden',
      s && 'border-fd-primary text-fd-primary',
      o?.className,
    ),
    children: e,
  });
}
const Tr = (e, t) =>
  t.icon
    ? {
        ...e,
        icon: r.jsx('div', {
          className:
            'size-full [&_svg]:size-full max-md:p-1.5 max-md:rounded-md max-md:border max-md:bg-fd-secondary',
          children: t.icon,
        }),
      }
    : e;
function Xe(e, { transform: t = Tr } = {}) {
  const n = [];
  function o(s, l) {
    if ('root' in s && s.root) {
      const a = Ht(s);
      if (a.size > 0) {
        const d = {
            url: a.values().next().value ?? '',
            title: s.name,
            icon: s.icon,
            unlisted: l,
            description: s.description,
            urls: a,
          },
          i = t ? t(d, s) : d;
        i && n.push(i);
      }
    }
    for (const a of s.children) a.type === 'folder' && o(a, l);
  }
  return (o(e), e.fallback && o(e.fallback, !0), n);
}
function Ht(e, t = new Set()) {
  e.index && t.add(e.index.url);
  for (const n of e.children)
    (n.type === 'page' && !n.external && t.add(n.url),
      n.type === 'folder' && Ht(n, t));
  return t;
}
function Rr({
  nav: { transparentMode: e, ...t } = {},
  sidebar: { tabs: n, enabled: o = !0, ...s } = {},
  searchToggle: l = {},
  themeSwitch: a = {},
  tabMode: d = 'auto',
  i18n: i = !1,
  children: f,
  tree: u,
  ...x
}) {
  const m = c.useMemo(
      () =>
        Array.isArray(n)
          ? n
          : typeof n == 'object'
            ? Xe(u, n)
            : n !== !1
              ? Xe(u)
              : [],
      [u, n],
    ),
    g = zn(x.links ?? [], x.githubUrl),
    b = h('md:[--fd-sidebar-width:268px] lg:[--fd-sidebar-width:286px]');
  function w() {
    const {
      footer: p,
      banner: v,
      collapsible: j = !0,
      component: C,
      components: P,
      defaultOpenLevel: _,
      prefetch: D,
      ...k
    } = s;
    if (C) return C;
    const N = g.filter((R) => R.type === 'icon'),
      y = r.jsxs(br, {
        children: [
          g
            .filter((R) => R.type !== 'icon')
            .map((R, O, Me) =>
              r.jsx(
                Vt,
                { item: R, className: h(O === Me.length - 1 && 'mb-4') },
                O,
              ),
            ),
          r.jsx(vr, { components: P }),
        ],
      }),
      T = r.jsxs(gr, {
        ...k,
        children: [
          r.jsxs(Ve, {
            children: [
              r.jsxs('div', {
                className: 'flex text-fd-muted-foreground items-center gap-1.5',
                children: [
                  r.jsx('div', {
                    className: 'flex flex-1',
                    children: N.map((R, O) =>
                      r.jsx(
                        Fe,
                        {
                          item: R,
                          className: h(
                            $({
                              size: 'icon-sm',
                              color: 'ghost',
                              className: 'p-2',
                            }),
                          ),
                          'aria-label': R.label,
                          children: R.icon,
                        },
                        O,
                      ),
                    ),
                  }),
                  i
                    ? r.jsxs(Oe, {
                        children: [
                          r.jsx(De, { className: 'size-4.5' }),
                          r.jsx(Bn, {}),
                        ],
                      })
                    : null,
                  a.enabled !== !1 &&
                    (a.component ??
                      r.jsx(ze, { className: 'p-0', mode: a.mode })),
                  r.jsx(Ue, {
                    className: h(
                      $({ color: 'ghost', size: 'icon-sm', className: 'p-2' }),
                    ),
                    children: r.jsx(Z, {}),
                  }),
                ],
              }),
              m.length > 0 && r.jsx(Ye, { options: m }),
              v,
            ],
          }),
          y,
          r.jsx(We, { className: 'empty:hidden', children: p }),
        ],
      }),
      I = r.jsxs(xr, {
        ...k,
        children: [
          r.jsxs(Ve, {
            children: [
              r.jsxs('div', {
                className: 'flex',
                children: [
                  r.jsx(L, {
                    href: t.url ?? '/',
                    className:
                      'inline-flex text-[15px] items-center gap-2.5 font-medium me-auto',
                    children: t.title,
                  }),
                  t.children,
                  j &&
                    r.jsx($t, {
                      className: h(
                        $({
                          color: 'ghost',
                          size: 'icon-sm',
                          className: 'mb-auto text-fd-muted-foreground',
                        }),
                      ),
                      children: r.jsx(Z, {}),
                    }),
                ],
              }),
              l.enabled !== !1 &&
                (l.components?.lg ?? r.jsx(Hn, { hideIfDisabled: !0 })),
              m.length > 0 && d === 'auto' && r.jsx(Ye, { options: m }),
              v,
            ],
          }),
          y,
          (i || N.length > 0 || a?.enabled !== !1 || p) &&
            r.jsxs(We, {
              children: [
                r.jsxs('div', {
                  className:
                    'flex text-fd-muted-foreground items-center empty:hidden',
                  children: [
                    i &&
                      r.jsx(Oe, {
                        children: r.jsx(De, { className: 'size-4.5' }),
                      }),
                    N.map((R, O) =>
                      r.jsx(
                        Fe,
                        {
                          item: R,
                          className: h($({ size: 'icon-sm', color: 'ghost' })),
                          'aria-label': R.label,
                          children: R.icon,
                        },
                        O,
                      ),
                    ),
                    a.enabled !== !1 &&
                      (a.component ??
                        r.jsx(ze, { className: 'ms-auto p-0', mode: a.mode })),
                  ],
                }),
                p,
              ],
            }),
        ],
      });
    return r.jsx(mr, {
      defaultOpenLevel: _,
      prefetch: D,
      Mobile: T,
      Content: r.jsxs(r.Fragment, { children: [j && r.jsx(yr, {}), I] }),
    });
  }
  return r.jsx(fr, {
    tree: u,
    children: r.jsxs($n, {
      transparentMode: e,
      children: [
        t.enabled !== !1 &&
          (t.component ??
            r.jsxs(jr, {
              className:
                'h-(--fd-nav-height) on-root:[--fd-nav-height:56px] md:on-root:[--fd-nav-height:0px] md:hidden',
              children: [
                r.jsx(L, {
                  href: t.url ?? '/',
                  className: 'inline-flex items-center gap-2.5 font-semibold',
                  children: t.title,
                }),
                r.jsx('div', { className: 'flex-1', children: t.children }),
                l.enabled !== !1 &&
                  (l.components?.sm ??
                    r.jsx(lt, { className: 'p-2', hideIfDisabled: !0 })),
                o &&
                  r.jsx(Ue, {
                    className: h(
                      $({ color: 'ghost', size: 'icon-sm', className: 'p-2' }),
                    ),
                    children: r.jsx(Z, {}),
                  }),
              ],
            })),
        r.jsxs(Cr, {
          ...x.containerProps,
          className: h(
            'md:[&_#nd-page_article]:pt-12 xl:[&_#nd-page_article]:px-8',
            o && b,
            x.containerProps?.className,
          ),
          children: [
            o && w(),
            d === 'top' &&
              m.length > 0 &&
              r.jsx(Nr, {
                options: m,
                className:
                  'sticky top-[calc(var(--fd-nav-height)+var(--fd-tocnav-height))] z-10 bg-fd-background border-b px-6 pt-3 xl:px-8 max-md:hidden',
              }),
            f,
          ],
        }),
      ],
    }),
  });
}
function Vt({ item: e, ...t }) {
  return e.type === 'menu'
    ? r.jsxs(Dt, {
        ...t,
        children: [
          e.url
            ? r.jsxs(Ot, {
                href: e.url,
                external: e.external,
                children: [e.icon, e.text],
              })
            : r.jsxs(Ft, { children: [e.icon, e.text] }),
          r.jsx(zt, {
            children: e.items.map((n, o) => r.jsx(Vt, { item: n }, o)),
          }),
        ],
      })
    : e.type === 'custom'
      ? r.jsx('div', { ...t, children: e.children })
      : r.jsx(Mt, {
          href: e.url,
          icon: e.icon,
          external: e.external,
          ...t,
          children: e.text,
        });
}
function Pr(...e) {
  return (t) => {
    e.forEach((n) => {
      typeof n == 'function' ? n(t) : n !== null && (n.current = t);
    });
  };
}
function Er(e, t) {
  const [n, o] = c.useState([]);
  return (
    c.useEffect(() => {
      let s = [];
      const l = new IntersectionObserver(
        (d) => {
          for (const i of d)
            i.isIntersecting && !s.includes(i.target.id)
              ? (s = [...s, i.target.id])
              : !i.isIntersecting &&
                s.includes(i.target.id) &&
                (s = s.filter((f) => f !== i.target.id));
          s.length > 0 && o(s);
        },
        {
          rootMargin: t ? '-80px 0% -70% 0%' : '-20px 0% -40% 0%',
          threshold: 1,
        },
      );
      function a() {
        const d = document.scrollingElement;
        if (!d) return;
        const i = d.scrollTop;
        i <= 0 && t
          ? o(e.slice(0, 1))
          : i + d.clientHeight >= d.scrollHeight - 6 &&
            o((f) =>
              f.length > 0 && !t ? e.slice(e.indexOf(f[0])) : e.slice(-1),
            );
      }
      for (const d of e) {
        const i = document.getElementById(d);
        i && l.observe(i);
      }
      return (
        a(),
        window.addEventListener('scroll', a),
        () => {
          (window.removeEventListener('scroll', a), l.disconnect());
        }
      );
    }, [t, e]),
    t ? n.slice(0, 1) : n
  );
}
var Ae = c.createContext([]),
  Wt = c.createContext({ current: null });
function Ir() {
  return c.useContext(Ae).at(-1);
}
function Ut() {
  return c.useContext(Ae);
}
function Ar({ containerRef: e, children: t }) {
  return r.jsx(Wt.Provider, { value: e, children: t });
}
function _r({ toc: e, single: t = !1, children: n }) {
  const o = c.useMemo(() => e.map((s) => s.url.split('#')[1]), [e]);
  return r.jsx(Ae.Provider, { value: Er(o, t), children: n });
}
var _e = c.forwardRef(({ onActiveChange: e, ...t }, n) => {
  const o = c.useContext(Wt),
    s = Ut(),
    l = c.useRef(null),
    a = Pr(l, n),
    d = s.includes(t.href.slice(1));
  return (
    re(d, (i) => {
      const f = l.current;
      f &&
        (i &&
          o.current &&
          Un(f, {
            behavior: 'smooth',
            block: 'center',
            inline: 'center',
            scrollMode: 'always',
            boundary: o.current,
          }),
        e?.(i));
    }),
    r.jsx('a', { ref: a, 'data-active': d, ...t, children: t.children })
  );
});
_e.displayName = 'TOCItem';
function Ge(e, t) {
  if (t.length === 0 || e.clientHeight === 0) return [0, 0];
  let n = Number.MAX_VALUE,
    o = 0;
  for (const s of t) {
    const l = e.querySelector(`a[href="#${s}"]`);
    if (!l) continue;
    const a = getComputedStyle(l);
    ((n = Math.min(n, l.offsetTop + parseFloat(a.paddingTop))),
      (o = Math.max(
        o,
        l.offsetTop + l.clientHeight - parseFloat(a.paddingBottom),
      )));
  }
  return [n, o - n];
}
function Ke(e, t) {
  (e.style.setProperty('--fd-top', `${t[0]}px`),
    e.style.setProperty('--fd-height', `${t[1]}px`));
}
function Yt({ containerRef: e, ...t }) {
  const n = Ut(),
    o = c.useRef(null),
    s = pe(() => {
      !e.current || !o.current || Ke(o.current, Ge(e.current, n));
    });
  return (
    c.useEffect(() => {
      if (!e.current) return;
      const l = e.current;
      s();
      const a = new ResizeObserver(s);
      return (
        a.observe(l),
        () => {
          a.disconnect();
        }
      );
    }, [e]),
    re(n, () => {
      !e.current || !o.current || Ke(o.current, Ge(e.current, n));
    }),
    r.jsx('div', { ref: o, role: 'none', ...t })
  );
}
function K(...e) {
  return (t) => {
    e.forEach((n) => {
      typeof n == 'function' ? n(t) : n && (n.current = t);
    });
  };
}
const Xt = c.createContext([]);
function ke() {
  return c.useContext(Xt);
}
function kr({ toc: e, children: t, ...n }) {
  return r.jsx(Xt, {
    value: e,
    children: r.jsx(_r, { toc: e, ...n, children: t }),
  });
}
function Gt({ ref: e, className: t, ...n }) {
  const o = c.useRef(null);
  return r.jsx('div', {
    ref: K(o, e),
    className: h(
      'relative min-h-0 text-sm ms-px overflow-auto [scrollbar-width:none] [mask-image:linear-gradient(to_bottom,transparent,white_16px,white_calc(100%-16px),transparent)] py-3',
      t,
    ),
    ...n,
    children: r.jsx(Ar, { containerRef: o, children: n.children }),
  });
}
function Kt({ ref: e, className: t, ...n }) {
  const o = c.useRef(null),
    s = ke(),
    { text: l } = G();
  return s.length === 0
    ? r.jsx('div', {
        className:
          'rounded-lg border bg-fd-card p-3 text-xs text-fd-muted-foreground',
        children: l.tocNoHeadings,
      })
    : r.jsxs(r.Fragment, {
        children: [
          r.jsx(Yt, {
            containerRef: o,
            className:
              'absolute top-(--fd-top) h-(--fd-height) w-px bg-fd-primary transition-all',
          }),
          r.jsx('div', {
            ref: K(e, o),
            className: h('flex flex-col border-s border-fd-foreground/10', t),
            ...n,
            children: s.map((a) => r.jsx(Lr, { item: a }, a.url)),
          }),
        ],
      });
}
function Lr({ item: e }) {
  return r.jsx(_e, {
    href: e.url,
    className: h(
      'prose py-1.5 text-sm text-fd-muted-foreground transition-colors [overflow-wrap:anywhere] first:pt-0 last:pb-0 data-[active=true]:text-fd-primary',
      e.depth <= 2 && 'ps-3',
      e.depth === 3 && 'ps-6',
      e.depth >= 4 && 'ps-8',
    ),
    children: e.title,
  });
}
const qt = xe('TocPopoverContext');
function Mr(e) {
  const { text: t } = G(),
    { open: n } = qt.use(),
    o = ke(),
    s = Ir(),
    l = c.useMemo(() => o.findIndex((i) => s === i.url.slice(1)), [o, s]),
    a = Re().at(-1),
    d = l !== -1 && !n;
  return r.jsxs(At, {
    ...e,
    className: h(
      'flex w-full h-(--fd-tocnav-height) items-center text-sm text-fd-muted-foreground gap-2.5 px-4 py-2.5 text-start focus-visible:outline-none [&_svg]:size-4 md:px-6',
      e.className,
    ),
    children: [
      r.jsx(Fr, {
        value: (l + 1) / Math.max(1, o.length),
        max: 1,
        className: h('shrink-0', n && 'text-fd-primary'),
      }),
      r.jsxs('span', {
        className: 'grid flex-1 *:my-auto *:row-start-1 *:col-start-1',
        children: [
          r.jsx('span', {
            className: h(
              'truncate transition-all',
              n && 'text-fd-foreground',
              d && 'opacity-0 -translate-y-full pointer-events-none',
            ),
            children: a?.name ?? t.toc,
          }),
          r.jsx('span', {
            className: h(
              'truncate transition-all',
              !d && 'opacity-0 translate-y-full pointer-events-none',
            ),
            children: o[l]?.title,
          }),
        ],
      }),
      r.jsx(ge, {
        className: h('shrink-0 transition-transform mx-0.5', n && 'rotate-180'),
      }),
    ],
  });
}
function Dr(e, t, n) {
  return e < t ? t : e > n ? n : e;
}
function Fr({
  value: e,
  strokeWidth: t = 2,
  size: n = 24,
  min: o = 0,
  max: s = 100,
  ...l
}) {
  const a = Dr(e, o, s),
    d = (n - t) / 2,
    i = 2 * Math.PI * d,
    f = (a / s) * i,
    u = { cx: n / 2, cy: n / 2, r: d, fill: 'none', strokeWidth: t };
  return r.jsxs('svg', {
    role: 'progressbar',
    viewBox: `0 0 ${n} ${n}`,
    'aria-valuenow': a,
    'aria-valuemin': o,
    'aria-valuemax': s,
    ...l,
    children: [
      r.jsx('circle', { ...u, className: 'stroke-current/25' }),
      r.jsx('circle', {
        ...u,
        stroke: 'currentColor',
        strokeDasharray: i,
        strokeDashoffset: i - f,
        strokeLinecap: 'round',
        transform: `rotate(-90 ${n / 2} ${n / 2})`,
        className: 'transition-all',
      }),
    ],
  });
}
function Or(e) {
  return r.jsx(Te, {
    'data-toc-popover': '',
    ...e,
    className: h('flex flex-col px-4 max-h-[50vh] md:px-6', e.className),
    children: e.children,
  });
}
function zr(e) {
  const t = c.useRef(null),
    [n, o] = c.useState(!1),
    { collapsed: s } = F(),
    { isTransparent: l } = at(),
    a = pe((d) => {
      n && t.current && !t.current.contains(d.target) && o(!1);
    });
  return (
    c.useEffect(
      () => (
        window.addEventListener('click', a),
        () => {
          window.removeEventListener('click', a);
        }
      ),
      [],
    ),
    r.jsx(qt.Provider, {
      value: c.useMemo(() => ({ open: n, setOpen: o }), [o, n]),
      children: r.jsx(It, {
        open: n,
        onOpenChange: o,
        asChild: !0,
        children: r.jsx('header', {
          ref: t,
          id: 'nd-tocnav',
          ...e,
          className: h(
            'fixed pr-(--removed-body-scroll-bar-size,0) z-10 border-b backdrop-blur-sm transition-colors xl:hidden max-xl:on-root:[--fd-tocnav-height:40px]',
            (!l || n) && 'bg-fd-background/80',
            n && 'shadow-lg',
            e.className,
          ),
          style: {
            ...e.style,
            top: 'calc(var(--fd-banner-height) + var(--fd-nav-height))',
            insetInlineStart: s
              ? '0px'
              : 'calc(var(--fd-sidebar-width) + var(--fd-layout-offset))',
            insetInlineEnd: 0,
          },
          children: e.children,
        }),
      }),
    })
  );
}
function $r({ date: e, ...t }) {
  const { text: n } = G(),
    [o, s] = c.useState('');
  return (
    c.useEffect(() => {
      s(new Date(e).toLocaleDateString());
    }, [e]),
    r.jsxs('p', {
      ...t,
      className: h('text-sm text-fd-muted-foreground', t.className),
      children: [n.lastUpdate, ' ', o],
    })
  );
}
function Qt(e) {
  const t = [];
  return (
    e.forEach((n) => {
      if (n.type === 'folder') {
        (n.index && t.push(n.index), t.push(...Qt(n.children)));
        return;
      }
      n.type === 'page' && !n.external && t.push(n);
    }),
    t
  );
}
const qe = new Map();
function Br({ items: e, ...t }) {
  const { root: n } = Pe(),
    o = Y(),
    { previous: s, next: l } = c.useMemo(() => {
      if (e) return e;
      const d = qe.get(n.$id) ?? Qt(n.children);
      qe.set(n.$id, d);
      const i = d.findIndex((f) => be(f.url, o, !1));
      return i === -1 ? {} : { previous: d[i - 1], next: d[i + 1] };
    }, [e, o, n]);
  return r.jsxs('div', {
    ...t,
    className: h(
      '@container grid gap-4 pb-6',
      s && l ? 'grid-cols-2' : 'grid-cols-1',
      t.className,
    ),
    children: [
      s ? r.jsx(Qe, { item: s, index: 0 }) : null,
      l ? r.jsx(Qe, { item: l, index: 1 }) : null,
    ],
  });
}
function Qe({ item: e, index: t }) {
  const { text: n } = G(),
    o = t === 0 ? Tn : rt;
  return r.jsxs(L, {
    href: e.url,
    className: h(
      'flex flex-col gap-2 rounded-lg border p-4 text-sm transition-colors hover:bg-fd-accent/80 hover:text-fd-accent-foreground @max-lg:col-span-full',
      t === 1 && 'text-end',
    ),
    children: [
      r.jsxs('div', {
        className: h(
          'inline-flex items-center gap-1.5 font-medium',
          t === 1 && 'flex-row-reverse',
        ),
        children: [
          r.jsx(o, { className: '-mx-1 size-4 shrink-0 rtl:rotate-180' }),
          r.jsx('p', { children: e.name }),
        ],
      }),
      r.jsx('p', {
        className: 'text-fd-muted-foreground truncate',
        children: e.description ?? (t === 0 ? n.previousPage : n.nextPage),
      }),
    ],
  });
}
function Hr({ includeRoot: e, includeSeparator: t, includePage: n, ...o }) {
  const s = Re(),
    { root: l } = Pe(),
    a = c.useMemo(
      () => ur(l, s, { includePage: n, includeSeparator: t, includeRoot: e }),
      [n, e, t, s, l],
    );
  return a.length === 0
    ? null
    : r.jsx('div', {
        ...o,
        className: h(
          'flex items-center gap-1.5 text-sm text-fd-muted-foreground',
          o.className,
        ),
        children: a.map((d, i) => {
          const f = h(
            'truncate',
            i === a.length - 1 && 'text-fd-primary font-medium',
          );
          return r.jsxs(
            c.Fragment,
            {
              children: [
                i !== 0 && r.jsx(rt, { className: 'size-3.5 shrink-0' }),
                d.url
                  ? r.jsx(L, {
                      href: d.url,
                      className: h(f, 'transition-opacity hover:opacity-80'),
                      children: d.name,
                    })
                  : r.jsx('span', { className: f, children: d.name }),
              ],
            },
            i,
          );
        }),
      });
}
function Vr(e) {
  const { collapsed: t } = F(),
    n = t ? '0px' : 'var(--fd-layout-offset)';
  return r.jsx('div', {
    id: 'nd-toc',
    ...e,
    className: h(
      'fixed bottom-0 pt-12 pb-2 pr-(--removed-body-scroll-bar-size,0) xl:on-root:[--fd-toc-width:286px] max-xl:hidden',
      e.className,
    ),
    style: {
      ...e.style,
      top: 'calc(var(--fd-banner-height) + var(--fd-nav-height))',
      insetInlineEnd: `max(${n}, calc(50vw - var(--fd-sidebar-width)/2 - var(--fd-page-width)/2))`,
    },
    children: r.jsx('div', {
      className: 'flex h-full w-(--fd-toc-width) max-w-full flex-col pe-4',
      children: e.children,
    }),
  });
}
function Zt({ ref: e, className: t, ...n }) {
  const o = c.useRef(null),
    s = ke(),
    { text: l } = G(),
    [a, d] = c.useState();
  return (
    c.useEffect(() => {
      if (!o.current) return;
      const i = o.current;
      function f() {
        if (i.clientHeight === 0) return;
        let x = 0,
          m = 0;
        const g = [];
        for (let b = 0; b < s.length; b++) {
          const w = i.querySelector(`a[href="#${s[b].url.slice(1)}"]`);
          if (!w) continue;
          const p = getComputedStyle(w),
            v = J(s[b].depth) + 1,
            j = w.offsetTop + parseFloat(p.paddingTop),
            C = w.offsetTop + w.clientHeight - parseFloat(p.paddingBottom);
          ((x = Math.max(v, x)),
            (m = Math.max(m, C)),
            g.push(`${b === 0 ? 'M' : 'L'}${v} ${j}`),
            g.push(`L${v} ${C}`));
        }
        d({ path: g.join(' '), width: x + 1, height: m });
      }
      const u = new ResizeObserver(f);
      return (
        f(),
        u.observe(i),
        () => {
          u.disconnect();
        }
      );
    }, [s]),
    s.length === 0
      ? r.jsx('div', {
          className:
            'rounded-lg border bg-fd-card p-3 text-xs text-fd-muted-foreground',
          children: l.tocNoHeadings,
        })
      : r.jsxs(r.Fragment, {
          children: [
            a
              ? r.jsx('div', {
                  className: 'absolute start-0 top-0 rtl:-scale-x-100',
                  style: {
                    width: a.width,
                    height: a.height,
                    maskImage: `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${a.width} ${a.height}"><path d="${a.path}" stroke="black" stroke-width="1" fill="none" /></svg>`)}")`,
                  },
                  children: r.jsx(Yt, {
                    containerRef: o,
                    className:
                      'mt-(--fd-top) h-(--fd-height) bg-fd-primary transition-all',
                  }),
                })
              : null,
            r.jsx('div', {
              ref: K(o, e),
              className: h('flex flex-col', t),
              ...n,
              children: s.map((i, f) =>
                r.jsx(
                  Ur,
                  { item: i, upper: s[f - 1]?.depth, lower: s[f + 1]?.depth },
                  i.url,
                ),
              ),
            }),
          ],
        })
  );
}
function Wr(e) {
  return e <= 2 ? 14 : e === 3 ? 26 : 36;
}
function J(e) {
  return e >= 3 ? 10 : 0;
}
function Ur({ item: e, upper: t = e.depth, lower: n = e.depth }) {
  const o = J(e.depth),
    s = J(t),
    l = J(n);
  return r.jsxs(_e, {
    href: e.url,
    style: { paddingInlineStart: Wr(e.depth) },
    className:
      'prose relative py-1.5 text-sm text-fd-muted-foreground hover:text-fd-accent-foreground transition-colors [overflow-wrap:anywhere] first:pt-0 last:pb-0 data-[active=true]:text-fd-primary',
    children: [
      o !== s
        ? r.jsx('svg', {
            xmlns: 'http://www.w3.org/2000/svg',
            viewBox: '0 0 16 16',
            className: 'absolute -top-1.5 start-0 size-4 rtl:-scale-x-100',
            children: r.jsx('line', {
              x1: s,
              y1: '0',
              x2: o,
              y2: '12',
              className: 'stroke-fd-foreground/10',
              strokeWidth: '1',
            }),
          })
        : null,
      r.jsx('div', {
        className: h(
          'absolute inset-y-0 w-px bg-fd-foreground/10',
          o !== s && 'top-1.5',
          o !== l && 'bottom-1.5',
        ),
        style: { insetInlineStart: o },
      }),
      e.title,
    ],
  });
}
function Yr(e) {
  return r.jsxs('h3', {
    id: 'toc-title',
    ...e,
    className: h(
      'inline-flex items-center gap-1.5 text-sm text-fd-muted-foreground',
      e.className,
    ),
    children: [r.jsx(Rn, { className: 'size-4' }), r.jsx(ot, { label: 'toc' })],
  });
}
function Xr({ variant: e = 'normal', ...t }) {
  return r.jsx(Gt, {
    ...t,
    children: e === 'clerk' ? r.jsx(Zt, {}) : r.jsx(Kt, {}),
  });
}
function Gr({ variant: e = 'normal', ...t }) {
  return r.jsx(Gt, {
    ...t,
    children: e === 'clerk' ? r.jsx(Zt, {}) : r.jsx(Kt, {}),
  });
}
function Kr(e) {
  return r.jsx('article', {
    ...e,
    className: h(
      'flex min-w-0 w-full flex-col gap-4 pt-8 px-4 md:px-6 md:mx-auto',
      e.className,
    ),
    children: e.children,
  });
}
function qr({ toc: e = !1, children: t, ...n }) {
  const o = r.jsx('div', {
    id: 'nd-page',
    ...n,
    className: h(
      'flex flex-1 w-full mx-auto max-w-(--fd-page-width) pt-(--fd-tocnav-height) pe-(--fd-toc-width)',
      n.className,
    ),
    children: t,
  });
  return e ? r.jsx(kr, { ...e, children: o }) : o;
}
function Qr({
  editOnGithub: e,
  breadcrumb: { enabled: t = !0, component: n, ...o } = {},
  footer: s = {},
  lastUpdate: l,
  container: a,
  full: d = !1,
  tableOfContentPopover: { enabled: i, component: f, ...u } = {},
  tableOfContent: { enabled: x, component: m, ...g } = {},
  toc: b = [],
  article: w,
  children: p,
}) {
  return (
    x ??
      (x = !d && (b.length > 0 || g.footer !== void 0 || g.header !== void 0)),
    i ?? (i = b.length > 0 || u.header !== void 0 || u.footer !== void 0),
    r.jsxs(qr, {
      toc: x || i ? { toc: b, single: g.single } : !1,
      ...a,
      children: [
        i &&
          (f ??
            r.jsxs(zr, {
              children: [
                r.jsx(Mr, {}),
                r.jsxs(Or, {
                  children: [
                    u.header,
                    r.jsx(Gr, { variant: u.style }),
                    u.footer,
                  ],
                }),
              ],
            })),
        r.jsxs(Kr, {
          ...w,
          children: [
            t && (n ?? r.jsx(Hr, { ...o })),
            p,
            r.jsxs('div', {
              className:
                'flex flex-row flex-wrap items-center justify-between gap-4 empty:hidden',
              children: [
                e &&
                  r.jsx(Zr, {
                    href: `https://github.com/${e.owner}/${e.repo}/blob/${e.sha}/${e.path.startsWith('/') ? e.path.slice(1) : e.path}`,
                  }),
                l && r.jsx($r, { date: new Date(l) }),
              ],
            }),
            s.enabled !== !1 && (s.component ?? r.jsx(Br, { items: s.items })),
          ],
        }),
        x &&
          (m ??
            r.jsxs(Vr, {
              children: [
                g.header,
                r.jsx(Yr, {}),
                r.jsx(Xr, { variant: g.style }),
                g.footer,
              ],
            })),
      ],
    })
  );
}
function Zr(e) {
  return r.jsx('a', {
    target: '_blank',
    rel: 'noreferrer noopener',
    ...e,
    className: h(
      $({ color: 'secondary', size: 'sm', className: 'gap-1.5 not-prose' }),
      e.className,
    ),
    children:
      e.children ??
      r.jsxs(r.Fragment, {
        children: [
          r.jsx(Pn, { className: 'size-3.5' }),
          r.jsx(ot, { label: 'editOnGithub' }),
        ],
      }),
  });
}
const Jt = c.forwardRef((e, t) =>
  r.jsx('div', {
    ref: t,
    ...e,
    className: h('prose flex-1', e.className),
    children: e.children,
  }),
);
Jt.displayName = 'DocsBody';
const en = c.forwardRef((e, t) =>
  e.children === void 0
    ? null
    : r.jsx('p', {
        ref: t,
        ...e,
        className: h('mb-8 text-lg text-fd-muted-foreground', e.className),
        children: e.children,
      }),
);
en.displayName = 'DocsDescription';
const tn = c.forwardRef((e, t) =>
  r.jsx('h1', {
    ref: t,
    ...e,
    className: h('text-[1.75em] font-semibold', e.className),
    children: e.children,
  }),
);
tn.displayName = 'DocsTitle';
function Jr(e) {
  return r.jsx('div', {
    ...e,
    className: h('grid grid-cols-2 gap-3 @container', e.className),
    children: e.children,
  });
}
function eo({ icon: e, title: t, description: n, ...o }) {
  const s = o.href ? L : 'div';
  return r.jsxs(s, {
    ...o,
    'data-card': !0,
    className: h(
      'block rounded-xl border bg-fd-card p-4 text-fd-card-foreground transition-colors @max-lg:col-span-full',
      o.href && 'hover:bg-fd-accent/80',
      o.className,
    ),
    children: [
      e
        ? r.jsx('div', {
            className:
              'not-prose mb-2 w-fit shadow-md rounded-lg border bg-fd-muted p-1.5 text-fd-muted-foreground [&_svg]:size-4',
            children: e,
          })
        : null,
      r.jsx('h3', {
        className: 'not-prose mb-1 text-sm font-medium',
        children: t,
      }),
      n
        ? r.jsx('p', {
            className: '!my-0 text-sm text-fd-muted-foreground',
            children: n,
          })
        : null,
      r.jsx('div', {
        className:
          'text-sm text-fd-muted-foreground prose-no-margin empty:hidden',
        children: o.children,
      }),
    ],
  });
}
const Q = 'size-5 -me-0.5 fill-(--callout-color) text-fd-card',
  nn = c.forwardRef(
    (
      { className: e, children: t, title: n, type: o = 'info', icon: s, ...l },
      a,
    ) => (
      o === 'warn' && (o = 'warning'),
      o === 'tip' && (o = 'info'),
      r.jsxs('div', {
        ref: a,
        className: h(
          'flex gap-2 my-4 rounded-xl border bg-fd-card p-3 ps-1 text-sm text-fd-card-foreground shadow-md',
          e,
        ),
        ...l,
        style: {
          '--callout-color': `var(--color-fd-${o}, var(--color-fd-muted))`,
          ...l.style,
        },
        children: [
          r.jsx('div', {
            role: 'none',
            className: 'w-0.5 bg-(--callout-color)/50 rounded-sm',
          }),
          s ??
            {
              info: r.jsx(_n, { className: Q }),
              warning: r.jsx(An, { className: Q }),
              error: r.jsx(In, { className: Q }),
              success: r.jsx(En, { className: Q }),
            }[o],
          r.jsxs('div', {
            className: 'flex flex-col gap-2 min-w-0 flex-1',
            children: [
              n && r.jsx('p', { className: 'font-medium !my-0', children: n }),
              r.jsx('div', {
                className:
                  'text-fd-muted-foreground prose-no-margin empty:hidden',
                children: t,
              }),
            ],
          }),
        ],
      })
    ),
  );
nn.displayName = 'Callout';
function W({ as: e, className: t, ...n }) {
  const o = e ?? 'h1';
  return n.id
    ? r.jsxs(o, {
        className: h('flex scroll-m-28 flex-row items-center gap-2', t),
        ...n,
        children: [
          r.jsx('a', {
            'data-card': '',
            href: `#${n.id}`,
            className: 'peer',
            children: n.children,
          }),
          r.jsx(kn, {
            'aria-label': 'Link to section',
            className:
              'size-3.5 shrink-0 text-fd-muted-foreground opacity-0 transition-opacity peer-hover:opacity-100',
          }),
        ],
      })
    : r.jsx(o, { className: t, ...n });
}
function to(e) {
  const [t, n] = c.useState(!1),
    o = c.useRef(e),
    s = c.useRef(null);
  o.current = e;
  const l = c.useCallback(() => {
    (s.current && window.clearTimeout(s.current),
      Promise.resolve(o.current()).then(() => {
        (n(!0),
          (s.current = window.setTimeout(() => {
            n(!1);
          }, 1500)));
      }));
  }, []);
  return (
    c.useEffect(
      () => () => {
        s.current && window.clearTimeout(s.current);
      },
      [],
    ),
    [t, l]
  );
}
var ie = 'rovingFocusGroup.onEntryFocus',
  no = { bubbles: !1, cancelable: !0 },
  q = 'RovingFocusGroup',
  [de, rn, ro] = Vn(q),
  [oo, on] = ne(q, [ro]),
  [so, ao] = oo(q),
  sn = c.forwardRef((e, t) =>
    r.jsx(de.Provider, {
      scope: e.__scopeRovingFocusGroup,
      children: r.jsx(de.Slot, {
        scope: e.__scopeRovingFocusGroup,
        children: r.jsx(lo, { ...e, ref: t }),
      }),
    }),
  );
sn.displayName = q;
var lo = c.forwardRef((e, t) => {
    const {
        __scopeRovingFocusGroup: n,
        orientation: o,
        loop: s = !1,
        dir: l,
        currentTabStopId: a,
        defaultCurrentTabStopId: d,
        onCurrentTabStopIdChange: i,
        onEntryFocus: f,
        preventScrollOnEntryFocus: u = !1,
        ...x
      } = e,
      m = c.useRef(null),
      g = H(t, m),
      b = fe(l),
      [w, p] = he({ prop: a, defaultProp: d ?? null, onChange: i, caller: q }),
      [v, j] = c.useState(!1),
      C = z(f),
      P = rn(n),
      _ = c.useRef(!1),
      [D, k] = c.useState(0);
    return (
      c.useEffect(() => {
        const N = m.current;
        if (N)
          return (
            N.addEventListener(ie, C),
            () => N.removeEventListener(ie, C)
          );
      }, [C]),
      r.jsx(so, {
        scope: n,
        orientation: o,
        dir: b,
        loop: s,
        currentTabStopId: w,
        onItemFocus: c.useCallback((N) => p(N), [p]),
        onItemShiftTab: c.useCallback(() => j(!0), []),
        onFocusableItemAdd: c.useCallback(() => k((N) => N + 1), []),
        onFocusableItemRemove: c.useCallback(() => k((N) => N - 1), []),
        children: r.jsx(E.div, {
          tabIndex: v || D === 0 ? -1 : 0,
          'data-orientation': o,
          ...x,
          ref: g,
          style: { outline: 'none', ...e.style },
          onMouseDown: S(e.onMouseDown, () => {
            _.current = !0;
          }),
          onFocus: S(e.onFocus, (N) => {
            const y = !_.current;
            if (N.target === N.currentTarget && y && !v) {
              const T = new CustomEvent(ie, no);
              if ((N.currentTarget.dispatchEvent(T), !T.defaultPrevented)) {
                const I = P().filter((V) => V.focusable),
                  R = I.find((V) => V.active),
                  O = I.find((V) => V.id === w),
                  jn = [R, O, ...I].filter(Boolean).map((V) => V.ref.current);
                cn(jn, u);
              }
            }
            _.current = !1;
          }),
          onBlur: S(e.onBlur, () => j(!1)),
        }),
      })
    );
  }),
  an = 'RovingFocusGroupItem',
  ln = c.forwardRef((e, t) => {
    const {
        __scopeRovingFocusGroup: n,
        focusable: o = !0,
        active: s = !1,
        tabStopId: l,
        children: a,
        ...d
      } = e,
      i = me(),
      f = l || i,
      u = ao(an, n),
      x = u.currentTabStopId === f,
      m = rn(n),
      {
        onFocusableItemAdd: g,
        onFocusableItemRemove: b,
        currentTabStopId: w,
      } = u;
    return (
      c.useEffect(() => {
        if (o) return (g(), () => b());
      }, [o, g, b]),
      r.jsx(de.ItemSlot, {
        scope: n,
        id: f,
        focusable: o,
        active: s,
        children: r.jsx(E.span, {
          tabIndex: x ? 0 : -1,
          'data-orientation': u.orientation,
          ...d,
          ref: t,
          onMouseDown: S(e.onMouseDown, (p) => {
            o ? u.onItemFocus(f) : p.preventDefault();
          }),
          onFocus: S(e.onFocus, () => u.onItemFocus(f)),
          onKeyDown: S(e.onKeyDown, (p) => {
            if (p.key === 'Tab' && p.shiftKey) {
              u.onItemShiftTab();
              return;
            }
            if (p.target !== p.currentTarget) return;
            const v = uo(p, u.orientation, u.dir);
            if (v !== void 0) {
              if (p.metaKey || p.ctrlKey || p.altKey || p.shiftKey) return;
              p.preventDefault();
              let C = m()
                .filter((P) => P.focusable)
                .map((P) => P.ref.current);
              if (v === 'last') C.reverse();
              else if (v === 'prev' || v === 'next') {
                v === 'prev' && C.reverse();
                const P = C.indexOf(p.currentTarget);
                C = u.loop ? fo(C, P + 1) : C.slice(P + 1);
              }
              setTimeout(() => cn(C));
            }
          }),
          children:
            typeof a == 'function'
              ? a({ isCurrentTabStop: x, hasTabStop: w != null })
              : a,
        }),
      })
    );
  });
ln.displayName = an;
var co = {
  ArrowLeft: 'prev',
  ArrowUp: 'prev',
  ArrowRight: 'next',
  ArrowDown: 'next',
  PageUp: 'first',
  Home: 'first',
  PageDown: 'last',
  End: 'last',
};
function io(e, t) {
  return t !== 'rtl'
    ? e
    : e === 'ArrowLeft'
      ? 'ArrowRight'
      : e === 'ArrowRight'
        ? 'ArrowLeft'
        : e;
}
function uo(e, t, n) {
  const o = io(e.key, n);
  if (
    !(t === 'vertical' && ['ArrowLeft', 'ArrowRight'].includes(o)) &&
    !(t === 'horizontal' && ['ArrowUp', 'ArrowDown'].includes(o))
  )
    return co[o];
}
function cn(e, t = !1) {
  const n = document.activeElement;
  for (const o of e)
    if (
      o === n ||
      (o.focus({ preventScroll: t }), document.activeElement !== n)
    )
      return;
}
function fo(e, t) {
  return e.map((n, o) => e[(t + o) % e.length]);
}
var ho = sn,
  mo = ln,
  ce = 'Tabs',
  [xo] = ne(ce, [on]),
  dn = on(),
  [go, Le] = xo(ce),
  un = c.forwardRef((e, t) => {
    const {
        __scopeTabs: n,
        value: o,
        onValueChange: s,
        defaultValue: l,
        orientation: a = 'horizontal',
        dir: d,
        activationMode: i = 'automatic',
        ...f
      } = e,
      u = fe(d),
      [x, m] = he({ prop: o, onChange: s, defaultProp: l ?? '', caller: ce });
    return r.jsx(go, {
      scope: n,
      baseId: me(),
      value: x,
      onValueChange: m,
      orientation: a,
      dir: u,
      activationMode: i,
      children: r.jsx(E.div, { dir: u, 'data-orientation': a, ...f, ref: t }),
    });
  });
un.displayName = ce;
var fn = 'TabsList',
  hn = c.forwardRef((e, t) => {
    const { __scopeTabs: n, loop: o = !0, ...s } = e,
      l = Le(fn, n),
      a = dn(n);
    return r.jsx(ho, {
      asChild: !0,
      ...a,
      orientation: l.orientation,
      dir: l.dir,
      loop: o,
      children: r.jsx(E.div, {
        role: 'tablist',
        'aria-orientation': l.orientation,
        ...s,
        ref: t,
      }),
    });
  });
hn.displayName = fn;
var mn = 'TabsTrigger',
  xn = c.forwardRef((e, t) => {
    const { __scopeTabs: n, value: o, disabled: s = !1, ...l } = e,
      a = Le(mn, n),
      d = dn(n),
      i = pn(a.baseId, o),
      f = vn(a.baseId, o),
      u = o === a.value;
    return r.jsx(mo, {
      asChild: !0,
      ...d,
      focusable: !s,
      active: u,
      children: r.jsx(E.button, {
        type: 'button',
        role: 'tab',
        'aria-selected': u,
        'aria-controls': f,
        'data-state': u ? 'active' : 'inactive',
        'data-disabled': s ? '' : void 0,
        disabled: s,
        id: i,
        ...l,
        ref: t,
        onMouseDown: S(e.onMouseDown, (x) => {
          !s && x.button === 0 && x.ctrlKey === !1
            ? a.onValueChange(o)
            : x.preventDefault();
        }),
        onKeyDown: S(e.onKeyDown, (x) => {
          [' ', 'Enter'].includes(x.key) && a.onValueChange(o);
        }),
        onFocus: S(e.onFocus, () => {
          const x = a.activationMode !== 'manual';
          !u && !s && x && a.onValueChange(o);
        }),
      }),
    });
  });
xn.displayName = mn;
var gn = 'TabsContent',
  bn = c.forwardRef((e, t) => {
    const { __scopeTabs: n, value: o, forceMount: s, children: l, ...a } = e,
      d = Le(gn, n),
      i = pn(d.baseId, o),
      f = vn(d.baseId, o),
      u = o === d.value,
      x = c.useRef(u);
    return (
      c.useEffect(() => {
        const m = requestAnimationFrame(() => (x.current = !1));
        return () => cancelAnimationFrame(m);
      }, []),
      r.jsx(B, {
        present: s || u,
        children: ({ present: m }) =>
          r.jsx(E.div, {
            'data-state': u ? 'active' : 'inactive',
            'data-orientation': d.orientation,
            role: 'tabpanel',
            'aria-labelledby': i,
            hidden: !m,
            id: f,
            tabIndex: 0,
            ...a,
            ref: t,
            style: { ...e.style, animationDuration: x.current ? '0s' : void 0 },
            children: m && l,
          }),
      })
    );
  });
bn.displayName = gn;
function pn(e, t) {
  return `${e}-trigger-${t}`;
}
function vn(e, t) {
  return `${e}-content-${t}`;
}
const X = new Map();
function bo(e, t) {
  const n = X.get(e) ?? [];
  (n.push(t), X.set(e, n));
}
function po(e, t) {
  const n = X.get(e) ?? [];
  X.set(
    e,
    n.filter((o) => o !== t),
  );
}
const wn = c.createContext(null);
function vo() {
  const e = c.useContext(wn);
  if (!e) throw new Error('You must wrap your component in <Tabs>');
  return e;
}
const wo = hn,
  jo = xn;
function Co({
  ref: e,
  groupId: t,
  persist: n = !1,
  updateAnchor: o = !1,
  defaultValue: s,
  value: l,
  onValueChange: a,
  ...d
}) {
  const i = c.useRef(null),
    [f, u] = l === void 0 ? c.useState(s) : [l, a ?? (() => {})],
    x = pe((g) => u(g)),
    m = c.useMemo(() => new Map(), []);
  return (
    c.useLayoutEffect(() => {
      if (!t) return;
      const g = n ? localStorage.getItem(t) : sessionStorage.getItem(t);
      return (
        g && x(g),
        bo(t, x),
        () => {
          po(t, x);
        }
      );
    }, [t, n]),
    c.useLayoutEffect(() => {
      const g = window.location.hash.slice(1);
      if (g) {
        for (const [b, w] of m.entries())
          if (w === g) {
            (x(b), i.current?.scrollIntoView());
            break;
          }
      }
    }, [m]),
    r.jsx(un, {
      ref: K(e, i),
      value: f,
      onValueChange: (g) => {
        if (o) {
          const b = m.get(g);
          b && window.history.replaceState(null, '', `#${b}`);
        }
        t
          ? (X.get(t)?.forEach((b) => {
              b(g);
            }),
            n ? localStorage.setItem(t, g) : sessionStorage.setItem(t, g))
          : u(g);
      },
      ...d,
      children: r.jsx(wn.Provider, {
        value: c.useMemo(() => ({ valueToIdMap: m }), [m]),
        children: d.children,
      }),
    })
  );
}
function yo({ value: e, ...t }) {
  const { valueToIdMap: n } = vo();
  return (
    t.id && n.set(e, t.id),
    r.jsx(bn, { value: e, ...t, children: t.children })
  );
}
const ue = c.createContext(null);
function No(e) {
  return r.jsx('pre', {
    ...e,
    className: h('min-w-full w-max *:flex *:flex-col', e.className),
    children: e.children,
  });
}
function So({
  ref: e,
  title: t,
  allowCopy: n = !0,
  keepBackground: o = !1,
  icon: s,
  viewportProps: l = {},
  children: a,
  Actions: d = (f) =>
    r.jsx('div', { ...f, className: h('empty:hidden', f.className) }),
  ...i
}) {
  const f = c.useContext(ue) !== null,
    u = c.useRef(null);
  return r.jsxs('figure', {
    ref: e,
    dir: 'ltr',
    ...i,
    className: h(
      f
        ? 'bg-fd-secondary -mx-px -mb-px last:rounded-b-xl'
        : 'my-4 bg-fd-card rounded-xl',
      o && 'bg-(--shiki-light-bg) dark:bg-(--shiki-dark-bg)',
      'shiki relative border shadow-sm outline-none not-prose overflow-hidden text-sm',
      i.className,
    ),
    children: [
      t
        ? r.jsxs('div', {
            className:
              'flex text-fd-muted-foreground items-center gap-2 h-9.5 border-b px-4',
            children: [
              typeof s == 'string'
                ? r.jsx('div', {
                    className: '[&_svg]:size-3.5',
                    dangerouslySetInnerHTML: { __html: s },
                  })
                : s,
              r.jsx('figcaption', {
                className: 'flex-1 truncate',
                children: t,
              }),
              d({
                className: '-me-2',
                children: n && r.jsx(Ze, { containerRef: u }),
              }),
            ],
          })
        : d({
            className:
              'absolute top-2 right-2 z-2 backdrop-blur-lg rounded-lg text-fd-muted-foreground',
            children: n && r.jsx(Ze, { containerRef: u }),
          }),
      r.jsx('div', {
        ref: u,
        ...l,
        className: h(
          'text-[13px] py-3.5 overflow-auto max-h-[600px] fd-scroll-container',
          l.className,
        ),
        style: {
          '--padding-right': t ? void 0 : 'calc(var(--spacing) * 8)',
          counterSet: i['data-line-numbers']
            ? `line ${Number(i['data-line-numbers-start'] ?? 1) - 1}`
            : void 0,
          ...l.style,
        },
        children: a,
      }),
    ],
  });
}
function Ze({ className: e, containerRef: t, ...n }) {
  const [o, s] = to(() => {
    const l = t.current?.getElementsByTagName('pre').item(0);
    if (!l) return;
    const a = l.cloneNode(!0);
    (a.querySelectorAll('.nd-copy-ignore').forEach((d) => {
      d.replaceWith(`
`);
    }),
      navigator.clipboard.writeText(a.textContent ?? ''));
  });
  return r.jsx('button', {
    type: 'button',
    'data-checked': o || void 0,
    className: h(
      $({
        className:
          'hover:text-fd-accent-foreground data-[checked]:text-fd-accent-foreground',
        size: 'icon-xs',
      }),
      e,
    ),
    'aria-label': o ? 'Copied Text' : 'Copy Text',
    onClick: s,
    ...n,
    children: o ? r.jsx(nt, {}) : r.jsx(Ln, {}),
  });
}
function To({ ref: e, ...t }) {
  const n = c.useRef(null),
    o = c.useContext(ue) !== null;
  return r.jsx(Co, {
    ref: K(n, e),
    ...t,
    className: h('bg-fd-card rounded-xl border', !o && 'my-4', t.className),
    children: r.jsx(ue.Provider, {
      value: c.useMemo(() => ({ containerRef: n, nested: o }), [o]),
      children: t.children,
    }),
  });
}
function Ro(e) {
  return r.jsx(wo, {
    ...e,
    className: h(
      'flex flex-row px-2 overflow-x-auto text-fd-muted-foreground',
      e.className,
    ),
    children: e.children,
  });
}
function Po({ children: e, ...t }) {
  return r.jsxs(jo, {
    ...t,
    className: h(
      'relative group inline-flex text-sm font-medium text-nowrap items-center transition-colors gap-2 px-2 py-1.5 hover:text-fd-accent-foreground data-[state=active]:text-fd-primary [&_svg]:size-3.5',
      t.className,
    ),
    children: [
      r.jsx('div', {
        className:
          'absolute inset-x-2 bottom-0 h-px group-data-[state=active]:bg-fd-primary',
      }),
      e,
    ],
  });
}
function Eo(e) {
  return r.jsx(yo, { ...e });
}
function Io(e) {
  return r.jsx(Mn, {
    sizes: '(max-width: 768px) 100vw, (max-width: 1200px) 70vw, 900px',
    ...e,
    src: e.src,
    className: h('rounded-lg', e.className),
  });
}
function Ao(e) {
  return r.jsx('div', {
    className: 'relative overflow-auto prose-no-margin my-6',
    children: r.jsx('table', { ...e }),
  });
}
const _o = {
  CodeBlockTab: Eo,
  CodeBlockTabs: To,
  CodeBlockTabsList: Ro,
  CodeBlockTabsTrigger: Po,
  pre: (e) =>
    r.jsx(So, { ...e, children: r.jsx(No, { children: e.children }) }),
  Card: eo,
  Cards: Jr,
  a: L,
  img: Io,
  h1: (e) => r.jsx(W, { as: 'h1', ...e }),
  h2: (e) => r.jsx(W, { as: 'h2', ...e }),
  h3: (e) => r.jsx(W, { as: 'h3', ...e }),
  h4: (e) => r.jsx(W, { as: 'h4', ...e }),
  h5: (e) => r.jsx(W, { as: 'h5', ...e }),
  h6: (e) => r.jsx(W, { as: 'h6', ...e }),
  table: Ao,
  Callout: nn,
};
function ko() {
  function e(t, n) {
    const o = {};
    for (const s in t) {
      const l = s.startsWith('./') ? s.slice(2) : s;
      (n && Object.assign(t[s], { base: n }), (o[l] = t[s]));
    }
    return o;
  }
  return {
    doc(t, n, o) {
      return e(o, n);
    },
    meta(t, n, o) {
      return e(o, n);
    },
    docLazy(t, n, o, s) {
      return { base: n, head: e(o), body: e(s) };
    },
  };
}
var Je = new Map();
function Lo(e, t) {
  const { id: n = '', component: o } = t;
  let s;
  const l = Je.get(n) ?? { preloaded: new Map() };
  Je.set(n, l);
  function a() {
    if (s) return s;
    s = {};
    for (const d in e) {
      const i = c.lazy(async () => {
        const f = await e[d]();
        return { default: (u) => o(f, u) };
      });
      s[d] = (f) => {
        const u = l.preloaded.get(d);
        return u ? o(u, f) : c.createElement(i, f);
      };
    }
    return s;
  }
  return {
    async preload(d) {
      const i = await e[d]();
      return (l.preloaded.set(d, i), i);
    },
    getRenderer: a,
    getComponent(d) {
      return a()[d];
    },
    useContent(d, i) {
      const f = this.getComponent(d);
      return c.createElement(f, i);
    },
  };
}
function Mo(e, t) {
  return Lo(e, { component: t }).getRenderer();
}
const et = ko(),
  Do = {
    doc: et.doc(
      'docs',
      './content/docs',
      Object.assign({
        './index.mdx': () =>
          $e(() => import('./index-1mAwFagG.js'), __vite__mapDeps([0, 1])),
        './test.mdx': () =>
          $e(() => import('./test-Da7NcFEw.js'), __vite__mapDeps([2, 1])),
      }),
    ),
    meta: et.meta('docs', './content/docs', Object.assign({})),
  },
  Fo = Mo(Do.doc, ({ toc: e, default: t, frontmatter: n }) =>
    r.jsxs(Qr, {
      toc: e,
      children: [
        r.jsx('title', { children: n.title }),
        r.jsx('meta', { name: 'description', content: n.description }),
        r.jsx(tn, { children: n.title }),
        r.jsx(en, { children: n.description }),
        r.jsx(Jt, { children: r.jsx(t, { components: { ..._o } }) }),
      ],
    }),
  ),
  Ho = Cn(function ({ loaderData: t }) {
    const { tree: n, path: o } = t,
      s = Fo[o];
    return r.jsx(Rr, { ...Wn(), tree: n, children: r.jsx(s, {}) });
  });
export { Ho as default };
