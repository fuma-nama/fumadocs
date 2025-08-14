import type { OutputComponent, Registry } from '@/build/build-registry';
import type { RegistryItem } from 'shadcn/registry';

function mapDeps(deps: Record<string, string | null>) {
  return Object.entries(deps).map(([k, v]) => {
    if (v) return `${k}@${v}`;

    return k;
  });
}

function escapeName(name: string) {
  return name.replaceAll('/', '-');
}

export function componentToShadcn(
  comp: OutputComponent,
  registry: Registry,
): RegistryItem {
  return {
    extends: 'none',
    type: 'registry:block',

    name: escapeName(comp.name),
    title: comp.title ?? comp.name,
    description: comp.description,
    dependencies: mapDeps(comp.dependencies),
    devDependencies: mapDeps(comp.devDependencies),
    registryDependencies: comp.subComponents.map((comp) => {
      if (comp.startsWith('https://') || comp.startsWith('http://'))
        return comp;

      return new URL(
        `/r/${escapeName(comp)}.json`,
        registry.homepage,
      ).toString();
    }),
    files: comp.files.map((file) => {
      return {
        type: (
          {
            components: 'registry:component',
            lib: 'registry:lib',
            css: 'registry:style',
            route: 'registry:page',
            ui: 'registry:ui',
            block: 'registry:block',
          } as const
        )[file.type],
        content: file.content,
        path: file.path,
        target: file.target!,
      };
    }),
  };
}
