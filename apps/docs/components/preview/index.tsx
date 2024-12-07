'use client';
import { Home } from 'lucide-react';
import dynamic from 'next/dynamic';
import { Heading } from 'fumadocs-ui/components/heading';
import { Card } from 'fumadocs-ui/components/card';
import { Callout } from 'fumadocs-ui/components/callout';
import { Accordion, Accordions } from 'fumadocs-ui/components/accordion';
import { RootToggle } from 'fumadocs-ui/components/layout/root-toggle';
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';
import { Step, Steps } from 'fumadocs-ui/components/steps';
import { TypeTable } from 'fumadocs-ui/components/type-table';
import { type ReactNode } from 'react';
import { Wrapper } from './wrapper';

export function heading(): ReactNode {
  return (
    <Wrapper>
      <div className="rounded-lg bg-fd-background p-4 prose-no-margin">
        <Heading id="preview" as="h3">
          Hello World
        </Heading>
        <Heading id="preview" as="h3">
          Hello <code>World</code> Everyone!
        </Heading>
      </div>
    </Wrapper>
  );
}

export function card(): ReactNode {
  return (
    <Wrapper>
      <div className="rounded-lg bg-fd-background">
        <Card
          href="#"
          icon={<Home />}
          title="Hello World"
          description="Learn More about Caching and Revalidation"
        />
      </div>
    </Wrapper>
  );
}

export function tabs(): ReactNode {
  return (
    <Wrapper>
      <div className="space-y-4 rounded-xl bg-fd-background p-4 text-sm">
        <Tabs
          groupId="language"
          persist
          items={['Javascript', 'Rust', 'Typescript']}
        >
          <Tab value="Javascript">Hello World in Javascript</Tab>
          <Tab value="Rust">Hello World in Rust</Tab>
          <Tab value="Typescript">Also works if items are not the same</Tab>
        </Tabs>

        <Tabs groupId="language" persist items={['Javascript', 'Rust']}>
          <Tab value="Javascript">
            Value is shared! Try refresh and see if the value is persisted
          </Tab>
          <Tab value="Rust">
            Value is shared! Try refresh and see if the value is persisted
          </Tab>
        </Tabs>
      </div>
    </Wrapper>
  );
}

export function typeTable(): ReactNode {
  return (
    <Wrapper>
      <div className="rounded-xl bg-fd-background px-4">
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
  );
}

const ZoomImage = dynamic(() => import('./image-zoom'));
export function zoomImage(): ReactNode {
  return (
    <Wrapper>
      <ZoomImage />
    </Wrapper>
  );
}

export function accordion(): ReactNode {
  return (
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
  );
}

export function callout(): ReactNode {
  return (
    <Wrapper>
      <Callout title="Title">Hello World</Callout>
    </Wrapper>
  );
}

const FilesPreview = dynamic(() => import('./files'));

export function files(): ReactNode {
  return (
    <Wrapper>
      <FilesPreview />
    </Wrapper>
  );
}

const InlineTOC = dynamic(() => import('./inline-toc'));
export function inlineTOC(): ReactNode {
  return (
    <Wrapper>
      <InlineTOC />
    </Wrapper>
  );
}

export function steps(): ReactNode {
  return (
    <Wrapper>
      <div className="rounded-xl bg-fd-background p-3">
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
  );
}

export function rootToggle(): ReactNode {
  return (
    <Wrapper>
      <div className="not-prose mx-auto grid max-w-[240px] rounded-lg bg-fd-background">
        <RootToggle
          className="p-3"
          options={[
            {
              title: 'Hello World',
              description: 'The example item of root toggle',
              url: '/docs/ui',
            },
            {
              title: 'Other page',
              description: 'The example item of root toggle',
              url: '/docs/headless',
            },
          ]}
        />
      </div>
    </Wrapper>
  );
}

const DynamicCodeBlock = dynamic(() => import('./dynamic-codeblock'));

export function dynamicCodeBlock() {
  return (
    <Wrapper>
      <DynamicCodeBlock />
    </Wrapper>
  );
}

const Banner = dynamic(() => import('./banner'));

export function banner(): ReactNode {
  return (
    <Wrapper>
      <Banner />
    </Wrapper>
  );
}
