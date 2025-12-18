import {
  type DownloadedRegistryInfo,
  type Component,
  componentSchema,
  registryInfoSchema,
} from '@/registry/schema';
import path from 'node:path';
import fs from 'node:fs/promises';
import type { LoadedConfig } from '@/config';
import { log } from '@clack/prompts';
import { AsyncCache } from '@/utils/cache';

export interface RegistryClient {
  readonly config: LoadedConfig;
  fetchRegistryInfo: () => Promise<DownloadedRegistryInfo>;
  fetchComponent: (name: string) => Promise<Component>;
  createLinkedRegistryClient: (registryName: string) => RegistryClient;
}

const fetchCache = new AsyncCache<unknown>();

export class HttpRegistryClient implements RegistryClient {
  constructor(
    readonly baseUrl: string,
    readonly config: LoadedConfig,
  ) {}

  async fetchRegistryInfo(baseUrl = this.baseUrl) {
    const url = new URL('_registry.json', `${baseUrl}/`);

    return fetchCache.cached<DownloadedRegistryInfo>(url.href, async () => {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`failed to fetch ${url.href}: ${res.statusText}`);
      }

      return registryInfoSchema.parse(await res.json());
    });
  }

  async fetchComponent(name: string) {
    const url = new URL(`${name}.json`, `${this.baseUrl}/`);

    return fetchCache.cached<Component>(url.href, async () => {
      const res = await fetch(`${this.baseUrl}/${name}.json`);
      if (!res.ok) {
        log.error(`component ${name} not found:`);
        log.error(await res.text());
        process.exit(1);
      }

      return componentSchema.parse(await res.json());
    });
  }

  createLinkedRegistryClient(name: string) {
    return new HttpRegistryClient(`${this.baseUrl}/${name}`, this.config);
  }
}

export class LocalRegistryClient implements RegistryClient {
  private registryInfo: DownloadedRegistryInfo | undefined;

  constructor(
    private readonly dir: string,
    readonly config: LoadedConfig,
  ) {}

  async fetchRegistryInfo(dir = this.dir) {
    if (this.registryInfo) return this.registryInfo;

    const filePath = path.join(dir, '_registry.json');
    const out = await fs
      .readFile(filePath)
      .then((res) => JSON.parse(res.toString()))
      .catch((e) => {
        throw new Error(`failed to resolve local file "${filePath}"`, {
          cause: e,
        });
      });

    return (this.registryInfo = registryInfoSchema.parse(out));
  }

  async fetchComponent(name: string) {
    const filePath = path.join(this.dir, `${name}.json`);
    const out = await fs
      .readFile(filePath)
      .then((res) => JSON.parse(res.toString()))
      .catch((e) => {
        log.error(`component ${name} not found:`);
        log.error(String(e));
        process.exit(1);
      });

    return componentSchema.parse(out);
  }

  createLinkedRegistryClient(name: string) {
    return new LocalRegistryClient(path.join(this.dir, name), this.config);
  }
}
