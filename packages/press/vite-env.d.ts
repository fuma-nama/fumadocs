declare module 'process' {
  global {
    namespace NodeJS {
      interface ProcessEnv {
        PROJECT_DIR?: string;
      }
    }
  }
}
