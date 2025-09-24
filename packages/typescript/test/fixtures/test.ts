export interface Test1 {
  name: string;
  /**
   * @defaultValue 4
   */
  age?: number;
}

export type Test2 = Test1 & {
  generic: GenericType<string, string, string>;
};

export type { Player as Test3 } from './test-2';

interface GenericType<A, B, C> {
  A: A;
  B: B;
  C: C;
}

export type Test4<T> = {
  get prop(): Complicated<T>;
};

type Complicated<T> = T extends { [K in keyof T]: T[K] }
  ? {
      [K in keyof T as Lowercase<string & K>]: T[K];
    }
  : never;
