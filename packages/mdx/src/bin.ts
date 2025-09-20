#!/usr/bin/env node

import { existsSync } from 'node:fs';

async function start() {
  const args = process.argv.slice(2);
  const isNext =
    existsSync('next.config.js') ||
    existsSync('next.config.mjs') ||
    existsSync('next.config.ts');

  if (isNext) {
    const { postInstall } = await import('./next');
    await postInstall(...args);
  } else {
    const { postInstall } = await import('./vite/postinstall');
    await postInstall(...args);
  }
}

void start();
