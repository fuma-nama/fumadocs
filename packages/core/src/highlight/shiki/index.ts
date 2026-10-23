import type { Root } from 'hast';
import type {
  BundledLanguage,
  BundledTheme,
  CodeOptionsMeta,
  CodeOptionsThemes,
  CodeToHastOptionsCommon,
  HighlighterCore,
  ShikiTransformer,
  ShikiTransformerContextMeta,
} from 'shiki';
import type { Highlighter, HighlightCodeOptions } from '..';
import type { Awaitable, DistributiveOmit } from '@/types';
import { loadMissingLanguage, loadMissingTheme, getRequiredThemes } from '../utils';

interface InitOptions {
  langAlias?: Record<string, string>;
}

/**
 * A factory for Fumadocs to manage Shiki instances.
 */
export interface ShikiFactory {
  init: (options?: InitOptions) => Awaitable<HighlighterCore>;
  getOrInit: () => Awaitable<HighlighterCore>;
}

export function createShikiFactory(config: Pick<ShikiFactory, 'init'>): ShikiFactory {
  let instance: Awaitable<HighlighterCore> | undefined;

  return {
    init(options) {
      const created = config.init(options);
      if (created instanceof Promise)
        created.catch(() => {
          if (instance === created) instance = undefined;
        });
      return (instance = created);
    },
    getOrInit() {
      return instance ?? this.init();
    },
  };
}

export type HighlightHastOptions = CodeToHastOptionsCommon<BundledLanguage> &
  CodeOptionsMeta &
  CodeOptionsThemes<BundledTheme> & {
    fallbackLanguage?: BundledLanguage | (string & {});
  };

export type ShikiHighlighterOptions = DistributiveOmit<HighlightHastOptions, 'lang'>;

export interface ShikiHighlighter extends Highlighter {
  loadLanguage: (...langs: string[]) => Promise<void>;
  codeToHastAsync: (code: string, options: HighlightCodeOptions) => Promise<Root>;
  /** Create a highlighter with `options` in place of its own, like other transformers. */
  override: (options: Partial<ShikiHighlighterOptions>) => ShikiHighlighter;
}

/**
 * Use Shiki as a highlighter, `options` apply to every code block.
 */
export function createShikiHighlighter(
  shiki: HighlighterCore | (() => Awaitable<HighlighterCore>),
  shikiOptions: ShikiHighlighterOptions,
): ShikiHighlighter {
  const { fallbackLanguage = 'text', ...options } = shikiOptions;
  let instance = typeof shiki === 'function' ? undefined : shiki;
  // languages `loadLanguage()` couldn't load, highlighted as the fallback language
  const fallbacks = new Set<string>();
  // tasks of the last `codeToHast()`, transformers like Twoslash finish their work after it
  let postprocess: ShikiTransformerContextMeta['_fd_postprocess'];
  const transformers: ShikiTransformer[] = [
    ...(options.transformers ?? []),
    {
      enforce: 'post',
      root() {
        postprocess = this.meta._fd_postprocess;
      },
    },
  ];

  function getCodeOptions({ lang, structure = options.structure, meta }: HighlightCodeOptions) {
    return {
      ...options,
      lang: fallbacks.has(lang) ? fallbackLanguage : lang,
      structure,
      meta: options.meta ? { ...options.meta, ...meta } : meta,
      transformers,
    };
  }

  function getInstance() {
    // a factory resolves the instance in `loadLanguage()`
    if (!instance) throw new Error('[Fumadocs] load the language before highlighting');
    return instance;
  }

  const loading = new Map<string, Promise<void>>();
  async function load(lang: string) {
    const [highlighter, { isSpecialLang }] = await Promise.all([
      typeof shiki === 'function' ? shiki() : shiki,
      import('shiki/core'),
    ]);
    await Promise.all([
      loadMissingTheme(highlighter, getRequiredThemes(options)),
      loadMissingLanguage(highlighter, [lang, fallbackLanguage]),
    ]);

    if (!isSpecialLang(lang) && !highlighter.getLoadedLanguages().includes(lang)) {
      fallbacks.add(lang);
    }
    instance = highlighter;
  }

  return {
    async loadLanguage(...langs) {
      const tasks: Promise<void>[] = [];
      for (const lang of langs) {
        let task = loading.get(lang);
        if (!task) {
          loading.set(lang, (task = load(lang)));
          task.catch(() => loading.delete(lang));
        }
        tasks.push(task);
      }
      await Promise.all(tasks);
    },
    codeToHast(code, codeOptions) {
      return getInstance().codeToHast(code, getCodeOptions(codeOptions));
    },
    async codeToHastAsync(code, codeOptions) {
      const highlighter = getInstance();
      // transformers key their prepared results by this object
      const hastOptions = getCodeOptions(codeOptions);
      const prepare: Promise<void>[] = [];
      for (const transformer of transformers) {
        const task = transformer._fd_prepare?.(code, hastOptions);
        if (task) prepare.push(task);
      }
      if (prepare.length > 0) await Promise.all(prepare);

      const root = highlighter.codeToHast(code, hastOptions);
      if (postprocess && postprocess.length > 0) {
        await Promise.all(postprocess.map((task) => task({ highlighter })));
      }
      return root;
    },
    override(overrides) {
      return createShikiHighlighter(instance ?? shiki, {
        ...shikiOptions,
        ...overrides,
      } as ShikiHighlighterOptions);
    },
  };
}

export async function highlightHast(
  highlighter: HighlighterCore,
  code: string,
  options: HighlightHastOptions,
): Promise<Root> {
  const instance = createShikiHighlighter(highlighter, options);
  await instance.loadLanguage(options.lang);

  return instance.codeToHast(code, options);
}
