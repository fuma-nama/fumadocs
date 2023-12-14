import { HomeIcon } from 'lucide-react';
import { Accordion, Accordions } from 'next-docs-ui/components/accordion';
import { Callout } from 'next-docs-ui/components/callout';
import { File, Files } from 'next-docs-ui/components/files';
import { ImageZoom } from 'next-docs-ui/components/image-zoom';
import { InlineTOC } from 'next-docs-ui/components/inline-toc';
import { RollButton } from 'next-docs-ui/components/roll-button';
import { Step, Steps } from 'next-docs-ui/components/steps';
import { Tab, Tabs } from 'next-docs-ui/components/tabs';
import { TypeTable } from 'next-docs-ui/components/type-table';
import { Card } from 'next-docs-ui/mdx/card';
import { Heading } from 'next-docs-ui/mdx/heading';
import type { ReactNode } from 'react';
import BannerImage from '@/public/banner.png';
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
      <Accordions
        type="single"
        collapsible
        className="rounded-xl bg-background pr-4"
      >
        <Accordion id="what-is-next-docs" title="What is Next Docs?">
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
        <File title="app" defaultOpen>
          <File title="layout.tsx" />
          <File title="page.tsx" />
          <File title="global.css" />
        </File>
        <File title="components">
          <File title="button.tsx" />
          <File title="tabs.tsx" />
          <File title="dialog.tsx" />
        </File>
        <File title="package.json" />
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
  'roll-button': <RollButton />,
} as Record<string, ReactNode>;
