import { Outlet } from 'react-router';
import { Layout as ClientLayout } from 'fumapress/routes/root/client.js';
import './styles.css';

export { ErrorBoundary } from 'fumapress/routes/root/client.js';

export function Layout({ children }: { children: React.ReactNode }) {
  return <ClientLayout>{children}</ClientLayout>;
}

export default function Component() {
  return <Outlet />;
}
