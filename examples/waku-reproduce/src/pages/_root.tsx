import type { ReactNode } from 'react';
import appCss from '../styles.css?url';

export default async function RootElement({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href={appCss} />
      </head>
      <body data-version="1.0" className="flex flex-col min-h-screen">
        {children}
      </body>
    </html>
  );
}

export async function getConfig() {
  return {
    render: 'static',
  } as const;
}
