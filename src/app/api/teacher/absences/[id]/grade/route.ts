import { AbsenceStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getTeacherOwnedAbsence } from "@/lib/absence-service";
import { requireTeacherRequestSession } from "@/lib/auth";
import { notifyStudentAboutGrade } from "@/lib/notification-service";
import { buildTeacherPortalPayload } from "@/lib/portal-data";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requireTeacherRequestSession(request);

  if (!session?.user.teacher) {
    return NextResponse.json(
      { error: "Требуется вход преподавателя." },
      { status: 401 },
    );
  }

  const { id } = await context.params;
  const absence = await getTeacherOwnedAbsence(id, session.user.teacher.id);

  if (!absence) {
    return NextResponse.json({ error: "Пропуск не найден." }, { status: 404 });
  }

  if (
    absence.status !== AbsenceStatus.SUBMITTED &&
    absence.status !== AbsenceStatus.GRADED
  ) {
    return NextResponse.json(
      { error: "Для этого пропуска нельзя сохранить оценку." },
      { status: 400 },
    );
  }

  const body = (await request.json()) as { grade?: number };
  const grade = Number(body.grade);

  if (!Number.isFinite(grade) || grade < 0 || grade > 100) {
    return NextResponse.json(
      { error: "Оценка должна быть числом от 0 до 100." },
      { status: 400 },
    );
  }

  await prisma.absence.update({
    where: {
      id: absence.id,
    },
    data: {
      status: AbsenceStatus.GRADED,
      grade,
      completedAt: absence.completedAt ?? new Date(),
    },
  });

  await notifyStudentAboutGrade(absence.id);

  return NextResponse.json(await buildTeacherPortalPayload(session.user.id));
}
