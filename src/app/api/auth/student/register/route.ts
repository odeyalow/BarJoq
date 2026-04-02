import { hash } from "bcryptjs";
import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { applySessionCookie, createSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      fullName?: string;
      group?: string;
      email?: string;
      password?: string;
    };

    const fullName = body.fullName?.trim();
    const groupName = body.group?.trim();
    const email = body.email?.trim().toLowerCase();
    const password = body.password?.trim();

    if (!fullName || !groupName || !email || !password) {
      return NextResponse.json(
        { error: "Заполните ФИО, группу, email и пароль." },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Пароль должен содержать минимум 6 символов." },
        { status: 400 },
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Этот email уже используется." },
        { status: 400 },
      );
    }

    const student = await prisma.studentProfile.findFirst({
      where: {
        fullName,
        group: {
          name: groupName,
        },
      },
      include: {
        group: true,
        user: true,
      },
    });

    if (!student) {
      return NextResponse.json(
        {
          error:
            "Студент с такими ФИО и группой не найден. Регистрация доступна только для существующих записей.",
        },
        { status: 400 },
      );
    }

    if (student.userId || student.user) {
      return NextResponse.json(
        { error: "Для этого студента аккаунт уже создан." },
        { status: 400 },
      );
    }

    const passwordHash = await hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: UserRole.STUDENT,
      },
    });

    await prisma.studentProfile.update({
      where: {
        id: student.id,
      },
      data: {
        email,
        userId: user.id,
      },
    });

    const session = await createSession(user.id);
    const response = NextResponse.json({ ok: true });
    applySessionCookie(response, session);
    return response;
  } catch {
    return NextResponse.json(
      { error: "Не удалось создать аккаунт студента." },
      { status: 500 },
    );
  }
}
