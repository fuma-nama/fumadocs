import * as path from 'node:path';
import type { SourceFile, StringLiteral } from 'ts-morph';
import type { ComponentBuilder } from '@/build/component-builder';
import { type Component, type OutputFile } from '@/build/build-registry';

export async function buildFile(
  outputPath: string,
  sourceFile: SourceFile,
  builder: ComponentBuilder,
  comp: Component,
  /**
   * Resolve referenced files
   */
  onReference: (
    reference:
      | {
          type: 'file';
          file: string;
        }
      | {
          type: 'dependency';
          name: string;
          version: string;
          isDev: boolean;
        }
      | {
          type: 'sub-component';
          component: Component;
          targetFile: string;
        },
  ) => string | undefined,
): Promise<OutputFile> {
  const out: OutputFile = {
    imports: {},
    content: '',
    path: outputPath,
  };

  /**
   * Process import paths
   */
  async function process(
    specifier: StringLiteral,
    getSpecifiedFile: () => SourceFile | undefined,
  ): Promise<void> {
    let specifiedFile = getSpecifiedFile();
    if (!specifiedFile) return;

    const name = specifiedFile.isInNodeModules()
      ? builder.resolveDep(specifier.getLiteralValue()).name
      : path.relative(builder.registryDir, specifiedFile.getFilePath());

    if (comp.mapImportPath && name in comp.mapImportPath) {
      const resolver = comp.mapImportPath[name];

      if (typeof resolver === 'string') {
        specifier.setLiteralValue(resolver);
        specifiedFile = getSpecifiedFile();

        if (!specifiedFile) return;
      } else {
        const comp = builder.getComponentByName(resolver.name);
        if (!comp)
          throw new Error(`Failed to resolve component ${resolver.name}`);

        const value = onReference({
          type: 'sub-component',
          component: comp,
          targetFile: resolver.file,
        });

        if (value) out.imports[specifier.getLiteralValue()] = value;
        return;
      }
    }

    if (specifiedFile.isInNodeModules() || specifiedFile.isDeclarationFile()) {
      const info = builder.resolveDep(specifier.getLiteralValue());

      const value = onReference({
        type: 'dependency',
        name: info.name,
        version: info.version ?? '',
        isDev: info.type === 'dev',
      });
      if (value) out.imports[specifier.getLiteralValue()] = value;
      return;
    }

    const sub = builder.getSubComponent(specifiedFile.getFilePath());
    if (sub) {
      const value = onReference({
        type: 'sub-component',
        component: sub,
        targetFile: specifiedFile.getFilePath(),
      });
      if (value) out.imports[specifier.getLiteralValue()] = value;
      return;
    }

    const value = onReference({
      type: 'file',
      file: specifiedFile.getFilePath(),
    });
    if (value) out.imports[specifier.getLiteralValue()] = value;
  }

  for (const item of sourceFile.getImportDeclarations()) {
    await process(item.getModuleSpecifier(), () =>
      item.getModuleSpecifierSourceFile(),
    );
  }

  for (const item of sourceFile.getExportDeclarations()) {
    const specifier = item.getModuleSpecifier();
    if (!specifier) continue;

    await process(specifier, () => item.getModuleSpecifierSourceFile());
  }

  out.content = sourceFile.getFullText();
  return out;
}
