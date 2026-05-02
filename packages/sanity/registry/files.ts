import { defineType, defineField } from 'sanity';

const fileTreeItems = [{ type: 'file' }, { type: 'folder' }];

export const file = defineType({
  name: 'file',
  type: 'object',
  title: 'File',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: (r) => r.required(),
    }),
  ],
});

export const folder = defineType({
  name: 'folder',
  type: 'object',
  title: 'Folder',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'defaultOpen',
      title: 'Open by default',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'children',
      title: 'Children',
      type: 'array',
      of: fileTreeItems,
    }),
  ],
});

export const files = defineType({
  name: 'files',
  type: 'object',
  title: 'Files',
  fields: [
    defineField({
      name: 'children',
      title: 'Children',
      type: 'array',
      of: fileTreeItems,
    }),
  ],
});
