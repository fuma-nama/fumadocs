#!/usr/bin/env node
import { runDevServerCli } from '@fumadocs/local-content/dev/ws/server';
import packageJson from '../package.json';

void runDevServerCli({ name: 'fumadocs-obsidian', version: packageJson.version });
