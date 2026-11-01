import type { ReactNode } from 'react';
import { Geist_Pixel } from 'next/font/google';
import { SiteHomeLayout } from '@/components/layouts/home';
import { StatusBar } from './ui/status-bar';
import './landing.css';

// the default square pixels only: no axis is animated
const pixel = Geist_Pixel({
  subsets: ['latin'],
  variable: '--font-geist-pixel',
  // no metrics exist to size a fallback for it
  adjustFontFallback: false,
});

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <SiteHomeLayout
      // from the sheet's width the navbar's content edge lands on the sheet's: two 1px frame lines,
      // its own 16px padding
      className={`landing overflow-x-clip selection:bg-lp-yellow selection:text-lp-on-yellow sheet:[--fd-layout-width:calc(var(--lp-max)-2px-2*var(--lp-gutter)+32px)] ${pixel.variable}`}
    >
      <div
        data-sheet=""
        className="mx-auto w-full max-w-(--lp-max) flex-1 border-lp-line pb-(--lp-status-h) sheet:border-x"
      >
        {children}
      </div>
      <StatusBar />
    </SiteHomeLayout>
  );
}
