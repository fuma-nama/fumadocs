import * as path from 'node:path';
import type { SourceFile, StringLiteral } from 'ts-morph';
import type { ComponentBuilder } from '@/build/component-builder';
import { type Component, type OutputFile } from '@/build/build-registry';

export interface ProcessedFiles {
  files: OutputFile[];
  dependencies: Map<string, string>;
  devDependencies: Map<string, string>;
  subComponents: Set<string>;
}

export async function buildFile(
  filePath: string,
  sourceFile: SourceFile,
  builder: ComponentBuilder,
  comp: Component,
  processedFiles: Set<string>,
): Promise<ProcessedFiles> {
  processedFiles.add(filePath);

  const out: OutputFile = {
    imports: {},
    content: '',
    path: filePath,
  };

  const processed: ProcessedFiles = {
    files: [out],
    dependencies: new Map(),
    devDependencies: new Map(),
    subComponents: new Set(),
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
        processed.subComponents.add(resolver.name);
        out.imports[specifier.getLiteralValue()] = resolver.file;
        return;
      }
    }

    if (specifiedFile.isInNodeModules() || specifiedFile.isDeclarationFile()) {
      const info = builder.resolveDep(specifier.getLiteralValue());

      if (info.type === 'dev') {
        processed.devDependencies.set(info.name, info.version ?? '');
      } else {
        processed.dependencies.set(info.name, info.version ?? '');
      }
      return;
    }

    const sub = builder.getSubComponent(specifiedFile.getFilePath());
    if (sub) {
      processed.subComponents.add(sub.component.name);

      out.imports[specifier.getLiteralValue()] = builder.resolveOutputPath(
        specifiedFile.getFilePath(),
      );
      return;
    }

    const referenceOutputPath = builder.resolveOutputPath(
      specifiedFile.getFilePath(),
    );

    if (!processedFiles.has(referenceOutputPath)) {
      const outFile = await buildFile(
        referenceOutputPath,
        specifiedFile,
        builder,
        comp,
        processedFiles,
      );

      merge(processed, outFile);
    }

    out.imports[specifier.getLiteralValue()] = referenceOutputPath;
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
  return processed;
}

export function merge(to: ProcessedFiles, from: ProcessedFiles): void {
  to.files.push(...from.files);

  for (const [k, v] of from.dependencies.entries()) {
    to.dependencies.set(k, v);
  }

  for (const [k, v] of from.devDependencies.entries()) {
    to.devDependencies.set(k, v);
  }

  from.subComponents.forEach((item) => to.subComponents.add(item));
}
