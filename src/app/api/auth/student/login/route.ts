import { compare } from "bcryptjs";
import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { applySessionCookie, createSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
    };

    const email = body.email?.trim().toLowerCase();
    const password = body.password?.trim();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Введите email и пароль." },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
      include: {
        student: true,
      },
    });

    if (!user || user.role !== UserRole.STUDENT || !user.student) {
      return NextResponse.json(
        { error: "Студент с такими данными не найден." },
        { status: 400 },
      );
    }

    const isPasswordValid = await compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Неверный пароль." },
        { status: 400 },
      );
    }

    const session = await createSession(user.id);
    const response = NextResponse.json({ ok: true });
    applySessionCookie(response, session);
    return response;
  } catch {
    return NextResponse.json(
      { error: "Не удалось выполнить вход." },
      { status: 500 },
    );
  }
}
