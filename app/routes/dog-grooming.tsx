// app/routes/dog-grooming.tsx

import { Link, useLoaderData } from "@remix-run/react";

import type { LoaderFunction } from "@remix-run/node";
import { getDirectoryBySlug } from "~/models/directory.server";
import { getListingsForDirectory } from "~/models/listings.server";
import { json } from "@remix-run/node";

export const loader: LoaderFunction = async () => {
  const slug = "dog-grooming";
  const directory = await getDirectoryBySlug(slug);
  if (!directory) {
    throw new Response("Directory not found", { status: 404 });
  }
  const listings = await getListingsForDirectory(directory.id, 100, 0);
  return json({ directory, listings });
};

export default function DogGroomingPage() {
  const { directory, listings } = useLoaderData<typeof loader>();

  return (
    <main className="container mx-auto p-4">
      <h1 className="text-3xl font-bold">{directory.name}</h1>
      {listings.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {listings.map((listing) => (
            <li key={listing.id}>
              <Link
                to={`/dog-grooming/${listing.id}-${listing.slug}`}
                className="text-blue-600 hover:underline"
              >
                {listing.name}
              </Link>
              {listing.address && (
                <p className="text-sm text-gray-600">{listing.address}</p>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p>No listings available yet.</p>
      )}
    </main>
  );
}
