import '../styles/globals.css';
import type { ReactNode } from 'react';
import { Provider } from '../components/provider';

type RootLayoutProps = { children: ReactNode; path: string };

export default async function RootLayout({ children }: RootLayoutProps) {
  return <Provider>{children}</Provider>;
}

export const getConfig = async () => {
  return {
    render: 'static',
  };
};
