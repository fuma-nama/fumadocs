```tsx ts2js
import { ReactNode } from 'react';

export default function Layout({ children }: { children: ReactNode }) {
  const v: string = 'hello world' as any;

  return (
    <div>
      {children} {v}
    </div>
  );
}
```
