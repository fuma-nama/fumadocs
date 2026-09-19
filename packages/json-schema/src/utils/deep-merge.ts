import { deepmerge } from '@fastify/deepmerge';
import { isPlainObject } from './is-plain-object';

export const mergeDeep = deepmerge({
  all: true,
  isMergeableObject: isPlainObject,
});
