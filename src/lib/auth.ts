import { randomBytes } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const sessionCookieName = "barjoq_session";
export const sessionShadowCookieName = "barjoq_session_shadow";

const sessionDurationMs = 1000 * 60 * 60 * 24 * 30;
const sessionDurationSeconds = Math.floor(sessionDurationMs / 1000);

function buildSessionExpiry() {
  return new Date(Date.now() + sessionDurationMs);
}

function getCookieConfig(
  expires: Date,
  options?: {
    httpOnly?: boolean;
  },
) {
  return {
    httpOnly: options?.httpOnly ?? true,
    maxAge: sessionDurationSeconds,
    priority: "high" as const,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  };
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = buildSessionExpiry();

  await prisma.session.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });

  return {
    token,
    expiresAt,
  };
}

export function applySessionCookie(
  response: NextResponse,
  session: { token: string; expiresAt: Date },
) {
  response.cookies.set(
    sessionCookieName,
    session.token,
    getCookieConfig(session.expiresAt),
  );
  response.cookies.set(
    sessionShadowCookieName,
    session.token,
    getCookieConfig(session.expiresAt, {
      httpOnly: false,
    }),
  );
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(sessionCookieName, "", {
    ...getCookieConfig(new Date(0)),
    maxAge: 0,
  });
  response.cookies.set(sessionShadowCookieName, "", {
    ...getCookieConfig(new Date(0), {
      httpOnly: false,
    }),
    maxAge: 0,
  });
}

export async function deleteSessionByToken(token?: string | null) {
  if (!token) {
    return;
  }

  await prisma.session.deleteMany({
    where: {
      token,
    },
  });
}

async function getValidSessionByToken(token?: string | null) {
  if (!token) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: {
      token,
    },
    include: {
      user: {
        include: {
          student: true,
          teacher: true,
        },
      },
    },
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt <= new Date()) {
    await deleteSessionByToken(token);
    return null;
  }

  return session;
}

export async function getCurrentSession() {
  const cookieStore = await cookies();
  return getValidSessionByToken(
    cookieStore.get(sessionCookieName)?.value ??
      cookieStore.get(sessionShadowCookieName)?.value,
  );
}

export async function getCurrentSessionUser() {
  const session = await getCurrentSession();
  return session?.user ?? null;
}

export async function getRequestSession(request: NextRequest) {
  const requestToken =
    request.cookies.get(sessionCookieName)?.value ??
    request.cookies.get(sessionShadowCookieName)?.value;

  if (requestToken) {
    return getValidSessionByToken(requestToken);
  }

  const cookieStore = await cookies();
  return getValidSessionByToken(
    cookieStore.get(sessionCookieName)?.value ??
      cookieStore.get(sessionShadowCookieName)?.value,
  );
}

export async function requireStudentSession() {
  const session = await getCurrentSession();

  if (!session || session.user.role !== UserRole.STUDENT || !session.user.student) {
    redirect("/");
  }

  return session;
}

export async function requireTeacherSession() {
  const session = await getCurrentSession();

  if (!session || session.user.role !== UserRole.TEACHER || !session.user.teacher) {
    redirect("/teacher");
  }

  return session;
}

export async function requireStudentRequestSession(request: NextRequest) {
  const session = await getRequestSession(request);

  if (!session || session.user.role !== UserRole.STUDENT || !session.user.student) {
    return null;
  }

  return session;
}

export async function requireTeacherRequestSession(request: NextRequest) {
  const session = await getRequestSession(request);

  if (!session || session.user.role !== UserRole.TEACHER || !session.user.teacher) {
    return null;
  }

  return session;
}

export async function requireRegularTeacherSession() {
  const session = await requireTeacherSession();

  if (session.user.teacher?.isDepartmentHead) {
    redirect("/teacher/head");
  }

  return session;
}

export async function requireDepartmentHeadSession() {
  const session = await requireTeacherSession();

  if (!session.user.teacher?.isDepartmentHead) {
    redirect("/teacher/dashboard");
  }

  return session;
}

export async function requireRegularTeacherRequestSession(request: NextRequest) {
  const session = await requireTeacherRequestSession(request);

  if (!session || session.user.teacher?.isDepartmentHead) {
    return null;
  }

  return session;
}

export async function requireDepartmentHeadRequestSession(
  request: NextRequest,
) {
  const session = await requireTeacherRequestSession(request);

  if (!session || !session.user.teacher?.isDepartmentHead) {
    return null;
  }

  return session;
}
