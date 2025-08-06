import { ReactRouterProvider } from 'fumadocs-core/framework/react-router';


export function FumadocsProvider({ children }: { children: React.ReactNode }) {
  return (
    <ReactRouterProvider>
            {children}
    </ReactRouterProvider>
  );
}