import { Outlet } from "react-router";

import { Layout as ClientLayout } from "./client";
import "./styles.css";

export { ErrorBoundary } from "./client";

export function Layout({ children }: { children: React.ReactNode }) {
  // This is necessary for the bundler to inject the needed CSS assets.
  return <ClientLayout>{children}</ClientLayout>;
}

export default function Component() {
  return <Outlet />;
}
