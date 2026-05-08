import { AbsenceStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireDepartmentHeadRequestSession } from "@/lib/auth";
import { buildDepartmentHeadPortalPayload } from "@/lib/portal-data";
import { prisma } from "@/lib/prisma";
import {
  notifyStudentAboutAssignment,
  notifyTeacherAboutDepartmentHeadApproval,
} from "@/lib/notification-service";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requireDepartmentHeadRequestSession(request);

  if (!session?.user.teacher) {
    return NextResponse.json(
      { error: "Требуется вход зав. отделения." },
      { status: 401 },
    );
  }

  const { id } = await context.params;
  const absence = await prisma.absence.findUnique({
    where: {
      id,
    },
  });

  if (!absence) {
    return NextResponse.json({ error: "Пропуск не найден." }, { status: 404 });
  }

  if (absence.status !== AbsenceStatus.PENDING_APPROVAL) {
    return NextResponse.json(
      { error: "Эта заявка уже не ожидает подтверждения." },
      { status: 400 },
    );
  }

  if (!absence.assignmentText) {
    return NextResponse.json(
      { error: "Преподаватель еще не подготовил задание для этой заявки." },
      { status: 400 },
    );
  }

  const now = new Date();

  await prisma.absence.update({
    where: {
      id: absence.id,
    },
    data: {
      status: AbsenceStatus.ASSIGNED,
      assignmentSentAt: absence.assignmentSentAt ?? now,
      departmentHeadApprovedAt: now,
    },
  });

  await notifyStudentAboutAssignment(absence.id);
  await notifyTeacherAboutDepartmentHeadApproval(absence.id);

  return NextResponse.json(await buildDepartmentHeadPortalPayload(session.user.id));
}
