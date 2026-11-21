import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/utils";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 3600,
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ action: string }> },
) {
  const { action } = await params;
  if (action !== "me") {
    return NextResponse.json({ message: "Ruta no encontrada" }, { status: 404 });
  }

  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const res = await fetch(`${API_URL}/api/public/auth/me`, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  const data = await res.json();
  return NextResponse.json(data);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ action: string }> },
) {
  const { action } = await params;

  if (action === "logout") {
    const out = NextResponse.json({ ok: true });
    out.cookies.delete(SESSION_COOKIE_NAME);
    return out;
  }

  if (action !== "login" && action !== "register" && action !== "google") {
    return NextResponse.json({ message: "Acción no soportada" }, { status: 404 });
  }

  const body = await req.json();
  const res = await fetch(`${API_URL}/api/public/auth/${action}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const data = (await res.json()) as { token?: string; user?: unknown; message?: string };
  if (!res.ok || !data.token) {
    return NextResponse.json(
      { message: data.message ?? "Error de autenticación" },
      { status: res.status },
    );
  }

  const out = NextResponse.json({ user: data.user }, { status: res.status });
  out.cookies.set(SESSION_COOKIE_NAME, data.token, cookieOptions());
  return out;
}
