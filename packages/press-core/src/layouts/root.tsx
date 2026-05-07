import type { ReactNode } from 'react';
import { RootProvider } from 'fumadocs-ui/provider/waku';
import appCss from 'virtual:root.css?url';

export default function Root({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href={appCss} />
      </head>
      <body data-version="1.0" className="flex flex-col min-h-screen">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
