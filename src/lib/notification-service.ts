import {
  AbsenceStatus,
  NotificationIcon as PrismaNotificationIcon,
  NotificationTone as PrismaNotificationTone,
  UserRole,
} from "@prisma/client";
import { getStudentAbsenceDeadline } from "@/lib/absence-deadlines";
import { sendPortalNotificationEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { formatPortalDate, type PortalNotification } from "@/lib/student-portal";

type AbsenceNotificationContext = Awaited<
  ReturnType<typeof getAbsenceNotificationContext>
>;

function mapTone(tone: PrismaNotificationTone): PortalNotification["tone"] {
  switch (tone) {
    case PrismaNotificationTone.RED:
      return "red";
    case PrismaNotificationTone.AMBER:
      return "amber";
    case PrismaNotificationTone.GREEN:
      return "green";
    case PrismaNotificationTone.TEAL:
      return "teal";
    case PrismaNotificationTone.GRAY:
    default:
      return "gray";
  }
}

function mapIcon(icon: PrismaNotificationIcon): PortalNotification["icon"] {
  switch (icon) {
    case PrismaNotificationIcon.CALENDAR:
      return "calendar";
    case PrismaNotificationIcon.MESSAGE:
      return "message";
    case PrismaNotificationIcon.REVIEW:
      return "review";
    case PrismaNotificationIcon.COMPLETED:
      return "completed";
    case PrismaNotificationIcon.BELL:
    default:
      return "bell";
  }
}

function buildStudentAbsenceHref(absenceId: string) {
  return `/student/absences/${absenceId}`;
}

function buildTeacherAbsenceHref(absenceId: string) {
  return `/teacher/absences/${absenceId}`;
}

function buildStudentAbsenceLine(absence: NonNullable<AbsenceNotificationContext>) {
  return `«${absence.subject.name}», ${formatPortalDate(absence.date.toISOString())}`;
}

function buildTeacherAbsenceLine(absence: NonNullable<AbsenceNotificationContext>) {
  return `${absence.student.fullName} (${absence.student.group.name}) — «${absence.subject.name}», ${formatPortalDate(absence.date.toISOString())}`;
}

async function notificationExists(input: {
  userId: string;
  title: string;
  message: string;
  absenceId?: string | null;
}) {
  return prisma.notification.findFirst({
    where: {
      userId: input.userId,
      title: input.title,
      message: input.message,
      absenceId: input.absenceId ?? null,
    },
    select: {
      id: true,
    },
  });
}

export async function getUserNotifications(
  userId: string,
): Promise<PortalNotification[]> {
  const notifications = await prisma.notification.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return notifications.map((notification) => ({
    id: notification.id,
    absenceId: notification.absenceId ?? "",
    targetHref: notification.targetHref ?? undefined,
    title: notification.title,
    message: notification.message,
    createdAt: notification.createdAt.toISOString(),
    tone: mapTone(notification.tone),
    icon: mapIcon(notification.icon),
    isRead: Boolean(notification.readAt),
  }));
}

export async function createNotification(input: {
  userId?: string | null;
  absenceId?: string | null;
  targetHref?: string | null;
  title: string;
  message: string;
  tone: PrismaNotificationTone;
  icon: PrismaNotificationIcon;
  sendEmail?: boolean;
}) {
  if (!input.userId) {
    return;
  }

  await prisma.notification.create({
    data: {
      userId: input.userId,
      absenceId: input.absenceId ?? null,
      targetHref: input.targetHref ?? null,
      title: input.title,
      message: input.message,
      tone: input.tone,
      icon: input.icon,
    },
  });

  if (input.sendEmail === false) {
    return;
  }

  const user = await prisma.user.findUnique({
    where: {
      id: input.userId,
    },
    include: {
      student: true,
      teacher: true,
    },
  });

  if (!user?.email) {
    return;
  }

  const recipientName =
    user.role === UserRole.STUDENT
      ? user.student?.fullName
      : user.teacher?.fullName;

  if (!recipientName) {
    return;
  }

  const recipientRole =
    user.role === UserRole.STUDENT
      ? "student"
      : user.teacher?.isDepartmentHead
        ? "department_head"
        : "teacher";

  await sendPortalNotificationEmail({
    recipientEmail: user.email,
    recipientName,
    recipientRole,
    title: input.title,
    message: input.message,
    targetHref: input.targetHref,
  });
}

async function createNotificationIfMissing(input: {
  userId?: string | null;
  absenceId?: string | null;
  targetHref?: string | null;
  title: string;
  message: string;
  tone: PrismaNotificationTone;
  icon: PrismaNotificationIcon;
  sendEmail?: boolean;
}) {
  if (!input.userId) {
    return;
  }

  const existing = await notificationExists({
    userId: input.userId,
    title: input.title,
    message: input.message,
    absenceId: input.absenceId ?? null,
  });

  if (existing) {
    return;
  }

  await createNotification(input);
}

async function getAbsenceNotificationContext(absenceId: string) {
  return prisma.absence.findUnique({
    where: {
      id: absenceId,
    },
    include: {
      student: {
        include: {
          group: true,
        },
      },
      teacher: {
        include: {
          user: true,
        },
      },
      subject: true,
    },
  });
}

async function getAbsenceNotificationContexts(absenceIds: string[]) {
  return prisma.absence.findMany({
    where: {
      id: {
        in: absenceIds,
      },
    },
    include: {
      student: {
        include: {
          group: true,
        },
      },
      teacher: {
        include: {
          user: true,
        },
      },
      subject: true,
    },
    orderBy: {
      date: "desc",
    },
  });
}

function buildListMessage(
  intro: string,
  lines: string[],
  outro?: string,
  limit = 5,
) {
  const visibleLines = lines.slice(0, limit);
  const hiddenCount = Math.max(0, lines.length - visibleLines.length);
  const body = visibleLines.map((line) => `• ${line}`).join("\n");
  const hiddenSuffix =
    hiddenCount > 0
      ? `\nИ еще ${hiddenCount} ${pluralize(hiddenCount, "позиция", "позиции", "позиций")}.`
      : "";
  const outroBlock = outro ? `\n${outro}` : "";
  return `${intro}\n${body}${hiddenSuffix}${outroBlock}`;
}

export async function notifyStudentAboutNewAbsence(absenceId: string) {
  const absence = await getAbsenceNotificationContext(absenceId);

  if (!absence?.student.userId) {
    return;
  }

  await createNotification({
    userId: absence.student.userId,
    absenceId: absence.id,
    targetHref: buildStudentAbsenceHref(absence.id),
    title: `Новый пропуск по предмету «${absence.subject.name}»`,
    message: `${formatPortalDate(absence.date.toISOString())}, ${absence.lessonLabel}, ${absence.classroom}. Зафиксирован пропуск занятия.`,
    tone: PrismaNotificationTone.RED,
    icon: PrismaNotificationIcon.CALENDAR,
    sendEmail: false,
  });
}

export async function notifyStudentAboutRequestSubmission(absenceId: string) {
  const absence = await getAbsenceNotificationContext(absenceId);

  if (!absence?.student.userId) {
    return;
  }

  await createNotification({
    userId: absence.student.userId,
    absenceId: absence.id,
    targetHref: buildStudentAbsenceHref(absence.id),
    title: "Заявка на отработку отправлена",
    message: `По пропуску ${buildStudentAbsenceLine(absence)} заявка со справкой отправлена заведующему отделением на рассмотрение.`,
    tone: PrismaNotificationTone.GRAY,
    icon: PrismaNotificationIcon.BELL,
  });
}

export async function notifyDepartmentHeadAboutNewRequest(absenceId: string) {
  const [absence, departmentHead] = await Promise.all([
    getAbsenceNotificationContext(absenceId),
    prisma.teacherProfile.findFirst({
      where: {
        isDepartmentHead: true,
      },
      include: {
        user: true,
      },
    }),
  ]);

  if (!absence || !departmentHead?.userId) {
    return;
  }

  await createNotification({
    userId: departmentHead.userId,
    absenceId: absence.id,
    targetHref: "/teacher/head/approvals",
    title: "Новая заявка на отработку",
    message: `${absence.student.fullName}, ${absence.student.group.name} отправил заявку со справкой по предмету «${absence.subject.name}» за ${formatPortalDate(absence.date.toISOString())}. Проверьте справку и подтвердите заявку.`,
    tone: PrismaNotificationTone.AMBER,
    icon: PrismaNotificationIcon.REVIEW,
  });
}

export async function notifyTeacherAboutApprovedRequest(absenceId: string) {
  const absence = await getAbsenceNotificationContext(absenceId);

  if (!absence?.teacher.userId) {
    return;
  }

  await createNotification({
    userId: absence.teacher.userId,
    absenceId: absence.id,
    targetHref: buildTeacherAbsenceHref(absence.id),
    title: "Заявка одобрена — выдайте задание",
    message: `Заведующий отделением одобрил справку студента ${absence.student.fullName}, ${absence.student.group.name}. Выдайте задание по предмету «${absence.subject.name}» за ${formatPortalDate(absence.date.toISOString())}.`,
    tone: PrismaNotificationTone.AMBER,
    icon: PrismaNotificationIcon.BELL,
  });
}

export async function notifyStudentAboutManualNb(absenceId: string) {
  const absence = await getAbsenceNotificationContext(absenceId);

  if (!absence?.student.userId) {
    return;
  }

  await createNotification({
    userId: absence.student.userId,
    absenceId: absence.id,
    targetHref: buildStudentAbsenceHref(absence.id),
    title: `Вам поставлено Н/Б по предмету «${absence.subject.name}»`,
    message: `Преподаватель закрыл пропуск за ${formatPortalDate(absence.date.toISOString())} отметкой н/б.`,
    tone: PrismaNotificationTone.RED,
    icon: PrismaNotificationIcon.BELL,
  });
}

export async function notifyStudentAboutAssignment(absenceId: string) {
  const absence = await getAbsenceNotificationContext(absenceId);

  if (!absence?.student.userId) {
    return;
  }

  await createNotification({
    userId: absence.student.userId,
    absenceId: absence.id,
    targetHref: buildStudentAbsenceHref(absence.id),
    title: `Получено задание по предмету «${absence.subject.name}»`,
    message: `${absence.teacher.fullName} отправил материалы для отработки пропуска за ${formatPortalDate(absence.date.toISOString())}.`,
    tone: PrismaNotificationTone.AMBER,
    icon: PrismaNotificationIcon.MESSAGE,
  });
}

export async function notifyStudentAboutDepartmentHeadApproval(absenceId: string) {
  const absence = await getAbsenceNotificationContext(absenceId);

  if (!absence?.student.userId) {
    return;
  }

  await createNotification({
    userId: absence.student.userId,
    absenceId: absence.id,
    targetHref: buildStudentAbsenceHref(absence.id),
    title: "Справка одобрена заведующим отделением",
    message: `Заведующий отделением одобрил справку по пропуску ${buildStudentAbsenceLine(absence)}. Ожидайте задание от преподавателя ${absence.teacher.fullName}.`,
    tone: PrismaNotificationTone.GREEN,
    icon: PrismaNotificationIcon.COMPLETED,
  });
}

export async function notifyTeacherAboutResponse(absenceId: string) {
  const absence = await getAbsenceNotificationContext(absenceId);

  if (!absence?.teacher.userId) {
    return;
  }

  await createNotification({
    userId: absence.teacher.userId,
    absenceId: absence.id,
    targetHref: buildTeacherAbsenceHref(absence.id),
    title: "Студент отправил ответ",
    message: `${absence.student.fullName} отправил отработку по предмету «${absence.subject.name}» за ${formatPortalDate(absence.date.toISOString())}.`,
    tone: PrismaNotificationTone.TEAL,
    icon: PrismaNotificationIcon.REVIEW,
  });
}

export async function notifyStudentAboutResponseSubmitted(absenceId: string) {
  const absence = await getAbsenceNotificationContext(absenceId);

  if (!absence?.student.userId) {
    return;
  }

  await createNotification({
    userId: absence.student.userId,
    absenceId: absence.id,
    targetHref: buildStudentAbsenceHref(absence.id),
    title: "Ответ отправлен на проверку",
    message: `По пропуску ${buildStudentAbsenceLine(absence)} ваш ответ отправлен преподавателю и ожидает оценки.`,
    tone: PrismaNotificationTone.TEAL,
    icon: PrismaNotificationIcon.REVIEW,
  });
}

export async function notifyTeacherAboutResponseDeletion(absenceId: string) {
  const absence = await getAbsenceNotificationContext(absenceId);

  if (!absence?.teacher.userId) {
    return;
  }

  await createNotification({
    userId: absence.teacher.userId,
    absenceId: absence.id,
    targetHref: buildTeacherAbsenceHref(absence.id),
    title: "Студент удалил ответ",
    message: `${absence.student.fullName} удалил отправленный ответ по предмету «${absence.subject.name}».`,
    tone: PrismaNotificationTone.GRAY,
    icon: PrismaNotificationIcon.BELL,
  });
}

export async function notifyStudentAboutGrade(absenceId: string) {
  const absence = await getAbsenceNotificationContext(absenceId);

  if (!absence?.student.userId) {
    return;
  }

  await createNotification({
    userId: absence.student.userId,
    absenceId: absence.id,
    targetHref: buildStudentAbsenceHref(absence.id),
    title: `Отработка оценена по предмету «${absence.subject.name}»`,
    message: `Преподаватель выставил ${absence.grade ?? 0} баллов за пропуск от ${formatPortalDate(absence.date.toISOString())}.`,
    tone: PrismaNotificationTone.GREEN,
    icon: PrismaNotificationIcon.COMPLETED,
  });
}

export async function notifyTeacherAboutReworkAccessRequest(absenceId: string) {
  const absence = await getAbsenceNotificationContext(absenceId);

  if (!absence?.teacher.userId) {
    return;
  }

  await createNotification({
    userId: absence.teacher.userId,
    absenceId: absence.id,
    targetHref: buildTeacherAbsenceHref(absence.id),
    title: "Запрошен повторный доступ к отработке",
    message: `${absence.student.fullName} запросил повторный доступ к отработке по предмету «${absence.subject.name}» за ${formatPortalDate(absence.date.toISOString())}.`,
    tone: PrismaNotificationTone.RED,
    icon: PrismaNotificationIcon.BELL,
  });
}

export async function notifyTeacherAboutImportedGroupAbsences(input: {
  userId?: string | null;
  groupId: string;
  groupName: string;
  absenceCount: number;
  studentCount: number;
}) {
  await createNotification({
    userId: input.userId,
    targetHref: `/teacher/groups/${input.groupId}`,
    title: `Новые пропуски в группе ${input.groupName}`,
    message: `После загрузки отчета зафиксировано ${input.absenceCount} пропусков у ${input.studentCount} ${pluralize(input.studentCount, "студента", "студентов", "студентов")} группы ${input.groupName}.`,
    tone: PrismaNotificationTone.RED,
    icon: PrismaNotificationIcon.CALENDAR,
    sendEmail: false,
  });
}

export async function notifyUsersAboutExpiredAbsenceBatch(absenceIds: string[]) {
  if (!absenceIds.length) {
    return;
  }

  const absences = await getAbsenceNotificationContexts(absenceIds);

  const studentBuckets = new Map<string, NonNullable<AbsenceNotificationContext>[]>();
  const teacherBuckets = new Map<string, NonNullable<AbsenceNotificationContext>[]>();

  for (const absence of absences) {
    if (absence.student.userId) {
      const bucket = studentBuckets.get(absence.student.userId) ?? [];
      bucket.push(absence);
      studentBuckets.set(absence.student.userId, bucket);
    }

    if (absence.teacher.userId) {
      const bucket = teacherBuckets.get(absence.teacher.userId) ?? [];
      bucket.push(absence);
      teacherBuckets.set(absence.teacher.userId, bucket);
    }
  }

  for (const [userId, items] of studentBuckets) {
    const title =
      items.length === 1
        ? "Время на отработку истекло"
        : "Истек срок по нескольким отработкам";
    const message = buildListMessage(
      items.length === 1
        ? "По этой отработке срок истек, и пропуск автоматически переведен в Н/Б:"
        : "По этим отработкам срок истек, и пропуски автоматически переведены в Н/Б:",
      items.map(buildStudentAbsenceLine),
    );

    await createNotificationIfMissing({
      userId,
      absenceId: items.length === 1 ? items[0].id : null,
      targetHref:
        items.length === 1 ? buildStudentAbsenceHref(items[0].id) : "/student",
      title,
      message,
      tone: PrismaNotificationTone.RED,
      icon: PrismaNotificationIcon.BELL,
    });
  }

  for (const [userId, items] of teacherBuckets) {
    const title =
      items.length === 1
        ? "У студента истек срок отработки"
        : "Истек срок по нескольким отработкам студентов";
    const message = buildListMessage(
      items.length === 1
        ? "По этой отработке срок истек, и пропуск автоматически переведен в Н/Б:"
        : "По этим отработкам срок истек, и пропуски автоматически переведены в Н/Б:",
      items.map(buildTeacherAbsenceLine),
    );

    await createNotificationIfMissing({
      userId,
      absenceId: items.length === 1 ? items[0].id : null,
      targetHref:
        items.length === 1
          ? buildTeacherAbsenceHref(items[0].id)
          : "/teacher/dashboard",
      title,
      message,
      tone: PrismaNotificationTone.RED,
      icon: PrismaNotificationIcon.BELL,
    });
  }
}

export async function notifyStudentAboutUpcomingDeadlines(
  studentUserId: string,
  absences: Array<{
    id: string;
    createdAt: Date;
    date: Date;
    requestedAt: Date | null;
    updatedAt: Date;
    assignmentSentAt: Date | null;
    status: AbsenceStatus;
    markedNbAt: Date | null;
    subject: {
      name: string;
    };
  }>,
) {
  const now = new Date();
  const soonThresholdMs = 1000 * 60 * 60 * 24;

  const requestDueSoon = absences
    .filter((absence) => absence.status === AbsenceStatus.MISSED && !absence.markedNbAt)
    .map((absence) => ({
      absence,
      deadline: getStudentAbsenceDeadline(
        {
          createdAt: absence.createdAt.toISOString(),
          date: absence.date.toISOString(),
          status: "missed",
          updatedAt: absence.updatedAt.toISOString(),
        },
        now,
      ),
    }))
    .filter(
      (item) =>
        item.deadline &&
        !item.deadline.isExpired &&
        new Date(item.deadline.deadlineAt).getTime() - now.getTime() <=
          soonThresholdMs,
    );

  const assignmentDueSoon = absences
    .filter(
      (absence) =>
        absence.status === AbsenceStatus.ASSIGNED &&
        Boolean(absence.assignmentSentAt),
    )
    .map((absence) => ({
      absence,
      deadline: getStudentAbsenceDeadline(
        {
          assignment: absence.assignmentSentAt
            ? {
                sentAt: absence.assignmentSentAt.toISOString(),
              }
            : undefined,
          createdAt: absence.createdAt.toISOString(),
          date: absence.date.toISOString(),
          requestedAt: absence.requestedAt?.toISOString(),
          status: "assignment_received",
          updatedAt: absence.updatedAt.toISOString(),
        },
        now,
      ),
    }))
    .filter(
      (item) =>
        item.deadline &&
        !item.deadline.isExpired &&
        new Date(item.deadline.deadlineAt).getTime() - now.getTime() <=
          soonThresholdMs,
    );

  if (requestDueSoon.length) {
    const title = "Скоро истечет срок подачи отработки";
    const message = buildListMessage(
      requestDueSoon.length === 1
        ? "По этому пропуску осталось меньше суток до окончания срока подачи заявки:"
        : "По этим пропускам осталось меньше суток до окончания срока подачи заявки:",
      requestDueSoon.map(
        ({ absence, deadline }) =>
          `«${absence.subject.name}», ${formatPortalDate(absence.date.toISOString())} — дедлайн ${new Date(deadline!.deadlineAt).toLocaleString("ru-RU")}`,
      ),
      "Проверьте личный кабинет и отправьте заявку вовремя.",
    );

    await createNotificationIfMissing({
      userId: studentUserId,
      title,
      message,
      targetHref: "/student",
      tone: PrismaNotificationTone.AMBER,
      icon: PrismaNotificationIcon.CALENDAR,
    });
  }

  if (assignmentDueSoon.length) {
    const title = "Скоро истечет срок выполнения отработки";
    const message = buildListMessage(
      assignmentDueSoon.length === 1
        ? "По этому заданию осталось меньше суток до окончания срока выполнения:"
        : "По этим заданиям осталось меньше суток до окончания срока выполнения:",
      assignmentDueSoon.map(
        ({ absence, deadline }) =>
          `«${absence.subject.name}», ${formatPortalDate(absence.date.toISOString())} — дедлайн ${new Date(deadline!.deadlineAt).toLocaleString("ru-RU")}`,
      ),
      "Завершите отработку и отправьте ответ до истечения срока.",
    );

    await createNotificationIfMissing({
      userId: studentUserId,
      title,
      message,
      targetHref: "/student",
      tone: PrismaNotificationTone.AMBER,
      icon: PrismaNotificationIcon.REVIEW,
    });
  }
}

export async function markNotificationRead(notificationId: string, userId: string) {
  await prisma.notification.updateMany({
    where: {
      id: notificationId,
      userId,
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });
}

export async function clearReadNotifications(userId: string) {
  await prisma.notification.deleteMany({
    where: {
      userId,
      readAt: {
        not: null,
      },
    },
  });
}

function pluralize(count: number, one: string, few: string, many: string) {
  const value = Math.abs(count) % 100;
  const unit = value % 10;

  if (value > 10 && value < 20) {
    return many;
  }

  if (unit > 1 && unit < 5) {
    return few;
  }

  if (unit === 1) {
    return one;
  }

  return many;
}
