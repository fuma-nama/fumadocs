import type { Output, OutputComponent } from '@/registry/schema';

export function validateOutput(registry: Output) {
  const validatedComps = new Set<string>();
  const fileToComps = new Map<string, Set<string>>();

  function validateComponent(comp: OutputComponent) {
    if (validatedComps.has(comp.name)) return;
    validatedComps.add(comp.name);

    for (const file of comp.files) {
      const parents = fileToComps.get(file.path);

      if (parents) {
        parents.add(comp.name);
      } else {
        fileToComps.set(file.path, new Set([comp.name]));
      }
    }

    for (const name of comp.subComponents) {
      const subComp = registry.components.find((item) => item.name === name);
      if (!subComp) {
        console.warn(`skipped component ${name}: not found`);
        continue;
      }

      validateComponent(subComp);
    }

    for (const file of comp.files) {
      const parents = fileToComps.get(file.path);
      if (!parents || parents.size <= 1) continue;

      throw new Error(
        `Duplicated file in same component ${Array.from(parents).join(', ')}: ${file.path}`,
      );
    }
  }

  for (const comp of registry.components) {
    // per comp
    fileToComps.clear();
    validateComponent(comp);
  }
}
