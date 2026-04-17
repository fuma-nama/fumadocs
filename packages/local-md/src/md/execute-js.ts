interface Options {
  scope?: Record<string, unknown>;
  baseUrl?: string | URL;
  jsxRuntime: object;
}

const AsyncFunction: new (...args: string[]) => (...args: unknown[]) => Promise<unknown> =
  Object.getPrototypeOf(executeMdx).constructor;

/**
 * Note: unsafe by design
 */
export async function executeMdx(compiled: string, options: Options) {
  const { opts: scopeOpts, ...scope } = options.scope ?? {};
  const fullScope = {
    opts: {
      ...(scopeOpts as object),
      ...options.jsxRuntime,
      baseUrl: options.baseUrl,
    },
    ...scope,
  };

  const hydrateFn = new AsyncFunction(...Object.keys(fullScope), compiled);
  return await hydrateFn.apply(hydrateFn, Object.values(fullScope));
}
