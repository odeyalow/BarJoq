import { AbsenceStatus, AttachmentOwnerType, type Prisma } from "@prisma/client";
import { deleteFilesByHref, saveUploadedFiles } from "@/lib/file-storage";
import { notifyUsersAboutExpiredAbsenceBatch } from "@/lib/notification-service";
import { prisma } from "@/lib/prisma";

function resolveExpirationDate(absence: {
  assignmentSentAt: Date | null;
  createdAt: Date;
  date: Date;
  status: AbsenceStatus;
}) {
  if (
    absence.status === AbsenceStatus.MISSED ||
    absence.status === AbsenceStatus.REQUESTED ||
    absence.status === AbsenceStatus.PENDING_APPROVAL
  ) {
    return new Date(
      absence.createdAt.getFullYear(),
      absence.createdAt.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );
  }

  if (absence.status === AbsenceStatus.ASSIGNED && absence.assignmentSentAt) {
    return new Date(absence.assignmentSentAt.getTime() + 1000 * 60 * 60 * 24 * 3);
  }

  return null;
}

async function syncExpiredAbsence(absence: {
  assignmentSentAt: Date | null;
  assignmentText: string | null;
  createdAt: Date;
  date: Date;
  departmentHeadApprovedAt: Date | null;
  id: string;
  markedNbAt: Date | null;
  requestedAt: Date | null;
  status: AbsenceStatus;
  teacherConfirmedAt: Date | null;
}) {
  const expirationDate = resolveExpirationDate(absence);

  if (!expirationDate) {
    return null;
  }

  // Manual N/B should stay stable and must not be replaced by automatic deadline sync.
  if (absence.status === AbsenceStatus.MISSED && absence.markedNbAt) {
    return null;
  }

  if (expirationDate.getTime() > Date.now()) {
    if (absence.status !== AbsenceStatus.EXPIRED) {
      return null;
    }

    const restoredStatus = absence.assignmentSentAt
      ? AbsenceStatus.ASSIGNED
      : absence.teacherConfirmedAt || absence.assignmentText
        ? AbsenceStatus.PENDING_APPROVAL
      : absence.requestedAt
        ? AbsenceStatus.REQUESTED
        : AbsenceStatus.MISSED;

    const shouldRestore =
      !absence.markedNbAt ||
      absence.markedNbAt.getTime() <= absence.createdAt.getTime();

    if (!shouldRestore) {
      return null;
    }

    await prisma.absence.update({
      where: {
        id: absence.id,
      },
      data: {
        markedNbAt: null,
        status: restoredStatus,
      },
    });

    return "restored";
  }

  if (absence.status === AbsenceStatus.EXPIRED) {
    return null;
  }

  await prisma.absence.update({
    where: {
      id: absence.id,
    },
    data: {
      markedNbAt: absence.markedNbAt ?? expirationDate,
      status: AbsenceStatus.EXPIRED,
    },
  });

  return "expired";
}

export async function syncAbsenceDeadlineById(absenceId: string) {
  const absence = await prisma.absence.findUnique({
    where: {
      id: absenceId,
    },
    select: {
      assignmentSentAt: true,
      assignmentText: true,
      createdAt: true,
      date: true,
      departmentHeadApprovedAt: true,
      id: true,
      markedNbAt: true,
      requestedAt: true,
      status: true,
      teacherConfirmedAt: true,
    },
  });

  if (!absence) {
    return false;
  }

  const result = await syncExpiredAbsence(absence);

  if (result === "expired") {
    await notifyUsersAboutExpiredAbsenceBatch([absence.id]);
  }

  return Boolean(result);
}

export async function syncAbsenceDeadlines(where: Prisma.AbsenceWhereInput) {
  const absences = await prisma.absence.findMany({
    where: {
      ...where,
      status: {
        in: [
          AbsenceStatus.MISSED,
          AbsenceStatus.REQUESTED,
          AbsenceStatus.PENDING_APPROVAL,
          AbsenceStatus.ASSIGNED,
          AbsenceStatus.EXPIRED,
        ],
      },
    },
    select: {
      assignmentSentAt: true,
      assignmentText: true,
      createdAt: true,
      date: true,
      departmentHeadApprovedAt: true,
      id: true,
      markedNbAt: true,
      requestedAt: true,
      status: true,
      teacherConfirmedAt: true,
    },
  });

  let updated = 0;
  const expiredIds: string[] = [];

  for (const absence of absences) {
    const result = await syncExpiredAbsence(absence);

    if (result) {
      updated += 1;

      if (result === "expired") {
        expiredIds.push(absence.id);
      }
    }
  }

  if (expiredIds.length) {
    await notifyUsersAboutExpiredAbsenceBatch(expiredIds);
  }

  return updated;
}

export async function getStudentOwnedAbsence(absenceId: string, studentId: string) {
  await syncAbsenceDeadlineById(absenceId);

  return prisma.absence.findFirst({
    where: {
      id: absenceId,
      studentId,
    },
    include: {
      attachments: true,
    },
  });
}

export async function getTeacherOwnedAbsence(absenceId: string, teacherId: string) {
  await syncAbsenceDeadlineById(absenceId);

  return prisma.absence.findFirst({
    where: {
      id: absenceId,
      teacherId,
    },
    include: {
      attachments: true,
    },
  });
}

export async function deleteAbsenceAttachments(
  absenceId: string,
  ownerType: AttachmentOwnerType,
) {
  const existingAttachments = await prisma.absenceAttachment.findMany({
    where: {
      absenceId,
      ownerType,
    },
  });

  await deleteFilesByHref(existingAttachments.map((attachment) => attachment.href));

  await prisma.absenceAttachment.deleteMany({
    where: {
      absenceId,
      ownerType,
    },
  });
}

export async function syncAbsenceAttachments({
  absenceId,
  ownerType,
  keepAttachmentIds,
  files,
}: {
  absenceId: string;
  ownerType: AttachmentOwnerType;
  keepAttachmentIds: string[];
  files: File[];
}) {
  const existingAttachments = await prisma.absenceAttachment.findMany({
    where: {
      absenceId,
      ownerType,
    },
  });

  if (files.length) {
    await deleteFilesByHref(existingAttachments.map((attachment) => attachment.href));

    await prisma.absenceAttachment.deleteMany({
      where: {
        absenceId,
        ownerType,
      },
    });

    const savedFiles = await saveUploadedFiles({
      absenceId,
      ownerType,
      files,
    });

    if (!savedFiles.length) {
      return;
    }

    await prisma.absenceAttachment.createMany({
      data: savedFiles.map((file) => ({
        absenceId,
        ownerType,
        name: file.name,
        href: file.href,
        sizeLabel: file.sizeLabel,
      })),
    });

    return;
  }

  const keepSet = new Set(keepAttachmentIds);
  const attachmentsToDelete = existingAttachments.filter(
    (attachment) => !keepSet.has(attachment.id),
  );

  if (!attachmentsToDelete.length) {
    return;
  }

  await deleteFilesByHref(attachmentsToDelete.map((attachment) => attachment.href));

  await prisma.absenceAttachment.deleteMany({
    where: {
      id: {
        in: attachmentsToDelete.map((attachment) => attachment.id),
      },
    },
  });
}
