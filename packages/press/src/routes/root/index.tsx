import { Outlet } from 'react-router';
import { Layout as ClientLayout } from './client.js';

export { ErrorBoundary } from './client.js';

export function Layout({ children }: { children: React.ReactNode }) {
  return <ClientLayout>{children}</ClientLayout>;
}

export default function Component() {
  return <Outlet />;
}
