import {
  Form,
  Link,
  Outlet,
  useLoaderData,
  useMatches,
  useSearchParams,
} from "@remix-run/react";
import {
  getListingsForDirectory,
  searchListingsForDirectory,
  searchListingsNearMe,
} from "~/models/listings.server";
import { useEffect, useState } from "react";

import type { LoaderFunction } from "@remix-run/node";
import { getDirectoryBySlug } from "~/models/directory.server";
import { json } from "@remix-run/node";

// Helper: a simple delay function for retries
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  // Get the raw query parameter (free-text or postcode)
  const rawQuery = url.searchParams.get("q")?.trim() || "";
  // Work with a mutable query
  let query = rawQuery;
  const page = Number(url.searchParams.get("page")) || 1;
  const limit = 20;
  const offset = (page - 1) * limit;
  const radius = Number(url.searchParams.get("radius")) || 10; // default radius in km

  const directory = await getDirectoryBySlug("ev-charging");
  if (!directory) {
    throw new Response("Directory not found", { status: 404 });
  }

  // If no search query is provided, return empty results.
  if (!rawQuery) {
    return json({
      directory,
      listings: [],
      query: "",
      page,
      searchType: "none",
    });
  }

  let listings: any[] = [];
  let searchType = "default";
  let userLat: number | null = null;
  let userLng: number | null = null;

  // Define a regex for UK postcodes (roughly).
  const postcodeRegex = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;
  if (query && postcodeRegex.test(query)) {
    try {
      // Build the Nominatim URL using the internal hostname "nominatim" (accessible within Docker)
      const nominatimUrl = `http://nominatim:8080/search?postalcode=${encodeURIComponent(
        query
      )}&format=json&addressdetails=1&limit=1`;
      let attempts = 0;
      const maxAttempts = 3;
      let res;
      while (attempts < maxAttempts) {
        res = await fetch(nominatimUrl);
        if (res.ok) break;
        attempts++;
        await delay(1000);
      }
      if (!res || !res.ok) {
        throw new Error(
          `Geocode fetch error: ${res?.statusText || "No response"}`
        );
      }
      const geocodeData = await res.json();
      if (Array.isArray(geocodeData) && geocodeData.length > 0) {
        userLat = Number(geocodeData[0].lat);
        userLng = Number(geocodeData[0].lon);
        console.log("Geocode data:", geocodeData);
        // Override the query so that the near-me branch is used.
        query = "near me";
      }
    } catch (error) {
      console.error("Error fetching geocode data:", error);
    }
  }

  // Allow manual override if lat/lng are provided in the URL.
  const latParam = url.searchParams.get("lat");
  const lngParam = url.searchParams.get("lng");
  if (latParam && lngParam) {
    userLat = Number(latParam);
    userLng = Number(lngParam);
  }

  if (userLat != null && userLng != null) {
    listings = await searchListingsNearMe(
      directory.id,
      query,
      userLat,
      userLng,
      radius,
      limit,
      offset
    );
    searchType = "near-me";
  } else {
    listings = await searchListingsForDirectory(
      directory.id,
      query,
      limit,
      offset
    );
    searchType = "text";
  }

  return json({ directory, listings, query, page, searchType });
};

export default function EVChargingDirectoryPage() {
  const { directory, listings, query, page } = useLoaderData<typeof loader>();
  const matches = useMatches();
  const childActive = matches.some((match) => match.id.includes("$listing"));

  // Track the user's current coordinates (if available) in state.
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [searchParams, setSearchParams] = useSearchParams();

  // On mount, if lat/lng aren’t already in the URL, try to use the browser’s geolocation.
  useEffect(() => {
    if (!searchParams.get("lat") && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setCoords({ lat, lng });
          setSearchParams((prev) => {
            prev.set("lat", lat.toString());
            prev.set("lng", lng.toString());
            if (!prev.get("radius")) {
              prev.set("radius", "10");
            }
            return prev;
          });
        },
        (error) => {
          console.error("Error getting geolocation:", error);
        }
      );
    }
  }, [setSearchParams, searchParams]);

  return (
    <main className="container mx-auto p-4">
      <h1 className="text-3xl font-bold">{directory.name}</h1>

      {/* Search Form: Only one visible text input for the query */}
      <Form method="get" className="mb-4 flex flex-col gap-2">
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder='Search listings (e.g. "ChargePoint", "Glasgow", or a postcode)...'
          className="input input-bordered w-full"
        />
        {/* Hidden inputs for lat, lng, and radius */}
        <input type="hidden" name="lat" value={coords ? coords.lat : ""} />
        <input type="hidden" name="lng" value={coords ? coords.lng : ""} />
        <input type="hidden" name="radius" value="10" />
        <button type="submit" className="btn btn-primary">
          Search
        </button>
      </Form>

      {/* Only show listings if there was a search (i.e. query is non-empty) */}
      {!childActive && query && (
        <>
          {listings.length === 0 ? (
            <p>No listings found.</p>
          ) : (
            <ul>
              {listings.map((listing) => (
                <li key={listing.id} className="mb-2">
                  <Link
                    className="link link-primary"
                    to={`${listing.id}-${listing.slug}`}
                  >
                    {listing.name}
                  </Link>
                  {listing.address && (
                    <p className="text-sm text-gray-600">{listing.address}</p>
                  )}
                </li>
              ))}
            </ul>
          )}

          {/* Simple Pagination Controls */}
          <div className="mt-4 flex justify-between">
            {page > 1 && (
              <Link to={`?page=${page - 1}${query ? `&q=${query}` : ""}`}>
                Previous
              </Link>
            )}
            <Link to={`?page=${page + 1}${query ? `&q=${query}` : ""}`}>
              Next
            </Link>
          </div>
        </>
      )}

      {/* Optionally, if no search has been done, prompt the user */}
      {!childActive && !query && <p>Please enter a search term above.</p>}

      {/* Render the individual listing if a child route is active */}
      <Outlet />
    </main>
  );
}
