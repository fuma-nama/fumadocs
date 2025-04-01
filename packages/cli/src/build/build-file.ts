import * as path from 'node:path';
import type { SourceFile, StringLiteral } from 'ts-morph';
import type { ComponentBuilder } from '@/build/component-builder';
import type {
  Component,
  OutputComponent,
  OutputFile,
} from '@/build/build-registry';

export async function buildFile(
  inputPath: string,
  outputPath: string,
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
          resolved:
            | {
                type: 'local';
                component: Component;
                registryName?: string;
              }
            | {
                type: 'remote';
                component: OutputComponent;
                registryName: string;
              };

          targetFile: string;
          filePath?: string;
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
        const sub = builder.getComponentByName(
          resolver.name,
          resolver.registry,
        );
        if (!sub)
          throw new Error(`Failed to resolve sub component ${resolver.name}`);

        const value = onReference({
          type: 'sub-component',
          resolved: sub,
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
        resolved: {
          type: 'local',
          component: sub,
        },
        targetFile: path.relative(
          builder.registryDir,
          specifiedFile.getFilePath(),
        ),
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

  const sourceFile = await builder.createSourceFile(inputPath);

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
