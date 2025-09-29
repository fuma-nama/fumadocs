import { createMiddleware, createStart } from '@tanstack/react-start';

const myGlobalMiddleware = createMiddleware().server((s) => {
  s.next();
});

export const startInstance = createStart(() => {
  return {
    requestMiddleware: [myGlobalMiddleware],
  };
});
