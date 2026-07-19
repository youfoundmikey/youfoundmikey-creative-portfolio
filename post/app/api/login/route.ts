import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, sessionToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { password } = await req.json().catch(() => ({ password: "" }));
  const expected = process.env.APP_PASSWORD;

  if (!expected) {
    return NextResponse.json(
      { error: "APP_PASSWORD is not set" },
      { status: 500 }
    );
  }

  if (typeof password !== "string" || password !== expected) {
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await sessionToken(expected), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // a year. it's your phone.
  });
  return res;
}
