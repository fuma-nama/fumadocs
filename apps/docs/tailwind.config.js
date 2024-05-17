import { createPreset, presets } from '@maximai/fumadocs-ui/tailwind-plugin';
import animate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './content/**/*.mdx',
    './mdx-components.tsx',
    './node_modules/@maximai/fumadocs-ui/dist/**/*.js',
  ],
  presets: [
    createPreset({
      preset: {
        ...presets.default,
        dark: {
          ...presets.default.dark,
          background: '0 0% 2%',
          foreground: '0 0% 98%',
          popover: '0 0% 4%',
          card: '0 0% 4%',
          muted: '0 0% 8%',
          border: '0 0% 14%',
          accent: '0 0% 15%',
          'accent-foreground': '0 0% 100%',
          'muted-foreground': '0 0% 60%',
        },
      },
    }),
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-geist-sans)'],
        mono: ['var(--font-geist-mono)'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(circle, var(--tw-gradient-stops))',
        'repeat-gradient-to-r':
          'repeating-linear-gradient(to right, var(--tw-gradient-stops))',
        'repeat-gradient-to-br':
          'repeating-linear-gradient(to bottom right, var(--tw-gradient-stops))',
      },
      keyframes: {
        updown: {
          'from, to': {
            transform: 'translateY(-20px)',
          },
          '50%': {
            transform: 'translateY(20px)',
          },
        },
        light: {
          'from, to': {
            opacity: 0.7,
          },
          '50%': {
            opacity: 1,
          },
        },
        stroke: {
          from: {
            'stroke-dasharray': 1000,
          },
          to: {
            'stroke-dasharray': 1000,
            'stroke-dashoffset': 2000,
          },
        },
      },
      animation: {
        stroke: 'stroke 5s linear infinite',
        light: 'light 2s ease-in-out infinite',
        updown: 'updown 3s ease-in-out infinite',
      },
    },
  },
  plugins: [animate],
};
