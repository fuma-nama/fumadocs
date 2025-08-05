import { Link } from "react-router";

export default function About() {
  return (
    <main className="mx-auto max-w-screen-xl px-4 py-8 lg:py-12">
      <article className="prose mx-auto">
        <h2>Featured Articles</h2>
        <ul className="space-y-4">
          <li>
            <Link to="/articles/article1" className="text-blue-600 hover:underline">
              The Importance of Modern Web Development
            </Link>
            <p className="text-sm text-gray-600">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam auctor lacinia felis...
            </p>
          </li>
          <li>
            <Link to="/articles/article2" className="text-blue-600 hover:underline">
              Exploring React Server Components
            </Link>
            <p className="text-sm text-gray-600">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque vel odio vel felis...
            </p>
          </li>
          <li>
            <Link to="/articles/article3" className="text-blue-600 hover:underline">
              Sata Andagi
            </Link>
            <p className="text-sm text-gray-600">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Fusce sit amet justo eget...
            </p>
          </li>
        </ul>
      </article>
    </main>
  );
}
