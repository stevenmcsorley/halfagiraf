// app/models/reviews.server.ts

import { client } from "~/utils/db.server";

export interface Review {
  id: number;
  listing_id: number;
  reviewer_name: string | null;
  rating: number;
  review: string | null;
  created_at: string;
}

/**
 * Retrieve all reviews for a specific listing.
 */
export async function getReviewsForListing(
  listingId: number
): Promise<Review[]> {
  const result = await client.query<Review>(
    `
    SELECT *
    FROM reviews
    WHERE listing_id = $1
    ORDER BY created_at DESC
  `,
    [listingId]
  );
  return result.rows;
}

/**
 * Add a new review for a listing.
 */
export async function addReviewForListing(
  listingId: number,
  reviewer_name: string,
  rating: number,
  review: string
): Promise<Review> {
  const result = await client.query<Review>(
    `
    INSERT INTO reviews (listing_id, reviewer_name, rating, review)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `,
    [listingId, reviewer_name, rating, review]
  );
  return result.rows[0];
}
