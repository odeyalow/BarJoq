import { AbsenceStatus, AttachmentOwnerType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import {
  deleteAbsenceAttachments,
  getTeacherOwnedAbsence,
  syncAbsenceAttachments,
} from "@/lib/absence-service";
import { isStudentAbsenceDeadlineExpired } from "@/lib/absence-deadlines";
import { requireTeacherRequestSession } from "@/lib/auth";
import { buildTeacherPortalPayload } from "@/lib/portal-data";
import { prisma } from "@/lib/prisma";
import { notifyStudentAboutAssignment } from "@/lib/notification-service";

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
    absence.status !== AbsenceStatus.PENDING_APPROVAL &&
    absence.status !== AbsenceStatus.ASSIGNED
  ) {
    return NextResponse.json(
      {
        error:
          "Выдать задание можно только после того, как заведующий отделением подтвердит заявку студента.",
      },
      { status: 400 },
    );
  }

  if (
    absence.status !== AbsenceStatus.ASSIGNED &&
    isStudentAbsenceDeadlineExpired({
      createdAt: absence.createdAt.toISOString(),
      date: absence.date.toISOString(),
      requestedAt: absence.requestedAt?.toISOString(),
      status: "awaiting_head",
      updatedAt: absence.updatedAt.toISOString(),
    })
  ) {
    return NextResponse.json(
      { error: "Срок на выдачу задания по этой заявке уже истек." },
      { status: 400 },
    );
  }

  const formData = await request.formData();
  const text = String(formData.get("text") ?? "").trim();

  if (!text) {
    return NextResponse.json(
      { error: "Добавьте текст задания." },
      { status: 400 },
    );
  }

  const keepAttachmentIds = formData
    .getAll("keepAttachmentIds")
    .map((value) => String(value));
  const files = formData
    .getAll("files")
    .filter((value): value is File => value instanceof File && value.size > 0);
  const now = new Date();
  // Заявка уже одобрена заведующим отделением — преподаватель выдаёт задание,
  // и оно сразу становится доступно студенту.
  const isFirstAssignment = absence.status === AbsenceStatus.PENDING_APPROVAL;

  await prisma.absence.update({
    where: {
      id: absence.id,
    },
    data: {
      status: AbsenceStatus.ASSIGNED,
      assignmentText: text,
      assignmentSentAt: absence.assignmentSentAt ?? now,
      assignmentEditedAt: absence.assignmentText ? now : null,
      teacherConfirmedAt: absence.teacherConfirmedAt ?? now,
    },
  });

  await syncAbsenceAttachments({
    absenceId: absence.id,
    ownerType: AttachmentOwnerType.ASSIGNMENT,
    keepAttachmentIds,
    files,
  });

  if (isFirstAssignment) {
    await notifyStudentAboutAssignment(absence.id);
  }

  return NextResponse.json(await buildTeacherPortalPayload(session.user.id));
}

export async function DELETE(
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

  if (absence.status !== AbsenceStatus.ASSIGNED) {
    return NextResponse.json(
      { error: "Для этого пропуска нельзя удалить задание." },
      { status: 400 },
    );
  }

  // Удаляем задание, но одобрение заведующего отделением сохраняется —
  // заявка возвращается в статус ожидания задания от преподавателя.
  await prisma.absence.update({
    where: {
      id: absence.id,
    },
    data: {
      status: AbsenceStatus.PENDING_APPROVAL,
      assignmentText: null,
      assignmentSentAt: null,
      assignmentEditedAt: null,
      teacherConfirmedAt: null,
    },
  });

  await deleteAbsenceAttachments(absence.id, AttachmentOwnerType.ASSIGNMENT);

  return NextResponse.json(await buildTeacherPortalPayload(session.user.id));
}
