// app/models/directory.server.ts

import { client } from "~/utils/db.server";

export interface Directory {
  id: number;
  name: string;
  slug: string;
  seo_meta: Record<string, unknown> | null;
  analytics_id: string | null;
  adsense_id: string | null;
  theme: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export async function getDirectories(): Promise<Directory[]> {
  const result = await client.query<Directory>(`
    SELECT *
    FROM directories
    ORDER BY name ASC
  `);
  return result.rows;
}

export async function getDirectoryBySlug(
  slug: string
): Promise<Directory | null> {
  const result = await client.query<Directory>(
    `
    SELECT *
    FROM directories
    WHERE slug = $1
  `,
    [slug]
  );
  return result.rows[0] || null;
}
