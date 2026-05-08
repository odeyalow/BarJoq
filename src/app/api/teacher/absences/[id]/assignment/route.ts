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
import {
  notifyDepartmentHeadAboutTeacherConfirmedRequest,
  notifyStudentAboutAwaitingDepartmentHead,
} from "@/lib/notification-service";

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
    absence.status !== AbsenceStatus.REQUESTED &&
    absence.status !== AbsenceStatus.PENDING_APPROVAL &&
    absence.status !== AbsenceStatus.ASSIGNED
  ) {
    return NextResponse.json(
      { error: "Для этого пропуска нельзя сохранить задание." },
      { status: 400 },
    );
  }

  if (
    absence.status !== AbsenceStatus.ASSIGNED &&
    isStudentAbsenceDeadlineExpired({
      createdAt: absence.createdAt.toISOString(),
      date: absence.date.toISOString(),
      requestedAt: absence.requestedAt?.toISOString(),
      status:
        absence.status === AbsenceStatus.PENDING_APPROVAL
          ? "awaiting_head"
          : "request_sent",
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
  const nextStatus =
    absence.status === AbsenceStatus.ASSIGNED
      ? AbsenceStatus.ASSIGNED
      : AbsenceStatus.PENDING_APPROVAL;

  await prisma.absence.update({
    where: {
      id: absence.id,
    },
    data: {
      status: nextStatus,
      assignmentText: text,
      assignmentSentAt:
        nextStatus === AbsenceStatus.ASSIGNED ? absence.assignmentSentAt ?? now : null,
      assignmentEditedAt: absence.assignmentText ? now : null,
      teacherConfirmedAt:
        nextStatus === AbsenceStatus.PENDING_APPROVAL
          ? absence.teacherConfirmedAt ?? now
          : absence.teacherConfirmedAt,
    },
  });

  await syncAbsenceAttachments({
    absenceId: absence.id,
    ownerType: AttachmentOwnerType.ASSIGNMENT,
    keepAttachmentIds,
    files,
  });

  if (nextStatus === AbsenceStatus.PENDING_APPROVAL) {
    await notifyDepartmentHeadAboutTeacherConfirmedRequest(absence.id);
    await notifyStudentAboutAwaitingDepartmentHead(absence.id);
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

  if (
    absence.status !== AbsenceStatus.ASSIGNED &&
    absence.status !== AbsenceStatus.PENDING_APPROVAL
  ) {
    return NextResponse.json(
      { error: "Для этого пропуска нельзя удалить задание." },
      { status: 400 },
    );
  }

  await prisma.absence.update({
    where: {
      id: absence.id,
    },
    data: {
      status: AbsenceStatus.REQUESTED,
      assignmentText: null,
      assignmentSentAt: null,
      assignmentEditedAt: null,
      teacherConfirmedAt: null,
      departmentHeadApprovedAt: null,
    },
  });

  await deleteAbsenceAttachments(absence.id, AttachmentOwnerType.ASSIGNMENT);

  return NextResponse.json(await buildTeacherPortalPayload(session.user.id));
}
