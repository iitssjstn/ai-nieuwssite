import { getAdsenseClientId } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const clientId = getAdsenseClientId();
  const pubId = clientId ? clientId.replace(/^ca-/, "") : null;

  const body = pubId
    ? `google.com, ${pubId}, DIRECT, f08c47fec0942fa0\n`
    : "";

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
