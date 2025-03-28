import { type ReactNode, useEffect } from 'react';

export function Layout({ children }: { children: ReactNode }) {
  useEffect(() => {
    console.log('Layout');
  }, []);
  return <div>{children}</div>;
}
