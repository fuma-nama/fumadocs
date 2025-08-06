This is just for testing purposes, we have a few weird restrictions probably due to existing issues of `@vitejs/plugin-rsc`.

1. Using a mix of client & server components in imported packages (e.g. Fumadocs UI) is buggy. 
2. Due to (1), must use `providerImportSource` instead of passing default MDX components from Fumadocs UI.
3. Due to (1), all Fumadocs UI submodules have to be re-exported again by a client boundary.

Note: this doesn't support production build yet.