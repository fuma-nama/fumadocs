import * as tabs from './tabs';
import * as collapsible from './components/collapsible';
import * as codeblock from 'fumadocs-ui/components/codeblock';
import * as heading from 'fumadocs-ui/components/heading';

// the interactive components of `NotionRenderer`, for frameworks hydrating components by name

/** @deprecated `NotionRenderer` hydrates it through `'use client'` */
export const NotionTabs = tabs.NotionTabs;
/** @deprecated `NotionRenderer` hydrates it through `'use client'` */
export const Collapsible = collapsible.Collapsible;
/** @deprecated `NotionRenderer` hydrates it through `'use client'` */
export const CollapsibleContent = collapsible.CollapsibleContent;
/** @deprecated `NotionRenderer` hydrates it through `'use client'` */
export const CollapsibleTrigger = collapsible.CollapsibleTrigger;
/** @deprecated `NotionRenderer` hydrates it through `'use client'` */
export const CodeBlock = codeblock.CodeBlock;
/** @deprecated `NotionRenderer` hydrates it through `'use client'` */
export const Pre = codeblock.Pre;
/** @deprecated `NotionRenderer` hydrates it through `'use client'` */
export const Heading = heading.Heading;
