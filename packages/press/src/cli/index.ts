#!/usr/bin/env node
import { program } from 'commander';
import { viteBuild } from '../vite/build';

program.command('build').action(async () => {
  await viteBuild();
});

void program.parseAsync(process.argv);
