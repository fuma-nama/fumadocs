import type { ReactNode } from 'react';
import { Provider } from '@/components/provider';
import '@/styles/globals.css';

export default async function RootElement({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head></head>
      <body data-version="1.0">
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}

export const getConfig = async () => {
  return {
    render: 'static',
  } as const;
};
