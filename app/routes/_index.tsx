import { Link, useLoaderData } from "@remix-run/react";

// app/routes/_index.tsx
import type { LoaderFunction } from "@remix-run/node";
import { getDirectories } from "~/models/directory.server";
import { json } from "@remix-run/node";

export const loader: LoaderFunction = async () => {
  const directories = await getDirectories();
  return json({ directories });
};

export default function HomePage() {
  const { directories } = useLoaderData<typeof loader>();

  return (
    <main className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">Welcome to Half a Giraff</h1>
      <p className="mb-6">Choose a directory:</p>
      <ul className="space-y-2">
        {directories.map((dir) => (
          <li key={dir.id}>
            <Link className="link link-primary" to={`/${dir.slug}`}>
              {dir.name}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
