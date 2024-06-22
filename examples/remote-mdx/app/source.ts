"use server";

import {
  createRemoteCache,
  createLocalCache,
  type CreateCacheLocalOptions,
} from '@fumadocs/mdx-remote/github';
import { loader } from '@fumadocs/mdx-remote/github/source';

const config: CreateCacheLocalOptions = {
  directory: 'content/docs',
  baseUrl: '/docs',
};

const cache =
  process.env.NODE_ENV === 'production'
    ? createRemoteCache({
        ...config,
        // github information
        owner: '<github-username-here>',
        repo: '<github-repo-here>',
        branch: '<github-branch-here>',
      })
    : createLocalCache(config);

export const { getPageTree, getPages, getPage } = await loader(cache, {
  baseUrl: '/docs',
});
