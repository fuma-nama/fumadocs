import { File, Files } from 'next-docs-ui/components/files'
import { InlineTOC } from 'next-docs-ui/components/inline-toc'
import { RollButton } from 'next-docs-ui/components/roll-button'
import { Step, Steps } from 'next-docs-ui/components/steps'
import type { ReactNode } from 'react'

export default {
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
            depth: 2
          },
          {
            title: 'Getting Started',
            url: '#getting-started',
            depth: 3
          },
          {
            title: 'Usage',
            url: '#usage',
            depth: 3
          },
          {
            title: 'Styling',
            url: '#styling',
            depth: 3
          },
          {
            title: 'Reference',
            url: '#reference',
            depth: 2
          },
          {
            title: 'Components',
            url: '#components',
            depth: 3
          },
          {
            title: 'APIs',
            url: '#api',
            depth: 3
          },
          {
            title: 'Credits',
            url: '#credits',
            depth: 2
          }
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
  'roll-button': <RollButton />
} as Record<string, ReactNode>

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg p-4 bg-gradient-to-br from-primary to-primary/50">
      {children}
    </div>
  )
}
