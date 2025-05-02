import { DynamicLink } from 'fumadocs-core/dynamic-link';

export default function HomePage() {
  return (
    <main
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        textAlign: 'center',
        justifyContent: 'center',
      }}
    >
      <h1
        style={{
          fontSize: '2rem',
          fontWeight: 'bold',
          marginBottom: '1rem',
        }}
      >
        Hello World
      </h1>
      <p>
        You can open{' '}
        <DynamicLink
          href="/[lang]/docs"
          style={{
            fontWeight: '600',
            textDecoration: 'underline',
          }}
        >
          /docs
        </DynamicLink>{' '}
        and see the documentation.
      </p>
    </main>
  );
}
