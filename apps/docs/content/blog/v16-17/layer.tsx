'use client';
import type { ReactNode } from 'react';
import { ArrowRight, Bot, Hash, User } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Figure, Lines, Panel, Scenes, enter, useSteps } from './figure';

const captions = [
  'The rendered page, for humans in browsers.',
  'The Markdown, for agents, and anyone pasting it into ChatGPT.',
  'The search records, for your search and the search tools of agents.',
];

const forms = ['Rendered page', 'Markdown', 'Search records'];

function Form({
  label,
  by,
  humans,
  agents,
  children,
}: {
  label: string;
  by: string;
  humans: string;
  agents?: string;
  children: ReactNode;
}) {
  const [card, readers] = [enter(0), enter(3)];

  return (
    <div className="w-full">
      <Panel label={label} aside={by} className={card.className} style={card.style}>
        {children}
      </Panel>
      <p
        className={cn(
          'mt-2 flex flex-wrap gap-x-3 gap-y-0.5 font-sans text-xs text-fd-muted-foreground',
          readers.className,
        )}
        style={readers.style}
      >
        <span className="inline-flex items-center gap-1">
          <User className="size-3.5" aria-label="Humans" />
          {humans}
        </span>
        {agents && (
          <span className="inline-flex items-center gap-1">
            <Bot className="size-3.5" aria-label="Agents" />
            {agents}
          </span>
        )}
      </p>
    </div>
  );
}

export function MarkdownLayer() {
  const steps = useSteps(captions);

  return (
    <Figure steps={steps}>
      <div className="grid items-center gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1.2fr)]">
        <Panel label="page.mdx" aside="your source" className="max-sm:hidden">
          <Lines
            lines={[
              '## Installation',
              '',
              'Install the core package:',
              '',
              '```npm',
              'npm i fumadocs-core',
              '```',
            ]}
          />
        </Panel>
        <div className="flex items-center gap-1 sm:flex-col sm:items-stretch">
          {forms.map((form, i) => (
            <button
              key={form}
              type="button"
              aria-pressed={i === steps.step}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-colors',
                i === steps.step
                  ? 'bg-fd-foreground text-fd-background'
                  : 'text-fd-muted-foreground hover:text-fd-foreground',
              )}
              onClick={() => steps.go(i)}
            >
              <ArrowRight className="size-3 max-sm:hidden" />
              {form}
            </button>
          ))}
        </div>
        <Scenes step={steps.step}>
          {[
            <Form key="page" label="Rendered page" by="React" humans="Browsers">
              <div className="font-sans">
                <p className="text-sm font-semibold">Installation</p>
                <p className="mt-0.5 text-fd-muted-foreground">Install the core package:</p>
                <div className="mt-2 overflow-hidden rounded-md border">
                  <p className="flex gap-3 border-b px-2 py-1 text-[11px] text-fd-muted-foreground">
                    <span className="text-fd-foreground underline underline-offset-4">npm</span>
                    <span>pnpm</span>
                    <span>yarn</span>
                    <span>bun</span>
                  </p>
                  <p className="px-2 py-1 font-mono">npm i fumadocs-core</p>
                </div>
              </div>
            </Form>,
            <Form
              key="markdown"
              label="Markdown"
              by="Remark LLMs"
              humans="Copy Markdown"
              agents=".md routes, llms.txt, MCP"
            >
              <Lines
                lines={[
                  '## Installation [#installation]',
                  '',
                  'Install the core package:',
                  '',
                  '```npm',
                  'npm i fumadocs-core',
                  '```',
                ]}
              />
            </Form>,
            <Form
              key="records"
              label="Search records"
              by="Remark Structure"
              humans="Search dialog"
              agents="MCP search"
            >
              <div className="font-sans">
                <p className="py-1 font-medium">Quick Start</p>
                <div className="ms-1.5 border-s ps-3">
                  <p className="flex items-center gap-1.5 py-1 font-medium">
                    <Hash className="size-3.5 text-fd-muted-foreground" />
                    Installation
                  </p>
                  <p className="py-1 text-fd-foreground/80">Install the core package:</p>
                </div>
              </div>
            </Form>,
          ]}
        </Scenes>
      </div>
    </Figure>
  );
}
