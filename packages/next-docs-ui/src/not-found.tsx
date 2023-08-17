import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="nd-py-8 lg:nd-py-16">
      <h1 className="nd-text-4xl nd-font-bold nd-mb-2">Not Found</h1>
      <p className="nd-text-muted-foreground nd-mb-8">
        This page could not be found.
      </p>
      <Link
        href="/"
        className="nd-px-4 nd-py-2 nd-bg-primary nd-text-primary-foreground nd-text-sm nd-font-medium nd-rounded-md"
      >
        Back to Home
      </Link>
    </div>
  )
}
