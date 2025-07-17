export function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold">404</h1>
        <p className="mt-4 text-lg">Page not found</p>
        <a href="/" className="mt-6 inline-block text-blue-600 hover:underline">
          Go back home
        </a>
      </div>
    </div>
  );
}
