'use client';
import { type Framework, FrameworkProvider } from '@/framework/index';
import type { ReactNode } from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

export function NextProvider({
  children,
  Link: CustomLink,
}: {
  children: ReactNode;
  Link?: Framework['Link'];
}) {
  return (
    <FrameworkProvider
      usePathname={usePathname}
      useRouter={useRouter}
      useParams={useParams}
      Link={CustomLink || (Link as Framework['Link'])}
      Image={Image as Framework['Image']}
    >
      {children}
    </FrameworkProvider>
  );
}
