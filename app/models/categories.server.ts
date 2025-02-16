// app/models/categories.server.ts

import { client } from "~/utils/db.server";

export interface Category {
  id: number;
  directory_id: number;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Retrieve all categories for a given directory.
 */
export async function getCategoriesForDirectory(
  directoryId: number
): Promise<Category[]> {
  const result = await client.query<Category>(
    `
    SELECT *
    FROM categories
    WHERE directory_id = $1
    ORDER BY name ASC
  `,
    [directoryId]
  );
  return result.rows;
}
