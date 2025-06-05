#!/usr/bin/env node

import { postInstall } from './dist/next/index.js';

void postInstall(process.argv[2], process.argv[3]);
