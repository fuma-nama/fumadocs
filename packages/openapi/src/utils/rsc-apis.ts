import { cache } from 'react';

export { cache };

// if the components are rendered in the server do not show any fallback, render the full components html
export function ClientSuspense({ children }: { children: React.ReactNode }) {
  return children;
}
