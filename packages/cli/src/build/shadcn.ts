import type { Output, OutputComponent } from '@/registry/schema';
import type { Registry as ShadcnRegistry, RegistryItem } from 'shadcn/registry';

function mapDeps(deps: Record<string, string | null>) {
  return Object.entries(deps).map(([k, v]) => {
    if (v) return `${k}@${v}`;

    return k;
  });
}

function escapeName(name: string) {
  return name;
}

export function toShadcnRegistry(out: Output, baseUrl: string): ShadcnRegistry {
  return {
    homepage: baseUrl,
    name: out.name,
    items: out.components.map((comp) => componentToShadcn(comp, baseUrl)),
  };
}

function componentToShadcn(
  comp: OutputComponent,
  baseUrl: string,
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

      return new URL(`/r/${escapeName(comp)}.json`, baseUrl).toString();
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
