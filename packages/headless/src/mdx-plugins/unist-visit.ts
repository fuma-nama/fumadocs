import { visit as original } from 'unist-util-visit';

interface SimpleVisit {
  <R, T>(node: R, callback: (v: T) => void): undefined | 'skip';
  <R, T>(
    node: R,
    check: string[],
    callback: (v: T) => void,
  ): undefined | 'skip';
}

/**
 * The default type binding is too complicated, it slows the whole Typescript language server
 */
export const visit: SimpleVisit = original as unknown as SimpleVisit;
