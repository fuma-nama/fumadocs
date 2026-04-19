#!/usr/bin/env node
import { Command } from 'commander';
import { spawn } from 'node:child_process';
import packageJson from '../package.json';
import { startDevServer } from './dev/node-server';
import { setDevServerUrlInEnv } from './dev/shared';

const program = new Command()
  .name('local-md')
  .description('CLI for local Markdown development utilities')
  .version(packageJson.version)
  .enablePositionalOptions();

program
  .command('dev')
  .description('start the local-md dev server and run a command')
  .argument('<command...>', 'command to run')
  .option('-p, --port <number>', 'port for the dev server', parsePort, 8000)
  .allowUnknownOption()
  .passThroughOptions()
  .action(async (command: string[], options: { port: number }) => {
    const handle = await startDevServer({
      port: options.port,
    });

    setDevServerUrlInEnv(handle.url);
    const child = spawn(command[0], command.slice(1), {
      stdio: 'inherit',
      shell: true,
      env: process.env,
    });

    const forwardSignal = (signal: NodeJS.Signals) => {
      if (child.exitCode === null && child.signalCode === null) {
        child.kill(signal);
      }
    };

    process.on('SIGINT', forwardSignal);
    process.on('SIGTERM', forwardSignal);

    let exitCode = 1;
    try {
      exitCode = await new Promise<number>((resolve, reject) => {
        child.once('error', reject);
        child.once('exit', (code, signal) => {
          if (signal) {
            resolve(signalToExitCode(signal));
            return;
          }

          resolve(code ?? 0);
        });
      });
    } finally {
      process.off('SIGINT', forwardSignal);
      process.off('SIGTERM', forwardSignal);
      await handle.close().catch(() => undefined);
    }

    process.exit(exitCode);
  });

program.parseAsync(process.argv).catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});

function parsePort(value: string): number {
  const port = Number.parseInt(value, 10);
  if (!Number.isFinite(port) || port < 0) {
    throw new Error(`Invalid port: ${value}`);
  }

  return port;
}

function signalToExitCode(signal: NodeJS.Signals): number {
  switch (signal) {
    case 'SIGINT':
      return 130;
    case 'SIGTERM':
      return 143;
    default:
      return 1;
  }
}
