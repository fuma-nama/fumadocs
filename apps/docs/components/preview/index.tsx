import { HomeIcon } from 'lucide-react';
import { Accordion, Accordions } from 'fumadocs-ui/components/accordion';
import { Callout } from 'fumadocs-ui/components/callout';
import { File, Folder, Files } from 'fumadocs-ui/components/files';
import { ImageZoom } from 'fumadocs-ui/components/image-zoom';
import { InlineTOC } from 'fumadocs-ui/components/inline-toc';
import { RollButton } from 'fumadocs-ui/components/roll-button';
import { Step, Steps } from 'fumadocs-ui/components/steps';
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';
import { TypeTable } from 'fumadocs-ui/components/type-table';
import { Card } from 'fumadocs-ui/components/card';
import { Heading } from 'fumadocs-ui/components/heading';
import type { ReactNode } from 'react';
import { RootToggle } from 'fumadocs-ui/components/layout/root-toggle';
import { Banner } from 'fumadocs-ui/components/banner';
import BannerImage from '@/public/banner.png';
import { modes } from '@/utils/modes';
import { Wrapper } from './wrapper';

export default {
  heading: (
    <Wrapper>
      <Heading
        id="preview"
        as="h3"
        className="!my-0 rounded-xl bg-background p-4"
      >
        Hello World
      </Heading>
    </Wrapper>
  ),
  card: (
    <Wrapper>
      <div className="rounded-lg bg-background">
        <Card
          href="#"
          icon={<HomeIcon />}
          title="Hello World"
          description="Learn More about Caching and Revalidation"
        />
      </div>
    </Wrapper>
  ),
  tabs: (
    <Wrapper>
      <div className="space-y-4 rounded-xl bg-background p-4 text-sm">
        <Tabs
          id="language"
          persist
          items={['Javascript', 'Rust', 'Typescript']}
        >
          <Tab value="Javascript">Hello World in Javascript</Tab>
          <Tab value="Rust">Hello World in Rust</Tab>
          <Tab value="Typescript">Also works if items are not the same</Tab>
        </Tabs>

        <Tabs id="language" persist items={['Javascript', 'Rust']}>
          <Tab value="Javascript">
            Value is shared! Try refresh and see if the value is persisted
          </Tab>
          <Tab value="Rust">
            Value is shared! Try refresh and see if the value is persisted
          </Tab>
        </Tabs>
      </div>
    </Wrapper>
  ),
  'type-table': (
    <Wrapper>
      <div className="rounded-xl bg-background px-4">
        <TypeTable
          type={{
            percentage: {
              description:
                'The percentage of scroll position to display the roll button',
              type: 'number',
              default: '0.2',
            },
          }}
        />
      </div>
    </Wrapper>
  ),
  'zoom-image': (
    <Wrapper>
      <ImageZoom
        alt="banner"
        src={BannerImage}
        className="!my-0 rounded-xl bg-background"
        priority
      />
    </Wrapper>
  ),
  accordion: (
    <Wrapper>
      <Accordions type="single" collapsible>
        <Accordion id="what-is-fumadocs" title="What is Fumadocs?">
          A framework for building documentations
        </Accordion>
        <Accordion id="ux" title="What do we love?">
          We love websites with a good user experience
        </Accordion>
      </Accordions>
    </Wrapper>
  ),
  callout: (
    <Wrapper>
      <Callout title="Title">Hello World</Callout>
    </Wrapper>
  ),
  files: (
    <Wrapper>
      <Files>
        <Folder name="app" defaultOpen>
          <Folder name="[id]" defaultOpen>
            <File name="page.tsx" />
          </Folder>
          <File name="layout.tsx" />
          <File name="page.tsx" />
          <File name="global.css" />
        </Folder>
        <Folder name="components">
          <File name="button.tsx" />
          <File name="tabs.tsx" />
          <File name="dialog.tsx" />
        </Folder>
        <File name="package.json" />
      </Files>
    </Wrapper>
  ),
  'inline-toc': (
    <Wrapper>
      <InlineTOC
        items={[
          {
            title: 'Welcome',
            url: '#welcome',
            depth: 2,
          },
          {
            title: 'Getting Started',
            url: '#getting-started',
            depth: 3,
          },
          {
            title: 'Usage',
            url: '#usage',
            depth: 3,
          },
          {
            title: 'Styling',
            url: '#styling',
            depth: 3,
          },
          {
            title: 'Reference',
            url: '#reference',
            depth: 2,
          },
          {
            title: 'Components',
            url: '#components',
            depth: 3,
          },
          {
            title: 'APIs',
            url: '#api',
            depth: 3,
          },
          {
            title: 'Credits',
            url: '#credits',
            depth: 2,
          },
        ]}
      />
    </Wrapper>
  ),
  steps: (
    <Wrapper>
      <div className="rounded-xl bg-background p-3">
        <Steps>
          <Step>
            <h4>Buy Coffee</h4>
            <p>Some text here</p>
          </Step>
          <Step>
            <h4>Go to Office Some text here</h4>
            <p>Some text here</p>
          </Step>
          <Step>
            <h4>Have a meeting Some text here</h4>
            <p>Some text here</p>
          </Step>
        </Steps>
      </div>
    </Wrapper>
  ),
  'roll-button': (
    <div className="rounded-lg border bg-card p-4 text-muted-foreground">
      <p className="text-center text-sm">Scroll down to see the button</p>
      <RollButton />
    </div>
  ),
  'root-toggle': (
    <Wrapper>
      <div className="not-prose rounded-xl bg-background p-3">
        <RootToggle
          options={modes.map((mode) => ({
            url: `/docs/${mode.param}`,
            icon: <mode.icon />,
            title: mode.name,
            description: mode.description,
          }))}
        />
      </div>
    </Wrapper>
  ),
  banner: (
    <Wrapper>
      <div className="flex flex-col gap-4">
        <Banner>Be careful, Fumadocs v99 has released</Banner>
        <Banner id="99">Be careful, this banner can be closed</Banner>
      </div>
    </Wrapper>
  ),
} as Record<string, ReactNode>;
