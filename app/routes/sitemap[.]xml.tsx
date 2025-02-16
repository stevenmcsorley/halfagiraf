// app/routes/sitemap.xml.ts
import type { LoaderFunction } from "@remix-run/node";
import { client } from "~/utils/db.server";

/**
 * By convention, this route is at /sitemap.xml.
 * Remix will allow requests to /sitemap.xml to invoke this loader.
 */
export const loader: LoaderFunction = async () => {
  // 1) Fetch all directories (niches)
  const directoriesResult = await client.query<{
    id: number;
    slug: string;
    name: string;
  }>(`
    SELECT id, slug, name 
    FROM directories
    ORDER BY name ASC
  `);
  const directories = directoriesResult.rows;

  // Start with the homepage URL.
  const urls: string[] = ["/"];

  // Add each directory homepage URL (e.g. /dog-grooming)
  for (const dir of directories) {
    urls.push(`/${dir.slug}`);
  }

  // For each directory, fetch the listings and add their URLs.
  for (const dir of directories) {
    const listingsResult = await client.query<{ slug: string }>(
      `SELECT slug FROM listings WHERE directory_id = $1`,
      [dir.id]
    );
    const listings = listingsResult.rows;
    for (const listing of listings) {
      // Using encodeURIComponent for the listing slug is a safe measure.
      urls.push(`/${dir.slug}/${encodeURIComponent(listing.slug)}`);
    }
  }

  // Define your domain (ensure to update if it ever changes)
  const domain = "https://halfagiraf.com";

  // Build the XML for the sitemap.
  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  sitemap += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  for (const path of urls) {
    const loc = `${domain}${path}`;
    sitemap += `  <url>\n`;
    sitemap += `    <loc>${loc}</loc>\n`;
    sitemap += `  </url>\n`;
  }

  sitemap += `</urlset>\n`;

  return new Response(sitemap, {
    status: 200,
    headers: {
      "Content-Type": "application/xml",
    },
  });
};
