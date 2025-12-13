import { j as e } from './index-CT70PKhW.js';
let l = {
    title: 'Hello World',
    description: "Your first `document`\nYou'll love it!\n",
  },
  o = [],
  a = {
    contents: [
      {
        heading: void 0,
        content:
          'Hey there! Fumadocs is the docs framework that also works on React Router!',
      },
      { heading: 'heading', content: 'Hello World' },
      { heading: 'heading-2', content: 'Head' },
      { heading: 'heading-2', content: 'Description' },
      { heading: 'heading-2', content: 'hello' },
      { heading: 'heading-2', content: 'Hello World' },
      { heading: 'heading-2', content: 'very important' },
      { heading: 'heading-2', content: 'Hey' },
      { heading: 'heading-2', content: 'Surprisingly' },
      { heading: 'heading-2', content: 'Fumadocs' },
      { heading: 'heading-2', content: 'very long text that looks weird' },
      { heading: 'heading-2', content: 'hello world hello world hello world' },
    ],
    headings: [
      { id: 'heading', content: 'Heading' },
      { id: 'heading-1', content: 'Heading' },
      { id: 'heading-2', content: 'Heading' },
    ],
  };
const c = [
  {
    depth: 2,
    url: '#heading',
    title: e.jsx(e.Fragment, { children: 'Heading' }),
  },
  {
    depth: 3,
    url: '#heading-1',
    title: e.jsx(e.Fragment, { children: 'Heading' }),
  },
  {
    depth: 4,
    url: '#heading-2',
    title: e.jsx(e.Fragment, { children: 'Heading' }),
  },
];
function r(t) {
  const n = {
      code: 'code',
      em: 'em',
      h2: 'h2',
      h3: 'h3',
      h4: 'h4',
      p: 'p',
      pre: 'pre',
      span: 'span',
      strong: 'strong',
      table: 'table',
      tbody: 'tbody',
      td: 'td',
      th: 'th',
      thead: 'thead',
      tr: 'tr',
      ...t.components,
    },
    { Card: i, Cards: d } = n;
  return (
    i || h('Card'),
    d || h('Cards'),
    e.jsxs(e.Fragment, {
      children: [
        e.jsx(n.p, {
          children:
            'Hey there! Fumadocs is the docs framework that also works on React Router!',
        }),
        `
`,
        e.jsx(n.h2, { id: 'heading', children: 'Heading' }),
        `
`,
        e.jsx(n.p, { children: 'Hello World' }),
        `
`,
        e.jsxs(d, {
          children: [
            e.jsx(i, {
              title: 'Learn more about React Router',
              href: 'https://reactrouter.com',
            }),
            e.jsx(i, {
              title: 'Learn more about Fumadocs',
              href: 'https://fumadocs.dev',
            }),
          ],
        }),
        `
`,
        e.jsx(e.Fragment, {
          children: e.jsx(n.pre, {
            className: 'shiki shiki-themes github-light github-dark',
            style: {
              '--shiki-light': '#24292e',
              '--shiki-dark': '#e1e4e8',
              '--shiki-light-bg': '#fff',
              '--shiki-dark-bg': '#24292e',
            },
            tabIndex: '0',
            icon: '<svg viewBox="0 0 24 24"><path d="M1.125 0C.502 0 0 .502 0 1.125v21.75C0 23.498.502 24 1.125 24h21.75c.623 0 1.125-.502 1.125-1.125V1.125C24 .502 23.498 0 22.875 0zm17.363 9.75c.612 0 1.154.037 1.627.111a6.38 6.38 0 0 1 1.306.34v2.458a3.95 3.95 0 0 0-.643-.361 5.093 5.093 0 0 0-.717-.26 5.453 5.453 0 0 0-1.426-.2c-.3 0-.573.028-.819.086a2.1 2.1 0 0 0-.623.242c-.17.104-.3.229-.393.374a.888.888 0 0 0-.14.49c0 .196.053.373.156.529.104.156.252.304.443.444s.423.276.696.41c.273.135.582.274.926.416.47.197.892.407 1.266.628.374.222.695.473.963.753.268.279.472.598.614.957.142.359.214.776.214 1.253 0 .657-.125 1.21-.373 1.656a3.033 3.033 0 0 1-1.012 1.085 4.38 4.38 0 0 1-1.487.596c-.566.12-1.163.18-1.79.18a9.916 9.916 0 0 1-1.84-.164 5.544 5.544 0 0 1-1.512-.493v-2.63a5.033 5.033 0 0 0 3.237 1.2c.333 0 .624-.03.872-.09.249-.06.456-.144.623-.25.166-.108.29-.234.373-.38a1.023 1.023 0 0 0-.074-1.089 2.12 2.12 0 0 0-.537-.5 5.597 5.597 0 0 0-.807-.444 27.72 27.72 0 0 0-1.007-.436c-.918-.383-1.602-.852-2.053-1.405-.45-.553-.676-1.222-.676-2.005 0-.614.123-1.141.369-1.582.246-.441.58-.804 1.004-1.089a4.494 4.494 0 0 1 1.47-.629 7.536 7.536 0 0 1 1.77-.201zm-15.113.188h9.563v2.166H9.506v9.646H6.789v-9.646H3.375z" fill="currentColor" /></svg>',
            children: e.jsx(n.code, {
              children: e.jsxs(n.span, {
                className: 'line',
                children: [
                  e.jsx(n.span, {
                    style: {
                      '--shiki-light': '#24292E',
                      '--shiki-dark': '#E1E4E8',
                    },
                    children: 'console.',
                  }),
                  e.jsx(n.span, {
                    style: {
                      '--shiki-light': '#6F42C1',
                      '--shiki-dark': '#B392F0',
                    },
                    children: 'log',
                  }),
                  e.jsx(n.span, {
                    style: {
                      '--shiki-light': '#24292E',
                      '--shiki-dark': '#E1E4E8',
                    },
                    children: '(',
                  }),
                  e.jsx(n.span, {
                    style: {
                      '--shiki-light': '#032F62',
                      '--shiki-dark': '#9ECBFF',
                    },
                    children: "'I love React!'",
                  }),
                  e.jsx(n.span, {
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
        e.jsx(n.h3, { id: 'heading-1', children: 'Heading' }),
        `
`,
        e.jsx(n.h4, { id: 'heading-2', children: 'Heading' }),
        `
`,
        e.jsxs(n.table, {
          children: [
            e.jsx(n.thead, {
              children: e.jsxs(n.tr, {
                children: [
                  e.jsx(n.th, { children: 'Head' }),
                  e.jsx(n.th, { children: 'Description' }),
                ],
              }),
            }),
            e.jsxs(n.tbody, {
              children: [
                e.jsxs(n.tr, {
                  children: [
                    e.jsx(n.td, {
                      children: e.jsx(n.code, { children: 'hello' }),
                    }),
                    e.jsx(n.td, { children: 'Hello World' }),
                  ],
                }),
                e.jsxs(n.tr, {
                  children: [
                    e.jsxs(n.td, {
                      children: [
                        'very ',
                        e.jsx(n.strong, { children: 'important' }),
                      ],
                    }),
                    e.jsx(n.td, { children: 'Hey' }),
                  ],
                }),
                e.jsxs(n.tr, {
                  children: [
                    e.jsx(n.td, {
                      children: e.jsx(n.em, { children: 'Surprisingly' }),
                    }),
                    e.jsx(n.td, { children: 'Fumadocs' }),
                  ],
                }),
                e.jsxs(n.tr, {
                  children: [
                    e.jsx(n.td, {
                      children: 'very long text that looks weird',
                    }),
                    e.jsx(n.td, {
                      children: 'hello world hello world hello world',
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    })
  );
}
function g(t = {}) {
  const { wrapper: n } = t.components || {};
  return n ? e.jsx(n, { ...t, children: e.jsx(r, { ...t }) }) : r(t);
}
function h(t, n) {
  throw new Error(
    'Expected component `' +
      t +
      '` to be defined: you likely forgot to import, pass, or provide it.',
  );
}
export {
  g as default,
  o as extractedReferences,
  l as frontmatter,
  a as structuredData,
  c as toc,
};
