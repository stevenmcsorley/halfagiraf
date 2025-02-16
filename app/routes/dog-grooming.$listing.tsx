// app/routes/dog-grooming.$listing.tsx

import type { LoaderFunction } from "@remix-run/node";
import { getDirectoryBySlug } from "~/models/directory.server";
import { getListingById } from "~/models/listings.server";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

export const loader: LoaderFunction = async ({ params }) => {
  const { listing } = params;
  if (!listing) {
    throw new Response("Listing not specified", { status: 400 });
  }

  // Since this file is in the "dog-grooming" route, we know the directory slug.
  const directory = await getDirectoryBySlug("dog-grooming");
  if (!directory) {
    throw new Response("Directory not found", { status: 404 });
  }

  // Expect the URL to be in the format "77-dog-spot"; extract the numeric ID.
  const match = listing.match(/^(\d+)-/);
  if (!match) {
    throw new Response("Invalid listing identifier", { status: 400 });
  }
  const id = Number(match[1]);

  // Retrieve the individual listing using its numeric ID.
  const listingData = await getListingById(id);
  if (!listingData) {
    throw new Response("Listing not found", { status: 404 });
  }

  return json({ directory, listing: listingData });
};

export default function DogGroomingListingPage() {
  const { listing } = useLoaderData<typeof loader>();

  return (
    <main className="container mx-auto p-4">
      <h1 className="text-3xl font-bold">{listing.name}</h1>
      <p>{listing.details}</p>
      <p>
        <strong>Address:</strong> {listing.address}
      </p>
      <p>
        <a
          className="link link-primary"
          href={listing.website || "#"}
          target="_blank"
          rel="noopener noreferrer"
        >
          Visit Website
        </a>
      </p>
      {/* Additional fields can be added as needed */}
    </main>
  );
}
