// app/routes/robots.txt.tsx

import type { LoaderFunction } from "@remix-run/node";

export const loader: LoaderFunction = async () => {
  const robots = `
User-agent: *
Disallow:

Sitemap: https://baobaonames.com/sitemap.xml
  `.trim();

  return new Response(robots, {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
    },
  });
};
