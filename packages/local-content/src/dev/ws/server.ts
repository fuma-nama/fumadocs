import { spawn } from 'node:child_process';
import { parseArgs } from 'node:util';
import { startDevServer } from './watcher';
import { setDevServerUrlInEnv } from './protocol';

export { startDevServer } from './watcher';
export type { DevServerOptions, DevServerHandle } from './watcher';

export interface DevServerCliOptions {
  /** command name shown in `--help` */
  name: string;
  version: string;
  defaultPort?: number;
}

const DEFAULT_PORT = 8000;

/**
 * Run the dev server CLI, for an integration to expose under its own binary.
 *
 * Usage is `<name> dev [-p port] -- <command...>`: the server starts, publishes
 * its URL to the environment, then runs the command as a child process.
 */
export async function runDevServerCli({
  name,
  version,
  defaultPort = DEFAULT_PORT,
}: DevServerCliOptions): Promise<never> {
  const argv = process.argv.slice(2);
  const separator = argv.indexOf('--');
  const own = separator === -1 ? argv : argv.slice(0, separator);
  const command = separator === -1 ? [] : argv.slice(separator + 1);

  let values: { port?: string; help?: boolean; version?: boolean };
  let positionals: string[];

  try {
    ({ values, positionals } = parseArgs({
      args: own,
      options: {
        port: { type: 'string', short: 'p' },
        help: { type: 'boolean', short: 'h' },
        version: { type: 'boolean', short: 'V' },
      },
      allowPositionals: true,
    }));
  } catch (error) {
    console.error((error as Error).message);
    return exit(1);
  }

  if (values.version) {
    console.log(version);
    return exit(0);
  }

  if (values.help || positionals[0] !== 'dev' || command.length === 0) {
    console.log(usage(name, defaultPort));
    return exit(values.help ? 0 : 1);
  }

  const port = values.port === undefined ? defaultPort : Number(values.port);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    console.error(`invalid port: ${values.port}`);
    return exit(1);
  }

  const handle = await startDevServer({ port });
  setDevServerUrlInEnv(handle.url);

  const child = spawn(command[0], command.slice(1), {
    stdio: 'inherit',
    env: process.env,
  });

  const forwardSignal = (signal: NodeJS.Signals) => {
    if (child.exitCode === null && child.signalCode === null) child.kill(signal);
  };

  process.on('SIGINT', forwardSignal);
  process.on('SIGTERM', forwardSignal);

  let exitCode = 1;
  try {
    exitCode = await new Promise<number>((resolve, reject) => {
      child.once('error', reject);
      child.once('exit', (code, signal) => {
        resolve(signal ? signalToExitCode(signal) : (code ?? 0));
      });
    });
  } finally {
    process.off('SIGINT', forwardSignal);
    process.off('SIGTERM', forwardSignal);
    await handle.close().catch(() => undefined);
  }

  return exit(exitCode);
}

function usage(name: string, defaultPort: number): string {
  return [
    `Usage: ${name} dev [options] -- <command...>`,
    '',
    'Starts the content dev server, then runs <command> with its URL in the environment.',
    '',
    'Options:',
    `  -p, --port <number>  port for the dev server (default: ${defaultPort})`,
    '  -V, --version        print the version number',
    '  -h, --help           show this message',
    '',
    'Example:',
    `  ${name} dev -- next dev`,
  ].join('\n');
}

function exit(code: number): never {
  process.exit(code);
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
