#!/usr/bin/env node

import { postInstall } from './dist/next/index.mjs';

void postInstall(process.argv[2]);
