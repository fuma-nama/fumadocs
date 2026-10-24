import type { ReactNode } from 'react';
import localFont from 'next/font/local';
import { cn } from '@/lib/cn';
import { SiteHomeLayout } from '@/components/layouts/home';
import { StatusBar } from './status-bar';
import './landing.css';

// Geist Pixel, the variable build with its pixel-shape axis (`ELSH`), latin subset
const pixel = localFont({
  src: './fonts/GeistPixel.woff2',
  variable: '--font-geist-pixel',
  // no metrics exist to size a fallback for it
  adjustFontFallback: false,
});

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <SiteHomeLayout className={cn('landing overflow-x-clip', pixel.variable)}>
      <div
        data-sheet=""
        className="mx-auto w-full max-w-(--lp-max) flex-1 border-lp-line pb-(--lp-status-h) min-[1400px]:border-x"
      >
        {children}
      </div>
      <StatusBar />
      <div aria-hidden className="lp-grain" />
    </SiteHomeLayout>
  );
}
