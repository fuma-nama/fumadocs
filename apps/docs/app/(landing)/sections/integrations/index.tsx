import type { ReactNode } from 'react';
import Link from 'next/link';
import { Figure, FigureHeader } from '../../ui/figure';
import { Board, type Module } from './board';
import { modules as info, more } from './modules';
import { copy } from '../../content';
import { AIChatMechanism } from './mechanisms/ai-chat';
import { AsyncAPIMechanism } from './mechanisms/asyncapi';
import { GraphQLMechanism } from './mechanisms/graphql';
import { I18nMechanism } from './mechanisms/i18n';
import { LLMsMechanism } from './mechanisms/llms';
import { ObsidianMechanism } from './mechanisms/obsidian';
import { OGMechanism } from './mechanisms/og';
import { OpenAPIMechanism } from './mechanisms/openapi';
import { SearchMechanism } from './mechanisms/search';
import { StoryMechanism } from './mechanisms/story';
import { TwoslashMechanism } from './mechanisms/twoslash';
import { TypeTableMechanism } from './mechanisms/type-table';
import './integrations.css';

/** the mechanism of each module, by its title */
const mechanisms: Record<string, ReactNode> = {
  Search: <SearchMechanism />,
  OpenAPI: <OpenAPIMechanism />,
  AsyncAPI: <AsyncAPIMechanism />,
  GraphQL: <GraphQLMechanism />,
  'AI Chat': <AIChatMechanism />,
  'llms.txt': <LLMsMechanism />,
  i18n: <I18nMechanism />,
  'OG Image': <OGMechanism />,
  Twoslash: <TwoslashMechanism />,
  'Type Table': <TypeTableMechanism />,
  Story: <StoryMechanism />,
  Obsidian: <ObsidianMechanism />,
};

const modules: Module[] = [];
for (const item of info) modules.push({ ...item, mechanism: mechanisms[item.title] });

const loaded = `${modules.length} integrations loaded`;

export function Integrations() {
  return (
    <Figure id="integrations" aria-label="Integrations" status={loaded}>
      <Board
        modules={modules}
        loaded={loaded}
        header={
          <FigureHeader
            lead={copy.integrations.lead}
            title={copy.integrations.title}
            description={copy.integrations.description}
          />
        }
      >
        <Marquee />
      </Board>
    </Figure>
  );
}

function Marquee() {
  const items = [];
  for (let i = 0; i < more.length; i++) {
    items.push(
      <li key={more[i].name}>
        <Link
          href={more[i].href}
          prefetch={false}
          className="flex h-11 items-center px-4 font-mono text-[13px] text-lp-ink-2 hover:bg-lp-ink hover:text-lp-paper focus-visible:bg-lp-ink focus-visible:text-lp-paper focus-visible:outline-none"
        >
          {more[i].name}
        </Link>
      </li>,
    );
  }

  return (
    <div className="bt-more flex items-stretch">
      <p className="flex shrink-0 items-center gap-2 border-e border-lp-line px-(--lp-gutter) font-pixel text-[13px]">
        <span className="text-lp-orange">+{more.length}</span>
        <span className="text-lp-ink-2">more</span>
      </p>
      {/* the moving text keeps clear of the divider and the sheet's edge */}
      <div className="bt-marquee relative ms-3 me-(--lp-gutter) min-w-0 flex-1 overflow-clip">
        <div className="bt-track flex w-max">
          <ul className="flex">{items}</ul>
          <ul aria-hidden inert className="flex">
            {items}
          </ul>
        </div>
      </div>
    </div>
  );
}
