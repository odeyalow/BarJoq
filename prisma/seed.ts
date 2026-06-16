import { rm } from "node:fs/promises";
import path from "node:path";
import { hash } from "bcryptjs";
import { PrismaClient, UserRole } from "@prisma/client";
import {
  defaultDepartmentHeadAccount,
  defaultStudentAccount,
  defaultSubjects,
  defaultTeacherAccount,
  secondStudentAccount,
  seededGroups,
  seededStudents,
} from "../src/lib/default-accounts";

const prisma = new PrismaClient();

async function main() {
  await rm(path.join(process.cwd(), "public", "uploads"), {
    force: true,
    recursive: true,
  });

  await prisma.notification.deleteMany();
  await prisma.absenceAttachment.deleteMany();
  await prisma.absence.deleteMany();
  await prisma.importBatch.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.session.deleteMany();
  await prisma.studentProfile.deleteMany();
  await prisma.group.deleteMany();
  await prisma.teacherProfile.deleteMany();
  await prisma.user.deleteMany();

  const teacherPasswordHash = await hash(defaultTeacherAccount.password, 10);
  const departmentHeadPasswordHash = await hash(
    defaultDepartmentHeadAccount.password,
    10,
  );

  const teacherUser = await prisma.user.create({
    data: {
      email: defaultTeacherAccount.email,
      passwordHash: teacherPasswordHash,
      role: UserRole.TEACHER,
      teacher: {
        create: {
          fullName: defaultTeacherAccount.fullName,
          position: defaultTeacherAccount.position,
          department: defaultTeacherAccount.department,
          isDepartmentHead: false,
        },
      },
    },
    include: {
      teacher: true,
    },
  });

  await prisma.user.create({
    data: {
      email: defaultDepartmentHeadAccount.email,
      passwordHash: departmentHeadPasswordHash,
      role: UserRole.TEACHER,
      teacher: {
        create: {
          fullName: defaultDepartmentHeadAccount.fullName,
          position: defaultDepartmentHeadAccount.position,
          department: defaultDepartmentHeadAccount.department,
          isDepartmentHead: true,
        },
      },
    },
  });

  if (!teacherUser.teacher) {
    throw new Error("Teacher profile was not created.");
  }

  const teacherProfile = teacherUser.teacher;

  const groups = await Promise.all(
    seededGroups.map((group) =>
      prisma.group.create({
        data: {
          name: group.name,
          course: group.course,
          specialty: group.specialty,
          teacherId: teacherProfile.id,
        },
      }),
    ),
  );

  const groupsByName = new Map(groups.map((group) => [group.name, group]));

  await prisma.subject.createMany({
    data: defaultSubjects.map((name) => ({
      name,
      teacherId: teacherProfile.id,
    })),
  });

  for (const student of seededStudents) {
    let userId: string | null = null;

    if (student.withAccount) {
      const passwordHash = await hash(student.password ?? "", 10);
      const studentUser = await prisma.user.create({
        data: {
          email: student.email,
          passwordHash,
          role: UserRole.STUDENT,
        },
      });
      userId = studentUser.id;
    }

    await prisma.studentProfile.create({
      data: {
        fullName: student.fullName,
        age: student.age,
        course: student.course,
        email: student.email,
        groupId: groupsByName.get(student.groupName)?.id ?? groups[0]!.id,
        userId,
      },
    });
  }

  console.log("Database seeded successfully.");
  console.log(
    `Student 1: ${defaultStudentAccount.email} / ${defaultStudentAccount.password}`,
  );
  console.log(
    `Student 2: ${secondStudentAccount.email} / ${secondStudentAccount.password}`,
  );
  console.log(
    `Teacher: ${defaultTeacherAccount.email} / ${defaultTeacherAccount.password}`,
  );
  console.log(
    `Department head: ${defaultDepartmentHeadAccount.email} / ${defaultDepartmentHeadAccount.password}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
