import type { BuildOptions, LogLevel } from 'vite';

export interface ViteBuildOptions {
  assetsInlineLimit?: number;
  clearScreen?: boolean;
  config?: string;
  emptyOutDir?: boolean;
  force?: boolean;
  logLevel?: LogLevel;
  minify?: BuildOptions['minify'];
  mode?: string;
  profile?: boolean;
  sourcemapClient?: boolean | 'inline' | 'hidden';
  sourcemapServer?: boolean | 'inline' | 'hidden';
}

export async function viteBuild({
  assetsInlineLimit,
  clearScreen,
  config: configFile,
  emptyOutDir,
  force,
  logLevel,
  minify,
  mode,
  sourcemapClient,
  sourcemapServer,
}: ViteBuildOptions = {}) {
  const { createBuilder } = await import('vite');

  try {
    const builder = await createBuilder({
      mode,
      configFile,
      build: {
        assetsInlineLimit,
        emptyOutDir,
        minify,
      },
      optimizeDeps: { force },
      clearScreen,
      logLevel,
      plugins: [
        {
          name: 'fumapress:cli-config',
          configEnvironment(name) {
            if (sourcemapClient && name === 'client') {
              return {
                build: {
                  sourcemap: sourcemapClient,
                },
              };
            }

            if (sourcemapServer && name !== 'client') {
              return {
                build: {
                  sourcemap: sourcemapServer,
                },
              };
            }
          },
        },
      ],
    });
    await builder.buildApp();
    console.log('Build completed successfully');
  } catch (error) {
    console.error('Build failed:', error);
  }
}
