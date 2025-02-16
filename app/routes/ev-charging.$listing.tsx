// app/routes/ev-charging.$listing.tsx

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

  // Expect the URL to be in the format "77-pod-point-charging-station"
  const match = listing.match(/^(\d+)-/);
  if (!match) {
    throw new Response("Invalid listing identifier", { status: 400 });
  }
  const id = Number(match[1]);

  // We assume the directory slug is "ev-charging"
  const directory = await getDirectoryBySlug("ev-charging");
  if (!directory) {
    throw new Response("Directory not found", { status: 404 });
  }

  // Fetch the listing by its numeric ID.
  const listingData = await getListingById(id);
  if (!listingData) {
    throw new Response("Listing not found", { status: 404 });
  }

  return json({ directory, listing: listingData });
};

export default function EVChargingListingPage() {
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
      {/* Add additional listing details as needed */}
    </main>
  );
}
