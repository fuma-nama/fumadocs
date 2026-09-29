import { describe, expect, it } from 'vitest';
import {
  Children,
  createElement,
  forwardRef,
  lazy,
  memo,
  Suspense,
  type ReactElement,
  type ReactNode,
} from 'react';
import { asMarkdown, jsxComponents, md, renderRoute, renderToMarkdown } from '@/server';

/** mimics Vite RSC: a callable proxy that throws when called on the server */
function clientReference(id: string) {
  const ref = () => {
    throw new Error(`Unexpectedly client reference export '${id}' is called on server`);
  };
  Object.assign(ref, { $$typeof: Symbol.for('react.client.reference'), $$id: id });
  return ref as unknown as (props: Record<string, unknown>) => ReactNode;
}

describe('components', () => {
  async function Callout({ title, children }: { title: string; children?: ReactNode }) {
    if (asMarkdown()) return md.linePrefix('> ')`**${title}**\n${children}`;

    return (
      <div className="callout">
        <p className="title">{title}</p>
        {children}
      </div>
    );
  }

  it('asMarkdown() is false outside of markdown rendering', async () => {
    expect(asMarkdown()).toBe(false);
    const out = await Callout({ title: 'Note' });
    expect(typeof out).toBe('object');
  });

  it('server components opt in and stringify their children', async () => {
    const out = await renderToMarkdown(
      <Callout title="Note">
        <p>hello</p>
        <p>world</p>
      </Callout>,
    );

    expect(out).toBe('> **Note**\n>\n> hello\n>\n> world');
  });

  it('parents keep access to child elements', async () => {
    function Tab({ children }: { children?: ReactNode }) {
      return <div role="tabpanel">{children}</div>;
    }

    async function Tabs({ items, children }: { items: string[]; children?: ReactNode }) {
      if (asMarkdown()) {
        const tabs = Children.toArray(children) as ReactElement<{ children?: ReactNode }>[];
        return md`${items.map((item, i) => md`### ${item}\n\n${tabs[i]?.props.children}\n\n`)}`;
      }

      return <div>{children}</div>;
    }

    const out = await renderToMarkdown(
      <Tabs items={['npm', 'pnpm']}>
        <Tab>
          <pre>
            <code className="language-bash">npm i</code>
          </pre>
        </Tab>
        <Tab>
          <p>pnpm add</p>
        </Tab>
      </Tabs>,
    );

    expect(out).toBe('### npm\n\n```bash\nnpm i\n```\n\n### pnpm\n\npnpm add');
  });

  it('md.indent keeps nested blocks inside list items', async () => {
    function Step({ children }: { title: string; children?: ReactNode }) {
      return <div>{children}</div>;
    }

    async function Steps({ children }: { children?: ReactNode }) {
      if (asMarkdown()) {
        const steps = Children.toArray(children) as ReactElement<{
          title: string;
          children?: ReactNode;
        }>[];

        return md`${steps.map(
          (step, i) =>
            md`${i + 1}. **${step.props.title}**\n${md.indent(3)`${step.props.children}`}`,
        )}`;
      }

      return <div>{children}</div>;
    }

    const out = await renderToMarkdown(
      <Steps>
        <Step title="Install">
          <p>run it</p>
          <pre>
            <code>npm i</code>
          </pre>
        </Step>
        <Step title="Done">
          <p>ok</p>
        </Step>
      </Steps>,
    );

    expect(out).toBe(
      [
        '1. **Install**',
        '',
        '   run it',
        '',
        '   ```',
        '   npm i',
        '   ```',
        '',
        '2. **Done**',
        '',
        '   ok',
      ].join('\n'),
    );
  });

  it("keeps components that don't call asMarkdown() as JSX syntax", async () => {
    function Card({ title, children }: { title: string; children?: ReactNode }) {
      return (
        <div className="card">
          <h3>{title}</h3>
          {children}
        </div>
      );
    }

    expect(
      await renderToMarkdown(
        <Card title="Hi">
          <p>body</p>
        </Card>,
      ),
    ).toBe('<Card title="Hi">\nbody\n</Card>');

    // inside an opted-in component
    expect(
      await renderToMarkdown(
        <Callout title="Note">
          <Card title="Hi">
            <p>body</p>
          </Card>
        </Callout>,
      ),
    ).toBe('> **Note**\n>\n> <Card title="Hi">\n> body\n> </Card>');
  });

  it("renderRoute returns undefined for pages that don't opt in", async () => {
    function Plain() {
      return <p>html</p>;
    }
    async function Page({ path }: { path: string }) {
      if (!asMarkdown()) return null;
      return md`# ${path}`;
    }

    function Throws(): null {
      throw new Error('needs a context');
    }
    function OptsInThenThrows(): null {
      asMarkdown();
      throw new Error('real bug');
    }

    expect(await renderRoute(<Plain />)).toBeUndefined();
    expect(await renderRoute(<Page path="/about" />)).toBe('# /about');
    expect(await renderRoute(<Throws />)).toBeUndefined();
    await expect(renderRoute(<OptsInThenThrows />)).rejects.toThrow('real bug');
  });

  it('calling asMarkdown() opts in, even when returning JSX', async () => {
    function Footer() {
      asMarkdown();
      return (
        <footer>
          <p>bye</p>
        </footer>
      );
    }

    async function Page() {
      await new Promise((resolve) => setTimeout(resolve, 1));
      if (!asMarkdown()) return null;

      return (
        <>
          <h1>Title</h1>
          {Promise.resolve(<p>async</p>)}
          <Suspense fallback="loading">
            <Footer />
          </Suspense>
        </>
      );
    }

    expect(await renderToMarkdown(<Page />)).toBe('# Title\n\nasync\n\nbye');
  });

  it('supports lazy, memo and forwardRef', async () => {
    const Lazy = lazy(async () => ({
      default: () =>
        asMarkdown()
          ? md`
lazy\n\n
            `
          : null,
    }));
    const Memo = memo(function Memo() {
      return asMarkdown()
        ? md`
memo\n\n
          `
        : null;
    });
    const Fwd = forwardRef<HTMLDivElement>(function Fwd() {
      return asMarkdown()
        ? md`
fwd\n\n
          `
        : null;
    });
    const Opaque = memo(function Opaque() {
      return <p>never</p>;
    });

    expect(
      await renderToMarkdown(
        <>
          <Lazy />
          <Memo />
          <Fwd />
          <Opaque />
        </>,
      ),
    ).toBe('lazy\n\nmemo\n\nfwd\n\n<Opaque />');
  });

  it('md strips what formatters add: leading/trailing lines and common indentation', async () => {
    // alias so the formatter doesn't touch these templates
    const tag = md;

    expect(
      await tag`
      ## ${'Title'}

      1. one
         nested
    `,
    ).toBe('## Title\n\n1. one\n   nested');

    // Prettier's unindented style
    expect(
      await tag`
lazy

            `,
    ).toBe('lazy\n');

    // intentional indentation is kept
    expect(await tag`1. ${'title'}\n   body`).toBe('1. title\n   body');
    expect(await tag`plain`).toBe('plain');

    // the author's trailing newlines are kept
    expect(await tag`block\n\n`).toBe('block\n\n');
    expect(
      await tag`
block

`,
    ).toBe('block\n\n');
  });

  it('md resolves arrays, promises and nodes', async () => {
    expect(await md`${[1, ' and ', Promise.resolve('two')]}, ${<strong>x</strong>}`).toBe(
      '1 and two, **x**',
    );
  });
});

describe('client components', () => {
  it('falls back to JSX syntax with serializable props', async () => {
    const Tabs = clientReference('/src/components/tabs.tsx#Tabs');

    const out = await renderToMarkdown(
      createElement(
        Tabs,
        {
          items: ['npm', 'pnpm'],
          defaultIndex: 0,
          persist: true,
          hidden: false,
          onChange: () => {},
          icon: <span>x</span>,
          payload: { spec: 'x'.repeat(2000) },
          svg: '<svg>'.repeat(300),
          className: 'p-4',
          style: { color: 'red' },
        },
        <p>content</p>,
      ),
    );

    expect(out).toBe('<Tabs items={["npm","pnpm"]} defaultIndex={0} persist>\ncontent\n</Tabs>');
  });

  it('uses inline syntax inside inline content', async () => {
    const Link = clientReference('/src/link.tsx#Link');
    const Icon = clientReference('%2Fsrc%2Ficons%2Farrow-right.tsx#default');

    expect(
      await renderToMarkdown(
        <p>
          see {createElement(Link, { href: '/x' }, 'here')} {createElement(Icon, {})} now
        </p>,
      ),
    ).toBe('see <Link href="/x">here</Link> <ArrowRight /> now');
  });

  it('server wrappers give client components a markdown form', async () => {
    const LinkClient = clientReference('/src/link.tsx#Link');
    function Link({ href, children }: { href: string; children?: ReactNode }) {
      if (asMarkdown()) return md`[${children}](${href})`;
      return createElement(LinkClient, { href }, children);
    }

    expect(
      await renderToMarkdown(
        <p>
          see <Link href="/x">here</Link> now
        </p>,
      ),
    ).toBe('see [here](/x) now');
  });
});

describe('jsxComponents', () => {
  it('resolves provided components and stubs missing ones', async () => {
    async function Callout({ title, children }: { title: string; children?: ReactNode }) {
      if (asMarkdown()) return md.linePrefix('> ')`**${title}**\n${children}`;
      return <div>{children}</div>;
    }

    const _c = jsxComponents({ Callout });

    expect(
      await renderToMarkdown(
        <>
          <_c.Callout title="Note">{'hello\n'}</_c.Callout>
          <_c.Tabs items={['a']}>{'content\n'}</_c.Tabs>
        </>,
      ),
    ).toBe('> **Note**\n> hello\n\n<Tabs items={["a"]}>\ncontent\n</Tabs>');
  });
});

describe('host elements', () => {
  it('converts compiled MDX output', async () => {
    const tree = (
      <>
        <h2 id="install">
          <a href="#install">Install</a>
        </h2>
        {'\n'}
        <p>
          Run <code>npm i</code> to <strong>install</strong>, see <a href="/docs">docs</a>.
        </p>
        {'\n'}
        <pre>
          <code className="language-ts">
            <span className="line">
              <span>const</span>
              <span> a = 1;</span>
            </span>
            {'\n'}
            <span className="line">
              <span>a++;</span>
            </span>
          </code>
        </pre>
        {'\n'}
        <ul>
          {'\n'}
          <li>one</li>
          {'\n'}
          <li>
            two
            {'\n'}
            <ul>
              {'\n'}
              <li>nested</li>
              {'\n'}
            </ul>
          </li>
          {'\n'}
        </ul>
        {'\n'}
        <ol start={3}>
          {'\n'}
          <li>done</li>
          {'\n'}
        </ol>
        {'\n'}
        <blockquote>
          {'\n'}
          <p>quoted</p>
          {'\n'}
          <p>twice</p>
          {'\n'}
        </blockquote>
        {'\n'}
        <table>
          <thead>
            <tr>
              <th>a</th>
              <th>b|c</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td>
                <em>2</em>
              </td>
            </tr>
          </tbody>
        </table>
        {'\n'}
        <p>
          <img src="/x.png" alt="pic" />
        </p>
        {'\n'}
        <hr />
      </>
    );

    expect(await renderToMarkdown(tree)).toBe(
      [
        '## Install',
        '',
        'Run `npm i` to **install**, see [docs](/docs).',
        '',
        '```ts',
        'const a = 1;',
        'a++;',
        '```',
        '',
        '- one',
        '- two',
        '  - nested',
        '',
        '3. done',
        '',
        '> quoted',
        '>',
        '> twice',
        '',
        '| a | b\\|c |',
        '| --- | --- |',
        '| 1 | *2* |',
        '',
        '![pic](/x.png)',
        '',
        '---',
      ].join('\n'),
    );
  });

  it('turns multi-line code without pre into a fence', async () => {
    expect(
      await renderToMarkdown(
        <div className="codeblock">
          <code className="language-ts">{'const a = 1;\na++;'}</code>
        </div>,
      ),
    ).toBe('```ts\nconst a = 1;\na++;\n```');
  });

  it('never glues blocks to preceding inline text', async () => {
    expect(
      await renderToMarkdown(
        <div>
          intro
          <ul>
            <li>
              item<pre>code</pre>
            </li>
          </ul>
        </div>,
      ),
    ).toBe('intro\n- item\n  ```\n  code\n  ```');
  });

  it('drops non-content elements and passes unknown ones through', async () => {
    expect(
      await renderToMarkdown(
        <section>
          <style>{'.a{}'}</style>
          <svg>
            <path d="M0 0" />
          </svg>
          {createElement('custom-element', {}, <p>inside</p>)}
        </section>,
      ),
    ).toBe('inside');
  });
});
