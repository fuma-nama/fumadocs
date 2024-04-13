export const typography = {
  css: {
    '--tw-prose-body': `theme('colors.foreground / 90%')`,
    '--tw-prose-headings': `theme('colors.foreground')`,
    '--tw-prose-lead': `theme('colors.foreground')`,
    '--tw-prose-links': `theme('colors.foreground')`,
    '--tw-prose-bold': `theme('colors.foreground')`,
    '--tw-prose-counters': `theme('colors.muted.foreground')`,
    '--tw-prose-bullets': `theme('colors.muted.foreground')`,
    '--tw-prose-hr': `theme('colors.border')`,
    '--tw-prose-quotes': `theme('colors.foreground')`,
    '--tw-prose-quote-borders': `theme('colors.border')`,
    '--tw-prose-captions': `theme('colors.foreground')`,
    '--tw-prose-code': `theme('colors.foreground')`,
    '--tw-prose-th-borders': `theme('colors.border')`,
    '--tw-prose-td-borders': `theme('colors.border')`,
    '--tw-prose-kbd': `theme('colors.foreground')`,
    '--tw-prose-kbd-shadows': `theme('colors.primary.DEFAULT / 50%')`,
    // not used
    '--tw-prose-pre-bg': false,
    '--tw-prose-pre-code': false,
    fontSize: '16px',
    maxWidth: 'none',
    a: {
      transition: 'opacity 0.3s',
      fontWeight: '400',
      textDecoration: 'underline',
      textUnderlineOffset: '2px',
      textDecorationColor: `theme('colors.primary.DEFAULT')`,
    },
    'a:hover': {
      opacity: '80%',
    },
    table: {
      fontSize: '14px',
      whiteSpace: 'nowrap',
    },
    'thead th': {
      textAlign: 'start',
    },
    code: {
      padding: '3px',
      border: 'solid 1px',
      fontSize: '13px',
      borderColor: `theme('colors.border')`,
      borderRadius: '5px',
      fontWeight: '400',
      background: `theme('colors.muted.DEFAULT')`,
    },
    kbd: {
      boxShadow:
        '0 0 0 1px var(--tw-prose-kbd-shadows),0 3px 0 var(--tw-prose-kbd-shadows)',
    },
    ul: {
      listStylePosition: 'inside',
      paddingLeft: '0',
    },
    'ul > li': {
      paddingLeft: '0',
    },
    // Disabled styles, handled by Fumadocs UI
    'pre code': false,
    'pre code::after': false,
    'pre code::before': false,
    'code::after': false,
    'code::before': false,
  },
};
