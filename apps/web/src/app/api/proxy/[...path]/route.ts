import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "../../auth/[action]/route";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

/**
 * Forwards dashboard requests to {API_URL}/api/v1/*.
 * When the user is signed in (`qira_session` cookie), sends `Authorization: Bearer <token>`
 * so every QR, CardDesign, Batch and Analytics query is scoped to their user account.
 */
async function forward(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const target = `${API_URL}/api/v1/${path.map(encodeURIComponent).join("/")}${req.nextUrl.search}`;

  const headers = new Headers();
  const contentType = req.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);

  const sessionToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (sessionToken) {
    headers.set("authorization", `Bearer ${sessionToken}`);
  }
  headers.set("x-api-key", process.env.WEB_API_KEY ?? "");

  const hasBody = !["GET", "HEAD"].includes(req.method);
  const res = await fetch(target, {
    method: req.method,
    headers,
    body: hasBody ? req.body : undefined,
    ...(hasBody ? { duplex: "half" } : {}),
    cache: "no-store",
  } as RequestInit);

  const out = new Headers();
  for (const h of ["content-type", "content-disposition"]) {
    const v = res.headers.get(h);
    if (v) out.set(h, v);
  }
  return new Response(res.body, { status: res.status, headers: out });
}

export { forward as GET, forward as POST, forward as PATCH, forward as PUT, forward as DELETE };
