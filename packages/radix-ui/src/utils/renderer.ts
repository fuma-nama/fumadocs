import { createElement, type ElementType, type FC, type ReactNode } from 'react';

export type Renderer<Props> = FC<Props> | Partial<Props> | ChildrenRenderer | boolean;

export type RenderFn<Props> = (props: (override?: Partial<Props>) => Props) => ReactNode;

export function renderer<Props extends object>(
  T: Renderer<Props>,
  Default: FC<Props> | ElementType<Props>,
): RenderFn<Props> | undefined {
  if (T === false) return;
  if (T === true)
    return function Wrapper(props) {
      return createElement(Default, props());
    };
  if (T instanceof ChildrenRenderer)
    return function Wrapper() {
      return T.children;
    };
  if (typeof T === 'object')
    return function Wrapper(props) {
      return createElement(Default, props(T));
    };
  return function Wrapper(props) {
    return createElement(T, props());
  };
}

export class ChildrenRenderer {
  constructor(readonly children: ReactNode) {}
}
