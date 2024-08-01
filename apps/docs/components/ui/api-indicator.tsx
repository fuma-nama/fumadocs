import { type ReactNode } from 'react';

export function ApiIndicator(): ReactNode {
  return (
    <span className="ms-auto rounded-full bg-fd-primary px-2 py-0.5 text-xs font-medium text-fd-primary-foreground">
      API
    </span>
  );
}
