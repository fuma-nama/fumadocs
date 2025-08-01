import '../styles/globals.css';
import type { ReactNode } from 'react';
import { Provider } from '../components/provider';

export default function RootLayout({
  children,
}: {
  children: ReactNode;
  path: string;
}) {
  return <Provider>{children}</Provider>;
}

export const getConfig = async () => {
  return {
    render: 'static',
  };
};
