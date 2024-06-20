import type { GithubCache } from "./cache";
import { fnv1a } from "./utils";

export class GithubCacheStore {
  store = new Map<string, GithubCache>()

  set(data: GithubCache, hash = fnv1a(JSON.stringify(data))): ReturnType<typeof this.store.set> {
    return this.store.set(hash, data)
  }

  clear(): ReturnType<typeof this.store.clear> {
    this.store.clear()
  }

  get(hash: string): ReturnType<typeof this.store.get> {
    return this.store.get(hash)
  }
}

export const githubCacheStore = new GithubCacheStore()