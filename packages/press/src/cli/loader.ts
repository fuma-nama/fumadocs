import * as dotenv from 'dotenv';

export function loadEnv() {
  dotenv.config({ path: ['.env.local', '.env'], quiet: true });
}

export function overrideNodeEnv(nodeEnv: 'development' | 'production') {
  // set NODE_ENV before runnerImport https://github.com/vitejs/vite/issues/20299
  if (process.env.NODE_ENV && process.env.NODE_ENV !== nodeEnv) {
    console.warn(
      `Warning: NODE_ENV is set to '${process.env.NODE_ENV}', but overriding it to '${nodeEnv}'.`,
    );
  }
  process.env.NODE_ENV = nodeEnv;
}
