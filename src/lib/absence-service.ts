import { AbsenceStatus, AttachmentOwnerType, type Prisma } from "@prisma/client";
import { deleteFilesByHref, saveUploadedFiles } from "@/lib/file-storage";
import { prisma } from "@/lib/prisma";

function resolveExpirationDate(absence: {
  assignmentSentAt: Date | null;
  createdAt: Date;
  date: Date;
  status: AbsenceStatus;
}) {
  if (
    absence.status === AbsenceStatus.MISSED ||
    absence.status === AbsenceStatus.REQUESTED
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
  createdAt: Date;
  date: Date;
  id: string;
  markedNbAt: Date | null;
  requestedAt: Date | null;
  status: AbsenceStatus;
}) {
  const expirationDate = resolveExpirationDate(absence);

  if (!expirationDate) {
    return false;
  }

  // Manual N/B should stay stable and must not be replaced by automatic deadline sync.
  if (absence.status === AbsenceStatus.MISSED && absence.markedNbAt) {
    return false;
  }

  if (expirationDate.getTime() > Date.now()) {
    if (absence.status !== AbsenceStatus.EXPIRED) {
      return false;
    }

    const restoredStatus = absence.assignmentSentAt
      ? AbsenceStatus.ASSIGNED
      : absence.requestedAt
        ? AbsenceStatus.REQUESTED
        : AbsenceStatus.MISSED;

    const shouldRestore =
      !absence.markedNbAt ||
      absence.markedNbAt.getTime() <= absence.createdAt.getTime();

    if (!shouldRestore) {
      return false;
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

    return true;
  }

  if (absence.status === AbsenceStatus.EXPIRED) {
    return false;
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

  return true;
}

export async function syncAbsenceDeadlineById(absenceId: string) {
  const absence = await prisma.absence.findUnique({
    where: {
      id: absenceId,
    },
    select: {
      assignmentSentAt: true,
      createdAt: true,
      date: true,
      id: true,
      markedNbAt: true,
      requestedAt: true,
      status: true,
    },
  });

  if (!absence) {
    return false;
  }

  return syncExpiredAbsence(absence);
}

export async function syncAbsenceDeadlines(where: Prisma.AbsenceWhereInput) {
  const absences = await prisma.absence.findMany({
    where: {
      ...where,
      status: {
        in: [
          AbsenceStatus.MISSED,
          AbsenceStatus.REQUESTED,
          AbsenceStatus.ASSIGNED,
          AbsenceStatus.EXPIRED,
        ],
      },
    },
    select: {
      assignmentSentAt: true,
      createdAt: true,
      date: true,
      id: true,
      markedNbAt: true,
      requestedAt: true,
      status: true,
    },
  });

  let updated = 0;

  for (const absence of absences) {
    if (await syncExpiredAbsence(absence)) {
      updated += 1;
    }
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
