import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://ezpakku.vercel.app";
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/site`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/new`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/items`, changeFrequency: "weekly", priority: 0.5 },
  ];
}
