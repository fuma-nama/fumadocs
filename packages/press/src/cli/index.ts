#!/usr/bin/env node
import { program } from 'commander';
import path from 'node:path';
import { baseDir } from '../constants.js';

const configFile = path.join(baseDir, 'dist/vite.config.mjs');

program.command('build').action(async () => {
  const { createBuilder } = await import('vite');

  try {
    const builder = await createBuilder({
      configFile,
      root: process.cwd(),
    });
    await builder.buildApp();
    console.log('Build completed successfully');
  } catch (error) {
    console.error('Build failed:', error);
  }
});

program.command('dev').action(async () => {
  const { createServer } = await import('vite');
  const server = await createServer({
    configFile,
    root: process.cwd(),
  });

  await server.listen();
  server.printUrls();
});

void program.parseAsync(process.argv);
