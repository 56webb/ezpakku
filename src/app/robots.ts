import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const isProd = process.env.VERCEL_ENV === "production";
  if (!isProd) {
    return {
      rules: { userAgent: "*", disallow: "/" },
    };
  }
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/rymin", "/login", "/share/", "/auth/"],
    },
    sitemap: "https://ezpakku.vercel.app/sitemap.xml",
  };
}
