import { TemplatePluginContext } from '@/index';
import { createSourceFile } from '@/transform/shared';
import path from 'node:path';
import {
  addReactRouterRoute,
  filterReactRouterPrerenderArray,
  filterReactRouterRoute,
} from '@/transform/react-router';
import fs from 'node:fs/promises';
import { addTanstackPrerender } from '@/transform/tanstack-start';
import { StructureKind, SyntaxKind } from 'ts-morph';

interface RootLayoutMod {
  addSearchDialog: (specifier: string) => void;
}

export async function rootProvider(
  { appDir, template }: TemplatePluginContext,
  fn: (mod: RootLayoutMod) => void,
) {
  const file = await createSourceFile(
    path.join(appDir, template.rootProviderPath),
  );
  fn({
    addSearchDialog(specifier) {
      const elements = file.getDescendantsOfKind(SyntaxKind.JsxElement);

      for (const element of elements) {
        const provider = element.getFirstChildByKind(
          SyntaxKind.JsxOpeningElement,
        );
        if (provider?.getTagNameNode().getText() !== 'RootProvider') continue;

        // Skip if search prop already exists
        if (
          provider
            .getAttributes()
            .some(
              (attr) =>
                attr.isKind(SyntaxKind.JsxAttribute) &&
                attr.getNameNode().getText() === 'search',
            )
        )
          continue;

        provider.addAttribute({
          kind: StructureKind.JsxAttribute,
          name: 'search',
          initializer: '{{ SearchDialog }}',
        });
        file.addImportDeclaration({
          moduleSpecifier: specifier,
          defaultImport: 'SearchDialog',
        });
        break;
      }
    },
  });
  await file.save();
}

interface ReactRouterRoutesMod {
  /**
   * @param path API route's path
   * @param entry route's file path
   * @param code create the file if specified
   */
  addRoute: (path: string, entry: string, code?: string) => void;

  /**
   * @param path API route's path
   */
  removeRoute: (path: string) => void;
}

export async function reactRouterRoutes(
  { dest, appDir }: TemplatePluginContext,
  fn: (mod: ReactRouterRoutesMod) => void,
) {
  const configFile = await createSourceFile(
    path.join(dest, 'react-router.config.ts'),
  );
  const routesFile = await createSourceFile(path.join(appDir, 'routes.ts'));
  const tasks: Promise<unknown>[] = [];

  function normalizePath(v: string) {
    return v.split('/').filter(Boolean).join('/');
  }

  fn({
    addRoute: (p, entry, code) => {
      addReactRouterRoute(routesFile, [{ path: p, entry }]);

      if (code) {
        tasks.push(fs.writeFile(path.join(appDir, entry), code));
      }
    },
    removeRoute: (p) => {
      const normalizedPath = normalizePath(p);

      filterReactRouterRoute(routesFile, (item) => {
        if (normalizePath(item.path) !== normalizedPath) return true;

        tasks.push(fs.unlink(path.join(appDir, item.entry)).catch(() => null));
        return false;
      });

      filterReactRouterPrerenderArray(
        configFile,
        'excluded',
        (item) => normalizePath(item) !== normalizedPath,
      );

      filterReactRouterPrerenderArray(
        configFile,
        'paths',
        (item) => normalizePath(item) !== normalizedPath,
      );
    },
  });

  await Promise.all([...tasks, routesFile.save(), configFile.save()]);
}

export interface TanstackStartRoutesMod {
  addRoute: (options: {
    /**
     * file path relative to `routes`
     */
    path: string;

    /**
     * Generated route path of `path`
     */
    route: string;

    /**
     * if specified, create the file
     */
    code?: string;

    /**
     * if true, add to prerender list
     */
    prerender?: boolean;
  }) => void;

  removeRoute: (options: {
    /**
     * file path relative to routes directory
     */
    path: string;

    route: string;
  }) => void;
}

export async function tanstackStartRoutes(
  { appDir, dest }: TemplatePluginContext,
  fn: (mod: TanstackStartRoutesMod) => void,
) {
  const configFile = await createSourceFile(path.join(dest, 'vite.config.ts'));
  const tasks: Promise<unknown>[] = [];

  fn({
    addRoute(options) {
      if (options.code) {
        tasks.push(
          fs.writeFile(path.join(appDir, 'routes', options.path), options.code),
        );
      }

      if (options.prerender) {
        addTanstackPrerender(configFile, [options.route]);
      }
    },
    removeRoute(options) {
      tasks.push(
        fs.unlink(path.join(appDir, 'routes', options.path)).catch(() => null),
      );
    },
  });

  await Promise.all([...tasks, configFile.save()]);
}
