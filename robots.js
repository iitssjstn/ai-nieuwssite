import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export default function robots() {
  const h = headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") || "https";
  const baseUrl = `${proto}://${host}`;

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/review", "/login", "/api"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
