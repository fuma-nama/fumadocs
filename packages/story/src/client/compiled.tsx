import type { TypeNode } from '@/type-tree/types';
import { type ReactNode, useMemo, type ComponentPropsWithoutRef, type FC } from 'react';
import { deepmerge } from '@fastify/deepmerge';
import { type VariantInfo, WithControl, WithControlProps } from '@/client/with-control';
import { deserialize } from '@/utils/serialization';

export interface StoryOptions<C extends FC<any>> {
  displayName?: string;
  Component: C;

  /**
   * story arguments, you can pass an array of options for multiple presets.
   */
  args?: ArgsOptions<C> | (ArgsOptions<C> & VariantInfo)[];

  /**
   * Controls & data generated at build time by `@fumadocs/story/vite` or `@fumadocs/story/next`.
   *
   * @internal
   */
  _generated?: {
    exportName: string;
    controls: string;
  };
}

export interface ArgsOptions<C extends FC<any> = FC<any>> {
  /**
   * the default values of arguments.
   */
  initial?: ComponentPropsWithoutRef<C> | (() => ComponentPropsWithoutRef<C>);
  /**
   * fixed values for arguments, will disable the relevant controls.
   */
  fixed?: Partial<ComponentPropsWithoutRef<C>> | (() => Partial<ComponentPropsWithoutRef<C>>);
  /**
   * customize the generated controls, by default generated from component props using TypeScript compiler.
   */
  controls?: {
    node: TypeNode;
  };
}

export interface Story<C extends FC<any> = FC<any>> {
  /** render as a component. */
  WithControl: FC;

  _private_: {
    component?: C;
  };
}

export type GetProps<Result> =
  Result extends Story<infer C>
    ? ReplaceReactNode<Omit<ComponentPropsWithoutRef<C>, 'key'>>
    : never;

type ReplaceReactNode<V> = ReactNode extends V
  ? ReplaceReactNode<Exclude<V, ReactNode>> | string
  : V extends Record<string, unknown>
    ? {
        [K in keyof V]: ReplaceReactNode<V[K]>;
      }
    : V;

export interface StoryFactory {
  defineStory: <C extends FC<any>>(options: StoryOptions<C>) => Story<C>;
}

export function defineStoryFactory(): StoryFactory {
  const propsDeepmerge = deepmerge({
    mergeArray: () => (_target, source) => source,
  });

  return {
    defineStory({ Component, displayName, args = {}, _generated }) {
      let generatedControls: TypeNode | undefined;

      function getProps(): WithControlProps {
        const normalized = Array.isArray(args) ? args : [{ ...args, variant: 'default' }];

        return {
          Component,
          displayName,
          presets: normalized.map((preset) => {
            const fixedValues = typeof preset.fixed === 'function' ? preset.fixed() : preset.fixed;
            const initial =
              typeof preset.initial === 'function' ? preset.initial() : preset.initial;
            let controls: TypeNode;

            if (preset.controls && 'node' in preset.controls) {
              controls = preset.controls.node;
            } else if (_generated) {
              generatedControls ??= deserialize(_generated.controls) as TypeNode;
              controls = generatedControls;
            } else {
              throw new Error(
                `[@fumadocs/story] No generated data for story, make sure the Vite plugin or Turbopack loader is configured correctly`,
              );
            }

            return {
              variant: preset.variant,
              description: preset.description,
              controls,
              defaultValues: (fixedValues
                ? propsDeepmerge(initial, fixedValues)
                : initial) as Record<string, unknown>,
            };
          }),
        };
      }

      return {
        _private_: {
          component: Component,
        },
        WithControl() {
          const props = useMemo(getProps, []);

          return <WithControl {...props} />;
        },
      };
    },
  };
}
