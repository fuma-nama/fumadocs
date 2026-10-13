import type { TypeNode } from '@/type-tree/types';
import { type ReactNode, useMemo, type ComponentPropsWithoutRef, type FC } from 'react';
import { WithControl as DefaultWithControl } from '@/client/with-control';
import type { StoryFrameOptions, VariantInfo, WithControlProps } from '@/provider';
import { StoryFrame } from '@/client/frame';
import { deserialize } from '@/utils/serialization';
import { collapse } from '@/type-tree/collapse';
import { mergeArgs } from '@/utils/args';

export interface StoryOptions<C extends FC<any>> {
  displayName?: string;
  Component: C;

  /**
   * story arguments, you can pass an array of options for multiple presets.
   */
  args?: ArgsOptions<C> | (ArgsOptions<C> & VariantInfo)[];

  /**
   * Render the component in an iframe, for components filling the viewport like layouts.
   *
   * Arguments are sent to the frame with `postMessage()`, they must be serializable.
   */
  frame?: StoryFrameOptions;

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

  /** render the component for `frame`, with arguments from `<WithControl />`. */
  Frame: FC;

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

export interface StoryFactoryOptions {
  /**
   * Replace the UI of stories, e.g. the one installed with Fumadocs CLI.
   */
  WithControl?: FC<WithControlProps>;
}

export function defineStoryFactory({
  WithControl = DefaultWithControl,
}: StoryFactoryOptions = {}): StoryFactory {
  return {
    defineStory({ Component, displayName, args = {}, frame, _generated }) {
      let generatedControls: TypeNode | undefined;

      function getProps(): WithControlProps {
        const normalized = Array.isArray(args) ? args : [{ ...args, variant: 'default' }];

        return {
          Component,
          displayName,
          frame,
          presets: normalized.map((preset) => {
            const fixedValues = typeof preset.fixed === 'function' ? preset.fixed() : preset.fixed;
            const initial =
              typeof preset.initial === 'function' ? preset.initial() : preset.initial;
            let controls: TypeNode;

            if (preset.controls && 'node' in preset.controls) {
              controls = preset.controls.node;
            } else if (_generated) {
              // `collapse()` edits in place, presets with fixed values get their own copy
              controls = fixedValues
                ? collapse(deserialize(_generated.controls) as TypeNode, fixedValues)
                : (generatedControls ??= deserialize(_generated.controls) as TypeNode);
            } else {
              throw new Error(
                `[@fumadocs/story] No generated data for story, make sure the Vite plugin or Turbopack loader is configured correctly`,
              );
            }

            const defaultValues = fixedValues ? mergeArgs(initial, fixedValues) : initial;

            return {
              variant: preset.variant,
              description: preset.description,
              controls,
              defaultValues: defaultValues as Record<string, unknown>,
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
        Frame() {
          return <StoryFrame Component={Component} />;
        },
      };
    },
  };
}
