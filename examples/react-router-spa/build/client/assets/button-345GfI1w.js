import { r as i, j as L, d as ze, R as gt, h as Gt } from './index-CT70PKhW.js';
var $t = (e, t, r, n, o, a, c, s) => {
    let l = document.documentElement,
      u = ['light', 'dark'];
    function d(g) {
      ((Array.isArray(e) ? e : [e]).forEach((k) => {
        let f = k === 'class',
          b = f && a ? o.map((x) => a[x] || x) : o;
        f
          ? (l.classList.remove(...b), l.classList.add(a && a[g] ? a[g] : g))
          : l.setAttribute(k, g);
      }),
        m(g));
    }
    function m(g) {
      s && u.includes(g) && (l.style.colorScheme = g);
    }
    function p() {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    }
    if (n) d(n);
    else
      try {
        let g = localStorage.getItem(t) || r,
          k = c && g === 'system' ? p() : g;
        d(k);
      } catch {}
  },
  Ye = ['light', 'dark'],
  yt = '(prefers-color-scheme: dark)',
  qt = typeof window > 'u',
  Ve = i.createContext(void 0),
  Kt = { setTheme: (e) => {}, themes: [] },
  uo = () => {
    var e;
    return (e = i.useContext(Ve)) != null ? e : Kt;
  },
  fo = (e) =>
    i.useContext(Ve)
      ? i.createElement(i.Fragment, null, e.children)
      : i.createElement(Yt, { ...e }),
  Xt = ['light', 'dark'],
  Yt = ({
    forcedTheme: e,
    disableTransitionOnChange: t = !1,
    enableSystem: r = !0,
    enableColorScheme: n = !0,
    storageKey: o = 'theme',
    themes: a = Xt,
    defaultTheme: c = r ? 'system' : 'light',
    attribute: s = 'data-theme',
    value: l,
    children: u,
    nonce: d,
    scriptProps: m,
  }) => {
    let [p, g] = i.useState(() => Qt(o, c)),
      [k, f] = i.useState(() => (p === 'system' ? Ee() : p)),
      b = l ? Object.values(l) : a,
      x = i.useCallback(
        (E) => {
          let R = E;
          if (!R) return;
          E === 'system' && r && (R = Ee());
          let C = l ? l[R] : R,
            y = t ? Jt(d) : null,
            T = document.documentElement,
            j = (W) => {
              W === 'class'
                ? (T.classList.remove(...b), C && T.classList.add(C))
                : W.startsWith('data-') &&
                  (C ? T.setAttribute(W, C) : T.removeAttribute(W));
            };
          if ((Array.isArray(s) ? s.forEach(j) : j(s), n)) {
            let W = Ye.includes(c) ? c : null,
              $ = Ye.includes(R) ? R : W;
            T.style.colorScheme = $;
          }
          y?.();
        },
        [d],
      ),
      M = i.useCallback(
        (E) => {
          let R = typeof E == 'function' ? E(p) : E;
          g(R);
          try {
            localStorage.setItem(o, R);
          } catch {}
        },
        [p],
      ),
      P = i.useCallback(
        (E) => {
          let R = Ee(E);
          (f(R), p === 'system' && r && !e && x('system'));
        },
        [p, e],
      );
    (i.useEffect(() => {
      let E = window.matchMedia(yt);
      return (E.addListener(P), P(E), () => E.removeListener(P));
    }, [P]),
      i.useEffect(() => {
        let E = (R) => {
          R.key === o && (R.newValue ? g(R.newValue) : M(c));
        };
        return (
          window.addEventListener('storage', E),
          () => window.removeEventListener('storage', E)
        );
      }, [M]),
      i.useEffect(() => {
        x(e ?? p);
      }, [e, p]));
    let N = i.useMemo(
      () => ({
        theme: p,
        setTheme: M,
        forcedTheme: e,
        resolvedTheme: p === 'system' ? k : p,
        themes: r ? [...a, 'system'] : a,
        systemTheme: r ? k : void 0,
      }),
      [p, M, e, k, r, a],
    );
    return i.createElement(
      Ve.Provider,
      { value: N },
      i.createElement(Zt, {
        forcedTheme: e,
        storageKey: o,
        attribute: s,
        enableSystem: r,
        enableColorScheme: n,
        defaultTheme: c,
        value: l,
        themes: a,
        nonce: d,
        scriptProps: m,
      }),
      u,
    );
  },
  Zt = i.memo(
    ({
      forcedTheme: e,
      storageKey: t,
      attribute: r,
      enableSystem: n,
      enableColorScheme: o,
      defaultTheme: a,
      value: c,
      themes: s,
      nonce: l,
      scriptProps: u,
    }) => {
      let d = JSON.stringify([r, t, a, e, s, c, n, o]).slice(1, -1);
      return i.createElement('script', {
        ...u,
        suppressHydrationWarning: !0,
        nonce: typeof window > 'u' ? l : '',
        dangerouslySetInnerHTML: { __html: `(${$t.toString()})(${d})` },
      });
    },
  ),
  Qt = (e, t) => {
    if (qt) return;
    let r;
    try {
      r = localStorage.getItem(e) || void 0;
    } catch {}
    return r || t;
  },
  Jt = (e) => {
    let t = document.createElement('style');
    return (
      e && t.setAttribute('nonce', e),
      t.appendChild(
        document.createTextNode(
          '*,*::before,*::after{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;-ms-transition:none!important;transition:none!important}',
        ),
      ),
      document.head.appendChild(t),
      () => {
        (window.getComputedStyle(document.body),
          setTimeout(() => {
            document.head.removeChild(t);
          }, 1));
      }
    );
  },
  Ee = (e) => (e || (e = window.matchMedia(yt)), e.matches ? 'dark' : 'light'),
  bt = i.createContext(void 0),
  mo = (e) => {
    const { dir: t, children: r } = e;
    return L.jsx(bt.Provider, { value: t, children: r });
  };
function po(e) {
  const t = i.useContext(bt);
  return e || t || 'ltr';
}
var Ce = () => {
    throw new Error(
      'You need to wrap your application inside `FrameworkProvider`.',
    );
  },
  ne = wt('FrameworkContext', {
    useParams: Ce,
    useRouter: Ce,
    usePathname: Ce,
  });
function ho({
  Link: e,
  useRouter: t,
  useParams: r,
  usePathname: n,
  Image: o,
  children: a,
}) {
  const c = ze.useMemo(
    () => ({ usePathname: n, useRouter: t, Link: e, Image: o, useParams: r }),
    [e, n, t, r, o],
  );
  return L.jsx(ne.Provider, { value: c, children: a });
}
function vo() {
  return ne.use().usePathname();
}
function go() {
  return ne.use().useRouter();
}
function yo(e) {
  const { Image: t } = ne.use();
  if (!t) {
    const { src: r, alt: n, priority: o, ...a } = e;
    return L.jsx('img', {
      alt: n,
      src: r,
      fetchPriority: o ? 'high' : 'auto',
      ...a,
    });
  }
  return L.jsx(t, { ...e });
}
function bo(e) {
  const { Link: t } = ne.use();
  if (!t) {
    const { href: r, prefetch: n, ...o } = e;
    return L.jsx('a', { href: r, ...o });
  }
  return L.jsx(t, { ...e });
}
function wt(e, t) {
  const r = ze.createContext(t);
  return {
    Provider: (n) =>
      L.jsx(r.Provider, { value: n.value, children: n.children }),
    use: (n) => {
      const o = ze.useContext(r);
      if (!o) throw new Error(n ?? `Provider of ${e} is required but missing.`);
      return o;
    },
  };
}
const kt = wt('SearchContext', {
  enabled: !1,
  hotKey: [],
  setOpenSearch: () => {},
});
function wo() {
  return kt.use();
}
function er() {
  const [e, t] = i.useState('⌘');
  return (
    i.useEffect(() => {
      window.navigator.userAgent.includes('Windows') && t('Ctrl');
    }, []),
    e
  );
}
function ko({
  SearchDialog: e,
  children: t,
  preload: r = !0,
  options: n,
  hotKey: o = [
    { key: (c) => c.metaKey || c.ctrlKey, display: L.jsx(er, {}) },
    { key: 'k', display: 'K' },
  ],
  links: a,
}) {
  const [c, s] = i.useState(r ? !1 : void 0);
  return (
    i.useEffect(() => {
      const l = (u) => {
        o.every((d) =>
          typeof d.key == 'string' ? u.key === d.key : d.key(u),
        ) && (s(!0), u.preventDefault());
      };
      return (
        window.addEventListener('keydown', l),
        () => {
          window.removeEventListener('keydown', l);
        }
      );
    }, [o]),
    L.jsxs(kt.Provider, {
      value: i.useMemo(
        () => ({ enabled: !0, hotKey: o, setOpenSearch: s }),
        [o],
      ),
      children: [
        c !== void 0 && L.jsx(e, { open: c, onOpenChange: s, links: a, ...n }),
        t,
      ],
    })
  );
}
const tr = {
    search: 'Search',
    searchNoResult: 'No results found',
    toc: 'On this page',
    tocNoHeadings: 'No Headings',
    lastUpdate: 'Last updated on',
    chooseLanguage: 'Choose a language',
    nextPage: 'Next Page',
    previousPage: 'Previous Page',
    chooseTheme: 'Theme',
    editOnGithub: 'Edit on GitHub',
  },
  rr = i.createContext({ text: tr });
function xo(e) {
  const { text: t } = nr();
  return t[e.label];
}
function nr() {
  return i.useContext(rr);
}
const Be = '-',
  or = (e) => {
    const t = sr(e),
      { conflictingClassGroups: r, conflictingClassGroupModifiers: n } = e;
    return {
      getClassGroupId: (c) => {
        const s = c.split(Be);
        return (s[0] === '' && s.length !== 1 && s.shift(), xt(s, t) || ar(c));
      },
      getConflictingClassGroupIds: (c, s) => {
        const l = r[c] || [];
        return s && n[c] ? [...l, ...n[c]] : l;
      },
    };
  },
  xt = (e, t) => {
    if (e.length === 0) return t.classGroupId;
    const r = e[0],
      n = t.nextPart.get(r),
      o = n ? xt(e.slice(1), n) : void 0;
    if (o) return o;
    if (t.validators.length === 0) return;
    const a = e.join(Be);
    return t.validators.find(({ validator: c }) => c(a))?.classGroupId;
  },
  Ze = /^\[(.+)\]$/,
  ar = (e) => {
    if (Ze.test(e)) {
      const t = Ze.exec(e)[1],
        r = t?.substring(0, t.indexOf(':'));
      if (r) return 'arbitrary..' + r;
    }
  },
  sr = (e) => {
    const { theme: t, classGroups: r } = e,
      n = { nextPart: new Map(), validators: [] };
    for (const o in r) Fe(r[o], n, o, t);
    return n;
  },
  Fe = (e, t, r, n) => {
    e.forEach((o) => {
      if (typeof o == 'string') {
        const a = o === '' ? t : Qe(t, o);
        a.classGroupId = r;
        return;
      }
      if (typeof o == 'function') {
        if (ir(o)) {
          Fe(o(n), t, r, n);
          return;
        }
        t.validators.push({ validator: o, classGroupId: r });
        return;
      }
      Object.entries(o).forEach(([a, c]) => {
        Fe(c, Qe(t, a), r, n);
      });
    });
  },
  Qe = (e, t) => {
    let r = e;
    return (
      t.split(Be).forEach((n) => {
        (r.nextPart.has(n) ||
          r.nextPart.set(n, { nextPart: new Map(), validators: [] }),
          (r = r.nextPart.get(n)));
      }),
      r
    );
  },
  ir = (e) => e.isThemeGetter,
  cr = (e) => {
    if (e < 1) return { get: () => {}, set: () => {} };
    let t = 0,
      r = new Map(),
      n = new Map();
    const o = (a, c) => {
      (r.set(a, c), t++, t > e && ((t = 0), (n = r), (r = new Map())));
    };
    return {
      get(a) {
        let c = r.get(a);
        if (c !== void 0) return c;
        if ((c = n.get(a)) !== void 0) return (o(a, c), c);
      },
      set(a, c) {
        r.has(a) ? r.set(a, c) : o(a, c);
      },
    };
  },
  De = '!',
  je = ':',
  lr = je.length,
  ur = (e) => {
    const { prefix: t, experimentalParseClassName: r } = e;
    let n = (o) => {
      const a = [];
      let c = 0,
        s = 0,
        l = 0,
        u;
      for (let k = 0; k < o.length; k++) {
        let f = o[k];
        if (c === 0 && s === 0) {
          if (f === je) {
            (a.push(o.slice(l, k)), (l = k + lr));
            continue;
          }
          if (f === '/') {
            u = k;
            continue;
          }
        }
        f === '[' ? c++ : f === ']' ? c-- : f === '(' ? s++ : f === ')' && s--;
      }
      const d = a.length === 0 ? o : o.substring(l),
        m = dr(d),
        p = m !== d,
        g = u && u > l ? u - l : void 0;
      return {
        modifiers: a,
        hasImportantModifier: p,
        baseClassName: m,
        maybePostfixModifierPosition: g,
      };
    };
    if (t) {
      const o = t + je,
        a = n;
      n = (c) =>
        c.startsWith(o)
          ? a(c.substring(o.length))
          : {
              isExternal: !0,
              modifiers: [],
              hasImportantModifier: !1,
              baseClassName: c,
              maybePostfixModifierPosition: void 0,
            };
    }
    if (r) {
      const o = n;
      n = (a) => r({ className: a, parseClassName: o });
    }
    return n;
  },
  dr = (e) =>
    e.endsWith(De)
      ? e.substring(0, e.length - 1)
      : e.startsWith(De)
        ? e.substring(1)
        : e,
  fr = (e) => {
    const t = Object.fromEntries(e.orderSensitiveModifiers.map((n) => [n, !0]));
    return (n) => {
      if (n.length <= 1) return n;
      const o = [];
      let a = [];
      return (
        n.forEach((c) => {
          c[0] === '[' || t[c] ? (o.push(...a.sort(), c), (a = [])) : a.push(c);
        }),
        o.push(...a.sort()),
        o
      );
    };
  },
  mr = (e) => ({
    cache: cr(e.cacheSize),
    parseClassName: ur(e),
    sortModifiers: fr(e),
    ...or(e),
  }),
  pr = /\s+/,
  hr = (e, t) => {
    const {
        parseClassName: r,
        getClassGroupId: n,
        getConflictingClassGroupIds: o,
        sortModifiers: a,
      } = t,
      c = [],
      s = e.trim().split(pr);
    let l = '';
    for (let u = s.length - 1; u >= 0; u -= 1) {
      const d = s[u],
        {
          isExternal: m,
          modifiers: p,
          hasImportantModifier: g,
          baseClassName: k,
          maybePostfixModifierPosition: f,
        } = r(d);
      if (m) {
        l = d + (l.length > 0 ? ' ' + l : l);
        continue;
      }
      let b = !!f,
        x = n(b ? k.substring(0, f) : k);
      if (!x) {
        if (!b) {
          l = d + (l.length > 0 ? ' ' + l : l);
          continue;
        }
        if (((x = n(k)), !x)) {
          l = d + (l.length > 0 ? ' ' + l : l);
          continue;
        }
        b = !1;
      }
      const M = a(p).join(':'),
        P = g ? M + De : M,
        N = P + x;
      if (c.includes(N)) continue;
      c.push(N);
      const E = o(x, b);
      for (let R = 0; R < E.length; ++R) {
        const C = E[R];
        c.push(P + C);
      }
      l = d + (l.length > 0 ? ' ' + l : l);
    }
    return l;
  };
function vr() {
  let e = 0,
    t,
    r,
    n = '';
  for (; e < arguments.length; )
    (t = arguments[e++]) && (r = Et(t)) && (n && (n += ' '), (n += r));
  return n;
}
const Et = (e) => {
  if (typeof e == 'string') return e;
  let t,
    r = '';
  for (let n = 0; n < e.length; n++)
    e[n] && (t = Et(e[n])) && (r && (r += ' '), (r += t));
  return r;
};
function gr(e, ...t) {
  let r,
    n,
    o,
    a = c;
  function c(l) {
    const u = t.reduce((d, m) => m(d), e());
    return ((r = mr(u)), (n = r.cache.get), (o = r.cache.set), (a = s), s(l));
  }
  function s(l) {
    const u = n(l);
    if (u) return u;
    const d = hr(l, r);
    return (o(l, d), d);
  }
  return function () {
    return a(vr.apply(null, arguments));
  };
}
const O = (e) => {
    const t = (r) => r[e] || [];
    return ((t.isThemeGetter = !0), t);
  },
  Ct = /^\[(?:(\w[\w-]*):)?(.+)\]$/i,
  St = /^\((?:(\w[\w-]*):)?(.+)\)$/i,
  yr = /^\d+\/\d+$/,
  br = /^(\d+(\.\d+)?)?(xs|sm|md|lg|xl)$/,
  wr =
    /\d+(%|px|r?em|[sdl]?v([hwib]|min|max)|pt|pc|in|cm|mm|cap|ch|ex|r?lh|cq(w|h|i|b|min|max))|\b(calc|min|max|clamp)\(.+\)|^0$/,
  kr = /^(rgba?|hsla?|hwb|(ok)?(lab|lch)|color-mix)\(.+\)$/,
  xr = /^(inset_)?-?((\d+)?\.?(\d+)[a-z]+|0)_-?((\d+)?\.?(\d+)[a-z]+|0)/,
  Er =
    /^(url|image|image-set|cross-fade|element|(repeating-)?(linear|radial|conic)-gradient)\(.+\)$/,
  K = (e) => yr.test(e),
  S = (e) => !!e && !Number.isNaN(Number(e)),
  B = (e) => !!e && Number.isInteger(Number(e)),
  Se = (e) => e.endsWith('%') && S(e.slice(0, -1)),
  V = (e) => br.test(e),
  Cr = () => !0,
  Sr = (e) => wr.test(e) && !kr.test(e),
  Mt = () => !1,
  Mr = (e) => xr.test(e),
  Pr = (e) => Er.test(e),
  Rr = (e) => !h(e) && !v(e),
  Ar = (e) => J(e, At, Mt),
  h = (e) => Ct.test(e),
  G = (e) => J(e, Nt, Sr),
  Me = (e) => J(e, Ir, S),
  Je = (e) => J(e, Pt, Mt),
  Nr = (e) => J(e, Rt, Pr),
  ce = (e) => J(e, Tt, Mr),
  v = (e) => St.test(e),
  te = (e) => ee(e, Nt),
  Tr = (e) => ee(e, zr),
  et = (e) => ee(e, Pt),
  Or = (e) => ee(e, At),
  Lr = (e) => ee(e, Rt),
  le = (e) => ee(e, Tt, !0),
  J = (e, t, r) => {
    const n = Ct.exec(e);
    return n ? (n[1] ? t(n[1]) : r(n[2])) : !1;
  },
  ee = (e, t, r = !1) => {
    const n = St.exec(e);
    return n ? (n[1] ? t(n[1]) : r) : !1;
  },
  Pt = (e) => e === 'position' || e === 'percentage',
  Rt = (e) => e === 'image' || e === 'url',
  At = (e) => e === 'length' || e === 'size' || e === 'bg-size',
  Nt = (e) => e === 'length',
  Ir = (e) => e === 'number',
  zr = (e) => e === 'family-name',
  Tt = (e) => e === 'shadow',
  Fr = () => {
    const e = O('color'),
      t = O('font'),
      r = O('text'),
      n = O('font-weight'),
      o = O('tracking'),
      a = O('leading'),
      c = O('breakpoint'),
      s = O('container'),
      l = O('spacing'),
      u = O('radius'),
      d = O('shadow'),
      m = O('inset-shadow'),
      p = O('text-shadow'),
      g = O('drop-shadow'),
      k = O('blur'),
      f = O('perspective'),
      b = O('aspect'),
      x = O('ease'),
      M = O('animate'),
      P = () => [
        'auto',
        'avoid',
        'all',
        'avoid-page',
        'page',
        'left',
        'right',
        'column',
      ],
      N = () => [
        'center',
        'top',
        'bottom',
        'left',
        'right',
        'top-left',
        'left-top',
        'top-right',
        'right-top',
        'bottom-right',
        'right-bottom',
        'bottom-left',
        'left-bottom',
      ],
      E = () => [...N(), v, h],
      R = () => ['auto', 'hidden', 'clip', 'visible', 'scroll'],
      C = () => ['auto', 'contain', 'none'],
      y = () => [v, h, l],
      T = () => [K, 'full', 'auto', ...y()],
      j = () => [B, 'none', 'subgrid', v, h],
      W = () => ['auto', { span: ['full', B, v, h] }, B, v, h],
      $ = () => [B, 'auto', v, h],
      Ue = () => ['auto', 'min', 'max', 'fr', v, h],
      we = () => [
        'start',
        'end',
        'center',
        'between',
        'around',
        'evenly',
        'stretch',
        'baseline',
        'center-safe',
        'end-safe',
      ],
      q = () => [
        'start',
        'end',
        'center',
        'stretch',
        'center-safe',
        'end-safe',
      ],
      _ = () => ['auto', ...y()],
      U = () => [
        K,
        'auto',
        'full',
        'dvw',
        'dvh',
        'lvw',
        'lvh',
        'svw',
        'svh',
        'min',
        'max',
        'fit',
        ...y(),
      ],
      w = () => [e, v, h],
      Ge = () => [...N(), et, Je, { position: [v, h] }],
      $e = () => ['no-repeat', { repeat: ['', 'x', 'y', 'space', 'round'] }],
      qe = () => ['auto', 'cover', 'contain', Or, Ar, { size: [v, h] }],
      ke = () => [Se, te, G],
      z = () => ['', 'none', 'full', u, v, h],
      F = () => ['', S, te, G],
      oe = () => ['solid', 'dashed', 'dotted', 'double'],
      Ke = () => [
        'normal',
        'multiply',
        'screen',
        'overlay',
        'darken',
        'lighten',
        'color-dodge',
        'color-burn',
        'hard-light',
        'soft-light',
        'difference',
        'exclusion',
        'hue',
        'saturation',
        'color',
        'luminosity',
      ],
      I = () => [S, Se, et, Je],
      Xe = () => ['', 'none', k, v, h],
      ae = () => ['none', S, v, h],
      se = () => ['none', S, v, h],
      xe = () => [S, v, h],
      ie = () => [K, 'full', ...y()];
    return {
      cacheSize: 500,
      theme: {
        animate: ['spin', 'ping', 'pulse', 'bounce'],
        aspect: ['video'],
        blur: [V],
        breakpoint: [V],
        color: [Cr],
        container: [V],
        'drop-shadow': [V],
        ease: ['in', 'out', 'in-out'],
        font: [Rr],
        'font-weight': [
          'thin',
          'extralight',
          'light',
          'normal',
          'medium',
          'semibold',
          'bold',
          'extrabold',
          'black',
        ],
        'inset-shadow': [V],
        leading: ['none', 'tight', 'snug', 'normal', 'relaxed', 'loose'],
        perspective: [
          'dramatic',
          'near',
          'normal',
          'midrange',
          'distant',
          'none',
        ],
        radius: [V],
        shadow: [V],
        spacing: ['px', S],
        text: [V],
        'text-shadow': [V],
        tracking: ['tighter', 'tight', 'normal', 'wide', 'wider', 'widest'],
      },
      classGroups: {
        aspect: [{ aspect: ['auto', 'square', K, h, v, b] }],
        container: ['container'],
        columns: [{ columns: [S, h, v, s] }],
        'break-after': [{ 'break-after': P() }],
        'break-before': [{ 'break-before': P() }],
        'break-inside': [
          { 'break-inside': ['auto', 'avoid', 'avoid-page', 'avoid-column'] },
        ],
        'box-decoration': [{ 'box-decoration': ['slice', 'clone'] }],
        box: [{ box: ['border', 'content'] }],
        display: [
          'block',
          'inline-block',
          'inline',
          'flex',
          'inline-flex',
          'table',
          'inline-table',
          'table-caption',
          'table-cell',
          'table-column',
          'table-column-group',
          'table-footer-group',
          'table-header-group',
          'table-row-group',
          'table-row',
          'flow-root',
          'grid',
          'inline-grid',
          'contents',
          'list-item',
          'hidden',
        ],
        sr: ['sr-only', 'not-sr-only'],
        float: [{ float: ['right', 'left', 'none', 'start', 'end'] }],
        clear: [{ clear: ['left', 'right', 'both', 'none', 'start', 'end'] }],
        isolation: ['isolate', 'isolation-auto'],
        'object-fit': [
          { object: ['contain', 'cover', 'fill', 'none', 'scale-down'] },
        ],
        'object-position': [{ object: E() }],
        overflow: [{ overflow: R() }],
        'overflow-x': [{ 'overflow-x': R() }],
        'overflow-y': [{ 'overflow-y': R() }],
        overscroll: [{ overscroll: C() }],
        'overscroll-x': [{ 'overscroll-x': C() }],
        'overscroll-y': [{ 'overscroll-y': C() }],
        position: ['static', 'fixed', 'absolute', 'relative', 'sticky'],
        inset: [{ inset: T() }],
        'inset-x': [{ 'inset-x': T() }],
        'inset-y': [{ 'inset-y': T() }],
        start: [{ start: T() }],
        end: [{ end: T() }],
        top: [{ top: T() }],
        right: [{ right: T() }],
        bottom: [{ bottom: T() }],
        left: [{ left: T() }],
        visibility: ['visible', 'invisible', 'collapse'],
        z: [{ z: [B, 'auto', v, h] }],
        basis: [{ basis: [K, 'full', 'auto', s, ...y()] }],
        'flex-direction': [
          { flex: ['row', 'row-reverse', 'col', 'col-reverse'] },
        ],
        'flex-wrap': [{ flex: ['nowrap', 'wrap', 'wrap-reverse'] }],
        flex: [{ flex: [S, K, 'auto', 'initial', 'none', h] }],
        grow: [{ grow: ['', S, v, h] }],
        shrink: [{ shrink: ['', S, v, h] }],
        order: [{ order: [B, 'first', 'last', 'none', v, h] }],
        'grid-cols': [{ 'grid-cols': j() }],
        'col-start-end': [{ col: W() }],
        'col-start': [{ 'col-start': $() }],
        'col-end': [{ 'col-end': $() }],
        'grid-rows': [{ 'grid-rows': j() }],
        'row-start-end': [{ row: W() }],
        'row-start': [{ 'row-start': $() }],
        'row-end': [{ 'row-end': $() }],
        'grid-flow': [
          { 'grid-flow': ['row', 'col', 'dense', 'row-dense', 'col-dense'] },
        ],
        'auto-cols': [{ 'auto-cols': Ue() }],
        'auto-rows': [{ 'auto-rows': Ue() }],
        gap: [{ gap: y() }],
        'gap-x': [{ 'gap-x': y() }],
        'gap-y': [{ 'gap-y': y() }],
        'justify-content': [{ justify: [...we(), 'normal'] }],
        'justify-items': [{ 'justify-items': [...q(), 'normal'] }],
        'justify-self': [{ 'justify-self': ['auto', ...q()] }],
        'align-content': [{ content: ['normal', ...we()] }],
        'align-items': [{ items: [...q(), { baseline: ['', 'last'] }] }],
        'align-self': [{ self: ['auto', ...q(), { baseline: ['', 'last'] }] }],
        'place-content': [{ 'place-content': we() }],
        'place-items': [{ 'place-items': [...q(), 'baseline'] }],
        'place-self': [{ 'place-self': ['auto', ...q()] }],
        p: [{ p: y() }],
        px: [{ px: y() }],
        py: [{ py: y() }],
        ps: [{ ps: y() }],
        pe: [{ pe: y() }],
        pt: [{ pt: y() }],
        pr: [{ pr: y() }],
        pb: [{ pb: y() }],
        pl: [{ pl: y() }],
        m: [{ m: _() }],
        mx: [{ mx: _() }],
        my: [{ my: _() }],
        ms: [{ ms: _() }],
        me: [{ me: _() }],
        mt: [{ mt: _() }],
        mr: [{ mr: _() }],
        mb: [{ mb: _() }],
        ml: [{ ml: _() }],
        'space-x': [{ 'space-x': y() }],
        'space-x-reverse': ['space-x-reverse'],
        'space-y': [{ 'space-y': y() }],
        'space-y-reverse': ['space-y-reverse'],
        size: [{ size: U() }],
        w: [{ w: [s, 'screen', ...U()] }],
        'min-w': [{ 'min-w': [s, 'screen', 'none', ...U()] }],
        'max-w': [
          { 'max-w': [s, 'screen', 'none', 'prose', { screen: [c] }, ...U()] },
        ],
        h: [{ h: ['screen', 'lh', ...U()] }],
        'min-h': [{ 'min-h': ['screen', 'lh', 'none', ...U()] }],
        'max-h': [{ 'max-h': ['screen', 'lh', ...U()] }],
        'font-size': [{ text: ['base', r, te, G] }],
        'font-smoothing': ['antialiased', 'subpixel-antialiased'],
        'font-style': ['italic', 'not-italic'],
        'font-weight': [{ font: [n, v, Me] }],
        'font-stretch': [
          {
            'font-stretch': [
              'ultra-condensed',
              'extra-condensed',
              'condensed',
              'semi-condensed',
              'normal',
              'semi-expanded',
              'expanded',
              'extra-expanded',
              'ultra-expanded',
              Se,
              h,
            ],
          },
        ],
        'font-family': [{ font: [Tr, h, t] }],
        'fvn-normal': ['normal-nums'],
        'fvn-ordinal': ['ordinal'],
        'fvn-slashed-zero': ['slashed-zero'],
        'fvn-figure': ['lining-nums', 'oldstyle-nums'],
        'fvn-spacing': ['proportional-nums', 'tabular-nums'],
        'fvn-fraction': ['diagonal-fractions', 'stacked-fractions'],
        tracking: [{ tracking: [o, v, h] }],
        'line-clamp': [{ 'line-clamp': [S, 'none', v, Me] }],
        leading: [{ leading: [a, ...y()] }],
        'list-image': [{ 'list-image': ['none', v, h] }],
        'list-style-position': [{ list: ['inside', 'outside'] }],
        'list-style-type': [{ list: ['disc', 'decimal', 'none', v, h] }],
        'text-alignment': [
          { text: ['left', 'center', 'right', 'justify', 'start', 'end'] },
        ],
        'placeholder-color': [{ placeholder: w() }],
        'text-color': [{ text: w() }],
        'text-decoration': [
          'underline',
          'overline',
          'line-through',
          'no-underline',
        ],
        'text-decoration-style': [{ decoration: [...oe(), 'wavy'] }],
        'text-decoration-thickness': [
          { decoration: [S, 'from-font', 'auto', v, G] },
        ],
        'text-decoration-color': [{ decoration: w() }],
        'underline-offset': [{ 'underline-offset': [S, 'auto', v, h] }],
        'text-transform': [
          'uppercase',
          'lowercase',
          'capitalize',
          'normal-case',
        ],
        'text-overflow': ['truncate', 'text-ellipsis', 'text-clip'],
        'text-wrap': [{ text: ['wrap', 'nowrap', 'balance', 'pretty'] }],
        indent: [{ indent: y() }],
        'vertical-align': [
          {
            align: [
              'baseline',
              'top',
              'middle',
              'bottom',
              'text-top',
              'text-bottom',
              'sub',
              'super',
              v,
              h,
            ],
          },
        ],
        whitespace: [
          {
            whitespace: [
              'normal',
              'nowrap',
              'pre',
              'pre-line',
              'pre-wrap',
              'break-spaces',
            ],
          },
        ],
        break: [{ break: ['normal', 'words', 'all', 'keep'] }],
        wrap: [{ wrap: ['break-word', 'anywhere', 'normal'] }],
        hyphens: [{ hyphens: ['none', 'manual', 'auto'] }],
        content: [{ content: ['none', v, h] }],
        'bg-attachment': [{ bg: ['fixed', 'local', 'scroll'] }],
        'bg-clip': [{ 'bg-clip': ['border', 'padding', 'content', 'text'] }],
        'bg-origin': [{ 'bg-origin': ['border', 'padding', 'content'] }],
        'bg-position': [{ bg: Ge() }],
        'bg-repeat': [{ bg: $e() }],
        'bg-size': [{ bg: qe() }],
        'bg-image': [
          {
            bg: [
              'none',
              {
                linear: [
                  { to: ['t', 'tr', 'r', 'br', 'b', 'bl', 'l', 'tl'] },
                  B,
                  v,
                  h,
                ],
                radial: ['', v, h],
                conic: [B, v, h],
              },
              Lr,
              Nr,
            ],
          },
        ],
        'bg-color': [{ bg: w() }],
        'gradient-from-pos': [{ from: ke() }],
        'gradient-via-pos': [{ via: ke() }],
        'gradient-to-pos': [{ to: ke() }],
        'gradient-from': [{ from: w() }],
        'gradient-via': [{ via: w() }],
        'gradient-to': [{ to: w() }],
        rounded: [{ rounded: z() }],
        'rounded-s': [{ 'rounded-s': z() }],
        'rounded-e': [{ 'rounded-e': z() }],
        'rounded-t': [{ 'rounded-t': z() }],
        'rounded-r': [{ 'rounded-r': z() }],
        'rounded-b': [{ 'rounded-b': z() }],
        'rounded-l': [{ 'rounded-l': z() }],
        'rounded-ss': [{ 'rounded-ss': z() }],
        'rounded-se': [{ 'rounded-se': z() }],
        'rounded-ee': [{ 'rounded-ee': z() }],
        'rounded-es': [{ 'rounded-es': z() }],
        'rounded-tl': [{ 'rounded-tl': z() }],
        'rounded-tr': [{ 'rounded-tr': z() }],
        'rounded-br': [{ 'rounded-br': z() }],
        'rounded-bl': [{ 'rounded-bl': z() }],
        'border-w': [{ border: F() }],
        'border-w-x': [{ 'border-x': F() }],
        'border-w-y': [{ 'border-y': F() }],
        'border-w-s': [{ 'border-s': F() }],
        'border-w-e': [{ 'border-e': F() }],
        'border-w-t': [{ 'border-t': F() }],
        'border-w-r': [{ 'border-r': F() }],
        'border-w-b': [{ 'border-b': F() }],
        'border-w-l': [{ 'border-l': F() }],
        'divide-x': [{ 'divide-x': F() }],
        'divide-x-reverse': ['divide-x-reverse'],
        'divide-y': [{ 'divide-y': F() }],
        'divide-y-reverse': ['divide-y-reverse'],
        'border-style': [{ border: [...oe(), 'hidden', 'none'] }],
        'divide-style': [{ divide: [...oe(), 'hidden', 'none'] }],
        'border-color': [{ border: w() }],
        'border-color-x': [{ 'border-x': w() }],
        'border-color-y': [{ 'border-y': w() }],
        'border-color-s': [{ 'border-s': w() }],
        'border-color-e': [{ 'border-e': w() }],
        'border-color-t': [{ 'border-t': w() }],
        'border-color-r': [{ 'border-r': w() }],
        'border-color-b': [{ 'border-b': w() }],
        'border-color-l': [{ 'border-l': w() }],
        'divide-color': [{ divide: w() }],
        'outline-style': [{ outline: [...oe(), 'none', 'hidden'] }],
        'outline-offset': [{ 'outline-offset': [S, v, h] }],
        'outline-w': [{ outline: ['', S, te, G] }],
        'outline-color': [{ outline: w() }],
        shadow: [{ shadow: ['', 'none', d, le, ce] }],
        'shadow-color': [{ shadow: w() }],
        'inset-shadow': [{ 'inset-shadow': ['none', m, le, ce] }],
        'inset-shadow-color': [{ 'inset-shadow': w() }],
        'ring-w': [{ ring: F() }],
        'ring-w-inset': ['ring-inset'],
        'ring-color': [{ ring: w() }],
        'ring-offset-w': [{ 'ring-offset': [S, G] }],
        'ring-offset-color': [{ 'ring-offset': w() }],
        'inset-ring-w': [{ 'inset-ring': F() }],
        'inset-ring-color': [{ 'inset-ring': w() }],
        'text-shadow': [{ 'text-shadow': ['none', p, le, ce] }],
        'text-shadow-color': [{ 'text-shadow': w() }],
        opacity: [{ opacity: [S, v, h] }],
        'mix-blend': [
          { 'mix-blend': [...Ke(), 'plus-darker', 'plus-lighter'] },
        ],
        'bg-blend': [{ 'bg-blend': Ke() }],
        'mask-clip': [
          {
            'mask-clip': [
              'border',
              'padding',
              'content',
              'fill',
              'stroke',
              'view',
            ],
          },
          'mask-no-clip',
        ],
        'mask-composite': [
          { mask: ['add', 'subtract', 'intersect', 'exclude'] },
        ],
        'mask-image-linear-pos': [{ 'mask-linear': [S] }],
        'mask-image-linear-from-pos': [{ 'mask-linear-from': I() }],
        'mask-image-linear-to-pos': [{ 'mask-linear-to': I() }],
        'mask-image-linear-from-color': [{ 'mask-linear-from': w() }],
        'mask-image-linear-to-color': [{ 'mask-linear-to': w() }],
        'mask-image-t-from-pos': [{ 'mask-t-from': I() }],
        'mask-image-t-to-pos': [{ 'mask-t-to': I() }],
        'mask-image-t-from-color': [{ 'mask-t-from': w() }],
        'mask-image-t-to-color': [{ 'mask-t-to': w() }],
        'mask-image-r-from-pos': [{ 'mask-r-from': I() }],
        'mask-image-r-to-pos': [{ 'mask-r-to': I() }],
        'mask-image-r-from-color': [{ 'mask-r-from': w() }],
        'mask-image-r-to-color': [{ 'mask-r-to': w() }],
        'mask-image-b-from-pos': [{ 'mask-b-from': I() }],
        'mask-image-b-to-pos': [{ 'mask-b-to': I() }],
        'mask-image-b-from-color': [{ 'mask-b-from': w() }],
        'mask-image-b-to-color': [{ 'mask-b-to': w() }],
        'mask-image-l-from-pos': [{ 'mask-l-from': I() }],
        'mask-image-l-to-pos': [{ 'mask-l-to': I() }],
        'mask-image-l-from-color': [{ 'mask-l-from': w() }],
        'mask-image-l-to-color': [{ 'mask-l-to': w() }],
        'mask-image-x-from-pos': [{ 'mask-x-from': I() }],
        'mask-image-x-to-pos': [{ 'mask-x-to': I() }],
        'mask-image-x-from-color': [{ 'mask-x-from': w() }],
        'mask-image-x-to-color': [{ 'mask-x-to': w() }],
        'mask-image-y-from-pos': [{ 'mask-y-from': I() }],
        'mask-image-y-to-pos': [{ 'mask-y-to': I() }],
        'mask-image-y-from-color': [{ 'mask-y-from': w() }],
        'mask-image-y-to-color': [{ 'mask-y-to': w() }],
        'mask-image-radial': [{ 'mask-radial': [v, h] }],
        'mask-image-radial-from-pos': [{ 'mask-radial-from': I() }],
        'mask-image-radial-to-pos': [{ 'mask-radial-to': I() }],
        'mask-image-radial-from-color': [{ 'mask-radial-from': w() }],
        'mask-image-radial-to-color': [{ 'mask-radial-to': w() }],
        'mask-image-radial-shape': [{ 'mask-radial': ['circle', 'ellipse'] }],
        'mask-image-radial-size': [
          {
            'mask-radial': [
              { closest: ['side', 'corner'], farthest: ['side', 'corner'] },
            ],
          },
        ],
        'mask-image-radial-pos': [{ 'mask-radial-at': N() }],
        'mask-image-conic-pos': [{ 'mask-conic': [S] }],
        'mask-image-conic-from-pos': [{ 'mask-conic-from': I() }],
        'mask-image-conic-to-pos': [{ 'mask-conic-to': I() }],
        'mask-image-conic-from-color': [{ 'mask-conic-from': w() }],
        'mask-image-conic-to-color': [{ 'mask-conic-to': w() }],
        'mask-mode': [{ mask: ['alpha', 'luminance', 'match'] }],
        'mask-origin': [
          {
            'mask-origin': [
              'border',
              'padding',
              'content',
              'fill',
              'stroke',
              'view',
            ],
          },
        ],
        'mask-position': [{ mask: Ge() }],
        'mask-repeat': [{ mask: $e() }],
        'mask-size': [{ mask: qe() }],
        'mask-type': [{ 'mask-type': ['alpha', 'luminance'] }],
        'mask-image': [{ mask: ['none', v, h] }],
        filter: [{ filter: ['', 'none', v, h] }],
        blur: [{ blur: Xe() }],
        brightness: [{ brightness: [S, v, h] }],
        contrast: [{ contrast: [S, v, h] }],
        'drop-shadow': [{ 'drop-shadow': ['', 'none', g, le, ce] }],
        'drop-shadow-color': [{ 'drop-shadow': w() }],
        grayscale: [{ grayscale: ['', S, v, h] }],
        'hue-rotate': [{ 'hue-rotate': [S, v, h] }],
        invert: [{ invert: ['', S, v, h] }],
        saturate: [{ saturate: [S, v, h] }],
        sepia: [{ sepia: ['', S, v, h] }],
        'backdrop-filter': [{ 'backdrop-filter': ['', 'none', v, h] }],
        'backdrop-blur': [{ 'backdrop-blur': Xe() }],
        'backdrop-brightness': [{ 'backdrop-brightness': [S, v, h] }],
        'backdrop-contrast': [{ 'backdrop-contrast': [S, v, h] }],
        'backdrop-grayscale': [{ 'backdrop-grayscale': ['', S, v, h] }],
        'backdrop-hue-rotate': [{ 'backdrop-hue-rotate': [S, v, h] }],
        'backdrop-invert': [{ 'backdrop-invert': ['', S, v, h] }],
        'backdrop-opacity': [{ 'backdrop-opacity': [S, v, h] }],
        'backdrop-saturate': [{ 'backdrop-saturate': [S, v, h] }],
        'backdrop-sepia': [{ 'backdrop-sepia': ['', S, v, h] }],
        'border-collapse': [{ border: ['collapse', 'separate'] }],
        'border-spacing': [{ 'border-spacing': y() }],
        'border-spacing-x': [{ 'border-spacing-x': y() }],
        'border-spacing-y': [{ 'border-spacing-y': y() }],
        'table-layout': [{ table: ['auto', 'fixed'] }],
        caption: [{ caption: ['top', 'bottom'] }],
        transition: [
          {
            transition: [
              '',
              'all',
              'colors',
              'opacity',
              'shadow',
              'transform',
              'none',
              v,
              h,
            ],
          },
        ],
        'transition-behavior': [{ transition: ['normal', 'discrete'] }],
        duration: [{ duration: [S, 'initial', v, h] }],
        ease: [{ ease: ['linear', 'initial', x, v, h] }],
        delay: [{ delay: [S, v, h] }],
        animate: [{ animate: ['none', M, v, h] }],
        backface: [{ backface: ['hidden', 'visible'] }],
        perspective: [{ perspective: [f, v, h] }],
        'perspective-origin': [{ 'perspective-origin': E() }],
        rotate: [{ rotate: ae() }],
        'rotate-x': [{ 'rotate-x': ae() }],
        'rotate-y': [{ 'rotate-y': ae() }],
        'rotate-z': [{ 'rotate-z': ae() }],
        scale: [{ scale: se() }],
        'scale-x': [{ 'scale-x': se() }],
        'scale-y': [{ 'scale-y': se() }],
        'scale-z': [{ 'scale-z': se() }],
        'scale-3d': ['scale-3d'],
        skew: [{ skew: xe() }],
        'skew-x': [{ 'skew-x': xe() }],
        'skew-y': [{ 'skew-y': xe() }],
        transform: [{ transform: [v, h, '', 'none', 'gpu', 'cpu'] }],
        'transform-origin': [{ origin: E() }],
        'transform-style': [{ transform: ['3d', 'flat'] }],
        translate: [{ translate: ie() }],
        'translate-x': [{ 'translate-x': ie() }],
        'translate-y': [{ 'translate-y': ie() }],
        'translate-z': [{ 'translate-z': ie() }],
        'translate-none': ['translate-none'],
        accent: [{ accent: w() }],
        appearance: [{ appearance: ['none', 'auto'] }],
        'caret-color': [{ caret: w() }],
        'color-scheme': [
          {
            scheme: [
              'normal',
              'dark',
              'light',
              'light-dark',
              'only-dark',
              'only-light',
            ],
          },
        ],
        cursor: [
          {
            cursor: [
              'auto',
              'default',
              'pointer',
              'wait',
              'text',
              'move',
              'help',
              'not-allowed',
              'none',
              'context-menu',
              'progress',
              'cell',
              'crosshair',
              'vertical-text',
              'alias',
              'copy',
              'no-drop',
              'grab',
              'grabbing',
              'all-scroll',
              'col-resize',
              'row-resize',
              'n-resize',
              'e-resize',
              's-resize',
              'w-resize',
              'ne-resize',
              'nw-resize',
              'se-resize',
              'sw-resize',
              'ew-resize',
              'ns-resize',
              'nesw-resize',
              'nwse-resize',
              'zoom-in',
              'zoom-out',
              v,
              h,
            ],
          },
        ],
        'field-sizing': [{ 'field-sizing': ['fixed', 'content'] }],
        'pointer-events': [{ 'pointer-events': ['auto', 'none'] }],
        resize: [{ resize: ['none', '', 'y', 'x'] }],
        'scroll-behavior': [{ scroll: ['auto', 'smooth'] }],
        'scroll-m': [{ 'scroll-m': y() }],
        'scroll-mx': [{ 'scroll-mx': y() }],
        'scroll-my': [{ 'scroll-my': y() }],
        'scroll-ms': [{ 'scroll-ms': y() }],
        'scroll-me': [{ 'scroll-me': y() }],
        'scroll-mt': [{ 'scroll-mt': y() }],
        'scroll-mr': [{ 'scroll-mr': y() }],
        'scroll-mb': [{ 'scroll-mb': y() }],
        'scroll-ml': [{ 'scroll-ml': y() }],
        'scroll-p': [{ 'scroll-p': y() }],
        'scroll-px': [{ 'scroll-px': y() }],
        'scroll-py': [{ 'scroll-py': y() }],
        'scroll-ps': [{ 'scroll-ps': y() }],
        'scroll-pe': [{ 'scroll-pe': y() }],
        'scroll-pt': [{ 'scroll-pt': y() }],
        'scroll-pr': [{ 'scroll-pr': y() }],
        'scroll-pb': [{ 'scroll-pb': y() }],
        'scroll-pl': [{ 'scroll-pl': y() }],
        'snap-align': [{ snap: ['start', 'end', 'center', 'align-none'] }],
        'snap-stop': [{ snap: ['normal', 'always'] }],
        'snap-type': [{ snap: ['none', 'x', 'y', 'both'] }],
        'snap-strictness': [{ snap: ['mandatory', 'proximity'] }],
        touch: [{ touch: ['auto', 'none', 'manipulation'] }],
        'touch-x': [{ 'touch-pan': ['x', 'left', 'right'] }],
        'touch-y': [{ 'touch-pan': ['y', 'up', 'down'] }],
        'touch-pz': ['touch-pinch-zoom'],
        select: [{ select: ['none', 'text', 'all', 'auto'] }],
        'will-change': [
          { 'will-change': ['auto', 'scroll', 'contents', 'transform', v, h] },
        ],
        fill: [{ fill: ['none', ...w()] }],
        'stroke-w': [{ stroke: [S, te, G, Me] }],
        stroke: [{ stroke: ['none', ...w()] }],
        'forced-color-adjust': [{ 'forced-color-adjust': ['auto', 'none'] }],
      },
      conflictingClassGroups: {
        overflow: ['overflow-x', 'overflow-y'],
        overscroll: ['overscroll-x', 'overscroll-y'],
        inset: [
          'inset-x',
          'inset-y',
          'start',
          'end',
          'top',
          'right',
          'bottom',
          'left',
        ],
        'inset-x': ['right', 'left'],
        'inset-y': ['top', 'bottom'],
        flex: ['basis', 'grow', 'shrink'],
        gap: ['gap-x', 'gap-y'],
        p: ['px', 'py', 'ps', 'pe', 'pt', 'pr', 'pb', 'pl'],
        px: ['pr', 'pl'],
        py: ['pt', 'pb'],
        m: ['mx', 'my', 'ms', 'me', 'mt', 'mr', 'mb', 'ml'],
        mx: ['mr', 'ml'],
        my: ['mt', 'mb'],
        size: ['w', 'h'],
        'font-size': ['leading'],
        'fvn-normal': [
          'fvn-ordinal',
          'fvn-slashed-zero',
          'fvn-figure',
          'fvn-spacing',
          'fvn-fraction',
        ],
        'fvn-ordinal': ['fvn-normal'],
        'fvn-slashed-zero': ['fvn-normal'],
        'fvn-figure': ['fvn-normal'],
        'fvn-spacing': ['fvn-normal'],
        'fvn-fraction': ['fvn-normal'],
        'line-clamp': ['display', 'overflow'],
        rounded: [
          'rounded-s',
          'rounded-e',
          'rounded-t',
          'rounded-r',
          'rounded-b',
          'rounded-l',
          'rounded-ss',
          'rounded-se',
          'rounded-ee',
          'rounded-es',
          'rounded-tl',
          'rounded-tr',
          'rounded-br',
          'rounded-bl',
        ],
        'rounded-s': ['rounded-ss', 'rounded-es'],
        'rounded-e': ['rounded-se', 'rounded-ee'],
        'rounded-t': ['rounded-tl', 'rounded-tr'],
        'rounded-r': ['rounded-tr', 'rounded-br'],
        'rounded-b': ['rounded-br', 'rounded-bl'],
        'rounded-l': ['rounded-tl', 'rounded-bl'],
        'border-spacing': ['border-spacing-x', 'border-spacing-y'],
        'border-w': [
          'border-w-x',
          'border-w-y',
          'border-w-s',
          'border-w-e',
          'border-w-t',
          'border-w-r',
          'border-w-b',
          'border-w-l',
        ],
        'border-w-x': ['border-w-r', 'border-w-l'],
        'border-w-y': ['border-w-t', 'border-w-b'],
        'border-color': [
          'border-color-x',
          'border-color-y',
          'border-color-s',
          'border-color-e',
          'border-color-t',
          'border-color-r',
          'border-color-b',
          'border-color-l',
        ],
        'border-color-x': ['border-color-r', 'border-color-l'],
        'border-color-y': ['border-color-t', 'border-color-b'],
        translate: ['translate-x', 'translate-y', 'translate-none'],
        'translate-none': [
          'translate',
          'translate-x',
          'translate-y',
          'translate-z',
        ],
        'scroll-m': [
          'scroll-mx',
          'scroll-my',
          'scroll-ms',
          'scroll-me',
          'scroll-mt',
          'scroll-mr',
          'scroll-mb',
          'scroll-ml',
        ],
        'scroll-mx': ['scroll-mr', 'scroll-ml'],
        'scroll-my': ['scroll-mt', 'scroll-mb'],
        'scroll-p': [
          'scroll-px',
          'scroll-py',
          'scroll-ps',
          'scroll-pe',
          'scroll-pt',
          'scroll-pr',
          'scroll-pb',
          'scroll-pl',
        ],
        'scroll-px': ['scroll-pr', 'scroll-pl'],
        'scroll-py': ['scroll-pt', 'scroll-pb'],
        touch: ['touch-x', 'touch-y', 'touch-pz'],
        'touch-x': ['touch'],
        'touch-y': ['touch'],
        'touch-pz': ['touch'],
      },
      conflictingClassGroupModifiers: { 'font-size': ['leading'] },
      orderSensitiveModifiers: [
        '*',
        '**',
        'after',
        'backdrop',
        'before',
        'details-content',
        'file',
        'first-letter',
        'first-line',
        'marker',
        'placeholder',
        'selection',
      ],
    };
  },
  Dr = gr(Fr),
  jr = {
    xmlns: 'http://www.w3.org/2000/svg',
    width: 24,
    height: 24,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  },
  A = (e, t) => {
    const r = i.forwardRef(
      (
        {
          className: n,
          size: o = 24,
          color: a = 'currentColor',
          children: c,
          ...s
        },
        l,
      ) =>
        L.jsxs('svg', {
          ref: l,
          ...jr,
          width: o,
          height: o,
          stroke: a,
          className: Dr('lucide', n),
          ...s,
          children: [t.map(([u, d]) => i.createElement(u, d)), c],
        }),
    );
    return ((r.displayName = e), r);
  },
  Eo = A('chevron-down', [['path', { d: 'm6 9 6 6 6-6', key: 'qrunsl' }]]),
  Co = A('languages', [
    ['path', { d: 'm5 8 6 6', key: '1wu5hv' }],
    ['path', { d: 'm4 14 6-6 2-3', key: '1k1g8d' }],
    ['path', { d: 'M2 5h12', key: 'or177f' }],
    ['path', { d: 'M7 2h1', key: '1t2jsx' }],
    ['path', { d: 'm22 22-5-10-5 10', key: 'don7ne' }],
    ['path', { d: 'M14 18h6', key: '1m8k6r' }],
  ]),
  So = A('panel-left', [
    [
      'rect',
      { width: '18', height: '18', x: '3', y: '3', rx: '2', key: 'afitv7' },
    ],
    ['path', { d: 'M9 3v18', key: 'fh3hqa' }],
  ]),
  Mo = A('chevrons-up-down', [
    ['path', { d: 'm7 15 5 5 5-5', key: '1hf1tw' }],
    ['path', { d: 'm7 9 5-5 5 5', key: 'sgt6xg' }],
  ]),
  Po = A('search', [
    ['circle', { cx: '11', cy: '11', r: '8', key: '4ej97u' }],
    ['path', { d: 'm21 21-4.3-4.3', key: '1qie3q' }],
  ]),
  Ro = A('external-link', [
    ['path', { d: 'M15 3h6v6', key: '1q9fwt' }],
    ['path', { d: 'M10 14 21 3', key: 'gplh6r' }],
    [
      'path',
      {
        d: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6',
        key: 'a6xqqp',
      },
    ],
  ]),
  Ao = A('moon', [
    ['path', { d: 'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z', key: 'a7tn18' }],
  ]),
  No = A('sun', [
    ['circle', { cx: '12', cy: '12', r: '4', key: '4exip2' }],
    ['path', { d: 'M12 2v2', key: 'tus03m' }],
    ['path', { d: 'M12 20v2', key: '1lh1kg' }],
    ['path', { d: 'm4.93 4.93 1.41 1.41', key: '149t6j' }],
    ['path', { d: 'm17.66 17.66 1.41 1.41', key: 'ptbguv' }],
    ['path', { d: 'M2 12h2', key: '1t8f8n' }],
    ['path', { d: 'M20 12h2', key: '1q8mjw' }],
    ['path', { d: 'm6.34 17.66-1.41 1.41', key: '1m8zz5' }],
    ['path', { d: 'm19.07 4.93-1.41 1.41', key: '1shlcs' }],
  ]),
  To = A('airplay', [
    [
      'path',
      {
        d: 'M5 17H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-1',
        key: 'ns4c3b',
      },
    ],
    ['path', { d: 'm12 15 5 6H7Z', key: '14qnn2' }],
  ]);
A('menu', [
  ['line', { x1: '4', x2: '20', y1: '12', y2: '12', key: '1e0a9i' }],
  ['line', { x1: '4', x2: '20', y1: '6', y2: '6', key: '1owob3' }],
  ['line', { x1: '4', x2: '20', y1: '18', y2: '18', key: 'yk5zj1' }],
]);
A('x', [
  ['path', { d: 'M18 6 6 18', key: '1bl5f8' }],
  ['path', { d: 'm6 6 12 12', key: 'd8bk6v' }],
]);
A('loader-circle', [
  ['path', { d: 'M21 12a9 9 0 1 1-6.219-8.56', key: '13zald' }],
]);
const Oo = A('circle-check', [
    ['circle', { cx: '12', cy: '12', r: '10', key: '1mglay' }],
    ['path', { d: 'm9 12 2 2 4-4', key: 'dzmm74' }],
  ]),
  Lo = A('circle-x', [
    ['circle', { cx: '12', cy: '12', r: '10', key: '1mglay' }],
    ['path', { d: 'm15 9-6 6', key: '1uzhvr' }],
    ['path', { d: 'm9 9 6 6', key: 'z0biqf' }],
  ]),
  Io = A('check', [['path', { d: 'M20 6 9 17l-5-5', key: '1gmf2c' }]]),
  zo = A('triangle-alert', [
    [
      'path',
      {
        d: 'm21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3',
        key: 'wmoenq',
      },
    ],
    ['path', { d: 'M12 9v4', key: 'juzpu7' }],
    ['path', { d: 'M12 17h.01', key: 'p32p05' }],
  ]),
  Fo = A('info', [
    ['circle', { cx: '12', cy: '12', r: '10', key: '1mglay' }],
    ['path', { d: 'M12 16v-4', key: '1dtifu' }],
    ['path', { d: 'M12 8h.01', key: 'e9boi3' }],
  ]);
A('copy', [
  [
    'rect',
    {
      width: '14',
      height: '14',
      x: '8',
      y: '8',
      rx: '2',
      ry: '2',
      key: '17jyea',
    },
  ],
  [
    'path',
    {
      d: 'M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2',
      key: 'zix9uf',
    },
  ],
]);
const Do = A('clipboard', [
  [
    'rect',
    { width: '8', height: '4', x: '8', y: '2', rx: '1', ry: '1', key: '1' },
  ],
  [
    'path',
    {
      d: 'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2',
      key: '2',
    },
  ],
]);
A('file-text', [
  [
    'path',
    {
      d: 'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z',
      key: '1rqfz7',
    },
  ],
  ['path', { d: 'M14 2v4a2 2 0 0 0 2 2h4', key: 'tnqrlb' }],
  ['path', { d: 'M10 9H8', key: 'b1mrlr' }],
  ['path', { d: 'M16 13H8', key: 't4e002' }],
  ['path', { d: 'M16 17H8', key: 'z1uh3a' }],
]);
const jo = A('hash', [
    ['line', { x1: '4', x2: '20', y1: '9', y2: '9', key: '4lhtct' }],
    ['line', { x1: '4', x2: '20', y1: '15', y2: '15', key: 'vyu0kd' }],
    ['line', { x1: '10', x2: '8', y1: '3', y2: '21', key: '1ggp8o' }],
    ['line', { x1: '16', x2: '14', y1: '3', y2: '21', key: 'weycgp' }],
  ]),
  Wo = A('text', [
    ['path', { d: 'M15 18H3', key: 'olowqp' }],
    ['path', { d: 'M17 6H3', key: '16j9eg' }],
    ['path', { d: 'M21 12H3', key: '2avoz0' }],
  ]);
A('file', [
  [
    'path',
    {
      d: 'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z',
      key: '1rqfz7',
    },
  ],
  ['path', { d: 'M14 2v4a2 2 0 0 0 2 2h4', key: 'tnqrlb' }],
]);
A('folder', [
  [
    'path',
    {
      d: 'M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z',
      key: '1kt360',
    },
  ],
]);
A('folder-open', [
  [
    'path',
    {
      d: 'm6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2',
      key: 'usdka0',
    },
  ],
]);
A('star', [
  [
    'path',
    {
      d: 'M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z',
      key: 'r04s7s',
    },
  ],
]);
const _o = A('link', [
    [
      'path',
      {
        d: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71',
        key: '1cjeqo',
      },
    ],
    [
      'path',
      {
        d: 'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
        key: '19qd67',
      },
    ],
  ]),
  Vo = A('square-pen', [
    [
      'path',
      {
        d: 'M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7',
        key: '1m0v6g',
      },
    ],
    [
      'path',
      {
        d: 'M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z',
        key: 'ohrbg2',
      },
    ],
  ]),
  Bo = A('chevron-right', [['path', { d: 'm9 18 6-6-6-6', key: 'mthhwq' }]]),
  Ho = A('chevron-left', [['path', { d: 'm15 18-6-6 6-6', key: '1wnfg3' }]]);
A('plus', [
  ['path', { d: 'M5 12h14', key: '1ays0h' }],
  ['path', { d: 'M12 5v14', key: 's699le' }],
]);
A('trash-2', [
  ['path', { d: 'M3 6h18', key: 'd0wm0j' }],
  ['path', { d: 'M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6', key: '4alrt4' }],
  ['path', { d: 'M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2', key: 'v07s0e' }],
  ['line', { x1: '10', x2: '10', y1: '11', y2: '17', key: '1uufr5' }],
  ['line', { x1: '14', x2: '14', y1: '11', y2: '17', key: 'xtxkd' }],
]);
A('chevron-up', [['path', { d: 'm18 15-6-6-6 6', key: '153udz' }]]);
function Pe(e, t, { checkForDefaultPrevented: r = !0 } = {}) {
  return function (o) {
    if ((e?.(o), r === !1 || !o.defaultPrevented)) return t?.(o);
  };
}
function tt(e, t) {
  if (typeof e == 'function') return e(t);
  e != null && (e.current = t);
}
function Ot(...e) {
  return (t) => {
    let r = !1;
    const n = e.map((o) => {
      const a = tt(o, t);
      return (!r && typeof a == 'function' && (r = !0), a);
    });
    if (r)
      return () => {
        for (let o = 0; o < n.length; o++) {
          const a = n[o];
          typeof a == 'function' ? a() : tt(e[o], null);
        }
      };
  };
}
function ye(...e) {
  return i.useCallback(Ot(...e), e);
}
function Uo(e, t) {
  const r = i.createContext(t),
    n = (a) => {
      const { children: c, ...s } = a,
        l = i.useMemo(() => s, Object.values(s));
      return L.jsx(r.Provider, { value: l, children: c });
    };
  n.displayName = e + 'Provider';
  function o(a) {
    const c = i.useContext(r);
    if (c) return c;
    if (t !== void 0) return t;
    throw new Error(`\`${a}\` must be used within \`${e}\``);
  }
  return [n, o];
}
function Go(e, t = []) {
  let r = [];
  function n(a, c) {
    const s = i.createContext(c),
      l = r.length;
    r = [...r, c];
    const u = (m) => {
      const { scope: p, children: g, ...k } = m,
        f = p?.[e]?.[l] || s,
        b = i.useMemo(() => k, Object.values(k));
      return L.jsx(f.Provider, { value: b, children: g });
    };
    u.displayName = a + 'Provider';
    function d(m, p) {
      const g = p?.[e]?.[l] || s,
        k = i.useContext(g);
      if (k) return k;
      if (c !== void 0) return c;
      throw new Error(`\`${m}\` must be used within \`${a}\``);
    }
    return [u, d];
  }
  const o = () => {
    const a = r.map((c) => i.createContext(c));
    return function (s) {
      const l = s?.[e] || a;
      return i.useMemo(() => ({ [`__scope${e}`]: { ...s, [e]: l } }), [s, l]);
    };
  };
  return ((o.scopeName = e), [n, Wr(o, ...t)]);
}
function Wr(...e) {
  const t = e[0];
  if (e.length === 1) return t;
  const r = () => {
    const n = e.map((o) => ({ useScope: o(), scopeName: o.scopeName }));
    return function (a) {
      const c = n.reduce((s, { useScope: l, scopeName: u }) => {
        const m = l(a)[`__scope${u}`];
        return { ...s, ...m };
      }, {});
      return i.useMemo(() => ({ [`__scope${t.scopeName}`]: c }), [c]);
    };
  };
  return ((r.scopeName = t.scopeName), r);
}
var ge = globalThis?.document ? i.useLayoutEffect : () => {},
  _r = gt[' useId '.trim().toString()] || (() => {}),
  Vr = 0;
function $o(e) {
  const [t, r] = i.useState(_r());
  return (
    ge(() => {
      r((n) => n ?? String(Vr++));
    }, [e]),
    e || (t ? `radix-${t}` : '')
  );
}
var Br = gt[' useInsertionEffect '.trim().toString()] || ge;
function qo({ prop: e, defaultProp: t, onChange: r = () => {}, caller: n }) {
  const [o, a, c] = Hr({ defaultProp: t, onChange: r }),
    s = e !== void 0,
    l = s ? e : o;
  {
    const d = i.useRef(e !== void 0);
    i.useEffect(() => {
      const m = d.current;
      (m !== s &&
        console.warn(
          `${n} is changing from ${m ? 'controlled' : 'uncontrolled'} to ${s ? 'controlled' : 'uncontrolled'}. Components should not switch from controlled to uncontrolled (or vice versa). Decide between using a controlled or uncontrolled value for the lifetime of the component.`,
        ),
        (d.current = s));
    }, [s, n]);
  }
  const u = i.useCallback(
    (d) => {
      if (s) {
        const m = Ur(d) ? d(e) : d;
        m !== e && c.current?.(m);
      } else a(d);
    },
    [s, e, a, c],
  );
  return [l, u];
}
function Hr({ defaultProp: e, onChange: t }) {
  const [r, n] = i.useState(e),
    o = i.useRef(r),
    a = i.useRef(t);
  return (
    Br(() => {
      a.current = t;
    }, [t]),
    i.useEffect(() => {
      o.current !== r && (a.current?.(r), (o.current = r));
    }, [r, o]),
    [r, n, a]
  );
}
function Ur(e) {
  return typeof e == 'function';
}
function Gr(e) {
  const t = $r(e),
    r = i.forwardRef((n, o) => {
      const { children: a, ...c } = n,
        s = i.Children.toArray(a),
        l = s.find(Kr);
      if (l) {
        const u = l.props.children,
          d = s.map((m) =>
            m === l
              ? i.Children.count(u) > 1
                ? i.Children.only(null)
                : i.isValidElement(u)
                  ? u.props.children
                  : null
              : m,
          );
        return L.jsx(t, {
          ...c,
          ref: o,
          children: i.isValidElement(u) ? i.cloneElement(u, void 0, d) : null,
        });
      }
      return L.jsx(t, { ...c, ref: o, children: a });
    });
  return ((r.displayName = `${e}.Slot`), r);
}
function $r(e) {
  const t = i.forwardRef((r, n) => {
    const { children: o, ...a } = r;
    if (i.isValidElement(o)) {
      const c = Yr(o),
        s = Xr(a, o.props);
      return (
        o.type !== i.Fragment && (s.ref = n ? Ot(n, c) : c),
        i.cloneElement(o, s)
      );
    }
    return i.Children.count(o) > 1 ? i.Children.only(null) : null;
  });
  return ((t.displayName = `${e}.SlotClone`), t);
}
var qr = Symbol('radix.slottable');
function Kr(e) {
  return (
    i.isValidElement(e) &&
    typeof e.type == 'function' &&
    '__radixId' in e.type &&
    e.type.__radixId === qr
  );
}
function Xr(e, t) {
  const r = { ...t };
  for (const n in t) {
    const o = e[n],
      a = t[n];
    /^on[A-Z]/.test(n)
      ? o && a
        ? (r[n] = (...s) => {
            const l = a(...s);
            return (o(...s), l);
          })
        : o && (r[n] = o)
      : n === 'style'
        ? (r[n] = { ...o, ...a })
        : n === 'className' && (r[n] = [o, a].filter(Boolean).join(' '));
  }
  return { ...e, ...r };
}
function Yr(e) {
  let t = Object.getOwnPropertyDescriptor(e.props, 'ref')?.get,
    r = t && 'isReactWarning' in t && t.isReactWarning;
  return r
    ? e.ref
    : ((t = Object.getOwnPropertyDescriptor(e, 'ref')?.get),
      (r = t && 'isReactWarning' in t && t.isReactWarning),
      r ? e.props.ref : e.props.ref || e.ref);
}
var Zr = [
    'a',
    'button',
    'div',
    'form',
    'h2',
    'h3',
    'img',
    'input',
    'label',
    'li',
    'nav',
    'ol',
    'p',
    'select',
    'span',
    'svg',
    'ul',
  ],
  He = Zr.reduce((e, t) => {
    const r = Gr(`Primitive.${t}`),
      n = i.forwardRef((o, a) => {
        const { asChild: c, ...s } = o,
          l = c ? r : t;
        return (
          typeof window < 'u' && (window[Symbol.for('radix-ui')] = !0),
          L.jsx(l, { ...s, ref: a })
        );
      });
    return ((n.displayName = `Primitive.${t}`), { ...e, [t]: n });
  }, {});
function Qr(e, t) {
  e && Gt.flushSync(() => e.dispatchEvent(t));
}
function re(e) {
  const t = i.useRef(e);
  return (
    i.useEffect(() => {
      t.current = e;
    }),
    i.useMemo(
      () =>
        (...r) =>
          t.current?.(...r),
      [],
    )
  );
}
function Jr(e, t = globalThis?.document) {
  const r = re(e);
  i.useEffect(() => {
    const n = (o) => {
      o.key === 'Escape' && r(o);
    };
    return (
      t.addEventListener('keydown', n, { capture: !0 }),
      () => t.removeEventListener('keydown', n, { capture: !0 })
    );
  }, [r, t]);
}
var en = 'DismissableLayer',
  We = 'dismissableLayer.update',
  tn = 'dismissableLayer.pointerDownOutside',
  rn = 'dismissableLayer.focusOutside',
  rt,
  Lt = i.createContext({
    layers: new Set(),
    layersWithOutsidePointerEventsDisabled: new Set(),
    branches: new Set(),
  }),
  nn = i.forwardRef((e, t) => {
    const {
        disableOutsidePointerEvents: r = !1,
        onEscapeKeyDown: n,
        onPointerDownOutside: o,
        onFocusOutside: a,
        onInteractOutside: c,
        onDismiss: s,
        ...l
      } = e,
      u = i.useContext(Lt),
      [d, m] = i.useState(null),
      p = d?.ownerDocument ?? globalThis?.document,
      [, g] = i.useState({}),
      k = ye(t, (C) => m(C)),
      f = Array.from(u.layers),
      [b] = [...u.layersWithOutsidePointerEventsDisabled].slice(-1),
      x = f.indexOf(b),
      M = d ? f.indexOf(d) : -1,
      P = u.layersWithOutsidePointerEventsDisabled.size > 0,
      N = M >= x,
      E = sn((C) => {
        const y = C.target,
          T = [...u.branches].some((j) => j.contains(y));
        !N || T || (o?.(C), c?.(C), C.defaultPrevented || s?.());
      }, p),
      R = cn((C) => {
        const y = C.target;
        [...u.branches].some((j) => j.contains(y)) ||
          (a?.(C), c?.(C), C.defaultPrevented || s?.());
      }, p);
    return (
      Jr((C) => {
        M === u.layers.size - 1 &&
          (n?.(C), !C.defaultPrevented && s && (C.preventDefault(), s()));
      }, p),
      i.useEffect(() => {
        if (d)
          return (
            r &&
              (u.layersWithOutsidePointerEventsDisabled.size === 0 &&
                ((rt = p.body.style.pointerEvents),
                (p.body.style.pointerEvents = 'none')),
              u.layersWithOutsidePointerEventsDisabled.add(d)),
            u.layers.add(d),
            nt(),
            () => {
              r &&
                u.layersWithOutsidePointerEventsDisabled.size === 1 &&
                (p.body.style.pointerEvents = rt);
            }
          );
      }, [d, p, r, u]),
      i.useEffect(
        () => () => {
          d &&
            (u.layers.delete(d),
            u.layersWithOutsidePointerEventsDisabled.delete(d),
            nt());
        },
        [d, u],
      ),
      i.useEffect(() => {
        const C = () => g({});
        return (
          document.addEventListener(We, C),
          () => document.removeEventListener(We, C)
        );
      }, []),
      L.jsx(He.div, {
        ...l,
        ref: k,
        style: {
          pointerEvents: P ? (N ? 'auto' : 'none') : void 0,
          ...e.style,
        },
        onFocusCapture: Pe(e.onFocusCapture, R.onFocusCapture),
        onBlurCapture: Pe(e.onBlurCapture, R.onBlurCapture),
        onPointerDownCapture: Pe(
          e.onPointerDownCapture,
          E.onPointerDownCapture,
        ),
      })
    );
  });
nn.displayName = en;
var on = 'DismissableLayerBranch',
  an = i.forwardRef((e, t) => {
    const r = i.useContext(Lt),
      n = i.useRef(null),
      o = ye(t, n);
    return (
      i.useEffect(() => {
        const a = n.current;
        if (a)
          return (
            r.branches.add(a),
            () => {
              r.branches.delete(a);
            }
          );
      }, [r.branches]),
      L.jsx(He.div, { ...e, ref: o })
    );
  });
an.displayName = on;
function sn(e, t = globalThis?.document) {
  const r = re(e),
    n = i.useRef(!1),
    o = i.useRef(() => {});
  return (
    i.useEffect(() => {
      const a = (s) => {
          if (s.target && !n.current) {
            let l = function () {
              It(tn, r, u, { discrete: !0 });
            };
            const u = { originalEvent: s };
            s.pointerType === 'touch'
              ? (t.removeEventListener('click', o.current),
                (o.current = l),
                t.addEventListener('click', o.current, { once: !0 }))
              : l();
          } else t.removeEventListener('click', o.current);
          n.current = !1;
        },
        c = window.setTimeout(() => {
          t.addEventListener('pointerdown', a);
        }, 0);
      return () => {
        (window.clearTimeout(c),
          t.removeEventListener('pointerdown', a),
          t.removeEventListener('click', o.current));
      };
    }, [t, r]),
    { onPointerDownCapture: () => (n.current = !0) }
  );
}
function cn(e, t = globalThis?.document) {
  const r = re(e),
    n = i.useRef(!1);
  return (
    i.useEffect(() => {
      const o = (a) => {
        a.target &&
          !n.current &&
          It(rn, r, { originalEvent: a }, { discrete: !1 });
      };
      return (
        t.addEventListener('focusin', o),
        () => t.removeEventListener('focusin', o)
      );
    }, [t, r]),
    {
      onFocusCapture: () => (n.current = !0),
      onBlurCapture: () => (n.current = !1),
    }
  );
}
function nt() {
  const e = new CustomEvent(We);
  document.dispatchEvent(e);
}
function It(e, t, r, { discrete: n }) {
  const o = r.originalEvent.target,
    a = new CustomEvent(e, { bubbles: !1, cancelable: !0, detail: r });
  (t && o.addEventListener(e, t, { once: !0 }),
    n ? Qr(o, a) : o.dispatchEvent(a));
}
var Re = 'focusScope.autoFocusOnMount',
  Ae = 'focusScope.autoFocusOnUnmount',
  ot = { bubbles: !1, cancelable: !0 },
  ln = 'FocusScope',
  un = i.forwardRef((e, t) => {
    const {
        loop: r = !1,
        trapped: n = !1,
        onMountAutoFocus: o,
        onUnmountAutoFocus: a,
        ...c
      } = e,
      [s, l] = i.useState(null),
      u = re(o),
      d = re(a),
      m = i.useRef(null),
      p = ye(t, (f) => l(f)),
      g = i.useRef({
        paused: !1,
        pause() {
          this.paused = !0;
        },
        resume() {
          this.paused = !1;
        },
      }).current;
    (i.useEffect(() => {
      if (n) {
        let f = function (P) {
            if (g.paused || !s) return;
            const N = P.target;
            s.contains(N) ? (m.current = N) : H(m.current, { select: !0 });
          },
          b = function (P) {
            if (g.paused || !s) return;
            const N = P.relatedTarget;
            N !== null && (s.contains(N) || H(m.current, { select: !0 }));
          },
          x = function (P) {
            if (document.activeElement === document.body)
              for (const E of P) E.removedNodes.length > 0 && H(s);
          };
        (document.addEventListener('focusin', f),
          document.addEventListener('focusout', b));
        const M = new MutationObserver(x);
        return (
          s && M.observe(s, { childList: !0, subtree: !0 }),
          () => {
            (document.removeEventListener('focusin', f),
              document.removeEventListener('focusout', b),
              M.disconnect());
          }
        );
      }
    }, [n, s, g.paused]),
      i.useEffect(() => {
        if (s) {
          st.add(g);
          const f = document.activeElement;
          if (!s.contains(f)) {
            const x = new CustomEvent(Re, ot);
            (s.addEventListener(Re, u),
              s.dispatchEvent(x),
              x.defaultPrevented ||
                (dn(vn(zt(s)), { select: !0 }),
                document.activeElement === f && H(s)));
          }
          return () => {
            (s.removeEventListener(Re, u),
              setTimeout(() => {
                const x = new CustomEvent(Ae, ot);
                (s.addEventListener(Ae, d),
                  s.dispatchEvent(x),
                  x.defaultPrevented || H(f ?? document.body, { select: !0 }),
                  s.removeEventListener(Ae, d),
                  st.remove(g));
              }, 0));
          };
        }
      }, [s, u, d, g]));
    const k = i.useCallback(
      (f) => {
        if ((!r && !n) || g.paused) return;
        const b = f.key === 'Tab' && !f.altKey && !f.ctrlKey && !f.metaKey,
          x = document.activeElement;
        if (b && x) {
          const M = f.currentTarget,
            [P, N] = fn(M);
          P && N
            ? !f.shiftKey && x === N
              ? (f.preventDefault(), r && H(P, { select: !0 }))
              : f.shiftKey &&
                x === P &&
                (f.preventDefault(), r && H(N, { select: !0 }))
            : x === M && f.preventDefault();
        }
      },
      [r, n, g.paused],
    );
    return L.jsx(He.div, { tabIndex: -1, ...c, ref: p, onKeyDown: k });
  });
un.displayName = ln;
function dn(e, { select: t = !1 } = {}) {
  const r = document.activeElement;
  for (const n of e)
    if ((H(n, { select: t }), document.activeElement !== r)) return;
}
function fn(e) {
  const t = zt(e),
    r = at(t, e),
    n = at(t.reverse(), e);
  return [r, n];
}
function zt(e) {
  const t = [],
    r = document.createTreeWalker(e, NodeFilter.SHOW_ELEMENT, {
      acceptNode: (n) => {
        const o = n.tagName === 'INPUT' && n.type === 'hidden';
        return n.disabled || n.hidden || o
          ? NodeFilter.FILTER_SKIP
          : n.tabIndex >= 0
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_SKIP;
      },
    });
  for (; r.nextNode(); ) t.push(r.currentNode);
  return t;
}
function at(e, t) {
  for (const r of e) if (!mn(r, { upTo: t })) return r;
}
function mn(e, { upTo: t }) {
  if (getComputedStyle(e).visibility === 'hidden') return !0;
  for (; e; ) {
    if (t !== void 0 && e === t) return !1;
    if (getComputedStyle(e).display === 'none') return !0;
    e = e.parentElement;
  }
  return !1;
}
function pn(e) {
  return e instanceof HTMLInputElement && 'select' in e;
}
function H(e, { select: t = !1 } = {}) {
  if (e && e.focus) {
    const r = document.activeElement;
    (e.focus({ preventScroll: !0 }), e !== r && pn(e) && t && e.select());
  }
}
var st = hn();
function hn() {
  let e = [];
  return {
    add(t) {
      const r = e[0];
      (t !== r && r?.pause(), (e = it(e, t)), e.unshift(t));
    },
    remove(t) {
      ((e = it(e, t)), e[0]?.resume());
    },
  };
}
function it(e, t) {
  const r = [...e],
    n = r.indexOf(t);
  return (n !== -1 && r.splice(n, 1), r);
}
function vn(e) {
  return e.filter((t) => t.tagName !== 'A');
}
function gn(e, t) {
  return i.useReducer((r, n) => t[r][n] ?? r, e);
}
var yn = (e) => {
  const { present: t, children: r } = e,
    n = bn(t),
    o =
      typeof r == 'function' ? r({ present: n.isPresent }) : i.Children.only(r),
    a = ye(n.ref, wn(o));
  return typeof r == 'function' || n.isPresent
    ? i.cloneElement(o, { ref: a })
    : null;
};
yn.displayName = 'Presence';
function bn(e) {
  const [t, r] = i.useState(),
    n = i.useRef(null),
    o = i.useRef(e),
    a = i.useRef('none'),
    c = e ? 'mounted' : 'unmounted',
    [s, l] = gn(c, {
      mounted: { UNMOUNT: 'unmounted', ANIMATION_OUT: 'unmountSuspended' },
      unmountSuspended: { MOUNT: 'mounted', ANIMATION_END: 'unmounted' },
      unmounted: { MOUNT: 'mounted' },
    });
  return (
    i.useEffect(() => {
      const u = ue(n.current);
      a.current = s === 'mounted' ? u : 'none';
    }, [s]),
    ge(() => {
      const u = n.current,
        d = o.current;
      if (d !== e) {
        const p = a.current,
          g = ue(u);
        (e
          ? l('MOUNT')
          : g === 'none' || u?.display === 'none'
            ? l('UNMOUNT')
            : l(d && p !== g ? 'ANIMATION_OUT' : 'UNMOUNT'),
          (o.current = e));
      }
    }, [e, l]),
    ge(() => {
      if (t) {
        let u;
        const d = t.ownerDocument.defaultView ?? window,
          m = (g) => {
            const f = ue(n.current).includes(CSS.escape(g.animationName));
            if (g.target === t && f && (l('ANIMATION_END'), !o.current)) {
              const b = t.style.animationFillMode;
              ((t.style.animationFillMode = 'forwards'),
                (u = d.setTimeout(() => {
                  t.style.animationFillMode === 'forwards' &&
                    (t.style.animationFillMode = b);
                })));
            }
          },
          p = (g) => {
            g.target === t && (a.current = ue(n.current));
          };
        return (
          t.addEventListener('animationstart', p),
          t.addEventListener('animationcancel', m),
          t.addEventListener('animationend', m),
          () => {
            (d.clearTimeout(u),
              t.removeEventListener('animationstart', p),
              t.removeEventListener('animationcancel', m),
              t.removeEventListener('animationend', m));
          }
        );
      } else l('ANIMATION_END');
    }, [t, l]),
    {
      isPresent: ['mounted', 'unmountSuspended'].includes(s),
      ref: i.useCallback((u) => {
        ((n.current = u ? getComputedStyle(u) : null), r(u));
      }, []),
    }
  );
}
function ue(e) {
  return e?.animationName || 'none';
}
function wn(e) {
  let t = Object.getOwnPropertyDescriptor(e.props, 'ref')?.get,
    r = t && 'isReactWarning' in t && t.isReactWarning;
  return r
    ? e.ref
    : ((t = Object.getOwnPropertyDescriptor(e, 'ref')?.get),
      (r = t && 'isReactWarning' in t && t.isReactWarning),
      r ? e.props.ref : e.props.ref || e.ref);
}
var Ne = 0;
function Ko() {
  i.useEffect(() => {
    const e = document.querySelectorAll('[data-radix-focus-guard]');
    return (
      document.body.insertAdjacentElement('afterbegin', e[0] ?? ct()),
      document.body.insertAdjacentElement('beforeend', e[1] ?? ct()),
      Ne++,
      () => {
        (Ne === 1 &&
          document
            .querySelectorAll('[data-radix-focus-guard]')
            .forEach((t) => t.remove()),
          Ne--);
      }
    );
  }, []);
}
function ct() {
  const e = document.createElement('span');
  return (
    e.setAttribute('data-radix-focus-guard', ''),
    (e.tabIndex = 0),
    (e.style.outline = 'none'),
    (e.style.opacity = '0'),
    (e.style.position = 'fixed'),
    (e.style.pointerEvents = 'none'),
    e
  );
}
var D = function () {
  return (
    (D =
      Object.assign ||
      function (t) {
        for (var r, n = 1, o = arguments.length; n < o; n++) {
          r = arguments[n];
          for (var a in r)
            Object.prototype.hasOwnProperty.call(r, a) && (t[a] = r[a]);
        }
        return t;
      }),
    D.apply(this, arguments)
  );
};
function Ft(e, t) {
  var r = {};
  for (var n in e)
    Object.prototype.hasOwnProperty.call(e, n) &&
      t.indexOf(n) < 0 &&
      (r[n] = e[n]);
  if (e != null && typeof Object.getOwnPropertySymbols == 'function')
    for (var o = 0, n = Object.getOwnPropertySymbols(e); o < n.length; o++)
      t.indexOf(n[o]) < 0 &&
        Object.prototype.propertyIsEnumerable.call(e, n[o]) &&
        (r[n[o]] = e[n[o]]);
  return r;
}
function kn(e, t, r) {
  if (r || arguments.length === 2)
    for (var n = 0, o = t.length, a; n < o; n++)
      (a || !(n in t)) &&
        (a || (a = Array.prototype.slice.call(t, 0, n)), (a[n] = t[n]));
  return e.concat(a || Array.prototype.slice.call(t));
}
var he = 'right-scroll-bar-position',
  ve = 'width-before-scroll-bar',
  xn = 'with-scroll-bars-hidden',
  En = '--removed-body-scroll-bar-size';
function Te(e, t) {
  return (typeof e == 'function' ? e(t) : e && (e.current = t), e);
}
function Cn(e, t) {
  var r = i.useState(function () {
    return {
      value: e,
      callback: t,
      facade: {
        get current() {
          return r.value;
        },
        set current(n) {
          var o = r.value;
          o !== n && ((r.value = n), r.callback(n, o));
        },
      },
    };
  })[0];
  return ((r.callback = t), r.facade);
}
var Sn = typeof window < 'u' ? i.useLayoutEffect : i.useEffect,
  lt = new WeakMap();
function Mn(e, t) {
  var r = Cn(null, function (n) {
    return e.forEach(function (o) {
      return Te(o, n);
    });
  });
  return (
    Sn(
      function () {
        var n = lt.get(r);
        if (n) {
          var o = new Set(n),
            a = new Set(e),
            c = r.current;
          (o.forEach(function (s) {
            a.has(s) || Te(s, null);
          }),
            a.forEach(function (s) {
              o.has(s) || Te(s, c);
            }));
        }
        lt.set(r, e);
      },
      [e],
    ),
    r
  );
}
function Pn(e) {
  return e;
}
function Rn(e, t) {
  t === void 0 && (t = Pn);
  var r = [],
    n = !1,
    o = {
      read: function () {
        if (n)
          throw new Error(
            'Sidecar: could not `read` from an `assigned` medium. `read` could be used only with `useMedium`.',
          );
        return r.length ? r[r.length - 1] : e;
      },
      useMedium: function (a) {
        var c = t(a, n);
        return (
          r.push(c),
          function () {
            r = r.filter(function (s) {
              return s !== c;
            });
          }
        );
      },
      assignSyncMedium: function (a) {
        for (n = !0; r.length; ) {
          var c = r;
          ((r = []), c.forEach(a));
        }
        r = {
          push: function (s) {
            return a(s);
          },
          filter: function () {
            return r;
          },
        };
      },
      assignMedium: function (a) {
        n = !0;
        var c = [];
        if (r.length) {
          var s = r;
          ((r = []), s.forEach(a), (c = r));
        }
        var l = function () {
            var d = c;
            ((c = []), d.forEach(a));
          },
          u = function () {
            return Promise.resolve().then(l);
          };
        (u(),
          (r = {
            push: function (d) {
              (c.push(d), u());
            },
            filter: function (d) {
              return ((c = c.filter(d)), r);
            },
          }));
      },
    };
  return o;
}
function An(e) {
  e === void 0 && (e = {});
  var t = Rn(null);
  return ((t.options = D({ async: !0, ssr: !1 }, e)), t);
}
var Dt = function (e) {
  var t = e.sideCar,
    r = Ft(e, ['sideCar']);
  if (!t)
    throw new Error(
      'Sidecar: please provide `sideCar` property to import the right car',
    );
  var n = t.read();
  if (!n) throw new Error('Sidecar medium not found');
  return i.createElement(n, D({}, r));
};
Dt.isSideCarExport = !0;
function Nn(e, t) {
  return (e.useMedium(t), Dt);
}
var jt = An(),
  Oe = function () {},
  be = i.forwardRef(function (e, t) {
    var r = i.useRef(null),
      n = i.useState({
        onScrollCapture: Oe,
        onWheelCapture: Oe,
        onTouchMoveCapture: Oe,
      }),
      o = n[0],
      a = n[1],
      c = e.forwardProps,
      s = e.children,
      l = e.className,
      u = e.removeScrollBar,
      d = e.enabled,
      m = e.shards,
      p = e.sideCar,
      g = e.noRelative,
      k = e.noIsolation,
      f = e.inert,
      b = e.allowPinchZoom,
      x = e.as,
      M = x === void 0 ? 'div' : x,
      P = e.gapMode,
      N = Ft(e, [
        'forwardProps',
        'children',
        'className',
        'removeScrollBar',
        'enabled',
        'shards',
        'sideCar',
        'noRelative',
        'noIsolation',
        'inert',
        'allowPinchZoom',
        'as',
        'gapMode',
      ]),
      E = p,
      R = Mn([r, t]),
      C = D(D({}, N), o);
    return i.createElement(
      i.Fragment,
      null,
      d &&
        i.createElement(E, {
          sideCar: jt,
          removeScrollBar: u,
          shards: m,
          noRelative: g,
          noIsolation: k,
          inert: f,
          setCallbacks: a,
          allowPinchZoom: !!b,
          lockRef: r,
          gapMode: P,
        }),
      c
        ? i.cloneElement(i.Children.only(s), D(D({}, C), { ref: R }))
        : i.createElement(M, D({}, C, { className: l, ref: R }), s),
    );
  });
be.defaultProps = { enabled: !0, removeScrollBar: !0, inert: !1 };
be.classNames = { fullWidth: ve, zeroRight: he };
var Tn = function () {
  if (typeof __webpack_nonce__ < 'u') return __webpack_nonce__;
};
function On() {
  if (!document) return null;
  var e = document.createElement('style');
  e.type = 'text/css';
  var t = Tn();
  return (t && e.setAttribute('nonce', t), e);
}
function Ln(e, t) {
  e.styleSheet
    ? (e.styleSheet.cssText = t)
    : e.appendChild(document.createTextNode(t));
}
function In(e) {
  var t = document.head || document.getElementsByTagName('head')[0];
  t.appendChild(e);
}
var zn = function () {
    var e = 0,
      t = null;
    return {
      add: function (r) {
        (e == 0 && (t = On()) && (Ln(t, r), In(t)), e++);
      },
      remove: function () {
        (e--,
          !e && t && (t.parentNode && t.parentNode.removeChild(t), (t = null)));
      },
    };
  },
  Fn = function () {
    var e = zn();
    return function (t, r) {
      i.useEffect(
        function () {
          return (
            e.add(t),
            function () {
              e.remove();
            }
          );
        },
        [t && r],
      );
    };
  },
  Wt = function () {
    var e = Fn(),
      t = function (r) {
        var n = r.styles,
          o = r.dynamic;
        return (e(n, o), null);
      };
    return t;
  },
  Dn = { left: 0, top: 0, right: 0, gap: 0 },
  Le = function (e) {
    return parseInt(e || '', 10) || 0;
  },
  jn = function (e) {
    var t = window.getComputedStyle(document.body),
      r = t[e === 'padding' ? 'paddingLeft' : 'marginLeft'],
      n = t[e === 'padding' ? 'paddingTop' : 'marginTop'],
      o = t[e === 'padding' ? 'paddingRight' : 'marginRight'];
    return [Le(r), Le(n), Le(o)];
  },
  Wn = function (e) {
    if ((e === void 0 && (e = 'margin'), typeof window > 'u')) return Dn;
    var t = jn(e),
      r = document.documentElement.clientWidth,
      n = window.innerWidth;
    return {
      left: t[0],
      top: t[1],
      right: t[2],
      gap: Math.max(0, n - r + t[2] - t[0]),
    };
  },
  _n = Wt(),
  Q = 'data-scroll-locked',
  Vn = function (e, t, r, n) {
    var o = e.left,
      a = e.top,
      c = e.right,
      s = e.gap;
    return (
      r === void 0 && (r = 'margin'),
      `
  .`
        .concat(
          xn,
          ` {
   overflow: hidden `,
        )
        .concat(
          n,
          `;
   padding-right: `,
        )
        .concat(s, 'px ')
        .concat(
          n,
          `;
  }
  body[`,
        )
        .concat(
          Q,
          `] {
    overflow: hidden `,
        )
        .concat(
          n,
          `;
    overscroll-behavior: contain;
    `,
        )
        .concat(
          [
            t && 'position: relative '.concat(n, ';'),
            r === 'margin' &&
              `
    padding-left: `
                .concat(
                  o,
                  `px;
    padding-top: `,
                )
                .concat(
                  a,
                  `px;
    padding-right: `,
                )
                .concat(
                  c,
                  `px;
    margin-left:0;
    margin-top:0;
    margin-right: `,
                )
                .concat(s, 'px ')
                .concat(
                  n,
                  `;
    `,
                ),
            r === 'padding' &&
              'padding-right: '.concat(s, 'px ').concat(n, ';'),
          ]
            .filter(Boolean)
            .join(''),
          `
  }
  
  .`,
        )
        .concat(
          he,
          ` {
    right: `,
        )
        .concat(s, 'px ')
        .concat(
          n,
          `;
  }
  
  .`,
        )
        .concat(
          ve,
          ` {
    margin-right: `,
        )
        .concat(s, 'px ')
        .concat(
          n,
          `;
  }
  
  .`,
        )
        .concat(he, ' .')
        .concat(
          he,
          ` {
    right: 0 `,
        )
        .concat(
          n,
          `;
  }
  
  .`,
        )
        .concat(ve, ' .')
        .concat(
          ve,
          ` {
    margin-right: 0 `,
        )
        .concat(
          n,
          `;
  }
  
  body[`,
        )
        .concat(
          Q,
          `] {
    `,
        )
        .concat(En, ': ')
        .concat(
          s,
          `px;
  }
`,
        )
    );
  },
  ut = function () {
    var e = parseInt(document.body.getAttribute(Q) || '0', 10);
    return isFinite(e) ? e : 0;
  },
  Bn = function () {
    i.useEffect(function () {
      return (
        document.body.setAttribute(Q, (ut() + 1).toString()),
        function () {
          var e = ut() - 1;
          e <= 0
            ? document.body.removeAttribute(Q)
            : document.body.setAttribute(Q, e.toString());
        }
      );
    }, []);
  },
  Hn = function (e) {
    var t = e.noRelative,
      r = e.noImportant,
      n = e.gapMode,
      o = n === void 0 ? 'margin' : n;
    Bn();
    var a = i.useMemo(
      function () {
        return Wn(o);
      },
      [o],
    );
    return i.createElement(_n, { styles: Vn(a, !t, o, r ? '' : '!important') });
  },
  _e = !1;
if (typeof window < 'u')
  try {
    var de = Object.defineProperty({}, 'passive', {
      get: function () {
        return ((_e = !0), !0);
      },
    });
    (window.addEventListener('test', de, de),
      window.removeEventListener('test', de, de));
  } catch {
    _e = !1;
  }
var X = _e ? { passive: !1 } : !1,
  Un = function (e) {
    return e.tagName === 'TEXTAREA';
  },
  _t = function (e, t) {
    if (!(e instanceof Element)) return !1;
    var r = window.getComputedStyle(e);
    return (
      r[t] !== 'hidden' &&
      !(r.overflowY === r.overflowX && !Un(e) && r[t] === 'visible')
    );
  },
  Gn = function (e) {
    return _t(e, 'overflowY');
  },
  $n = function (e) {
    return _t(e, 'overflowX');
  },
  dt = function (e, t) {
    var r = t.ownerDocument,
      n = t;
    do {
      typeof ShadowRoot < 'u' && n instanceof ShadowRoot && (n = n.host);
      var o = Vt(e, n);
      if (o) {
        var a = Bt(e, n),
          c = a[1],
          s = a[2];
        if (c > s) return !0;
      }
      n = n.parentNode;
    } while (n && n !== r.body);
    return !1;
  },
  qn = function (e) {
    var t = e.scrollTop,
      r = e.scrollHeight,
      n = e.clientHeight;
    return [t, r, n];
  },
  Kn = function (e) {
    var t = e.scrollLeft,
      r = e.scrollWidth,
      n = e.clientWidth;
    return [t, r, n];
  },
  Vt = function (e, t) {
    return e === 'v' ? Gn(t) : $n(t);
  },
  Bt = function (e, t) {
    return e === 'v' ? qn(t) : Kn(t);
  },
  Xn = function (e, t) {
    return e === 'h' && t === 'rtl' ? -1 : 1;
  },
  Yn = function (e, t, r, n, o) {
    var a = Xn(e, window.getComputedStyle(t).direction),
      c = a * n,
      s = r.target,
      l = t.contains(s),
      u = !1,
      d = c > 0,
      m = 0,
      p = 0;
    do {
      if (!s) break;
      var g = Bt(e, s),
        k = g[0],
        f = g[1],
        b = g[2],
        x = f - b - a * k;
      (k || x) && Vt(e, s) && ((m += x), (p += k));
      var M = s.parentNode;
      s = M && M.nodeType === Node.DOCUMENT_FRAGMENT_NODE ? M.host : M;
    } while ((!l && s !== document.body) || (l && (t.contains(s) || t === s)));
    return (((d && Math.abs(m) < 1) || (!d && Math.abs(p) < 1)) && (u = !0), u);
  },
  fe = function (e) {
    return 'changedTouches' in e
      ? [e.changedTouches[0].clientX, e.changedTouches[0].clientY]
      : [0, 0];
  },
  ft = function (e) {
    return [e.deltaX, e.deltaY];
  },
  mt = function (e) {
    return e && 'current' in e ? e.current : e;
  },
  Zn = function (e, t) {
    return e[0] === t[0] && e[1] === t[1];
  },
  Qn = function (e) {
    return `
  .block-interactivity-`
      .concat(
        e,
        ` {pointer-events: none;}
  .allow-interactivity-`,
      )
      .concat(
        e,
        ` {pointer-events: all;}
`,
      );
  },
  Jn = 0,
  Y = [];
function eo(e) {
  var t = i.useRef([]),
    r = i.useRef([0, 0]),
    n = i.useRef(),
    o = i.useState(Jn++)[0],
    a = i.useState(Wt)[0],
    c = i.useRef(e);
  (i.useEffect(
    function () {
      c.current = e;
    },
    [e],
  ),
    i.useEffect(
      function () {
        if (e.inert) {
          document.body.classList.add('block-interactivity-'.concat(o));
          var f = kn([e.lockRef.current], (e.shards || []).map(mt), !0).filter(
            Boolean,
          );
          return (
            f.forEach(function (b) {
              return b.classList.add('allow-interactivity-'.concat(o));
            }),
            function () {
              (document.body.classList.remove('block-interactivity-'.concat(o)),
                f.forEach(function (b) {
                  return b.classList.remove('allow-interactivity-'.concat(o));
                }));
            }
          );
        }
      },
      [e.inert, e.lockRef.current, e.shards],
    ));
  var s = i.useCallback(function (f, b) {
      if (
        ('touches' in f && f.touches.length === 2) ||
        (f.type === 'wheel' && f.ctrlKey)
      )
        return !c.current.allowPinchZoom;
      var x = fe(f),
        M = r.current,
        P = 'deltaX' in f ? f.deltaX : M[0] - x[0],
        N = 'deltaY' in f ? f.deltaY : M[1] - x[1],
        E,
        R = f.target,
        C = Math.abs(P) > Math.abs(N) ? 'h' : 'v';
      if ('touches' in f && C === 'h' && R.type === 'range') return !1;
      var y = dt(C, R);
      if (!y) return !0;
      if ((y ? (E = C) : ((E = C === 'v' ? 'h' : 'v'), (y = dt(C, R))), !y))
        return !1;
      if (
        (!n.current && 'changedTouches' in f && (P || N) && (n.current = E), !E)
      )
        return !0;
      var T = n.current || E;
      return Yn(T, b, f, T === 'h' ? P : N);
    }, []),
    l = i.useCallback(function (f) {
      var b = f;
      if (!(!Y.length || Y[Y.length - 1] !== a)) {
        var x = 'deltaY' in b ? ft(b) : fe(b),
          M = t.current.filter(function (E) {
            return (
              E.name === b.type &&
              (E.target === b.target || b.target === E.shadowParent) &&
              Zn(E.delta, x)
            );
          })[0];
        if (M && M.should) {
          b.cancelable && b.preventDefault();
          return;
        }
        if (!M) {
          var P = (c.current.shards || [])
              .map(mt)
              .filter(Boolean)
              .filter(function (E) {
                return E.contains(b.target);
              }),
            N = P.length > 0 ? s(b, P[0]) : !c.current.noIsolation;
          N && b.cancelable && b.preventDefault();
        }
      }
    }, []),
    u = i.useCallback(function (f, b, x, M) {
      var P = { name: f, delta: b, target: x, should: M, shadowParent: to(x) };
      (t.current.push(P),
        setTimeout(function () {
          t.current = t.current.filter(function (N) {
            return N !== P;
          });
        }, 1));
    }, []),
    d = i.useCallback(function (f) {
      ((r.current = fe(f)), (n.current = void 0));
    }, []),
    m = i.useCallback(function (f) {
      u(f.type, ft(f), f.target, s(f, e.lockRef.current));
    }, []),
    p = i.useCallback(function (f) {
      u(f.type, fe(f), f.target, s(f, e.lockRef.current));
    }, []);
  i.useEffect(function () {
    return (
      Y.push(a),
      e.setCallbacks({
        onScrollCapture: m,
        onWheelCapture: m,
        onTouchMoveCapture: p,
      }),
      document.addEventListener('wheel', l, X),
      document.addEventListener('touchmove', l, X),
      document.addEventListener('touchstart', d, X),
      function () {
        ((Y = Y.filter(function (f) {
          return f !== a;
        })),
          document.removeEventListener('wheel', l, X),
          document.removeEventListener('touchmove', l, X),
          document.removeEventListener('touchstart', d, X));
      }
    );
  }, []);
  var g = e.removeScrollBar,
    k = e.inert;
  return i.createElement(
    i.Fragment,
    null,
    k ? i.createElement(a, { styles: Qn(o) }) : null,
    g
      ? i.createElement(Hn, { noRelative: e.noRelative, gapMode: e.gapMode })
      : null,
  );
}
function to(e) {
  for (var t = null; e !== null; )
    (e instanceof ShadowRoot && ((t = e.host), (e = e.host)),
      (e = e.parentNode));
  return t;
}
const ro = Nn(jt, eo);
var no = i.forwardRef(function (e, t) {
  return i.createElement(be, D({}, e, { ref: t, sideCar: ro }));
});
no.classNames = be.classNames;
var oo = function (e) {
    if (typeof document > 'u') return null;
    var t = Array.isArray(e) ? e[0] : e;
    return t.ownerDocument.body;
  },
  Z = new WeakMap(),
  me = new WeakMap(),
  pe = {},
  Ie = 0,
  Ht = function (e) {
    return e && (e.host || Ht(e.parentNode));
  },
  ao = function (e, t) {
    return t
      .map(function (r) {
        if (e.contains(r)) return r;
        var n = Ht(r);
        return n && e.contains(n)
          ? n
          : (console.error(
              'aria-hidden',
              r,
              'in not contained inside',
              e,
              '. Doing nothing',
            ),
            null);
      })
      .filter(function (r) {
        return !!r;
      });
  },
  so = function (e, t, r, n) {
    var o = ao(t, Array.isArray(e) ? e : [e]);
    pe[r] || (pe[r] = new WeakMap());
    var a = pe[r],
      c = [],
      s = new Set(),
      l = new Set(o),
      u = function (m) {
        !m || s.has(m) || (s.add(m), u(m.parentNode));
      };
    o.forEach(u);
    var d = function (m) {
      !m ||
        l.has(m) ||
        Array.prototype.forEach.call(m.children, function (p) {
          if (s.has(p)) d(p);
          else
            try {
              var g = p.getAttribute(n),
                k = g !== null && g !== 'false',
                f = (Z.get(p) || 0) + 1,
                b = (a.get(p) || 0) + 1;
              (Z.set(p, f),
                a.set(p, b),
                c.push(p),
                f === 1 && k && me.set(p, !0),
                b === 1 && p.setAttribute(r, 'true'),
                k || p.setAttribute(n, 'true'));
            } catch (x) {
              console.error('aria-hidden: cannot operate on ', p, x);
            }
        });
    };
    return (
      d(t),
      s.clear(),
      Ie++,
      function () {
        (c.forEach(function (m) {
          var p = Z.get(m) - 1,
            g = a.get(m) - 1;
          (Z.set(m, p),
            a.set(m, g),
            p || (me.has(m) || m.removeAttribute(n), me.delete(m)),
            g || m.removeAttribute(r));
        }),
          Ie--,
          Ie ||
            ((Z = new WeakMap()),
            (Z = new WeakMap()),
            (me = new WeakMap()),
            (pe = {})));
      }
    );
  },
  Xo = function (e, t, r) {
    r === void 0 && (r = 'data-aria-hidden');
    var n = Array.from(Array.isArray(e) ? e : [e]),
      o = oo(e);
    return o
      ? (n.push.apply(n, Array.from(o.querySelectorAll('[aria-live], script'))),
        so(n, o, r, 'aria-hidden'))
      : function () {
          return null;
        };
  };
function Ut(e) {
  var t,
    r,
    n = '';
  if (typeof e == 'string' || typeof e == 'number') n += e;
  else if (typeof e == 'object')
    if (Array.isArray(e)) {
      var o = e.length;
      for (t = 0; t < o; t++)
        e[t] && (r = Ut(e[t])) && (n && (n += ' '), (n += r));
    } else for (r in e) e[r] && (n && (n += ' '), (n += r));
  return n;
}
function io() {
  for (var e, t, r = 0, n = '', o = arguments.length; r < o; r++)
    (e = arguments[r]) && (t = Ut(e)) && (n && (n += ' '), (n += t));
  return n;
}
const pt = (e) => (typeof e == 'boolean' ? `${e}` : e === 0 ? '0' : e),
  ht = io,
  co = (e, t) => (r) => {
    var n;
    if (t?.variants == null) return ht(e, r?.class, r?.className);
    const { variants: o, defaultVariants: a } = t,
      c = Object.keys(o).map((u) => {
        const d = r?.[u],
          m = a?.[u];
        if (d === null) return null;
        const p = pt(d) || pt(m);
        return o[u][p];
      }),
      s =
        r &&
        Object.entries(r).reduce((u, d) => {
          let [m, p] = d;
          return (p === void 0 || (u[m] = p), u);
        }, {}),
      l =
        t == null || (n = t.compoundVariants) === null || n === void 0
          ? void 0
          : n.reduce((u, d) => {
              let { class: m, className: p, ...g } = d;
              return Object.entries(g).every((k) => {
                let [f, b] = k;
                return Array.isArray(b)
                  ? b.includes({ ...a, ...s }[f])
                  : { ...a, ...s }[f] === b;
              })
                ? [...u, m, p]
                : u;
            }, []);
    return ht(e, c, l, r?.class, r?.className);
  },
  vt = {
    primary: 'bg-fd-primary text-fd-primary-foreground hover:bg-fd-primary/80',
    outline: 'border hover:bg-fd-accent hover:text-fd-accent-foreground',
    ghost: 'hover:bg-fd-accent hover:text-fd-accent-foreground',
    secondary:
      'border bg-fd-secondary text-fd-secondary-foreground hover:bg-fd-accent hover:text-fd-accent-foreground',
  },
  Yo = co(
    'inline-flex items-center justify-center rounded-md p-2 text-sm font-medium transition-colors duration-100 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring',
    {
      variants: {
        variant: vt,
        color: vt,
        size: {
          sm: 'gap-1 px-2 py-1.5 text-xs',
          icon: 'p-1.5 [&_svg]:size-5',
          'icon-sm': 'p-1.5 [&_svg]:size-4.5',
          'icon-xs': 'p-1 [&_svg]:size-4',
        },
      },
    },
  );
export {
  zo as $,
  To as A,
  go as B,
  Eo as C,
  nn as D,
  tr as E,
  un as F,
  ho as G,
  Uo as H,
  rr as I,
  fo as J,
  xo as K,
  Co as L,
  Ao as M,
  Bo as N,
  jo as O,
  He as P,
  Ro as Q,
  no as R,
  Po as S,
  Mo as T,
  Io as U,
  So as V,
  Ho as W,
  Wo as X,
  Vo as Y,
  Oo as Z,
  Lo as _,
  vo as a,
  Fo as a0,
  _o as a1,
  Do as a2,
  yo as a3,
  $o as b,
  wt as c,
  Go as d,
  ye as e,
  Pe as f,
  yn as g,
  ge as h,
  Ot as i,
  re as j,
  po as k,
  qo as l,
  Qr as m,
  co as n,
  Yo as o,
  bo as p,
  Gr as q,
  wo as r,
  No as s,
  Dr as t,
  nr as u,
  Xo as v,
  Ko as w,
  ko as x,
  mo as y,
  uo as z,
};
