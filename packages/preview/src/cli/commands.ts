import net from 'node:net';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadEnv, overrideNodeEnv } from './loader';
import { baseDir } from '@/constants';

export async function runStart({
  host,
  dirs,
  port: defaultPort = '8080',
}: {
  dirs?: string[];
  host?: string;
  port?: string;
}) {
  loadEnv();
  overrideNodeEnv('production');
  const port = await getFreePort(parseInt(defaultPort, 10));
  const serveFileUrl = pathToFileURL(path.resolve(baseDir, 'dist', 'waku', 'serve-node.js')).href;
  if (host) {
    process.env.HOST = host;
  }
  process.env.PORT = String(port);
  process.env.ROOT_DIR = process.cwd();
  if (!dirs || dirs.length === 0) {
    dirs = [''];
  }
  process.env.DEFAULT_PROJECT_DIR = JSON.stringify(dirs.map((v) => path.resolve(v)));
  process.env.HOT_RELOAD = '1';
  process.chdir(baseDir);
  await import(serveFileUrl);

  console.log(`ready: Listening on http://${host || 'localhost'}:${port}/`);
}

async function getFreePort(startPort: number): Promise<number> {
  for (let port = startPort; ; port++) {
    try {
      await new Promise<void>((resolve, reject) => {
        const srv = net
          .createServer()
          .once('error', reject)
          .once('listening', () => srv.close(() => resolve()))
          .listen(port);
      });
      return port;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'EADDRINUSE') {
        throw err;
      }
    }
  }
}
