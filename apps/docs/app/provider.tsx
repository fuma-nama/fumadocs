'use client';

import { RootProvider } from 'fumadocs-ui/provider';
import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { useEffect } from 'react';

const SearchDialog = dynamic(() => import('@/components/search'), {
  ssr: false,
});

const inject = `
const urlParams = new URLSearchParams(window.location.search);
const uwuParam = urlParams.get("uwu");

if (typeof uwuParam === 'string') {
    localStorage.setItem('uwu', uwuParam);
}

const item = localStorage.getItem('uwu')
    
if (item === 'true') {
    document.documentElement.classList.add("uwu")
}    
`;

export function Provider({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  return (
    <RootProvider
      search={{
        SearchDialog,
      }}
    >
      <PostHogProvider>
        <TooltipProvider>
          <script
            suppressHydrationWarning
            dangerouslySetInnerHTML={{ __html: inject }}
          />
          {children}
        </TooltipProvider>
      </PostHogProvider>
    </RootProvider>
  );
}

function PostHogProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      capture_pageview: false,
      autocapture: false,
    });
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
