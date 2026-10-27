import type { ReactNode } from 'react';
import { SiteHomeLayout } from '@/components/layouts/home';
import { StatusBar } from './ui/status-bar';
import './landing.css';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <SiteHomeLayout className="landing overflow-x-clip">
      <div
        data-sheet=""
        className="mx-auto w-full max-w-(--lp-max) flex-1 border-lp-line pb-(--lp-status-h) min-[1400px]:border-x"
      >
        {children}
      </div>
      <StatusBar />
    </SiteHomeLayout>
  );
}
