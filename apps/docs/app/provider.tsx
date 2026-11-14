'use client';

import { RootProvider, type RootProviderProps } from 'fumadocs-ui/provider/base';
import { type Framework as FrameworkAPI, FrameworkProvider } from 'fumadocs-core/framework';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, usePathname as useNextPathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { Tooltip } from '@base-ui/react/tooltip';
import { i18n } from '@/lib/i18n';

const SearchDialog = dynamic(() => import('@/components/layouts/search'), {
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

const hiddenLocale = `/${i18n.defaultLanguage}`;

/** the pathname of the URL: pages of the default language are prerendered under `/en`, which the proxy hides */
function usePathname(): string {
  const pathname = useNextPathname();
  if (pathname === hiddenLocale) return '/';
  return pathname.startsWith(`${hiddenLocale}/`) ? pathname.slice(hiddenLocale.length) : pathname;
}

/** `NextProvider` of `fumadocs-core/framework/next`, with the pathname of the URL */
export function Framework({ children }: { children: ReactNode }) {
  return (
    <FrameworkProvider
      usePathname={usePathname}
      useRouter={useRouter}
      useParams={useParams}
      Link={Link as FrameworkAPI['Link']}
      Image={Image as FrameworkAPI['Image']}
    >
      {children}
    </FrameworkProvider>
  );
}

export function Provider({ i18n, children }: Pick<RootProviderProps, 'i18n' | 'children'>) {
  return (
    <RootProvider
      i18n={i18n}
      search={{
        SearchDialog,
      }}
    >
      <Tooltip.Provider>
        <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: inject }} />
        {children}
      </Tooltip.Provider>
    </RootProvider>
  );
}
