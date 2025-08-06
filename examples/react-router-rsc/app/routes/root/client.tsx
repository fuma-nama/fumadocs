"use client";

import {
  isRouteErrorResponse,
  Link,
  NavLink,
  useNavigation,
  useRouteError,
} from "react-router";
import { FumadocsProvider } from "../../fumadocs-provider";

export function Layout({ children }: { children: React.ReactNode }) {
  const navigation = useNavigation();
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
      </head>
      <body className="font-sans antialiased">
        <FumadocsProvider>
        <header className="sticky inset-x-0 top-0 z-50 bg-background border-b">
          <div className="mx-auto max-w-screen-xl px-4 relative flex h-16 items-center justify-between gap-4 sm:gap-8">
            <div className="flex items-center gap-4">
              <Link to="/">Fuma Test 🚀</Link>
              <nav>
                <ul className="gap-4 flex">
                  <li>
                    <NavLink
                      to="/"
                      className="text-sm font-medium hover:opacity-75 aria-[current]:opacity-75"
                    >
                      Home
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/about"
                      className="text-sm font-medium hover:opacity-75 aria-[current]:opacity-75"
                    >
                      About
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/docs"
                      className="text-sm font-medium hover:opacity-75 aria-[current]:opacity-75"
                    >
                      Docs
                    </NavLink>
                  </li>
                </ul>
              </nav>
              <div>{navigation.state !== "idle" && <p>Loading...</p>}</div>
            </div>
          </div>
        </header>
        {children}
        </FumadocsProvider>
      </body>
    </html>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  let status = 500;
  let message = "An unexpected error occurred.";

  if (isRouteErrorResponse(error)) {
    status = error.status;
    message = status === 404 ? "Page not found." : error.statusText || message;
  }

  return (
    <main className="mx-auto max-w-screen-xl px-4 py-8 lg:py-12">
      <article className="prose mx-auto">
        <h1>{status}</h1>
        <p>{message}</p>
      </article>
    </main>
  );
}
