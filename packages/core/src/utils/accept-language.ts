interface LanguageSpec {
  /** primary subtag, e.g. `en` in `en-US` */
  prefix: string;
  full: string;
  quality: number;
  order: number;
}

interface Match {
  language: string;
  quality: number;
  /** exact tag > spec prefix > tag prefix > wildcard */
  specificity: number;
  order: number;
}

function parseAcceptLanguage(header: string): LanguageSpec[] {
  const specs: LanguageSpec[] = [];

  for (const section of header.split(',')) {
    const [rawTag, ...params] = section.split(';');
    const full = rawTag.trim().toLowerCase();
    if (full.length === 0) continue;

    let quality = 1;
    for (const param of params) {
      const separator = param.indexOf('=');
      if (separator === -1 || param.slice(0, separator).trim().toLowerCase() !== 'q') continue;

      const parsed = Number.parseFloat(param.slice(separator + 1));
      if (!Number.isNaN(parsed)) quality = parsed;
    }

    const dash = full.indexOf('-');
    specs.push({
      prefix: dash === -1 ? full : full.slice(0, dash),
      full,
      quality,
      order: specs.length,
    });
  }

  return specs;
}

function matchLanguage(language: string, specs: LanguageSpec[]): Match | undefined {
  const full = language.trim().toLowerCase();
  const dash = full.indexOf('-');
  const prefix = dash === -1 ? full : full.slice(0, dash);

  const best: Match = { language, quality: 0, specificity: 0, order: -1 };
  for (const spec of specs) {
    let specificity;
    if (spec.full === full) specificity = 4;
    // `en-US` accepts `en`, `en` accepts `en-US`
    else if (spec.prefix === full) specificity = 2;
    else if (spec.full === prefix) specificity = 1;
    else if (spec.full === '*') specificity = 0;
    else continue;

    const better =
      specificity - best.specificity || spec.quality - best.quality || spec.order - best.order;
    if (better > 0) {
      best.quality = spec.quality;
      best.specificity = specificity;
      best.order = spec.order;
    }
  }

  if (best.quality > 0) return best;
}

/**
 * Filter `available` down to the languages the `Accept-Language` header accepts, ordered by
 * client preference. A missing (`null`) header accepts everything.
 */
export function negotiateLanguages(header: string | null, available: string[]): string[] {
  const specs = parseAcceptLanguage(header ?? '*');

  const matches: Match[] = [];
  for (const language of available) {
    const match = matchLanguage(language, specs);
    if (match) matches.push(match);
  }

  matches.sort(
    (a, b) => b.quality - a.quality || b.specificity - a.specificity || a.order - b.order,
  );
  return matches.map((match) => match.language);
}
