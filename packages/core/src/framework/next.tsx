'use client';
import { type Framework, FrameworkProvider } from '@/framework/index';
import type { ReactNode } from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

export function NextProvider({ children }: { children: ReactNode }) {
  return (
    <FrameworkProvider
      usePathname={usePathname}
      useRouter={useRouter}
      useParams={useParams}
      Link={Link as Framework['Link']}
      Image={Image as Framework['Image']}
    >
      {children}
    </FrameworkProvider>
  );
}
