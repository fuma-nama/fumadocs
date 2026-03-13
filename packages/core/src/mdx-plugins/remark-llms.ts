import { Transformer } from 'unified';
import { toMdxExport } from './mdast-utils';
import { Root } from 'mdast';
import { defaultStringifier } from './stringifier';
import { StringifyOptions } from './remark-structure';

export function remarkLlms(options: StringifyOptions): Transformer<Root, Root> {
  return () => {
    defaultStringifier({});
    toMdxExport();
  };
}
