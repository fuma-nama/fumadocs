import { Outlet } from 'react-router';
import { Layout as ClientLayout } from './client';
import '../app.css';

export default function App() {
  return <Outlet />;
}

export function Layout({ children }: { children: React.ReactNode }) {
  // This is necessary for the bundler to inject the needed CSS assets.
  return <ClientLayout>{children}</ClientLayout>;
}

export { ErrorBoundary } from './client';
