// TODO: better way?
export const defaultTranslations = {
  deprecated: 'Deprecated',
  schemaDefault: 'Default',
  schemaMatch: 'Match',
  schemaFormat: 'Format',
  schemaMultipleOf: 'Multiple Of',
  schemaRange: 'Range',
  schemaLength: 'Length',
  schemaProperties: 'Properties',
  schemaItems: 'Items',
  schemaValueIn: 'Value in',
  schemaExample: 'Example',
  schemaShowArray: 'Array Item',
  schemaHideArray: 'Array Item',
  schemaFilterPropertiesPlaceholder: 'Filter Properties',
  schemaFilterPropertiesEmpty: 'No property matching',

  // playground
  playgroundShowProperty: 'Show Property',
  playgroundPropertyPlaceholder: 'Enter Property Name',
  playgroundNewProperty: 'New',
  playgroundNewItem: 'New Item',
  playgroundRemoveItem: 'Remove Item',
  playgroundSelectPlaceholder: 'Select',
  playgroundSelected: 'Selected',
  playgroundInputUpload: 'Upload',
  playgroundInputUnset: 'Unset',
  playgroundInputPlaceholder: 'Enter value',
};

export type Translations = typeof defaultTranslations;

export { TranslationsProvider } from './i18n/client';
