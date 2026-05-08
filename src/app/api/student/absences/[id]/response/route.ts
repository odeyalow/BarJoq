import { AbsenceStatus, AttachmentOwnerType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import {
  deleteAbsenceAttachments,
  getStudentOwnedAbsence,
  syncAbsenceAttachments,
} from "@/lib/absence-service";
import { isStudentAbsenceDeadlineExpired } from "@/lib/absence-deadlines";
import { requireStudentRequestSession } from "@/lib/auth";
import {
  notifyStudentAboutResponseSubmitted,
  notifyTeacherAboutResponse,
  notifyTeacherAboutResponseDeletion,
} from "@/lib/notification-service";
import { buildStudentPortalPayload } from "@/lib/portal-data";
import { prisma } from "@/lib/prisma";

function buildDeadlineCheckPayload(absence: {
  assignmentSentAt: Date | null;
  createdAt: Date;
  date: Date;
  requestedAt: Date | null;
  status: AbsenceStatus;
  updatedAt: Date;
}) {
  return {
    assignment: absence.assignmentSentAt
      ? {
          sentAt: absence.assignmentSentAt.toISOString(),
        }
      : undefined,
    createdAt: absence.createdAt.toISOString(),
    date: absence.date.toISOString(),
    requestedAt: absence.requestedAt?.toISOString(),
    status:
      absence.status === AbsenceStatus.ASSIGNED
        ? "assignment_received"
        : absence.status === AbsenceStatus.SUBMITTED
          ? "under_review"
          : "missed",
    updatedAt: absence.updatedAt.toISOString(),
  } as const;
}

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

  if (
    absence.status !== AbsenceStatus.ASSIGNED &&
    absence.status !== AbsenceStatus.SUBMITTED
  ) {
    return NextResponse.json(
      { error: "Для этого пропуска нельзя отправить ответ." },
      { status: 400 },
    );
  }

  if (isStudentAbsenceDeadlineExpired(buildDeadlineCheckPayload(absence))) {
    return NextResponse.json(
      { error: "Срок на отправку ответа истек. Обратитесь к преподавателю." },
      { status: 400 },
    );
  }

  const formData = await request.formData();
  const text = String(formData.get("text") ?? "").trim();

  if (!text) {
    return NextResponse.json(
      { error: "Добавьте текст ответа." },
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

  await prisma.absence.update({
    where: {
      id: absence.id,
    },
    data: {
      status: AbsenceStatus.SUBMITTED,
      responseText: text,
      responseSubmittedAt: absence.responseSubmittedAt ?? now,
      responseEditedAt: absence.responseSubmittedAt ? now : null,
    },
  });

  await syncAbsenceAttachments({
    absenceId: absence.id,
    ownerType: AttachmentOwnerType.RESPONSE,
    keepAttachmentIds,
    files,
  });

  await notifyTeacherAboutResponse(absence.id);
  await notifyStudentAboutResponseSubmitted(absence.id);

  return NextResponse.json(await buildStudentPortalPayload(session.user.id));
}

export async function DELETE(
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

  if (absence.status !== AbsenceStatus.SUBMITTED) {
    return NextResponse.json(
      { error: "Для этого пропуска нельзя удалить ответ." },
      { status: 400 },
    );
  }

  if (isStudentAbsenceDeadlineExpired(buildDeadlineCheckPayload(absence))) {
    return NextResponse.json(
      { error: "Срок на изменение ответа истек. Обратитесь к преподавателю." },
      { status: 400 },
    );
  }

  await prisma.absence.update({
    where: {
      id: absence.id,
    },
    data: {
      status: AbsenceStatus.ASSIGNED,
      responseText: null,
      responseSubmittedAt: null,
      responseEditedAt: null,
    },
  });

  await deleteAbsenceAttachments(absence.id, AttachmentOwnerType.RESPONSE);
  await notifyTeacherAboutResponseDeletion(absence.id);

  return NextResponse.json(await buildStudentPortalPayload(session.user.id));
}
