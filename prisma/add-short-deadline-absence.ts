import {
  AbsenceStatus,
  NotificationIcon,
  NotificationTone,
  PrismaClient,
} from "@prisma/client";
import {
  defaultStudentAccount,
  defaultSubjects,
  defaultTeacherAccount,
} from "../src/lib/default-accounts";

const prisma = new PrismaClient();
const threeDaysMs = 1000 * 60 * 60 * 24 * 3;
const remainingMs = 20_000;

async function main() {
  const student = await prisma.studentProfile.findUnique({
    where: {
      email: defaultStudentAccount.email,
    },
  });

  const teacher = await prisma.teacherProfile.findFirst({
    where: {
      user: {
        email: defaultTeacherAccount.email,
      },
    },
    include: {
      subjects: true,
    },
  });

  if (!student || !teacher) {
    throw new Error(
      "Seed data was not found. Run `npm run db:reset` or `npm run db:seed` first.",
    );
  }

  const subjectName = teacher.subjects[0]?.name ?? defaultSubjects[0];
  let subject = teacher.subjects.find((item) => item.name === subjectName);

  if (!subject) {
    subject = await prisma.subject.create({
      data: {
        name: subjectName,
        teacherId: teacher.id,
      },
    });
  }

  const now = new Date();
  const assignmentSentAt = new Date(now.getTime() - threeDaysMs + remainingMs);
  const deadlineAt = new Date(assignmentSentAt.getTime() + threeDaysMs);

  const absence = await prisma.absence.create({
    data: {
      studentId: student.id,
      teacherId: teacher.id,
      subjectId: subject.id,
      date: now,
      lessonLabel: "Тестовый дедлайн 20 секунд",
      classroom: "Deadline Lab",
      status: AbsenceStatus.ASSIGNED,
      requestedAt: now,
      assignmentText:
        "Тестовое задание для проверки короткого дедлайна. Через 20 секунд карточка должна перейти в статус истечения срока после следующей синхронизации.",
      assignmentSentAt,
    },
    include: {
      student: true,
      subject: true,
    },
  });

  if (student.userId) {
    await prisma.notification.create({
      data: {
        userId: student.userId,
        absenceId: absence.id,
        title: `Тестовое задание по предмету «${absence.subject.name}»`,
        message:
          "Добавлена тестовая карточка с коротким дедлайном на 20 секунд для проверки интерфейса и автоматического истечения срока.",
        tone: NotificationTone.AMBER,
        icon: NotificationIcon.MESSAGE,
      },
    });
  }

  console.log("Short deadline test absence created.");
  console.log(`Student: ${absence.student.fullName}`);
  console.log(`Subject: ${absence.subject.name}`);
  console.log(`Absence ID: ${absence.id}`);
  console.log(`Assignment sent at: ${assignmentSentAt.toISOString()}`);
  console.log(`Deadline at: ${deadlineAt.toISOString()}`);
  console.log("Open the student dashboard now to watch the 20-second countdown.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
