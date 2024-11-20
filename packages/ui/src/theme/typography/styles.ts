function round(num: number) {
  return num
    .toFixed(7)
    .replace(/(\.[0-9]+?)0+$/, '$1')
    .replace(/\.0$/, '');
}

function rem(px: number) {
  return `${round(px / 16)}rem`;
}

function em(px: number, base: number) {
  return `${round(px / base)}em`;
}

const colors = {
  '--tw-prose-body': `theme('colors.fd-foreground / 90%')`,
  '--tw-prose-headings': `theme('colors.fd-foreground')`,
  '--tw-prose-lead': `theme('colors.fd-foreground')`,
  '--tw-prose-links': `theme('colors.fd-foreground')`,
  '--tw-prose-bold': `theme('colors.fd-foreground')`,
  '--tw-prose-counters': `theme('colors.fd-muted.foreground')`,
  '--tw-prose-bullets': `theme('colors.fd-muted.foreground')`,
  '--tw-prose-hr': `theme('colors.fd-border')`,
  '--tw-prose-quotes': `theme('colors.fd-foreground')`,
  '--tw-prose-quote-borders': `theme('colors.fd-border')`,
  '--tw-prose-captions': `theme('colors.fd-foreground')`,
  '--tw-prose-code': `theme('colors.fd-foreground')`,
  '--tw-prose-th-borders': `theme('colors.fd-border')`,
  '--tw-prose-td-borders': `theme('colors.fd-border')`,
  '--tw-prose-kbd': `theme('colors.fd-foreground')`,
  '--tw-prose-kbd-shadows': `theme('colors.fd-primary.DEFAULT / 50%')`,
};

const roundedTable = {
  table: {
    borderCollapse: 'separate',
    borderSpacing: '0',
    '@apply bg-fd-card rounded-lg border overflow-hidden': '',
  },
  th: {
    textAlign: 'start',
    '@apply p-2.5 border-s bg-fd-muted': '',
  },
  'th:first-child': {
    '@apply border-s-0': '',
  },
  'th:not(tr:last-child *), td:not(tr:last-child *)': {
    '@apply border-b': '',
  },
  td: {
    textAlign: 'start',
    '@apply border-s p-2.5': '',
  },
  'td:first-child': {
    '@apply border-s-0': '',
  },
  'tfoot th, tfoot td': {
    borderTopWidth: '1px',
    borderTopColor: 'var(--tw-prose-th-borders)',
  },
  'thead th, thead td': {
    borderBottomWidth: '1px',
    borderBottomColor: 'var(--tw-prose-th-borders)',
  },
};

const normalTable = {
  thead: {
    borderBottomWidth: '1px',
    borderBottomColor: 'var(--tw-prose-th-borders)',
  },
  'thead th': {
    verticalAlign: 'bottom',
    paddingInlineEnd: em(8, 14),
    paddingBottom: em(8, 14),
    paddingInlineStart: em(8, 14),
  },
  'thead th:first-child': {
    paddingInlineStart: '0',
  },
  'thead th:last-child': {
    paddingInlineEnd: '0',
  },
  'tbody td, tfoot td': {
    paddingTop: em(8, 14),
    paddingInlineEnd: em(8, 14),
    paddingBottom: em(8, 14),
    paddingInlineStart: em(8, 14),
  },
  'tbody td:first-child, tfoot td:first-child': {
    paddingInlineStart: '0',
  },
  'tbody td:last-child, tfoot td:last-child': {
    paddingInlineEnd: '0',
  },
  'tbody tr': {
    borderBottomWidth: '1px',
    borderBottomColor: 'var(--tw-prose-td-borders)',
  },
  'tbody tr:last-child': {
    borderBottomWidth: '0',
  },
  'tbody td': {
    verticalAlign: 'baseline',
  },
  tfoot: {
    borderTopWidth: '1px',
    borderTopColor: 'var(--tw-prose-th-borders)',
  },
  'tfoot td': {
    verticalAlign: 'top',
  },
  'th, td': {
    textAlign: 'start',
  },
};

export interface StyleOptions {
  /**
   * Disable custom table styles
   */
  disableRoundedTable?: boolean;
}

export const DEFAULT = ({ disableRoundedTable }: StyleOptions) => ({
  css: [
    {
      color: 'var(--tw-prose-body)',
      maxWidth: 'none',
      fontSize: rem(16),
      lineHeight: round(28 / 16),

      '[class~="lead"]': {
        fontSize: em(20, 16),
        lineHeight: round(32 / 20),
        marginTop: em(24, 20),
        marginBottom: em(24, 20),
        color: 'var(--tw-prose-lead)',
      },
      ul: {
        paddingInlineStart: '1rem',
        listStyleType: 'disc',
        marginTop: em(20, 16),
        marginBottom: em(20, 16),
      },
      li: {
        marginTop: em(8, 16),
        marginBottom: em(8, 16),
      },
      'ol > li': {
        paddingInlineStart: em(6, 16),
      },
      'ul > li': {
        paddingInlineStart: '0',
      },
      '> ul > li p': {
        marginTop: em(12, 16),
        marginBottom: em(12, 16),
      },
      '> ul > li > p:first-child': {
        marginTop: em(20, 16),
      },
      '> ul > li > p:last-child': {
        marginBottom: em(20, 16),
      },
      '> ol > li > p:first-child': {
        marginTop: em(20, 16),
      },
      '> ol > li > p:last-child': {
        marginBottom: em(20, 16),
      },
      'ul ul, ul ol, ol ul, ol ol': {
        marginTop: em(12, 16),
        marginBottom: em(12, 16),
      },
      dl: {
        marginTop: em(20, 16),
        marginBottom: em(20, 16),
      },
      dt: {
        color: 'var(--tw-prose-headings)',
        fontWeight: '600',
        marginTop: em(20, 16),
      },
      dd: {
        marginTop: em(8, 16),
        paddingInlineStart: em(26, 16),
      },
      hr: {
        borderColor: 'var(--tw-prose-hr)',
        borderTopWidth: 1,
        marginTop: em(48, 16),
        marginBottom: em(48, 16),
      },
      p: {
        marginTop: em(20, 16),
        marginBottom: em(20, 16),
      },
      strong: {
        color: 'var(--tw-prose-bold)',
        fontWeight: '600',
      },
      'a strong': {
        color: 'inherit',
      },
      'blockquote strong': {
        color: 'inherit',
      },
      'thead th strong': {
        color: 'inherit',
      },
      ol: {
        listStyleType: 'decimal',
        marginTop: em(20, 16),
        marginBottom: em(20, 16),
        paddingInlineStart: em(26, 16),
      },
      'ol[type="A"]': {
        listStyleType: 'upper-alpha',
      },
      'ol[type="a"]': {
        listStyleType: 'lower-alpha',
      },
      'ol[type="A" s]': {
        listStyleType: 'upper-alpha',
      },
      'ol[type="a" s]': {
        listStyleType: 'lower-alpha',
      },
      'ol[type="I"]': {
        listStyleType: 'upper-roman',
      },
      'ol[type="i"]': {
        listStyleType: 'lower-roman',
      },
      'ol[type="I" s]': {
        listStyleType: 'upper-roman',
      },
      'ol[type="i" s]': {
        listStyleType: 'lower-roman',
      },
      'ol[type="1"]': {
        listStyleType: 'decimal',
      },
      'ol > li::marker': {
        fontWeight: '400',
        color: 'var(--tw-prose-counters)',
      },
      'ul > li::marker': {
        color: 'var(--tw-prose-bullets)',
      },
      blockquote: {
        marginTop: em(32, 20),
        marginBottom: em(32, 20),
        paddingInlineStart: em(20, 20),
        fontWeight: '500',
        fontStyle: 'italic',
        color: 'var(--tw-prose-quotes)',
        borderInlineStartWidth: '0.25rem',
        borderInlineStartColor: 'var(--tw-prose-quote-borders)',
        quotes: '"\\201C""\\201D""\\2018""\\2019"',
      },
      'blockquote p:first-of-type::before': {
        content: 'open-quote',
      },
      'blockquote p:last-of-type::after': {
        content: 'close-quote',
      },
      h1: {
        color: 'var(--tw-prose-headings)',
        fontWeight: '800',
        fontSize: em(36, 16),
        marginTop: '0',
        marginBottom: em(32, 36),
        lineHeight: round(40 / 36),
      },
      'h1 strong': {
        fontWeight: '900',
        color: 'inherit',
      },
      h2: {
        color: 'var(--tw-prose-headings)',
        fontSize: em(24, 16),
        marginTop: em(48, 24),
        marginBottom: em(24, 24),
        lineHeight: round(32 / 24),
        fontWeight: '600',
      },
      'h2 strong': {
        fontWeight: '800',
        color: 'inherit',
      },
      h3: {
        color: 'var(--tw-prose-headings)',
        fontWeight: '600',
        fontSize: em(20, 16),
        marginTop: em(32, 20),
        marginBottom: em(12, 20),
        lineHeight: round(32 / 20),
      },
      'h3 strong': {
        fontWeight: '700',
        color: 'inherit',
      },
      h4: {
        color: 'var(--tw-prose-headings)',
        fontWeight: '600',
        marginTop: em(24, 16),
        marginBottom: em(8, 16),
        lineHeight: round(24 / 16),
      },
      'h4 strong': {
        fontWeight: '700',
        color: 'inherit',
      },
      'hr + *': {
        marginTop: '0',
      },
      'h2 + *': {
        marginTop: '0',
      },
      'h3 + *': {
        marginTop: '0',
      },
      'h4 + *': {
        marginTop: '0',
      },
      img: {
        marginTop: em(32, 16),
        marginBottom: em(32, 16),
      },
      picture: {
        display: 'block',
        marginTop: em(32, 16),
        marginBottom: em(32, 16),
      },
      'picture > img': {
        marginTop: '0',
        marginBottom: '0',
      },
      video: {
        marginTop: em(32, 16),
        marginBottom: em(32, 16),
      },
      kbd: {
        fontSize: em(14, 16),
        borderRadius: rem(5),
        paddingTop: em(3, 16),
        paddingInlineEnd: em(6, 16),
        paddingBottom: em(3, 16),
        paddingInlineStart: em(6, 16),
        fontWeight: '500',
        fontFamily: 'inherit',
        color: 'var(--tw-prose-kbd)',
        boxShadow:
          '0 0 0 1px var(--tw-prose-kbd-shadows),0 3px 0 var(--tw-prose-kbd-shadows)',
      },
      code: {
        padding: '3px',
        border: 'solid 1px',
        fontSize: '13px',
        borderColor: `theme('colors.fd-border')`,
        borderRadius: '5px',
        fontWeight: '400',
        background: `theme('colors.fd-muted.DEFAULT')`,
        color: 'var(--tw-prose-code)',
      },
      'a code': {
        color: 'inherit',
      },
      'h1 code': {
        color: 'inherit',
      },
      'h2 code': {
        color: 'inherit',
        fontSize: em(21, 24),
      },
      'h3 code': {
        color: 'inherit',
        fontSize: em(18, 20),
      },
      'h4 code': {
        color: 'inherit',
      },
      'blockquote code': {
        color: 'inherit',
      },
      'thead th code': {
        color: 'inherit',
      },

      table: {
        fontSize: em(14, 16),
        lineHeight: round(24 / 14),
        width: '100%',
        tableLayout: 'auto',
        marginTop: em(32, 16),
        marginBottom: em(32, 16),
      },
      'thead th': {
        color: 'var(--tw-prose-headings)',
        fontWeight: '600',
      },

      figure: {
        marginTop: em(32, 16),
        marginBottom: em(32, 16),
      },
      'figure > *': {
        marginTop: '0',
        marginBottom: '0',
      },
      figcaption: {
        color: 'var(--tw-prose-captions)',
        fontSize: em(14, 16),
        lineHeight: round(20 / 14),
        marginTop: em(12, 14),
      },

      'a:not([data-card])': {
        color: 'var(--tw-prose-links)',
        transition: 'opacity 0.3s',
        fontWeight: '400',
        textDecoration: 'underline',
        textUnderlineOffset: '2px',
        textDecorationColor: `theme('colors.fd-primary.DEFAULT')`,
      },
      'a:not([data-card]):hover': {
        opacity: '80%',
      },
    },
    colors,
    {
      '> :first-child': {
        marginTop: '0',
      },
      '> :last-child': {
        marginBottom: '0',
      },
    },
    disableRoundedTable ? normalTable : roundedTable,
  ],
});
