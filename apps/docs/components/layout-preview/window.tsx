'use client';
import { Image } from 'fumadocs-core/framework';
import type { ReactNode } from 'react';
import Wallpaper from '@/app/(home)/story.png';

/** a window around the frame of layout stories */
export function StoryWindow({ children }: { children: ReactNode }) {
  return (
    <div className="relative px-4 pt-6 pb-8 sm:px-8">
      <Image
        src={Wallpaper}
        alt=""
        sizes="(min-width: 768px) 900px, 100vw"
        className="pointer-events-none absolute inset-0 size-full object-cover"
      />
      <div className="relative overflow-hidden rounded-xl border bg-fd-background shadow-xl">
        <div className="flex h-8 items-center gap-1.5 border-b bg-fd-card px-3">
          <span className="size-2.5 rounded-full bg-[#ff5f57]" />
          <span className="size-2.5 rounded-full bg-[#febc2e]" />
          <span className="size-2.5 rounded-full bg-[#28c840]" />
        </div>
        {children}
      </div>
    </div>
  );
}
