import { r as i, j as t, a as $e, w as Ge, L as Ue } from './index-CT70PKhW.js';
import {
  P as E,
  b as he,
  d as Be,
  e as O,
  f as y,
  g as H,
  D as We,
  h as B,
  i as Ye,
  j as k,
  k as qe,
  l as pe,
  m as le,
  t as R,
  n as Z,
  o as F,
  L as ue,
  C as de,
} from './button-345GfI1w.js';
import {
  c as Ne,
  u as Xe,
  L as $,
  B as we,
  N as Je,
  g as Qe,
  a as Ze,
  T as fe,
  b as me,
  S as et,
  d as tt,
  e as nt,
} from './layout.shared-WQQuTG8U.js';
function ot(e) {
  const n = i.useRef({ value: e, previous: e });
  return i.useMemo(
    () => (
      n.current.value !== e &&
        ((n.current.previous = n.current.value), (n.current.value = e)),
      n.current.previous
    ),
    [e],
  );
}
var rt = Object.freeze({
    position: 'absolute',
    border: 0,
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    wordWrap: 'normal',
  }),
  at = 'VisuallyHidden',
  be = i.forwardRef((e, n) =>
    t.jsx(E.span, { ...e, ref: n, style: { ...rt, ...e.style } }),
  );
be.displayName = at;
var st = be,
  D = 'NavigationMenu',
  [ee, Ce, it] = Ne(D),
  [W, ct, lt] = Ne(D),
  [te] = Be(D, [it, lt]),
  [ut, T] = te(D),
  [dt, ft] = te(D),
  je = i.forwardRef((e, n) => {
    const {
        __scopeNavigationMenu: o,
        value: r,
        onValueChange: a,
        defaultValue: s,
        delayDuration: c = 200,
        skipDelayDuration: d = 300,
        orientation: u = 'horizontal',
        dir: f,
        ...l
      } = e,
      [g, C] = i.useState(null),
      j = O(n, (w) => C(w)),
      h = qe(f),
      p = i.useRef(0),
      b = i.useRef(0),
      M = i.useRef(0),
      [I, m] = i.useState(!0),
      [x, v] = pe({
        prop: r,
        onChange: (w) => {
          const P = w !== '',
            U = d > 0;
          (P
            ? (window.clearTimeout(M.current), U && m(!1))
            : (window.clearTimeout(M.current),
              (M.current = window.setTimeout(() => m(!0), d))),
            a?.(w));
        },
        defaultProp: s ?? '',
        caller: D,
      }),
      N = i.useCallback(() => {
        (window.clearTimeout(b.current),
          (b.current = window.setTimeout(() => v(''), 150)));
      }, [v]),
      _ = i.useCallback(
        (w) => {
          (window.clearTimeout(b.current), v(w));
        },
        [v],
      ),
      L = i.useCallback(
        (w) => {
          x === w
            ? window.clearTimeout(b.current)
            : (p.current = window.setTimeout(() => {
                (window.clearTimeout(b.current), v(w));
              }, c));
        },
        [x, v, c],
      );
    return (
      i.useEffect(
        () => () => {
          (window.clearTimeout(p.current),
            window.clearTimeout(b.current),
            window.clearTimeout(M.current));
        },
        [],
      ),
      t.jsx(Me, {
        scope: o,
        isRootMenu: !0,
        value: x,
        dir: h,
        orientation: u,
        rootNavigationMenu: g,
        onTriggerEnter: (w) => {
          (window.clearTimeout(p.current), I ? L(w) : _(w));
        },
        onTriggerLeave: () => {
          (window.clearTimeout(p.current), N());
        },
        onContentEnter: () => window.clearTimeout(b.current),
        onContentLeave: N,
        onItemSelect: (w) => {
          v((P) => (P === w ? '' : w));
        },
        onItemDismiss: () => v(''),
        children: t.jsx(E.nav, {
          'aria-label': 'Main',
          'data-orientation': u,
          dir: h,
          ...l,
          ref: j,
        }),
      })
    );
  });
je.displayName = D;
var Y = 'NavigationMenuSub',
  mt = i.forwardRef((e, n) => {
    const {
        __scopeNavigationMenu: o,
        value: r,
        onValueChange: a,
        defaultValue: s,
        orientation: c = 'horizontal',
        ...d
      } = e,
      u = T(Y, o),
      [f, l] = pe({ prop: r, onChange: a, defaultProp: s ?? '', caller: Y });
    return t.jsx(Me, {
      scope: o,
      isRootMenu: !1,
      value: f,
      dir: u.dir,
      orientation: c,
      rootNavigationMenu: u.rootNavigationMenu,
      onTriggerEnter: (g) => l(g),
      onItemSelect: (g) => l(g),
      onItemDismiss: () => l(''),
      children: t.jsx(E.div, { 'data-orientation': c, ...d, ref: n }),
    });
  });
mt.displayName = Y;
var Me = (e) => {
    const {
        scope: n,
        isRootMenu: o,
        rootNavigationMenu: r,
        dir: a,
        orientation: s,
        children: c,
        value: d,
        onItemSelect: u,
        onItemDismiss: f,
        onTriggerEnter: l,
        onTriggerLeave: g,
        onContentEnter: C,
        onContentLeave: j,
      } = e,
      [h, p] = i.useState(null),
      [b, M] = i.useState(new Map()),
      [I, m] = i.useState(null);
    return t.jsx(ut, {
      scope: n,
      isRootMenu: o,
      rootNavigationMenu: r,
      value: d,
      previousValue: ot(d),
      baseId: he(),
      dir: a,
      orientation: s,
      viewport: h,
      onViewportChange: p,
      indicatorTrack: I,
      onIndicatorTrackChange: m,
      onTriggerEnter: k(l),
      onTriggerLeave: k(g),
      onContentEnter: k(C),
      onContentLeave: k(j),
      onItemSelect: k(u),
      onItemDismiss: k(f),
      onViewportContentChange: i.useCallback((x, v) => {
        M((N) => (N.set(x, v), new Map(N)));
      }, []),
      onViewportContentRemove: i.useCallback((x) => {
        M((v) => (v.has(x) ? (v.delete(x), new Map(v)) : v));
      }, []),
      children: t.jsx(ee.Provider, {
        scope: n,
        children: t.jsx(dt, { scope: n, items: b, children: c }),
      }),
    });
  },
  ye = 'NavigationMenuList',
  Re = i.forwardRef((e, n) => {
    const { __scopeNavigationMenu: o, ...r } = e,
      a = T(ye, o),
      s = t.jsx(E.ul, { 'data-orientation': a.orientation, ...r, ref: n });
    return t.jsx(E.div, {
      style: { position: 'relative' },
      ref: a.onIndicatorTrackChange,
      children: t.jsx(ee.Slot, {
        scope: o,
        children: a.isRootMenu ? t.jsx(De, { asChild: !0, children: s }) : s,
      }),
    });
  });
Re.displayName = ye;
var Ee = 'NavigationMenuItem',
  [vt, Te] = te(Ee),
  ne = i.forwardRef((e, n) => {
    const { __scopeNavigationMenu: o, value: r, ...a } = e,
      s = he(),
      c = r || s || 'LEGACY_REACT_AUTO_VALUE',
      d = i.useRef(null),
      u = i.useRef(null),
      f = i.useRef(null),
      l = i.useRef(() => {}),
      g = i.useRef(!1),
      C = i.useCallback((h = 'start') => {
        if (d.current) {
          l.current();
          const p = X(d.current);
          p.length && ae(h === 'start' ? p : p.reverse());
        }
      }, []),
      j = i.useCallback(() => {
        if (d.current) {
          const h = X(d.current);
          h.length && (l.current = Ct(h));
        }
      }, []);
    return t.jsx(vt, {
      scope: o,
      value: c,
      triggerRef: u,
      contentRef: d,
      focusProxyRef: f,
      wasEscapeCloseRef: g,
      onEntryKeyDown: C,
      onFocusProxyEnter: C,
      onRootContentClose: j,
      onContentFocusOutside: j,
      children: t.jsx(E.li, { ...a, ref: n }),
    });
  });
ne.displayName = Ee;
var q = 'NavigationMenuTrigger',
  Ie = i.forwardRef((e, n) => {
    const { __scopeNavigationMenu: o, disabled: r, ...a } = e,
      s = T(q, e.__scopeNavigationMenu),
      c = Te(q, e.__scopeNavigationMenu),
      d = i.useRef(null),
      u = O(d, c.triggerRef, n),
      f = Fe(s.baseId, c.value),
      l = Oe(s.baseId, c.value),
      g = i.useRef(!1),
      C = i.useRef(!1),
      j = c.value === s.value;
    return t.jsxs(t.Fragment, {
      children: [
        t.jsx(ee.ItemSlot, {
          scope: o,
          value: c.value,
          children: t.jsx(Se, {
            asChild: !0,
            children: t.jsx(E.button, {
              id: f,
              disabled: r,
              'data-disabled': r ? '' : void 0,
              'data-state': se(j),
              'aria-expanded': j,
              'aria-controls': l,
              ...a,
              ref: u,
              onPointerEnter: y(e.onPointerEnter, () => {
                ((C.current = !1), (c.wasEscapeCloseRef.current = !1));
              }),
              onPointerMove: y(
                e.onPointerMove,
                K(() => {
                  r ||
                    C.current ||
                    c.wasEscapeCloseRef.current ||
                    g.current ||
                    (s.onTriggerEnter(c.value), (g.current = !0));
                }),
              ),
              onPointerLeave: y(
                e.onPointerLeave,
                K(() => {
                  r || (s.onTriggerLeave(), (g.current = !1));
                }),
              ),
              onClick: y(e.onClick, () => {
                (s.onItemSelect(c.value), (C.current = j));
              }),
              onKeyDown: y(e.onKeyDown, (h) => {
                const b = {
                  horizontal: 'ArrowDown',
                  vertical: s.dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight',
                }[s.orientation];
                j && h.key === b && (c.onEntryKeyDown(), h.preventDefault());
              }),
            }),
          }),
        }),
        j &&
          t.jsxs(t.Fragment, {
            children: [
              t.jsx(st, {
                'aria-hidden': !0,
                tabIndex: 0,
                ref: c.focusProxyRef,
                onFocus: (h) => {
                  const p = c.contentRef.current,
                    b = h.relatedTarget,
                    M = b === d.current,
                    I = p?.contains(b);
                  (M || !I) && c.onFocusProxyEnter(M ? 'start' : 'end');
                },
              }),
              s.viewport && t.jsx('span', { 'aria-owns': l }),
            ],
          }),
      ],
    });
  });
Ie.displayName = q;
var gt = 'NavigationMenuLink',
  ve = 'navigationMenu.linkSelect',
  _e = i.forwardRef((e, n) => {
    const { __scopeNavigationMenu: o, active: r, onSelect: a, ...s } = e;
    return t.jsx(Se, {
      asChild: !0,
      children: t.jsx(E.a, {
        'data-active': r ? '' : void 0,
        'aria-current': r ? 'page' : void 0,
        ...s,
        ref: n,
        onClick: y(
          e.onClick,
          (c) => {
            const d = c.target,
              u = new CustomEvent(ve, { bubbles: !0, cancelable: !0 });
            if (
              (d.addEventListener(ve, (f) => a?.(f), { once: !0 }),
              le(d, u),
              !u.defaultPrevented && !c.metaKey)
            ) {
              const f = new CustomEvent(V, { bubbles: !0, cancelable: !0 });
              le(d, f);
            }
          },
          { checkForDefaultPrevented: !1 },
        ),
      }),
    });
  });
_e.displayName = gt;
var oe = 'NavigationMenuIndicator',
  xt = i.forwardRef((e, n) => {
    const { forceMount: o, ...r } = e,
      a = T(oe, e.__scopeNavigationMenu),
      s = !!a.value;
    return a.indicatorTrack
      ? $e.createPortal(
          t.jsx(H, { present: o || s, children: t.jsx(ht, { ...r, ref: n }) }),
          a.indicatorTrack,
        )
      : null;
  });
xt.displayName = oe;
var ht = i.forwardRef((e, n) => {
    const { __scopeNavigationMenu: o, ...r } = e,
      a = T(oe, o),
      s = Ce(o),
      [c, d] = i.useState(null),
      [u, f] = i.useState(null),
      l = a.orientation === 'horizontal',
      g = !!a.value;
    i.useEffect(() => {
      const h = s().find((p) => p.value === a.value)?.ref.current;
      h && d(h);
    }, [s, a.value]);
    const C = () => {
      c &&
        f({
          size: l ? c.offsetWidth : c.offsetHeight,
          offset: l ? c.offsetLeft : c.offsetTop,
        });
    };
    return (
      J(c, C),
      J(a.indicatorTrack, C),
      u
        ? t.jsx(E.div, {
            'aria-hidden': !0,
            'data-state': g ? 'visible' : 'hidden',
            'data-orientation': a.orientation,
            ...r,
            ref: n,
            style: {
              position: 'absolute',
              ...(l
                ? {
                    left: 0,
                    width: u.size + 'px',
                    transform: `translateX(${u.offset}px)`,
                  }
                : {
                    top: 0,
                    height: u.size + 'px',
                    transform: `translateY(${u.offset}px)`,
                  }),
              ...r.style,
            },
          })
        : null
    );
  }),
  S = 'NavigationMenuContent',
  Pe = i.forwardRef((e, n) => {
    const { forceMount: o, ...r } = e,
      a = T(S, e.__scopeNavigationMenu),
      s = Te(S, e.__scopeNavigationMenu),
      c = O(s.contentRef, n),
      d = s.value === a.value,
      u = {
        value: s.value,
        triggerRef: s.triggerRef,
        focusProxyRef: s.focusProxyRef,
        wasEscapeCloseRef: s.wasEscapeCloseRef,
        onContentFocusOutside: s.onContentFocusOutside,
        onRootContentClose: s.onRootContentClose,
        ...r,
      };
    return a.viewport
      ? t.jsx(pt, { forceMount: o, ...u, ref: c })
      : t.jsx(H, {
          present: o || d,
          children: t.jsx(Le, {
            'data-state': se(d),
            ...u,
            ref: c,
            onPointerEnter: y(e.onPointerEnter, a.onContentEnter),
            onPointerLeave: y(e.onPointerLeave, K(a.onContentLeave)),
            style: {
              pointerEvents: !d && a.isRootMenu ? 'none' : void 0,
              ...u.style,
            },
          }),
        });
  });
Pe.displayName = S;
var pt = i.forwardRef((e, n) => {
    const o = T(S, e.__scopeNavigationMenu),
      { onViewportContentChange: r, onViewportContentRemove: a } = o;
    return (
      B(() => {
        r(e.value, { ref: n, ...e });
      }, [e, n, r]),
      B(() => () => a(e.value), [e.value, a]),
      null
    );
  }),
  V = 'navigationMenu.rootContentDismiss',
  Le = i.forwardRef((e, n) => {
    const {
        __scopeNavigationMenu: o,
        value: r,
        triggerRef: a,
        focusProxyRef: s,
        wasEscapeCloseRef: c,
        onRootContentClose: d,
        onContentFocusOutside: u,
        ...f
      } = e,
      l = T(S, o),
      g = i.useRef(null),
      C = O(g, n),
      j = Fe(l.baseId, r),
      h = Oe(l.baseId, r),
      p = Ce(o),
      b = i.useRef(null),
      { onItemDismiss: M } = l;
    i.useEffect(() => {
      const m = g.current;
      if (l.isRootMenu && m) {
        const x = () => {
          (M(), d(), m.contains(document.activeElement) && a.current?.focus());
        };
        return (m.addEventListener(V, x), () => m.removeEventListener(V, x));
      }
    }, [l.isRootMenu, e.value, a, M, d]);
    const I = i.useMemo(() => {
      const x = p().map((P) => P.value);
      l.dir === 'rtl' && x.reverse();
      const v = x.indexOf(l.value),
        N = x.indexOf(l.previousValue),
        _ = r === l.value,
        L = N === x.indexOf(r);
      if (!_ && !L) return b.current;
      const w = (() => {
        if (v !== N) {
          if (_ && N !== -1) return v > N ? 'from-end' : 'from-start';
          if (L && v !== -1) return v > N ? 'to-start' : 'to-end';
        }
        return null;
      })();
      return ((b.current = w), w);
    }, [l.previousValue, l.value, l.dir, p, r]);
    return t.jsx(De, {
      asChild: !0,
      children: t.jsx(We, {
        id: h,
        'aria-labelledby': j,
        'data-motion': I,
        'data-orientation': l.orientation,
        ...f,
        ref: C,
        disableOutsidePointerEvents: !1,
        onDismiss: () => {
          const m = new Event(V, { bubbles: !0, cancelable: !0 });
          g.current?.dispatchEvent(m);
        },
        onFocusOutside: y(e.onFocusOutside, (m) => {
          u();
          const x = m.target;
          l.rootNavigationMenu?.contains(x) && m.preventDefault();
        }),
        onPointerDownOutside: y(e.onPointerDownOutside, (m) => {
          const x = m.target,
            v = p().some((_) => _.ref.current?.contains(x)),
            N = l.isRootMenu && l.viewport?.contains(x);
          (v || N || !l.isRootMenu) && m.preventDefault();
        }),
        onKeyDown: y(e.onKeyDown, (m) => {
          const x = m.altKey || m.ctrlKey || m.metaKey;
          if (m.key === 'Tab' && !x) {
            const N = X(m.currentTarget),
              _ = document.activeElement,
              L = N.findIndex((U) => U === _),
              P = m.shiftKey
                ? N.slice(0, L).reverse()
                : N.slice(L + 1, N.length);
            ae(P) ? m.preventDefault() : s.current?.focus();
          }
        }),
        onEscapeKeyDown: y(e.onEscapeKeyDown, (m) => {
          c.current = !0;
        }),
      }),
    });
  }),
  re = 'NavigationMenuViewport',
  ke = i.forwardRef((e, n) => {
    const { forceMount: o, ...r } = e,
      s = !!T(re, e.__scopeNavigationMenu).value;
    return t.jsx(H, { present: o || s, children: t.jsx(Nt, { ...r, ref: n }) });
  });
ke.displayName = re;
var Nt = i.forwardRef((e, n) => {
    const { __scopeNavigationMenu: o, children: r, ...a } = e,
      s = T(re, o),
      c = O(n, s.onViewportChange),
      d = ft(S, e.__scopeNavigationMenu),
      [u, f] = i.useState(null),
      [l, g] = i.useState(null),
      C = u ? u?.width + 'px' : void 0,
      j = u ? u?.height + 'px' : void 0,
      h = !!s.value,
      p = h ? s.value : s.previousValue;
    return (
      J(l, () => {
        l && f({ width: l.offsetWidth, height: l.offsetHeight });
      }),
      t.jsx(E.div, {
        'data-state': se(h),
        'data-orientation': s.orientation,
        ...a,
        ref: c,
        style: {
          pointerEvents: !h && s.isRootMenu ? 'none' : void 0,
          '--radix-navigation-menu-viewport-width': C,
          '--radix-navigation-menu-viewport-height': j,
          ...a.style,
        },
        onPointerEnter: y(e.onPointerEnter, s.onContentEnter),
        onPointerLeave: y(e.onPointerLeave, K(s.onContentLeave)),
        children: Array.from(d.items).map(
          ([M, { ref: I, forceMount: m, ...x }]) => {
            const v = p === M;
            return t.jsx(
              H,
              {
                present: m || v,
                children: t.jsx(Le, {
                  ...x,
                  ref: Ye(I, (N) => {
                    v && N && g(N);
                  }),
                }),
              },
              M,
            );
          },
        ),
      })
    );
  }),
  wt = 'FocusGroup',
  De = i.forwardRef((e, n) => {
    const { __scopeNavigationMenu: o, ...r } = e,
      a = T(wt, o);
    return t.jsx(W.Provider, {
      scope: o,
      children: t.jsx(W.Slot, {
        scope: o,
        children: t.jsx(E.div, { dir: a.dir, ...r, ref: n }),
      }),
    });
  }),
  ge = ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'],
  bt = 'FocusGroupItem',
  Se = i.forwardRef((e, n) => {
    const { __scopeNavigationMenu: o, ...r } = e,
      a = ct(o),
      s = T(bt, o);
    return t.jsx(W.ItemSlot, {
      scope: o,
      children: t.jsx(E.button, {
        ...r,
        ref: n,
        onKeyDown: y(e.onKeyDown, (c) => {
          if (['Home', 'End', ...ge].includes(c.key)) {
            let u = a().map((g) => g.ref.current);
            if (
              ([
                s.dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft',
                'ArrowUp',
                'End',
              ].includes(c.key) && u.reverse(),
              ge.includes(c.key))
            ) {
              const g = u.indexOf(c.currentTarget);
              u = u.slice(g + 1);
            }
            (setTimeout(() => ae(u)), c.preventDefault());
          }
        }),
      }),
    });
  });
function X(e) {
  const n = [],
    o = document.createTreeWalker(e, NodeFilter.SHOW_ELEMENT, {
      acceptNode: (r) => {
        const a = r.tagName === 'INPUT' && r.type === 'hidden';
        return r.disabled || r.hidden || a
          ? NodeFilter.FILTER_SKIP
          : r.tabIndex >= 0
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_SKIP;
      },
    });
  for (; o.nextNode(); ) n.push(o.currentNode);
  return n;
}
function ae(e) {
  const n = document.activeElement;
  return e.some((o) =>
    o === n ? !0 : (o.focus(), document.activeElement !== n),
  );
}
function Ct(e) {
  return (
    e.forEach((n) => {
      ((n.dataset.tabindex = n.getAttribute('tabindex') || ''),
        n.setAttribute('tabindex', '-1'));
    }),
    () => {
      e.forEach((n) => {
        const o = n.dataset.tabindex;
        n.setAttribute('tabindex', o);
      });
    }
  );
}
function J(e, n) {
  const o = k(n);
  B(() => {
    let r = 0;
    if (e) {
      const a = new ResizeObserver(() => {
        (cancelAnimationFrame(r), (r = window.requestAnimationFrame(o)));
      });
      return (
        a.observe(e),
        () => {
          (window.cancelAnimationFrame(r), a.unobserve(e));
        }
      );
    }
  }, [e, o]);
}
function se(e) {
  return e ? 'open' : 'closed';
}
function Fe(e, n) {
  return `${e}-trigger-${n}`;
}
function Oe(e, n) {
  return `${e}-content-${n}`;
}
function K(e) {
  return (n) => (n.pointerType === 'mouse' ? e(n) : void 0);
}
var jt = je,
  Mt = Re,
  Ae = Ie,
  yt = _e,
  Ve = Pe,
  Ke = ke;
const Rt = jt,
  Et = Mt,
  G = i.forwardRef(({ className: e, children: n, ...o }, r) =>
    t.jsx(ne, { ref: r, className: R('list-none', e), ...o, children: n }),
  );
G.displayName = ne.displayName;
const ie = i.forwardRef(({ className: e, children: n, ...o }, r) =>
  t.jsx(Ae, {
    ref: r,
    className: R('data-[state=open]:bg-fd-accent/50', e),
    ...o,
    children: n,
  }),
);
ie.displayName = Ae.displayName;
const ce = i.forwardRef(({ className: e, ...n }, o) =>
  t.jsx(Ve, {
    ref: o,
    className: R(
      'absolute inset-x-0 top-0 overflow-auto fd-scroll-container max-h-[80svh] data-[motion=from-end]:animate-fd-enterFromRight data-[motion=from-start]:animate-fd-enterFromLeft data-[motion=to-end]:animate-fd-exitToRight data-[motion=to-start]:animate-fd-exitToLeft',
      e,
    ),
    ...n,
  }),
);
ce.displayName = Ve.displayName;
const z = yt,
  ze = i.forwardRef(({ className: e, ...n }, o) =>
    t.jsx('div', {
      ref: o,
      className: 'flex w-full justify-center',
      children: t.jsx(Ke, {
        ...n,
        className: R(
          'relative h-(--radix-navigation-menu-viewport-height) w-full origin-[top_center] overflow-hidden transition-[width,height] duration-300 data-[state=closed]:animate-fd-nav-menu-out data-[state=open]:animate-fd-nav-menu-in',
          e,
        ),
      }),
    }),
  );
ze.displayName = Ke.displayName;
const He = Z(
  'inline-flex items-center gap-1 p-2 text-fd-muted-foreground transition-colors hover:text-fd-accent-foreground data-[active=true]:text-fd-primary [&_svg]:size-4',
);
function Tt(e) {
  const [n, o] = i.useState(''),
    { isTransparent: r } = Xe();
  return t.jsx(Rt, {
    value: n,
    onValueChange: o,
    asChild: !0,
    children: t.jsxs('header', {
      id: 'nd-nav',
      ...e,
      className: R(
        'fixed top-(--fd-banner-height) z-40 left-0 right-(--removed-body-scroll-bar-size,0) backdrop-blur-lg border-b transition-colors *:mx-auto *:max-w-fd-container',
        n.length > 0 && 'max-lg:shadow-lg max-lg:rounded-b-2xl',
        (!r || n.length > 0) && 'bg-fd-background/80',
        e.className,
      ),
      children: [
        t.jsx(Et, {
          className: 'flex h-14 w-full items-center px-4',
          asChild: !0,
          children: t.jsx('nav', { children: e.children }),
        }),
        t.jsx(ze, {}),
      ],
    }),
  });
}
const It = G;
function _t(e) {
  return t.jsx(ce, {
    ...e,
    className: R(
      'grid grid-cols-1 gap-2 p-4 md:grid-cols-2 lg:grid-cols-3',
      e.className,
    ),
    children: e.children,
  });
}
function Pt(e) {
  return t.jsx(ie, {
    ...e,
    className: R(He(), 'rounded-md', e.className),
    children: e.children,
  });
}
function Lt(e) {
  return t.jsx(z, {
    asChild: !0,
    children: t.jsx($, {
      ...e,
      className: R(
        'flex flex-col gap-2 rounded-lg border bg-fd-card p-3 transition-colors hover:bg-fd-accent/80 hover:text-fd-accent-foreground',
        e.className,
      ),
      children: e.children,
    }),
  });
}
const kt = Z('', {
  variants: {
    variant: {
      main: He(),
      button: F({ color: 'secondary', className: 'gap-1.5 [&_svg]:size-4' }),
      icon: F({ color: 'ghost', size: 'icon' }),
    },
  },
  defaultVariants: { variant: 'main' },
});
function Dt({ item: e, variant: n, ...o }) {
  return t.jsx(G, {
    children: t.jsx(z, {
      asChild: !0,
      children: t.jsx(we, {
        ...o,
        item: e,
        className: R(kt({ variant: n }), o.className),
        children: o.children,
      }),
    }),
  });
}
const St = Z('', {
  variants: {
    variant: {
      main: 'inline-flex items-center gap-2 py-1.5 transition-colors hover:text-fd-popover-foreground/50 data-[active=true]:font-medium data-[active=true]:text-fd-primary [&_svg]:size-4',
      icon: F({ size: 'icon', color: 'ghost' }),
      button: F({ color: 'secondary', className: 'gap-1.5 [&_svg]:size-4' }),
    },
  },
  defaultVariants: { variant: 'main' },
});
function Q({ item: e, ...n }) {
  if (e.type === 'custom')
    return t.jsx('div', {
      className: R('grid', n.className),
      children: e.children,
    });
  if (e.type === 'menu') {
    const o = t.jsxs(t.Fragment, { children: [e.icon, e.text] });
    return t.jsxs('div', {
      className: R('mb-4 flex flex-col', n.className),
      children: [
        t.jsx('p', {
          className: 'mb-1 text-sm text-fd-muted-foreground',
          children: e.url
            ? t.jsx(z, {
                asChild: !0,
                children: t.jsx($, {
                  href: e.url,
                  external: e.external,
                  children: o,
                }),
              })
            : o,
        }),
        e.items.map((r, a) => t.jsx(Q, { item: r }, a)),
      ],
    });
  }
  return t.jsx(z, {
    asChild: !0,
    children: t.jsxs(we, {
      item: e,
      className: R(St({ variant: e.type }), n.className),
      'aria-label': e.type === 'icon' ? e.label : void 0,
      children: [e.icon, e.type === 'icon' ? void 0 : e.text],
    }),
  });
}
const Ft = G;
function Ot({ enableHover: e = !1, ...n }) {
  return t.jsx(ie, {
    ...n,
    onPointerMove: e ? void 0 : (o) => o.preventDefault(),
    children: n.children,
  });
}
function At(e) {
  return t.jsx(ce, {
    ...e,
    className: R('flex flex-col p-4', e.className),
    children: e.children,
  });
}
function Vt(e) {
  const {
    nav: n = {},
    links: o,
    githubUrl: r,
    i18n: a,
    themeSwitch: s = {},
    searchToggle: c,
    ...d
  } = e;
  return t.jsx(Je, {
    transparentMode: n?.transparentMode,
    children: t.jsxs('main', {
      id: 'nd-home-layout',
      ...d,
      className: R('flex flex-1 flex-col pt-14', d.className),
      children: [
        n.enabled !== !1 &&
          (n.component ??
            t.jsx(Kt, {
              links: o,
              nav: n,
              themeSwitch: s,
              searchToggle: c,
              i18n: a,
              githubUrl: r,
            })),
        e.children,
      ],
    }),
  });
}
function Kt({
  nav: e = {},
  i18n: n = !1,
  links: o,
  githubUrl: r,
  themeSwitch: a = {},
  searchToggle: s = {},
}) {
  const c = i.useMemo(() => Qe(o, r), [o, r]),
    d = c.filter((f) => ['nav', 'all'].includes(f.on ?? 'all')),
    u = c.filter((f) => ['menu', 'all'].includes(f.on ?? 'all'));
  return t.jsxs(Tt, {
    children: [
      t.jsx($, {
        href: e.url ?? '/',
        className: 'inline-flex items-center gap-2.5 font-semibold',
        children: e.title,
      }),
      e.children,
      t.jsx('ul', {
        className: 'flex flex-row items-center gap-2 px-6 max-sm:hidden',
        children: d
          .filter((f) => !A(f))
          .map((f, l) => t.jsx(xe, { item: f, className: 'text-sm' }, l)),
      }),
      t.jsxs('div', {
        className:
          'flex flex-row items-center justify-end gap-1.5 flex-1 max-lg:hidden',
        children: [
          s.enabled !== !1 &&
            (s.components?.lg ??
              t.jsx(Ze, {
                className: 'w-full rounded-full ps-2.5 max-w-[240px]',
                hideIfDisabled: !0,
              })),
          a.enabled !== !1 && (a.component ?? t.jsx(fe, { mode: a?.mode })),
          n
            ? t.jsx(me, { children: t.jsx(ue, { className: 'size-5' }) })
            : null,
          t.jsx('div', {
            className: 'flex flex-row items-center empty:hidden',
            children: d.filter(A).map((f, l) => t.jsx(xe, { item: f }, l)),
          }),
        ],
      }),
      t.jsxs('ul', {
        className: 'flex flex-row items-center ms-auto -me-1.5 lg:hidden',
        children: [
          s.enabled !== !1 &&
            (s.components?.sm ??
              t.jsx(et, { className: 'p-2', hideIfDisabled: !0 })),
          t.jsxs(Ft, {
            children: [
              t.jsx(Ot, {
                'aria-label': 'Toggle Menu',
                className: R(
                  F({ size: 'icon', color: 'ghost', className: 'group' }),
                ),
                enableHover: e.enableHoverToOpen,
                children: t.jsx(de, {
                  className:
                    '!size-5.5 transition-transform duration-300 group-data-[state=open]:rotate-180',
                }),
              }),
              t.jsxs(At, {
                className: 'sm:flex-row sm:items-center sm:justify-end',
                children: [
                  u
                    .filter((f) => !A(f))
                    .map((f, l) =>
                      t.jsx(Q, { item: f, className: 'sm:hidden' }, l),
                    ),
                  t.jsxs('div', {
                    className:
                      '-ms-1.5 flex flex-row items-center gap-1.5 max-sm:mt-2',
                    children: [
                      u
                        .filter(A)
                        .map((f, l) =>
                          t.jsx(Q, { item: f, className: '-me-1.5' }, l),
                        ),
                      t.jsx('div', { role: 'separator', className: 'flex-1' }),
                      n
                        ? t.jsxs(me, {
                            children: [
                              t.jsx(ue, { className: 'size-5' }),
                              t.jsx(tt, {}),
                              t.jsx(de, {
                                className: 'size-3 text-fd-muted-foreground',
                              }),
                            ],
                          })
                        : null,
                      a.enabled !== !1 &&
                        (a.component ?? t.jsx(fe, { mode: a?.mode })),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}
function xe({ item: e, ...n }) {
  if (e.type === 'custom') return t.jsx('div', { ...n, children: e.children });
  if (e.type === 'menu') {
    const o = e.items.map((r, a) => {
      if (r.type === 'custom')
        return t.jsx(i.Fragment, { children: r.children }, a);
      const {
        banner: s = r.icon
          ? t.jsx('div', {
              className:
                'w-fit rounded-md border bg-fd-muted p-1 [&_svg]:size-4',
              children: r.icon,
            })
          : null,
        ...c
      } = r.menu ?? {};
      return t.jsx(
        Lt,
        {
          href: r.url,
          external: r.external,
          ...c,
          children:
            c.children ??
            t.jsxs(t.Fragment, {
              children: [
                s,
                t.jsx('p', {
                  className: 'text-[15px] font-medium',
                  children: r.text,
                }),
                t.jsx('p', {
                  className: 'text-sm text-fd-muted-foreground empty:hidden',
                  children: r.description,
                }),
              ],
            }),
        },
        `${a}-${r.url}`,
      );
    });
    return t.jsxs(It, {
      children: [
        t.jsx(Pt, {
          ...n,
          children: e.url
            ? t.jsx($, { href: e.url, external: e.external, children: e.text })
            : e.text,
        }),
        t.jsx(_t, { children: o }),
      ],
    });
  }
  return t.jsx(Dt, {
    ...n,
    item: e,
    variant: e.type,
    'aria-label': e.type === 'icon' ? e.label : void 0,
    children: e.type === 'icon' ? e.icon : e.text,
  });
}
function A(e) {
  return 'secondary' in e && e.secondary != null
    ? e.secondary
    : e.type === 'icon';
}
function Gt({}) {
  return [
    { title: 'New React Router App' },
    { name: 'description', content: 'Welcome to React Router!' },
  ];
}
const Ut = Ge(function () {
  return t.jsx(Vt, {
    ...nt(),
    children: t.jsxs('div', {
      className:
        'p-4 flex flex-col items-center justify-center text-center flex-1',
      children: [
        t.jsx('h1', {
          className: 'text-xl font-bold mb-2',
          children: 'Fumadocs on React Router.',
        }),
        t.jsx('p', {
          className: 'text-fd-muted-foreground mb-4',
          children: 'The truly flexible docs framework on React.js.',
        }),
        t.jsx(Ue, {
          className:
            'text-sm bg-fd-primary text-fd-primary-foreground rounded-full font-medium px-4 py-2.5',
          to: '/docs',
          children: 'Open Docs',
        }),
      ],
    }),
  });
});
export { Ut as default, Gt as meta };
