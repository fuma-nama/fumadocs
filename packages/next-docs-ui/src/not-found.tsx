import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="py-8 lg:py-16">
      <h1 className="text-4xl font-bold mb-2">Not Found</h1>
      <p className="text-muted-foreground mb-8">
        This page could not be found.
      </p>
      <Link
        href="/"
        className="px-4 bg-primary py-2 text-primary-foreground text-sm rounded-md font-medium"
      >
        Back to Home
      </Link>
    </div>
  )
}
