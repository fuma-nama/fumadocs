#!/usr/bin/env node

import { existsSync } from 'node:fs';

async function start() {
  const [configPath] = process.argv.slice(2);
  const isNext =
    existsSync('next.config.js') ||
    existsSync('next.config.mjs') ||
    existsSync('next.config.mts') ||
    existsSync('next.config.ts');

  if (isNext) {
    const { postInstall } = await import('./next');
    await postInstall({ configPath });
  } else {
    const { postInstall } = await import('./vite');
    await postInstall({ configPath });
  }
}

void start();
