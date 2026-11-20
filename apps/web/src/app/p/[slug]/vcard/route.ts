import type { NextRequest } from "next/server";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const res = await fetch(`${API_URL}/api/public/landings/${encodeURIComponent(slug)}/vcard`, {
    cache: "no-store",
  });

  if (!res.ok) {
    return new Response("vCard not found", { status: res.status });
  }

  const body = await res.text();
  const headers = new Headers();
  headers.set("content-type", res.headers.get("content-type") ?? "text/vcard; charset=utf-8");
  const disposition = res.headers.get("content-disposition");
  if (disposition) {
    headers.set("content-disposition", disposition);
  } else {
    headers.set("content-disposition", `attachment; filename="${slug}.vcf"`);
  }

  return new Response(body, {
    status: 200,
    headers,
  });
}
