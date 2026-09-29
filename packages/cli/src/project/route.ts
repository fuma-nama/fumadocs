import type { I18nInfo, ReactFramework } from '@/project';

export type RouteSegment =
  /** static path, can contain multiple segments like `/llms.mdx/docs` */
  | string
  | {
      param: string;
      catchAll?: boolean;
      /** the catch-all also matches zero segments */
      optional?: boolean;
      /** static file name after the catch-all like `content.md`, part of the parameter when the framework can't express it */
      suffix?: string;
    };

export interface RouteDescriptor {
  segments: RouteSegment[];
  /** under the locale parameter when the project has i18n */
  locale?: boolean;
}

export interface FormattedRoute {
  /** route file, relative to the base dir */
  file: string;
  /** route string of the framework, e.g. for `RouteContext<'...'>`, `createFileRoute('...')`, `route('...')` or `ApiContext<'...'>` */
  path: string;
  /** path-to-regexp pattern, for the Next.js proxy matcher and rewrites */
  pattern: string;
}

interface Convention {
  locale: (optional: boolean) => string;
  param: (name: string, catchAll: boolean, optional: boolean, suffix?: string) => string;
  file: (segments: string[], ext: string) => string;
  path: (segments: string[]) => string;
}

const conventions: Record<ReactFramework, Convention> = {
  next: {
    locale: () => '[lang]',
    param: (name, catchAll, optional) =>
      catchAll ? (optional ? `[[...${name}]]` : `[...${name}]`) : `[${name}]`,
    file: (segments, ext) => `app/${segments.join('/')}/route.${ext}`,
    path: (segments) => `/${segments.join('/')}`,
  },
  'react-router': {
    locale: (optional) => (optional ? ':lang?' : ':lang'),
    param: (name, catchAll) => (catchAll ? '*' : `:${name}`),
    // `routes.ts` maps paths to files, name files after the static segments like flat routes
    file: (segments, ext) =>
      `routes/${segments.filter((segment) => !/^[:*]/.test(segment)).join('.')}.${ext}`,
    path: (segments) => segments.join('/'),
  },
  'tanstack-start': {
    locale: (optional) => (optional ? '{-$lang}' : '$lang'),
    param: (name, catchAll) => (catchAll ? '$' : `$${name}`),
    file: (segments, ext) => `routes/${segments.join('/').replaceAll('.', '[.]')}.${ext}`,
    path: (segments) => `/${segments.join('/')}`,
  },
  waku: {
    locale: () => '[lang]',
    param: (name, catchAll, _optional, suffix) =>
      catchAll ? `[...${name}]${suffix ? `/${suffix}` : ''}` : `[${name}]`,
    file: (segments, ext) => `pages/_api/${segments.join('/')}.${ext}`,
    path: (segments) => `/${segments.join('/')}`,
  },
};

/** the locale segment of route files, with a trailing slash */
export function localeSegment(framework: ReactFramework, i18n: I18nInfo | null) {
  return i18n ? `${conventions[framework].locale(i18n.optionalLocale)}/` : '';
}

export function formatRoute(
  route: RouteDescriptor,
  framework: ReactFramework,
  i18n: I18nInfo | null,
  ext = 'ts',
): FormattedRoute {
  const convention = conventions[framework];
  const segments: string[] = [];
  const patterns: string[] = [];
  if (route.locale && i18n) {
    segments.push(convention.locale(i18n.optionalLocale));
    patterns.push(':lang');
  }

  for (const segment of route.segments) {
    if (typeof segment === 'string') {
      for (const part of segment.split('/')) {
        if (part.length === 0) continue;
        segments.push(part);
        patterns.push(part);
      }
    } else {
      const { param, catchAll = false, optional = false, suffix } = segment;
      segments.push(convention.param(param, catchAll, optional, suffix));
      patterns.push(catchAll ? `:${param}*` : `:${param}`);
    }
  }

  return {
    file: convention.file(segments, ext),
    path: convention.path(segments),
    pattern: `/${patterns.join('/')}`,
  };
}

export interface RouteModule {
  /** import statements of the handler */
  imports: string;
  /** expression returning a `Response` */
  body: string;
  /** the handler reads `request` */
  request?: boolean;
  /** @defaultValue `['GET']` */
  methods?: string[];
  /** Next.js: never revalidate the route */
  revalidate?: boolean;
  /** Waku: prerender the route */
  static?: boolean;
}

/** the route module of a handler that only reads the request, per framework */
export function routeModule(
  framework: ReactFramework,
  route: FormattedRoute,
  mod: RouteModule,
): string {
  const { imports, body, request, methods = ['GET'], revalidate, static: isStatic } = mod;
  const arg = request ? 'request: Request' : '';
  const head = `${imports.trim()}\n\n`;

  if (framework === 'react-router') {
    const out: string[] = [];
    // GET is the loader, every other method is the action
    out.push(handler('loader', 'Route.LoaderArgs'));
    if (methods.length > 1) out.push(handler('action', 'Route.ActionArgs'));

    return `${request ? `${reactRouterTypes(route)}\n` : ''}${head}${out.join('\n')}`;
  }

  if (framework === 'tanstack-start') {
    const out: string[] = [];
    for (const method of methods)
      out.push(`      ${method}: async (${request ? '{ request }' : ''}) => ${body},`);

    return `import { createFileRoute } from '@tanstack/react-router';
${head}export const Route = createFileRoute('${route.path}')({
  server: {
    handlers: {
${out.join('\n')}
    },
  },
});
`;
  }

  const out: string[] = [];
  if (framework === 'next' && revalidate) out.push('export const revalidate = false;\n');
  for (const method of methods)
    out.push(`export async function ${method}(${arg}) {
  return ${body};
}
`);
  if (framework === 'waku' && isStatic)
    out.push(`export async function getConfig() {
  return {
    render: 'static' as const,
  } as const;
}
`);

  return `${head}${out.join('\n')}`;

  function handler(name: string, type: string) {
    return `export async function ${name}(${request ? `{ request }: ${type}` : ''}) {
  return ${body};
}
`;
  }
}

/** import of the generated types of a React Router route module */
export const reactRouterTypes = (route: FormattedRoute) =>
  `import type { Route } from './+types/${route.file
    .split('/')
    .pop()!
    .replace(/\.tsx?$/, '')}';`;
