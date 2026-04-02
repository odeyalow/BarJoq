import {
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

function getArg(flag: string) {
  const args = process.argv.slice(2);
  const index = args.findIndex((value) => value === `--${flag}`);
  return index >= 0 ? args[index + 1] : undefined;
}

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

  const subjectName = getArg("subject") ?? teacher.subjects[0]?.name ?? defaultSubjects[0];
  let subject = teacher.subjects.find((item) => item.name === subjectName);

  if (!subject) {
    subject = await prisma.subject.create({
      data: {
        name: subjectName,
        teacherId: teacher.id,
      },
    });
  }

  const lessonLabel = getArg("lesson") ?? "2 пара";
  const classroom = getArg("classroom") ?? "IT Lab 2";
  const dateValue = getArg("date");
  const date = dateValue ? new Date(dateValue) : new Date();

  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid --date value. Use ISO format, for example 2026-03-19T09:00:00Z.");
  }

  const absence = await prisma.absence.create({
    data: {
      studentId: student.id,
      teacherId: teacher.id,
      subjectId: subject.id,
      date,
      lessonLabel,
      classroom,
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
        title: `Новый пропуск по предмету «${absence.subject.name}»`,
        message: `${absence.lessonLabel}, ${classroom}. Зафиксирован новый пропуск занятия.`,
        tone: NotificationTone.RED,
        icon: NotificationIcon.CALENDAR,
      },
    });
  }

  console.log("Test absence created.");
  console.log(`Student: ${absence.student.fullName}`);
  console.log(`Subject: ${absence.subject.name}`);
  console.log(`Date: ${absence.date.toISOString()}`);
  console.log(`Absence ID: ${absence.id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
