#!/usr/bin/env node
import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { version } from '../package.json' with { type: 'json' };
import type { Config } from './index';

const configFiles = ['ts', 'mts', 'js', 'mjs'].map((ext) => `fumadocs-openapi.config.${ext}`);

const help = `Usage: openapi-standalone <command> [...input] [options]

Commands:
  build                 Write the docs as static HTML files
  serve                 Start a web server

Options:
  -c, --config <file>   Config file (default: ${configFiles[0]})
  -o, --out <dir>       Output directory of build (default: out)
  --base-url <path>     URL path the docs are served under
  -p, --port <port>     Port of serve (default: 8080)
  --host <host>         Host of serve (default: localhost)
  -v, --version         Show version
  -h, --help            Show help`;

async function loadConfig(file?: string): Promise<Partial<Config>> {
  const resolved = file ? path.resolve(file) : configFiles.find((name) => existsSync(name));
  if (!resolved) return {};

  const mod = await import(pathToFileURL(path.resolve(resolved)).href);
  if (!mod.default) throw new Error(`${resolved} has no default export.`);
  return mod.default;
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      config: { type: 'string', short: 'c' },
      out: { type: 'string', short: 'o' },
      'base-url': { type: 'string' },
      port: { type: 'string', short: 'p' },
      host: { type: 'string' },
      version: { type: 'boolean', short: 'v' },
      help: { type: 'boolean', short: 'h' },
    },
  });
  if (values.version) return console.log(version);

  const [command, ...input] = positionals;
  if (values.help || (command !== 'build' && command !== 'serve')) return console.log(help);

  const config = await loadConfig(values.config);
  const options = {
    ...config,
    input: input.length > 0 ? input : config.input,
    baseUrl: values['base-url'] ?? config.baseUrl,
  };
  if (!options.input)
    throw new Error(`No input, pass OpenAPI documents or create ${configFiles[0]}.`);

  if (command === 'build') {
    const { generateStatic } = await import('./index');
    const outDir = values.out ?? config.outDir ?? 'out';

    await generateStatic({ ...options, input: options.input, outDir });
    console.log(`Generated docs in ${outDir}`);
    return;
  }

  const { serve } = await import('@hono/node-server');
  const { Hono } = await import('hono');
  const { compress } = await import('hono/compress');
  const { createApp } = await import('./hono');
  const app = new Hono()
    .use(compress())
    .route('/', createApp({ ...options, input: options.input, proxy: true }));
  const { port = '8080', host = 'localhost' } = values;

  serve({ fetch: app.fetch, port: Number(port), hostname: host }, (info) => {
    console.log(`Listening on http://${host}:${info.port}${options.baseUrl ?? ''}`);
  });
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
