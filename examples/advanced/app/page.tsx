import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="h-screen flex flex-col text-center justify-center">
      <h1 className="text-2xl font-bold mb-4">Hello World</h1>
      <p className="text-muted-foreground">
        You can open{' '}
        <Link href="/docs" className="text-foreground font-semibold underline">
          /docs
        </Link>{' '}
        and see the documentation.
      </p>
    </main>
  )
}
