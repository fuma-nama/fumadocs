#!/usr/bin/env node
import packageJson from '../package.json';
import { runCli } from './cli';

runCli({ name: 'local-content', version: packageJson.version });
