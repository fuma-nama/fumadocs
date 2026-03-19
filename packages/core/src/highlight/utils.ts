import type {
  HighlighterCore,
  ThemeRegistrationAny,
  LanguageRegistration,
  CodeOptionsThemes,
  BundledTheme,
} from 'shiki';

export async function loadMissingTheme(
  highlighter: HighlighterCore,
  themes: (ThemeRegistrationAny | string)[],
) {
  const { isSpecialTheme } = await import('shiki/core');

  const missingThemes = themes.filter((theme) => {
    if (isSpecialTheme(theme)) return false;
    try {
      highlighter.getTheme(theme);
      return false;
    } catch {
      return true;
    }
  });

  if (missingThemes.length > 0) await highlighter.loadTheme(...(missingThemes as never[]));
}

export async function loadMissingLanguage(
  highlighter: HighlighterCore,
  langs: (LanguageRegistration | string)[],
) {
  const { isSpecialLang } = await import('shiki/core');

  const missingLangs = langs.filter((lang) => {
    if (isSpecialLang(lang)) return false;
    try {
      highlighter.getLanguage(lang);
      return false;
    } catch {
      return true;
    }
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
