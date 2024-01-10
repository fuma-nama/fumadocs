import { generate } from './generate-docs';

void generate('./petstore.yaml').then(() => {
  console.log('Generated');
});
