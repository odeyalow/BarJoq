import { AbsenceStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getTeacherOwnedAbsence } from "@/lib/absence-service";
import { requireTeacherRequestSession } from "@/lib/auth";
import { notifyStudentAboutManualNb } from "@/lib/notification-service";
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

  if (absence.status !== AbsenceStatus.MISSED) {
    return NextResponse.json(
      { error: "Для этого пропуска нельзя поставить н/б." },
      { status: 400 },
    );
  }

  if (absence.markedNbAt) {
    return NextResponse.json(
      { error: "Для этого пропуска н/б уже зафиксировано." },
      { status: 400 },
    );
  }

  await prisma.absence.update({
    where: {
      id: absence.id,
    },
    data: {
      markedNbAt: new Date(),
    },
  });

  await notifyStudentAboutManualNb(absence.id);

  return NextResponse.json(await buildTeacherPortalPayload(session.user.id));
}
