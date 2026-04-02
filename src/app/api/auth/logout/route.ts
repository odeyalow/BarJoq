import { NextRequest, NextResponse } from "next/server";
import {
  clearSessionCookie,
  deleteSessionByToken,
  sessionCookieName,
  sessionShadowCookieName,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const token =
      request.cookies.get(sessionCookieName)?.value ??
      request.cookies.get(sessionShadowCookieName)?.value;

    await deleteSessionByToken(token);

    const response = NextResponse.json({ ok: true });
    clearSessionCookie(response);
    return response;
  } catch {
    const response = NextResponse.json(
      { error: "Не удалось завершить сессию." },
      { status: 500 },
    );
    clearSessionCookie(response);
    return response;
  }
}
