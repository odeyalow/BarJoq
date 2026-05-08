import {
  AbsenceStatus as PrismaAbsenceStatus,
  AttachmentOwnerType,
} from "@prisma/client";
import { syncAbsenceDeadlines } from "@/lib/absence-service";
import {
  getUserNotifications,
  notifyStudentAboutUpcomingDeadlines,
} from "@/lib/notification-service";
import { prisma } from "@/lib/prisma";
import {
  type AbsenceRecord,
  type Attachment,
  type StudentPortalPayload,
} from "@/lib/student-portal";
import {
  type TeacherAbsenceRecord,
  type TeacherGroupRecord,
  type TeacherPortalPayload,
  type TeacherStudentRecord,
} from "@/lib/teacher-portal";
import type {
  DepartmentHeadImportBatchRecord,
  DepartmentHeadPendingApprovalRecord,
  DepartmentHeadPortalPayload,
  DepartmentHeadStudentStatusRecord,
} from "@/lib/department-head-portal";

function mapAttachmentList(
  attachments: Array<{
    id: string;
    name: string;
    href: string;
    sizeLabel: string;
    ownerType: AttachmentOwnerType;
  }>,
  ownerType: AttachmentOwnerType,
): Attachment[] {
  return attachments
    .filter((attachment) => attachment.ownerType === ownerType)
    .sort((left, right) => left.name.localeCompare(right.name, "ru"))
    .map((attachment) => ({
      id: attachment.id,
      name: attachment.name,
      href: attachment.href,
      sizeLabel: attachment.sizeLabel,
    }));
}

function mapStudentStatus(input: {
  markedNbAt: Date | null;
  status: PrismaAbsenceStatus;
}): AbsenceRecord["status"] {
  if (
    input.status === PrismaAbsenceStatus.MISSED &&
    input.markedNbAt
  ) {
    return "nb_marked";
  }

  switch (input.status) {
    case PrismaAbsenceStatus.REQUESTED:
      return "request_sent";
    case PrismaAbsenceStatus.PENDING_APPROVAL:
      return "awaiting_head";
    case PrismaAbsenceStatus.ASSIGNED:
      return "assignment_received";
    case PrismaAbsenceStatus.SUBMITTED:
      return "under_review";
    case PrismaAbsenceStatus.GRADED:
      return "completed";
    case PrismaAbsenceStatus.EXPIRED:
      return "expired";
    case PrismaAbsenceStatus.MISSED:
    default:
      return "missed";
  }
}

function mapTeacherStatus(input: {
  markedNbAt: Date | null;
  status: PrismaAbsenceStatus;
}): TeacherAbsenceRecord["status"] {
  if (
    input.status === PrismaAbsenceStatus.MISSED &&
    input.markedNbAt
  ) {
    return "nb_marked";
  }

  switch (input.status) {
    case PrismaAbsenceStatus.REQUESTED:
      return "request_received";
    case PrismaAbsenceStatus.PENDING_APPROVAL:
      return "awaiting_head";
    case PrismaAbsenceStatus.ASSIGNED:
      return "assignment_sent";
    case PrismaAbsenceStatus.SUBMITTED:
      return "submitted";
    case PrismaAbsenceStatus.GRADED:
      return "graded";
    case PrismaAbsenceStatus.EXPIRED:
      return "expired";
    case PrismaAbsenceStatus.MISSED:
    default:
      return "missed";
  }
}

function mapStudentAbsence(
  absence: Awaited<ReturnType<typeof getStudentAbsences>>[number],
): AbsenceRecord {
  const excuseAttachment = mapAttachmentList(
    absence.attachments,
    AttachmentOwnerType.EXCUSE,
  )[0];
  const assignmentAttachments = mapAttachmentList(
    absence.attachments,
    AttachmentOwnerType.ASSIGNMENT,
  );
  const responseAttachments = mapAttachmentList(
    absence.attachments,
    AttachmentOwnerType.RESPONSE,
  );

  return {
    id: absence.id,
    createdAt: absence.createdAt.toISOString(),
    date: absence.date.toISOString(),
    lessonLabel: absence.lessonLabel,
    updatedAt: absence.updatedAt.toISOString(),
    markedNbAt: absence.markedNbAt?.toISOString(),
    requestedAt: absence.requestedAt?.toISOString(),
    teacherConfirmedAt: absence.teacherConfirmedAt?.toISOString(),
    departmentHeadApprovedAt: absence.departmentHeadApprovedAt?.toISOString(),
    reworkAccessRequestedAt: absence.reworkAccessRequestedAt?.toISOString(),
    subjectId: absence.subject.id,
    subject: absence.subject.name,
    teacherName: absence.teacher.fullName,
    teacherRole: absence.teacher.position,
    classroom: absence.classroom,
    status: mapStudentStatus({
      status: absence.status,
      markedNbAt: absence.markedNbAt,
    }),
    excuseAttachment,
    grade: absence.grade ?? undefined,
    completedAt: absence.completedAt?.toISOString(),
    assignment:
      absence.assignmentText && absence.assignmentSentAt
        ? {
            text: absence.assignmentText,
            attachments: assignmentAttachments,
            sentAt: absence.assignmentSentAt.toISOString(),
          }
        : undefined,
    response:
      absence.responseText && absence.responseSubmittedAt
        ? {
            text: absence.responseText,
            attachments: responseAttachments,
            submittedAt: absence.responseSubmittedAt.toISOString(),
            editedAt: absence.responseEditedAt?.toISOString(),
          }
        : undefined,
  };
}

function mapTeacherAbsence(
  absence: Awaited<ReturnType<typeof getTeacherAbsences>>[number],
): TeacherAbsenceRecord {
  const excuseAttachment = mapAttachmentList(
    absence.attachments,
    AttachmentOwnerType.EXCUSE,
  )[0];
  const assignmentAttachments = mapAttachmentList(
    absence.attachments,
    AttachmentOwnerType.ASSIGNMENT,
  );
  const responseAttachments = mapAttachmentList(
    absence.attachments,
    AttachmentOwnerType.RESPONSE,
  );

  return {
    id: absence.id,
    studentId: absence.student.id,
    date: absence.date.toISOString(),
    lessonLabel: absence.lessonLabel,
    updatedAt: absence.updatedAt.toISOString(),
    requestedAt: absence.requestedAt?.toISOString(),
    teacherConfirmedAt: absence.teacherConfirmedAt?.toISOString(),
    departmentHeadApprovedAt: absence.departmentHeadApprovedAt?.toISOString(),
    reworkAccessRequestedAt: absence.reworkAccessRequestedAt?.toISOString(),
    subject: absence.subject.name,
    classroom: absence.classroom,
    studentFullName: absence.student.fullName,
    studentGroup: absence.student.group.name,
    studentAge: absence.student.age,
    studentCourse: absence.student.course,
    studentEmail: absence.student.email,
    status: mapTeacherStatus({
      status: absence.status,
      markedNbAt: absence.markedNbAt,
    }),
    excuseAttachment,
    markedNbAt: absence.markedNbAt?.toISOString(),
    assignment: absence.assignmentText
      ? {
          text: absence.assignmentText,
          attachments: assignmentAttachments,
          sentAt: (
            absence.assignmentSentAt ??
            absence.teacherConfirmedAt ??
            absence.updatedAt
          ).toISOString(),
          editedAt: absence.assignmentEditedAt?.toISOString(),
        }
      : undefined,
    response:
      absence.responseText && absence.responseSubmittedAt
        ? {
            text: absence.responseText,
            attachments: responseAttachments,
            submittedAt: absence.responseSubmittedAt.toISOString(),
            editedAt: absence.responseEditedAt?.toISOString(),
          }
        : undefined,
    grade: absence.grade ?? undefined,
    gradedAt: absence.completedAt?.toISOString(),
  };
}

async function getStudentAbsences(studentId: string) {
  return prisma.absence.findMany({
    where: {
      studentId,
    },
    include: {
      attachments: true,
      subject: true,
      teacher: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });
}

async function getTeacherAbsences(teacherId: string) {
  return prisma.absence.findMany({
    where: {
      teacherId,
    },
    include: {
      attachments: true,
      subject: true,
      student: {
        include: {
          group: true,
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });
}

export async function buildStudentPortalPayload(
  userId: string,
): Promise<StudentPortalPayload> {
  const studentUser = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    include: {
      student: {
        include: {
          group: true,
        },
      },
    },
  });

  if (!studentUser?.student) {
    throw new Error("Student session is not linked to a student profile.");
  }

  await syncAbsenceDeadlines({
    studentId: studentUser.student.id,
  });

  const absences = (await getStudentAbsences(studentUser.student.id)).map(
    (absence) => absence,
  );

  await notifyStudentAboutUpcomingDeadlines(studentUser.id, absences);

  const mappedAbsences = absences.map(mapStudentAbsence);
  const notifications = await getUserNotifications(studentUser.id);

  return {
    student: {
      fullName: studentUser.student.fullName,
      group: studentUser.student.group.name,
      age: studentUser.student.age,
      course: studentUser.student.course,
      email: studentUser.email,
    },
    absences: mappedAbsences,
    notifications,
  };
}

export async function buildTeacherPortalPayload(
  userId: string,
): Promise<TeacherPortalPayload> {
  const teacherUser = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    include: {
      teacher: {
        include: {
          groups: {
            include: {
              students: true,
            },
            orderBy: {
              name: "asc",
            },
          },
          subjects: {
            orderBy: {
              name: "asc",
            },
          },
        },
      },
    },
  });

  if (!teacherUser?.teacher) {
    throw new Error("Teacher session is not linked to a teacher profile.");
  }

  await syncAbsenceDeadlines({
    teacherId: teacherUser.teacher.id,
  });

  const absences = (await getTeacherAbsences(teacherUser.teacher.id)).map(
    mapTeacherAbsence,
  );

  const studentsMap = new Map<string, TeacherStudentRecord>();

  for (const group of teacherUser.teacher.groups) {
    for (const student of group.students) {
      studentsMap.set(student.id, {
        id: student.id,
        fullName: student.fullName,
        group: group.name,
        age: student.age,
        course: student.course,
        email: student.email,
      });
    }
  }

  const students = [...studentsMap.values()].sort((left, right) =>
    left.fullName.localeCompare(right.fullName, "ru"),
  );

  const groups: TeacherGroupRecord[] = teacherUser.teacher.groups.map((group) => ({
    id: group.id,
    name: group.name,
    course: group.course,
    specialty: group.specialty,
    studentIds: group.students
      .map((student) => student.id)
      .sort((left, right) => left.localeCompare(right, "ru")),
  }));

  return {
    teacher: {
      fullName: teacherUser.teacher.fullName,
      position: teacherUser.teacher.position,
      department: teacherUser.teacher.department,
      email: teacherUser.email,
      groups: groups.map((group) => group.name),
      subjects: teacherUser.teacher.subjects.map((subject) => subject.name),
    },
    groups,
    students,
    absences,
    notifications: await getUserNotifications(teacherUser.id),
  };
}

export async function buildDepartmentHeadPortalPayload(
  userId: string,
): Promise<DepartmentHeadPortalPayload> {
  const headUser = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    include: {
      teacher: {
        include: {
          importBatches: {
            include: {
              absences: {
                include: {
                  student: {
                    include: {
                      group: true,
                    },
                  },
                  subject: true,
                },
              },
            },
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      },
    },
  });

  if (!headUser?.teacher?.isDepartmentHead) {
    throw new Error("Department head session is not linked to a department head profile.");
  }

  await syncAbsenceDeadlines({});

  const [allAbsences, allStudents, regularTeachersCount, groupsCount] = await Promise.all([
    prisma.absence.findMany({
      include: {
        attachments: true,
        student: {
          include: {
            group: true,
          },
        },
        subject: true,
        teacher: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    }),
    prisma.studentProfile.findMany({
      include: {
        group: true,
      },
      orderBy: {
        fullName: "asc",
      },
    }),
    prisma.teacherProfile.count({
      where: {
        isDepartmentHead: false,
      },
    }),
    prisma.group.count(),
  ]);

  const imports: DepartmentHeadImportBatchRecord[] = headUser.teacher.importBatches.map(
    (batch) => ({
      id: batch.id,
      createdAt: batch.createdAt.toISOString(),
      importedAbsencesCount: batch.importedAbsencesCount,
      matchedStudentsCount: batch.matchedStudentsCount,
      unmatchedRowsCount: batch.unmatchedRowsCount,
      groups: [...new Set(batch.absences.map((absence) => absence.student.group.name))].sort(
        (left, right) => left.localeCompare(right, "ru"),
      ),
      subjects: [...new Set(batch.absences.map((absence) => absence.subject.name))].sort(
        (left, right) => left.localeCompare(right, "ru"),
      ),
      reportFile: {
        name: batch.reportFileName,
        href: batch.reportFileHref,
        sizeLabel: batch.reportFileSizeLabel,
      },
      scheduleFile: batch.scheduleFileName
        ? {
            name: batch.scheduleFileName,
            href: batch.scheduleFileHref ?? "",
            sizeLabel: batch.scheduleFileSizeLabel ?? "",
          }
        : undefined,
    }),
  );

  const studentStatuses: DepartmentHeadStudentStatusRecord[] = allAbsences.map((absence) => ({
    absenceId: absence.id,
    importBatchId: absence.importBatchId ?? undefined,
    studentId: absence.student.id,
    studentFullName: absence.student.fullName,
    studentGroup: absence.student.group.name,
    subject: absence.subject.name,
    teacherName: absence.teacher.fullName,
    status: mapTeacherStatus({
      status: absence.status,
      markedNbAt: absence.markedNbAt,
    }),
    date: absence.date.toISOString(),
    updatedAt: absence.updatedAt.toISOString(),
    lessonLabel: absence.lessonLabel,
    classroom: absence.classroom,
    grade: absence.grade ?? undefined,
  }));

  const pendingApprovals: DepartmentHeadPendingApprovalRecord[] = allAbsences
    .filter((absence) => absence.status === PrismaAbsenceStatus.PENDING_APPROVAL)
    .map((absence) => ({
      absenceId: absence.id,
      studentId: absence.student.id,
      studentFullName: absence.student.fullName,
      studentGroup: absence.student.group.name,
      subject: absence.subject.name,
      teacherName: absence.teacher.fullName,
      date: absence.date.toISOString(),
      updatedAt: absence.updatedAt.toISOString(),
      requestedAt: absence.requestedAt?.toISOString(),
      teacherConfirmedAt: absence.teacherConfirmedAt?.toISOString(),
      lessonLabel: absence.lessonLabel,
      classroom: absence.classroom,
      excuseAttachment: mapAttachmentList(
        absence.attachments,
        AttachmentOwnerType.EXCUSE,
      )[0],
      assignmentText: absence.assignmentText ?? "",
      assignmentAttachments: mapAttachmentList(
        absence.attachments,
        AttachmentOwnerType.ASSIGNMENT,
      ),
    }));

  const notifications = await getUserNotifications(headUser.id);

  return {
    head: {
      fullName: headUser.teacher.fullName,
      position: headUser.teacher.position,
      department: headUser.teacher.department,
      email: headUser.email,
      regularTeachersCount,
      groupsCount,
      studentsCount: allStudents.length,
      importsCount: imports.length,
      pendingApprovalsCount: pendingApprovals.length,
    },
    imports,
    students: allStudents.map((student) => ({
      id: student.id,
      fullName: student.fullName,
      group: student.group.name,
    })),
    studentStatuses,
    pendingApprovals,
    notifications,
  };
}
