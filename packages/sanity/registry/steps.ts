import { defineType, defineField } from 'sanity';

export const step = defineType({
  name: 'step',
  type: 'object',
  title: 'Step',
  fields: [
    defineField({
      name: 'children',
      title: 'Children',
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
      name: 'children',
      title: 'Children',
      type: 'array',
      of: [{ type: 'step' }],
    }),
  ],
});
