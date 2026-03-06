declare module 'process' {
  global {
    namespace NodeJS {
      interface ProcessEnv {
        /**
         * the root directory (where fumapress is started)
         */
        ROOT_DIR?: string;

        /**
         * whether hot reload is enabled (e.g. local file watcher)
         */
        HOT_RELOAD?: '1';

        /**
         * [JSON encoded] a list of default project directories (where Markdown files are located)
         */
        DEFAULT_RPOJECT_DIR?: string;
      }
    }
  }
}
