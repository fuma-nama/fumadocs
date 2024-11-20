import * as styles from './styles';
import plugin from 'tailwindcss/plugin';
import merge from 'lodash.merge';
import parser, { type Pseudo } from 'postcss-selector-parser';

export interface Options extends styles.StyleOptions {
  className?: string;
}

interface Context {
  prefix: (v: string) => string;
  modifier?: string;
}

function inWhere(
  selector: string,
  { className, prefix, modifier }: Options & Context,
) {
  const prefixedNot = prefix(`.not-${className}`).slice(1);
  const selectorPrefix = selector.startsWith('>')
    ? `${modifier === 'DEFAULT' ? `.${className}` : `.${className}-${modifier}`} `
    : '';

  // Parse the selector, if every component ends in the same pseudo element(s) then move it to the end
  const [trailingPseudo, rebuiltSelector] = commonTrailingPseudos(selector);

  if (trailingPseudo) {
    return `:where(${selectorPrefix}${rebuiltSelector}):not(:where([class~="${prefixedNot}"],[class~="${prefixedNot}"] *))${trailingPseudo}`;
  }

  return `:where(${selectorPrefix}${selector}):not(:where([class~="${prefixedNot}"],[class~="${prefixedNot}"] *))`;
}

function configToCss(
  config: object = {},
  { className, modifier, prefix }: Options & Context,
) {
  function updateSelector(
    k: string,
    v: unknown,
  ): [k: string, v: unknown, object?] {
    if (Array.isArray(v)) {
      return [k, v];
    }

    if (typeof v === 'object' && v !== null) {
      const nested = Object.values(v).some((prop) => typeof prop === 'object');
      if (nested) {
        return [
          inWhere(k, { className, modifier, prefix }),
          v,
          Object.fromEntries(
            Object.entries(v).map(([k, v]) => updateSelector(k, v)),
          ),
        ];
      }

      return [inWhere(k, { className, modifier, prefix }), v];
    }

    return [k, v];
  }

  const css = 'css' in config ? config.css : [];
  return Object.fromEntries(
    Object.entries(merge({}, ...(Array.isArray(css) ? css : [css]))).map(
      ([k, v]) => updateSelector(k, v),
    ),
  );
}

const parseSelector = parser();

function commonTrailingPseudos(selector: string) {
  const ast = parseSelector.astSync(selector);
  const matrix: Pseudo[][] = [];

  // Put the pseudo elements in reverse order in a sparse, column-major 2D array
  for (const [i, sel] of ast.nodes.entries()) {
    for (const [j, child] of [...sel.nodes].reverse().entries()) {
      // We only care about pseudo elements
      if (child.type !== 'pseudo' || !child.value.startsWith('::')) {
        break;
      }

      matrix[j] = matrix[j] || [];
      matrix[j][i] = child;
    }
  }

  const trailingPseudos = parser.selector({
    value: '',
  });

  // At this point the pseudo elements are in a column-major 2D array
  // This means each row contains one "column" of pseudo elements from each selector
  // We can compare all the pseudo elements in a row to see if they are the same
  for (const pseudos of matrix) {
    // It's a sparse 2D array so there are going to be holes in the rows
    // We skip those
    if (!pseudos) {
      continue;
    }

    const values = new Set(pseudos.map((p) => p.value));

    // The pseudo elements are not the same
    if (values.size > 1) {
      break;
    }

    pseudos.forEach((pseudo) => pseudo.remove());
    trailingPseudos.prepend(pseudos[0]);
  }

  if (trailingPseudos.nodes.length) {
    return [trailingPseudos.toString(), ast.toString()];
  }

  return [null, selector];
}

const SELECTORS = [
  ['headings', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'th'],
  ['h1'],
  ['h2'],
  ['h3'],
  ['h4'],
  ['h5'],
  ['h6'],
  ['p'],
  ['a'],
  ['blockquote'],
  ['figure'],
  ['figcaption'],
  ['strong'],
  ['em'],
  ['kbd'],
  ['code'],
  ['pre'],
  ['ol'],
  ['ul'],
  ['li'],
  ['table'],
  ['thead'],
  ['tr'],
  ['th'],
  ['td'],
  ['img'],
  ['video'],
  ['hr'],
  ['lead', '[class~="lead"]'],
];

export const typography = plugin.withOptions<Options>(
  ({ className = 'prose', ...styleOptions } = {}) => {
    return ({ addVariant, addComponents, theme, ...rest }) => {
      const prefix = (rest as unknown as { prefix: Context['prefix'] }).prefix;
      const modifiers = theme('typography') as typeof styles;

      for (const [name, ...values] of SELECTORS) {
        const selectors = values.length === 0 ? [name] : values;
        const selector = selectors.join(', ');

        addVariant(
          `${className}-${name}`,
          `& :is(${inWhere(selector, {
            prefix,
            className,
          })})`,
        );
      }

      addComponents({
        [`.${className}`]: configToCss(modifiers.DEFAULT(styleOptions), {
          className,
          modifier: 'DEFAULT',
          prefix,
        }),
      });
    };
  },
  () => {
    return {
      theme: { typography: styles },
    };
  },
);
