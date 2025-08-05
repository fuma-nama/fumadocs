'use client';
import { ReactRouterProvider } from 'fumadocs-core/framework/react-router';
import type { ReactNode } from 'react';
import { RootProvider } from 'fumadocs-ui/provider/base';
import {
  isRouteErrorResponse,
  Links,
  Meta,
  ScrollRestoration,
  useRouteError,
} from 'react-router';

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap"
        />
        <Meta />
        <Links />
      </head>
      <body className="flex flex-col min-h-screen">
        <ReactRouterProvider>
          <RootProvider>{children}</RootProvider>
        </ReactRouterProvider>
        <ScrollRestoration />
      </body>
    </html>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  let message = 'Oops!';
  let details = 'An unexpected error occurred.';
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? '404' : 'Error';
    details =
      error.status === 404
        ? 'The requested page could not be found.'
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
