import { Suspense } from 'react';
import { Counter } from './counter';

export default function App() {
  return (
    <div style={{ border: '3px red dashed', margin: '1em', padding: '1em' }}>
      <h1>Hello World!!</h1>
      <h3>This is a server component.</h3>
      <Suspense fallback="Pending...">
        <ServerMessage />
      </Suspense>
      <Counter />
      <div>{new Date().toISOString()}</div>
    </div>
  );
}

const ServerMessage = async () => {
  await new Promise((resolve) => setTimeout(resolve, 2000));
  return <p>Hello from server!</p>;
};
