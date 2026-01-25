import * as fs from "node:fs/promises";
import { collapse, createTypeTreeBuilder, literalEnumHandler } from "./type-tree/builder";
import { cached, type Cache } from "./cache";
import type { TypeNode } from "./type-tree/types";
import type { ComponentPropsWithoutRef, FC, ReactNode } from "react";
import { fileURLToPath } from "node:url";
import { getHash } from "./utils/get-hash";
import { deepmerge } from "@fastify/deepmerge";
import type { ClientPayload } from "./client";
import { serialize } from "./utils/serialization";
import type { Project } from "ts-morph";

type Awaitable<T> = T | Promise<T>;

export interface StoryOptions<C extends FC<any>> {
  /**
   * the export name of story, necessary for TypeScript Compiler.
   *
   * @defaultValue `story`
   */
  name?: string;
  displayName?: string;
  Component?: C;

  /**
   * story arguments, you can pass an array of options for multiple presets.
   */
  args?: ArgsOptions<C> | (ArgsOptions<C> & VariantInfo)[];
}

export interface ArgsOptions<C extends FC<any> = FC<any>> {
  /**
   * the default values of arguments.
   */
  initial?: ComponentPropsWithoutRef<C> | (() => Awaitable<ComponentPropsWithoutRef<C>>);
  /**
   * fixed values for arguments, will disable the relevant controls.
   */
  fixed?:
    | Partial<ComponentPropsWithoutRef<C>>
    | (() => Awaitable<Partial<ComponentPropsWithoutRef<C>>>);
  /**
   * customise the generated controls, by default generated from component props using TypeScript compiler.
   */
  controls?:
    | {
        node: TypeNode;
      }
    | {
        /** modify generated node */
        transform?: (node: TypeNode) => TypeNode;
      };
}

export { type Cache } from "./cache";
export { createFileSystemCache } from "./cache/fs";

export interface Story<C extends FC<any> = FC<any>> {
  /** render as a server component (require RSC). */
  WithControl: FC<undefined>;
  /** create a serialized client payload, you can pass it to `<StoryPayloadProvider />`. (for React.js frameworks with SSR support). */
  getClientPayload: () => Promise<string>;

  _private_: {
    component?: C;
  };
}

export type GetProps<Result> =
  Result extends Story<infer C>
    ? ReplaceReactNode<Omit<ComponentPropsWithoutRef<C>, "key">>
    : never;

type ReplaceReactNode<V> = ReactNode extends V
  ? ReplaceReactNode<Exclude<V, ReactNode>> | string
  : V extends Record<string, unknown>
    ? {
        [K in keyof V]: ReplaceReactNode<V[K]>;
      }
    : V;

export interface StoryFactoryOptions {
  cache?: Cache | false;

  tsc?: {
    /** default to `tsconfig.json` under cwd */
    tsconfigPath?: string;
  };
}

export interface StoryFactory {
  defineStory: <C extends FC<any>>(callerUrl: string, options: StoryOptions<C>) => Story<C>;
  getStoryPayloads: <Stories extends Record<string, Story>>(
    stories: Stories,
  ) => Promise<Record<keyof Stories, string>>;
}

export interface VariantInfo {
  variant: string;
  description?: string;
}

export function defineStoryFactory(factoryOptions: StoryFactoryOptions = {}): StoryFactory {
  let _project: Promise<Project> | undefined;
  const { cache = false } = factoryOptions;
  const propsDeepmerge = deepmerge({
    mergeArray: () => (_target, source) => source,
  });

  function initProject() {
    return (_project ??= import("ts-morph").then((mod) => {
      const { tsconfigPath = "./tsconfig.json" } = factoryOptions.tsc ?? {};

      return new mod.Project({
        tsConfigFilePath: tsconfigPath,
        skipAddingFilesFromTsConfig: true,
      });
    }));
  }

  async function generateControlsCached(filePath: string, name: string): Promise<TypeNode> {
    const fileContent = await fs.readFile(filePath, "utf-8");
    return cached(cache, getHash(`controls:${filePath}:${name}:${fileContent}`), async () => {
      const project = await initProject();
      const injection = `export type _StoryProps_ = import('@fumadocs/story').GetProps<typeof ${name}>`;
      const sourceFile = project.createSourceFile(filePath, `${fileContent}\n${injection}`, {
        overwrite: true,
      });
      const declaration = sourceFile.getExportedDeclarations().get("_StoryProps_")?.[0];
      if (!declaration) {
        throw new Error(`Export "${name}" not found in file "${filePath}"`);
      }

      return createTypeTreeBuilder(project, [literalEnumHandler]).typeToNode(
        declaration.getType(),
        declaration,
      );
    });
  }

  return {
    defineStory(callerUrl, { Component, name = "story", displayName, args = {} }) {
      const filePath = fileURLToPath(callerUrl);

      async function getClientPayload(): Promise<ClientPayload> {
        const normalized = Array.isArray(args) ? args : [{ ...args, variant: "default" }];

        return {
          displayName,
          presets: await Promise.all(
            normalized.map(async (preset): Promise<ClientPayload["presets"][number]> => {
              const fixedValues =
                typeof preset.fixed === "function" ? await preset.fixed() : preset.fixed;
              const initial =
                typeof preset.initial === "function" ? await preset.initial() : preset.initial;
              let controls: TypeNode;

              if (preset.controls && "node" in preset.controls) {
                controls = preset.controls.node;
              } else {
                controls = await generateControlsCached(filePath, name);

                if (preset.controls?.transform) controls = preset.controls.transform(controls);
                if (fixedValues) controls = collapse(controls, fixedValues);
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
          ),
        };
      }

      return {
        _private_: {
          component: Component,
        },
        async getClientPayload() {
          return serialize(await getClientPayload());
        },
        async WithControl() {
          if (!Component) throw new Error("`Component` option is not defined");

          const { WithControl } = await import("./client/with-control");
          return <WithControl Component={Component} {...await getClientPayload()} />;
        },
      };
    },
    async getStoryPayloads(stories) {
      const generated = await Promise.all(
        Object.entries(stories).map(async ([name, story]) => {
          return [name, await story.getClientPayload()];
        }),
      );

      return Object.fromEntries(generated);
    },
  };
}
