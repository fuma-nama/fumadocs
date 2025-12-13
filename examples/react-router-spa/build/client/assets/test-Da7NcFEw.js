import { j as e } from './index-CT70PKhW.js';
let o = { title: 'Test', description: 'A document to test Fumadocs' },
  c = [],
  h = {
    contents: [
      { heading: void 0, content: 'Hey there!' },
      { heading: 'list', content: 'Hello' },
      { heading: 'list', content: 'World' },
    ],
    headings: [
      { id: 'cards', content: 'Cards' },
      { id: 'codeblock', content: 'CodeBlock' },
      { id: 'list', content: 'List' },
    ],
  };
const a = [
  { depth: 2, url: '#cards', title: e.jsx(e.Fragment, { children: 'Cards' }) },
  {
    depth: 3,
    url: '#codeblock',
    title: e.jsx(e.Fragment, { children: 'CodeBlock' }),
  },
  { depth: 4, url: '#list', title: e.jsx(e.Fragment, { children: 'List' }) },
];
function l(i) {
  const t = {
      code: 'code',
      h2: 'h2',
      h3: 'h3',
      h4: 'h4',
      li: 'li',
      p: 'p',
      pre: 'pre',
      span: 'span',
      ul: 'ul',
      ...i.components,
    },
    { Card: s, Cards: n } = t;
  return (
    s || r('Card'),
    n || r('Cards'),
    e.jsxs(e.Fragment, {
      children: [
        e.jsx(t.p, { children: 'Hey there!' }),
        `
`,
        e.jsx(t.h2, { id: 'cards', children: 'Cards' }),
        `
`,
        e.jsxs(n, {
          children: [
            e.jsx(s, {
              title: 'Learn more about Next.js',
              href: 'https://nextjs.org/docs',
            }),
            e.jsx(s, {
              title: 'Learn more about Fumadocs',
              href: 'https://fumadocs.dev',
            }),
          ],
        }),
        `
`,
        e.jsx(t.h3, { id: 'codeblock', children: 'CodeBlock' }),
        `
`,
        e.jsx(e.Fragment, {
          children: e.jsx(t.pre, {
            className: 'shiki shiki-themes github-light github-dark',
            style: {
              '--shiki-light': '#24292e',
              '--shiki-dark': '#e1e4e8',
              '--shiki-light-bg': '#fff',
              '--shiki-dark-bg': '#24292e',
            },
            tabIndex: '0',
            icon: '<svg viewBox="0 0 24 24"><path d="M0 0h24v24H0V0zm22.034 18.276c-.175-1.095-.888-2.015-3.003-2.873-.736-.345-1.554-.585-1.797-1.14-.091-.33-.105-.51-.046-.705.15-.646.915-.84 1.515-.66.39.12.75.42.976.9 1.034-.676 1.034-.676 1.755-1.125-.27-.42-.404-.601-.586-.78-.63-.705-1.469-1.065-2.834-1.034l-.705.089c-.676.165-1.32.525-1.71 1.005-1.14 1.291-.811 3.541.569 4.471 1.365 1.02 3.361 1.244 3.616 2.205.24 1.17-.87 1.545-1.966 1.41-.811-.18-1.26-.586-1.755-1.336l-1.83 1.051c.21.48.45.689.81 1.109 1.74 1.756 6.09 1.666 6.871-1.004.029-.09.24-.705.074-1.65l.046.067zm-8.983-7.245h-2.248c0 1.938-.009 3.864-.009 5.805 0 1.232.063 2.363-.138 2.711-.33.689-1.18.601-1.566.48-.396-.196-.597-.466-.83-.855-.063-.105-.11-.196-.127-.196l-1.825 1.125c.305.63.75 1.172 1.324 1.517.855.51 2.004.675 3.207.405.783-.226 1.458-.691 1.811-1.411.51-.93.402-2.07.397-3.346.012-2.054 0-4.109 0-6.179l.004-.056z" fill="currentColor" /></svg>',
            children: e.jsx(t.code, {
              children: e.jsxs(t.span, {
                className: 'line',
                children: [
                  e.jsx(t.span, {
                    style: {
                      '--shiki-light': '#24292E',
                      '--shiki-dark': '#E1E4E8',
                    },
                    children: 'console.',
                  }),
                  e.jsx(t.span, {
                    style: {
                      '--shiki-light': '#6F42C1',
                      '--shiki-dark': '#B392F0',
                    },
                    children: 'log',
                  }),
                  e.jsx(t.span, {
                    style: {
                      '--shiki-light': '#24292E',
                      '--shiki-dark': '#E1E4E8',
                    },
                    children: '(',
                  }),
                  e.jsx(t.span, {
                    style: {
                      '--shiki-light': '#032F62',
                      '--shiki-dark': '#9ECBFF',
                    },
                    children: "'Hello World'",
                  }),
                  e.jsx(t.span, {
                    style: {
                      '--shiki-light': '#24292E',
                      '--shiki-dark': '#E1E4E8',
                    },
                    children: ');',
                  }),
                ],
              }),
            }),
          }),
        }),
        `
`,
        e.jsx(t.h4, { id: 'list', children: 'List' }),
        `
`,
        e.jsxs(t.ul, {
          children: [
            `
`,
            e.jsx(t.li, { children: 'Hello' }),
            `
`,
            e.jsx(t.li, { children: 'World' }),
            `
`,
          ],
        }),
      ],
    })
  );
}
function x(i = {}) {
  const { wrapper: t } = i.components || {};
  return t ? e.jsx(t, { ...i, children: e.jsx(l, { ...i }) }) : l(i);
}
function r(i, t) {
  throw new Error(
    'Expected component `' +
      i +
      '` to be defined: you likely forgot to import, pass, or provide it.',
  );
}
export {
  x as default,
  c as extractedReferences,
  o as frontmatter,
  h as structuredData,
  a as toc,
};
