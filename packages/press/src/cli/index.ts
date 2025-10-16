#!/usr/bin/env node
import { program } from 'commander';
import { viteBuild } from '../vite/build.js';
import { dev } from '../vite/dev.js';

program.command('build').action(async () => {
  await viteBuild();
});

program.command('dev').action(async () => {
  await dev();
});

program.command('typegen').action(async () => {
  // TODO: typegen content shapes
});

void program.parseAsync(process.argv);
