import { AbsenceStatus, AttachmentOwnerType } from "@prisma/client";
import {
  notifyStudentAboutDepartmentHeadApproval,
  notifyTeacherAboutApprovedRequest,
} from "@/lib/notification-service";
import { prisma } from "@/lib/prisma";

export async function approvePendingAbsences(absenceIds: string[]) {
  const uniqueIds = [...new Set(absenceIds.filter(Boolean))];

  if (!uniqueIds.length) {
    throw new Error("Не выбраны заявки для подтверждения.");
  }

  // Зав. отделением рассматривает заявки студентов (статус REQUESTED) и
  // прикреплённую справку, после чего заявка передаётся преподавателю.
  const absences = await prisma.absence.findMany({
    where: {
      id: {
        in: uniqueIds,
      },
      status: AbsenceStatus.REQUESTED,
      attachments: {
        some: {
          ownerType: AttachmentOwnerType.EXCUSE,
        },
      },
    },
    select: {
      id: true,
    },
  });

  if (!absences.length) {
    throw new Error("Подходящих заявок на подтверждение не найдено.");
  }

  const now = new Date();

  await prisma.$transaction(
    absences.map((absence) =>
      prisma.absence.update({
        where: {
          id: absence.id,
        },
        data: {
          status: AbsenceStatus.PENDING_APPROVAL,
          departmentHeadApprovedAt: now,
        },
      }),
    ),
  );

  await Promise.all(
    absences.flatMap((absence) => [
      notifyTeacherAboutApprovedRequest(absence.id),
      notifyStudentAboutDepartmentHeadApproval(absence.id),
    ]),
  );

  return {
    approvedCount: absences.length,
  };
}
