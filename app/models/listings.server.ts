// app/models/listings.server.ts

import { client } from "~/utils/db.server";

export interface Listing {
  id: number;
  directory_id: number;
  name: string;
  slug: string;
  rating_avg: number | null;
  rating_count: number | null;
  details: string | null;
  place_url: string | null;
  image_url: string | null;
  location: string | null;
  address: string | null;
  open_status: string | null;
  website: string | null;
  telephone: string | null;
  hero_image: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  updated_at: string;
}

/**
 * Fetch listings for a given directory with pagination.
 */
export async function getListingsForDirectory(
  directoryId: number,
  limit: number,
  offset: number
): Promise<Listing[]> {
  const result = await client.query<Listing>(
    `
    SELECT *
    FROM listings
    WHERE directory_id = $1
    ORDER BY name ASC
    LIMIT $2 OFFSET $3
  `,
    [directoryId, limit, offset]
  );
  return result.rows;
}

/**
 * Search for listings by a query string across name, address, and location.
 * Uses PostgreSQL full-text search with weighted columns.
 */
export async function searchListingsForDirectory(
  directoryId: number,
  query: string,
  limit: number,
  offset: number
): Promise<Listing[]> {
  const result = await client.query<Listing>(
    `
    SELECT *,
      ts_rank(
        setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(address, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(location, '')), 'C'),
        plainto_tsquery('english', $2)
      ) AS rank
    FROM listings
    WHERE directory_id = $1
      AND (
        setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(address, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(location, '')), 'C')
      ) @@ plainto_tsquery('english', $2)
    ORDER BY rank DESC
    LIMIT $3 OFFSET $4
    `,
    [directoryId, query, limit, offset]
  );
  return result.rows;
}

/**
 * Search for listings near a given coordinate.
 * Uses the Haversine formula to calculate the distance in kilometers.
 */
export async function searchListingsNearMe(
  directoryId: number,
  query: string,
  userLat: number,
  userLng: number,
  radiusKm: number,
  limit: number,
  offset: number
): Promise<Listing[]> {
  const result = await client.query<Listing>(
    `
    SELECT sub.*
    FROM (
      SELECT *,
        2 * 6371 * asin(
          sqrt(
            power(sin((radians(latitude) - radians($2)) / 2), 2) +
            cos(radians($2)) * cos(radians(latitude)) *
            power(sin((radians(longitude) - radians($3)) / 2), 2)
          )
        ) AS distance,
        ts_rank(
          setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
          setweight(to_tsvector('english', coalesce(address, '')), 'B') ||
          setweight(to_tsvector('english', coalesce(location, '')), 'C'),
          plainto_tsquery('english', $4)
        ) AS rank
      FROM listings
      WHERE directory_id = $1
        AND (
          (LOWER($4) = 'near me')
          OR (
            setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
            setweight(to_tsvector('english', coalesce(address, '')), 'B') ||
            setweight(to_tsvector('english', coalesce(location, '')), 'C')
          ) @@ plainto_tsquery('english', $4)
        )
    ) sub
    WHERE sub.distance < $5
    ORDER BY sub.rank DESC, sub.distance ASC
    LIMIT $6 OFFSET $7
    `,
    [directoryId, userLat, userLng, query, radiusKm, limit, offset]
  );
  return result.rows;
}

/**
 * Fetch a single listing by its numeric ID.
 */
export async function getListingById(id: number): Promise<Listing | null> {
  const result = await client.query<Listing>(
    `
    SELECT *
    FROM listings
    WHERE id = $1
  `,
    [id]
  );
  return result.rows[0] || null;
}
