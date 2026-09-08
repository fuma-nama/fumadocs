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
