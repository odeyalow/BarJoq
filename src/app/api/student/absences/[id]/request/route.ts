import { AbsenceStatus, AttachmentOwnerType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getStudentOwnedAbsence } from "@/lib/absence-service";
import { requireStudentRequestSession } from "@/lib/auth";
import { notifyTeacherAboutRequest } from "@/lib/notification-service";
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

  if (absence.status !== AbsenceStatus.MISSED) {
    return NextResponse.json(
      { error: "Для этого пропуска нельзя отправить заявку." },
      { status: 400 },
    );
  }

  if (absence.markedNbAt) {
    return NextResponse.json(
      { error: "По этому пропуску уже поставлено н/б, отправить заявку больше нельзя." },
      { status: 400 },
    );
  }

  const hasExcuseAttachment = absence.attachments.some(
    (attachment) => attachment.ownerType === AttachmentOwnerType.EXCUSE,
  );

  if (!hasExcuseAttachment) {
    return NextResponse.json(
      {
        error:
          "Сначала загрузите файл уважительной причины или справки. Без него заявку отправить нельзя.",
      },
      { status: 400 },
    );
  }

  await prisma.absence.update({
    where: {
      id: absence.id,
    },
    data: {
      requestedAt: absence.requestedAt ?? new Date(),
      status: AbsenceStatus.REQUESTED,
    },
  });

  await notifyTeacherAboutRequest(absence.id);

  return NextResponse.json(await buildStudentPortalPayload(session.user.id));
}
