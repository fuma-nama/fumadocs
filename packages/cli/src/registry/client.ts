import {
  type CompiledRegistryInfo,
  componentSchema,
  registryInfoSchema,
} from '@/registry/schema';
import path from 'node:path';
import fs from 'node:fs/promises';
import type { LoadedConfig } from '@/config';
import { log } from '@clack/prompts';

/**
 * Resolve file, throw error if not found
 */
export type Resolver = (file: string) => Promise<unknown>;

export function remoteResolver(url: string): Resolver {
  return async (file) => {
    const res = await fetch(`${url}/${file}`);
    if (!res.ok) {
      throw new Error(`failed to fetch ${url}/${file}: ${res.statusText}`);
    }

    return await res.json();
  };
}

export function localResolver(dir: string): Resolver {
  return async (file) => {
    const filePath = path.join(dir, file);

    return await fs
      .readFile(filePath)
      .then((res) => JSON.parse(res.toString()))
      .catch((e) => {
        throw new Error(`failed to resolve local file "${filePath}"`, {
          cause: e,
        });
      });
  };
}

export class RegistryClient {
  readonly config: LoadedConfig;
  private readonly resolver: Resolver;
  private registryInfo: CompiledRegistryInfo | undefined;

  constructor(config: LoadedConfig, resolver: Resolver) {
    this.config = config;
    this.resolver = resolver;
  }

  async fetchRegistryInfo() {
    this.registryInfo ??= registryInfoSchema.parse(
      await this.resolver('_registry.json').catch((e) => {
        log.error(String(e));
        process.exit(1);
      }),
    );

    return this.registryInfo;
  }

  async fetchComponent(name: string) {
    return componentSchema.parse(
      await this.resolver(`${name}.json`).catch((e) => {
        log.error(`component ${name} not found:`);
        log.error(String(e));
        process.exit(1);
      }),
    );
  }
}
