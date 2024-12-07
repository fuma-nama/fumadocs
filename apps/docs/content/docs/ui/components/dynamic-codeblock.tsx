'use client';
import { DynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock';
import { useState } from 'react';
import { Wrapper } from '@/components/preview/wrapper';
import { cn } from '@/utils/cn';
import { buttonVariants } from '@/components/ui/button';

export function Example() {
  const [lang, setLang] = useState('js');
  const [code, setCode] = useState('console.log("This is pre-rendered")');
  const [show, setShow] = useState(false);

  return (
    <Wrapper>
      <div className="prose rounded-lg bg-fd-background p-4">
        <div className="not-prose -mx-2 flex flex-col rounded-lg bg-black text-white">
          <input
            className="border-b bg-transparent p-2 text-sm focus-visible:outline-none"
            value={lang}
            onChange={(e) => setLang(e.target.value)}
          />
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="bg-transparent p-2 text-sm focus-visible:outline-none"
          />
        </div>

        <button
          className={cn(
            buttonVariants({ variant: 'secondary', size: 'sm' }),
            'mt-6',
          )}
          onClick={() => setShow((prev) => !prev)}
        >
          Show
        </button>
        {show ? <DynamicCodeBlock lang={lang} code={code} /> : null}
        <DynamicCodeBlock lang={lang} code={code} />
      </div>
    </Wrapper>
  );
}
