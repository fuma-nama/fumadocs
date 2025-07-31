import '../styles/globals.css';

import { ReactNode } from 'react';

type RootLayoutProps = { children: ReactNode; path: string };

export default async function RootLayout({ children }: RootLayoutProps) {
  return <>{children}</>;
}

export const getConfig = async () => {
  return {
    render: 'static',
  };
};
