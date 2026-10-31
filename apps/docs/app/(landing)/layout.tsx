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
    <SiteHomeLayout className={`landing overflow-x-clip ${pixel.variable}`}>
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
