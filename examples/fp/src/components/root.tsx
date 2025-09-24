import '../styles/globals.css';
import type { ReactNode } from 'react';

export default function Root({ children }: { children: ReactNode }) {
  return (
    <html>
      <head>
        <title>Waku</title>
      </head>
      <body>{children}</body>
    </html>
  );
}
