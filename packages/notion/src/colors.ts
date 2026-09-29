import { cn } from 'cn';
import type { CalloutType } from 'fumadocs-ui/components/callout';
import type { NotionColor } from './blocks';

/**
 * Notion's palette is mapped onto Fumadocs UI's semantic tokens rather than a Notion-specific
 * theme, so content inherits the site's colors. `data-notion-color` keeps the original value
 * available for sites that do want to restyle it.
 */
export function getNotionColorClassName(color: NotionColor, inline = false): string | undefined {
  const background = inline ? 'rounded-sm px-0.5' : 'rounded-sm';

  switch (color) {
    case 'default':
    case 'default_background':
      return;
    case 'gray':
      return 'text-fd-muted-foreground';
    case 'brown':
    case 'orange':
      return 'text-fd-idea';
    case 'yellow':
      return 'text-fd-warning';
    case 'green':
      return 'text-fd-success';
    case 'blue':
      return 'text-fd-info';
    case 'purple':
    case 'pink':
      return 'text-fd-primary';
    case 'red':
      return 'text-fd-error';
    case 'gray_background':
      return cn(background, 'bg-fd-muted text-fd-foreground');
    case 'brown_background':
    case 'orange_background':
      return cn(background, 'bg-fd-idea/15 text-fd-foreground');
    case 'yellow_background':
      return cn(background, 'bg-fd-warning/15 text-fd-foreground');
    case 'green_background':
      return cn(background, 'bg-fd-success/15 text-fd-foreground');
    case 'blue_background':
      return cn(background, 'bg-fd-info/15 text-fd-foreground');
    case 'purple_background':
    case 'pink_background':
      return cn(background, 'bg-fd-primary/10 text-fd-foreground');
    case 'red_background':
      return cn(background, 'bg-fd-error/15 text-fd-foreground');
  }
}

/** Notion callouts carry a color rather than a semantic type, so the color picks the callout style. */
export function getCalloutType(color: NotionColor): CalloutType | undefined {
  switch (color) {
    case 'blue':
    case 'blue_background':
      return 'info';
    case 'yellow':
    case 'yellow_background':
    case 'orange':
    case 'orange_background':
      return 'warning';
    case 'red':
    case 'red_background':
      return 'error';
    case 'green':
    case 'green_background':
      return 'success';
    case 'purple':
    case 'purple_background':
    case 'pink':
    case 'pink_background':
    case 'brown':
    case 'brown_background':
      return 'idea';
    default:
      return;
  }
}

export function colorAttribute(color: NotionColor): string | undefined {
  return color === 'default' || color === 'default_background' ? undefined : color;
}
