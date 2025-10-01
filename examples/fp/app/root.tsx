import { Outlet } from 'react-router';
import { Layout as ClientLayout } from 'fumapress/src/routes/root/client';
import './styles.css';

export { ErrorBoundary } from 'fumapress/src/routes/root/client';

export function Layout({ children }: { children: React.ReactNode }) {
  return <ClientLayout>{children}</ClientLayout>;
}

export default function Component() {
  return <Outlet />;
}
