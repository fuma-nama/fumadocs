import '@/styles/globals.css';
import type { ReactNode } from 'react';
import { Provider } from '@/components/provider';

export default function RootLayout({ children }: { children: ReactNode }) {
  return <Provider>{children}</Provider>;
}
