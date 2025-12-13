const __vite__mapDeps = (
  i,
  m = __vite__mapDeps,
  d = m.f ||
    (m.f = [
      'assets/search-default-BSZHGCZU.js',
      'assets/index-CT70PKhW.js',
      'assets/index-C0GeZixz.js',
      'assets/button-345GfI1w.js',
      'assets/algolia-IZEDLPHE-2120h3C3.js',
      'assets/chunk-OTD7MV33-qJr9DjGl.js',
      'assets/orama-cloud-WEGQE5A6-DSsy8tIc.js',
      'assets/chunk-ZMWYLUDP-oajMeTFk.js',
      'assets/static-A2YJ5TXV-Ba_y029W.js',
    ]),
) => i.map((i) => d[i]);
import {
  r as m,
  j as p,
  L as ht,
  y as pt,
  z as gt,
  A as mt,
  B as yt,
  w as St,
  C as bt,
  M as It,
  D as Dt,
  S as Nt,
  G as Ot,
  O as wt,
  i as Tt,
} from './index-CT70PKhW.js';
import {
  _ as j,
  S as vt,
  a as At,
  u as ze,
  e as _t,
} from './index-C0GeZixz.js';
import {
  x as Et,
  J as xt,
  y as Rt,
  B as Ue,
  a as Pt,
  I as Ct,
  E as Mt,
  G as kt,
  l as Lt,
  d as zt,
  b as le,
  g as je,
  P as $,
  R as Ut,
  q as jt,
  e as pe,
  v as Ft,
  f as W,
  w as Bt,
  F as Wt,
  D as Vt,
  H as $t,
  t as E,
  u as ge,
  S as Gt,
  o as Jt,
  K as Ht,
  n as Kt,
  N as Yt,
  O as qt,
} from './button-345GfI1w.js';
const Zt = m.lazy(() =>
  j(
    () => import('./search-default-BSZHGCZU.js'),
    __vite__mapDeps([0, 1, 2, 3]),
  ),
);
function Xt({
  children: t,
  dir: e = 'ltr',
  theme: n = {},
  search: r,
  i18n: o,
}) {
  let s = t;
  return (
    r?.enabled !== !1 &&
      (s = p.jsx(Et, { SearchDialog: Zt, ...r, children: s })),
    n?.enabled !== !1 &&
      (s = p.jsx(xt, {
        attribute: 'class',
        defaultTheme: 'system',
        enableSystem: !0,
        disableTransitionOnChange: !0,
        ...n,
        children: s,
      })),
    o && (s = p.jsx(Qt, { ...o, children: s })),
    p.jsx(Rt, { dir: e, children: p.jsx(vt, { children: s }) })
  );
}
function Qt({
  locales: t = [],
  locale: e,
  onLocaleChange: n,
  children: r,
  translations: o,
}) {
  const s = Ue(),
    i = Pt(),
    a = (l) => {
      if (n) return n(l);
      const f = i.split('/').filter((u) => u.length > 0);
      (f[0] !== e ? f.unshift(l) : (f[0] = l), s.push(`/${f.join('/')}`));
    },
    c = m.useRef(a);
  return (
    (c.current = a),
    p.jsx(Ct.Provider, {
      value: m.useMemo(
        () => ({
          locale: e,
          locales: t,
          text: { ...Mt, ...o },
          onChange: (l) => c.current(l),
        }),
        [e, t, o],
      ),
      children: r,
    })
  );
}
var en = {
  usePathname() {
    return yt().pathname;
  },
  useParams() {
    return mt();
  },
  useRouter() {
    const t = pt(),
      e = gt();
    return m.useMemo(
      () => ({
        push(n) {
          t(n);
        },
        refresh() {
          e.revalidate();
        },
      }),
      [t, e],
    );
  },
  Link({ href: t, prefetch: e, ...n }) {
    return p.jsx(ht, {
      to: t,
      prefetch: e ? 'intent' : 'none',
      ...n,
      children: n.children,
    });
  },
};
function tn({ children: t }) {
  return p.jsx(kt, { ...en, children: t });
}
function nn(t) {
  return p.jsx(tn, { children: p.jsx(Xt, { ...t, children: t.children }) });
}
var Q = 'Dialog',
  [Fe] = zt(Q),
  [rn, C] = Fe(Q),
  Be = (t) => {
    const {
        __scopeDialog: e,
        children: n,
        open: r,
        defaultOpen: o,
        onOpenChange: s,
        modal: i = !0,
      } = t,
      a = m.useRef(null),
      c = m.useRef(null),
      [l, f] = Lt({ prop: r, defaultProp: o ?? !1, onChange: s, caller: Q });
    return p.jsx(rn, {
      scope: e,
      triggerRef: a,
      contentRef: c,
      contentId: le(),
      titleId: le(),
      descriptionId: le(),
      open: l,
      onOpenChange: f,
      onOpenToggle: m.useCallback(() => f((u) => !u), [f]),
      modal: i,
      children: n,
    });
  };
Be.displayName = Q;
var We = 'DialogTrigger',
  on = m.forwardRef((t, e) => {
    const { __scopeDialog: n, ...r } = t,
      o = C(We, n),
      s = pe(e, o.triggerRef);
    return p.jsx($.button, {
      type: 'button',
      'aria-haspopup': 'dialog',
      'aria-expanded': o.open,
      'aria-controls': o.contentId,
      'data-state': ye(o.open),
      ...r,
      ref: s,
      onClick: W(t.onClick, o.onOpenToggle),
    });
  });
on.displayName = We;
var sn = 'DialogPortal',
  [wo, Ve] = Fe(sn, { forceMount: void 0 }),
  Z = 'DialogOverlay',
  $e = m.forwardRef((t, e) => {
    const n = Ve(Z, t.__scopeDialog),
      { forceMount: r = n.forceMount, ...o } = t,
      s = C(Z, t.__scopeDialog);
    return s.modal
      ? p.jsx(je, {
          present: r || s.open,
          children: p.jsx(cn, { ...o, ref: e }),
        })
      : null;
  });
$e.displayName = Z;
var an = jt('DialogOverlay.RemoveScroll'),
  cn = m.forwardRef((t, e) => {
    const { __scopeDialog: n, ...r } = t,
      o = C(Z, n);
    return p.jsx(Ut, {
      as: an,
      allowPinchZoom: !0,
      shards: [o.contentRef],
      children: p.jsx($.div, {
        'data-state': ye(o.open),
        ...r,
        ref: e,
        style: { pointerEvents: 'auto', ...r.style },
      }),
    });
  }),
  z = 'DialogContent',
  Ge = m.forwardRef((t, e) => {
    const n = Ve(z, t.__scopeDialog),
      { forceMount: r = n.forceMount, ...o } = t,
      s = C(z, t.__scopeDialog);
    return p.jsx(je, {
      present: r || s.open,
      children: s.modal
        ? p.jsx(ln, { ...o, ref: e })
        : p.jsx(un, { ...o, ref: e }),
    });
  });
Ge.displayName = z;
var ln = m.forwardRef((t, e) => {
    const n = C(z, t.__scopeDialog),
      r = m.useRef(null),
      o = pe(e, n.contentRef, r);
    return (
      m.useEffect(() => {
        const s = r.current;
        if (s) return Ft(s);
      }, []),
      p.jsx(Je, {
        ...t,
        ref: o,
        trapFocus: n.open,
        disableOutsidePointerEvents: !0,
        onCloseAutoFocus: W(t.onCloseAutoFocus, (s) => {
          (s.preventDefault(), n.triggerRef.current?.focus());
        }),
        onPointerDownOutside: W(t.onPointerDownOutside, (s) => {
          const i = s.detail.originalEvent,
            a = i.button === 0 && i.ctrlKey === !0;
          (i.button === 2 || a) && s.preventDefault();
        }),
        onFocusOutside: W(t.onFocusOutside, (s) => s.preventDefault()),
      })
    );
  }),
  un = m.forwardRef((t, e) => {
    const n = C(z, t.__scopeDialog),
      r = m.useRef(!1),
      o = m.useRef(!1);
    return p.jsx(Je, {
      ...t,
      ref: e,
      trapFocus: !1,
      disableOutsidePointerEvents: !1,
      onCloseAutoFocus: (s) => {
        (t.onCloseAutoFocus?.(s),
          s.defaultPrevented ||
            (r.current || n.triggerRef.current?.focus(), s.preventDefault()),
          (r.current = !1),
          (o.current = !1));
      },
      onInteractOutside: (s) => {
        (t.onInteractOutside?.(s),
          s.defaultPrevented ||
            ((r.current = !0),
            s.detail.originalEvent.type === 'pointerdown' && (o.current = !0)));
        const i = s.target;
        (n.triggerRef.current?.contains(i) && s.preventDefault(),
          s.detail.originalEvent.type === 'focusin' &&
            o.current &&
            s.preventDefault());
      },
    });
  }),
  Je = m.forwardRef((t, e) => {
    const {
        __scopeDialog: n,
        trapFocus: r,
        onOpenAutoFocus: o,
        onCloseAutoFocus: s,
        ...i
      } = t,
      a = C(z, n),
      c = m.useRef(null),
      l = pe(e, c);
    return (
      Bt(),
      p.jsxs(p.Fragment, {
        children: [
          p.jsx(Wt, {
            asChild: !0,
            loop: !0,
            trapped: r,
            onMountAutoFocus: o,
            onUnmountAutoFocus: s,
            children: p.jsx(Vt, {
              role: 'dialog',
              id: a.contentId,
              'aria-describedby': a.descriptionId,
              'aria-labelledby': a.titleId,
              'data-state': ye(a.open),
              ...i,
              ref: l,
              onDismiss: () => a.onOpenChange(!1),
            }),
          }),
          p.jsxs(p.Fragment, {
            children: [
              p.jsx(hn, { titleId: a.titleId }),
              p.jsx(gn, { contentRef: c, descriptionId: a.descriptionId }),
            ],
          }),
        ],
      })
    );
  }),
  me = 'DialogTitle',
  He = m.forwardRef((t, e) => {
    const { __scopeDialog: n, ...r } = t,
      o = C(me, n);
    return p.jsx($.h2, { id: o.titleId, ...r, ref: e });
  });
He.displayName = me;
var Ke = 'DialogDescription',
  fn = m.forwardRef((t, e) => {
    const { __scopeDialog: n, ...r } = t,
      o = C(Ke, n);
    return p.jsx($.p, { id: o.descriptionId, ...r, ref: e });
  });
fn.displayName = Ke;
var Ye = 'DialogClose',
  dn = m.forwardRef((t, e) => {
    const { __scopeDialog: n, ...r } = t,
      o = C(Ye, n);
    return p.jsx($.button, {
      type: 'button',
      ...r,
      ref: e,
      onClick: W(t.onClick, () => o.onOpenChange(!1)),
    });
  });
dn.displayName = Ye;
function ye(t) {
  return t ? 'open' : 'closed';
}
var qe = 'DialogTitleWarning',
  [To, Ze] = $t(qe, { contentName: z, titleName: me, docsSlug: 'dialog' }),
  hn = ({ titleId: t }) => {
    const e = Ze(qe),
      n = `\`${e.contentName}\` requires a \`${e.titleName}\` for the component to be accessible for screen reader users.

If you want to hide the \`${e.titleName}\`, you can wrap it with our VisuallyHidden component.

For more information, see https://radix-ui.com/primitives/docs/components/${e.docsSlug}`;
    return (
      m.useEffect(() => {
        t && (document.getElementById(t) || console.error(n));
      }, [n, t]),
      null
    );
  },
  pn = 'DialogDescriptionWarning',
  gn = ({ contentRef: t, descriptionId: e }) => {
    const r = `Warning: Missing \`Description\` or \`aria-describedby={undefined}\` for {${Ze(pn).contentName}}.`;
    return (
      m.useEffect(() => {
        const o = t.current?.getAttribute('aria-describedby');
        e && o && (document.getElementById(e) || console.warn(r));
      }, [r, t, e]),
      null
    );
  };
const Xe = m.createContext(null),
  Qe = m.createContext(null),
  et = m.createContext(null);
function mn({
  open: t,
  onOpenChange: e,
  search: n,
  onSearchChange: r,
  isLoading: o = !1,
  children: s,
}) {
  const [i, a] = m.useState(null);
  return p.jsx(Be, {
    open: t,
    onOpenChange: e,
    children: p.jsx(Xe.Provider, {
      value: m.useMemo(
        () => ({
          open: t,
          onOpenChange: e,
          search: n,
          onSearchChange: r,
          active: i,
          setActive: a,
          isLoading: o,
        }),
        [i, o, e, r, t, n],
      ),
      children: s,
    }),
  });
}
function yn(t) {
  return p.jsx('div', {
    ...t,
    className: E('flex flex-row items-center gap-2 p-3', t.className),
  });
}
function Sn(t) {
  const { text: e } = ge(),
    { search: n, onSearchChange: r } = ee();
  return p.jsx('input', {
    ...t,
    value: n,
    onChange: (o) => r(o.target.value),
    placeholder: e.search,
    className:
      'w-0 flex-1 bg-transparent text-lg placeholder:text-fd-muted-foreground focus-visible:outline-none',
  });
}
function bn({ children: t = 'ESC', className: e, ...n }) {
  const { onOpenChange: r } = ee();
  return p.jsx('button', {
    type: 'button',
    onClick: () => r(!1),
    className: E(
      Jt({
        color: 'outline',
        size: 'sm',
        className: 'font-mono text-fd-muted-foreground',
      }),
      e,
    ),
    ...n,
    children: t,
  });
}
function vo(t) {
  return p.jsx('div', {
    ...t,
    className: E('bg-fd-secondary/50 p-3 empty:hidden', t.className),
  });
}
function In(t) {
  return p.jsx($e, {
    ...t,
    className: E(
      'fixed inset-0 z-50 backdrop-blur-xs bg-fd-overlay data-[state=open]:animate-fd-fade-in data-[state=closed]:animate-fd-fade-out',
      t.className,
    ),
  });
}
function Dn({ children: t, ...e }) {
  const { text: n } = ge();
  return p.jsxs(Ge, {
    'aria-describedby': void 0,
    ...e,
    className: E(
      'fixed left-1/2 top-4 md:top-[calc(50%-250px)] z-50 w-[calc(100%-1rem)] max-w-screen-sm -translate-x-1/2 rounded-xl border bg-fd-popover text-fd-popover-foreground shadow-2xl shadow-black/50 overflow-hidden data-[state=closed]:animate-fd-dialog-out data-[state=open]:animate-fd-dialog-in',
      '*:border-b *:has-[+:last-child[data-empty=true]]:border-b-0 *:data-[empty=true]:border-b-0 *:last:border-b-0',
      e.className,
    ),
    children: [p.jsx(He, { className: 'hidden', children: n.search }), t],
  });
}
function Nn({
  items: t = null,
  Empty: e = () =>
    p.jsx('div', {
      className: 'py-12 text-center text-sm text-fd-muted-foreground',
      children: p.jsx(Ht, { label: 'searchNoResult' }),
    }),
  Item: n = (o) => p.jsx(On, { ...o }),
  ...r
}) {
  const o = m.useRef(null),
    [s, i] = m.useState(() => (t && t.length > 0 ? t[0].id : null)),
    { onOpenChange: a } = ee(),
    c = Ue(),
    l = (u) => {
      (u.type === 'action'
        ? u.onSelect()
        : u.external
          ? window.open(u.url, '_blank')?.focus()
          : c.push(u.url),
        a(!1));
    },
    f = At((u) => {
      if (!(!t || u.isComposing)) {
        if (u.key === 'ArrowDown' || u.key == 'ArrowUp') {
          let d = t.findIndex((h) => h.id === s);
          (d === -1 ? (d = 0) : u.key === 'ArrowDown' ? d++ : d--,
            i(t.at(d % t.length)?.id ?? null),
            u.preventDefault());
        }
        if (u.key === 'Enter') {
          const d = t.find((h) => h.id === s);
          (d && l(d), u.preventDefault());
        }
      }
    });
  return (
    m.useEffect(() => {
      const u = o.current;
      if (!u) return;
      const d = new ResizeObserver(() => {
          const g = u.firstElementChild;
          u.style.setProperty('--fd-animated-height', `${g.clientHeight}px`);
        }),
        h = u.firstElementChild;
      return (
        h && d.observe(h),
        window.addEventListener('keydown', f),
        () => {
          (d.disconnect(), window.removeEventListener('keydown', f));
        }
      );
    }, []),
    ze(t, () => {
      t && t.length > 0 && i(t[0].id);
    }),
    p.jsx('div', {
      ...r,
      ref: o,
      'data-empty': t === null,
      className: E(
        'overflow-hidden h-(--fd-animated-height) transition-[height]',
        r.className,
      ),
      children: p.jsx('div', {
        className: E(
          'w-full flex flex-col overflow-y-auto max-h-[460px] p-1',
          !t && 'hidden',
        ),
        children: p.jsxs(Qe.Provider, {
          value: m.useMemo(() => ({ active: s, setActive: i }), [s]),
          children: [
            t?.length === 0 && e(),
            t?.map((u) =>
              p.jsx(
                m.Fragment,
                { children: n({ item: u, onClick: () => l(u) }) },
                u.id,
              ),
            ),
          ],
        }),
      }),
    })
  );
}
function On({
  item: t,
  className: e,
  children: n,
  renderHighlights: r = vn,
  ...o
}) {
  const { active: s, setActive: i } = _n(),
    a = t.id === s;
  return (
    t.type === 'action'
      ? (n ?? (n = t.node))
      : (n ??
        (n = p.jsxs(p.Fragment, {
          children: [
            p.jsx('div', {
              className:
                'inline-flex items-center text-fd-muted-foreground text-xs empty:hidden',
              children: t.breadcrumbs?.map((c, l) =>
                p.jsxs(
                  m.Fragment,
                  {
                    children: [l > 0 && p.jsx(Yt, { className: 'size-4' }), c],
                  },
                  l,
                ),
              ),
            }),
            t.type !== 'page' &&
              p.jsx('div', {
                role: 'none',
                className: 'absolute start-3 inset-y-0 w-px bg-fd-border',
              }),
            p.jsxs('p', {
              className: E(
                'min-w-0 truncate',
                t.type !== 'page' && 'ps-4',
                t.type === 'page' || t.type === 'heading'
                  ? 'font-medium'
                  : 'text-fd-popover-foreground/80',
              ),
              children: [
                t.type === 'heading' &&
                  p.jsx(qt, {
                    className: 'inline me-1 size-4 text-fd-muted-foreground',
                  }),
                t.contentWithHighlights
                  ? r(t.contentWithHighlights)
                  : t.content,
              ],
            }),
          ],
        }))),
    p.jsx('button', {
      type: 'button',
      ref: m.useCallback(
        (c) => {
          a &&
            c &&
            _t(c, {
              scrollMode: 'if-needed',
              block: 'nearest',
              boundary: c.parentElement,
            });
        },
        [a],
      ),
      'aria-selected': a,
      className: E(
        'relative select-none px-2.5 py-2 text-start text-sm rounded-lg',
        a && 'bg-fd-accent text-fd-accent-foreground',
        e,
      ),
      onPointerMove: () => i(t.id),
      ...o,
      children: n,
    })
  );
}
function wn(t) {
  const { isLoading: e } = ee();
  return p.jsx(Gt, {
    ...t,
    className: E(
      'size-5 text-fd-muted-foreground',
      e && 'animate-pulse duration-400',
      t.className,
    ),
  });
}
const Tn = Kt(
  'rounded-md border px-2 py-0.5 text-xs font-medium text-fd-muted-foreground transition-colors',
  { variants: { active: { true: 'bg-fd-accent text-fd-accent-foreground' } } },
);
function Ao({ tag: t, onTagChange: e, allowClear: n = !1, ...r }) {
  return p.jsx('div', {
    ...r,
    className: E('flex items-center gap-1 flex-wrap', r.className),
    children: p.jsx(et.Provider, {
      value: m.useMemo(
        () => ({ value: t, onValueChange: e, allowClear: n }),
        [n, e, t],
      ),
      children: r.children,
    }),
  });
}
function _o({ value: t, className: e, ...n }) {
  const { onValueChange: r, value: o, allowClear: s } = An(),
    i = t === o;
  return p.jsx('button', {
    type: 'button',
    'data-active': i,
    className: E(Tn({ active: i, className: e })),
    onClick: () => {
      r(i && s ? void 0 : t);
    },
    tabIndex: -1,
    ...n,
    children: n.children,
  });
}
function vn(t) {
  return t.map((e, n) =>
    e.styles?.highlight
      ? p.jsx(
          'span',
          { className: 'text-fd-primary underline', children: e.content },
          n,
        )
      : p.jsx(m.Fragment, { children: e.content }, n),
  );
}
function ee() {
  const t = m.useContext(Xe);
  if (!t) throw new Error('Missing <SearchDialog />');
  return t;
}
function An() {
  const t = m.useContext(et);
  if (!t) throw new Error('Missing <TagsList />');
  return t;
}
function _n() {
  const t = m.useContext(Qe);
  if (!t) throw new Error('Missing <SearchDialogList />');
  return t;
}
function En(t, e = 1e3) {
  const [n, r] = m.useState(t);
  return (
    m.useEffect(() => {
      if (e === 0) return;
      const o = window.setTimeout(() => {
        r(t);
      }, e);
      return () => clearTimeout(o);
    }, [e, t]),
    e === 0 ? t : n
  );
}
function he(t, e) {
  if (Array.isArray(t) && Array.isArray(e))
    return e.length !== t.length || t.some((n, r) => he(n, e[r]));
  if (typeof t == 'object' && t && typeof e == 'object' && e) {
    const n = Object.keys(t),
      r = Object.keys(e);
    return n.length !== r.length || n.some((o) => he(t[o], e[o]));
  }
  return t !== e;
}
function xn(t) {
  const { delayMs: e = 100, allowEmpty: n = !1, ...r } = t,
    [o, s] = m.useState(''),
    [i, a] = m.useState('empty'),
    [c, l] = m.useState(),
    [f, u] = m.useState(!1),
    d = En(o, e),
    h = m.useRef(void 0);
  return (
    ze(
      [r, d],
      () => {
        (h.current && (h.current(), (h.current = void 0)), u(!0));
        let g = !1;
        h.current = () => {
          g = !0;
        };
        async function S() {
          if (d.length === 0 && !n) return 'empty';
          if (r.type === 'fetch') {
            const { fetchDocs: y } = await j(async () => {
              const { fetchDocs: I } =
                await import('./fetch-2XFMBLBA-F2YKbHTa.js');
              return { fetchDocs: I };
            }, []);
            return y(d, r);
          }
          if (r.type === 'algolia') {
            const { searchDocs: y } = await j(
              async () => {
                const { searchDocs: I } =
                  await import('./algolia-IZEDLPHE-2120h3C3.js');
                return { searchDocs: I };
              },
              __vite__mapDeps([4, 5]),
            );
            return y(d, r);
          }
          if (r.type === 'orama-cloud') {
            const { searchDocs: y } = await j(
              async () => {
                const { searchDocs: I } =
                  await import('./orama-cloud-WEGQE5A6-DSsy8tIc.js');
                return { searchDocs: I };
              },
              __vite__mapDeps([6, 7, 5]),
            );
            return y(d, r);
          }
          if (r.type === 'static') {
            const { search: y } = await j(
              async () => {
                const { search: I } =
                  await import('./static-A2YJ5TXV-Ba_y029W.js');
                return { search: I };
              },
              __vite__mapDeps([8, 7, 5, 1, 2, 3]),
            );
            return y(d, r);
          }
          if (r.type === 'mixedbread') {
            const { search: y } = await j(async () => {
              const { search: I } =
                await import('./mixedbread-RAHDVXGJ-DWAJ-1Nh.js');
              return { search: I };
            }, []);
            return y(d, r);
          }
          throw new Error('unknown search client');
        }
        S()
          .then((y) => {
            g || (l(void 0), a(y));
          })
          .catch((y) => {
            l(y);
          })
          .finally(() => {
            u(!1);
          });
      },
      he,
    ),
    { search: o, setSearch: s, query: { isLoading: f, data: i, error: c } }
  );
}
const tt = {
    arabic: 'ar',
    armenian: 'am',
    bulgarian: 'bg',
    czech: 'cz',
    danish: 'dk',
    dutch: 'nl',
    english: 'en',
    finnish: 'fi',
    french: 'fr',
    german: 'de',
    greek: 'gr',
    hungarian: 'hu',
    indian: 'in',
    indonesian: 'id',
    irish: 'ie',
    italian: 'it',
    lithuanian: 'lt',
    nepali: 'np',
    norwegian: 'no',
    portuguese: 'pt',
    romanian: 'ro',
    russian: 'ru',
    serbian: 'rs',
    slovenian: 'ru',
    spanish: 'es',
    swedish: 'se',
    tamil: 'ta',
    turkish: 'tr',
    ukrainian: 'uk',
    sanskrit: 'sk',
  },
  Rn = {
    dutch: /[^A-Za-zàèéìòóù0-9_'-]+/gim,
    english: /[^A-Za-zàèéìòóù0-9_'-]+/gim,
    french: /[^a-z0-9äâàéèëêïîöôùüûœç-]+/gim,
    italian: /[^A-Za-zàèéìòóù0-9_'-]+/gim,
    norwegian: /[^a-z0-9_æøåÆØÅäÄöÖüÜ]+/gim,
    portuguese: /[^a-z0-9à-úÀ-Ú]/gim,
    russian: /[^a-z0-9а-яА-ЯёЁ]+/gim,
    spanish: /[^a-z0-9A-Zá-úÁ-ÚñÑüÜ]+/gim,
    swedish: /[^a-z0-9_åÅäÄöÖüÜ-]+/gim,
    german: /[^a-z0-9A-ZäöüÄÖÜß]+/gim,
    finnish: /[^a-z0-9äöÄÖ]+/gim,
    danish: /[^a-z0-9æøåÆØÅ]+/gim,
    hungarian: /[^a-z0-9áéíóöőúüűÁÉÍÓÖŐÚÜŰ]+/gim,
    romanian: /[^a-z0-9ăâîșțĂÂÎȘȚ]+/gim,
    serbian: /[^a-z0-9čćžšđČĆŽŠĐ]+/gim,
    turkish: /[^a-z0-9çÇğĞıİöÖşŞüÜ]+/gim,
    lithuanian: /[^a-z0-9ąčęėįšųūžĄČĘĖĮŠŲŪŽ]+/gim,
    arabic: /[^a-z0-9أ-ي]+/gim,
    nepali: /[^a-z0-9अ-ह]+/gim,
    irish: /[^a-z0-9áéíóúÁÉÍÓÚ]+/gim,
    indian: /[^a-z0-9अ-ह]+/gim,
    armenian: /[^a-z0-9ա-ֆ]+/gim,
    greek: /[^a-z0-9α-ωά-ώ]+/gim,
    indonesian: /[^a-z0-9]+/gim,
    ukrainian: /[^a-z0-9а-яА-ЯіїєІЇЄ]+/gim,
    slovenian: /[^a-z0-9čžšČŽŠ]+/gim,
    bulgarian: /[^a-z0-9а-яА-Я]+/gim,
    tamil: /[^a-z0-9அ-ஹ]+/gim,
    sanskrit: /[^a-z0-9A-Zāīūṛḷṃṁḥśṣṭḍṇṅñḻḹṝ]+/gim,
    czech: /[^A-Z0-9a-zěščřžýáíéúůóťďĚŠČŘŽÝÁÍÉÓÚŮŤĎ-]+/gim,
  },
  Se = Object.keys(tt);
function Pn(t) {
  return t !== void 0 && Se.includes(t) ? tt[t] : void 0;
}
const Cn = Date.now().toString().slice(5);
let Mn = 0;
const De = BigInt(1e3),
  Ne = BigInt(1e6),
  Oe = BigInt(1e9),
  ue = 65535;
function kn(t, e) {
  if (e.length < ue) Array.prototype.push.apply(t, e);
  else {
    const n = e.length;
    for (let r = 0; r < n; r += ue)
      Array.prototype.push.apply(t, e.slice(r, r + ue));
  }
}
function Ln(t, ...e) {
  return t.replace(
    /%(?:(?<position>\d+)\$)?(?<width>-?\d*\.?\d*)(?<type>[dfs])/g,
    function (...n) {
      const r = n[n.length - 1],
        { width: o, type: s, position: i } = r,
        a = i ? e[Number.parseInt(i) - 1] : e.shift(),
        c = o === '' ? 0 : Number.parseInt(o);
      switch (s) {
        case 'd':
          return a.toString().padStart(c, '0');
        case 'f': {
          let l = a;
          const [f, u] = o.split('.').map((d) => Number.parseFloat(d));
          return (
            typeof u == 'number' && u >= 0 && (l = l.toFixed(u)),
            typeof f == 'number' && f >= 0
              ? l.toString().padStart(c, '0')
              : l.toString()
          );
        }
        case 's':
          return c < 0
            ? a.toString().padEnd(-c, ' ')
            : a.toString().padStart(c, ' ');
        default:
          return a;
      }
    },
  );
}
function zn() {
  return typeof WorkerGlobalScope < 'u' && self instanceof WorkerGlobalScope;
}
function Un() {
  return (
    typeof process < 'u' && process.release && process.release.name === 'node'
  );
}
function we() {
  return BigInt(Math.floor(performance.now() * 1e6));
}
function jn(t) {
  return (
    typeof t == 'number' && (t = BigInt(t)),
    t < De
      ? `${t}ns`
      : t < Ne
        ? `${t / De}μs`
        : t < Oe
          ? `${t / Ne}ms`
          : `${t / Oe}s`
  );
}
function Eo() {
  return zn()
    ? we()
    : Un() ||
        (typeof process < 'u' && typeof process?.hrtime?.bigint == 'function')
      ? process.hrtime.bigint()
      : typeof performance < 'u'
        ? we()
        : BigInt(0);
}
function nt() {
  return `${Cn}-${Mn++}`;
}
function fe(t, e) {
  return Object.hasOwn === void 0
    ? Object.prototype.hasOwnProperty.call(t, e)
      ? t[e]
      : void 0
    : Object.hasOwn(t, e)
      ? t[e]
      : void 0;
}
function xo(t, e) {
  return e[1] === t[1] ? t[0] - e[0] : e[1] - t[1];
}
function Ro(t) {
  if (t.length === 0) return [];
  if (t.length === 1) return t[0];
  for (let n = 1; n < t.length; n++)
    if (t[n].length < t[0].length) {
      const r = t[0];
      ((t[0] = t[n]), (t[n] = r));
    }
  const e = new Map();
  for (const n of t[0]) e.set(n, 1);
  for (let n = 1; n < t.length; n++) {
    let r = 0;
    for (const o of t[n]) {
      const s = e.get(o);
      s === n && (e.set(o, s + 1), r++);
    }
    if (r === 0) return [];
  }
  return t[0].filter((n) => {
    const r = e.get(n);
    return (r !== void 0 && e.set(n, 0), r === t.length);
  });
}
function rt(t, e) {
  const n = {},
    r = e.length;
  for (let o = 0; o < r; o++) {
    const s = e[o],
      i = s.split('.');
    let a = t;
    const c = i.length;
    for (let l = 0; l < c; l++)
      if (((a = a[i[l]]), typeof a == 'object')) {
        if (
          a !== null &&
          'lat' in a &&
          'lon' in a &&
          typeof a.lat == 'number' &&
          typeof a.lon == 'number'
        ) {
          a = n[s] = a;
          break;
        } else if (!Array.isArray(a) && a !== null && l === c - 1) {
          a = void 0;
          break;
        }
      } else if ((a === null || typeof a != 'object') && l < c - 1) {
        a = void 0;
        break;
      }
    typeof a < 'u' && (n[s] = a);
  }
  return n;
}
function Po(t, e) {
  return rt(t, [e])[e];
}
const Fn = { cm: 0.01, m: 1, km: 1e3, ft: 0.3048, yd: 0.9144, mi: 1609.344 };
function ot(t, e) {
  const n = Fn[e];
  if (n === void 0) throw new Error(N('INVALID_DISTANCE_SUFFIX', t).message);
  return t * n;
}
function Co(t, e) {
  t.hits = t.hits.map((n) => ({
    ...n,
    document: {
      ...n.document,
      ...e.reduce((r, o) => {
        const s = o.split('.'),
          i = s.pop();
        let a = r;
        for (const c of s) ((a[c] = a[c] ?? {}), (a = a[c]));
        return ((a[i] = null), r);
      }, n.document),
    },
  }));
}
function te(t) {
  return Array.isArray(t)
    ? t.some((e) => te(e))
    : t?.constructor?.name === 'AsyncFunction';
}
const Te = 'intersection' in new Set();
function ve(...t) {
  if (t.length === 0) return new Set();
  if (t.length === 1) return t[0];
  if (t.length === 2) {
    const r = t[0],
      o = t[1];
    if (Te) return r.intersection(o);
    const s = new Set(),
      i = r.size < o.size ? r : o,
      a = i === r ? o : r;
    for (const c of i) a.has(c) && s.add(c);
    return s;
  }
  const e = { index: 0, size: t[0].size };
  for (let r = 1; r < t.length; r++)
    t[r].size < e.size && ((e.index = r), (e.size = t[r].size));
  if (Te) {
    let r = t[e.index];
    for (let o = 0; o < t.length; o++)
      o !== e.index && (r = r.intersection(t[o]));
    return r;
  }
  const n = t[e.index];
  for (let r = 0; r < t.length; r++) {
    if (r === e.index) continue;
    const o = t[r];
    for (const s of n) o.has(s) || n.delete(s);
  }
  return n;
}
const Bn = 'union' in new Set();
function K(t, e) {
  return Bn ? (t ? t.union(e) : e) : t ? new Set([...t, ...e]) : new Set(e);
}
function Wn(t, e) {
  const n = new Set();
  for (const r of t) e.has(r) || n.add(r);
  return n;
}
const Vn = Se.join(`
 - `),
  $n = {
    NO_LANGUAGE_WITH_CUSTOM_TOKENIZER:
      'Do not pass the language option to create when using a custom tokenizer.',
    LANGUAGE_NOT_SUPPORTED: `Language "%s" is not supported.
Supported languages are:
 - ${Vn}`,
    INVALID_STEMMER_FUNCTION_TYPE:
      'config.stemmer property must be a function.',
    MISSING_STEMMER:
      'As of version 1.0.0 @orama/orama does not ship non English stemmers by default. To solve this, please explicitly import and specify the "%s" stemmer from the package @orama/stemmers. See https://docs.orama.com/docs/orama-js/text-analysis/stemming for more information.',
    CUSTOM_STOP_WORDS_MUST_BE_FUNCTION_OR_ARRAY:
      'Custom stop words array must only contain strings.',
    UNSUPPORTED_COMPONENT: 'Unsupported component "%s".',
    COMPONENT_MUST_BE_FUNCTION: 'The component "%s" must be a function.',
    COMPONENT_MUST_BE_FUNCTION_OR_ARRAY_FUNCTIONS:
      'The component "%s" must be a function or an array of functions.',
    INVALID_SCHEMA_TYPE:
      'Unsupported schema type "%s" at "%s". Expected "string", "boolean" or "number" or array of them.',
    DOCUMENT_ID_MUST_BE_STRING:
      'Document id must be of type "string". Got "%s" instead.',
    DOCUMENT_ALREADY_EXISTS: 'A document with id "%s" already exists.',
    DOCUMENT_DOES_NOT_EXIST: 'A document with id "%s" does not exists.',
    MISSING_DOCUMENT_PROPERTY: 'Missing searchable property "%s".',
    INVALID_DOCUMENT_PROPERTY:
      'Invalid document property "%s": expected "%s", got "%s"',
    UNKNOWN_INDEX:
      'Invalid property name "%s". Expected a wildcard string ("*") or array containing one of the following properties: %s',
    INVALID_BOOST_VALUE:
      'Boost value must be a number greater than, or less than 0.',
    INVALID_FILTER_OPERATION:
      'You can only use one operation per filter, you requested %d.',
    SCHEMA_VALIDATION_FAILURE:
      'Cannot insert document due schema validation failure on "%s" property.',
    INVALID_SORT_SCHEMA_TYPE:
      'Unsupported sort schema type "%s" at "%s". Expected "string" or "number".',
    CANNOT_SORT_BY_ARRAY:
      'Cannot configure sort for "%s" because it is an array (%s).',
    UNABLE_TO_SORT_ON_UNKNOWN_FIELD:
      'Unable to sort on unknown field "%s". Allowed fields: %s',
    SORT_DISABLED:
      'Sort is disabled. Please read the documentation at https://docs.orama.com/docs/orama-js for more information.',
    UNKNOWN_GROUP_BY_PROPERTY: 'Unknown groupBy property "%s".',
    INVALID_GROUP_BY_PROPERTY:
      'Invalid groupBy property "%s". Allowed types: "%s", but given "%s".',
    UNKNOWN_FILTER_PROPERTY: 'Unknown filter property "%s".',
    UNKNOWN_VECTOR_PROPERTY:
      'Unknown vector property "%s". Make sure the property exists in the schema and is configured as a vector.',
    INVALID_VECTOR_SIZE:
      'Vector size must be a number greater than 0. Got "%s" instead.',
    INVALID_VECTOR_VALUE:
      'Vector value must be a number greater than 0. Got "%s" instead.',
    INVALID_INPUT_VECTOR: `Property "%s" was declared as a %s-dimensional vector, but got a %s-dimensional vector instead.
Input vectors must be of the size declared in the schema, as calculating similarity between vectors of different sizes can lead to unexpected results.`,
    WRONG_SEARCH_PROPERTY_TYPE:
      'Property "%s" is not searchable. Only "string" properties are searchable.',
    FACET_NOT_SUPPORTED: `Facet doens't support the type "%s".`,
    INVALID_DISTANCE_SUFFIX:
      'Invalid distance suffix "%s". Valid suffixes are: cm, m, km, mi, yd, ft.',
    INVALID_SEARCH_MODE:
      'Invalid search mode "%s". Valid modes are: "fulltext", "vector", "hybrid".',
    MISSING_VECTOR_AND_SECURE_PROXY:
      'No vector was provided and no secure proxy was configured. Please provide a vector or configure an Orama Secure Proxy to perform hybrid search.',
    MISSING_TERM:
      '"term" is a required parameter when performing hybrid search. Please provide a search term.',
    INVALID_VECTOR_INPUT:
      'Invalid "vector" property. Expected an object with "value" and "property" properties, but got "%s" instead.',
    PLUGIN_CRASHED:
      'A plugin crashed during initialization. Please check the error message for more information:',
    PLUGIN_SECURE_PROXY_NOT_FOUND: `Could not find '@orama/secure-proxy-plugin' installed in your Orama instance.
Please install it before proceeding with creating an answer session.
Read more at https://docs.orama.com/docs/orama-js/plugins/plugin-secure-proxy#plugin-secure-proxy
`,
    PLUGIN_SECURE_PROXY_MISSING_CHAT_MODEL: `Could not find a chat model defined in the secure proxy plugin configuration.
Please provide a chat model before proceeding with creating an answer session.
Read more at https://docs.orama.com/docs/orama-js/plugins/plugin-secure-proxy#plugin-secure-proxy
`,
    ANSWER_SESSION_LAST_MESSAGE_IS_NOT_ASSISTANT:
      'The last message in the session is not an assistant message. Cannot regenerate non-assistant messages.',
    PLUGIN_COMPONENT_CONFLICT:
      'The component "%s" is already defined. The plugin "%s" is trying to redefine it.',
  };
function N(t, ...e) {
  const n = new Error(Ln($n[t] ?? `Unsupported Orama Error code: ${t}`, ...e));
  return (
    (n.code = t),
    'captureStackTrace' in Error.prototype && Error.captureStackTrace(n),
    n
  );
}
function Gn(t) {
  return { raw: Number(t), formatted: jn(t) };
}
function Jn(t) {
  if (t.id) {
    if (typeof t.id != 'string')
      throw N('DOCUMENT_ID_MUST_BE_STRING', typeof t.id);
    return t.id;
  }
  return nt();
}
function st(t, e) {
  for (const [n, r] of Object.entries(e)) {
    const o = t[n];
    if (
      !(typeof o > 'u') &&
      !(
        r === 'geopoint' &&
        typeof o == 'object' &&
        typeof o.lon == 'number' &&
        typeof o.lat == 'number'
      ) &&
      !(r === 'enum' && (typeof o == 'string' || typeof o == 'number'))
    ) {
      if (r === 'enum[]' && Array.isArray(o)) {
        const s = o.length;
        for (let i = 0; i < s; i++)
          if (typeof o[i] != 'string' && typeof o[i] != 'number')
            return n + '.' + i;
        continue;
      }
      if (G(r)) {
        const s = at(r);
        if (!Array.isArray(o) || o.length !== s)
          throw N('INVALID_INPUT_VECTOR', n, s, o.length);
        continue;
      }
      if (be(r)) {
        if (!Array.isArray(o)) return n;
        const s = it(r),
          i = o.length;
        for (let a = 0; a < i; a++) if (typeof o[a] !== s) return n + '.' + a;
        continue;
      }
      if (typeof r == 'object') {
        if (!o || typeof o != 'object') return n;
        const s = st(o, r);
        if (s) return n + '.' + s;
        continue;
      }
      if (typeof o !== r) return n;
    }
  }
}
const Hn = {
    string: !1,
    number: !1,
    boolean: !1,
    enum: !1,
    geopoint: !1,
    'string[]': !0,
    'number[]': !0,
    'boolean[]': !0,
    'enum[]': !0,
  },
  Kn = {
    'string[]': 'string',
    'number[]': 'number',
    'boolean[]': 'boolean',
    'enum[]': 'enum',
  };
function G(t) {
  return typeof t == 'string' && /^vector\[\d+\]$/.test(t);
}
function be(t) {
  return typeof t == 'string' && Hn[t];
}
function it(t) {
  return Kn[t];
}
function at(t) {
  const e = Number(t.slice(7, -1));
  switch (!0) {
    case isNaN(e):
      throw N('INVALID_VECTOR_VALUE', t);
    case e <= 0:
      throw N('INVALID_VECTOR_SIZE', t);
    default:
      return e;
  }
}
function Yn() {
  return { idToInternalId: new Map(), internalIdToId: [], save: qn, load: Zn };
}
function qn(t) {
  return { internalIdToId: t.internalIdToId };
}
function Zn(t, e) {
  const { internalIdToId: n } = e;
  (t.internalDocumentIDStore.idToInternalId.clear(),
    (t.internalDocumentIDStore.internalIdToId = []));
  const r = n.length;
  for (let o = 0; o < r; o++) {
    const s = n[o];
    (t.internalDocumentIDStore.idToInternalId.set(s, o + 1),
      t.internalDocumentIDStore.internalIdToId.push(s));
  }
}
function R(t, e) {
  if (typeof e == 'string') {
    const n = t.idToInternalId.get(e);
    if (n) return n;
    const r = t.idToInternalId.size + 1;
    return (t.idToInternalId.set(e, r), t.internalIdToId.push(e), r);
  }
  return e > t.internalIdToId.length ? R(t, e.toString()) : e;
}
function Mo(t, e) {
  if (t.internalIdToId.length < e) throw new Error(`Invalid internalId ${e}`);
  return t.internalIdToId[e - 1];
}
function Xn(t, e) {
  return { sharedInternalDocumentStore: e, docs: {}, count: 0 };
}
function Qn(t, e) {
  const n = R(t.sharedInternalDocumentStore, e);
  return t.docs[n];
}
function er(t, e) {
  const n = e.length,
    r = Array.from({ length: n });
  for (let o = 0; o < n; o++) {
    const s = R(t.sharedInternalDocumentStore, e[o]);
    r[o] = t.docs[s];
  }
  return r;
}
function tr(t) {
  return t.docs;
}
function nr(t, e, n, r) {
  return typeof t.docs[n] < 'u' ? !1 : ((t.docs[n] = r), t.count++, !0);
}
function rr(t, e) {
  const n = R(t.sharedInternalDocumentStore, e);
  return typeof t.docs[n] > 'u' ? !1 : (delete t.docs[n], t.count--, !0);
}
function or(t) {
  return t.count;
}
function sr(t, e) {
  const n = e;
  return { docs: n.docs, count: n.count, sharedInternalDocumentStore: t };
}
function ir(t) {
  return { docs: t.docs, count: t.count };
}
function ar() {
  return {
    create: Xn,
    get: Qn,
    getMultiple: er,
    getAll: tr,
    store: nr,
    remove: rr,
    count: or,
    load: sr,
    save: ir,
  };
}
const cr = [
  'beforeInsert',
  'afterInsert',
  'beforeRemove',
  'afterRemove',
  'beforeUpdate',
  'afterUpdate',
  'beforeUpsert',
  'afterUpsert',
  'beforeSearch',
  'afterSearch',
  'beforeInsertMultiple',
  'afterInsertMultiple',
  'beforeRemoveMultiple',
  'afterRemoveMultiple',
  'beforeUpdateMultiple',
  'afterUpdateMultiple',
  'beforeUpsertMultiple',
  'afterUpsertMultiple',
  'beforeLoad',
  'afterLoad',
  'afterCreate',
];
function lr(t, e) {
  const n = [],
    r = t.plugins?.length;
  if (!r) return n;
  for (let o = 0; o < r; o++)
    try {
      const s = t.plugins[o];
      typeof s[e] == 'function' && n.push(s[e]);
    } catch (s) {
      throw (
        console.error('Caught error in getAllPluginsByHook:', s),
        N('PLUGIN_CRASHED')
      );
    }
  return n;
}
const ur = ['tokenizer', 'index', 'documentsStore', 'sorter', 'pinning'],
  Ae = [
    'validateSchema',
    'getDocumentIndexId',
    'getDocumentProperties',
    'formatElapsedTime',
  ];
function ko(t, e, n, r, o) {
  if (t.some(te))
    return (async () => {
      for (const i of t) await i(e, n, r, o);
    })();
  for (const i of t) i(e, n, r, o);
}
function Lo(t, e, n, r) {
  if (t.some(te))
    return (async () => {
      for (const s of t) await s(e, n, r);
    })();
  for (const s of t) s(e, n, r);
}
function fr(t, e) {
  if (t.some(te))
    return (async () => {
      for (const r of t) await r(e);
    })();
  for (const r of t) r(e);
}
class v {
  k;
  v;
  l = null;
  r = null;
  h = 1;
  constructor(e, n) {
    ((this.k = e), (this.v = new Set(n)));
  }
  updateHeight() {
    this.h = Math.max(v.getHeight(this.l), v.getHeight(this.r)) + 1;
  }
  static getHeight(e) {
    return e ? e.h : 0;
  }
  getBalanceFactor() {
    return v.getHeight(this.l) - v.getHeight(this.r);
  }
  rotateLeft() {
    const e = this.r;
    return (
      (this.r = e.l),
      (e.l = this),
      this.updateHeight(),
      e.updateHeight(),
      e
    );
  }
  rotateRight() {
    const e = this.l;
    return (
      (this.l = e.r),
      (e.r = this),
      this.updateHeight(),
      e.updateHeight(),
      e
    );
  }
  toJSON() {
    return {
      k: this.k,
      v: Array.from(this.v),
      l: this.l ? this.l.toJSON() : null,
      r: this.r ? this.r.toJSON() : null,
      h: this.h,
    };
  }
  static fromJSON(e) {
    const n = new v(e.k, e.v);
    return (
      (n.l = e.l ? v.fromJSON(e.l) : null),
      (n.r = e.r ? v.fromJSON(e.r) : null),
      (n.h = e.h),
      n
    );
  }
}
class ne {
  root = null;
  insertCount = 0;
  constructor(e, n) {
    e !== void 0 && n !== void 0 && (this.root = new v(e, n));
  }
  insert(e, n, r = 1e3) {
    this.root = this.insertNode(this.root, e, n, r);
  }
  insertMultiple(e, n, r = 1e3) {
    for (const o of n) this.insert(e, o, r);
  }
  rebalance() {
    this.root && (this.root = this.rebalanceNode(this.root));
  }
  toJSON() {
    return {
      root: this.root ? this.root.toJSON() : null,
      insertCount: this.insertCount,
    };
  }
  static fromJSON(e) {
    const n = new ne();
    return (
      (n.root = e.root ? v.fromJSON(e.root) : null),
      (n.insertCount = e.insertCount || 0),
      n
    );
  }
  insertNode(e, n, r, o) {
    if (e === null) return new v(n, [r]);
    const s = [];
    let i = e,
      a = null;
    for (; i !== null; )
      if ((s.push({ parent: a, node: i }), n < i.k))
        if (i.l === null) {
          ((i.l = new v(n, [r])), s.push({ parent: i, node: i.l }));
          break;
        } else ((a = i), (i = i.l));
      else if (n > i.k)
        if (i.r === null) {
          ((i.r = new v(n, [r])), s.push({ parent: i, node: i.r }));
          break;
        } else ((a = i), (i = i.r));
      else return (i.v.add(r), e);
    let c = !1;
    this.insertCount++ % o === 0 && (c = !0);
    for (let l = s.length - 1; l >= 0; l--) {
      const { parent: f, node: u } = s[l];
      if ((u.updateHeight(), c)) {
        const d = this.rebalanceNode(u);
        f ? (f.l === u ? (f.l = d) : f.r === u && (f.r = d)) : (e = d);
      }
    }
    return e;
  }
  rebalanceNode(e) {
    const n = e.getBalanceFactor();
    if (n > 1) {
      if (e.l && e.l.getBalanceFactor() >= 0) return e.rotateRight();
      if (e.l) return ((e.l = e.l.rotateLeft()), e.rotateRight());
    }
    if (n < -1) {
      if (e.r && e.r.getBalanceFactor() <= 0) return e.rotateLeft();
      if (e.r) return ((e.r = e.r.rotateRight()), e.rotateLeft());
    }
    return e;
  }
  find(e) {
    const n = this.findNodeByKey(e);
    return n ? n.v : null;
  }
  contains(e) {
    return this.find(e) !== null;
  }
  getSize() {
    let e = 0;
    const n = [];
    let r = this.root;
    for (; r || n.length > 0; ) {
      for (; r; ) (n.push(r), (r = r.l));
      ((r = n.pop()), e++, (r = r.r));
    }
    return e;
  }
  isBalanced() {
    if (!this.root) return !0;
    const e = [this.root];
    for (; e.length > 0; ) {
      const n = e.pop(),
        r = n.getBalanceFactor();
      if (Math.abs(r) > 1) return !1;
      (n.l && e.push(n.l), n.r && e.push(n.r));
    }
    return !0;
  }
  remove(e) {
    this.root = this.removeNode(this.root, e);
  }
  removeDocument(e, n) {
    const r = this.findNodeByKey(e);
    r &&
      (r.v.size === 1
        ? (this.root = this.removeNode(this.root, e))
        : (r.v = new Set([...r.v.values()].filter((o) => o !== n))));
  }
  findNodeByKey(e) {
    let n = this.root;
    for (; n; )
      if (e < n.k) n = n.l;
      else if (e > n.k) n = n.r;
      else return n;
    return null;
  }
  removeNode(e, n) {
    if (e === null) return null;
    const r = [];
    let o = e;
    for (; o !== null && o.k !== n; )
      (r.push(o), n < o.k ? (o = o.l) : (o = o.r));
    if (o === null) return e;
    if (o.l === null || o.r === null) {
      const s = o.l ? o.l : o.r;
      if (r.length === 0) e = s;
      else {
        const i = r[r.length - 1];
        i.l === o ? (i.l = s) : (i.r = s);
      }
    } else {
      let s = o,
        i = o.r;
      for (; i.l !== null; ) ((s = i), (i = i.l));
      ((o.k = i.k),
        (o.v = i.v),
        s.l === i ? (s.l = i.r) : (s.r = i.r),
        (o = s));
    }
    r.push(o);
    for (let s = r.length - 1; s >= 0; s--) {
      const i = r[s];
      i.updateHeight();
      const a = this.rebalanceNode(i);
      if (s > 0) {
        const c = r[s - 1];
        c.l === i ? (c.l = a) : c.r === i && (c.r = a);
      } else e = a;
    }
    return e;
  }
  rangeSearch(e, n) {
    const r = new Set(),
      o = [];
    let s = this.root;
    for (; s || o.length > 0; ) {
      for (; s; ) (o.push(s), (s = s.l));
      if (((s = o.pop()), s.k >= e && s.k <= n)) for (const i of s.v) r.add(i);
      if (s.k > n) break;
      s = s.r;
    }
    return r;
  }
  greaterThan(e, n = !1) {
    const r = new Set(),
      o = [];
    let s = this.root;
    for (; s || o.length > 0; ) {
      for (; s; ) (o.push(s), (s = s.r));
      if (((s = o.pop()), (n && s.k >= e) || (!n && s.k > e)))
        for (const i of s.v) r.add(i);
      else if (s.k <= e) break;
      s = s.l;
    }
    return r;
  }
  lessThan(e, n = !1) {
    const r = new Set(),
      o = [];
    let s = this.root;
    for (; s || o.length > 0; ) {
      for (; s; ) (o.push(s), (s = s.l));
      if (((s = o.pop()), (n && s.k <= e) || (!n && s.k < e)))
        for (const i of s.v) r.add(i);
      else if (s.k > e) break;
      s = s.r;
    }
    return r;
  }
}
class re {
  numberToDocumentId;
  constructor() {
    this.numberToDocumentId = new Map();
  }
  insert(e, n) {
    this.numberToDocumentId.has(e)
      ? this.numberToDocumentId.get(e).add(n)
      : this.numberToDocumentId.set(e, new Set([n]));
  }
  find(e) {
    const n = this.numberToDocumentId.get(e);
    return n ? Array.from(n) : null;
  }
  remove(e) {
    this.numberToDocumentId.delete(e);
  }
  removeDocument(e, n) {
    const r = this.numberToDocumentId.get(n);
    r && (r.delete(e), r.size === 0 && this.numberToDocumentId.delete(n));
  }
  contains(e) {
    return this.numberToDocumentId.has(e);
  }
  getSize() {
    let e = 0;
    for (const n of this.numberToDocumentId.values()) e += n.size;
    return e;
  }
  filter(e) {
    const n = Object.keys(e);
    if (n.length !== 1) throw new Error('Invalid operation');
    const r = n[0];
    switch (r) {
      case 'eq': {
        const o = e[r],
          s = this.numberToDocumentId.get(o);
        return s ? Array.from(s) : [];
      }
      case 'in': {
        const o = e[r],
          s = new Set();
        for (const i of o) {
          const a = this.numberToDocumentId.get(i);
          if (a) for (const c of a) s.add(c);
        }
        return Array.from(s);
      }
      case 'nin': {
        const o = new Set(e[r]),
          s = new Set();
        for (const [i, a] of this.numberToDocumentId.entries())
          if (!o.has(i)) for (const c of a) s.add(c);
        return Array.from(s);
      }
      default:
        throw new Error('Invalid operation');
    }
  }
  filterArr(e) {
    const n = Object.keys(e);
    if (n.length !== 1) throw new Error('Invalid operation');
    const r = n[0];
    switch (r) {
      case 'containsAll': {
        const s = e[r].map((a) => this.numberToDocumentId.get(a) ?? new Set());
        if (s.length === 0) return [];
        const i = s.reduce((a, c) => new Set([...a].filter((l) => c.has(l))));
        return Array.from(i);
      }
      case 'containsAny': {
        const s = e[r].map((a) => this.numberToDocumentId.get(a) ?? new Set());
        if (s.length === 0) return [];
        const i = s.reduce((a, c) => new Set([...a, ...c]));
        return Array.from(i);
      }
      default:
        throw new Error('Invalid operation');
    }
  }
  static fromJSON(e) {
    if (!e.numberToDocumentId) throw new Error('Invalid Flat Tree JSON');
    const n = new re();
    for (const [r, o] of e.numberToDocumentId)
      n.numberToDocumentId.set(r, new Set(o));
    return n;
  }
  toJSON() {
    return {
      numberToDocumentId: Array.from(this.numberToDocumentId.entries()).map(
        ([e, n]) => [e, Array.from(n)],
      ),
    };
  }
}
function dr(t, e, n) {
  if (n < 0) return -1;
  if (t === e) return 0;
  const r = t.length,
    o = e.length;
  if (r === 0) return o <= n ? o : -1;
  if (o === 0) return r <= n ? r : -1;
  const s = Math.abs(r - o);
  if (t.startsWith(e)) return s <= n ? s : -1;
  if (e.startsWith(t)) return 0;
  if (s > n) return -1;
  const i = [];
  for (let a = 0; a <= r; a++) {
    i[a] = [a];
    for (let c = 1; c <= o; c++) i[a][c] = a === 0 ? c : 0;
  }
  for (let a = 1; a <= r; a++) {
    let c = 1 / 0;
    for (let l = 1; l <= o; l++)
      (t[a - 1] === e[l - 1]
        ? (i[a][l] = i[a - 1][l - 1])
        : (i[a][l] = Math.min(
            i[a - 1][l] + 1,
            i[a][l - 1] + 1,
            i[a - 1][l - 1] + 1,
          )),
        (c = Math.min(c, i[a][l])));
    if (c > n) return -1;
  }
  return i[r][o] <= n ? i[r][o] : -1;
}
function _e(t, e, n) {
  const r = dr(t, e, n);
  return { distance: r, isBounded: r >= 0 };
}
class M {
  k;
  s;
  c = new Map();
  d = new Set();
  e;
  w = '';
  constructor(e, n, r) {
    ((this.k = e), (this.s = n), (this.e = r));
  }
  updateParent(e) {
    this.w = e.w + this.s;
  }
  addDocument(e) {
    this.d.add(e);
  }
  removeDocument(e) {
    return this.d.delete(e);
  }
  findAllWords(e, n, r, o) {
    const s = [this];
    for (; s.length > 0; ) {
      const i = s.pop();
      if (i.e) {
        const { w: a, d: c } = i;
        if (r && a !== n) continue;
        if (fe(e, a) !== null)
          if (o)
            if (Math.abs(n.length - a.length) <= o && _e(n, a, o).isBounded)
              e[a] = [];
            else continue;
          else e[a] = [];
        if (fe(e, a) != null && c.size > 0) {
          const l = e[a];
          for (const f of c) l.includes(f) || l.push(f);
        }
      }
      i.c.size > 0 && s.push(...i.c.values());
    }
    return e;
  }
  insert(e, n) {
    let r = this,
      o = 0;
    const s = e.length;
    for (; o < s; ) {
      const i = e[o],
        a = r.c.get(i);
      if (a) {
        const c = a.s,
          l = c.length;
        let f = 0;
        for (; f < l && o + f < s && c[f] === e[o + f]; ) f++;
        if (f === l) {
          if (((r = a), (o += f), o === s)) {
            (a.e || (a.e = !0), a.addDocument(n));
            return;
          }
          continue;
        }
        const u = c.slice(0, f),
          d = c.slice(f),
          h = e.slice(o + f),
          g = new M(u[0], u, !1);
        if (
          (r.c.set(u[0], g),
          g.updateParent(r),
          (a.s = d),
          (a.k = d[0]),
          g.c.set(d[0], a),
          a.updateParent(g),
          h)
        ) {
          const S = new M(h[0], h, !0);
          (S.addDocument(n), g.c.set(h[0], S), S.updateParent(g));
        } else ((g.e = !0), g.addDocument(n));
        return;
      } else {
        const c = new M(i, e.slice(o), !0);
        (c.addDocument(n), r.c.set(i, c), c.updateParent(r));
        return;
      }
    }
    (r.e || (r.e = !0), r.addDocument(n));
  }
  _findLevenshtein(e, n, r, o, s) {
    const i = [{ node: this, index: n, tolerance: r }];
    for (; i.length > 0; ) {
      const { node: a, index: c, tolerance: l } = i.pop();
      if (a.w.startsWith(e)) {
        a.findAllWords(s, e, !1, 0);
        continue;
      }
      if (l < 0) continue;
      if (a.e) {
        const { w: u, d } = a;
        if (
          u &&
          (_e(e, u, o).isBounded && (s[u] = []),
          fe(s, u) !== void 0 && d.size > 0)
        ) {
          const h = new Set(s[u]);
          for (const g of d) h.add(g);
          s[u] = Array.from(h);
        }
      }
      if (c >= e.length) continue;
      const f = e[c];
      if (a.c.has(f)) {
        const u = a.c.get(f);
        i.push({ node: u, index: c + 1, tolerance: l });
      }
      i.push({ node: a, index: c + 1, tolerance: l - 1 });
      for (const [u, d] of a.c)
        (i.push({ node: d, index: c, tolerance: l - 1 }),
          u !== f && i.push({ node: d, index: c + 1, tolerance: l - 1 }));
    }
  }
  find(e) {
    const { term: n, exact: r, tolerance: o } = e;
    if (o && !r) {
      const s = {};
      return (this._findLevenshtein(n, 0, o, o, s), s);
    } else {
      let s = this,
        i = 0;
      const a = n.length;
      for (; i < a; ) {
        const l = n[i],
          f = s.c.get(l);
        if (f) {
          const u = f.s,
            d = u.length;
          let h = 0;
          for (; h < d && i + h < a && u[h] === n[i + h]; ) h++;
          if (h === d) ((s = f), (i += h));
          else if (i + h === a)
            if (h === a - i) {
              if (r) return {};
              {
                const g = {};
                return (f.findAllWords(g, n, r, o), g);
              }
            } else return {};
          else return {};
        } else return {};
      }
      const c = {};
      return (s.findAllWords(c, n, r, o), c);
    }
  }
  contains(e) {
    let n = this,
      r = 0;
    const o = e.length;
    for (; r < o; ) {
      const s = e[r],
        i = n.c.get(s);
      if (i) {
        const a = i.s,
          c = a.length;
        let l = 0;
        for (; l < c && r + l < o && a[l] === e[r + l]; ) l++;
        if (l < c) return !1;
        ((r += c), (n = i));
      } else return !1;
    }
    return !0;
  }
  removeWord(e) {
    if (!e) return !1;
    let n = this;
    const r = e.length,
      o = [];
    for (let s = 0; s < r; s++) {
      const i = e[s];
      if (n.c.has(i)) {
        const a = n.c.get(i);
        (o.push({ parent: n, character: i }), (s += a.s.length - 1), (n = a));
      } else return !1;
    }
    for (
      n.d.clear(), n.e = !1;
      o.length > 0 && n.c.size === 0 && !n.e && n.d.size === 0;
    ) {
      const { parent: s, character: i } = o.pop();
      (s.c.delete(i), (n = s));
    }
    return !0;
  }
  removeDocumentByWord(e, n, r = !0) {
    if (!e) return !0;
    let o = this;
    const s = e.length;
    for (let i = 0; i < s; i++) {
      const a = e[i];
      if (o.c.has(a)) {
        const c = o.c.get(a);
        ((i += c.s.length - 1),
          (o = c),
          (r && o.w !== e) || o.removeDocument(n));
      } else return !1;
    }
    return !0;
  }
  static getCommonPrefix(e, n) {
    const r = Math.min(e.length, n.length);
    let o = 0;
    for (; o < r && e.charCodeAt(o) === n.charCodeAt(o); ) o++;
    return e.slice(0, o);
  }
  toJSON() {
    return {
      w: this.w,
      s: this.s,
      e: this.e,
      k: this.k,
      d: Array.from(this.d),
      c: Array.from(this.c?.entries())?.map(([e, n]) => [e, n.toJSON()]),
    };
  }
  static fromJSON(e) {
    const n = new M(e.k, e.s, e.e);
    return (
      (n.w = e.w),
      (n.d = new Set(e.d)),
      (n.c = new Map(e?.c?.map(([r, o]) => [r, M.fromJSON(o)]) || [])),
      n
    );
  }
}
class oe extends M {
  constructor() {
    super('', '', !1);
  }
  static fromJSON(e) {
    const n = new oe();
    return (
      (n.w = e.w),
      (n.s = e.s),
      (n.e = e.e),
      (n.k = e.k),
      (n.d = new Set(e.d)),
      (n.c = new Map(e?.c?.map(([r, o]) => [r, M.fromJSON(o)]) || [])),
      n
    );
  }
  toJSON() {
    return super.toJSON();
  }
}
const hr = 2,
  pr = 6371e3;
class F {
  point;
  docIDs;
  left;
  right;
  parent;
  constructor(e, n) {
    ((this.point = e),
      (this.docIDs = new Set(n)),
      (this.left = null),
      (this.right = null),
      (this.parent = null));
  }
  toJSON() {
    return {
      point: this.point,
      docIDs: Array.from(this.docIDs),
      left: this.left ? this.left.toJSON() : null,
      right: this.right ? this.right.toJSON() : null,
    };
  }
  static fromJSON(e, n = null) {
    const r = new F(e.point, e.docIDs);
    return (
      (r.parent = n),
      e.left && (r.left = F.fromJSON(e.left, r)),
      e.right && (r.right = F.fromJSON(e.right, r)),
      r
    );
  }
}
class A {
  root;
  nodeMap;
  constructor() {
    ((this.root = null), (this.nodeMap = new Map()));
  }
  getPointKey(e) {
    return `${e.lon},${e.lat}`;
  }
  insert(e, n) {
    const r = this.getPointKey(e),
      o = this.nodeMap.get(r);
    if (o) {
      n.forEach((c) => o.docIDs.add(c));
      return;
    }
    const s = new F(e, n);
    if ((this.nodeMap.set(r, s), this.root == null)) {
      this.root = s;
      return;
    }
    let i = this.root,
      a = 0;
    for (;;) {
      if (a % hr === 0)
        if (e.lon < i.point.lon) {
          if (i.left == null) {
            ((i.left = s), (s.parent = i));
            return;
          }
          i = i.left;
        } else {
          if (i.right == null) {
            ((i.right = s), (s.parent = i));
            return;
          }
          i = i.right;
        }
      else if (e.lat < i.point.lat) {
        if (i.left == null) {
          ((i.left = s), (s.parent = i));
          return;
        }
        i = i.left;
      } else {
        if (i.right == null) {
          ((i.right = s), (s.parent = i));
          return;
        }
        i = i.right;
      }
      a++;
    }
  }
  contains(e) {
    const n = this.getPointKey(e);
    return this.nodeMap.has(n);
  }
  getDocIDsByCoordinates(e) {
    const n = this.getPointKey(e),
      r = this.nodeMap.get(n);
    return r ? Array.from(r.docIDs) : null;
  }
  removeDocByID(e, n) {
    const r = this.getPointKey(e),
      o = this.nodeMap.get(r);
    o &&
      (o.docIDs.delete(n),
      o.docIDs.size === 0 && (this.nodeMap.delete(r), this.deleteNode(o)));
  }
  deleteNode(e) {
    const n = e.parent,
      r = e.left ? e.left : e.right;
    (r && (r.parent = n),
      n
        ? n.left === e
          ? (n.left = r)
          : n.right === e && (n.right = r)
        : ((this.root = r), this.root && (this.root.parent = null)));
  }
  searchByRadius(e, n, r = !0, o = 'asc', s = !1) {
    const i = s ? A.vincentyDistance : A.haversineDistance,
      a = [{ node: this.root, depth: 0 }],
      c = [];
    for (; a.length > 0; ) {
      const { node: l, depth: f } = a.pop();
      if (l == null) continue;
      const u = i(e, l.point);
      ((r ? u <= n : u > n) &&
        c.push({ point: l.point, docIDs: Array.from(l.docIDs) }),
        l.left != null && a.push({ node: l.left, depth: f + 1 }),
        l.right != null && a.push({ node: l.right, depth: f + 1 }));
    }
    return (
      o &&
        c.sort((l, f) => {
          const u = i(e, l.point),
            d = i(e, f.point);
          return o.toLowerCase() === 'asc' ? u - d : d - u;
        }),
      c
    );
  }
  searchByPolygon(e, n = !0, r = null, o = !1) {
    const s = [{ node: this.root, depth: 0 }],
      i = [];
    for (; s.length > 0; ) {
      const { node: c, depth: l } = s.pop();
      if (c == null) continue;
      (c.left != null && s.push({ node: c.left, depth: l + 1 }),
        c.right != null && s.push({ node: c.right, depth: l + 1 }));
      const f = A.isPointInPolygon(e, c.point);
      ((f && n) || (!f && !n)) &&
        i.push({ point: c.point, docIDs: Array.from(c.docIDs) });
    }
    const a = A.calculatePolygonCentroid(e);
    if (r) {
      const c = o ? A.vincentyDistance : A.haversineDistance;
      i.sort((l, f) => {
        const u = c(a, l.point),
          d = c(a, f.point);
        return r.toLowerCase() === 'asc' ? u - d : d - u;
      });
    }
    return i;
  }
  toJSON() {
    return { root: this.root ? this.root.toJSON() : null };
  }
  static fromJSON(e) {
    const n = new A();
    return (
      e.root && ((n.root = F.fromJSON(e.root)), n.buildNodeMap(n.root)),
      n
    );
  }
  buildNodeMap(e) {
    if (e == null) return;
    const n = this.getPointKey(e.point);
    (this.nodeMap.set(n, e),
      e.left && this.buildNodeMap(e.left),
      e.right && this.buildNodeMap(e.right));
  }
  static calculatePolygonCentroid(e) {
    let n = 0,
      r = 0,
      o = 0;
    const s = e.length;
    for (let a = 0, c = s - 1; a < s; c = a++) {
      const l = e[a].lon,
        f = e[a].lat,
        u = e[c].lon,
        d = e[c].lat,
        h = l * d - u * f;
      ((n += h), (r += (l + u) * h), (o += (f + d) * h));
    }
    n /= 2;
    const i = 6 * n;
    return ((r /= i), (o /= i), { lon: r, lat: o });
  }
  static isPointInPolygon(e, n) {
    let r = !1;
    const o = n.lon,
      s = n.lat,
      i = e.length;
    for (let a = 0, c = i - 1; a < i; c = a++) {
      const l = e[a].lon,
        f = e[a].lat,
        u = e[c].lon,
        d = e[c].lat;
      f > s != d > s && o < ((u - l) * (s - f)) / (d - f) + l && (r = !r);
    }
    return r;
  }
  static haversineDistance(e, n) {
    const r = Math.PI / 180,
      o = e.lat * r,
      s = n.lat * r,
      i = (n.lat - e.lat) * r,
      a = (n.lon - e.lon) * r,
      c =
        Math.sin(i / 2) * Math.sin(i / 2) +
        Math.cos(o) * Math.cos(s) * Math.sin(a / 2) * Math.sin(a / 2),
      l = 2 * Math.atan2(Math.sqrt(c), Math.sqrt(1 - c));
    return pr * l;
  }
  static vincentyDistance(e, n) {
    const o = 0.0033528106647474805,
      s = (1 - o) * 6378137,
      i = Math.PI / 180,
      a = e.lat * i,
      c = n.lat * i,
      l = (n.lon - e.lon) * i,
      f = Math.atan((1 - o) * Math.tan(a)),
      u = Math.atan((1 - o) * Math.tan(c)),
      d = Math.sin(f),
      h = Math.cos(f),
      g = Math.sin(u),
      S = Math.cos(u);
    let y = l,
      I,
      D = 1e3,
      b,
      O,
      w,
      _,
      k,
      T;
    do {
      const U = Math.sin(y),
        B = Math.cos(y);
      if (
        ((b = Math.sqrt(
          S * U * (S * U) + (h * g - d * S * B) * (h * g - d * S * B),
        )),
        b === 0)
      )
        return 0;
      ((O = d * g + h * S * B),
        (w = Math.atan2(b, O)),
        (_ = (h * S * U) / b),
        (k = 1 - _ * _),
        (T = O - (2 * d * g) / k),
        isNaN(T) && (T = 0));
      const ce = (o / 16) * k * (4 + o * (4 - 3 * k));
      ((I = y),
        (y =
          l +
          (1 - ce) * o * _ * (w + ce * b * (T + ce * O * (-1 + 2 * T * T)))));
    } while (Math.abs(y - I) > 1e-12 && --D > 0);
    if (D === 0) return NaN;
    const x = (k * (6378137 * 6378137 - s * s)) / (s * s),
      J = 1 + (x / 16384) * (4096 + x * (-768 + x * (320 - 175 * x))),
      L = (x / 1024) * (256 + x * (-128 + x * (74 - 47 * x))),
      ae =
        L *
        b *
        (T +
          (L / 4) *
            (O * (-1 + 2 * T * T) -
              (L / 6) * T * (-3 + 4 * b * b) * (-3 + 4 * T * T)));
    return s * J * (w - ae);
  }
}
class se {
  true;
  false;
  constructor() {
    ((this.true = new Set()), (this.false = new Set()));
  }
  insert(e, n) {
    n ? this.true.add(e) : this.false.add(e);
  }
  delete(e, n) {
    n ? this.true.delete(e) : this.false.delete(e);
  }
  getSize() {
    return this.true.size + this.false.size;
  }
  toJSON() {
    return { true: Array.from(this.true), false: Array.from(this.false) };
  }
  static fromJSON(e) {
    const n = new se();
    return ((n.true = new Set(e.true)), (n.false = new Set(e.false)), n);
  }
}
function gr(t, e, n, r, o, { k: s, b: i, d: a }) {
  return (
    (Math.log(1 + (n - e + 0.5) / (e + 0.5)) * (a + t * (s + 1))) /
    (t + s * (1 - i + (i * r) / o))
  );
}
const zo = 0.8;
class ie {
  size;
  vectors = new Map();
  constructor(e) {
    this.size = e;
  }
  add(e, n) {
    n instanceof Float32Array || (n = new Float32Array(n));
    const r = ct(n, this.size);
    this.vectors.set(e, [r, n]);
  }
  remove(e) {
    this.vectors.delete(e);
  }
  find(e, n, r) {
    return (
      e instanceof Float32Array || (e = new Float32Array(e)),
      mr(e, r, this.vectors, this.size, n)
    );
  }
  toJSON() {
    const e = [];
    for (const [n, [r, o]] of this.vectors) e.push([n, [r, Array.from(o)]]);
    return { size: this.size, vectors: e };
  }
  static fromJSON(e) {
    const n = e,
      r = new ie(n.size);
    for (const [o, [s, i]] of n.vectors)
      r.vectors.set(o, [s, new Float32Array(i)]);
    return r;
  }
}
function ct(t, e) {
  let n = 0;
  for (let r = 0; r < e; r++) n += t[r] * t[r];
  return Math.sqrt(n);
}
function mr(t, e, n, r, o) {
  const s = ct(t, r),
    i = [],
    a = e || n.keys();
  for (const c of a) {
    const l = n.get(c);
    if (!l) continue;
    const f = l[0],
      u = l[1];
    let d = 0;
    for (let g = 0; g < r; g++) d += t[g] * u[g];
    const h = d / (s * f);
    h >= o && i.push([c, h]);
  }
  return i;
}
function yr(t, e, n, r, o) {
  const s = R(t.sharedInternalDocumentStore, n);
  ((t.avgFieldLength[e] =
    ((t.avgFieldLength[e] ?? 0) * (o - 1) + r.length) / o),
    (t.fieldLengths[e][s] = r.length),
    (t.frequencies[e][s] = {}));
}
function Sr(t, e, n, r, o) {
  let s = 0;
  for (const c of r) c === o && s++;
  const i = R(t.sharedInternalDocumentStore, n),
    a = s / r.length;
  ((t.frequencies[e][i][o] = a),
    o in t.tokenOccurrences[e] || (t.tokenOccurrences[e][o] = 0),
    (t.tokenOccurrences[e][o] = (t.tokenOccurrences[e][o] ?? 0) + 1));
}
function br(t, e, n, r) {
  const o = R(t.sharedInternalDocumentStore, n);
  (r > 1
    ? (t.avgFieldLength[e] =
        (t.avgFieldLength[e] * r - t.fieldLengths[e][o]) / (r - 1))
    : (t.avgFieldLength[e] = void 0),
    (t.fieldLengths[e][o] = void 0),
    (t.frequencies[e][o] = void 0));
}
function Ir(t, e, n) {
  t.tokenOccurrences[e][n]--;
}
function lt(t, e, n, r, o = '') {
  r ||
    (r = {
      sharedInternalDocumentStore: e,
      indexes: {},
      vectorIndexes: {},
      searchableProperties: [],
      searchablePropertiesWithTypes: {},
      frequencies: {},
      tokenOccurrences: {},
      avgFieldLength: {},
      fieldLengths: {},
    });
  for (const [s, i] of Object.entries(n)) {
    const a = `${o}${o ? '.' : ''}${s}`;
    if (typeof i == 'object' && !Array.isArray(i)) {
      lt(t, e, i, r, a);
      continue;
    }
    if (G(i))
      (r.searchableProperties.push(a),
        (r.searchablePropertiesWithTypes[a] = i),
        (r.vectorIndexes[a] = {
          type: 'Vector',
          node: new ie(at(i)),
          isArray: !1,
        }));
    else {
      const c = /\[/.test(i);
      switch (i) {
        case 'boolean':
        case 'boolean[]':
          r.indexes[a] = { type: 'Bool', node: new se(), isArray: c };
          break;
        case 'number':
        case 'number[]':
          r.indexes[a] = { type: 'AVL', node: new ne(0, []), isArray: c };
          break;
        case 'string':
        case 'string[]':
          ((r.indexes[a] = { type: 'Radix', node: new oe(), isArray: c }),
            (r.avgFieldLength[a] = 0),
            (r.frequencies[a] = {}),
            (r.tokenOccurrences[a] = {}),
            (r.fieldLengths[a] = {}));
          break;
        case 'enum':
        case 'enum[]':
          r.indexes[a] = { type: 'Flat', node: new re(), isArray: c };
          break;
        case 'geopoint':
          r.indexes[a] = { type: 'BKD', node: new A(), isArray: c };
          break;
        default:
          throw N('INVALID_SCHEMA_TYPE', Array.isArray(i) ? 'array' : i, a);
      }
      (r.searchableProperties.push(a),
        (r.searchablePropertiesWithTypes[a] = i));
    }
  }
  return r;
}
function Dr(t, e, n, r, o, s, i, a) {
  return (c) => {
    const { type: l, node: f } = e.indexes[n];
    switch (l) {
      case 'Bool': {
        f[c ? 'true' : 'false'].add(r);
        break;
      }
      case 'AVL': {
        const u = a?.avlRebalanceThreshold ?? 1;
        f.insert(c, r, u);
        break;
      }
      case 'Radix': {
        const u = s.tokenize(c, o, n, !1);
        t.insertDocumentScoreParameters(e, n, r, u, i);
        for (const d of u)
          (t.insertTokenScoreParameters(e, n, r, u, d), f.insert(d, r));
        break;
      }
      case 'Flat': {
        f.insert(c, r);
        break;
      }
      case 'BKD': {
        f.insert(c, [r]);
        break;
      }
    }
  };
}
function Nr(t, e, n, r, o, s, i, a, c, l, f) {
  if (G(i)) return Or(e, n, s, r, o);
  const u = Dr(t, e, n, o, a, c, l, f);
  if (!be(i)) return u(s);
  const d = s,
    h = d.length;
  for (let g = 0; g < h; g++) u(d[g]);
}
function Or(t, e, n, r, o) {
  t.vectorIndexes[e].node.add(o, n);
}
function Ee(t, e, n, r, o, s, i, a, c, l) {
  if (G(i)) return (e.vectorIndexes[n].node.remove(o), !0);
  const { type: f, node: u } = e.indexes[n];
  switch (f) {
    case 'AVL':
      return (u.removeDocument(s, o), !0);
    case 'Bool':
      return (u[s ? 'true' : 'false'].delete(o), !0);
    case 'Radix': {
      const d = c.tokenize(s, a, n);
      t.removeDocumentScoreParameters(e, n, r, l);
      for (const h of d)
        (t.removeTokenScoreParameters(e, n, h), u.removeDocumentByWord(h, o));
      return !0;
    }
    case 'Flat':
      return (u.removeDocument(o, s), !0);
    case 'BKD':
      return (u.removeDocByID(s, o), !1);
  }
}
function wr(t, e, n, r, o, s, i, a, c, l) {
  if (!be(i)) return Ee(t, e, n, r, o, s, i, a, c, l);
  const f = it(i),
    u = s,
    d = u.length;
  for (let h = 0; h < d; h++) Ee(t, e, n, r, o, u[h], f, a, c, l);
  return !0;
}
function ut(t, e, n, r, o, s, i, a, c, l) {
  const f = Array.from(r),
    u = t.avgFieldLength[e],
    d = t.fieldLengths[e],
    h = t.tokenOccurrences[e],
    g = t.frequencies[e],
    S = typeof h[n] == 'number' ? (h[n] ?? 0) : 0,
    y = f.length;
  for (let I = 0; I < y; I++) {
    const D = f[I];
    if (c && !c.has(D)) continue;
    l.has(D) || l.set(D, new Map());
    const b = l.get(D);
    b.set(e, (b.get(e) || 0) + 1);
    const O = g?.[D]?.[n] ?? 0,
      w = gr(O, S, o, d[D], u, s);
    i.has(D) ? i.set(D, i.get(D) + w * a) : i.set(D, w * a);
  }
}
function Tr(t, e, n, r, o, s, i, a, c, l, f, u = 0) {
  const d = n.tokenize(e, r),
    h = d.length || 1,
    g = new Map(),
    S = new Map(),
    y = new Map();
  for (const b of o) {
    if (!(b in t.indexes)) continue;
    const O = t.indexes[b],
      { type: w } = O;
    if (w !== 'Radix') throw N('WRONG_SEARCH_PROPERTY_TYPE', b);
    const _ = a[b] ?? 1;
    if (_ <= 0) throw N('INVALID_BOOST_VALUE', _);
    d.length === 0 && !e && d.push('');
    const k = d.length;
    for (let T = 0; T < k; T++) {
      const x = d[T],
        J = O.node.find({ term: x, exact: s, tolerance: i }),
        L = Object.keys(J);
      L.length > 0 && S.set(x, !0);
      const ae = L.length;
      for (let H = 0; H < ae; H++) {
        const U = L[H],
          B = J[U];
        ut(t, b, U, B, l, c, y, _, f, g);
      }
    }
  }
  const I = Array.from(y.entries())
    .map(([b, O]) => [b, O])
    .sort((b, O) => O[1] - b[1]);
  if (I.length === 0) return [];
  if (u === 1) return I;
  if (u === 0) {
    if (h === 1) return I;
    for (const O of d) if (!S.get(O)) return [];
    return I.filter(([O]) => {
      const w = g.get(O);
      return w ? Array.from(w.values()).some((_) => _ === h) : !1;
    });
  }
  const D = I.filter(([b]) => {
    const O = g.get(b);
    return O ? Array.from(O.values()).some((w) => w === h) : !1;
  });
  if (D.length > 0) {
    const b = I.filter(([w]) => !D.some(([_]) => _ === w)),
      O = Math.ceil(b.length * u);
    return [...D, ...b.slice(0, O)];
  }
  return I;
}
function q(t, e, n, r) {
  if ('and' in n && n.and && Array.isArray(n.and)) {
    const i = n.and;
    if (i.length === 0) return new Set();
    const a = i.map((c) => q(t, e, c, r));
    return ve(...a);
  }
  if ('or' in n && n.or && Array.isArray(n.or)) {
    const i = n.or;
    return i.length === 0
      ? new Set()
      : i.map((c) => q(t, e, c, r)).reduce((c, l) => K(c, l), new Set());
  }
  if ('not' in n && n.not) {
    const i = n.not,
      a = new Set(),
      c = t.sharedInternalDocumentStore;
    for (let f = 1; f <= c.internalIdToId.length; f++) a.add(f);
    const l = q(t, e, i, r);
    return Wn(a, l);
  }
  const o = Object.keys(n),
    s = o.reduce((i, a) => ({ [a]: new Set(), ...i }), {});
  for (const i of o) {
    const a = n[i];
    if (typeof t.indexes[i] > 'u') throw N('UNKNOWN_FILTER_PROPERTY', i);
    const { node: c, type: l, isArray: f } = t.indexes[i];
    if (l === 'Bool') {
      const d = c,
        h = a ? d.true : d.false;
      s[i] = K(s[i], h);
      continue;
    }
    if (l === 'BKD') {
      let d;
      if ('radius' in a) d = 'radius';
      else if ('polygon' in a) d = 'polygon';
      else throw new Error(`Invalid operation ${a}`);
      if (d === 'radius') {
        const {
            value: h,
            coordinates: g,
            unit: S = 'm',
            inside: y = !0,
            highPrecision: I = !1,
          } = a[d],
          D = ot(h, S),
          b = c.searchByRadius(g, D, y, void 0, I);
        s[i] = xe(s[i], b);
      } else {
        const { coordinates: h, inside: g = !0, highPrecision: S = !1 } = a[d],
          y = c.searchByPolygon(h, g, void 0, S);
        s[i] = xe(s[i], y);
      }
      continue;
    }
    if (l === 'Radix' && (typeof a == 'string' || Array.isArray(a))) {
      for (const d of [a].flat()) {
        const h = e.tokenize(d, r, i);
        for (const g of h) {
          const S = c.find({ term: g, exact: !0 });
          s[i] = Pr(s[i], S);
        }
      }
      continue;
    }
    const u = Object.keys(a);
    if (u.length > 1) throw N('INVALID_FILTER_OPERATION', u.length);
    if (l === 'Flat') {
      const d = new Set(f ? c.filterArr(a) : c.filter(a));
      s[i] = K(s[i], d);
      continue;
    }
    if (l === 'AVL') {
      const d = u[0],
        h = a[d];
      let g;
      switch (d) {
        case 'gt': {
          g = c.greaterThan(h, !1);
          break;
        }
        case 'gte': {
          g = c.greaterThan(h, !0);
          break;
        }
        case 'lt': {
          g = c.lessThan(h, !1);
          break;
        }
        case 'lte': {
          g = c.lessThan(h, !0);
          break;
        }
        case 'eq': {
          g = c.find(h) ?? new Set();
          break;
        }
        case 'between': {
          const [S, y] = h;
          g = c.rangeSearch(S, y);
          break;
        }
        default:
          throw N('INVALID_FILTER_OPERATION', d);
      }
      s[i] = K(s[i], g);
    }
  }
  return ve(...Object.values(s));
}
function vr(t) {
  return t.searchableProperties;
}
function Ar(t) {
  return t.searchablePropertiesWithTypes;
}
function _r(t, e) {
  const {
      indexes: n,
      vectorIndexes: r,
      searchableProperties: o,
      searchablePropertiesWithTypes: s,
      frequencies: i,
      tokenOccurrences: a,
      avgFieldLength: c,
      fieldLengths: l,
    } = e,
    f = {},
    u = {};
  for (const d of Object.keys(n)) {
    const { node: h, type: g, isArray: S } = n[d];
    switch (g) {
      case 'Radix':
        f[d] = { type: 'Radix', node: oe.fromJSON(h), isArray: S };
        break;
      case 'Flat':
        f[d] = { type: 'Flat', node: re.fromJSON(h), isArray: S };
        break;
      case 'AVL':
        f[d] = { type: 'AVL', node: ne.fromJSON(h), isArray: S };
        break;
      case 'BKD':
        f[d] = { type: 'BKD', node: A.fromJSON(h), isArray: S };
        break;
      case 'Bool':
        f[d] = { type: 'Bool', node: se.fromJSON(h), isArray: S };
        break;
      default:
        f[d] = n[d];
    }
  }
  for (const d of Object.keys(r))
    u[d] = { type: 'Vector', isArray: !1, node: ie.fromJSON(r[d]) };
  return {
    sharedInternalDocumentStore: t,
    indexes: f,
    vectorIndexes: u,
    searchableProperties: o,
    searchablePropertiesWithTypes: s,
    frequencies: i,
    tokenOccurrences: a,
    avgFieldLength: c,
    fieldLengths: l,
  };
}
function Er(t) {
  const {
      indexes: e,
      vectorIndexes: n,
      searchableProperties: r,
      searchablePropertiesWithTypes: o,
      frequencies: s,
      tokenOccurrences: i,
      avgFieldLength: a,
      fieldLengths: c,
    } = t,
    l = {};
  for (const u of Object.keys(n)) l[u] = n[u].node.toJSON();
  const f = {};
  for (const u of Object.keys(e)) {
    const { type: d, node: h, isArray: g } = e[u];
    d === 'Flat' || d === 'Radix' || d === 'AVL' || d === 'BKD' || d === 'Bool'
      ? (f[u] = { type: d, node: h.toJSON(), isArray: g })
      : ((f[u] = e[u]), (f[u].node = f[u].node.toJSON()));
  }
  return {
    indexes: f,
    vectorIndexes: l,
    searchableProperties: r,
    searchablePropertiesWithTypes: o,
    frequencies: s,
    tokenOccurrences: i,
    avgFieldLength: a,
    fieldLengths: c,
  };
}
function xr() {
  return {
    create: lt,
    insert: Nr,
    remove: wr,
    insertDocumentScoreParameters: yr,
    insertTokenScoreParameters: Sr,
    removeDocumentScoreParameters: br,
    removeTokenScoreParameters: Ir,
    calculateResultScores: ut,
    search: Tr,
    searchByWhereClause: q,
    getSearchableProperties: vr,
    getSearchablePropertiesWithTypes: Ar,
    load: _r,
    save: Er,
  };
}
function xe(t, e) {
  t || (t = new Set());
  const n = e.length;
  for (let r = 0; r < n; r++) {
    const o = e[r].docIDs,
      s = o.length;
    for (let i = 0; i < s; i++) t.add(o[i]);
  }
  return t;
}
function Re(t, e, n = !1) {
  const r = n ? A.vincentyDistance : A.haversineDistance,
    o = [],
    s = [];
  for (const { point: c } of t) s.push(r(e, c));
  const i = Math.max(...s);
  let a = 0;
  for (const { docIDs: c } of t) {
    const l = s[a],
      f = i - l + 1;
    for (const u of c) o.push([u, f]);
    a++;
  }
  return (o.sort((c, l) => l[1] - c[1]), o);
}
function Rr(t, e) {
  const n = Object.keys(t);
  if (n.length !== 1) return { isGeoOnly: !1 };
  const r = n[0],
    o = t[r];
  if (typeof e.indexes[r] > 'u') return { isGeoOnly: !1 };
  const { type: s } = e.indexes[r];
  return s === 'BKD' && o && ('radius' in o || 'polygon' in o)
    ? { isGeoOnly: !0, geoProperty: r, geoOperation: o }
    : { isGeoOnly: !1 };
}
function Uo(t, e) {
  const n = t,
    r = Rr(e, n);
  if (!r.isGeoOnly || !r.geoProperty || !r.geoOperation) return null;
  const { node: o } = n.indexes[r.geoProperty],
    s = r.geoOperation,
    i = o;
  let a;
  if ('radius' in s) {
    const {
        value: c,
        coordinates: l,
        unit: f = 'm',
        inside: u = !0,
        highPrecision: d = !1,
      } = s.radius,
      h = l,
      g = ot(c, f);
    return ((a = i.searchByRadius(h, g, u, 'asc', d)), Re(a, h, d));
  } else if ('polygon' in s) {
    const { coordinates: c, inside: l = !0, highPrecision: f = !1 } = s.polygon;
    a = i.searchByPolygon(c, l, 'asc', f);
    const u = A.calculatePolygonCentroid(c);
    return Re(a, u, f);
  }
  return null;
}
function Pr(t, e) {
  t || (t = new Set());
  const n = Object.keys(e),
    r = n.length;
  for (let o = 0; o < r; o++) {
    const s = e[n[o]],
      i = s.length;
    for (let a = 0; a < i; a++) t.add(s[a]);
  }
  return t;
}
function ft(t, e, n, r, o) {
  const s = {
    language: t.tokenizer.language,
    sharedInternalDocumentStore: e,
    enabled: !0,
    isSorted: !0,
    sortableProperties: [],
    sortablePropertiesWithTypes: {},
    sorts: {},
  };
  for (const [i, a] of Object.entries(n)) {
    const c = `${o}${o ? '.' : ''}${i}`;
    if (!r.includes(c)) {
      if (typeof a == 'object' && !Array.isArray(a)) {
        const l = ft(t, e, a, r, c);
        (kn(s.sortableProperties, l.sortableProperties),
          (s.sorts = { ...s.sorts, ...l.sorts }),
          (s.sortablePropertiesWithTypes = {
            ...s.sortablePropertiesWithTypes,
            ...l.sortablePropertiesWithTypes,
          }));
        continue;
      }
      if (!G(a))
        switch (a) {
          case 'boolean':
          case 'number':
          case 'string':
            (s.sortableProperties.push(c),
              (s.sortablePropertiesWithTypes[c] = a),
              (s.sorts[c] = {
                docs: new Map(),
                orderedDocsToRemove: new Map(),
                orderedDocs: [],
                type: a,
              }));
            break;
          case 'geopoint':
          case 'enum':
            continue;
          case 'enum[]':
          case 'boolean[]':
          case 'number[]':
          case 'string[]':
            continue;
          default:
            throw N(
              'INVALID_SORT_SCHEMA_TYPE',
              Array.isArray(a) ? 'array' : a,
              c,
            );
        }
    }
  }
  return s;
}
function Cr(t, e, n, r) {
  return r?.enabled !== !1
    ? ft(t, e, n, (r || {}).unsortableProperties || [], '')
    : { disabled: !0 };
}
function Mr(t, e, n, r) {
  if (!t.enabled) return;
  t.isSorted = !1;
  const o = R(t.sharedInternalDocumentStore, n),
    s = t.sorts[e];
  (s.orderedDocsToRemove.has(o) && Ie(t, e),
    s.docs.set(o, s.orderedDocs.length),
    s.orderedDocs.push([o, r]));
}
function dt(t) {
  if (t.isSorted || !t.enabled) return;
  const e = Object.keys(t.sorts);
  for (const n of e) Ur(t, n);
  t.isSorted = !0;
}
function kr(t, e, n) {
  return e[1].localeCompare(n[1], Pn(t));
}
function Lr(t, e) {
  return t[1] - e[1];
}
function zr(t, e) {
  return e[1] ? -1 : 1;
}
function Ur(t, e) {
  const n = t.sorts[e];
  let r;
  switch (n.type) {
    case 'string':
      r = kr.bind(null, t.language);
      break;
    case 'number':
      r = Lr.bind(null);
      break;
    case 'boolean':
      r = zr.bind(null);
      break;
  }
  n.orderedDocs.sort(r);
  const o = n.orderedDocs.length;
  for (let s = 0; s < o; s++) {
    const i = n.orderedDocs[s][0];
    n.docs.set(i, s);
  }
}
function jr(t) {
  const e = Object.keys(t.sorts);
  for (const n of e) Ie(t, n);
}
function Ie(t, e) {
  const n = t.sorts[e];
  n.orderedDocsToRemove.size &&
    ((n.orderedDocs = n.orderedDocs.filter(
      (r) => !n.orderedDocsToRemove.has(r[0]),
    )),
    n.orderedDocsToRemove.clear());
}
function Fr(t, e, n) {
  if (!t.enabled) return;
  const r = t.sorts[e],
    o = R(t.sharedInternalDocumentStore, n);
  r.docs.get(o) && (r.docs.delete(o), r.orderedDocsToRemove.set(o, !0));
}
function Br(t, e, n) {
  if (!t.enabled) throw N('SORT_DISABLED');
  const r = n.property,
    o = n.order === 'DESC',
    s = t.sorts[r];
  if (!s)
    throw N(
      'UNABLE_TO_SORT_ON_UNKNOWN_FIELD',
      r,
      t.sortableProperties.join(', '),
    );
  return (
    Ie(t, r),
    dt(t),
    e.sort((i, a) => {
      const c = s.docs.get(R(t.sharedInternalDocumentStore, i[0])),
        l = s.docs.get(R(t.sharedInternalDocumentStore, a[0])),
        f = typeof c < 'u',
        u = typeof l < 'u';
      return !f && !u ? 0 : f ? (u ? (o ? l - c : c - l) : -1) : 1;
    }),
    e
  );
}
function Wr(t) {
  return t.enabled ? t.sortableProperties : [];
}
function Vr(t) {
  return t.enabled ? t.sortablePropertiesWithTypes : {};
}
function $r(t, e) {
  const n = e;
  if (!n.enabled) return { enabled: !1 };
  const r = Object.keys(n.sorts).reduce((o, s) => {
    const { docs: i, orderedDocs: a, type: c } = n.sorts[s];
    return (
      (o[s] = {
        docs: new Map(Object.entries(i).map(([l, f]) => [+l, f])),
        orderedDocsToRemove: new Map(),
        orderedDocs: a,
        type: c,
      }),
      o
    );
  }, {});
  return {
    sharedInternalDocumentStore: t,
    language: n.language,
    sortableProperties: n.sortableProperties,
    sortablePropertiesWithTypes: n.sortablePropertiesWithTypes,
    sorts: r,
    enabled: !0,
    isSorted: n.isSorted,
  };
}
function Gr(t) {
  if (!t.enabled) return { enabled: !1 };
  (jr(t), dt(t));
  const e = Object.keys(t.sorts).reduce((n, r) => {
    const { docs: o, orderedDocs: s, type: i } = t.sorts[r];
    return (
      (n[r] = {
        docs: Object.fromEntries(o.entries()),
        orderedDocs: s,
        type: i,
      }),
      n
    );
  }, {});
  return {
    language: t.language,
    sortableProperties: t.sortableProperties,
    sortablePropertiesWithTypes: t.sortablePropertiesWithTypes,
    sorts: e,
    enabled: t.enabled,
    isSorted: t.isSorted,
  };
}
function Jr() {
  return {
    create: Cr,
    insert: Mr,
    remove: Fr,
    save: Gr,
    load: $r,
    sortBy: Br,
    getSortableProperties: Wr,
    getSortablePropertiesWithTypes: Vr,
  };
}
const Pe = 192,
  Hr = 383,
  Kr = [
    65,
    65,
    65,
    65,
    65,
    65,
    65,
    67,
    69,
    69,
    69,
    69,
    73,
    73,
    73,
    73,
    69,
    78,
    79,
    79,
    79,
    79,
    79,
    null,
    79,
    85,
    85,
    85,
    85,
    89,
    80,
    115,
    97,
    97,
    97,
    97,
    97,
    97,
    97,
    99,
    101,
    101,
    101,
    101,
    105,
    105,
    105,
    105,
    101,
    110,
    111,
    111,
    111,
    111,
    111,
    null,
    111,
    117,
    117,
    117,
    117,
    121,
    112,
    121,
    65,
    97,
    65,
    97,
    65,
    97,
    67,
    99,
    67,
    99,
    67,
    99,
    67,
    99,
    68,
    100,
    68,
    100,
    69,
    101,
    69,
    101,
    69,
    101,
    69,
    101,
    69,
    101,
    71,
    103,
    71,
    103,
    71,
    103,
    71,
    103,
    72,
    104,
    72,
    104,
    73,
    105,
    73,
    105,
    73,
    105,
    73,
    105,
    73,
    105,
    73,
    105,
    74,
    106,
    75,
    107,
    107,
    76,
    108,
    76,
    108,
    76,
    108,
    76,
    108,
    76,
    108,
    78,
    110,
    78,
    110,
    78,
    110,
    110,
    78,
    110,
    79,
    111,
    79,
    111,
    79,
    111,
    79,
    111,
    82,
    114,
    82,
    114,
    82,
    114,
    83,
    115,
    83,
    115,
    83,
    115,
    83,
    115,
    84,
    116,
    84,
    116,
    84,
    116,
    85,
    117,
    85,
    117,
    85,
    117,
    85,
    117,
    85,
    117,
    85,
    117,
    87,
    119,
    89,
    121,
    89,
    90,
    122,
    90,
    122,
    90,
    122,
    115,
  ];
function Yr(t) {
  return t < Pe || t > Hr ? t : Kr[t - Pe] || t;
}
function qr(t) {
  const e = [];
  for (let n = 0; n < t.length; n++) e[n] = Yr(t.charCodeAt(n));
  return String.fromCharCode(...e);
}
const Zr = {
    ational: 'ate',
    tional: 'tion',
    enci: 'ence',
    anci: 'ance',
    izer: 'ize',
    bli: 'ble',
    alli: 'al',
    entli: 'ent',
    eli: 'e',
    ousli: 'ous',
    ization: 'ize',
    ation: 'ate',
    ator: 'ate',
    alism: 'al',
    iveness: 'ive',
    fulness: 'ful',
    ousness: 'ous',
    aliti: 'al',
    iviti: 'ive',
    biliti: 'ble',
    logi: 'log',
  },
  Xr = {
    icate: 'ic',
    ative: '',
    alize: 'al',
    iciti: 'ic',
    ical: 'ic',
    ful: '',
    ness: '',
  },
  Qr = '[^aeiou]',
  X = '[aeiouy]',
  P = Qr + '[^aeiouy]*',
  V = X + '[aeiou]*',
  de = '^(' + P + ')?' + V + P,
  eo = '^(' + P + ')?' + V + P + '(' + V + ')?$',
  Y = '^(' + P + ')?' + V + P + V + P,
  Ce = '^(' + P + ')?' + X;
function to(t) {
  let e, n, r, o, s, i;
  if (t.length < 3) return t;
  const a = t.substring(0, 1);
  if (
    (a == 'y' && (t = a.toUpperCase() + t.substring(1)),
    (r = /^(.+?)(ss|i)es$/),
    (o = /^(.+?)([^s])s$/),
    r.test(t)
      ? (t = t.replace(r, '$1$2'))
      : o.test(t) && (t = t.replace(o, '$1$2')),
    (r = /^(.+?)eed$/),
    (o = /^(.+?)(ed|ing)$/),
    r.test(t))
  ) {
    const c = r.exec(t);
    ((r = new RegExp(de)),
      r.test(c[1]) && ((r = /.$/), (t = t.replace(r, ''))));
  } else
    o.test(t) &&
      ((e = o.exec(t)[1]),
      (o = new RegExp(Ce)),
      o.test(e) &&
        ((t = e),
        (o = /(at|bl|iz)$/),
        (s = new RegExp('([^aeiouylsz])\\1$')),
        (i = new RegExp('^' + P + X + '[^aeiouwxy]$')),
        o.test(t)
          ? (t = t + 'e')
          : s.test(t)
            ? ((r = /.$/), (t = t.replace(r, '')))
            : i.test(t) && (t = t + 'e')));
  if (
    ((r = /^(.+?)y$/),
    r.test(t) &&
      ((e = r.exec(t)?.[1]),
      (r = new RegExp(Ce)),
      e && r.test(e) && (t = e + 'i')),
    (r =
      /^(.+?)(ational|tional|enci|anci|izer|bli|alli|entli|eli|ousli|ization|ation|ator|alism|iveness|fulness|ousness|aliti|iviti|biliti|logi)$/),
    r.test(t))
  ) {
    const c = r.exec(t);
    ((e = c?.[1]),
      (n = c?.[2]),
      (r = new RegExp(de)),
      e && r.test(e) && (t = e + Zr[n]));
  }
  if (((r = /^(.+?)(icate|ative|alize|iciti|ical|ful|ness)$/), r.test(t))) {
    const c = r.exec(t);
    ((e = c?.[1]),
      (n = c?.[2]),
      (r = new RegExp(de)),
      e && r.test(e) && (t = e + Xr[n]));
  }
  if (
    ((r =
      /^(.+?)(al|ance|ence|er|ic|able|ible|ant|ement|ment|ent|ou|ism|ate|iti|ous|ive|ize)$/),
    (o = /^(.+?)(s|t)(ion)$/),
    r.test(t))
  )
    ((e = r.exec(t)?.[1]), (r = new RegExp(Y)), e && r.test(e) && (t = e));
  else if (o.test(t)) {
    const c = o.exec(t);
    ((e = c?.[1] ?? '' + c?.[2] ?? ''),
      (o = new RegExp(Y)),
      o.test(e) && (t = e));
  }
  return (
    (r = /^(.+?)e$/),
    r.test(t) &&
      ((e = r.exec(t)?.[1]),
      (r = new RegExp(Y)),
      (o = new RegExp(eo)),
      (s = new RegExp('^' + P + X + '[^aeiouwxy]$')),
      e && (r.test(e) || (o.test(e) && !s.test(e))) && (t = e)),
    (r = /ll$/),
    (o = new RegExp(Y)),
    r.test(t) && o.test(t) && ((r = /.$/), (t = t.replace(r, ''))),
    a == 'y' && (t = a.toLowerCase() + t.substring(1)),
    t
  );
}
function Me(t, e, n = !0) {
  const r = `${this.language}:${t}:${e}`;
  return n && this.normalizationCache.has(r)
    ? this.normalizationCache.get(r)
    : this.stopWords?.includes(e)
      ? (n && this.normalizationCache.set(r, ''), '')
      : (this.stemmer &&
          !this.stemmerSkipProperties.has(t) &&
          (e = this.stemmer(e)),
        (e = qr(e)),
        n && this.normalizationCache.set(r, e),
        e);
}
function no(t) {
  for (; t[t.length - 1] === ''; ) t.pop();
  for (; t[0] === ''; ) t.shift();
  return t;
}
function ke(t, e, n, r = !0) {
  if (e && e !== this.language) throw N('LANGUAGE_NOT_SUPPORTED', e);
  if (typeof t != 'string') return [t];
  const o = this.normalizeToken.bind(this, n ?? '');
  let s;
  if (n && this.tokenizeSkipProperties.has(n)) s = [o(t, r)];
  else {
    const a = Rn[this.language];
    s = t
      .toLowerCase()
      .split(a)
      .map((c) => o(c, r))
      .filter(Boolean);
  }
  const i = no(s);
  return this.allowDuplicates ? i : Array.from(new Set(i));
}
function Le(t = {}) {
  if (!t.language) t.language = 'english';
  else if (!Se.includes(t.language))
    throw N('LANGUAGE_NOT_SUPPORTED', t.language);
  let e;
  if (t.stemming || (t.stemmer && !('stemming' in t)))
    if (t.stemmer) {
      if (typeof t.stemmer != 'function')
        throw N('INVALID_STEMMER_FUNCTION_TYPE');
      e = t.stemmer;
    } else if (t.language === 'english') e = to;
    else throw N('MISSING_STEMMER', t.language);
  let n;
  if (t.stopWords !== !1) {
    if (((n = []), Array.isArray(t.stopWords))) n = t.stopWords;
    else if (typeof t.stopWords == 'function') n = t.stopWords(n);
    else if (t.stopWords)
      throw N('CUSTOM_STOP_WORDS_MUST_BE_FUNCTION_OR_ARRAY');
    if (!Array.isArray(n))
      throw N('CUSTOM_STOP_WORDS_MUST_BE_FUNCTION_OR_ARRAY');
    for (const o of n)
      if (typeof o != 'string')
        throw N('CUSTOM_STOP_WORDS_MUST_BE_FUNCTION_OR_ARRAY');
  }
  const r = {
    tokenize: ke,
    language: t.language,
    stemmer: e,
    stemmerSkipProperties: new Set(
      t.stemmerSkipProperties ? [t.stemmerSkipProperties].flat() : [],
    ),
    tokenizeSkipProperties: new Set(
      t.tokenizeSkipProperties ? [t.tokenizeSkipProperties].flat() : [],
    ),
    stopWords: n,
    allowDuplicates: !!t.allowDuplicates,
    normalizeToken: Me,
    normalizationCache: new Map(),
  };
  return ((r.tokenize = ke.bind(r)), (r.normalizeToken = Me), r);
}
function ro(t) {
  return { sharedInternalDocumentStore: t, rules: new Map() };
}
function oo(t, e) {
  if (t.rules.has(e.id))
    throw new Error(
      `PINNING_RULE_ALREADY_EXISTS: A pinning rule with id "${e.id}" already exists. Use updateRule to modify it.`,
    );
  t.rules.set(e.id, e);
}
function so(t, e) {
  if (!t.rules.has(e.id))
    throw new Error(
      `PINNING_RULE_NOT_FOUND: Cannot update pinning rule with id "${e.id}" because it does not exist. Use addRule to create it.`,
    );
  t.rules.set(e.id, e);
}
function io(t, e) {
  return t.rules.delete(e);
}
function ao(t, e) {
  return t.rules.get(e);
}
function co(t) {
  return Array.from(t.rules.values());
}
function lo(t, e) {
  const n = t.toLowerCase().trim(),
    r = e.pattern.toLowerCase().trim();
  switch (e.anchoring) {
    case 'is':
      return n === r;
    case 'starts_with':
      return n.startsWith(r);
    case 'contains':
      return n.includes(r);
    default:
      return !1;
  }
}
function uo(t, e) {
  return t ? e.conditions.every((n) => lo(t, n)) : !1;
}
function fo(t, e) {
  if (!e) return [];
  const n = [];
  for (const r of t.rules.values()) uo(e, r) && n.push(r);
  return n;
}
function ho(t, e) {
  const n = e;
  return { sharedInternalDocumentStore: t, rules: new Map(n?.rules ?? []) };
}
function po(t) {
  return { rules: Array.from(t.rules.entries()) };
}
function go() {
  return {
    create: ro,
    addRule: oo,
    updateRule: so,
    removeRule: io,
    getRule: ao,
    getAllRules: co,
    getMatchingRules: fo,
    load: ho,
    save: po,
  };
}
function mo(t) {
  const e = {
    formatElapsedTime: Gn,
    getDocumentIndexId: Jn,
    getDocumentProperties: rt,
    validateSchema: st,
  };
  for (const n of Ae) {
    const r = n;
    if (t[r]) {
      if (typeof t[r] != 'function') throw N('COMPONENT_MUST_BE_FUNCTION', r);
    } else t[r] = e[r];
  }
  for (const n of Object.keys(t))
    if (!ur.includes(n) && !Ae.includes(n)) throw N('UNSUPPORTED_COMPONENT', n);
}
function yo({
  schema: t,
  sort: e,
  language: n,
  components: r,
  id: o,
  plugins: s,
}) {
  r || (r = {});
  for (const D of s ?? []) {
    if (!('getComponents' in D) || typeof D.getComponents != 'function')
      continue;
    const b = D.getComponents(t),
      O = Object.keys(b);
    for (const w of O)
      if (r[w]) throw N('PLUGIN_COMPONENT_CONFLICT', w, D.name);
    r = { ...r, ...b };
  }
  o || (o = nt());
  let i = r.tokenizer,
    a = r.index,
    c = r.documentsStore,
    l = r.sorter,
    f = r.pinning;
  if (
    (i
      ? i.tokenize
        ? (i = i)
        : (i = Le(i))
      : (i = Le({ language: n ?? 'english' })),
    r.tokenizer && n)
  )
    throw N('NO_LANGUAGE_WITH_CUSTOM_TOKENIZER');
  const u = Yn();
  ((a ||= xr()), (l ||= Jr()), (c ||= ar()), (f ||= go()), mo(r));
  const {
      getDocumentProperties: d,
      getDocumentIndexId: h,
      validateSchema: g,
      formatElapsedTime: S,
    } = r,
    y = {
      data: {},
      caches: {},
      schema: t,
      tokenizer: i,
      index: a,
      sorter: l,
      documentsStore: c,
      pinning: f,
      internalDocumentIDStore: u,
      getDocumentProperties: d,
      getDocumentIndexId: h,
      validateSchema: g,
      beforeInsert: [],
      afterInsert: [],
      beforeRemove: [],
      afterRemove: [],
      beforeUpdate: [],
      afterUpdate: [],
      beforeUpsert: [],
      afterUpsert: [],
      beforeSearch: [],
      afterSearch: [],
      beforeInsertMultiple: [],
      afterInsertMultiple: [],
      beforeRemoveMultiple: [],
      afterRemoveMultiple: [],
      beforeUpdateMultiple: [],
      afterUpdateMultiple: [],
      beforeUpsertMultiple: [],
      afterUpsertMultiple: [],
      afterCreate: [],
      formatElapsedTime: S,
      id: o,
      plugins: s,
      version: So(),
    };
  y.data = {
    index: y.index.create(y, u, t),
    docs: y.documentsStore.create(y, u),
    sorting: y.sorter.create(y, u, t, e),
    pinning: y.pinning.create(u),
  };
  for (const D of cr) y[D] = (y[D] ?? []).concat(lr(y, D));
  const I = y.afterCreate;
  return (I && fr(I, y), y);
}
function So() {
  return '{{VERSION}}';
}
function bo() {
  return yo({ schema: { _: 'string' }, language: 'english' });
}
function Io(t) {
  const { locale: e } = ge(),
    {
      search: n,
      setSearch: r,
      query: o,
    } = xn({ type: 'static', initOrama: bo, locale: e });
  return p.jsxs(mn, {
    search: n,
    onSearchChange: r,
    isLoading: o.isLoading,
    ...t,
    children: [
      p.jsx(In, {}),
      p.jsxs(Dn, {
        children: [
          p.jsxs(yn, {
            children: [p.jsx(wn, {}), p.jsx(Sn, {}), p.jsx(bn, {})],
          }),
          p.jsx(Nn, { items: o.data !== 'empty' ? o.data : null }),
        ],
      }),
    ],
  });
}
const jo = () => [
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap',
  },
];
function Fo({ children: t }) {
  return p.jsxs('html', {
    lang: 'en',
    suppressHydrationWarning: !0,
    children: [
      p.jsxs('head', {
        children: [
          p.jsx('meta', { charSet: 'utf-8' }),
          p.jsx('meta', {
            name: 'viewport',
            content: 'width=device-width, initial-scale=1',
          }),
          p.jsx(It, {}),
          p.jsx(Dt, {}),
        ],
      }),
      p.jsxs('body', {
        className: 'flex flex-col min-h-screen',
        children: [
          p.jsx(nn, { search: { SearchDialog: Io }, children: t }),
          p.jsx(Nt, {}),
          p.jsx(Ot, {}),
        ],
      }),
    ],
  });
}
const Bo = St(function () {
    return p.jsx(wt, {});
  }),
  Wo = bt(function ({ error: e }) {
    let n = 'Oops!',
      r = 'An unexpected error occurred.',
      o;
    return (
      Tt(e) &&
        ((n = e.status === 404 ? '404' : 'Error'),
        (r =
          e.status === 404
            ? 'The requested page could not be found.'
            : e.statusText || r)),
      p.jsxs('main', {
        className: 'pt-16 p-4 container mx-auto',
        children: [
          p.jsx('h1', { children: n }),
          p.jsx('p', { children: r }),
          o,
        ],
      })
    );
  });
export {
  Bo as A,
  zo as D,
  Wo as E,
  Fo as L,
  mn as S,
  Ao as T,
  In as a,
  Dn as b,
  yn as c,
  wn as d,
  Sn as e,
  bn as f,
  Nn as g,
  vo as h,
  _o as i,
  Po as j,
  N as k,
  Mo as l,
  Ro as m,
  fo as n,
  R as o,
  Eo as p,
  ko as q,
  Lo as r,
  kn as s,
  xo as t,
  xn as u,
  Co as v,
  Uo as w,
  jn as x,
  yo as y,
  jo as z,
};
