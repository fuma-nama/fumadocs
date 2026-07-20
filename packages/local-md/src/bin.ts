#!/usr/bin/env node
import { runCli } from '@fumadocs/local-content/cli';
import packageJson from '../package.json';

// the dev server lives in `@fumadocs/local-content`; this keeps the historical
// `local-md` binary working unchanged
runCli({ name: 'local-md', version: packageJson.version });
