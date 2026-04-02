import {
  NotificationIcon as PrismaNotificationIcon,
  NotificationTone as PrismaNotificationTone,
} from "@prisma/client";
import { formatPortalDate, type PortalNotification } from "@/lib/student-portal";
import { prisma } from "@/lib/prisma";

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

export async function notifyStudentAboutNewAbsence(absenceId: string) {
  const absence = await getAbsenceNotificationContext(absenceId);

  if (!absence?.student.userId) {
    return;
  }

  await createNotification({
    userId: absence.student.userId,
    absenceId: absence.id,
    title: `Новый пропуск по предмету «${absence.subject.name}»`,
    message: `${formatPortalDate(absence.date.toISOString())}, ${absence.lessonLabel}, ${absence.classroom}. Зафиксирован пропуск занятия.`,
    tone: PrismaNotificationTone.RED,
    icon: PrismaNotificationIcon.CALENDAR,
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
    title: `Вам поставлено Н/Б по предмету «${absence.subject.name}»`,
    message: `Преподаватель закрыл пропуск за ${formatPortalDate(absence.date.toISOString())} отметкой н/б.`,
    tone: PrismaNotificationTone.RED,
    icon: PrismaNotificationIcon.BELL,
  });
}

export async function notifyTeacherAboutRequest(absenceId: string) {
  const absence = await getAbsenceNotificationContext(absenceId);

  if (!absence?.teacher.userId) {
    return;
  }

  await createNotification({
    userId: absence.teacher.userId,
    absenceId: absence.id,
    title: "Получена заявка на отработку",
    message: `${absence.student.fullName}, ${absence.student.group.name}. Запрошено задание по предмету «${absence.subject.name}» за ${formatPortalDate(absence.date.toISOString())}.`,
    tone: PrismaNotificationTone.GRAY,
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
    title: `Получено задание по предмету «${absence.subject.name}»`,
    message: `${absence.teacher.fullName} отправил материалы для отработки пропуска за ${formatPortalDate(absence.date.toISOString())}.`,
    tone: PrismaNotificationTone.AMBER,
    icon: PrismaNotificationIcon.MESSAGE,
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
    title: "Студент отправил ответ",
    message: `${absence.student.fullName} отправил отработку по предмету «${absence.subject.name}» за ${formatPortalDate(absence.date.toISOString())}.`,
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
    message: `После загрузки отчета зафиксировано ${input.absenceCount} пропусков у ${input.studentCount} студентов группы ${input.groupName}.`,
    tone: PrismaNotificationTone.RED,
    icon: PrismaNotificationIcon.CALENDAR,
  });
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
