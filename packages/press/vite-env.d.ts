declare module 'process' {
  global {
    namespace NodeJS {
      interface ProcessEnv {
        /**
         * the project directory (where fumapress is started)
         */
        PROJECT_DIR?: string;

        /**
         * whether hot reload is enabled (e.g. local file watcher)
         */
        HOT_RELOAD?: '1';
      }
    }
  }
}
