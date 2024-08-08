import type { BuildPageTreeOptions } from 'fumadocs-core/source';
import { cva } from 'class-variance-authority';
import { getBadgeColor } from '@/ui/components/variants';

/**
 * Source API Integration
 *
 * Add this to page tree builder options
 */
export const attachFile: BuildPageTreeOptions['attachFile'] = (node, file) => {
  if (!file) return node;
  const data = file.data.data as object;

  if ('method' in data && typeof data.method === 'string') {
    const color = getBadgeColor(data.method);

    node.name = (
      <>
        {node.name}{' '}
        <span
          className={badgeVariants({ className: 'ms-auto text-nowrap', color })}
        >
          {data.method}
        </span>
      </>
    );
  }

  return node;
};

const badgeVariants = cva('rounded-full border px-1.5 text-xs font-medium', {
  variants: {
    color: {
      green: 'bg-green-400/20 text-green-600 dark:text-green-400',
      yellow: 'bg-yellow-400/20 text-yellow-600 dark:text-yellow-400',
      red: 'bg-red-400/20 text-red-600 dark:text-red-400',
      blue: 'bg-blue-400/20 text-blue-600 dark:text-blue-400',
      orange: 'bg-orange-400/20 text-orange-600 dark:text-orange-400',
    },
  },
});
