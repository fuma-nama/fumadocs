function ba(e, t) {
  for (var r = 0; r < t.length; r++) {
    const n = t[r];
    if (typeof n != 'string' && !Array.isArray(n)) {
      for (const a in n)
        if (a !== 'default' && !(a in e)) {
          const o = Object.getOwnPropertyDescriptor(n, a);
          o &&
            Object.defineProperty(
              e,
              a,
              o.get ? o : { enumerable: !0, get: () => n[a] },
            );
        }
    }
  }
  return Object.freeze(
    Object.defineProperty(e, Symbol.toStringTag, { value: 'Module' }),
  );
}
function vn(e) {
  return e && e.__esModule && Object.prototype.hasOwnProperty.call(e, 'default')
    ? e.default
    : e;
}
var Bt = { exports: {} },
  nt = {};
/**
 * @license React
 * react-jsx-runtime.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */ var Ur;
function Ca() {
  if (Ur) return nt;
  Ur = 1;
  var e = Symbol.for('react.transitional.element'),
    t = Symbol.for('react.fragment');
  function r(n, a, o) {
    var s = null;
    if (
      (o !== void 0 && (s = '' + o),
      a.key !== void 0 && (s = '' + a.key),
      'key' in a)
    ) {
      o = {};
      for (var u in a) u !== 'key' && (o[u] = a[u]);
    } else o = a;
    return (
      (a = o.ref),
      { $$typeof: e, type: n, key: s, ref: a !== void 0 ? a : null, props: o }
    );
  }
  return ((nt.Fragment = t), (nt.jsx = r), (nt.jsxs = r), nt);
}
var zr;
function xa() {
  return (zr || ((zr = 1), (Bt.exports = Ca())), Bt.exports);
}
var Nl = xa(),
  Wt = { exports: {} },
  z = {};
/**
 * @license React
 * react.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */ var Br;
function La() {
  if (Br) return z;
  Br = 1;
  var e = Symbol.for('react.transitional.element'),
    t = Symbol.for('react.portal'),
    r = Symbol.for('react.fragment'),
    n = Symbol.for('react.strict_mode'),
    a = Symbol.for('react.profiler'),
    o = Symbol.for('react.consumer'),
    s = Symbol.for('react.context'),
    u = Symbol.for('react.forward_ref'),
    l = Symbol.for('react.suspense'),
    i = Symbol.for('react.memo'),
    c = Symbol.for('react.lazy'),
    d = Symbol.for('react.activity'),
    p = Symbol.iterator;
  function g(m) {
    return m === null || typeof m != 'object'
      ? null
      : ((m = (p && m[p]) || m['@@iterator']),
        typeof m == 'function' ? m : null);
  }
  var R = {
      isMounted: function () {
        return !1;
      },
      enqueueForceUpdate: function () {},
      enqueueReplaceState: function () {},
      enqueueSetState: function () {},
    },
    P = Object.assign,
    E = {};
  function S(m, C, F) {
    ((this.props = m),
      (this.context = C),
      (this.refs = E),
      (this.updater = F || R));
  }
  ((S.prototype.isReactComponent = {}),
    (S.prototype.setState = function (m, C) {
      if (typeof m != 'object' && typeof m != 'function' && m != null)
        throw Error(
          'takes an object of state variables to update or a function which returns an object of state variables.',
        );
      this.updater.enqueueSetState(this, m, C, 'setState');
    }),
    (S.prototype.forceUpdate = function (m) {
      this.updater.enqueueForceUpdate(this, m, 'forceUpdate');
    }));
  function b() {}
  b.prototype = S.prototype;
  function D(m, C, F) {
    ((this.props = m),
      (this.context = C),
      (this.refs = E),
      (this.updater = F || R));
  }
  var M = (D.prototype = new b());
  ((M.constructor = D), P(M, S.prototype), (M.isPureReactComponent = !0));
  var _ = Array.isArray;
  function y() {}
  var L = { H: null, A: null, T: null, S: null },
    B = Object.prototype.hasOwnProperty;
  function U(m, C, F) {
    var j = F.ref;
    return {
      $$typeof: e,
      type: m,
      key: C,
      ref: j !== void 0 ? j : null,
      props: F,
    };
  }
  function J(m, C) {
    return U(m.type, C, m.props);
  }
  function ae(m) {
    return typeof m == 'object' && m !== null && m.$$typeof === e;
  }
  function Re(m) {
    var C = { '=': '=0', ':': '=2' };
    return (
      '$' +
      m.replace(/[=:]/g, function (F) {
        return C[F];
      })
    );
  }
  var q = /\/+/g;
  function Q(m, C) {
    return typeof m == 'object' && m !== null && m.key != null
      ? Re('' + m.key)
      : C.toString(36);
  }
  function ue(m) {
    switch (m.status) {
      case 'fulfilled':
        return m.value;
      case 'rejected':
        throw m.reason;
      default:
        switch (
          (typeof m.status == 'string'
            ? m.then(y, y)
            : ((m.status = 'pending'),
              m.then(
                function (C) {
                  m.status === 'pending' &&
                    ((m.status = 'fulfilled'), (m.value = C));
                },
                function (C) {
                  m.status === 'pending' &&
                    ((m.status = 'rejected'), (m.reason = C));
                },
              )),
          m.status)
        ) {
          case 'fulfilled':
            return m.value;
          case 'rejected':
            throw m.reason;
        }
    }
    throw m;
  }
  function W(m, C, F, j, V) {
    var G = typeof m;
    (G === 'undefined' || G === 'boolean') && (m = null);
    var Z = !1;
    if (m === null) Z = !0;
    else
      switch (G) {
        case 'bigint':
        case 'string':
        case 'number':
          Z = !0;
          break;
        case 'object':
          switch (m.$$typeof) {
            case e:
            case t:
              Z = !0;
              break;
            case c:
              return ((Z = m._init), W(Z(m._payload), C, F, j, V));
          }
      }
    if (Z)
      return (
        (V = V(m)),
        (Z = j === '' ? '.' + Q(m, 0) : j),
        _(V)
          ? ((F = ''),
            Z != null && (F = Z.replace(q, '$&/') + '/'),
            W(V, C, F, '', function (ie) {
              return ie;
            }))
          : V != null &&
            (ae(V) &&
              (V = J(
                V,
                F +
                  (V.key == null || (m && m.key === V.key)
                    ? ''
                    : ('' + V.key).replace(q, '$&/') + '/') +
                  Z,
              )),
            C.push(V)),
        1
      );
    Z = 0;
    var Se = j === '' ? '.' : j + ':';
    if (_(m))
      for (var fe = 0; fe < m.length; fe++)
        ((j = m[fe]), (G = Se + Q(j, fe)), (Z += W(j, C, F, G, V)));
    else if (((fe = g(m)), typeof fe == 'function'))
      for (m = fe.call(m), fe = 0; !(j = m.next()).done; )
        ((j = j.value), (G = Se + Q(j, fe++)), (Z += W(j, C, F, G, V)));
    else if (G === 'object') {
      if (typeof m.then == 'function') return W(ue(m), C, F, j, V);
      throw (
        (C = String(m)),
        Error(
          'Objects are not valid as a React child (found: ' +
            (C === '[object Object]'
              ? 'object with keys {' + Object.keys(m).join(', ') + '}'
              : C) +
            '). If you meant to render a collection of children, use an array instead.',
        )
      );
    }
    return Z;
  }
  function se(m, C, F) {
    if (m == null) return m;
    var j = [],
      V = 0;
    return (
      W(m, j, '', '', function (G) {
        return C.call(F, G, V++);
      }),
      j
    );
  }
  function ce(m) {
    if (m._status === -1) {
      var C = m._result;
      ((C = C()),
        C.then(
          function (F) {
            (m._status === 0 || m._status === -1) &&
              ((m._status = 1), (m._result = F));
          },
          function (F) {
            (m._status === 0 || m._status === -1) &&
              ((m._status = 2), (m._result = F));
          },
        ),
        m._status === -1 && ((m._status = 0), (m._result = C)));
    }
    if (m._status === 1) return m._result.default;
    throw m._result;
  }
  var ve =
      typeof reportError == 'function'
        ? reportError
        : function (m) {
            if (
              typeof window == 'object' &&
              typeof window.ErrorEvent == 'function'
            ) {
              var C = new window.ErrorEvent('error', {
                bubbles: !0,
                cancelable: !0,
                message:
                  typeof m == 'object' &&
                  m !== null &&
                  typeof m.message == 'string'
                    ? String(m.message)
                    : String(m),
                error: m,
              });
              if (!window.dispatchEvent(C)) return;
            } else if (
              typeof process == 'object' &&
              typeof process.emit == 'function'
            ) {
              process.emit('uncaughtException', m);
              return;
            }
            console.error(m);
          },
    de = {
      map: se,
      forEach: function (m, C, F) {
        se(
          m,
          function () {
            C.apply(this, arguments);
          },
          F,
        );
      },
      count: function (m) {
        var C = 0;
        return (
          se(m, function () {
            C++;
          }),
          C
        );
      },
      toArray: function (m) {
        return (
          se(m, function (C) {
            return C;
          }) || []
        );
      },
      only: function (m) {
        if (!ae(m))
          throw Error(
            'React.Children.only expected to receive a single React element child.',
          );
        return m;
      },
    };
  return (
    (z.Activity = d),
    (z.Children = de),
    (z.Component = S),
    (z.Fragment = r),
    (z.Profiler = a),
    (z.PureComponent = D),
    (z.StrictMode = n),
    (z.Suspense = l),
    (z.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = L),
    (z.__COMPILER_RUNTIME = {
      __proto__: null,
      c: function (m) {
        return L.H.useMemoCache(m);
      },
    }),
    (z.cache = function (m) {
      return function () {
        return m.apply(null, arguments);
      };
    }),
    (z.cacheSignal = function () {
      return null;
    }),
    (z.cloneElement = function (m, C, F) {
      if (m == null)
        throw Error(
          'The argument must be a React element, but you passed ' + m + '.',
        );
      var j = P({}, m.props),
        V = m.key;
      if (C != null)
        for (G in (C.key !== void 0 && (V = '' + C.key), C))
          !B.call(C, G) ||
            G === 'key' ||
            G === '__self' ||
            G === '__source' ||
            (G === 'ref' && C.ref === void 0) ||
            (j[G] = C[G]);
      var G = arguments.length - 2;
      if (G === 1) j.children = F;
      else if (1 < G) {
        for (var Z = Array(G), Se = 0; Se < G; Se++) Z[Se] = arguments[Se + 2];
        j.children = Z;
      }
      return U(m.type, V, j);
    }),
    (z.createContext = function (m) {
      return (
        (m = {
          $$typeof: s,
          _currentValue: m,
          _currentValue2: m,
          _threadCount: 0,
          Provider: null,
          Consumer: null,
        }),
        (m.Provider = m),
        (m.Consumer = { $$typeof: o, _context: m }),
        m
      );
    }),
    (z.createElement = function (m, C, F) {
      var j,
        V = {},
        G = null;
      if (C != null)
        for (j in (C.key !== void 0 && (G = '' + C.key), C))
          B.call(C, j) &&
            j !== 'key' &&
            j !== '__self' &&
            j !== '__source' &&
            (V[j] = C[j]);
      var Z = arguments.length - 2;
      if (Z === 1) V.children = F;
      else if (1 < Z) {
        for (var Se = Array(Z), fe = 0; fe < Z; fe++)
          Se[fe] = arguments[fe + 2];
        V.children = Se;
      }
      if (m && m.defaultProps)
        for (j in ((Z = m.defaultProps), Z)) V[j] === void 0 && (V[j] = Z[j]);
      return U(m, G, V);
    }),
    (z.createRef = function () {
      return { current: null };
    }),
    (z.forwardRef = function (m) {
      return { $$typeof: u, render: m };
    }),
    (z.isValidElement = ae),
    (z.lazy = function (m) {
      return { $$typeof: c, _payload: { _status: -1, _result: m }, _init: ce };
    }),
    (z.memo = function (m, C) {
      return { $$typeof: i, type: m, compare: C === void 0 ? null : C };
    }),
    (z.startTransition = function (m) {
      var C = L.T,
        F = {};
      L.T = F;
      try {
        var j = m(),
          V = L.S;
        (V !== null && V(F, j),
          typeof j == 'object' &&
            j !== null &&
            typeof j.then == 'function' &&
            j.then(y, ve));
      } catch (G) {
        ve(G);
      } finally {
        (C !== null && F.types !== null && (C.types = F.types), (L.T = C));
      }
    }),
    (z.unstable_useCacheRefresh = function () {
      return L.H.useCacheRefresh();
    }),
    (z.use = function (m) {
      return L.H.use(m);
    }),
    (z.useActionState = function (m, C, F) {
      return L.H.useActionState(m, C, F);
    }),
    (z.useCallback = function (m, C) {
      return L.H.useCallback(m, C);
    }),
    (z.useContext = function (m) {
      return L.H.useContext(m);
    }),
    (z.useDebugValue = function () {}),
    (z.useDeferredValue = function (m, C) {
      return L.H.useDeferredValue(m, C);
    }),
    (z.useEffect = function (m, C) {
      return L.H.useEffect(m, C);
    }),
    (z.useEffectEvent = function (m) {
      return L.H.useEffectEvent(m);
    }),
    (z.useId = function () {
      return L.H.useId();
    }),
    (z.useImperativeHandle = function (m, C, F) {
      return L.H.useImperativeHandle(m, C, F);
    }),
    (z.useInsertionEffect = function (m, C) {
      return L.H.useInsertionEffect(m, C);
    }),
    (z.useLayoutEffect = function (m, C) {
      return L.H.useLayoutEffect(m, C);
    }),
    (z.useMemo = function (m, C) {
      return L.H.useMemo(m, C);
    }),
    (z.useOptimistic = function (m, C) {
      return L.H.useOptimistic(m, C);
    }),
    (z.useReducer = function (m, C, F) {
      return L.H.useReducer(m, C, F);
    }),
    (z.useRef = function (m) {
      return L.H.useRef(m);
    }),
    (z.useState = function (m) {
      return L.H.useState(m);
    }),
    (z.useSyncExternalStore = function (m, C, F) {
      return L.H.useSyncExternalStore(m, C, F);
    }),
    (z.useTransition = function () {
      return L.H.useTransition();
    }),
    (z.version = '19.2.0'),
    z
  );
}
var Wr;
function gn() {
  return (Wr || ((Wr = 1), (Wt.exports = La())), Wt.exports);
}
var h = gn();
const Pa = vn(h),
  kl = ba({ __proto__: null, default: Pa }, [h]);
var Yt = { exports: {} },
  me = {};
/**
 * @license React
 * react-dom.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */ var Yr;
function Ta() {
  if (Yr) return me;
  Yr = 1;
  var e = gn();
  function t(l) {
    var i = 'https://react.dev/errors/' + l;
    if (1 < arguments.length) {
      i += '?args[]=' + encodeURIComponent(arguments[1]);
      for (var c = 2; c < arguments.length; c++)
        i += '&args[]=' + encodeURIComponent(arguments[c]);
    }
    return (
      'Minified React error #' +
      l +
      '; visit ' +
      i +
      ' for the full message or use the non-minified dev environment for full errors and additional helpful warnings.'
    );
  }
  function r() {}
  var n = {
      d: {
        f: r,
        r: function () {
          throw Error(t(522));
        },
        D: r,
        C: r,
        L: r,
        m: r,
        X: r,
        S: r,
        M: r,
      },
      p: 0,
      findDOMNode: null,
    },
    a = Symbol.for('react.portal');
  function o(l, i, c) {
    var d =
      3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
    return {
      $$typeof: a,
      key: d == null ? null : '' + d,
      children: l,
      containerInfo: i,
      implementation: c,
    };
  }
  var s = e.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  function u(l, i) {
    if (l === 'font') return '';
    if (typeof i == 'string') return i === 'use-credentials' ? i : '';
  }
  return (
    (me.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = n),
    (me.createPortal = function (l, i) {
      var c =
        2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
      if (!i || (i.nodeType !== 1 && i.nodeType !== 9 && i.nodeType !== 11))
        throw Error(t(299));
      return o(l, i, null, c);
    }),
    (me.flushSync = function (l) {
      var i = s.T,
        c = n.p;
      try {
        if (((s.T = null), (n.p = 2), l)) return l();
      } finally {
        ((s.T = i), (n.p = c), n.d.f());
      }
    }),
    (me.preconnect = function (l, i) {
      typeof l == 'string' &&
        (i
          ? ((i = i.crossOrigin),
            (i =
              typeof i == 'string'
                ? i === 'use-credentials'
                  ? i
                  : ''
                : void 0))
          : (i = null),
        n.d.C(l, i));
    }),
    (me.prefetchDNS = function (l) {
      typeof l == 'string' && n.d.D(l);
    }),
    (me.preinit = function (l, i) {
      if (typeof l == 'string' && i && typeof i.as == 'string') {
        var c = i.as,
          d = u(c, i.crossOrigin),
          p = typeof i.integrity == 'string' ? i.integrity : void 0,
          g = typeof i.fetchPriority == 'string' ? i.fetchPriority : void 0;
        c === 'style'
          ? n.d.S(l, typeof i.precedence == 'string' ? i.precedence : void 0, {
              crossOrigin: d,
              integrity: p,
              fetchPriority: g,
            })
          : c === 'script' &&
            n.d.X(l, {
              crossOrigin: d,
              integrity: p,
              fetchPriority: g,
              nonce: typeof i.nonce == 'string' ? i.nonce : void 0,
            });
      }
    }),
    (me.preinitModule = function (l, i) {
      if (typeof l == 'string')
        if (typeof i == 'object' && i !== null) {
          if (i.as == null || i.as === 'script') {
            var c = u(i.as, i.crossOrigin);
            n.d.M(l, {
              crossOrigin: c,
              integrity: typeof i.integrity == 'string' ? i.integrity : void 0,
              nonce: typeof i.nonce == 'string' ? i.nonce : void 0,
            });
          }
        } else i == null && n.d.M(l);
    }),
    (me.preload = function (l, i) {
      if (
        typeof l == 'string' &&
        typeof i == 'object' &&
        i !== null &&
        typeof i.as == 'string'
      ) {
        var c = i.as,
          d = u(c, i.crossOrigin);
        n.d.L(l, c, {
          crossOrigin: d,
          integrity: typeof i.integrity == 'string' ? i.integrity : void 0,
          nonce: typeof i.nonce == 'string' ? i.nonce : void 0,
          type: typeof i.type == 'string' ? i.type : void 0,
          fetchPriority:
            typeof i.fetchPriority == 'string' ? i.fetchPriority : void 0,
          referrerPolicy:
            typeof i.referrerPolicy == 'string' ? i.referrerPolicy : void 0,
          imageSrcSet:
            typeof i.imageSrcSet == 'string' ? i.imageSrcSet : void 0,
          imageSizes: typeof i.imageSizes == 'string' ? i.imageSizes : void 0,
          media: typeof i.media == 'string' ? i.media : void 0,
        });
      }
    }),
    (me.preloadModule = function (l, i) {
      if (typeof l == 'string')
        if (i) {
          var c = u(i.as, i.crossOrigin);
          n.d.m(l, {
            as: typeof i.as == 'string' && i.as !== 'script' ? i.as : void 0,
            crossOrigin: c,
            integrity: typeof i.integrity == 'string' ? i.integrity : void 0,
          });
        } else n.d.m(l);
    }),
    (me.requestFormReset = function (l) {
      n.d.r(l);
    }),
    (me.unstable_batchedUpdates = function (l, i) {
      return l(i);
    }),
    (me.useFormState = function (l, i, c) {
      return s.H.useFormState(l, i, c);
    }),
    (me.useFormStatus = function () {
      return s.H.useHostTransitionStatus();
    }),
    (me.version = '19.2.0'),
    me
  );
}
var Vr;
function _a() {
  if (Vr) return Yt.exports;
  Vr = 1;
  function e() {
    if (
      !(
        typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > 'u' ||
        typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != 'function'
      )
    )
      try {
        __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(e);
      } catch (t) {
        console.error(t);
      }
  }
  return (e(), (Yt.exports = Ta()), Yt.exports);
}
/**
 * react-router v7.9.4
 *
 * Copyright (c) Remix Software Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.md file in the root directory of this source tree.
 *
 * @license MIT
 */ var wn = (e) => {
    throw TypeError(e);
  },
  Ma = (e, t, r) => t.has(e) || wn('Cannot ' + r),
  Vt = (e, t, r) => (
    Ma(e, t, 'read from private field'),
    r ? r.call(e) : t.get(e)
  ),
  Da = (e, t, r) =>
    t.has(e)
      ? wn('Cannot add the same private member more than once')
      : t instanceof WeakSet
        ? t.add(e)
        : t.set(e, r),
  Jr = 'popstate';
function Il(e = {}) {
  function t(n, a) {
    let { pathname: o, search: s, hash: u } = n.location;
    return st(
      '',
      { pathname: o, search: s, hash: u },
      (a.state && a.state.usr) || null,
      (a.state && a.state.key) || 'default',
    );
  }
  function r(n, a) {
    return typeof a == 'string' ? a : Ie(a);
  }
  return Aa(t, r, null, e);
}
function Y(e, t) {
  if (e === !1 || e === null || typeof e > 'u') throw new Error(t);
}
function ne(e, t) {
  if (!e) {
    typeof console < 'u' && console.warn(t);
    try {
      throw new Error(t);
    } catch {}
  }
}
function Oa() {
  return Math.random().toString(36).substring(2, 10);
}
function Gr(e, t) {
  return { usr: e.state, key: e.key, idx: t };
}
function st(e, t, r = null, n) {
  return {
    pathname: typeof e == 'string' ? e : e.pathname,
    search: '',
    hash: '',
    ...(typeof t == 'string' ? $e(t) : t),
    state: r,
    key: (t && t.key) || n || Oa(),
  };
}
function Ie({ pathname: e = '/', search: t = '', hash: r = '' }) {
  return (
    t && t !== '?' && (e += t.charAt(0) === '?' ? t : '?' + t),
    r && r !== '#' && (e += r.charAt(0) === '#' ? r : '#' + r),
    e
  );
}
function $e(e) {
  let t = {};
  if (e) {
    let r = e.indexOf('#');
    r >= 0 && ((t.hash = e.substring(r)), (e = e.substring(0, r)));
    let n = e.indexOf('?');
    (n >= 0 && ((t.search = e.substring(n)), (e = e.substring(0, n))),
      e && (t.pathname = e));
  }
  return t;
}
function Aa(e, t, r, n = {}) {
  let { window: a = document.defaultView, v5Compat: o = !1 } = n,
    s = a.history,
    u = 'POP',
    l = null,
    i = c();
  i == null && ((i = 0), s.replaceState({ ...s.state, idx: i }, ''));
  function c() {
    return (s.state || { idx: null }).idx;
  }
  function d() {
    u = 'POP';
    let E = c(),
      S = E == null ? null : E - i;
    ((i = E), l && l({ action: u, location: P.location, delta: S }));
  }
  function p(E, S) {
    u = 'PUSH';
    let b = st(P.location, E, S);
    i = c() + 1;
    let D = Gr(b, i),
      M = P.createHref(b);
    try {
      s.pushState(D, '', M);
    } catch (_) {
      if (_ instanceof DOMException && _.name === 'DataCloneError') throw _;
      a.location.assign(M);
    }
    o && l && l({ action: u, location: P.location, delta: 1 });
  }
  function g(E, S) {
    u = 'REPLACE';
    let b = st(P.location, E, S);
    i = c();
    let D = Gr(b, i),
      M = P.createHref(b);
    (s.replaceState(D, '', M),
      o && l && l({ action: u, location: P.location, delta: 0 }));
  }
  function R(E) {
    return En(E);
  }
  let P = {
    get action() {
      return u;
    },
    get location() {
      return e(a, s);
    },
    listen(E) {
      if (l) throw new Error('A history only accepts one active listener');
      return (
        a.addEventListener(Jr, d),
        (l = E),
        () => {
          (a.removeEventListener(Jr, d), (l = null));
        }
      );
    },
    createHref(E) {
      return t(a, E);
    },
    createURL: R,
    encodeLocation(E) {
      let S = R(E);
      return { pathname: S.pathname, search: S.search, hash: S.hash };
    },
    push: p,
    replace: g,
    go(E) {
      return s.go(E);
    },
  };
  return P;
}
function En(e, t = !1) {
  let r = 'http://localhost';
  (typeof window < 'u' &&
    (r =
      window.location.origin !== 'null'
        ? window.location.origin
        : window.location.href),
    Y(r, 'No window.location.(origin|href) available to create URL'));
  let n = typeof e == 'string' ? e : Ie(e);
  return (
    (n = n.replace(/ $/, '%20')),
    !t && n.startsWith('//') && (n = r + n),
    new URL(n, r)
  );
}
var lt,
  Xr = class {
    constructor(e) {
      if ((Da(this, lt, new Map()), e)) for (let [t, r] of e) this.set(t, r);
    }
    get(e) {
      if (Vt(this, lt).has(e)) return Vt(this, lt).get(e);
      if (e.defaultValue !== void 0) return e.defaultValue;
      throw new Error('No value found for context');
    }
    set(e, t) {
      Vt(this, lt).set(e, t);
    }
  };
lt = new WeakMap();
var Na = new Set(['lazy', 'caseSensitive', 'path', 'id', 'index', 'children']);
function ka(e) {
  return Na.has(e);
}
var Ia = new Set([
  'lazy',
  'caseSensitive',
  'path',
  'id',
  'index',
  'middleware',
  'children',
]);
function $a(e) {
  return Ia.has(e);
}
function Fa(e) {
  return e.index === !0;
}
function ut(e, t, r = [], n = {}, a = !1) {
  return e.map((o, s) => {
    let u = [...r, String(s)],
      l = typeof o.id == 'string' ? o.id : u.join('-');
    if (
      (Y(
        o.index !== !0 || !o.children,
        'Cannot specify children on an index route',
      ),
      Y(
        a || !n[l],
        `Found a route id collision on id "${l}".  Route id's must be globally unique within Data Router usages`,
      ),
      Fa(o))
    ) {
      let i = { ...o, ...t(o), id: l };
      return ((n[l] = i), i);
    } else {
      let i = { ...o, ...t(o), id: l, children: void 0 };
      return (
        (n[l] = i),
        o.children && (i.children = ut(o.children, t, u, n, a)),
        i
      );
    }
  });
}
function Ae(e, t, r = '/') {
  return Lt(e, t, r, !1);
}
function Lt(e, t, r, n) {
  let a = typeof t == 'string' ? $e(t) : t,
    o = Ee(a.pathname || '/', r);
  if (o == null) return null;
  let s = Sn(e);
  ja(s);
  let u = null;
  for (let l = 0; u == null && l < s.length; ++l) {
    let i = Xa(o);
    u = Ga(s[l], i, n);
  }
  return u;
}
function Rn(e, t) {
  let { route: r, pathname: n, params: a } = e;
  return {
    id: r.id,
    pathname: n,
    params: a,
    data: t[r.id],
    loaderData: t[r.id],
    handle: r.handle,
  };
}
function Sn(e, t = [], r = [], n = '', a = !1) {
  let o = (s, u, l = a, i) => {
    let c = {
      relativePath: i === void 0 ? s.path || '' : i,
      caseSensitive: s.caseSensitive === !0,
      childrenIndex: u,
      route: s,
    };
    if (c.relativePath.startsWith('/')) {
      if (!c.relativePath.startsWith(n) && l) return;
      (Y(
        c.relativePath.startsWith(n),
        `Absolute route path "${c.relativePath}" nested under path "${n}" is not valid. An absolute child route path must start with the combined path of all its parent routes.`,
      ),
        (c.relativePath = c.relativePath.slice(n.length)));
    }
    let d = Pe([n, c.relativePath]),
      p = r.concat(c);
    (s.children &&
      s.children.length > 0 &&
      (Y(
        s.index !== !0,
        `Index routes must not have child routes. Please remove all child routes from route path "${d}".`,
      ),
      Sn(s.children, t, p, d, l)),
      !(s.path == null && !s.index) &&
        t.push({ path: d, score: Va(d, s.index), routesMeta: p }));
  };
  return (
    e.forEach((s, u) => {
      if (s.path === '' || !s.path?.includes('?')) o(s, u);
      else for (let l of bn(s.path)) o(s, u, !0, l);
    }),
    t
  );
}
function bn(e) {
  let t = e.split('/');
  if (t.length === 0) return [];
  let [r, ...n] = t,
    a = r.endsWith('?'),
    o = r.replace(/\?$/, '');
  if (n.length === 0) return a ? [o, ''] : [o];
  let s = bn(n.join('/')),
    u = [];
  return (
    u.push(...s.map((l) => (l === '' ? o : [o, l].join('/')))),
    a && u.push(...s),
    u.map((l) => (e.startsWith('/') && l === '' ? '/' : l))
  );
}
function ja(e) {
  e.sort((t, r) =>
    t.score !== r.score
      ? r.score - t.score
      : Ja(
          t.routesMeta.map((n) => n.childrenIndex),
          r.routesMeta.map((n) => n.childrenIndex),
        ),
  );
}
var Ha = /^:[\w-]+$/,
  Ua = 3,
  za = 2,
  Ba = 1,
  Wa = 10,
  Ya = -2,
  Kr = (e) => e === '*';
function Va(e, t) {
  let r = e.split('/'),
    n = r.length;
  return (
    r.some(Kr) && (n += Ya),
    t && (n += za),
    r
      .filter((a) => !Kr(a))
      .reduce((a, o) => a + (Ha.test(o) ? Ua : o === '' ? Ba : Wa), n)
  );
}
function Ja(e, t) {
  return e.length === t.length && e.slice(0, -1).every((n, a) => n === t[a])
    ? e[e.length - 1] - t[t.length - 1]
    : 0;
}
function Ga(e, t, r = !1) {
  let { routesMeta: n } = e,
    a = {},
    o = '/',
    s = [];
  for (let u = 0; u < n.length; ++u) {
    let l = n[u],
      i = u === n.length - 1,
      c = o === '/' ? t : t.slice(o.length) || '/',
      d = Dt(
        { path: l.relativePath, caseSensitive: l.caseSensitive, end: i },
        c,
      ),
      p = l.route;
    if (
      (!d &&
        i &&
        r &&
        !n[n.length - 1].route.index &&
        (d = Dt(
          { path: l.relativePath, caseSensitive: l.caseSensitive, end: !1 },
          c,
        )),
      !d)
    )
      return null;
    (Object.assign(a, d.params),
      s.push({
        params: a,
        pathname: Pe([o, d.pathname]),
        pathnameBase: Za(Pe([o, d.pathnameBase])),
        route: p,
      }),
      d.pathnameBase !== '/' && (o = Pe([o, d.pathnameBase])));
  }
  return s;
}
function Dt(e, t) {
  typeof e == 'string' && (e = { path: e, caseSensitive: !1, end: !0 });
  let [r, n] = Cn(e.path, e.caseSensitive, e.end),
    a = t.match(r);
  if (!a) return null;
  let o = a[0],
    s = o.replace(/(.)\/+$/, '$1'),
    u = a.slice(1);
  return {
    params: n.reduce((i, { paramName: c, isOptional: d }, p) => {
      if (c === '*') {
        let R = u[p] || '';
        s = o.slice(0, o.length - R.length).replace(/(.)\/+$/, '$1');
      }
      const g = u[p];
      return (
        d && !g ? (i[c] = void 0) : (i[c] = (g || '').replace(/%2F/g, '/')),
        i
      );
    }, {}),
    pathname: o,
    pathnameBase: s,
    pattern: e,
  };
}
function Cn(e, t = !1, r = !0) {
  ne(
    e === '*' || !e.endsWith('*') || e.endsWith('/*'),
    `Route path "${e}" will be treated as if it were "${e.replace(/\*$/, '/*')}" because the \`*\` character must always follow a \`/\` in the pattern. To get rid of this warning, please change the route path to "${e.replace(/\*$/, '/*')}".`,
  );
  let n = [],
    a =
      '^' +
      e
        .replace(/\/*\*?$/, '')
        .replace(/^\/*/, '/')
        .replace(/[\\.*+^${}|()[\]]/g, '\\$&')
        .replace(
          /\/:([\w-]+)(\?)?/g,
          (s, u, l) => (
            n.push({ paramName: u, isOptional: l != null }),
            l ? '/?([^\\/]+)?' : '/([^\\/]+)'
          ),
        )
        .replace(/\/([\w-]+)\?(\/|$)/g, '(/$1)?$2');
  return (
    e.endsWith('*')
      ? (n.push({ paramName: '*' }),
        (a += e === '*' || e === '/*' ? '(.*)$' : '(?:\\/(.+)|\\/*)$'))
      : r
        ? (a += '\\/*$')
        : e !== '' && e !== '/' && (a += '(?:(?=\\/|$))'),
    [new RegExp(a, t ? void 0 : 'i'), n]
  );
}
function Xa(e) {
  try {
    return e
      .split('/')
      .map((t) => decodeURIComponent(t).replace(/\//g, '%2F'))
      .join('/');
  } catch (t) {
    return (
      ne(
        !1,
        `The URL path "${e}" could not be decoded because it is a malformed URL segment. This is probably due to a bad percent encoding (${t}).`,
      ),
      e
    );
  }
}
function Ee(e, t) {
  if (t === '/') return e;
  if (!e.toLowerCase().startsWith(t.toLowerCase())) return null;
  let r = t.endsWith('/') ? t.length - 1 : t.length,
    n = e.charAt(r);
  return n && n !== '/' ? null : e.slice(r) || '/';
}
function Ka({ basename: e, pathname: t }) {
  return t === '/' ? e : Pe([e, t]);
}
function qa(e, t = '/') {
  let {
    pathname: r,
    search: n = '',
    hash: a = '',
  } = typeof e == 'string' ? $e(e) : e;
  return {
    pathname: r ? (r.startsWith('/') ? r : Qa(r, t)) : t,
    search: eo(n),
    hash: to(a),
  };
}
function Qa(e, t) {
  let r = t.replace(/\/+$/, '').split('/');
  return (
    e.split('/').forEach((a) => {
      a === '..' ? r.length > 1 && r.pop() : a !== '.' && r.push(a);
    }),
    r.length > 1 ? r.join('/') : '/'
  );
}
function Jt(e, t, r, n) {
  return `Cannot include a '${e}' character in a manually specified \`to.${t}\` field [${JSON.stringify(n)}].  Please separate it out to the \`to.${r}\` field. Alternatively you may provide the full path as a string in <Link to="..."> and the router will parse it for you.`;
}
function xn(e) {
  return e.filter(
    (t, r) => r === 0 || (t.route.path && t.route.path.length > 0),
  );
}
function dr(e) {
  let t = xn(e);
  return t.map((r, n) => (n === t.length - 1 ? r.pathname : r.pathnameBase));
}
function fr(e, t, r, n = !1) {
  let a;
  typeof e == 'string'
    ? (a = $e(e))
    : ((a = { ...e }),
      Y(
        !a.pathname || !a.pathname.includes('?'),
        Jt('?', 'pathname', 'search', a),
      ),
      Y(
        !a.pathname || !a.pathname.includes('#'),
        Jt('#', 'pathname', 'hash', a),
      ),
      Y(!a.search || !a.search.includes('#'), Jt('#', 'search', 'hash', a)));
  let o = e === '' || a.pathname === '',
    s = o ? '/' : a.pathname,
    u;
  if (s == null) u = r;
  else {
    let d = t.length - 1;
    if (!n && s.startsWith('..')) {
      let p = s.split('/');
      for (; p[0] === '..'; ) (p.shift(), (d -= 1));
      a.pathname = p.join('/');
    }
    u = d >= 0 ? t[d] : '/';
  }
  let l = qa(a, u),
    i = s && s !== '/' && s.endsWith('/'),
    c = (o || s === '.') && r.endsWith('/');
  return (!l.pathname.endsWith('/') && (i || c) && (l.pathname += '/'), l);
}
var Pe = (e) => e.join('/').replace(/\/\/+/g, '/'),
  Za = (e) => e.replace(/\/+$/, '').replace(/^\/*/, '/'),
  eo = (e) => (!e || e === '?' ? '' : e.startsWith('?') ? e : '?' + e),
  to = (e) => (!e || e === '#' ? '' : e.startsWith('#') ? e : '#' + e),
  ro = class {
    constructor(e, t) {
      ((this.type = 'DataWithResponseInit'),
        (this.data = e),
        (this.init = t || null));
    }
  };
function no(e, t) {
  return new ro(e, typeof t == 'number' ? { status: t } : t);
}
var ao = (e, t = 302) => {
    let r = t;
    typeof r == 'number'
      ? (r = { status: r })
      : typeof r.status > 'u' && (r.status = 302);
    let n = new Headers(r.headers);
    return (n.set('Location', e), new Response(null, { ...r, headers: n }));
  },
  We = class {
    constructor(e, t, r, n = !1) {
      ((this.status = e),
        (this.statusText = t || ''),
        (this.internal = n),
        r instanceof Error
          ? ((this.data = r.toString()), (this.error = r))
          : (this.data = r));
    }
  };
function Ye(e) {
  return (
    e != null &&
    typeof e.status == 'number' &&
    typeof e.statusText == 'string' &&
    typeof e.internal == 'boolean' &&
    'data' in e
  );
}
var Ln = ['POST', 'PUT', 'PATCH', 'DELETE'],
  oo = new Set(Ln),
  io = ['GET', ...Ln],
  lo = new Set(io),
  so = new Set([301, 302, 303, 307, 308]),
  uo = new Set([307, 308]),
  Gt = {
    state: 'idle',
    location: void 0,
    formMethod: void 0,
    formAction: void 0,
    formEncType: void 0,
    formData: void 0,
    json: void 0,
    text: void 0,
  },
  co = {
    state: 'idle',
    data: void 0,
    formMethod: void 0,
    formAction: void 0,
    formEncType: void 0,
    formData: void 0,
    json: void 0,
    text: void 0,
  },
  at = { state: 'unblocked', proceed: void 0, reset: void 0, location: void 0 },
  fo = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i,
  hr = (e) => fo.test(e),
  ho = (e) => ({ hasErrorBoundary: !!e.hasErrorBoundary }),
  Pn = 'remix-router-transitions',
  Tn = Symbol('ResetLoaderData');
function $l(e) {
  const t = e.window ? e.window : typeof window < 'u' ? window : void 0,
    r =
      typeof t < 'u' &&
      typeof t.document < 'u' &&
      typeof t.document.createElement < 'u';
  Y(
    e.routes.length > 0,
    'You must provide a non-empty routes array to createRouter',
  );
  let n = e.hydrationRouteProperties || [],
    a = e.mapRouteProperties || ho,
    o = {},
    s = ut(e.routes, a, void 0, o),
    u,
    l = e.basename || '/';
  l.startsWith('/') || (l = `/${l}`);
  let i = e.dataStrategy || go,
    c = { ...e.future },
    d = null,
    p = new Set(),
    g = null,
    R = null,
    P = null,
    E = e.hydrationData != null,
    S = Ae(s, e.history.location, l),
    b = !1,
    D = null,
    M;
  if (S == null && !e.patchRoutesOnNavigation) {
    let f = be(404, { pathname: e.history.location.pathname }),
      { matches: v, route: w } = Et(s);
    ((M = !0), (S = v), (D = { [w.id]: f }));
  } else if (
    (S &&
      !e.hydrationData &&
      pt(S, s, e.history.location.pathname).active &&
      (S = null),
    S)
  )
    if (S.some((f) => f.route.lazy)) M = !1;
    else if (!S.some((f) => mr(f.route))) M = !0;
    else {
      let f = e.hydrationData ? e.hydrationData.loaderData : null,
        v = e.hydrationData ? e.hydrationData.errors : null;
      if (v) {
        let w = S.findIndex((x) => v[x.route.id] !== void 0);
        M = S.slice(0, w + 1).every((x) => !tr(x.route, f, v));
      } else M = S.every((w) => !tr(w.route, f, v));
    }
  else {
    ((M = !1), (S = []));
    let f = pt(null, s, e.history.location.pathname);
    f.active && f.matches && ((b = !0), (S = f.matches));
  }
  let _,
    y = {
      historyAction: e.history.action,
      location: e.history.location,
      matches: S,
      initialized: M,
      navigation: Gt,
      restoreScrollPosition: e.hydrationData != null ? !1 : null,
      preventScrollReset: !1,
      revalidation: 'idle',
      loaderData: (e.hydrationData && e.hydrationData.loaderData) || {},
      actionData: (e.hydrationData && e.hydrationData.actionData) || null,
      errors: (e.hydrationData && e.hydrationData.errors) || D,
      fetchers: new Map(),
      blockers: new Map(),
    },
    L = 'POP',
    B = !1,
    U,
    J = !1,
    ae = new Map(),
    Re = null,
    q = !1,
    Q = !1,
    ue = new Set(),
    W = new Map(),
    se = 0,
    ce = -1,
    ve = new Map(),
    de = new Set(),
    m = new Map(),
    C = new Map(),
    F = new Set(),
    j = new Map(),
    V,
    G = null;
  function Z() {
    if (
      ((d = e.history.listen(({ action: f, location: v, delta: w }) => {
        if (V) {
          (V(), (V = void 0));
          return;
        }
        ne(
          j.size === 0 || w != null,
          'You are trying to use a blocker on a POP navigation to a location that was not created by @remix-run/router. This will fail silently in production. This can happen if you are navigating outside the router via `window.history.pushState`/`window.location.hash` instead of using router navigation APIs.  This can also happen if you are using createHashRouter and the user manually changes the URL.',
        );
        let x = $r({
          currentLocation: y.location,
          nextLocation: v,
          historyAction: f,
        });
        if (x && w != null) {
          let T = new Promise((A) => {
            V = A;
          });
          (e.history.go(w * -1),
            mt(x, {
              state: 'blocked',
              location: v,
              proceed() {
                (mt(x, {
                  state: 'proceeding',
                  proceed: void 0,
                  reset: void 0,
                  location: v,
                }),
                  T.then(() => e.history.go(w)));
              },
              reset() {
                let A = new Map(y.blockers);
                (A.set(x, at), ie({ blockers: A }));
              },
            }));
          return;
        }
        return Fe(f, v);
      })),
      r)
    ) {
      Ao(t, ae);
      let f = () => No(t, ae);
      (t.addEventListener('pagehide', f),
        (Re = () => t.removeEventListener('pagehide', f)));
    }
    return (
      y.initialized || Fe('POP', y.location, { initialHydration: !0 }),
      _
    );
  }
  function Se() {
    (d && d(),
      Re && Re(),
      p.clear(),
      U && U.abort(),
      y.fetchers.forEach((f, v) => Ht(v)),
      y.blockers.forEach((f, v) => Ir(v)));
  }
  function fe(f) {
    return (p.add(f), () => p.delete(f));
  }
  function ie(f, v = {}) {
    (f.matches &&
      (f.matches = f.matches.map((T) => {
        let A = o[T.route.id],
          k = T.route;
        return k.element !== A.element ||
          k.errorElement !== A.errorElement ||
          k.hydrateFallbackElement !== A.hydrateFallbackElement
          ? { ...T, route: A }
          : T;
      })),
      (y = { ...y, ...f }));
    let w = [],
      x = [];
    (y.fetchers.forEach((T, A) => {
      T.state === 'idle' && (F.has(A) ? w.push(A) : x.push(A));
    }),
      F.forEach((T) => {
        !y.fetchers.has(T) && !W.has(T) && w.push(T);
      }),
      [...p].forEach((T) =>
        T(y, {
          deletedFetchers: w,
          viewTransitionOpts: v.viewTransitionOpts,
          flushSync: v.flushSync === !0,
        }),
      ),
      w.forEach((T) => Ht(T)),
      x.forEach((T) => y.fetchers.delete(T)));
  }
  function Je(f, v, { flushSync: w } = {}) {
    let x =
        y.actionData != null &&
        y.navigation.formMethod != null &&
        ge(y.navigation.formMethod) &&
        y.navigation.state === 'loading' &&
        f.state?._isRedirect !== !0,
      T;
    v.actionData
      ? Object.keys(v.actionData).length > 0
        ? (T = v.actionData)
        : (T = null)
      : x
        ? (T = y.actionData)
        : (T = null);
    let A = v.loaderData
        ? ln(y.loaderData, v.loaderData, v.matches || [], v.errors)
        : y.loaderData,
      k = y.blockers;
    k.size > 0 && ((k = new Map(k)), k.forEach((I, N) => k.set(N, at)));
    let O = q ? !1 : jr(f, v.matches || y.matches),
      $ =
        B === !0 ||
        (y.navigation.formMethod != null &&
          ge(y.navigation.formMethod) &&
          f.state?._isRedirect !== !0);
    (u && ((s = u), (u = void 0)),
      q ||
        L === 'POP' ||
        (L === 'PUSH'
          ? e.history.push(f, f.state)
          : L === 'REPLACE' && e.history.replace(f, f.state)));
    let H;
    if (L === 'POP') {
      let I = ae.get(y.location.pathname);
      I && I.has(f.pathname)
        ? (H = { currentLocation: y.location, nextLocation: f })
        : ae.has(f.pathname) &&
          (H = { currentLocation: f, nextLocation: y.location });
    } else if (J) {
      let I = ae.get(y.location.pathname);
      (I
        ? I.add(f.pathname)
        : ((I = new Set([f.pathname])), ae.set(y.location.pathname, I)),
        (H = { currentLocation: y.location, nextLocation: f }));
    }
    (ie(
      {
        ...v,
        actionData: T,
        loaderData: A,
        historyAction: L,
        location: f,
        initialized: !0,
        navigation: Gt,
        revalidation: 'idle',
        restoreScrollPosition: O,
        preventScrollReset: $,
        blockers: k,
      },
      { viewTransitionOpts: H, flushSync: w === !0 },
    ),
      (L = 'POP'),
      (B = !1),
      (J = !1),
      (q = !1),
      (Q = !1),
      G?.resolve(),
      (G = null));
  }
  async function _r(f, v) {
    if (typeof f == 'number') {
      e.history.go(f);
      return;
    }
    let w = er(y.location, y.matches, l, f, v?.fromRouteId, v?.relative),
      { path: x, submission: T, error: A } = qr(!1, w, v),
      k = y.location,
      O = st(y.location, x, v && v.state);
    O = { ...O, ...e.history.encodeLocation(O) };
    let $ = v && v.replace != null ? v.replace : void 0,
      H = 'PUSH';
    $ === !0
      ? (H = 'REPLACE')
      : $ === !1 ||
        (T != null &&
          ge(T.formMethod) &&
          T.formAction === y.location.pathname + y.location.search &&
          (H = 'REPLACE'));
    let I =
        v && 'preventScrollReset' in v ? v.preventScrollReset === !0 : void 0,
      N = (v && v.flushSync) === !0,
      X = $r({ currentLocation: k, nextLocation: O, historyAction: H });
    if (X) {
      mt(X, {
        state: 'blocked',
        location: O,
        proceed() {
          (mt(X, {
            state: 'proceeding',
            proceed: void 0,
            reset: void 0,
            location: O,
          }),
            _r(f, v));
        },
        reset() {
          let te = new Map(y.blockers);
          (te.set(X, at), ie({ blockers: te }));
        },
      });
      return;
    }
    await Fe(H, O, {
      submission: T,
      pendingError: A,
      preventScrollReset: I,
      replace: v && v.replace,
      enableViewTransition: v && v.viewTransition,
      flushSync: N,
    });
  }
  function sa() {
    (G || (G = ko()), jt(), ie({ revalidation: 'loading' }));
    let f = G.promise;
    return y.navigation.state === 'submitting'
      ? f
      : y.navigation.state === 'idle'
        ? (Fe(y.historyAction, y.location, {
            startUninterruptedRevalidation: !0,
          }),
          f)
        : (Fe(L || y.historyAction, y.navigation.location, {
            overrideNavigation: y.navigation,
            enableViewTransition: J === !0,
          }),
          f);
  }
  async function Fe(f, v, w) {
    (U && U.abort(),
      (U = null),
      (L = f),
      (q = (w && w.startUninterruptedRevalidation) === !0),
      wa(y.location, y.matches),
      (B = (w && w.preventScrollReset) === !0),
      (J = (w && w.enableViewTransition) === !0));
    let x = u || s,
      T = w && w.overrideNavigation,
      A =
        w?.initialHydration && y.matches && y.matches.length > 0 && !b
          ? y.matches
          : Ae(x, v, l),
      k = (w && w.flushSync) === !0;
    if (
      A &&
      y.initialized &&
      !Q &&
      Lo(y.location, v) &&
      !(w && w.submission && ge(w.submission.formMethod))
    ) {
      Je(v, { matches: A }, { flushSync: k });
      return;
    }
    let O = pt(A, x, v.pathname);
    if ((O.active && O.matches && (A = O.matches), !A)) {
      let { error: pe, notFoundMatches: re, route: ee } = Ut(v.pathname);
      Je(
        v,
        { matches: re, loaderData: {}, errors: { [ee.id]: pe } },
        { flushSync: k },
      );
      return;
    }
    U = new AbortController();
    let $ = Xe(e.history, v, U.signal, w && w.submission),
      H = e.getContext ? await e.getContext() : new Xr(),
      I;
    if (w && w.pendingError)
      I = [ke(A).route.id, { type: 'error', error: w.pendingError }];
    else if (w && w.submission && ge(w.submission.formMethod)) {
      let pe = await ua(
        $,
        v,
        w.submission,
        A,
        H,
        O.active,
        w && w.initialHydration === !0,
        { replace: w.replace, flushSync: k },
      );
      if (pe.shortCircuited) return;
      if (pe.pendingActionResult) {
        let [re, ee] = pe.pendingActionResult;
        if (we(ee) && Ye(ee.error) && ee.error.status === 404) {
          ((U = null),
            Je(v, {
              matches: pe.matches,
              loaderData: {},
              errors: { [re]: ee.error },
            }));
          return;
        }
      }
      ((A = pe.matches || A),
        (I = pe.pendingActionResult),
        (T = Xt(v, w.submission)),
        (k = !1),
        (O.active = !1),
        ($ = Xe(e.history, $.url, $.signal)));
    }
    let {
      shortCircuited: N,
      matches: X,
      loaderData: te,
      errors: le,
    } = await ca(
      $,
      v,
      A,
      H,
      O.active,
      T,
      w && w.submission,
      w && w.fetcherSubmission,
      w && w.replace,
      w && w.initialHydration === !0,
      k,
      I,
    );
    N ||
      ((U = null),
      Je(v, { matches: X || A, ...sn(I), loaderData: te, errors: le }));
  }
  async function ua(f, v, w, x, T, A, k, O = {}) {
    jt();
    let $ = Do(v, w);
    if ((ie({ navigation: $ }, { flushSync: O.flushSync === !0 }), A)) {
      let N = await yt(x, v.pathname, f.signal);
      if (N.type === 'aborted') return { shortCircuited: !0 };
      if (N.type === 'error') {
        if (N.partialMatches.length === 0) {
          let { matches: te, route: le } = Et(s);
          return {
            matches: te,
            pendingActionResult: [le.id, { type: 'error', error: N.error }],
          };
        }
        let X = ke(N.partialMatches).route.id;
        return {
          matches: N.partialMatches,
          pendingActionResult: [X, { type: 'error', error: N.error }],
        };
      } else if (N.matches) x = N.matches;
      else {
        let { notFoundMatches: X, error: te, route: le } = Ut(v.pathname);
        return {
          matches: X,
          pendingActionResult: [le.id, { type: 'error', error: te }],
        };
      }
    }
    let H,
      I = Pt(x, v);
    if (!I.route.action && !I.route.lazy)
      H = {
        type: 'error',
        error: be(405, {
          method: f.method,
          pathname: v.pathname,
          routeId: I.route.id,
        }),
      };
    else {
      let N = Ke(a, o, f, x, I, k ? [] : n, T),
        X = await et(f, N, T, null);
      if (((H = X[I.route.id]), !H)) {
        for (let te of x)
          if (X[te.route.id]) {
            H = X[te.route.id];
            break;
          }
      }
      if (f.signal.aborted) return { shortCircuited: !0 };
    }
    if (Be(H)) {
      let N;
      return (
        O && O.replace != null
          ? (N = O.replace)
          : (N =
              nn(H.response.headers.get('Location'), new URL(f.url), l) ===
              y.location.pathname + y.location.search),
        await je(f, H, !0, { submission: w, replace: N }),
        { shortCircuited: !0 }
      );
    }
    if (we(H)) {
      let N = ke(x, I.route.id);
      return (
        (O && O.replace) !== !0 && (L = 'PUSH'),
        { matches: x, pendingActionResult: [N.route.id, H, I.route.id] }
      );
    }
    return { matches: x, pendingActionResult: [I.route.id, H] };
  }
  async function ca(f, v, w, x, T, A, k, O, $, H, I, N) {
    let X = A || Xt(v, k),
      te = k || O || un(X),
      le = !q && !H;
    if (T) {
      if (le) {
        let he = Mr(N);
        ie(
          { navigation: X, ...(he !== void 0 ? { actionData: he } : {}) },
          { flushSync: I },
        );
      }
      let K = await yt(w, v.pathname, f.signal);
      if (K.type === 'aborted') return { shortCircuited: !0 };
      if (K.type === 'error') {
        if (K.partialMatches.length === 0) {
          let { matches: Ge, route: ze } = Et(s);
          return { matches: Ge, loaderData: {}, errors: { [ze.id]: K.error } };
        }
        let he = ke(K.partialMatches).route.id;
        return {
          matches: K.partialMatches,
          loaderData: {},
          errors: { [he]: K.error },
        };
      } else if (K.matches) w = K.matches;
      else {
        let { error: he, notFoundMatches: Ge, route: ze } = Ut(v.pathname);
        return { matches: Ge, loaderData: {}, errors: { [ze.id]: he } };
      }
    }
    let pe = u || s,
      { dsMatches: re, revalidatingFetchers: ee } = Qr(
        f,
        x,
        a,
        o,
        e.history,
        y,
        w,
        te,
        v,
        H ? [] : n,
        H === !0,
        Q,
        ue,
        F,
        m,
        de,
        pe,
        l,
        e.patchRoutesOnNavigation != null,
        N,
      );
    if (
      ((ce = ++se),
      !e.dataStrategy &&
        !re.some((K) => K.shouldLoad) &&
        !re.some((K) => K.route.middleware && K.route.middleware.length > 0) &&
        ee.length === 0)
    ) {
      let K = Nr();
      return (
        Je(
          v,
          {
            matches: w,
            loaderData: {},
            errors: N && we(N[1]) ? { [N[0]]: N[1].error } : null,
            ...sn(N),
            ...(K ? { fetchers: new Map(y.fetchers) } : {}),
          },
          { flushSync: I },
        ),
        { shortCircuited: !0 }
      );
    }
    if (le) {
      let K = {};
      if (!T) {
        K.navigation = X;
        let he = Mr(N);
        he !== void 0 && (K.actionData = he);
      }
      (ee.length > 0 && (K.fetchers = da(ee)), ie(K, { flushSync: I }));
    }
    ee.forEach((K) => {
      (De(K.key), K.controller && W.set(K.key, K.controller));
    });
    let He = () => ee.forEach((K) => De(K.key));
    U && U.signal.addEventListener('abort', He);
    let { loaderResults: tt, fetcherResults: Ne } = await Dr(re, ee, f, x);
    if (f.signal.aborted) return { shortCircuited: !0 };
    (U && U.signal.removeEventListener('abort', He),
      ee.forEach((K) => W.delete(K.key)));
    let Le = Rt(tt);
    if (Le)
      return (
        await je(f, Le.result, !0, { replace: $ }),
        { shortCircuited: !0 }
      );
    if (((Le = Rt(Ne)), Le))
      return (
        de.add(Le.key),
        await je(f, Le.result, !0, { replace: $ }),
        { shortCircuited: !0 }
      );
    let { loaderData: zt, errors: rt } = on(y, w, tt, N, ee, Ne);
    H && y.errors && (rt = { ...y.errors, ...rt });
    let Ue = Nr(),
      vt = kr(ce),
      gt = Ue || vt || ee.length > 0;
    return {
      matches: w,
      loaderData: zt,
      errors: rt,
      ...(gt ? { fetchers: new Map(y.fetchers) } : {}),
    };
  }
  function Mr(f) {
    if (f && !we(f[1])) return { [f[0]]: f[1].data };
    if (y.actionData)
      return Object.keys(y.actionData).length === 0 ? null : y.actionData;
  }
  function da(f) {
    return (
      f.forEach((v) => {
        let w = y.fetchers.get(v.key),
          x = ot(void 0, w ? w.data : void 0);
        y.fetchers.set(v.key, x);
      }),
      new Map(y.fetchers)
    );
  }
  async function fa(f, v, w, x) {
    De(f);
    let T = (x && x.flushSync) === !0,
      A = u || s,
      k = er(y.location, y.matches, l, w, v, x?.relative),
      O = Ae(A, k, l),
      $ = pt(O, A, k);
    if (($.active && $.matches && (O = $.matches), !O)) {
      Me(f, v, be(404, { pathname: k }), { flushSync: T });
      return;
    }
    let { path: H, submission: I, error: N } = qr(!0, k, x);
    if (N) {
      Me(f, v, N, { flushSync: T });
      return;
    }
    let X = e.getContext ? await e.getContext() : new Xr(),
      te = (x && x.preventScrollReset) === !0;
    if (I && ge(I.formMethod)) {
      await ha(f, v, H, O, X, $.active, T, te, I);
      return;
    }
    (m.set(f, { routeId: v, path: H }),
      await ma(f, v, H, O, X, $.active, T, te, I));
  }
  async function ha(f, v, w, x, T, A, k, O, $) {
    (jt(), m.delete(f));
    let H = y.fetchers.get(f);
    _e(f, Oo($, H), { flushSync: k });
    let I = new AbortController(),
      N = Xe(e.history, w, I.signal, $);
    if (A) {
      let oe = await yt(x, new URL(N.url).pathname, N.signal, f);
      if (oe.type === 'aborted') return;
      if (oe.type === 'error') {
        Me(f, v, oe.error, { flushSync: k });
        return;
      } else if (oe.matches) x = oe.matches;
      else {
        Me(f, v, be(404, { pathname: w }), { flushSync: k });
        return;
      }
    }
    let X = Pt(x, w);
    if (!X.route.action && !X.route.lazy) {
      let oe = be(405, { method: $.formMethod, pathname: w, routeId: v });
      Me(f, v, oe, { flushSync: k });
      return;
    }
    W.set(f, I);
    let te = se,
      le = Ke(a, o, N, x, X, n, T),
      re = (await et(N, le, T, f))[X.route.id];
    if (N.signal.aborted) {
      W.get(f) === I && W.delete(f);
      return;
    }
    if (F.has(f)) {
      if (Be(re) || we(re)) {
        _e(f, Oe(void 0));
        return;
      }
    } else {
      if (Be(re))
        if ((W.delete(f), ce > te)) {
          _e(f, Oe(void 0));
          return;
        } else
          return (
            de.add(f),
            _e(f, ot($)),
            je(N, re, !1, { fetcherSubmission: $, preventScrollReset: O })
          );
      if (we(re)) {
        Me(f, v, re.error);
        return;
      }
    }
    let ee = y.navigation.location || y.location,
      He = Xe(e.history, ee, I.signal),
      tt = u || s,
      Ne =
        y.navigation.state !== 'idle'
          ? Ae(tt, y.navigation.location, l)
          : y.matches;
    Y(Ne, "Didn't find any matches after fetcher action");
    let Le = ++se;
    ve.set(f, Le);
    let zt = ot($, re.data);
    y.fetchers.set(f, zt);
    let { dsMatches: rt, revalidatingFetchers: Ue } = Qr(
      He,
      T,
      a,
      o,
      e.history,
      y,
      Ne,
      $,
      ee,
      n,
      !1,
      Q,
      ue,
      F,
      m,
      de,
      tt,
      l,
      e.patchRoutesOnNavigation != null,
      [X.route.id, re],
    );
    (Ue.filter((oe) => oe.key !== f).forEach((oe) => {
      let wt = oe.key,
        Hr = y.fetchers.get(wt),
        Sa = ot(void 0, Hr ? Hr.data : void 0);
      (y.fetchers.set(wt, Sa),
        De(wt),
        oe.controller && W.set(wt, oe.controller));
    }),
      ie({ fetchers: new Map(y.fetchers) }));
    let vt = () => Ue.forEach((oe) => De(oe.key));
    I.signal.addEventListener('abort', vt);
    let { loaderResults: gt, fetcherResults: K } = await Dr(rt, Ue, He, T);
    if (I.signal.aborted) return;
    if (
      (I.signal.removeEventListener('abort', vt),
      ve.delete(f),
      W.delete(f),
      Ue.forEach((oe) => W.delete(oe.key)),
      y.fetchers.has(f))
    ) {
      let oe = Oe(re.data);
      y.fetchers.set(f, oe);
    }
    let he = Rt(gt);
    if (he) return je(He, he.result, !1, { preventScrollReset: O });
    if (((he = Rt(K)), he))
      return (de.add(he.key), je(He, he.result, !1, { preventScrollReset: O }));
    let { loaderData: Ge, errors: ze } = on(y, Ne, gt, void 0, Ue, K);
    (kr(Le),
      y.navigation.state === 'loading' && Le > ce
        ? (Y(L, 'Expected pending action'),
          U && U.abort(),
          Je(y.navigation.location, {
            matches: Ne,
            loaderData: Ge,
            errors: ze,
            fetchers: new Map(y.fetchers),
          }))
        : (ie({
            errors: ze,
            loaderData: ln(y.loaderData, Ge, Ne, ze),
            fetchers: new Map(y.fetchers),
          }),
          (Q = !1)));
  }
  async function ma(f, v, w, x, T, A, k, O, $) {
    let H = y.fetchers.get(f);
    _e(f, ot($, H ? H.data : void 0), { flushSync: k });
    let I = new AbortController(),
      N = Xe(e.history, w, I.signal);
    if (A) {
      let ee = await yt(x, new URL(N.url).pathname, N.signal, f);
      if (ee.type === 'aborted') return;
      if (ee.type === 'error') {
        Me(f, v, ee.error, { flushSync: k });
        return;
      } else if (ee.matches) x = ee.matches;
      else {
        Me(f, v, be(404, { pathname: w }), { flushSync: k });
        return;
      }
    }
    let X = Pt(x, w);
    W.set(f, I);
    let te = se,
      le = Ke(a, o, N, x, X, n, T),
      re = (await et(N, le, T, f))[X.route.id];
    if ((W.get(f) === I && W.delete(f), !N.signal.aborted)) {
      if (F.has(f)) {
        _e(f, Oe(void 0));
        return;
      }
      if (Be(re))
        if (ce > te) {
          _e(f, Oe(void 0));
          return;
        } else {
          (de.add(f), await je(N, re, !1, { preventScrollReset: O }));
          return;
        }
      if (we(re)) {
        Me(f, v, re.error);
        return;
      }
      _e(f, Oe(re.data));
    }
  }
  async function je(
    f,
    v,
    w,
    {
      submission: x,
      fetcherSubmission: T,
      preventScrollReset: A,
      replace: k,
    } = {},
  ) {
    v.response.headers.has('X-Remix-Revalidate') && (Q = !0);
    let O = v.response.headers.get('Location');
    (Y(O, 'Expected a Location header on the redirect Response'),
      (O = nn(O, new URL(f.url), l)));
    let $ = st(y.location, O, { _isRedirect: !0 });
    if (r) {
      let le = !1;
      if (v.response.headers.has('X-Remix-Reload-Document')) le = !0;
      else if (hr(O)) {
        const pe = En(O, !0);
        le = pe.origin !== t.location.origin || Ee(pe.pathname, l) == null;
      }
      if (le) {
        k ? t.location.replace(O) : t.location.assign(O);
        return;
      }
    }
    U = null;
    let H =
        k === !0 || v.response.headers.has('X-Remix-Replace')
          ? 'REPLACE'
          : 'PUSH',
      { formMethod: I, formAction: N, formEncType: X } = y.navigation;
    !x && !T && I && N && X && (x = un(y.navigation));
    let te = x || T;
    if (uo.has(v.response.status) && te && ge(te.formMethod))
      await Fe(H, $, {
        submission: { ...te, formAction: O },
        preventScrollReset: A || B,
        enableViewTransition: w ? J : void 0,
      });
    else {
      let le = Xt($, x);
      await Fe(H, $, {
        overrideNavigation: le,
        fetcherSubmission: T,
        preventScrollReset: A || B,
        enableViewTransition: w ? J : void 0,
      });
    }
  }
  async function et(f, v, w, x) {
    let T,
      A = {};
    try {
      T = await Eo(i, f, v, x, w, !1);
    } catch (k) {
      return (
        v
          .filter((O) => O.shouldLoad)
          .forEach((O) => {
            A[O.route.id] = { type: 'error', error: k };
          }),
        A
      );
    }
    if (f.signal.aborted) return A;
    for (let [k, O] of Object.entries(T))
      if (_o(O)) {
        let $ = O.result;
        A[k] = { type: 'redirect', response: Co($, f, k, v, l) };
      } else A[k] = await bo(O);
    return A;
  }
  async function Dr(f, v, w, x) {
    let T = et(w, f, x, null),
      A = Promise.all(
        v.map(async ($) => {
          if ($.matches && $.match && $.request && $.controller) {
            let I = (await et($.request, $.matches, x, $.key))[
              $.match.route.id
            ];
            return { [$.key]: I };
          } else
            return Promise.resolve({
              [$.key]: { type: 'error', error: be(404, { pathname: $.path }) },
            });
        }),
      ),
      k = await T,
      O = (await A).reduce(($, H) => Object.assign($, H), {});
    return { loaderResults: k, fetcherResults: O };
  }
  function jt() {
    ((Q = !0),
      m.forEach((f, v) => {
        (W.has(v) && ue.add(v), De(v));
      }));
  }
  function _e(f, v, w = {}) {
    (y.fetchers.set(f, v),
      ie(
        { fetchers: new Map(y.fetchers) },
        { flushSync: (w && w.flushSync) === !0 },
      ));
  }
  function Me(f, v, w, x = {}) {
    let T = ke(y.matches, v);
    (Ht(f),
      ie(
        { errors: { [T.route.id]: w }, fetchers: new Map(y.fetchers) },
        { flushSync: (x && x.flushSync) === !0 },
      ));
  }
  function Or(f) {
    return (
      C.set(f, (C.get(f) || 0) + 1),
      F.has(f) && F.delete(f),
      y.fetchers.get(f) || co
    );
  }
  function pa(f, v) {
    (De(f, v?.reason), _e(f, Oe(null)));
  }
  function Ht(f) {
    let v = y.fetchers.get(f);
    (W.has(f) && !(v && v.state === 'loading' && ve.has(f)) && De(f),
      m.delete(f),
      ve.delete(f),
      de.delete(f),
      F.delete(f),
      ue.delete(f),
      y.fetchers.delete(f));
  }
  function ya(f) {
    let v = (C.get(f) || 0) - 1;
    (v <= 0 ? (C.delete(f), F.add(f)) : C.set(f, v),
      ie({ fetchers: new Map(y.fetchers) }));
  }
  function De(f, v) {
    let w = W.get(f);
    w && (w.abort(v), W.delete(f));
  }
  function Ar(f) {
    for (let v of f) {
      let w = Or(v),
        x = Oe(w.data);
      y.fetchers.set(v, x);
    }
  }
  function Nr() {
    let f = [],
      v = !1;
    for (let w of de) {
      let x = y.fetchers.get(w);
      (Y(x, `Expected fetcher: ${w}`),
        x.state === 'loading' && (de.delete(w), f.push(w), (v = !0)));
    }
    return (Ar(f), v);
  }
  function kr(f) {
    let v = [];
    for (let [w, x] of ve)
      if (x < f) {
        let T = y.fetchers.get(w);
        (Y(T, `Expected fetcher: ${w}`),
          T.state === 'loading' && (De(w), ve.delete(w), v.push(w)));
      }
    return (Ar(v), v.length > 0);
  }
  function va(f, v) {
    let w = y.blockers.get(f) || at;
    return (j.get(f) !== v && j.set(f, v), w);
  }
  function Ir(f) {
    (y.blockers.delete(f), j.delete(f));
  }
  function mt(f, v) {
    let w = y.blockers.get(f) || at;
    Y(
      (w.state === 'unblocked' && v.state === 'blocked') ||
        (w.state === 'blocked' && v.state === 'blocked') ||
        (w.state === 'blocked' && v.state === 'proceeding') ||
        (w.state === 'blocked' && v.state === 'unblocked') ||
        (w.state === 'proceeding' && v.state === 'unblocked'),
      `Invalid blocker state transition: ${w.state} -> ${v.state}`,
    );
    let x = new Map(y.blockers);
    (x.set(f, v), ie({ blockers: x }));
  }
  function $r({ currentLocation: f, nextLocation: v, historyAction: w }) {
    if (j.size === 0) return;
    j.size > 1 && ne(!1, 'A router only supports one blocker at a time');
    let x = Array.from(j.entries()),
      [T, A] = x[x.length - 1],
      k = y.blockers.get(T);
    if (
      !(k && k.state === 'proceeding') &&
      A({ currentLocation: f, nextLocation: v, historyAction: w })
    )
      return T;
  }
  function Ut(f) {
    let v = be(404, { pathname: f }),
      w = u || s,
      { matches: x, route: T } = Et(w);
    return { notFoundMatches: x, route: T, error: v };
  }
  function ga(f, v, w) {
    if (((g = f), (P = v), (R = w || null), !E && y.navigation === Gt)) {
      E = !0;
      let x = jr(y.location, y.matches);
      x != null && ie({ restoreScrollPosition: x });
    }
    return () => {
      ((g = null), (P = null), (R = null));
    };
  }
  function Fr(f, v) {
    return (
      (R &&
        R(
          f,
          v.map((x) => Rn(x, y.loaderData)),
        )) ||
      f.key
    );
  }
  function wa(f, v) {
    if (g && P) {
      let w = Fr(f, v);
      g[w] = P();
    }
  }
  function jr(f, v) {
    if (g) {
      let w = Fr(f, v),
        x = g[w];
      if (typeof x == 'number') return x;
    }
    return null;
  }
  function pt(f, v, w) {
    if (e.patchRoutesOnNavigation)
      if (f) {
        if (Object.keys(f[0].params).length > 0)
          return { active: !0, matches: Lt(v, w, l, !0) };
      } else return { active: !0, matches: Lt(v, w, l, !0) || [] };
    return { active: !1, matches: null };
  }
  async function yt(f, v, w, x) {
    if (!e.patchRoutesOnNavigation) return { type: 'success', matches: f };
    let T = f;
    for (;;) {
      let A = u == null,
        k = u || s,
        O = o;
      try {
        await e.patchRoutesOnNavigation({
          signal: w,
          path: v,
          matches: T,
          fetcherKey: x,
          patch: (I, N) => {
            w.aborted || Zr(I, N, k, O, a, !1);
          },
        });
      } catch (I) {
        return { type: 'error', error: I, partialMatches: T };
      } finally {
        A && !w.aborted && (s = [...s]);
      }
      if (w.aborted) return { type: 'aborted' };
      let $ = Ae(k, v, l);
      if ($) return { type: 'success', matches: $ };
      let H = Lt(k, v, l, !0);
      if (
        !H ||
        (T.length === H.length &&
          T.every((I, N) => I.route.id === H[N].route.id))
      )
        return { type: 'success', matches: null };
      T = H;
    }
  }
  function Ea(f) {
    ((o = {}), (u = ut(f, a, void 0, o)));
  }
  function Ra(f, v, w = !1) {
    let x = u == null;
    (Zr(f, v, u || s, o, a, w), x && ((s = [...s]), ie({})));
  }
  return (
    (_ = {
      get basename() {
        return l;
      },
      get future() {
        return c;
      },
      get state() {
        return y;
      },
      get routes() {
        return s;
      },
      get window() {
        return t;
      },
      initialize: Z,
      subscribe: fe,
      enableScrollRestoration: ga,
      navigate: _r,
      fetch: fa,
      revalidate: sa,
      createHref: (f) => e.history.createHref(f),
      encodeLocation: (f) => e.history.encodeLocation(f),
      getFetcher: Or,
      resetFetcher: pa,
      deleteFetcher: ya,
      dispose: Se,
      getBlocker: va,
      deleteBlocker: Ir,
      patchRoutes: Ra,
      _internalFetchControllers: W,
      _internalSetRoutes: Ea,
      _internalSetStateDoNotUseOrYouWillBreakYourApp(f) {
        ie(f);
      },
    }),
    _
  );
}
function mo(e) {
  return (
    e != null &&
    (('formData' in e && e.formData != null) ||
      ('body' in e && e.body !== void 0))
  );
}
function er(e, t, r, n, a, o) {
  let s, u;
  if (a) {
    s = [];
    for (let i of t)
      if ((s.push(i), i.route.id === a)) {
        u = i;
        break;
      }
  } else ((s = t), (u = t[t.length - 1]));
  let l = fr(n || '.', dr(s), Ee(e.pathname, r) || e.pathname, o === 'path');
  if (
    (n == null && ((l.search = e.search), (l.hash = e.hash)),
    (n == null || n === '' || n === '.') && u)
  ) {
    let i = yr(l.search);
    if (u.route.index && !i)
      l.search = l.search ? l.search.replace(/^\?/, '?index&') : '?index';
    else if (!u.route.index && i) {
      let c = new URLSearchParams(l.search),
        d = c.getAll('index');
      (c.delete('index'),
        d.filter((g) => g).forEach((g) => c.append('index', g)));
      let p = c.toString();
      l.search = p ? `?${p}` : '';
    }
  }
  return (
    r !== '/' && (l.pathname = Ka({ basename: r, pathname: l.pathname })),
    Ie(l)
  );
}
function qr(e, t, r) {
  if (!r || !mo(r)) return { path: t };
  if (r.formMethod && !Mo(r.formMethod))
    return { path: t, error: be(405, { method: r.formMethod }) };
  let n = () => ({ path: t, error: be(400, { type: 'invalid-body' }) }),
    o = (r.formMethod || 'get').toUpperCase(),
    s = Nn(t);
  if (r.body !== void 0) {
    if (r.formEncType === 'text/plain') {
      if (!ge(o)) return n();
      let d =
        typeof r.body == 'string'
          ? r.body
          : r.body instanceof FormData || r.body instanceof URLSearchParams
            ? Array.from(r.body.entries()).reduce(
                (p, [g, R]) => `${p}${g}=${R}
`,
                '',
              )
            : String(r.body);
      return {
        path: t,
        submission: {
          formMethod: o,
          formAction: s,
          formEncType: r.formEncType,
          formData: void 0,
          json: void 0,
          text: d,
        },
      };
    } else if (r.formEncType === 'application/json') {
      if (!ge(o)) return n();
      try {
        let d = typeof r.body == 'string' ? JSON.parse(r.body) : r.body;
        return {
          path: t,
          submission: {
            formMethod: o,
            formAction: s,
            formEncType: r.formEncType,
            formData: void 0,
            json: d,
            text: void 0,
          },
        };
      } catch {
        return n();
      }
    }
  }
  Y(
    typeof FormData == 'function',
    'FormData is not available in this environment',
  );
  let u, l;
  if (r.formData) ((u = nr(r.formData)), (l = r.formData));
  else if (r.body instanceof FormData) ((u = nr(r.body)), (l = r.body));
  else if (r.body instanceof URLSearchParams) ((u = r.body), (l = an(u)));
  else if (r.body == null) ((u = new URLSearchParams()), (l = new FormData()));
  else
    try {
      ((u = new URLSearchParams(r.body)), (l = an(u)));
    } catch {
      return n();
    }
  let i = {
    formMethod: o,
    formAction: s,
    formEncType: (r && r.formEncType) || 'application/x-www-form-urlencoded',
    formData: l,
    json: void 0,
    text: void 0,
  };
  if (ge(i.formMethod)) return { path: t, submission: i };
  let c = $e(t);
  return (
    e && c.search && yr(c.search) && u.append('index', ''),
    (c.search = `?${u}`),
    { path: Ie(c), submission: i }
  );
}
function Qr(e, t, r, n, a, o, s, u, l, i, c, d, p, g, R, P, E, S, b, D) {
  let M = D ? (we(D[1]) ? D[1].error : D[1].data) : void 0,
    _ = a.createURL(o.location),
    y = a.createURL(l),
    L;
  if (c && o.errors) {
    let q = Object.keys(o.errors)[0];
    L = s.findIndex((Q) => Q.route.id === q);
  } else if (D && we(D[1])) {
    let q = D[0];
    L = s.findIndex((Q) => Q.route.id === q) - 1;
  }
  let B = D ? D[1].statusCode : void 0,
    U = B && B >= 400,
    J = {
      currentUrl: _,
      currentParams: o.matches[0]?.params || {},
      nextUrl: y,
      nextParams: s[0].params,
      ...u,
      actionResult: M,
      actionStatus: B,
    },
    ae = s.map((q, Q) => {
      let { route: ue } = q,
        W = null;
      if (
        (L != null && Q > L
          ? (W = !1)
          : ue.lazy
            ? (W = !0)
            : mr(ue)
              ? c
                ? (W = tr(ue, o.loaderData, o.errors))
                : po(o.loaderData, o.matches[Q], q) && (W = !0)
              : (W = !1),
        W !== null)
      )
        return rr(r, n, e, q, i, t, W);
      let se = U
          ? !1
          : d ||
            _.pathname + _.search === y.pathname + y.search ||
            _.search !== y.search ||
            yo(o.matches[Q], q),
        ce = { ...J, defaultShouldRevalidate: se },
        ve = Ot(q, ce);
      return rr(r, n, e, q, i, t, ve, ce);
    }),
    Re = [];
  return (
    R.forEach((q, Q) => {
      if (c || !s.some((C) => C.route.id === q.routeId) || g.has(Q)) return;
      let ue = o.fetchers.get(Q),
        W = ue && ue.state !== 'idle' && ue.data === void 0,
        se = Ae(E, q.path, S);
      if (!se) {
        if (b && W) return;
        Re.push({
          key: Q,
          routeId: q.routeId,
          path: q.path,
          matches: null,
          match: null,
          request: null,
          controller: null,
        });
        return;
      }
      if (P.has(Q)) return;
      let ce = Pt(se, q.path),
        ve = new AbortController(),
        de = Xe(a, q.path, ve.signal),
        m = null;
      if (p.has(Q)) (p.delete(Q), (m = Ke(r, n, de, se, ce, i, t)));
      else if (W) d && (m = Ke(r, n, de, se, ce, i, t));
      else {
        let C = { ...J, defaultShouldRevalidate: U ? !1 : d };
        Ot(ce, C) && (m = Ke(r, n, de, se, ce, i, t, C));
      }
      m &&
        Re.push({
          key: Q,
          routeId: q.routeId,
          path: q.path,
          matches: m,
          match: ce,
          request: de,
          controller: ve,
        });
    }),
    { dsMatches: ae, revalidatingFetchers: Re }
  );
}
function mr(e) {
  return e.loader != null || (e.middleware != null && e.middleware.length > 0);
}
function tr(e, t, r) {
  if (e.lazy) return !0;
  if (!mr(e)) return !1;
  let n = t != null && e.id in t,
    a = r != null && r[e.id] !== void 0;
  return !n && a
    ? !1
    : typeof e.loader == 'function' && e.loader.hydrate === !0
      ? !0
      : !n && !a;
}
function po(e, t, r) {
  let n = !t || r.route.id !== t.route.id,
    a = !e.hasOwnProperty(r.route.id);
  return n || a;
}
function yo(e, t) {
  let r = e.route.path;
  return (
    e.pathname !== t.pathname ||
    (r != null && r.endsWith('*') && e.params['*'] !== t.params['*'])
  );
}
function Ot(e, t) {
  if (e.route.shouldRevalidate) {
    let r = e.route.shouldRevalidate(t);
    if (typeof r == 'boolean') return r;
  }
  return t.defaultShouldRevalidate;
}
function Zr(e, t, r, n, a, o) {
  let s;
  if (e) {
    let i = n[e];
    (Y(i, `No route found to patch children into: routeId = ${e}`),
      i.children || (i.children = []),
      (s = i.children));
  } else s = r;
  let u = [],
    l = [];
  if (
    (t.forEach((i) => {
      let c = s.find((d) => _n(i, d));
      c ? l.push({ existingRoute: c, newRoute: i }) : u.push(i);
    }),
    u.length > 0)
  ) {
    let i = ut(u, a, [e || '_', 'patch', String(s?.length || '0')], n);
    s.push(...i);
  }
  if (o && l.length > 0)
    for (let i = 0; i < l.length; i++) {
      let { existingRoute: c, newRoute: d } = l[i],
        p = c,
        [g] = ut([d], a, [], {}, !0);
      Object.assign(p, {
        element: g.element ? g.element : p.element,
        errorElement: g.errorElement ? g.errorElement : p.errorElement,
        hydrateFallbackElement: g.hydrateFallbackElement
          ? g.hydrateFallbackElement
          : p.hydrateFallbackElement,
      });
    }
}
function _n(e, t) {
  return 'id' in e && 'id' in t && e.id === t.id
    ? !0
    : e.index === t.index &&
        e.path === t.path &&
        e.caseSensitive === t.caseSensitive
      ? (!e.children || e.children.length === 0) &&
        (!t.children || t.children.length === 0)
        ? !0
        : e.children.every((r, n) => t.children?.some((a) => _n(r, a)))
      : !1;
}
var en = new WeakMap(),
  Mn = ({ key: e, route: t, manifest: r, mapRouteProperties: n }) => {
    let a = r[t.id];
    if (
      (Y(a, 'No route found in manifest'), !a.lazy || typeof a.lazy != 'object')
    )
      return;
    let o = a.lazy[e];
    if (!o) return;
    let s = en.get(a);
    s || ((s = {}), en.set(a, s));
    let u = s[e];
    if (u) return u;
    let l = (async () => {
      let i = ka(e),
        d = a[e] !== void 0 && e !== 'hasErrorBoundary';
      if (i)
        (ne(
          !i,
          'Route property ' +
            e +
            ' is not a supported lazy route property. This property will be ignored.',
        ),
          (s[e] = Promise.resolve()));
      else if (d)
        ne(
          !1,
          `Route "${a.id}" has a static property "${e}" defined. The lazy property will be ignored.`,
        );
      else {
        let p = await o();
        p != null && (Object.assign(a, { [e]: p }), Object.assign(a, n(a)));
      }
      typeof a.lazy == 'object' &&
        ((a.lazy[e] = void 0),
        Object.values(a.lazy).every((p) => p === void 0) && (a.lazy = void 0));
    })();
    return ((s[e] = l), l);
  },
  tn = new WeakMap();
function vo(e, t, r, n, a) {
  let o = r[e.id];
  if ((Y(o, 'No route found in manifest'), !e.lazy))
    return { lazyRoutePromise: void 0, lazyHandlerPromise: void 0 };
  if (typeof e.lazy == 'function') {
    let c = tn.get(o);
    if (c) return { lazyRoutePromise: c, lazyHandlerPromise: c };
    let d = (async () => {
      Y(typeof e.lazy == 'function', 'No lazy route function found');
      let p = await e.lazy(),
        g = {};
      for (let R in p) {
        let P = p[R];
        if (P === void 0) continue;
        let E = $a(R),
          b = o[R] !== void 0 && R !== 'hasErrorBoundary';
        E
          ? ne(
              !E,
              'Route property ' +
                R +
                ' is not a supported property to be returned from a lazy route function. This property will be ignored.',
            )
          : b
            ? ne(
                !b,
                `Route "${o.id}" has a static property "${R}" defined but its lazy function is also returning a value for this property. The lazy route property "${R}" will be ignored.`,
              )
            : (g[R] = P);
      }
      (Object.assign(o, g), Object.assign(o, { ...n(o), lazy: void 0 }));
    })();
    return (
      tn.set(o, d),
      d.catch(() => {}),
      { lazyRoutePromise: d, lazyHandlerPromise: d }
    );
  }
  let s = Object.keys(e.lazy),
    u = [],
    l;
  for (let c of s) {
    if (a && a.includes(c)) continue;
    let d = Mn({ key: c, route: e, manifest: r, mapRouteProperties: n });
    d && (u.push(d), c === t && (l = d));
  }
  let i = u.length > 0 ? Promise.all(u).then(() => {}) : void 0;
  return (
    i?.catch(() => {}),
    l?.catch(() => {}),
    { lazyRoutePromise: i, lazyHandlerPromise: l }
  );
}
async function rn(e) {
  let t = e.matches.filter((a) => a.shouldLoad),
    r = {};
  return (
    (await Promise.all(t.map((a) => a.resolve()))).forEach((a, o) => {
      r[t[o].route.id] = a;
    }),
    r
  );
}
async function go(e) {
  return e.matches.some((t) => t.route.middleware) ? Dn(e, () => rn(e)) : rn(e);
}
function Dn(e, t) {
  return wo(e, t, (n) => n, Po, r);
  function r(n, a, o) {
    if (o)
      return Promise.resolve(
        Object.assign(o.value, { [a]: { type: 'error', result: n } }),
      );
    {
      let { matches: s } = e,
        u = Math.min(
          Math.max(
            s.findIndex((i) => i.route.id === a),
            0,
          ),
          Math.max(
            s.findIndex((i) => i.unstable_shouldCallHandler()),
            0,
          ),
        ),
        l = ke(s, s[u].route.id).route.id;
      return Promise.resolve({ [l]: { type: 'error', result: n } });
    }
  }
}
async function wo(e, t, r, n, a) {
  let { matches: o, request: s, params: u, context: l } = e,
    i = o.flatMap((d) =>
      d.route.middleware ? d.route.middleware.map((p) => [d.route.id, p]) : [],
    );
  return await On({ request: s, params: u, context: l }, i, t, r, n, a);
}
async function On(e, t, r, n, a, o, s = 0) {
  let { request: u } = e;
  if (u.signal.aborted)
    throw u.signal.reason ?? new Error(`Request aborted: ${u.method} ${u.url}`);
  let l = t[s];
  if (!l) return await r();
  let [i, c] = l,
    d,
    p = async () => {
      if (d) throw new Error('You may only call `next()` once per middleware');
      try {
        return ((d = { value: await On(e, t, r, n, a, o, s + 1) }), d.value);
      } catch (g) {
        return ((d = { value: await o(g, i, d) }), d.value);
      }
    };
  try {
    let g = await c(e, p),
      R = g != null ? n(g) : void 0;
    return a(R)
      ? R
      : d
        ? (R ?? d.value)
        : ((d = { value: await p() }), d.value);
  } catch (g) {
    return await o(g, i, d);
  }
}
function An(e, t, r, n, a) {
  let o = Mn({
      key: 'middleware',
      route: n.route,
      manifest: t,
      mapRouteProperties: e,
    }),
    s = vo(n.route, ge(r.method) ? 'action' : 'loader', t, e, a);
  return {
    middleware: o,
    route: s.lazyRoutePromise,
    handler: s.lazyHandlerPromise,
  };
}
function rr(e, t, r, n, a, o, s, u = null) {
  let l = !1,
    i = An(e, t, r, n, a);
  return {
    ...n,
    _lazyPromises: i,
    shouldLoad: s,
    unstable_shouldRevalidateArgs: u,
    unstable_shouldCallHandler(c) {
      return (
        (l = !0),
        u
          ? typeof c == 'boolean'
            ? Ot(n, { ...u, defaultShouldRevalidate: c })
            : Ot(n, u)
          : s
      );
    },
    resolve(c) {
      let { lazy: d, loader: p, middleware: g } = n.route,
        R = l || s || (c && !ge(r.method) && (d || p)),
        P = g && g.length > 0 && !p && !d;
      return R && !P
        ? Ro({
            request: r,
            match: n,
            lazyHandlerPromise: i?.handler,
            lazyRoutePromise: i?.route,
            handlerOverride: c,
            scopedContext: o,
          })
        : Promise.resolve({ type: 'data', result: void 0 });
    },
  };
}
function Ke(e, t, r, n, a, o, s, u = null) {
  return n.map((l) =>
    l.route.id !== a.route.id
      ? {
          ...l,
          shouldLoad: !1,
          unstable_shouldRevalidateArgs: u,
          unstable_shouldCallHandler: () => !1,
          _lazyPromises: An(e, t, r, l, o),
          resolve: () => Promise.resolve({ type: 'data', result: void 0 }),
        }
      : rr(e, t, r, l, o, s, !0, u),
  );
}
async function Eo(e, t, r, n, a, o) {
  r.some((i) => i._lazyPromises?.middleware) &&
    (await Promise.all(r.map((i) => i._lazyPromises?.middleware)));
  let s = { request: t, params: r[0].params, context: a, matches: r },
    l = await e({
      ...s,
      fetcherKey: n,
      runClientMiddleware: (i) => {
        let c = s;
        return Dn(c, () =>
          i({
            ...c,
            fetcherKey: n,
            runClientMiddleware: () => {
              throw new Error(
                'Cannot call `runClientMiddleware()` from within an `runClientMiddleware` handler',
              );
            },
          }),
        );
      },
    });
  try {
    await Promise.all(
      r.flatMap((i) => [i._lazyPromises?.handler, i._lazyPromises?.route]),
    );
  } catch {}
  return l;
}
async function Ro({
  request: e,
  match: t,
  lazyHandlerPromise: r,
  lazyRoutePromise: n,
  handlerOverride: a,
  scopedContext: o,
}) {
  let s,
    u,
    l = ge(e.method),
    i = l ? 'action' : 'loader',
    c = (d) => {
      let p,
        g = new Promise((E, S) => (p = S));
      ((u = () => p()), e.signal.addEventListener('abort', u));
      let R = (E) =>
          typeof d != 'function'
            ? Promise.reject(
                new Error(
                  `You cannot call the handler for a route which defines a boolean "${i}" [routeId: ${t.route.id}]`,
                ),
              )
            : d(
                { request: e, params: t.params, context: o },
                ...(E !== void 0 ? [E] : []),
              ),
        P = (async () => {
          try {
            return { type: 'data', result: await (a ? a((S) => R(S)) : R()) };
          } catch (E) {
            return { type: 'error', result: E };
          }
        })();
      return Promise.race([P, g]);
    };
  try {
    let d = l ? t.route.action : t.route.loader;
    if (r || n)
      if (d) {
        let p,
          [g] = await Promise.all([
            c(d).catch((R) => {
              p = R;
            }),
            r,
            n,
          ]);
        if (p !== void 0) throw p;
        s = g;
      } else {
        await r;
        let p = l ? t.route.action : t.route.loader;
        if (p) [s] = await Promise.all([c(p), n]);
        else if (i === 'action') {
          let g = new URL(e.url),
            R = g.pathname + g.search;
          throw be(405, { method: e.method, pathname: R, routeId: t.route.id });
        } else return { type: 'data', result: void 0 };
      }
    else if (d) s = await c(d);
    else {
      let p = new URL(e.url),
        g = p.pathname + p.search;
      throw be(404, { pathname: g });
    }
  } catch (d) {
    return { type: 'error', result: d };
  } finally {
    u && e.signal.removeEventListener('abort', u);
  }
  return s;
}
async function So(e) {
  let t = e.headers.get('Content-Type');
  return t && /\bapplication\/json\b/.test(t)
    ? e.body == null
      ? null
      : e.json()
    : e.text();
}
async function bo(e) {
  let { result: t, type: r } = e;
  if (pr(t)) {
    let n;
    try {
      n = await So(t);
    } catch (a) {
      return { type: 'error', error: a };
    }
    return r === 'error'
      ? {
          type: 'error',
          error: new We(t.status, t.statusText, n),
          statusCode: t.status,
          headers: t.headers,
        }
      : { type: 'data', data: n, statusCode: t.status, headers: t.headers };
  }
  return r === 'error'
    ? ar(t)
      ? t.data instanceof Error
        ? {
            type: 'error',
            error: t.data,
            statusCode: t.init?.status,
            headers: t.init?.headers ? new Headers(t.init.headers) : void 0,
          }
        : {
            type: 'error',
            error: new We(t.init?.status || 500, void 0, t.data),
            statusCode: Ye(t) ? t.status : void 0,
            headers: t.init?.headers ? new Headers(t.init.headers) : void 0,
          }
      : { type: 'error', error: t, statusCode: Ye(t) ? t.status : void 0 }
    : ar(t)
      ? {
          type: 'data',
          data: t.data,
          statusCode: t.init?.status,
          headers: t.init?.headers ? new Headers(t.init.headers) : void 0,
        }
      : { type: 'data', data: t };
}
function Co(e, t, r, n, a) {
  let o = e.headers.get('Location');
  if (
    (Y(
      o,
      'Redirects returned/thrown from loaders/actions must have a Location header',
    ),
    !hr(o))
  ) {
    let s = n.slice(0, n.findIndex((u) => u.route.id === r) + 1);
    ((o = er(new URL(t.url), s, a, o)), e.headers.set('Location', o));
  }
  return e;
}
function nn(e, t, r) {
  if (hr(e)) {
    let n = e,
      a = n.startsWith('//') ? new URL(t.protocol + n) : new URL(n),
      o = Ee(a.pathname, r) != null;
    if (a.origin === t.origin && o) return a.pathname + a.search + a.hash;
  }
  return e;
}
function Xe(e, t, r, n) {
  let a = e.createURL(Nn(t)).toString(),
    o = { signal: r };
  if (n && ge(n.formMethod)) {
    let { formMethod: s, formEncType: u } = n;
    ((o.method = s.toUpperCase()),
      u === 'application/json'
        ? ((o.headers = new Headers({ 'Content-Type': u })),
          (o.body = JSON.stringify(n.json)))
        : u === 'text/plain'
          ? (o.body = n.text)
          : u === 'application/x-www-form-urlencoded' && n.formData
            ? (o.body = nr(n.formData))
            : (o.body = n.formData));
  }
  return new Request(a, o);
}
function nr(e) {
  let t = new URLSearchParams();
  for (let [r, n] of e.entries())
    t.append(r, typeof n == 'string' ? n : n.name);
  return t;
}
function an(e) {
  let t = new FormData();
  for (let [r, n] of e.entries()) t.append(r, n);
  return t;
}
function xo(e, t, r, n = !1, a = !1) {
  let o = {},
    s = null,
    u,
    l = !1,
    i = {},
    c = r && we(r[1]) ? r[1].error : void 0;
  return (
    e.forEach((d) => {
      if (!(d.route.id in t)) return;
      let p = d.route.id,
        g = t[p];
      if (
        (Y(!Be(g), 'Cannot handle redirect results in processLoaderData'),
        we(g))
      ) {
        let R = g.error;
        if ((c !== void 0 && ((R = c), (c = void 0)), (s = s || {}), a))
          s[p] = R;
        else {
          let P = ke(e, p);
          s[P.route.id] == null && (s[P.route.id] = R);
        }
        (n || (o[p] = Tn),
          l || ((l = !0), (u = Ye(g.error) ? g.error.status : 500)),
          g.headers && (i[p] = g.headers));
      } else
        ((o[p] = g.data),
          g.statusCode && g.statusCode !== 200 && !l && (u = g.statusCode),
          g.headers && (i[p] = g.headers));
    }),
    c !== void 0 && r && ((s = { [r[0]]: c }), r[2] && (o[r[2]] = void 0)),
    { loaderData: o, errors: s, statusCode: u || 200, loaderHeaders: i }
  );
}
function on(e, t, r, n, a, o) {
  let { loaderData: s, errors: u } = xo(t, r, n);
  return (
    a
      .filter((l) => !l.matches || l.matches.some((i) => i.shouldLoad))
      .forEach((l) => {
        let { key: i, match: c, controller: d } = l;
        if (d && d.signal.aborted) return;
        let p = o[i];
        if ((Y(p, 'Did not find corresponding fetcher result'), we(p))) {
          let g = ke(e.matches, c?.route.id);
          ((u && u[g.route.id]) || (u = { ...u, [g.route.id]: p.error }),
            e.fetchers.delete(i));
        } else if (Be(p)) Y(!1, 'Unhandled fetcher revalidation redirect');
        else {
          let g = Oe(p.data);
          e.fetchers.set(i, g);
        }
      }),
    { loaderData: s, errors: u }
  );
}
function ln(e, t, r, n) {
  let a = Object.entries(t)
    .filter(([, o]) => o !== Tn)
    .reduce((o, [s, u]) => ((o[s] = u), o), {});
  for (let o of r) {
    let s = o.route.id;
    if (
      (!t.hasOwnProperty(s) &&
        e.hasOwnProperty(s) &&
        o.route.loader &&
        (a[s] = e[s]),
      n && n.hasOwnProperty(s))
    )
      break;
  }
  return a;
}
function sn(e) {
  return e
    ? we(e[1])
      ? { actionData: {} }
      : { actionData: { [e[0]]: e[1].data } }
    : {};
}
function ke(e, t) {
  return (
    (t ? e.slice(0, e.findIndex((n) => n.route.id === t) + 1) : [...e])
      .reverse()
      .find((n) => n.route.hasErrorBoundary === !0) || e[0]
  );
}
function Et(e) {
  let t =
    e.length === 1
      ? e[0]
      : e.find((r) => r.index || !r.path || r.path === '/') || {
          id: '__shim-error-route__',
        };
  return {
    matches: [{ params: {}, pathname: '', pathnameBase: '', route: t }],
    route: t,
  };
}
function be(
  e,
  { pathname: t, routeId: r, method: n, type: a, message: o } = {},
) {
  let s = 'Unknown Server Error',
    u = 'Unknown @remix-run/router error';
  return (
    e === 400
      ? ((s = 'Bad Request'),
        n && t && r
          ? (u = `You made a ${n} request to "${t}" but did not provide a \`loader\` for route "${r}", so there is no way to handle the request.`)
          : a === 'invalid-body' && (u = 'Unable to encode submission body'))
      : e === 403
        ? ((s = 'Forbidden'), (u = `Route "${r}" does not match URL "${t}"`))
        : e === 404
          ? ((s = 'Not Found'), (u = `No route matches URL "${t}"`))
          : e === 405 &&
            ((s = 'Method Not Allowed'),
            n && t && r
              ? (u = `You made a ${n.toUpperCase()} request to "${t}" but did not provide an \`action\` for route "${r}", so there is no way to handle the request.`)
              : n && (u = `Invalid request method "${n.toUpperCase()}"`)),
    new We(e || 500, s, new Error(u), !0)
  );
}
function Rt(e) {
  let t = Object.entries(e);
  for (let r = t.length - 1; r >= 0; r--) {
    let [n, a] = t[r];
    if (Be(a)) return { key: n, result: a };
  }
}
function Nn(e) {
  let t = typeof e == 'string' ? $e(e) : e;
  return Ie({ ...t, hash: '' });
}
function Lo(e, t) {
  return e.pathname !== t.pathname || e.search !== t.search
    ? !1
    : e.hash === ''
      ? t.hash !== ''
      : e.hash === t.hash
        ? !0
        : t.hash !== '';
}
function Po(e) {
  return (
    e != null &&
    typeof e == 'object' &&
    Object.entries(e).every(([t, r]) => typeof t == 'string' && To(r))
  );
}
function To(e) {
  return (
    e != null &&
    typeof e == 'object' &&
    'type' in e &&
    'result' in e &&
    (e.type === 'data' || e.type === 'error')
  );
}
function _o(e) {
  return pr(e.result) && so.has(e.result.status);
}
function we(e) {
  return e.type === 'error';
}
function Be(e) {
  return (e && e.type) === 'redirect';
}
function ar(e) {
  return (
    typeof e == 'object' &&
    e != null &&
    'type' in e &&
    'data' in e &&
    'init' in e &&
    e.type === 'DataWithResponseInit'
  );
}
function pr(e) {
  return (
    e != null &&
    typeof e.status == 'number' &&
    typeof e.statusText == 'string' &&
    typeof e.headers == 'object' &&
    typeof e.body < 'u'
  );
}
function Mo(e) {
  return lo.has(e.toUpperCase());
}
function ge(e) {
  return oo.has(e.toUpperCase());
}
function yr(e) {
  return new URLSearchParams(e).getAll('index').some((t) => t === '');
}
function Pt(e, t) {
  let r = typeof t == 'string' ? $e(t).search : t.search;
  if (e[e.length - 1].route.index && yr(r || '')) return e[e.length - 1];
  let n = xn(e);
  return n[n.length - 1];
}
function un(e) {
  let {
    formMethod: t,
    formAction: r,
    formEncType: n,
    text: a,
    formData: o,
    json: s,
  } = e;
  if (!(!t || !r || !n)) {
    if (a != null)
      return {
        formMethod: t,
        formAction: r,
        formEncType: n,
        formData: void 0,
        json: void 0,
        text: a,
      };
    if (o != null)
      return {
        formMethod: t,
        formAction: r,
        formEncType: n,
        formData: o,
        json: void 0,
        text: void 0,
      };
    if (s !== void 0)
      return {
        formMethod: t,
        formAction: r,
        formEncType: n,
        formData: void 0,
        json: s,
        text: void 0,
      };
  }
}
function Xt(e, t) {
  return t
    ? {
        state: 'loading',
        location: e,
        formMethod: t.formMethod,
        formAction: t.formAction,
        formEncType: t.formEncType,
        formData: t.formData,
        json: t.json,
        text: t.text,
      }
    : {
        state: 'loading',
        location: e,
        formMethod: void 0,
        formAction: void 0,
        formEncType: void 0,
        formData: void 0,
        json: void 0,
        text: void 0,
      };
}
function Do(e, t) {
  return {
    state: 'submitting',
    location: e,
    formMethod: t.formMethod,
    formAction: t.formAction,
    formEncType: t.formEncType,
    formData: t.formData,
    json: t.json,
    text: t.text,
  };
}
function ot(e, t) {
  return e
    ? {
        state: 'loading',
        formMethod: e.formMethod,
        formAction: e.formAction,
        formEncType: e.formEncType,
        formData: e.formData,
        json: e.json,
        text: e.text,
        data: t,
      }
    : {
        state: 'loading',
        formMethod: void 0,
        formAction: void 0,
        formEncType: void 0,
        formData: void 0,
        json: void 0,
        text: void 0,
        data: t,
      };
}
function Oo(e, t) {
  return {
    state: 'submitting',
    formMethod: e.formMethod,
    formAction: e.formAction,
    formEncType: e.formEncType,
    formData: e.formData,
    json: e.json,
    text: e.text,
    data: t ? t.data : void 0,
  };
}
function Oe(e) {
  return {
    state: 'idle',
    formMethod: void 0,
    formAction: void 0,
    formEncType: void 0,
    formData: void 0,
    json: void 0,
    text: void 0,
    data: e,
  };
}
function Ao(e, t) {
  try {
    let r = e.sessionStorage.getItem(Pn);
    if (r) {
      let n = JSON.parse(r);
      for (let [a, o] of Object.entries(n || {}))
        o && Array.isArray(o) && t.set(a, new Set(o || []));
    }
  } catch {}
}
function No(e, t) {
  if (t.size > 0) {
    let r = {};
    for (let [n, a] of t) r[n] = [...a];
    try {
      e.sessionStorage.setItem(Pn, JSON.stringify(r));
    } catch (n) {
      ne(
        !1,
        `Failed to save applied view transitions in sessionStorage (${n}).`,
      );
    }
  }
}
function ko() {
  let e,
    t,
    r = new Promise((n, a) => {
      ((e = async (o) => {
        n(o);
        try {
          await r;
        } catch {}
      }),
        (t = async (o) => {
          a(o);
          try {
            await r;
          } catch {}
        }));
    });
  return { promise: r, resolve: e, reject: t };
}
var Ve = h.createContext(null);
Ve.displayName = 'DataRouter';
var qe = h.createContext(null);
qe.displayName = 'DataRouterState';
var Io = h.createContext(!1);
function $o() {
  return h.useContext(Io);
}
var vr = h.createContext({ isTransitioning: !1 });
vr.displayName = 'ViewTransition';
var kn = h.createContext(new Map());
kn.displayName = 'Fetchers';
var Fo = h.createContext(null);
Fo.displayName = 'Await';
var Ce = h.createContext(null);
Ce.displayName = 'Navigation';
var kt = h.createContext(null);
kt.displayName = 'Location';
var xe = h.createContext({ outlet: null, matches: [], isDataRoute: !1 });
xe.displayName = 'Route';
var gr = h.createContext(null);
gr.displayName = 'RouteError';
function jo(e, { relative: t } = {}) {
  Y(dt(), 'useHref() may be used only in the context of a <Router> component.');
  let { basename: r, navigator: n } = h.useContext(Ce),
    { hash: a, pathname: o, search: s } = ft(e, { relative: t }),
    u = o;
  return (
    r !== '/' && (u = o === '/' ? r : Pe([r, o])),
    n.createHref({ pathname: u, search: s, hash: a })
  );
}
function dt() {
  return h.useContext(kt) != null;
}
function Te() {
  return (
    Y(
      dt(),
      'useLocation() may be used only in the context of a <Router> component.',
    ),
    h.useContext(kt).location
  );
}
var In =
  'You should call navigate() in a React.useEffect(), not when your component is first rendered.';
function $n(e) {
  h.useContext(Ce).static || h.useLayoutEffect(e);
}
function Ho() {
  let { isDataRoute: e } = h.useContext(xe);
  return e ? Zo() : Uo();
}
function Uo() {
  Y(
    dt(),
    'useNavigate() may be used only in the context of a <Router> component.',
  );
  let e = h.useContext(Ve),
    { basename: t, navigator: r } = h.useContext(Ce),
    { matches: n } = h.useContext(xe),
    { pathname: a } = Te(),
    o = JSON.stringify(dr(n)),
    s = h.useRef(!1);
  return (
    $n(() => {
      s.current = !0;
    }),
    h.useCallback(
      (l, i = {}) => {
        if ((ne(s.current, In), !s.current)) return;
        if (typeof l == 'number') {
          r.go(l);
          return;
        }
        let c = fr(l, JSON.parse(o), a, i.relative === 'path');
        (e == null &&
          t !== '/' &&
          (c.pathname = c.pathname === '/' ? t : Pe([t, c.pathname])),
          (i.replace ? r.replace : r.push)(c, i.state, i));
      },
      [t, r, o, a, e],
    )
  );
}
var zo = h.createContext(null);
function Bo(e) {
  let t = h.useContext(xe).outlet;
  return h.useMemo(
    () => t && h.createElement(zo.Provider, { value: e }, t),
    [t, e],
  );
}
function Fn() {
  let { matches: e } = h.useContext(xe),
    t = e[e.length - 1];
  return t ? t.params : {};
}
function ft(e, { relative: t } = {}) {
  let { matches: r } = h.useContext(xe),
    { pathname: n } = Te(),
    a = JSON.stringify(dr(r));
  return h.useMemo(() => fr(e, JSON.parse(a), n, t === 'path'), [e, a, n, t]);
}
function Wo(e, t, r, n, a) {
  Y(
    dt(),
    'useRoutes() may be used only in the context of a <Router> component.',
  );
  let { navigator: o } = h.useContext(Ce),
    { matches: s } = h.useContext(xe),
    u = s[s.length - 1],
    l = u ? u.params : {},
    i = u ? u.pathname : '/',
    c = u ? u.pathnameBase : '/',
    d = u && u.route;
  {
    let b = (d && d.path) || '';
    zn(
      i,
      !d || b.endsWith('*') || b.endsWith('*?'),
      `You rendered descendant <Routes> (or called \`useRoutes()\`) at "${i}" (under <Route path="${b}">) but the parent route path has no trailing "*". This means if you navigate deeper, the parent won't match anymore and therefore the child routes will never render.

Please change the parent <Route path="${b}"> to <Route path="${b === '/' ? '*' : `${b}/*`}">.`,
    );
  }
  let p = Te(),
    g;
  g = p;
  let R = g.pathname || '/',
    P = R;
  if (c !== '/') {
    let b = c.replace(/^\//, '').split('/');
    P = '/' + R.replace(/^\//, '').split('/').slice(b.length).join('/');
  }
  let E = Ae(e, { pathname: P });
  return (
    ne(
      d || E != null,
      `No routes matched location "${g.pathname}${g.search}${g.hash}" `,
    ),
    ne(
      E == null ||
        E[E.length - 1].route.element !== void 0 ||
        E[E.length - 1].route.Component !== void 0 ||
        E[E.length - 1].route.lazy !== void 0,
      `Matched leaf route at location "${g.pathname}${g.search}${g.hash}" does not have an element or Component. This means it will render an <Outlet /> with a null value by default resulting in an "empty" page.`,
    ),
    Xo(
      E &&
        E.map((b) =>
          Object.assign({}, b, {
            params: Object.assign({}, l, b.params),
            pathname: Pe([
              c,
              o.encodeLocation
                ? o.encodeLocation(
                    b.pathname.replace(/\?/g, '%3F').replace(/#/g, '%23'),
                  ).pathname
                : b.pathname,
            ]),
            pathnameBase:
              b.pathnameBase === '/'
                ? c
                : Pe([
                    c,
                    o.encodeLocation
                      ? o.encodeLocation(
                          b.pathnameBase
                            .replace(/\?/g, '%3F')
                            .replace(/#/g, '%23'),
                        ).pathname
                      : b.pathnameBase,
                  ]),
          }),
        ),
      s,
      r,
      n,
      a,
    )
  );
}
function Yo() {
  let e = Rr(),
    t = Ye(e)
      ? `${e.status} ${e.statusText}`
      : e instanceof Error
        ? e.message
        : JSON.stringify(e),
    r = e instanceof Error ? e.stack : null,
    n = 'rgba(200,200,200, 0.5)',
    a = { padding: '0.5rem', backgroundColor: n },
    o = { padding: '2px 4px', backgroundColor: n },
    s = null;
  return (
    console.error('Error handled by React Router default ErrorBoundary:', e),
    (s = h.createElement(
      h.Fragment,
      null,
      h.createElement('p', null, '💿 Hey developer 👋'),
      h.createElement(
        'p',
        null,
        'You can provide a way better UX than this when your app throws errors by providing your own ',
        h.createElement('code', { style: o }, 'ErrorBoundary'),
        ' or',
        ' ',
        h.createElement('code', { style: o }, 'errorElement'),
        ' prop on your route.',
      ),
    )),
    h.createElement(
      h.Fragment,
      null,
      h.createElement('h2', null, 'Unexpected Application Error!'),
      h.createElement('h3', { style: { fontStyle: 'italic' } }, t),
      r ? h.createElement('pre', { style: a }, r) : null,
      s,
    )
  );
}
var Vo = h.createElement(Yo, null),
  Jo = class extends h.Component {
    constructor(e) {
      (super(e),
        (this.state = {
          location: e.location,
          revalidation: e.revalidation,
          error: e.error,
        }));
    }
    static getDerivedStateFromError(e) {
      return { error: e };
    }
    static getDerivedStateFromProps(e, t) {
      return t.location !== e.location ||
        (t.revalidation !== 'idle' && e.revalidation === 'idle')
        ? { error: e.error, location: e.location, revalidation: e.revalidation }
        : {
            error: e.error !== void 0 ? e.error : t.error,
            location: t.location,
            revalidation: e.revalidation || t.revalidation,
          };
    }
    componentDidCatch(e, t) {
      this.props.unstable_onError
        ? this.props.unstable_onError(e, t)
        : console.error(
            'React Router caught the following error during render',
            e,
          );
    }
    render() {
      return this.state.error !== void 0
        ? h.createElement(
            xe.Provider,
            { value: this.props.routeContext },
            h.createElement(gr.Provider, {
              value: this.state.error,
              children: this.props.component,
            }),
          )
        : this.props.children;
    }
  };
function Go({ routeContext: e, match: t, children: r }) {
  let n = h.useContext(Ve);
  return (
    n &&
      n.static &&
      n.staticContext &&
      (t.route.errorElement || t.route.ErrorBoundary) &&
      (n.staticContext._deepestRenderedBoundaryId = t.route.id),
    h.createElement(xe.Provider, { value: e }, r)
  );
}
function Xo(e, t = [], r = null, n = null, a = null) {
  if (e == null) {
    if (!r) return null;
    if (r.errors) e = r.matches;
    else if (t.length === 0 && !r.initialized && r.matches.length > 0)
      e = r.matches;
    else return null;
  }
  let o = e,
    s = r?.errors;
  if (s != null) {
    let i = o.findIndex((c) => c.route.id && s?.[c.route.id] !== void 0);
    (Y(
      i >= 0,
      `Could not find a matching route for errors on route IDs: ${Object.keys(s).join(',')}`,
    ),
      (o = o.slice(0, Math.min(o.length, i + 1))));
  }
  let u = !1,
    l = -1;
  if (r)
    for (let i = 0; i < o.length; i++) {
      let c = o[i];
      if (
        ((c.route.HydrateFallback || c.route.hydrateFallbackElement) && (l = i),
        c.route.id)
      ) {
        let { loaderData: d, errors: p } = r,
          g =
            c.route.loader &&
            !d.hasOwnProperty(c.route.id) &&
            (!p || p[c.route.id] === void 0);
        if (c.route.lazy || g) {
          ((u = !0), l >= 0 ? (o = o.slice(0, l + 1)) : (o = [o[0]]));
          break;
        }
      }
    }
  return o.reduceRight((i, c, d) => {
    let p,
      g = !1,
      R = null,
      P = null;
    r &&
      ((p = s && c.route.id ? s[c.route.id] : void 0),
      (R = c.route.errorElement || Vo),
      u &&
        (l < 0 && d === 0
          ? (zn(
              'route-fallback',
              !1,
              'No `HydrateFallback` element provided to render during initial hydration',
            ),
            (g = !0),
            (P = null))
          : l === d &&
            ((g = !0), (P = c.route.hydrateFallbackElement || null))));
    let E = t.concat(o.slice(0, d + 1)),
      S = () => {
        let b;
        return (
          p
            ? (b = R)
            : g
              ? (b = P)
              : c.route.Component
                ? (b = h.createElement(c.route.Component, null))
                : c.route.element
                  ? (b = c.route.element)
                  : (b = i),
          h.createElement(Go, {
            match: c,
            routeContext: { outlet: i, matches: E, isDataRoute: r != null },
            children: b,
          })
        );
      };
    return r && (c.route.ErrorBoundary || c.route.errorElement || d === 0)
      ? h.createElement(Jo, {
          location: r.location,
          revalidation: r.revalidation,
          component: R,
          error: p,
          children: S(),
          routeContext: { outlet: null, matches: E, isDataRoute: !0 },
          unstable_onError: n,
        })
      : S();
  }, null);
}
function wr(e) {
  return `${e} must be used within a data router.  See https://reactrouter.com/en/main/routers/picking-a-router.`;
}
function jn(e) {
  let t = h.useContext(Ve);
  return (Y(t, wr(e)), t);
}
function Qe(e) {
  let t = h.useContext(qe);
  return (Y(t, wr(e)), t);
}
function Ko(e) {
  let t = h.useContext(xe);
  return (Y(t, wr(e)), t);
}
function ht(e) {
  let t = Ko(e),
    r = t.matches[t.matches.length - 1];
  return (
    Y(r.route.id, `${e} can only be used on routes that contain a unique "id"`),
    r.route.id
  );
}
function qo() {
  return ht('useRouteId');
}
function Qo() {
  return Qe('useNavigation').navigation;
}
function Fl() {
  let e = jn('useRevalidator'),
    t = Qe('useRevalidator'),
    r = h.useCallback(async () => {
      await e.router.revalidate();
    }, [e.router]);
  return h.useMemo(
    () => ({ revalidate: r, state: t.revalidation }),
    [r, t.revalidation],
  );
}
function Er() {
  let { matches: e, loaderData: t } = Qe('useMatches');
  return h.useMemo(() => e.map((r) => Rn(r, t)), [e, t]);
}
function Hn() {
  let e = Qe('useLoaderData'),
    t = ht('useLoaderData');
  return e.loaderData[t];
}
function Un() {
  let e = Qe('useActionData'),
    t = ht('useLoaderData');
  return e.actionData ? e.actionData[t] : void 0;
}
function Rr() {
  let e = h.useContext(gr),
    t = Qe('useRouteError'),
    r = ht('useRouteError');
  return e !== void 0 ? e : t.errors?.[r];
}
function Zo() {
  let { router: e } = jn('useNavigate'),
    t = ht('useNavigate'),
    r = h.useRef(!1);
  return (
    $n(() => {
      r.current = !0;
    }),
    h.useCallback(
      async (a, o = {}) => {
        (ne(r.current, In),
          r.current &&
            (typeof a == 'number'
              ? e.navigate(a)
              : await e.navigate(a, { fromRouteId: t, ...o })));
      },
      [e, t],
    )
  );
}
var cn = {};
function zn(e, t, r) {
  !t && !cn[e] && ((cn[e] = !0), ne(!1, r));
}
var dn = {};
function or(e, t) {
  !e && !dn[t] && ((dn[t] = !0), console.warn(t));
}
function jl(e) {
  let t = {
    hasErrorBoundary:
      e.hasErrorBoundary || e.ErrorBoundary != null || e.errorElement != null,
  };
  return (
    e.Component &&
      (e.element &&
        ne(
          !1,
          'You should not include both `Component` and `element` on your route - `Component` will be used.',
        ),
      Object.assign(t, {
        element: h.createElement(e.Component),
        Component: void 0,
      })),
    e.HydrateFallback &&
      (e.hydrateFallbackElement &&
        ne(
          !1,
          'You should not include both `HydrateFallback` and `hydrateFallbackElement` on your route - `HydrateFallback` will be used.',
        ),
      Object.assign(t, {
        hydrateFallbackElement: h.createElement(e.HydrateFallback),
        HydrateFallback: void 0,
      })),
    e.ErrorBoundary &&
      (e.errorElement &&
        ne(
          !1,
          'You should not include both `ErrorBoundary` and `errorElement` on your route - `ErrorBoundary` will be used.',
        ),
      Object.assign(t, {
        errorElement: h.createElement(e.ErrorBoundary),
        ErrorBoundary: void 0,
      })),
    t
  );
}
var Hl = ['HydrateFallback', 'hydrateFallbackElement'],
  ei = class {
    constructor() {
      ((this.status = 'pending'),
        (this.promise = new Promise((e, t) => {
          ((this.resolve = (r) => {
            this.status === 'pending' && ((this.status = 'resolved'), e(r));
          }),
            (this.reject = (r) => {
              this.status === 'pending' && ((this.status = 'rejected'), t(r));
            }));
        })));
    }
  };
function Ul({ router: e, flushSync: t, unstable_onError: r }) {
  let [n, a] = h.useState(e.state),
    [o, s] = h.useState(),
    [u, l] = h.useState({ isTransitioning: !1 }),
    [i, c] = h.useState(),
    [d, p] = h.useState(),
    [g, R] = h.useState(),
    P = h.useRef(new Map()),
    E = h.useCallback(
      (_) => {
        a(
          (y) => (
            _.errors &&
              r &&
              Object.entries(_.errors).forEach(([L, B]) => {
                y.errors?.[L] !== B && r(B);
              }),
            _
          ),
        );
      },
      [r],
    ),
    S = h.useCallback(
      (_, { deletedFetchers: y, flushSync: L, viewTransitionOpts: B }) => {
        (_.fetchers.forEach((J, ae) => {
          J.data !== void 0 && P.current.set(ae, J.data);
        }),
          y.forEach((J) => P.current.delete(J)),
          or(
            L === !1 || t != null,
            'You provided the `flushSync` option to a router update, but you are not using the `<RouterProvider>` from `react-router/dom` so `ReactDOM.flushSync()` is unavailable.  Please update your app to `import { RouterProvider } from "react-router/dom"` and ensure you have `react-dom` installed as a dependency to use the `flushSync` option.',
          ));
        let U =
          e.window != null &&
          e.window.document != null &&
          typeof e.window.document.startViewTransition == 'function';
        if (
          (or(
            B == null || U,
            'You provided the `viewTransition` option to a router update, but you do not appear to be running in a DOM environment as `window.startViewTransition` is not available.',
          ),
          !B || !U)
        ) {
          t && L ? t(() => E(_)) : h.startTransition(() => E(_));
          return;
        }
        if (t && L) {
          t(() => {
            (d && (i && i.resolve(), d.skipTransition()),
              l({
                isTransitioning: !0,
                flushSync: !0,
                currentLocation: B.currentLocation,
                nextLocation: B.nextLocation,
              }));
          });
          let J = e.window.document.startViewTransition(() => {
            t(() => E(_));
          });
          (J.finished.finally(() => {
            t(() => {
              (c(void 0), p(void 0), s(void 0), l({ isTransitioning: !1 }));
            });
          }),
            t(() => p(J)));
          return;
        }
        d
          ? (i && i.resolve(),
            d.skipTransition(),
            R({
              state: _,
              currentLocation: B.currentLocation,
              nextLocation: B.nextLocation,
            }))
          : (s(_),
            l({
              isTransitioning: !0,
              flushSync: !1,
              currentLocation: B.currentLocation,
              nextLocation: B.nextLocation,
            }));
      },
      [e.window, t, d, i, E],
    );
  (h.useLayoutEffect(() => e.subscribe(S), [e, S]),
    h.useEffect(() => {
      u.isTransitioning && !u.flushSync && c(new ei());
    }, [u]),
    h.useEffect(() => {
      if (i && o && e.window) {
        let _ = o,
          y = i.promise,
          L = e.window.document.startViewTransition(async () => {
            (h.startTransition(() => E(_)), await y);
          });
        (L.finished.finally(() => {
          (c(void 0), p(void 0), s(void 0), l({ isTransitioning: !1 }));
        }),
          p(L));
      }
    }, [o, i, e.window, E]),
    h.useEffect(() => {
      i && o && n.location.key === o.location.key && i.resolve();
    }, [i, d, n.location, o]),
    h.useEffect(() => {
      !u.isTransitioning &&
        g &&
        (s(g.state),
        l({
          isTransitioning: !0,
          flushSync: !1,
          currentLocation: g.currentLocation,
          nextLocation: g.nextLocation,
        }),
        R(void 0));
    }, [u.isTransitioning, g]));
  let b = h.useMemo(
      () => ({
        createHref: e.createHref,
        encodeLocation: e.encodeLocation,
        go: (_) => e.navigate(_),
        push: (_, y, L) =>
          e.navigate(_, {
            state: y,
            preventScrollReset: L?.preventScrollReset,
          }),
        replace: (_, y, L) =>
          e.navigate(_, {
            replace: !0,
            state: y,
            preventScrollReset: L?.preventScrollReset,
          }),
      }),
      [e],
    ),
    D = e.basename || '/',
    M = h.useMemo(
      () => ({
        router: e,
        navigator: b,
        static: !1,
        basename: D,
        unstable_onError: r,
      }),
      [e, b, D, r],
    );
  return h.createElement(
    h.Fragment,
    null,
    h.createElement(
      Ve.Provider,
      { value: M },
      h.createElement(
        qe.Provider,
        { value: n },
        h.createElement(
          kn.Provider,
          { value: P.current },
          h.createElement(
            vr.Provider,
            { value: u },
            h.createElement(
              ni,
              {
                basename: D,
                location: n.location,
                navigationType: n.historyAction,
                navigator: b,
              },
              h.createElement(ti, {
                routes: e.routes,
                future: e.future,
                state: n,
                unstable_onError: r,
              }),
            ),
          ),
        ),
      ),
    ),
    null,
  );
}
var ti = h.memo(ri);
function ri({ routes: e, future: t, state: r, unstable_onError: n }) {
  return Wo(e, void 0, r, n, t);
}
function zl(e) {
  return Bo(e.context);
}
function ni({
  basename: e = '/',
  children: t = null,
  location: r,
  navigationType: n = 'POP',
  navigator: a,
  static: o = !1,
}) {
  Y(
    !dt(),
    'You cannot render a <Router> inside another <Router>. You should never have more than one in your app.',
  );
  let s = e.replace(/^\/*/, '/'),
    u = h.useMemo(
      () => ({ basename: s, navigator: a, static: o, future: {} }),
      [s, a, o],
    );
  typeof r == 'string' && (r = $e(r));
  let {
      pathname: l = '/',
      search: i = '',
      hash: c = '',
      state: d = null,
      key: p = 'default',
    } = r,
    g = h.useMemo(() => {
      let R = Ee(l, s);
      return R == null
        ? null
        : {
            location: { pathname: R, search: i, hash: c, state: d, key: p },
            navigationType: n,
          };
    }, [s, l, i, c, d, p, n]);
  return (
    ne(
      g != null,
      `<Router basename="${s}"> is not able to match the URL "${l}${i}${c}" because it does not start with the basename, so the <Router> won't render anything.`,
    ),
    g == null
      ? null
      : h.createElement(
          Ce.Provider,
          { value: u },
          h.createElement(kt.Provider, { children: t, value: g }),
        )
  );
}
function ai() {
  return { params: Fn(), loaderData: Hn(), actionData: Un(), matches: Er() };
}
function Bl(e) {
  return function () {
    const r = ai();
    return h.createElement(e, r);
  };
}
function oi() {
  return { params: Fn(), loaderData: Hn(), actionData: Un(), error: Rr() };
}
function Wl(e) {
  return function () {
    const r = oi();
    return h.createElement(e, r);
  };
}
var Tt = 'get',
  _t = 'application/x-www-form-urlencoded';
function It(e) {
  return e != null && typeof e.tagName == 'string';
}
function ii(e) {
  return It(e) && e.tagName.toLowerCase() === 'button';
}
function li(e) {
  return It(e) && e.tagName.toLowerCase() === 'form';
}
function si(e) {
  return It(e) && e.tagName.toLowerCase() === 'input';
}
function ui(e) {
  return !!(e.metaKey || e.altKey || e.ctrlKey || e.shiftKey);
}
function ci(e, t) {
  return e.button === 0 && (!t || t === '_self') && !ui(e);
}
var St = null;
function di() {
  if (St === null)
    try {
      (new FormData(document.createElement('form'), 0), (St = !1));
    } catch {
      St = !0;
    }
  return St;
}
var fi = new Set([
  'application/x-www-form-urlencoded',
  'multipart/form-data',
  'text/plain',
]);
function Kt(e) {
  return e != null && !fi.has(e)
    ? (ne(
        !1,
        `"${e}" is not a valid \`encType\` for \`<Form>\`/\`<fetcher.Form>\` and will default to "${_t}"`,
      ),
      null)
    : e;
}
function hi(e, t) {
  let r, n, a, o, s;
  if (li(e)) {
    let u = e.getAttribute('action');
    ((n = u ? Ee(u, t) : null),
      (r = e.getAttribute('method') || Tt),
      (a = Kt(e.getAttribute('enctype')) || _t),
      (o = new FormData(e)));
  } else if (ii(e) || (si(e) && (e.type === 'submit' || e.type === 'image'))) {
    let u = e.form;
    if (u == null)
      throw new Error(
        'Cannot submit a <button> or <input type="submit"> without a <form>',
      );
    let l = e.getAttribute('formaction') || u.getAttribute('action');
    if (
      ((n = l ? Ee(l, t) : null),
      (r = e.getAttribute('formmethod') || u.getAttribute('method') || Tt),
      (a =
        Kt(e.getAttribute('formenctype')) ||
        Kt(u.getAttribute('enctype')) ||
        _t),
      (o = new FormData(u, e)),
      !di())
    ) {
      let { name: i, type: c, value: d } = e;
      if (c === 'image') {
        let p = i ? `${i}.` : '';
        (o.append(`${p}x`, '0'), o.append(`${p}y`, '0'));
      } else i && o.append(i, d);
    }
  } else {
    if (It(e))
      throw new Error(
        'Cannot submit element that is not <form>, <button>, or <input type="submit|image">',
      );
    ((r = Tt), (n = null), (a = _t), (s = e));
  }
  return (
    o && a === 'text/plain' && ((s = o), (o = void 0)),
    { action: n, method: r.toLowerCase(), encType: a, formData: o, body: s }
  );
}
var mi = -1,
  pi = -2,
  yi = -3,
  vi = -4,
  gi = -5,
  wi = -6,
  Ei = -7,
  Ri = 'B',
  Si = 'D',
  Bn = 'E',
  bi = 'M',
  Ci = 'N',
  Wn = 'P',
  xi = 'R',
  Li = 'S',
  Pi = 'Y',
  Ti = 'U',
  _i = 'Z',
  Yn = class {
    constructor() {
      this.promise = new Promise((e, t) => {
        ((this.resolve = e), (this.reject = t));
      });
    }
  };
function Mi() {
  const e = new TextDecoder();
  let t = '';
  return new TransformStream({
    transform(r, n) {
      const a = e.decode(r, { stream: !0 }),
        o = (t + a).split(`
`);
      t = o.pop() || '';
      for (const s of o) n.enqueue(s);
    },
    flush(r) {
      t && r.enqueue(t);
    },
  });
}
Object.getOwnPropertyNames(Object.prototype).sort().join('\0');
var qt =
  typeof window < 'u' ? window : typeof globalThis < 'u' ? globalThis : void 0;
function ir(e) {
  const { hydrated: t, values: r } = this;
  if (typeof e == 'number') return fn.call(this, e);
  if (!Array.isArray(e) || !e.length) throw new SyntaxError();
  const n = r.length;
  for (const a of e) r.push(a);
  return ((t.length = r.length), fn.call(this, n));
}
function fn(e) {
  const { hydrated: t, values: r, deferred: n, plugins: a } = this;
  let o;
  const s = [
    [
      e,
      (l) => {
        o = l;
      },
    ],
  ];
  let u = [];
  for (; s.length > 0; ) {
    const [l, i] = s.pop();
    switch (l) {
      case Ei:
        i(void 0);
        continue;
      case gi:
        i(null);
        continue;
      case pi:
        i(NaN);
        continue;
      case wi:
        i(1 / 0);
        continue;
      case yi:
        i(-1 / 0);
        continue;
      case vi:
        i(-0);
        continue;
    }
    if (t[l]) {
      i(t[l]);
      continue;
    }
    const c = r[l];
    if (!c || typeof c != 'object') {
      ((t[l] = c), i(c));
      continue;
    }
    if (Array.isArray(c))
      if (typeof c[0] == 'string') {
        const [d, p, g] = c;
        switch (d) {
          case Si:
            i((t[l] = new Date(p)));
            continue;
          case Ti:
            i((t[l] = new URL(p)));
            continue;
          case Ri:
            i((t[l] = BigInt(p)));
            continue;
          case xi:
            i((t[l] = new RegExp(p, g)));
            continue;
          case Pi:
            i((t[l] = Symbol.for(p)));
            continue;
          case Li:
            const R = new Set();
            t[l] = R;
            for (let M = c.length - 1; M > 0; M--)
              s.push([
                c[M],
                (_) => {
                  R.add(_);
                },
              ]);
            i(R);
            continue;
          case bi:
            const P = new Map();
            t[l] = P;
            for (let M = c.length - 2; M > 0; M -= 2) {
              const _ = [];
              (s.push([
                c[M + 1],
                (y) => {
                  _[1] = y;
                },
              ]),
                s.push([
                  c[M],
                  (y) => {
                    _[0] = y;
                  },
                ]),
                u.push(() => {
                  P.set(_[0], _[1]);
                }));
            }
            i(P);
            continue;
          case Ci:
            const E = Object.create(null);
            t[l] = E;
            for (const M of Object.keys(p).reverse()) {
              const _ = [];
              (s.push([
                p[M],
                (y) => {
                  _[1] = y;
                },
              ]),
                s.push([
                  Number(M.slice(1)),
                  (y) => {
                    _[0] = y;
                  },
                ]),
                u.push(() => {
                  E[_[0]] = _[1];
                }));
            }
            i(E);
            continue;
          case Wn:
            if (t[p]) i((t[l] = t[p]));
            else {
              const M = new Yn();
              ((n[p] = M), i((t[l] = M.promise)));
            }
            continue;
          case Bn:
            const [, S, b] = c;
            let D = b && qt && qt[b] ? new qt[b](S) : new Error(S);
            ((t[l] = D), i(D));
            continue;
          case _i:
            i((t[l] = t[p]));
            continue;
          default:
            if (Array.isArray(a)) {
              const M = [],
                _ = c.slice(1);
              for (let y = 0; y < _.length; y++) {
                const L = _[y];
                s.push([
                  L,
                  (B) => {
                    M[y] = B;
                  },
                ]);
              }
              u.push(() => {
                for (const y of a) {
                  const L = y(c[0], ...M);
                  if (L) {
                    i((t[l] = L.value));
                    return;
                  }
                }
                throw new SyntaxError();
              });
              continue;
            }
            throw new SyntaxError();
        }
      } else {
        const d = [];
        t[l] = d;
        for (let p = 0; p < c.length; p++) {
          const g = c[p];
          g !== mi &&
            s.push([
              g,
              (R) => {
                d[p] = R;
              },
            ]);
        }
        i(d);
        continue;
      }
    else {
      const d = {};
      t[l] = d;
      for (const p of Object.keys(c).reverse()) {
        const g = [];
        (s.push([
          c[p],
          (R) => {
            g[1] = R;
          },
        ]),
          s.push([
            Number(p.slice(1)),
            (R) => {
              g[0] = R;
            },
          ]),
          u.push(() => {
            d[g[0]] = g[1];
          }));
      }
      i(d);
      continue;
    }
  }
  for (; u.length > 0; ) u.pop()();
  return o;
}
async function Di(e, t) {
  const { plugins: r } = t ?? {},
    n = new Yn(),
    a = e.pipeThrough(Mi()).getReader(),
    o = { values: [], hydrated: [], deferred: {}, plugins: r },
    s = await Oi.call(o, a);
  let u = n.promise;
  return (
    s.done
      ? n.resolve()
      : (u = Ai.call(o, a)
          .then(n.resolve)
          .catch((l) => {
            for (const i of Object.values(o.deferred)) i.reject(l);
            n.reject(l);
          })),
    { done: u.then(() => a.closed), value: s.value }
  );
}
async function Oi(e) {
  const t = await e.read();
  if (!t.value) throw new SyntaxError();
  let r;
  try {
    r = JSON.parse(t.value);
  } catch {
    throw new SyntaxError();
  }
  return { done: t.done, value: ir.call(this, r) };
}
async function Ai(e) {
  let t = await e.read();
  for (; !t.done; ) {
    if (!t.value) continue;
    const r = t.value;
    switch (r[0]) {
      case Wn: {
        const n = r.indexOf(':'),
          a = Number(r.slice(1, n)),
          o = this.deferred[a];
        if (!o) throw new Error(`Deferred ID ${a} not found in stream`);
        const s = r.slice(n + 1);
        let u;
        try {
          u = JSON.parse(s);
        } catch {
          throw new SyntaxError();
        }
        const l = ir.call(this, u);
        o.resolve(l);
        break;
      }
      case Bn: {
        const n = r.indexOf(':'),
          a = Number(r.slice(1, n)),
          o = this.deferred[a];
        if (!o) throw new Error(`Deferred ID ${a} not found in stream`);
        const s = r.slice(n + 1);
        let u;
        try {
          u = JSON.parse(s);
        } catch {
          throw new SyntaxError();
        }
        const l = ir.call(this, u);
        o.reject(l);
        break;
      }
      default:
        throw new SyntaxError();
    }
    t = await e.read();
  }
}
async function Ni(e) {
  let t = { signal: e.signal };
  if (e.method !== 'GET') {
    t.method = e.method;
    let r = e.headers.get('Content-Type');
    r && /\bapplication\/json\b/.test(r)
      ? ((t.headers = { 'Content-Type': r }),
        (t.body = JSON.stringify(await e.json())))
      : r && /\btext\/plain\b/.test(r)
        ? ((t.headers = { 'Content-Type': r }), (t.body = await e.text()))
        : r && /\bapplication\/x-www-form-urlencoded\b/.test(r)
          ? (t.body = new URLSearchParams(await e.text()))
          : (t.body = await e.formData());
  }
  return t;
}
var ki = {
    '&': '\\u0026',
    '>': '\\u003e',
    '<': '\\u003c',
    '\u2028': '\\u2028',
    '\u2029': '\\u2029',
  },
  Ii = /[&><\u2028\u2029]/g;
function $i(e) {
  return e.replace(Ii, (t) => ki[t]);
}
function ye(e, t) {
  if (e === !1 || e === null || typeof e > 'u') throw new Error(t);
}
var lr = Symbol('SingleFetchRedirect'),
  Vn = class extends Error {},
  Fi = 202,
  ji = new Set([100, 101, 204, 205]);
function Yl(e, t, r, n, a) {
  let o = Hi(
    e,
    (s) => {
      let u = t.routes[s.route.id];
      ye(u, 'Route not found in manifest');
      let l = r[s.route.id];
      return {
        hasLoader: u.hasLoader,
        hasClientLoader: u.hasClientLoader,
        hasShouldRevalidate: !!l?.shouldRevalidate,
      };
    },
    Ji,
    n,
    a,
  );
  return async (s) => s.runClientMiddleware(o);
}
function Hi(e, t, r, n, a, o = () => !0) {
  return async (s) => {
    let { request: u, matches: l, fetcherKey: i } = s,
      c = e();
    if (u.method !== 'GET') return Ui(s, r, a);
    let d = l.some((p) => {
      let { hasLoader: g, hasClientLoader: R } = t(p);
      return p.unstable_shouldCallHandler() && g && !R;
    });
    return !n && !d
      ? zi(s, t, r, a)
      : i
        ? Yi(s, r, a)
        : Bi(s, c, t, r, n, a, o);
  };
}
async function Ui(e, t, r) {
  let n = e.matches.find((s) => s.unstable_shouldCallHandler());
  ye(n, 'No action match found');
  let a,
    o = await n.resolve(
      async (s) =>
        await s(async () => {
          let { data: l, status: i } = await t(e, r, [n.route.id]);
          return ((a = i), ct(l, n.route.id));
        }),
    );
  return pr(o.result) || Ye(o.result) || ar(o.result)
    ? { [n.route.id]: o }
    : { [n.route.id]: { type: o.type, result: no(o.result, a) } };
}
async function zi(e, t, r, n) {
  let a = e.matches.filter((s) => s.unstable_shouldCallHandler()),
    o = {};
  return (
    await Promise.all(
      a.map((s) =>
        s.resolve(async (u) => {
          try {
            let { hasClientLoader: l } = t(s),
              i = s.route.id,
              c = l
                ? await u(async () => {
                    let { data: d } = await r(e, n, [i]);
                    return ct(d, i);
                  })
                : await u();
            o[s.route.id] = { type: 'data', result: c };
          } catch (l) {
            o[s.route.id] = { type: 'error', result: l };
          }
        }),
      ),
    ),
    o
  );
}
async function Bi(e, t, r, n, a, o, s = () => !0) {
  let u = new Set(),
    l = !1,
    i = e.matches.map(() => hn()),
    c = hn(),
    d = {},
    p = Promise.all(
      e.matches.map(async (R, P) =>
        R.resolve(async (E) => {
          i[P].resolve();
          let S = R.route.id,
            { hasLoader: b, hasClientLoader: D, hasShouldRevalidate: M } = r(R),
            _ =
              !R.unstable_shouldRevalidateArgs ||
              R.unstable_shouldRevalidateArgs.actionStatus == null ||
              R.unstable_shouldRevalidateArgs.actionStatus < 400;
          if (!R.unstable_shouldCallHandler(_)) {
            l || (l = R.unstable_shouldRevalidateArgs != null && b && M === !0);
            return;
          }
          if (s(R) && D) {
            b && (l = !0);
            try {
              let L = await E(async () => {
                let { data: B } = await n(e, o, [S]);
                return ct(B, S);
              });
              d[S] = { type: 'data', result: L };
            } catch (L) {
              d[S] = { type: 'error', result: L };
            }
            return;
          }
          b && u.add(S);
          try {
            let L = await E(async () => {
              let B = await c.promise;
              return ct(B, S);
            });
            d[S] = { type: 'data', result: L };
          } catch (L) {
            d[S] = { type: 'error', result: L };
          }
        }),
      ),
    );
  if (
    (await Promise.all(i.map((R) => R.promise)),
    ((!t.state.initialized && t.state.navigation.state === 'idle') ||
      u.size === 0) &&
      !window.__reactRouterHdrActive)
  )
    c.resolve({ routes: {} });
  else {
    let R = a && l && u.size > 0 ? [...u.keys()] : void 0;
    try {
      let P = await n(e, o, R);
      c.resolve(P.data);
    } catch (P) {
      c.reject(P);
    }
  }
  return (await p, await Wi(c.promise, e.matches, u, d), d);
}
async function Wi(e, t, r, n) {
  try {
    let a,
      o = await e;
    if ('routes' in o) {
      for (let s of t)
        if (s.route.id in o.routes) {
          let u = o.routes[s.route.id];
          if ('error' in u) {
            ((a = u.error),
              n[s.route.id]?.result == null &&
                (n[s.route.id] = { type: 'error', result: a }));
            break;
          }
        }
    }
    a !== void 0 &&
      Array.from(r.values()).forEach((s) => {
        n[s].result instanceof Vn && (n[s].result = a);
      });
  } catch {}
}
async function Yi(e, t, r) {
  let n = e.matches.find((s) => s.unstable_shouldCallHandler());
  ye(n, 'No fetcher match found');
  let a = n.route.id,
    o = await n.resolve(async (s) =>
      s(async () => {
        let { data: u } = await t(e, r, [a]);
        return ct(u, a);
      }),
    );
  return { [n.route.id]: o };
}
function Vi(e) {
  let t = e.searchParams.getAll('index');
  e.searchParams.delete('index');
  let r = [];
  for (let n of t) n && r.push(n);
  for (let n of r) e.searchParams.append('index', n);
  return e;
}
function Jn(e, t, r) {
  let n =
    typeof e == 'string'
      ? new URL(
          e,
          typeof window > 'u'
            ? 'server://singlefetch/'
            : window.location.origin,
        )
      : e;
  return (
    n.pathname === '/'
      ? (n.pathname = `_root.${r}`)
      : t && Ee(n.pathname, t) === '/'
        ? (n.pathname = `${t.replace(/\/$/, '')}/_root.${r}`)
        : (n.pathname = `${n.pathname.replace(/\/$/, '')}.${r}`),
    n
  );
}
async function Ji(e, t, r) {
  let { request: n } = e,
    a = Jn(n.url, t, 'data');
  n.method === 'GET' &&
    ((a = Vi(a)), r && a.searchParams.set('_routes', r.join(',')));
  let o = await fetch(a, await Ni(n));
  if (o.status >= 400 && !o.headers.has('X-Remix-Response'))
    throw new We(o.status, o.statusText, await o.text());
  if (o.status === 204 && o.headers.has('X-Remix-Redirect'))
    return {
      status: Fi,
      data: {
        redirect: {
          redirect: o.headers.get('X-Remix-Redirect'),
          status: Number(o.headers.get('X-Remix-Status') || '302'),
          revalidate: o.headers.get('X-Remix-Revalidate') === 'true',
          reload: o.headers.get('X-Remix-Reload-Document') === 'true',
          replace: o.headers.get('X-Remix-Replace') === 'true',
        },
      },
    };
  if (ji.has(o.status)) {
    let s = {};
    return (
      r && n.method !== 'GET' && (s[r[0]] = { data: void 0 }),
      { status: o.status, data: { routes: s } }
    );
  }
  ye(o.body, 'No response body to decode');
  try {
    let s = await Gi(o.body, window),
      u;
    if (n.method === 'GET') {
      let l = s.value;
      lr in l ? (u = { redirect: l[lr] }) : (u = { routes: l });
    } else {
      let l = s.value,
        i = r?.[0];
      (ye(i, 'No routeId found for single fetch call decoding'),
        'redirect' in l ? (u = { redirect: l }) : (u = { routes: { [i]: l } }));
    }
    return { status: o.status, data: u };
  } catch {
    throw new Error('Unable to decode turbo-stream response');
  }
}
function Gi(e, t) {
  return Di(e, {
    plugins: [
      (r, ...n) => {
        if (r === 'SanitizedError') {
          let [a, o, s] = n,
            u = Error;
          a && a in t && typeof t[a] == 'function' && (u = t[a]);
          let l = new u(o);
          return ((l.stack = s), { value: l });
        }
        if (r === 'ErrorResponse') {
          let [a, o, s] = n;
          return { value: new We(o, s, a) };
        }
        if (r === 'SingleFetchRedirect') return { value: { [lr]: n[0] } };
        if (r === 'SingleFetchClassInstance') return { value: n[0] };
        if (r === 'SingleFetchFallback') return { value: void 0 };
      },
    ],
  });
}
function ct(e, t) {
  if ('redirect' in e) {
    let {
      redirect: n,
      revalidate: a,
      reload: o,
      replace: s,
      status: u,
    } = e.redirect;
    throw ao(n, {
      status: u,
      headers: {
        ...(a ? { 'X-Remix-Revalidate': 'yes' } : null),
        ...(o ? { 'X-Remix-Reload-Document': 'yes' } : null),
        ...(s ? { 'X-Remix-Replace': 'yes' } : null),
      },
    });
  }
  let r = e.routes[t];
  if (r == null) throw new Vn(`No result found for routeId "${t}"`);
  if ('error' in r) throw r.error;
  if ('data' in r) return r.data;
  throw new Error(`Invalid response found for routeId "${t}"`);
}
function hn() {
  let e,
    t,
    r = new Promise((n, a) => {
      ((e = async (o) => {
        n(o);
        try {
          await r;
        } catch {}
      }),
        (t = async (o) => {
          a(o);
          try {
            await r;
          } catch {}
        }));
    });
  return { promise: r, resolve: e, reject: t };
}
async function Gn(e, t) {
  if (e.id in t) return t[e.id];
  try {
    let r = await import(e.module);
    return ((t[e.id] = r), r);
  } catch (r) {
    return (
      console.error(
        `Error loading route module \`${e.module}\`, reloading page...`,
      ),
      console.error(r),
      window.__reactRouterContext && window.__reactRouterContext.isSpaMode,
      window.location.reload(),
      new Promise(() => {})
    );
  }
}
function Xi(e, t, r) {
  let n = e
      .map((o) => {
        let s = t[o.route.id],
          u = r.routes[o.route.id];
        return [
          u && u.css ? u.css.map((l) => ({ rel: 'stylesheet', href: l })) : [],
          s?.links?.() || [],
        ];
      })
      .flat(2),
    a = br(e, r);
  return Qn(n, a);
}
function Xn(e) {
  return e.css ? e.css.map((t) => ({ rel: 'stylesheet', href: t })) : [];
}
async function Ki(e) {
  if (!e.css) return;
  let t = Xn(e);
  await Promise.all(t.map(qn));
}
async function Kn(e, t) {
  if ((!e.css && !t.links) || !tl()) return;
  let r = [];
  if (
    (e.css && r.push(...Xn(e)), t.links && r.push(...t.links()), r.length === 0)
  )
    return;
  let n = [];
  for (let a of r)
    !Sr(a) &&
      a.rel === 'stylesheet' &&
      n.push({ ...a, rel: 'preload', as: 'style' });
  await Promise.all(n.map(qn));
}
async function qn(e) {
  return new Promise((t) => {
    if (
      (e.media && !window.matchMedia(e.media).matches) ||
      document.querySelector(`link[rel="stylesheet"][href="${e.href}"]`)
    )
      return t();
    let r = document.createElement('link');
    Object.assign(r, e);
    function n() {
      document.head.contains(r) && document.head.removeChild(r);
    }
    ((r.onload = () => {
      (n(), t());
    }),
      (r.onerror = () => {
        (n(), t());
      }),
      document.head.appendChild(r));
  });
}
function Sr(e) {
  return e != null && typeof e.page == 'string';
}
function qi(e) {
  return e == null
    ? !1
    : e.href == null
      ? e.rel === 'preload' &&
        typeof e.imageSrcSet == 'string' &&
        typeof e.imageSizes == 'string'
      : typeof e.rel == 'string' && typeof e.href == 'string';
}
async function Qi(e, t, r) {
  let n = await Promise.all(
    e.map(async (a) => {
      let o = t.routes[a.route.id];
      if (o) {
        let s = await Gn(o, r);
        return s.links ? s.links() : [];
      }
      return [];
    }),
  );
  return Qn(
    n
      .flat(1)
      .filter(qi)
      .filter((a) => a.rel === 'stylesheet' || a.rel === 'preload')
      .map((a) =>
        a.rel === 'stylesheet'
          ? { ...a, rel: 'prefetch', as: 'style' }
          : { ...a, rel: 'prefetch' },
      ),
  );
}
function mn(e, t, r, n, a, o) {
  let s = (l, i) => (r[i] ? l.route.id !== r[i].route.id : !0),
    u = (l, i) =>
      r[i].pathname !== l.pathname ||
      (r[i].route.path?.endsWith('*') && r[i].params['*'] !== l.params['*']);
  return o === 'assets'
    ? t.filter((l, i) => s(l, i) || u(l, i))
    : o === 'data'
      ? t.filter((l, i) => {
          let c = n.routes[l.route.id];
          if (!c || !c.hasLoader) return !1;
          if (s(l, i) || u(l, i)) return !0;
          if (l.route.shouldRevalidate) {
            let d = l.route.shouldRevalidate({
              currentUrl: new URL(
                a.pathname + a.search + a.hash,
                window.origin,
              ),
              currentParams: r[0]?.params || {},
              nextUrl: new URL(e, window.origin),
              nextParams: l.params,
              defaultShouldRevalidate: !0,
            });
            if (typeof d == 'boolean') return d;
          }
          return !0;
        })
      : [];
}
function br(e, t, { includeHydrateFallback: r } = {}) {
  return Zi(
    e
      .map((n) => {
        let a = t.routes[n.route.id];
        if (!a) return [];
        let o = [a.module];
        return (
          a.clientActionModule && (o = o.concat(a.clientActionModule)),
          a.clientLoaderModule && (o = o.concat(a.clientLoaderModule)),
          r &&
            a.hydrateFallbackModule &&
            (o = o.concat(a.hydrateFallbackModule)),
          a.imports && (o = o.concat(a.imports)),
          o
        );
      })
      .flat(1),
  );
}
function Zi(e) {
  return [...new Set(e)];
}
function el(e) {
  let t = {},
    r = Object.keys(e).sort();
  for (let n of r) t[n] = e[n];
  return t;
}
function Qn(e, t) {
  let r = new Set(),
    n = new Set(t);
  return e.reduce((a, o) => {
    if (t && !Sr(o) && o.as === 'script' && o.href && n.has(o.href)) return a;
    let u = JSON.stringify(el(o));
    return (r.has(u) || (r.add(u), a.push({ key: u, link: o })), a);
  }, []);
}
var bt;
function tl() {
  if (bt !== void 0) return bt;
  let e = document.createElement('link');
  return ((bt = e.relList.supports('preload')), (e = null), bt);
}
function rl() {
  return h.createElement(
    sr,
    { title: 'Loading...', renderScripts: !0 },
    h.createElement('script', {
      dangerouslySetInnerHTML: {
        __html: `
              console.log(
                "💿 Hey developer 👋. You can provide a way better UX than this " +
                "when your app is loading JS modules and/or running \`clientLoader\` " +
                "functions. Check out https://reactrouter.com/start/framework/route-module#hydratefallback " +
                "for more information."
              );
            `,
      },
    }),
  );
}
function Zn(e) {
  let t = {};
  return (
    Object.values(e).forEach((r) => {
      if (r) {
        let n = r.parentId || '';
        (t[n] || (t[n] = []), t[n].push(r));
      }
    }),
    t
  );
}
function nl(e, t, r) {
  let n = ea(t),
    a =
      t.HydrateFallback && (!r || e.id === 'root')
        ? t.HydrateFallback
        : e.id === 'root'
          ? rl
          : void 0,
    o = t.ErrorBoundary
      ? t.ErrorBoundary
      : e.id === 'root'
        ? () => h.createElement(na, { error: Rr() })
        : void 0;
  return e.id === 'root' && t.Layout
    ? {
        ...(n
          ? {
              element: h.createElement(
                t.Layout,
                null,
                h.createElement(n, null),
              ),
            }
          : { Component: n }),
        ...(o
          ? {
              errorElement: h.createElement(
                t.Layout,
                null,
                h.createElement(o, null),
              ),
            }
          : { ErrorBoundary: o }),
        ...(a
          ? {
              hydrateFallbackElement: h.createElement(
                t.Layout,
                null,
                h.createElement(a, null),
              ),
            }
          : { HydrateFallback: a }),
      }
    : { Component: n, ErrorBoundary: o, HydrateFallback: a };
}
function Vl(e, t, r, n, a, o) {
  return Cr(t, r, n, a, o, '', Zn(t), e);
}
function Ct(e, t) {
  if ((e === 'loader' && !t.hasLoader) || (e === 'action' && !t.hasAction)) {
    let n = `You are trying to call ${e === 'action' ? 'serverAction()' : 'serverLoader()'} on a route that does not have a server ${e} (routeId: "${t.id}")`;
    throw (console.error(n), new We(400, 'Bad Request', new Error(n), !0));
  }
}
function Qt(e, t) {
  let r = e === 'clientAction' ? 'a' : 'an',
    n = `Route "${t}" does not have ${r} ${e}, but you are trying to submit to it. To fix this, please add ${r} \`${e}\` function to the route`;
  throw (console.error(n), new We(405, 'Method Not Allowed', new Error(n), !0));
}
function Cr(e, t, r, n, a, o = '', s = Zn(e), u) {
  return (s[o] || []).map((l) => {
    let i = t[l.id];
    function c(b) {
      return (
        ye(
          typeof b == 'function',
          'No single fetch function available for route handler',
        ),
        b()
      );
    }
    function d(b) {
      return l.hasLoader ? c(b) : Promise.resolve(null);
    }
    function p(b) {
      if (!l.hasAction) throw Qt('action', l.id);
      return c(b);
    }
    function g(b) {
      import(b);
    }
    function R(b) {
      (b.clientActionModule && g(b.clientActionModule),
        b.clientLoaderModule && g(b.clientLoaderModule));
    }
    async function P(b) {
      let D = t[l.id],
        M = D ? Kn(l, D) : Promise.resolve();
      try {
        return b();
      } finally {
        await M;
      }
    }
    let E = { id: l.id, index: l.index, path: l.path };
    if (i) {
      Object.assign(E, {
        ...E,
        ...nl(l, i, a),
        middleware: i.clientMiddleware,
        handle: i.handle,
        shouldRevalidate: pn(E.path, i, l, n, u),
      });
      let b = r && r.loaderData && l.id in r.loaderData,
        D = b ? r?.loaderData?.[l.id] : void 0,
        M = r && r.errors && l.id in r.errors,
        _ = M ? r?.errors?.[l.id] : void 0,
        y = u == null && (i.clientLoader?.hydrate === !0 || !l.hasLoader);
      ((E.loader = async ({ request: L, params: B, context: U }, J) => {
        try {
          return await P(
            async () => (
              ye(i, 'No `routeModule` available for critical-route loader'),
              i.clientLoader
                ? i.clientLoader({
                    request: L,
                    params: B,
                    context: U,
                    async serverLoader() {
                      if ((Ct('loader', l), y)) {
                        if (b) return D;
                        if (M) throw _;
                      }
                      return d(J);
                    },
                  })
                : d(J)
            ),
          );
        } finally {
          y = !1;
        }
      }),
        (E.loader.hydrate = il(l.id, i.clientLoader, l.hasLoader, a)),
        (E.action = ({ request: L, params: B, context: U }, J) =>
          P(async () => {
            if (
              (ye(i, 'No `routeModule` available for critical-route action'),
              !i.clientAction)
            ) {
              if (a) throw Qt('clientAction', l.id);
              return p(J);
            }
            return i.clientAction({
              request: L,
              params: B,
              context: U,
              async serverAction() {
                return (Ct('action', l), p(J));
              },
            });
          })));
    } else {
      (l.hasClientLoader || (E.loader = (M, _) => P(() => d(_))),
        l.hasClientAction ||
          (E.action = (M, _) =>
            P(() => {
              if (a) throw Qt('clientAction', l.id);
              return p(_);
            })));
      let b;
      async function D() {
        return b
          ? await b
          : ((b = (async () => {
              (l.clientLoaderModule || l.clientActionModule) &&
                (await new Promise((_) => setTimeout(_, 0)));
              let M = ol(l, t);
              return (R(l), await M);
            })()),
            await b);
      }
      E.lazy = {
        loader: l.hasClientLoader
          ? async () => {
              let { clientLoader: M } = l.clientLoaderModule
                ? await import(l.clientLoaderModule)
                : await D();
              return (
                ye(M, 'No `clientLoader` export found'),
                (_, y) =>
                  M({
                    ..._,
                    async serverLoader() {
                      return (Ct('loader', l), d(y));
                    },
                  })
              );
            }
          : void 0,
        action: l.hasClientAction
          ? async () => {
              let M = l.clientActionModule ? import(l.clientActionModule) : D();
              R(l);
              let { clientAction: _ } = await M;
              return (
                ye(_, 'No `clientAction` export found'),
                (y, L) =>
                  _({
                    ...y,
                    async serverAction() {
                      return (Ct('action', l), p(L));
                    },
                  })
              );
            }
          : void 0,
        middleware: l.hasClientMiddleware
          ? async () => {
              let { clientMiddleware: M } = l.clientMiddlewareModule
                ? await import(l.clientMiddlewareModule)
                : await D();
              return (ye(M, 'No `clientMiddleware` export found'), M);
            }
          : void 0,
        shouldRevalidate: async () => {
          let M = await D();
          return pn(E.path, M, l, n, u);
        },
        handle: async () => (await D()).handle,
        Component: async () => (await D()).Component,
        ErrorBoundary: l.hasErrorBoundary
          ? async () => (await D()).ErrorBoundary
          : void 0,
      };
    }
    let S = Cr(e, t, r, n, a, l.id, s, u);
    return (S.length > 0 && (E.children = S), E);
  });
}
function pn(e, t, r, n, a) {
  if (a) return al(r.id, t.shouldRevalidate, a);
  if (!n && r.hasLoader && !r.hasClientLoader) {
    let o = e ? Cn(e)[1].map((u) => u.paramName) : [];
    const s = (u) => o.some((l) => u.currentParams[l] !== u.nextParams[l]);
    if (t.shouldRevalidate) {
      let u = t.shouldRevalidate;
      return (l) => u({ ...l, defaultShouldRevalidate: s(l) });
    } else return (u) => s(u);
  }
  if (n && t.shouldRevalidate) {
    let o = t.shouldRevalidate;
    return (s) => o({ ...s, defaultShouldRevalidate: !0 });
  }
  return t.shouldRevalidate;
}
function al(e, t, r) {
  let n = !1;
  return (a) =>
    n ? (t ? t(a) : a.defaultShouldRevalidate) : ((n = !0), r.has(e));
}
async function ol(e, t) {
  let r = Gn(e, t),
    n = Ki(e),
    a = await r;
  return (
    await Promise.all([n, Kn(e, a)]),
    {
      Component: ea(a),
      ErrorBoundary: a.ErrorBoundary,
      clientMiddleware: a.clientMiddleware,
      clientAction: a.clientAction,
      clientLoader: a.clientLoader,
      handle: a.handle,
      links: a.links,
      meta: a.meta,
      shouldRevalidate: a.shouldRevalidate,
    }
  );
}
function ea(e) {
  if (e.default == null) return;
  if (!(typeof e.default == 'object' && Object.keys(e.default).length === 0))
    return e.default;
}
function il(e, t, r, n) {
  return (n && e !== 'root') || (t != null && (t.hydrate === !0 || r !== !0));
}
var Mt = new Set(),
  ll = 1e3,
  At = new Set(),
  sl = 7680;
function xr(e, t) {
  return e.mode === 'lazy' && t === !0;
}
function ul({ sri: e, ...t }, r) {
  let n = new Set(r.state.matches.map((u) => u.route.id)),
    a = r.state.location.pathname.split('/').filter(Boolean),
    o = ['/'];
  for (a.pop(); a.length > 0; ) (o.push(`/${a.join('/')}`), a.pop());
  o.forEach((u) => {
    let l = Ae(r.routes, u, r.basename);
    l && l.forEach((i) => n.add(i.route.id));
  });
  let s = [...n].reduce((u, l) => Object.assign(u, { [l]: t.routes[l] }), {});
  return { ...t, routes: s, sri: e ? !0 : void 0 };
}
function Jl(e, t, r, n, a, o) {
  if (xr(n, r))
    return async ({ path: s, patch: u, signal: l, fetcherKey: i }) => {
      At.has(s) ||
        (await ta(
          [s],
          i ? window.location.href : s,
          e,
          t,
          r,
          a,
          o,
          n.manifestPath,
          u,
          l,
        ));
    };
}
function Gl(e, t, r, n, a, o) {
  h.useEffect(() => {
    if (!xr(a, n) || window.navigator?.connection?.saveData === !0) return;
    function s(c) {
      let d =
        c.tagName === 'FORM'
          ? c.getAttribute('action')
          : c.getAttribute('href');
      if (!d) return;
      let p =
        c.tagName === 'A'
          ? c.pathname
          : new URL(d, window.location.origin).pathname;
      At.has(p) || Mt.add(p);
    }
    async function u() {
      document
        .querySelectorAll('a[data-discover], form[data-discover]')
        .forEach(s);
      let c = Array.from(Mt.keys()).filter((d) =>
        At.has(d) ? (Mt.delete(d), !1) : !0,
      );
      if (c.length !== 0)
        try {
          await ta(
            c,
            null,
            t,
            r,
            n,
            o,
            e.basename,
            a.manifestPath,
            e.patchRoutes,
          );
        } catch (d) {
          console.error('Failed to fetch manifest patches', d);
        }
    }
    let l = fl(u, 100);
    u();
    let i = new MutationObserver(() => l());
    return (
      i.observe(document.documentElement, {
        subtree: !0,
        childList: !0,
        attributes: !0,
        attributeFilter: ['data-discover', 'href', 'action'],
      }),
      () => i.disconnect()
    );
  }, [n, o, t, r, e, a]);
}
function cl(e, t) {
  let r = e || '/__manifest';
  return t == null ? r : `${t}${r}`.replace(/\/+/g, '/');
}
var Zt = 'react-router-manifest-version';
async function ta(e, t, r, n, a, o, s, u, l, i) {
  const c = new URLSearchParams();
  (c.set('paths', e.sort().join(',')), c.set('version', r.version));
  let d = new URL(cl(u, s), window.location.origin);
  if (((d.search = c.toString()), d.toString().length > sl)) {
    Mt.clear();
    return;
  }
  let p;
  try {
    let E = await fetch(d, { signal: i });
    if (E.ok) {
      if (E.status === 204 && E.headers.has('X-Remix-Reload-Document')) {
        if (!t) {
          console.warn(
            'Detected a manifest version mismatch during eager route discovery. The next navigation/fetch to an undiscovered route will result in a new document navigation to sync up with the latest manifest.',
          );
          return;
        }
        try {
          if (sessionStorage.getItem(Zt) === r.version) {
            console.error(
              'Unable to discover routes due to manifest version mismatch.',
            );
            return;
          }
          sessionStorage.setItem(Zt, r.version);
        } catch {}
        ((window.location.href = t),
          console.warn('Detected manifest version mismatch, reloading...'),
          await new Promise(() => {}));
      } else if (E.status >= 400) throw new Error(await E.text());
    } else throw new Error(`${E.status} ${E.statusText}`);
    try {
      sessionStorage.removeItem(Zt);
    } catch {}
    p = await E.json();
  } catch (E) {
    if (i?.aborted) return;
    throw E;
  }
  let g = new Set(Object.keys(r.routes)),
    R = Object.values(p).reduce(
      (E, S) => (S && !g.has(S.id) && (E[S.id] = S), E),
      {},
    );
  (Object.assign(r.routes, R), e.forEach((E) => dl(E, At)));
  let P = new Set();
  (Object.values(R).forEach((E) => {
    E && (!E.parentId || !R[E.parentId]) && P.add(E.parentId);
  }),
    P.forEach((E) => l(E || null, Cr(R, n, null, a, o, E))));
}
function dl(e, t) {
  if (t.size >= ll) {
    let r = t.values().next().value;
    t.delete(r);
  }
  t.add(e);
}
function fl(e, t) {
  let r;
  return (...n) => {
    (window.clearTimeout(r), (r = window.setTimeout(() => e(...n), t)));
  };
}
function Lr() {
  let e = h.useContext(Ve);
  return (
    ye(
      e,
      'You must render this element inside a <DataRouterContext.Provider> element',
    ),
    e
  );
}
function $t() {
  let e = h.useContext(qe);
  return (
    ye(
      e,
      'You must render this element inside a <DataRouterStateContext.Provider> element',
    ),
    e
  );
}
var Ft = h.createContext(void 0);
Ft.displayName = 'FrameworkContext';
function Ze() {
  let e = h.useContext(Ft);
  return (
    ye(e, 'You must render this element inside a <HydratedRouter> element'),
    e
  );
}
function hl(e, t) {
  let r = h.useContext(Ft),
    [n, a] = h.useState(!1),
    [o, s] = h.useState(!1),
    {
      onFocus: u,
      onBlur: l,
      onMouseEnter: i,
      onMouseLeave: c,
      onTouchStart: d,
    } = t,
    p = h.useRef(null);
  (h.useEffect(() => {
    if ((e === 'render' && s(!0), e === 'viewport')) {
      let P = (S) => {
          S.forEach((b) => {
            s(b.isIntersecting);
          });
        },
        E = new IntersectionObserver(P, { threshold: 0.5 });
      return (
        p.current && E.observe(p.current),
        () => {
          E.disconnect();
        }
      );
    }
  }, [e]),
    h.useEffect(() => {
      if (n) {
        let P = setTimeout(() => {
          s(!0);
        }, 100);
        return () => {
          clearTimeout(P);
        };
      }
    }, [n]));
  let g = () => {
      a(!0);
    },
    R = () => {
      (a(!1), s(!1));
    };
  return r
    ? e !== 'intent'
      ? [o, p, {}]
      : [
          o,
          p,
          {
            onFocus: it(u, g),
            onBlur: it(l, R),
            onMouseEnter: it(i, g),
            onMouseLeave: it(c, R),
            onTouchStart: it(d, g),
          },
        ]
    : [!1, p, {}];
}
function it(e, t) {
  return (r) => {
    (e && e(r), r.defaultPrevented || t(r));
  };
}
function Pr(e, t, r) {
  if (r && !Nt) return [e[0]];
  if (t) {
    let n = e.findIndex((a) => t[a.route.id] !== void 0);
    return e.slice(0, n + 1);
  }
  return e;
}
var yn = 'data-react-router-critical-css';
function Xl({ nonce: e }) {
  let { isSpaMode: t, manifest: r, routeModules: n, criticalCss: a } = Ze(),
    { errors: o, matches: s } = $t(),
    u = Pr(s, o, t),
    l = h.useMemo(() => Xi(u, n, r), [u, n, r]);
  return h.createElement(
    h.Fragment,
    null,
    typeof a == 'string'
      ? h.createElement('style', {
          [yn]: '',
          dangerouslySetInnerHTML: { __html: a },
        })
      : null,
    typeof a == 'object'
      ? h.createElement('link', {
          [yn]: '',
          rel: 'stylesheet',
          href: a.href,
          nonce: e,
        })
      : null,
    l.map(({ key: i, link: c }) =>
      Sr(c)
        ? h.createElement(ra, { key: i, nonce: e, ...c })
        : h.createElement('link', { key: i, nonce: e, ...c }),
    ),
  );
}
function ra({ page: e, ...t }) {
  let { router: r } = Lr(),
    n = h.useMemo(() => Ae(r.routes, e, r.basename), [r.routes, e, r.basename]);
  return n ? h.createElement(pl, { page: e, matches: n, ...t }) : null;
}
function ml(e) {
  let { manifest: t, routeModules: r } = Ze(),
    [n, a] = h.useState([]);
  return (
    h.useEffect(() => {
      let o = !1;
      return (
        Qi(e, t, r).then((s) => {
          o || a(s);
        }),
        () => {
          o = !0;
        }
      );
    }, [e, t, r]),
    n
  );
}
function pl({ page: e, matches: t, ...r }) {
  let n = Te(),
    { manifest: a, routeModules: o } = Ze(),
    { basename: s } = Lr(),
    { loaderData: u, matches: l } = $t(),
    i = h.useMemo(() => mn(e, t, l, a, n, 'data'), [e, t, l, a, n]),
    c = h.useMemo(() => mn(e, t, l, a, n, 'assets'), [e, t, l, a, n]),
    d = h.useMemo(() => {
      if (e === n.pathname + n.search + n.hash) return [];
      let R = new Set(),
        P = !1;
      if (
        (t.forEach((S) => {
          let b = a.routes[S.route.id];
          !b ||
            !b.hasLoader ||
            ((!i.some((D) => D.route.id === S.route.id) &&
              S.route.id in u &&
              o[S.route.id]?.shouldRevalidate) ||
            b.hasClientLoader
              ? (P = !0)
              : R.add(S.route.id));
        }),
        R.size === 0)
      )
        return [];
      let E = Jn(e, s, 'data');
      return (
        P &&
          R.size > 0 &&
          E.searchParams.set(
            '_routes',
            t
              .filter((S) => R.has(S.route.id))
              .map((S) => S.route.id)
              .join(','),
          ),
        [E.pathname + E.search]
      );
    }, [s, u, n, a, i, t, e, o]),
    p = h.useMemo(() => br(c, a), [c, a]),
    g = ml(c);
  return h.createElement(
    h.Fragment,
    null,
    d.map((R) =>
      h.createElement('link', {
        key: R,
        rel: 'prefetch',
        as: 'fetch',
        href: R,
        ...r,
      }),
    ),
    p.map((R) =>
      h.createElement('link', { key: R, rel: 'modulepreload', href: R, ...r }),
    ),
    g.map(({ key: R, link: P }) =>
      h.createElement('link', { key: R, nonce: r.nonce, ...P }),
    ),
  );
}
function Kl() {
  let { isSpaMode: e, routeModules: t } = Ze(),
    { errors: r, matches: n, loaderData: a } = $t(),
    o = Te(),
    s = Pr(n, r, e),
    u = null;
  r && (u = r[s[s.length - 1].route.id]);
  let l = [],
    i = null,
    c = [];
  for (let d = 0; d < s.length; d++) {
    let p = s[d],
      g = p.route.id,
      R = a[g],
      P = p.params,
      E = t[g],
      S = [],
      b = {
        id: g,
        data: R,
        loaderData: R,
        meta: [],
        params: p.params,
        pathname: p.pathname,
        handle: p.route.handle,
        error: u,
      };
    if (
      ((c[d] = b),
      E?.meta
        ? (S =
            typeof E.meta == 'function'
              ? E.meta({
                  data: R,
                  loaderData: R,
                  params: P,
                  location: o,
                  matches: c,
                  error: u,
                })
              : Array.isArray(E.meta)
                ? [...E.meta]
                : E.meta)
        : i && (S = [...i]),
      (S = S || []),
      !Array.isArray(S))
    )
      throw new Error(
        'The route at ' +
          p.route.path +
          ` returns an invalid value. All route meta functions must return an array of meta objects.

To reference the meta function API, see https://remix.run/route/meta`,
      );
    ((b.meta = S), (c[d] = b), (l = [...S]), (i = l));
  }
  return h.createElement(
    h.Fragment,
    null,
    l.flat().map((d) => {
      if (!d) return null;
      if ('tagName' in d) {
        let { tagName: p, ...g } = d;
        if (!yl(p))
          return (
            console.warn(
              `A meta object uses an invalid tagName: ${p}. Expected either 'link' or 'meta'`,
            ),
            null
          );
        let R = p;
        return h.createElement(R, { key: JSON.stringify(g), ...g });
      }
      if ('title' in d)
        return h.createElement('title', { key: 'title' }, String(d.title));
      if (
        ('charset' in d &&
          (d.charSet ?? (d.charSet = d.charset), delete d.charset),
        'charSet' in d && d.charSet != null)
      )
        return typeof d.charSet == 'string'
          ? h.createElement('meta', { key: 'charSet', charSet: d.charSet })
          : null;
      if ('script:ld+json' in d)
        try {
          let p = JSON.stringify(d['script:ld+json']);
          return h.createElement('script', {
            key: `script:ld+json:${p}`,
            type: 'application/ld+json',
            dangerouslySetInnerHTML: { __html: $i(p) },
          });
        } catch {
          return null;
        }
      return h.createElement('meta', { key: JSON.stringify(d), ...d });
    }),
  );
}
function yl(e) {
  return typeof e == 'string' && /^(meta|link)$/.test(e);
}
var Nt = !1;
function vl() {
  Nt = !0;
}
function gl(e) {
  let {
      manifest: t,
      serverHandoffString: r,
      isSpaMode: n,
      renderMeta: a,
      routeDiscovery: o,
      ssr: s,
    } = Ze(),
    { router: u, static: l, staticContext: i } = Lr(),
    { matches: c } = $t(),
    d = $o(),
    p = xr(o, s);
  a && (a.didRenderScripts = !0);
  let g = Pr(c, null, n);
  h.useEffect(() => {
    vl();
  }, []);
  let R = h.useMemo(() => {
      if (d) return null;
      let b = i
          ? `window.__reactRouterContext = ${r};window.__reactRouterContext.stream = new ReadableStream({start(controller){window.__reactRouterContext.streamController = controller;}}).pipeThrough(new TextEncoderStream());`
          : ' ',
        D = l
          ? `${t.hmr?.runtime ? `import ${JSON.stringify(t.hmr.runtime)};` : ''}${p ? '' : `import ${JSON.stringify(t.url)}`};
${g.map((M, _) => {
  let y = `route${_}`,
    L = t.routes[M.route.id];
  ye(L, `Route ${M.route.id} not found in manifest`);
  let {
      clientActionModule: B,
      clientLoaderModule: U,
      clientMiddlewareModule: J,
      hydrateFallbackModule: ae,
      module: Re,
    } = L,
    q = [
      ...(B ? [{ module: B, varName: `${y}_clientAction` }] : []),
      ...(U ? [{ module: U, varName: `${y}_clientLoader` }] : []),
      ...(J ? [{ module: J, varName: `${y}_clientMiddleware` }] : []),
      ...(ae ? [{ module: ae, varName: `${y}_HydrateFallback` }] : []),
      { module: Re, varName: `${y}_main` },
    ];
  if (q.length === 1) return `import * as ${y} from ${JSON.stringify(Re)};`;
  let Q = q.map((W) => `import * as ${W.varName} from "${W.module}";`).join(`
`),
    ue = `const ${y} = {${q.map((W) => `...${W.varName}`).join(',')}};`;
  return [Q, ue].join(`
`);
}).join(`
`)}
  ${p ? `window.__reactRouterManifest = ${JSON.stringify(ul(t, u), null, 2)};` : ''}
  window.__reactRouterRouteModules = {${g.map((M, _) => `${JSON.stringify(M.route.id)}:route${_}`).join(',')}};

import(${JSON.stringify(t.entry.module)});`
          : ' ';
      return h.createElement(
        h.Fragment,
        null,
        h.createElement('script', {
          ...e,
          suppressHydrationWarning: !0,
          dangerouslySetInnerHTML: { __html: b },
          type: void 0,
        }),
        h.createElement('script', {
          ...e,
          suppressHydrationWarning: !0,
          dangerouslySetInnerHTML: { __html: D },
          type: 'module',
          async: !0,
        }),
      );
    }, []),
    P =
      Nt || d
        ? []
        : wl(t.entry.imports.concat(br(g, t, { includeHydrateFallback: !0 }))),
    E = typeof t.sri == 'object' ? t.sri : {};
  return (
    or(
      !d,
      'The <Scripts /> element is a no-op when using RSC and can be safely removed.',
    ),
    Nt || d
      ? null
      : h.createElement(
          h.Fragment,
          null,
          typeof t.sri == 'object'
            ? h.createElement('script', {
                'rr-importmap': '',
                type: 'importmap',
                suppressHydrationWarning: !0,
                dangerouslySetInnerHTML: {
                  __html: JSON.stringify({ integrity: E }),
                },
              })
            : null,
          p
            ? null
            : h.createElement('link', {
                rel: 'modulepreload',
                href: t.url,
                crossOrigin: e.crossOrigin,
                integrity: E[t.url],
                suppressHydrationWarning: !0,
              }),
          h.createElement('link', {
            rel: 'modulepreload',
            href: t.entry.module,
            crossOrigin: e.crossOrigin,
            integrity: E[t.entry.module],
            suppressHydrationWarning: !0,
          }),
          P.map((S) =>
            h.createElement('link', {
              key: S,
              rel: 'modulepreload',
              href: S,
              crossOrigin: e.crossOrigin,
              integrity: E[S],
              suppressHydrationWarning: !0,
            }),
          ),
          R,
        )
  );
}
function wl(e) {
  return [...new Set(e)];
}
function El(...e) {
  return (t) => {
    e.forEach((r) => {
      typeof r == 'function' ? r(t) : r != null && (r.current = t);
    });
  };
}
var ql = class extends h.Component {
  constructor(e) {
    (super(e), (this.state = { error: e.error || null, location: e.location }));
  }
  static getDerivedStateFromError(e) {
    return { error: e };
  }
  static getDerivedStateFromProps(e, t) {
    return t.location !== e.location
      ? { error: e.error || null, location: e.location }
      : { error: e.error || t.error, location: t.location };
  }
  render() {
    return this.state.error
      ? h.createElement(na, { error: this.state.error, isOutsideRemixApp: !0 })
      : this.props.children;
  }
};
function na({ error: e, isOutsideRemixApp: t }) {
  console.error(e);
  let r = h.createElement('script', {
    dangerouslySetInnerHTML: {
      __html: `
        console.log(
          "💿 Hey developer 👋. You can provide a way better UX than this when your app throws errors. Check out https://reactrouter.com/how-to/error-boundary for more information."
        );
      `,
    },
  });
  if (Ye(e))
    return h.createElement(
      sr,
      { title: 'Unhandled Thrown Response!' },
      h.createElement(
        'h1',
        { style: { fontSize: '24px' } },
        e.status,
        ' ',
        e.statusText,
      ),
      r,
    );
  let n;
  if (e instanceof Error) n = e;
  else {
    let a =
      e == null
        ? 'Unknown Error'
        : typeof e == 'object' && 'toString' in e
          ? e.toString()
          : JSON.stringify(e);
    n = new Error(a);
  }
  return h.createElement(
    sr,
    { title: 'Application Error!', isOutsideRemixApp: t },
    h.createElement('h1', { style: { fontSize: '24px' } }, 'Application Error'),
    h.createElement(
      'pre',
      {
        style: {
          padding: '2rem',
          background: 'hsla(10, 50%, 50%, 0.1)',
          color: 'red',
          overflow: 'auto',
        },
      },
      n.stack,
    ),
    r,
  );
}
function sr({ title: e, renderScripts: t, isOutsideRemixApp: r, children: n }) {
  let { routeModules: a } = Ze();
  return a.root?.Layout && !r
    ? n
    : h.createElement(
        'html',
        { lang: 'en' },
        h.createElement(
          'head',
          null,
          h.createElement('meta', { charSet: 'utf-8' }),
          h.createElement('meta', {
            name: 'viewport',
            content: 'width=device-width,initial-scale=1,viewport-fit=cover',
          }),
          h.createElement('title', null, e),
        ),
        h.createElement(
          'body',
          null,
          h.createElement(
            'main',
            { style: { fontFamily: 'system-ui, sans-serif', padding: '2rem' } },
            n,
            t ? h.createElement(gl, null) : null,
          ),
        ),
      );
}
var aa =
  typeof window < 'u' &&
  typeof window.document < 'u' &&
  typeof window.document.createElement < 'u';
try {
  aa && (window.__reactRouterVersion = '7.9.4');
} catch {}
var oa = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i,
  ia = h.forwardRef(function (
    {
      onClick: t,
      discover: r = 'render',
      prefetch: n = 'none',
      relative: a,
      reloadDocument: o,
      replace: s,
      state: u,
      target: l,
      to: i,
      preventScrollReset: c,
      viewTransition: d,
      ...p
    },
    g,
  ) {
    let { basename: R } = h.useContext(Ce),
      P = typeof i == 'string' && oa.test(i),
      E,
      S = !1;
    if (typeof i == 'string' && P && ((E = i), aa))
      try {
        let U = new URL(window.location.href),
          J = i.startsWith('//') ? new URL(U.protocol + i) : new URL(i),
          ae = Ee(J.pathname, R);
        J.origin === U.origin && ae != null
          ? (i = ae + J.search + J.hash)
          : (S = !0);
      } catch {
        ne(
          !1,
          `<Link to="${i}"> contains an invalid URL which will probably break when clicked - please update to a valid URL path.`,
        );
      }
    let b = jo(i, { relative: a }),
      [D, M, _] = hl(n, p),
      y = xl(i, {
        replace: s,
        state: u,
        target: l,
        preventScrollReset: c,
        relative: a,
        viewTransition: d,
      });
    function L(U) {
      (t && t(U), U.defaultPrevented || y(U));
    }
    let B = h.createElement('a', {
      ...p,
      ..._,
      href: E || b,
      onClick: S || o ? t : L,
      ref: El(g, M),
      target: l,
      'data-discover': !P && r === 'render' ? 'true' : void 0,
    });
    return D && !P
      ? h.createElement(h.Fragment, null, B, h.createElement(ra, { page: b }))
      : B;
  });
ia.displayName = 'Link';
var Rl = h.forwardRef(function (
  {
    'aria-current': t = 'page',
    caseSensitive: r = !1,
    className: n = '',
    end: a = !1,
    style: o,
    to: s,
    viewTransition: u,
    children: l,
    ...i
  },
  c,
) {
  let d = ft(s, { relative: i.relative }),
    p = Te(),
    g = h.useContext(qe),
    { navigator: R, basename: P } = h.useContext(Ce),
    E = g != null && Ol(d) && u === !0,
    S = R.encodeLocation ? R.encodeLocation(d).pathname : d.pathname,
    b = p.pathname,
    D =
      g && g.navigation && g.navigation.location
        ? g.navigation.location.pathname
        : null;
  (r ||
    ((b = b.toLowerCase()),
    (D = D ? D.toLowerCase() : null),
    (S = S.toLowerCase())),
    D && P && (D = Ee(D, P) || D));
  const M = S !== '/' && S.endsWith('/') ? S.length - 1 : S.length;
  let _ = b === S || (!a && b.startsWith(S) && b.charAt(M) === '/'),
    y =
      D != null &&
      (D === S || (!a && D.startsWith(S) && D.charAt(S.length) === '/')),
    L = { isActive: _, isPending: y, isTransitioning: E },
    B = _ ? t : void 0,
    U;
  typeof n == 'function'
    ? (U = n(L))
    : (U = [
        n,
        _ ? 'active' : null,
        y ? 'pending' : null,
        E ? 'transitioning' : null,
      ]
        .filter(Boolean)
        .join(' '));
  let J = typeof o == 'function' ? o(L) : o;
  return h.createElement(
    ia,
    {
      ...i,
      'aria-current': B,
      className: U,
      ref: c,
      style: J,
      to: s,
      viewTransition: u,
    },
    typeof l == 'function' ? l(L) : l,
  );
});
Rl.displayName = 'NavLink';
var Sl = h.forwardRef(
  (
    {
      discover: e = 'render',
      fetcherKey: t,
      navigate: r,
      reloadDocument: n,
      replace: a,
      state: o,
      method: s = Tt,
      action: u,
      onSubmit: l,
      relative: i,
      preventScrollReset: c,
      viewTransition: d,
      ...p
    },
    g,
  ) => {
    let R = Tl(),
      P = _l(u, { relative: i }),
      E = s.toLowerCase() === 'get' ? 'get' : 'post',
      S = typeof u == 'string' && oa.test(u),
      b = (D) => {
        if ((l && l(D), D.defaultPrevented)) return;
        D.preventDefault();
        let M = D.nativeEvent.submitter,
          _ = M?.getAttribute('formmethod') || s;
        R(M || D.currentTarget, {
          fetcherKey: t,
          method: _,
          navigate: r,
          replace: a,
          state: o,
          relative: i,
          preventScrollReset: c,
          viewTransition: d,
        });
      };
    return h.createElement('form', {
      ref: g,
      method: E,
      action: P,
      onSubmit: n ? l : b,
      ...p,
      'data-discover': !S && e === 'render' ? 'true' : void 0,
    });
  },
);
Sl.displayName = 'Form';
function bl({ getKey: e, storageKey: t, ...r }) {
  let n = h.useContext(Ft),
    { basename: a } = h.useContext(Ce),
    o = Te(),
    s = Er();
  Ml({ getKey: e, storageKey: t });
  let u = h.useMemo(() => {
    if (!n || !e) return null;
    let i = cr(o, s, a, e);
    return i !== o.key ? i : null;
  }, []);
  if (!n || n.isSpaMode) return null;
  let l = ((i, c) => {
    if (!window.history.state || !window.history.state.key) {
      let d = Math.random().toString(32).slice(2);
      window.history.replaceState({ key: d }, '');
    }
    try {
      let p = JSON.parse(sessionStorage.getItem(i) || '{}')[
        c || window.history.state.key
      ];
      typeof p == 'number' && window.scrollTo(0, p);
    } catch (d) {
      (console.error(d), sessionStorage.removeItem(i));
    }
  }).toString();
  return h.createElement('script', {
    ...r,
    suppressHydrationWarning: !0,
    dangerouslySetInnerHTML: {
      __html: `(${l})(${JSON.stringify(t || ur)}, ${JSON.stringify(u)})`,
    },
  });
}
bl.displayName = 'ScrollRestoration';
function la(e) {
  return `${e} must be used within a data router.  See https://reactrouter.com/en/main/routers/picking-a-router.`;
}
function Tr(e) {
  let t = h.useContext(Ve);
  return (Y(t, la(e)), t);
}
function Cl(e) {
  let t = h.useContext(qe);
  return (Y(t, la(e)), t);
}
function xl(
  e,
  {
    target: t,
    replace: r,
    state: n,
    preventScrollReset: a,
    relative: o,
    viewTransition: s,
  } = {},
) {
  let u = Ho(),
    l = Te(),
    i = ft(e, { relative: o });
  return h.useCallback(
    (c) => {
      if (ci(c, t)) {
        c.preventDefault();
        let d = r !== void 0 ? r : Ie(l) === Ie(i);
        u(e, {
          replace: d,
          state: n,
          preventScrollReset: a,
          relative: o,
          viewTransition: s,
        });
      }
    },
    [l, u, i, r, n, t, e, a, o, s],
  );
}
var Ll = 0,
  Pl = () => `__${String(++Ll)}__`;
function Tl() {
  let { router: e } = Tr('useSubmit'),
    { basename: t } = h.useContext(Ce),
    r = qo();
  return h.useCallback(
    async (n, a = {}) => {
      let { action: o, method: s, encType: u, formData: l, body: i } = hi(n, t);
      if (a.navigate === !1) {
        let c = a.fetcherKey || Pl();
        await e.fetch(c, r, a.action || o, {
          preventScrollReset: a.preventScrollReset,
          formData: l,
          body: i,
          formMethod: a.method || s,
          formEncType: a.encType || u,
          flushSync: a.flushSync,
        });
      } else
        await e.navigate(a.action || o, {
          preventScrollReset: a.preventScrollReset,
          formData: l,
          body: i,
          formMethod: a.method || s,
          formEncType: a.encType || u,
          replace: a.replace,
          state: a.state,
          fromRouteId: r,
          flushSync: a.flushSync,
          viewTransition: a.viewTransition,
        });
    },
    [e, t, r],
  );
}
function _l(e, { relative: t } = {}) {
  let { basename: r } = h.useContext(Ce),
    n = h.useContext(xe);
  Y(n, 'useFormAction must be used inside a RouteContext');
  let [a] = n.matches.slice(-1),
    o = { ...ft(e || '.', { relative: t }) },
    s = Te();
  if (e == null) {
    o.search = s.search;
    let u = new URLSearchParams(o.search),
      l = u.getAll('index');
    if (l.some((c) => c === '')) {
      (u.delete('index'),
        l.filter((d) => d).forEach((d) => u.append('index', d)));
      let c = u.toString();
      o.search = c ? `?${c}` : '';
    }
  }
  return (
    (!e || e === '.') &&
      a.route.index &&
      (o.search = o.search ? o.search.replace(/^\?/, '?index&') : '?index'),
    r !== '/' && (o.pathname = o.pathname === '/' ? r : Pe([r, o.pathname])),
    Ie(o)
  );
}
var ur = 'react-router-scroll-positions',
  xt = {};
function cr(e, t, r, n) {
  let a = null;
  return (
    n &&
      (r !== '/'
        ? (a = n({ ...e, pathname: Ee(e.pathname, r) || e.pathname }, t))
        : (a = n(e, t))),
    a == null && (a = e.key),
    a
  );
}
function Ml({ getKey: e, storageKey: t } = {}) {
  let { router: r } = Tr('useScrollRestoration'),
    { restoreScrollPosition: n, preventScrollReset: a } = Cl(
      'useScrollRestoration',
    ),
    { basename: o } = h.useContext(Ce),
    s = Te(),
    u = Er(),
    l = Qo();
  (h.useEffect(
    () => (
      (window.history.scrollRestoration = 'manual'),
      () => {
        window.history.scrollRestoration = 'auto';
      }
    ),
    [],
  ),
    Dl(
      h.useCallback(() => {
        if (l.state === 'idle') {
          let i = cr(s, u, o, e);
          xt[i] = window.scrollY;
        }
        try {
          sessionStorage.setItem(t || ur, JSON.stringify(xt));
        } catch (i) {
          ne(
            !1,
            `Failed to save scroll positions in sessionStorage, <ScrollRestoration /> will not work properly (${i}).`,
          );
        }
        window.history.scrollRestoration = 'auto';
      }, [l.state, e, o, s, u, t]),
    ),
    typeof document < 'u' &&
      (h.useLayoutEffect(() => {
        try {
          let i = sessionStorage.getItem(t || ur);
          i && (xt = JSON.parse(i));
        } catch {}
      }, [t]),
      h.useLayoutEffect(() => {
        let i = r?.enableScrollRestoration(
          xt,
          () => window.scrollY,
          e ? (c, d) => cr(c, d, o, e) : void 0,
        );
        return () => i && i();
      }, [r, o, e]),
      h.useLayoutEffect(() => {
        if (n !== !1) {
          if (typeof n == 'number') {
            window.scrollTo(0, n);
            return;
          }
          try {
            if (s.hash) {
              let i = document.getElementById(
                decodeURIComponent(s.hash.slice(1)),
              );
              if (i) {
                i.scrollIntoView();
                return;
              }
            }
          } catch {
            ne(
              !1,
              `"${s.hash.slice(1)}" is not a decodable element ID. The view will not scroll to it.`,
            );
          }
          a !== !0 && window.scrollTo(0, 0);
        }
      }, [s, n, a])));
}
function Dl(e, t) {
  let { capture: r } = {};
  h.useEffect(() => {
    let n = r != null ? { capture: r } : void 0;
    return (
      window.addEventListener('pagehide', e, n),
      () => {
        window.removeEventListener('pagehide', e, n);
      }
    );
  }, [e, r]);
}
function Ol(e, { relative: t } = {}) {
  let r = h.useContext(vr);
  Y(
    r != null,
    "`useViewTransitionState` must be used within `react-router-dom`'s `RouterProvider`.  Did you accidentally import `RouterProvider` from `react-router`?",
  );
  let { basename: n } = Tr('useViewTransitionState'),
    a = ft(e, { relative: t });
  if (!r.isTransitioning) return !1;
  let o = Ee(r.currentLocation.pathname, n) || r.currentLocation.pathname,
    s = Ee(r.nextLocation.pathname, n) || r.nextLocation.pathname;
  return Dt(a.pathname, s) != null || Dt(a.pathname, o) != null;
}
var Al = _a();
const Ql = vn(Al);
export {
  Fn as A,
  Te as B,
  Wl as C,
  Xl as D,
  We as E,
  Ft as F,
  gl as G,
  ia as L,
  Kl as M,
  ji as N,
  zl as O,
  kl as R,
  bl as S,
  Ql as a,
  gn as b,
  _a as c,
  Pa as d,
  Y as e,
  ql as f,
  Ul as g,
  Al as h,
  Ye as i,
  Nl as j,
  Gi as k,
  Cr as l,
  Ae as m,
  $l as n,
  Jl as o,
  Yl as p,
  Il as q,
  h as r,
  il as s,
  Vl as t,
  Gl as u,
  jl as v,
  Bl as w,
  Hl as x,
  Ho as y,
  Fl as z,
};
