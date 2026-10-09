'use client';
import { ArrowDown, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Figure, Lines, Panel, Scenes, enter, useSteps } from './figure';

interface Element {
  kind: string;
  note: string;
  jsx: string;
  markdown: string;
}

const elements: Element[] = [
  {
    kind: 'Server component',
    note: 'asMarkdown()',
    jsx: '<Callout title="Heads up">\n  Restart the **dev server**.\n</Callout>',
    markdown: '> **Heads up**\n>\n> Restart the **dev server**.',
  },
  {
    kind: 'Server component',
    note: 'asMarkdown()',
    jsx: "<TypeTable type={{\n  baseUrl: { type: 'string' },\n}} />",
    markdown: '| Prop | Type |\n| --- | --- |\n| `baseUrl` | `string` |',
  },
  {
    kind: 'Client component',
    note: 'kept as JSX',
    jsx: "<Tabs items={['npm', 'pnpm']}>\n  …\n</Tabs>",
    markdown: '<Tabs items={["npm","pnpm"]}>\n  …\n</Tabs>',
  },
];

const chunks: [string, string][] = [
  ['## Installation', 'Markdown'],
  ['<Callout title="Heads up">…</Callout>', 'Server component'],
  ['<TypeTable type={{ … }} />', 'Server component'],
  ["<Tabs items={['npm', 'pnpm']}>…</Tabs>", 'Client component'],
];

const captions = [
  'With output: "function", _markdown is a component of Markdown and JSX elements.',
  '<Callout /> calls asMarkdown(), and returns a blockquote.',
  '<TypeTable /> renders its props into a table.',
  '<Tabs /> never runs on the server, so it stays as JSX.',
];

export function RenderToMarkdown() {
  const steps = useSteps(captions);

  return (
    <Figure steps={steps}>
      <Scenes step={steps.step}>
        {[
          <Panel key="component" label="_markdown" aside="a component" className="w-full max-w-md">
            {chunks.map(([chunk, kind], i) => {
              const motion = enter(i);
              return (
                <p
                  key={chunk}
                  className={cn('flex items-center gap-3 py-0.5', motion.className)}
                  style={motion.style}
                >
                  <span className="min-w-0 flex-1 truncate">{chunk}</span>
                  <span className="shrink-0 font-sans text-[10px] text-fd-muted-foreground">
                    {kind}
                  </span>
                </p>
              );
            })}
          </Panel>,
          ...elements.map((element) => <Render key={element.jsx} element={element} />),
        ]}
      </Scenes>
    </Figure>
  );
}

function Render({ element }: { element: Element }) {
  const [input, note, output] = [enter(0), enter(3), enter(6)];

  return (
    <div className="grid w-full items-center gap-2 sm:grid-cols-[1fr_auto_1fr] sm:gap-3">
      <Panel label={element.kind} className={input.className} style={input.style}>
        <Lines lines={element.jsx.split('\n')} />
      </Panel>
      <div
        className={cn(
          'flex items-center justify-center gap-1.5 text-fd-muted-foreground sm:flex-col',
          note.className,
        )}
        style={note.style}
      >
        <span className="rounded-full bg-fd-foreground px-2 font-mono text-[10px] leading-5 text-fd-background">
          {element.note}
        </span>
        <ArrowRight className="size-3.5 max-sm:hidden" />
        <ArrowDown className="size-3.5 sm:hidden" />
      </div>
      <Panel label="Markdown" className={output.className} style={output.style}>
        <Lines lines={element.markdown.split('\n')} />
      </Panel>
    </div>
  );
}
