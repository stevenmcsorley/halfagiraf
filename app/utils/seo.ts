interface SeoMetaOptions {
  title: string;
  description: string;
  keywords?: string;
  canonical?: string;
  image?: string;
}

export const createSeoMeta = ({
  title,
  description,
  keywords,
  canonical,
  image,
}: SeoMetaOptions): {
  meta: Record<string, string>;
  link?: { rel: string; href: string };
} => {
  const meta = {
    title,
    description,
    ...(keywords ? { keywords } : {}),
    // Open Graph
    "og:title": title,
    "og:description": description,
    "og:url": canonical || "",
    ...(image ? { "og:image": image } : {}),
    "og:type": "website",
    // Twitter Card
    "twitter:card": "summary_large_image",
    "twitter:title": title,
    "twitter:description": description,
    ...(image ? { "twitter:image": image } : {}),
  };

  return {
    meta,
    link: canonical ? { rel: "canonical", href: canonical } : undefined,
  };
};
