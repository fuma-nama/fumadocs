import type * as Vite from 'vite';

export interface ViteDevOptions {
  clearScreen?: boolean;
  config?: string;
  cors?: boolean;
  force?: boolean;
  host?: boolean | string;
  logLevel?: Vite.LogLevel;
  mode?: string;
  open?: boolean | string;
  port?: number;
  strictPort?: boolean;
  profile?: boolean;
}

export async function dev({
  clearScreen,
  config: configFile,
  cors,
  force,
  host,
  logLevel,
  mode,
  open,
  port,
  strictPort,
}: ViteDevOptions = {}) {
  const { createServer } = await import('vite');
  const server = await createServer({
    mode,
    configFile,
    server: { open, cors, host, port, strictPort },
    optimizeDeps: { force },
    clearScreen,
    logLevel,
  });

  await server.listen();
  server.printUrls();
}
