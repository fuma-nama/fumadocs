/**
 * @license lucide-react - ISC
 *
 * All copyright belongs to https://github.com/lucide-icons/lucide, we bundle it as part of library to avoid upstream issues.
 */
import { type ComponentProps, createElement, forwardRef } from 'react';

const defaultAttributes: LucideProps = {
  xmlns: 'http://www.w3.org/2000/svg',
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

type SVGElementType =
  | 'circle'
  | 'ellipse'
  | 'g'
  | 'line'
  | 'path'
  | 'polygon'
  | 'polyline'
  | 'rect';

export interface LucideProps extends ComponentProps<'svg'> {
  size?: string | number;
}

export type IconNode = [
  elementName: SVGElementType,
  attrs: Record<string, string>,
][];

const createLucideIcon = (iconName: string, iconNode: IconNode) => {
  const Component = forwardRef<SVGSVGElement, LucideProps>(
    ({ size = 24, color = 'currentColor', children, ...props }, ref) => {
      return (
        <svg
          ref={ref}
          {...defaultAttributes}
          width={size}
          height={size}
          stroke={color}
          {...props}
        >
          {iconNode.map(([tag, attr]) => createElement(tag, attr))}
          {children}
        </svg>
      );
    },
  );

  Component.displayName = iconName;
  return Component;
};

export const CircleCheck = createLucideIcon('circle-check', [
  ['circle', { cx: '12', cy: '12', r: '10', key: '1mglay' }],
  ['path', { d: 'm9 12 2 2 4-4', key: 'dzmm74' }],
]);

export const CircleX = createLucideIcon('circle-x', [
  ['circle', { cx: '12', cy: '12', r: '10', key: '1mglay' }],
  ['path', { d: 'm15 9-6 6', key: '1uzhvr' }],
  ['path', { d: 'm9 9 6 6', key: 'z0biqf' }],
]);

export const TriangleAlert = createLucideIcon('triangle-alert', [
  [
    'path',
    {
      d: 'm21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3',
      key: 'wmoenq',
    },
  ],
  ['path', { d: 'M12 9v4', key: 'juzpu7' }],
  ['path', { d: 'M12 17h.01', key: 'p32p05' }],
]);

export const Info = createLucideIcon('info', [
  ['circle', { cx: '12', cy: '12', r: '10', key: '1mglay' }],
  ['path', { d: 'M12 16v-4', key: '1dtifu' }],
  ['path', { d: 'M12 8h.01', key: 'e9boi3' }],
]);
