import {
  type DownloadedRegistryInfo,
  type Component,
  componentSchema,
  registryInfoSchema,
} from '@/registry/schema';
import path from 'node:path';
import fs from 'node:fs/promises';
import type { LoadedConfig } from '@/config';
import { createCache } from '@/utils/cache';

export interface RegistryClient {
  readonly registryId: string;
  readonly config: LoadedConfig;
  fetchRegistryInfo: () => Promise<DownloadedRegistryInfo>;
  fetchComponent: (name: string) => Promise<Component>;
  hasComponent: (name: string) => Promise<boolean>;
  createLinkedRegistryClient: (registryName: string) => RegistryClient;
}

const fetchCache = createCache<unknown>();

export class HttpRegistryClient implements RegistryClient {
  readonly registryId: string;

  constructor(
    readonly baseUrl: string,
    readonly config: LoadedConfig,
  ) {
    this.registryId = baseUrl;
  }

  async fetchRegistryInfo(baseUrl = this.baseUrl) {
    const url = new URL('_registry.json', `${baseUrl}/`);

    return fetchCache.$value<DownloadedRegistryInfo>().cached(url.href, async () => {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`failed to fetch ${url.href}: ${res.statusText}`);
      }

      return registryInfoSchema.parse(await res.json());
    });
  }

  async fetchComponent(name: string) {
    const url = new URL(`${name}.json`, `${this.baseUrl}/`);

    return fetchCache.$value<Component>().cached(url.href, async () => {
      const res = await fetch(`${this.baseUrl}/${name}.json`);
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error(`component ${name} not found at ${url.href}`);
        }
        throw new Error(await res.text());
      }

      return componentSchema.parse(await res.json());
    });
  }

  async hasComponent(name: string) {
    const url = new URL(`${name}.json`, `${this.baseUrl}/`);
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok;
  }

  createLinkedRegistryClient(name: string) {
    return new HttpRegistryClient(`${this.baseUrl}/${name}`, this.config);
  }
}

export class LocalRegistryClient implements RegistryClient {
  readonly registryId: string;
  private registryInfo: DownloadedRegistryInfo | undefined;

  constructor(
    private readonly dir: string,
    readonly config: LoadedConfig,
  ) {
    this.registryId = dir;
  }

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
        throw new Error(`component ${name} not found at ${filePath}`, { cause: e });
      });

    return componentSchema.parse(out);
  }

  async hasComponent(name: string) {
    const filePath = path.join(this.dir, `${name}.json`);
    try {
      await fs.stat(filePath);
      return true;
    } catch {
      return false;
    }
  }

  createLinkedRegistryClient(name: string) {
    return new LocalRegistryClient(path.join(this.dir, name), this.config);
  }
}
