import type { Root } from 'hast';
import type {
  HighlighterCore,
  ThemeRegistrationAny,
  LanguageRegistration,
  CodeOptionsThemes,
  BundledTheme,
  CodeToHastOptions,
  ShikiTransformer,
  ShikiTransformerContextMeta,
} from 'shiki';

/**
 * Highlight with Shiki, running the `_fd_prepare` and `_fd_postprocess` transformer hooks around it.
 */
export async function codeToHastWithHooks(
  highlighter: HighlighterCore,
  code: string,
  options: CodeToHastOptions,
): Promise<Root> {
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
  // transformers key their prepared results by this object
  const codeOptions = { ...options, transformers };

  const prepare: Promise<void>[] = [];
  for (const transformer of transformers) {
    const task = transformer._fd_prepare?.(code, codeOptions);
    if (task) prepare.push(task);
  }
  if (prepare.length > 0) await Promise.all(prepare);

  const root = highlighter.codeToHast(code, codeOptions);
  if (postprocess && postprocess.length > 0) {
    await Promise.all(postprocess.map((task) => task({ highlighter })));
  }
  return root;
}

export async function loadMissingTheme(
  highlighter: HighlighterCore,
  themes: (ThemeRegistrationAny | string)[],
) {
  const bundled = highlighter.getBundledThemes();
  const loaded = highlighter.getLoadedThemes();
  const missingThemes = themes.filter((theme) => {
    if (typeof theme === 'string') return theme in bundled && !loaded.includes(theme);
    // `getTheme` would re-normalize a theme object on every call
    return theme.name === undefined || !loaded.includes(theme.name);
  });

  if (missingThemes.length > 0) await highlighter.loadTheme(...(missingThemes as never[]));
}

export async function loadMissingLanguage(
  highlighter: HighlighterCore,
  langs: (LanguageRegistration | string)[],
) {
  const bundled = highlighter.getBundledLanguages();
  const loaded = highlighter.getLoadedLanguages();
  const missingLangs = langs.filter((lang) => {
    if (typeof lang === 'string') return lang in bundled && !loaded.includes(lang);
    return !loaded.includes(lang.name);
  });

  if (missingLangs.length > 0) await highlighter.loadLanguage(...(missingLangs as never[]));
}

export function getRequiredThemes(
  options: CodeOptionsThemes<BundledTheme>,
): (ThemeRegistrationAny | string)[] {
  if ('theme' in options) {
    return [options.theme];
  } else {
    return Object.values(options.themes).filter((v) => v !== undefined);
  }
}

export function applyDefaultThemes<
  T extends CodeOptionsThemes<BundledTheme> | Record<never, never>,
>(options: T, defaultValue = defaultThemes): T & CodeOptionsThemes<BundledTheme> {
  if (!('theme' in options) && !('themes' in options)) {
    return { ...defaultValue, ...options };
  } else {
    return options as T & CodeOptionsThemes<BundledTheme>;
  }
}

export const defaultThemes: CodeOptionsThemes<BundledTheme> = {
  themes: {
    light: 'github-light',
    dark: 'github-dark',
  },
  defaultColor: false,
};
