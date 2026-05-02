import { defineType, defineField } from 'sanity';

export const step = defineType({
  name: 'step',
  type: 'object',
  title: 'Step',
  fields: [
    defineField({
      name: 'body',
      title: 'Body',
      type: 'blockContent',
    }),
  ],
});

export const steps = defineType({
  name: 'steps',
  type: 'object',
  title: 'Steps',
  fields: [
    defineField({
      name: 'items',
      title: 'Steps',
      type: 'array',
      of: [{ type: 'step' }],
    }),
  ],
  preview: {
    select: {
      items: 'items',
    },
    prepare({ items = [] }) {
      return {
        title: `${items.length} Steps`,
      };
    },
  },
});
