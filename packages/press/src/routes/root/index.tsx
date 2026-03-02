import { Outlet } from 'react-router';
import { Layout as RootLayout } from '../../layouts/root';

export { ErrorBoundary } from './client.js';

export function Layout({ children }: { children: React.ReactNode }) {
  return <RootLayout>{children}</RootLayout>;
}

export default function Component() {
  return <Outlet />;
}
