import type { Metadata } from 'next';
import type { ReactNode } from 'react';

/**
 * The hands-on screens of the landing's figure 04, framed 1:1. One route each, so a frame loads
 * only its own demo.
 */
export const metadata: Metadata = {
  robots: { index: false },
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
