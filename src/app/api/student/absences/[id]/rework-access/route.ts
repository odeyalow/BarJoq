import { AbsenceStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getStudentOwnedAbsence } from "@/lib/absence-service";
import { requireStudentRequestSession } from "@/lib/auth";
import { notifyTeacherAboutReworkAccessRequest } from "@/lib/notification-service";
import { buildStudentPortalPayload } from "@/lib/portal-data";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requireStudentRequestSession(request);

  if (!session?.user.student) {
    return NextResponse.json(
      { error: "Требуется вход студента." },
      { status: 401 },
    );
  }

  const { id } = await context.params;
  const absence = await getStudentOwnedAbsence(id, session.user.student.id);

  if (!absence) {
    return NextResponse.json({ error: "Пропуск не найден." }, { status: 404 });
  }

  if (absence.status !== AbsenceStatus.EXPIRED) {
    return NextResponse.json(
      { error: "Для этого пропуска нельзя запросить повторный доступ." },
      { status: 400 },
    );
  }

  if (!absence.assignmentSentAt) {
    return NextResponse.json(
      {
        error:
          "Повторный доступ доступен только после истечения срока на ответ по выданному заданию.",
      },
      { status: 400 },
    );
  }

  if (absence.reworkAccessRequestedAt) {
    return NextResponse.json(
      { error: "Запрос на повторный доступ уже отправлен." },
      { status: 400 },
    );
  }

  await prisma.absence.update({
    where: {
      id: absence.id,
    },
    data: {
      reworkAccessRequestedAt: new Date(),
    },
  });

  await notifyTeacherAboutReworkAccessRequest(absence.id);

  return NextResponse.json(await buildStudentPortalPayload(session.user.id));
}
