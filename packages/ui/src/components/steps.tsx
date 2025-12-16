import type { ReactNode } from 'react';

export function Steps({ children }: { children: ReactNode }) {
  return <div className="fd-steps">{children}</div>;
}

export function Step({ children }: { children: ReactNode }) {
  return <div className="fd-step">{children}</div>;
}
