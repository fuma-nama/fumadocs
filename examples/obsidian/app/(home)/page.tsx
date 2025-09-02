import Link from 'next/link';

export default function HomePage() {
  return (
    <div
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
        <Link
          href="/docs"
          style={{
            fontWeight: '600',
            textDecoration: 'underline',
          }}
        >
          /docs
        </Link>{' '}
        and see the documentation.
      </p>
    </div>
  );
}
