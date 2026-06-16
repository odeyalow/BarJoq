import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { type Prisma } from "@prisma/client";
import * as XLSX from "xlsx";
import { formatFileSize } from "@/lib/file-storage";
import {
  sendStudentImportedAbsencesEmail,
  sendTeacherImportedGroupAbsencesEmail,
} from "@/lib/email";
import {
  notifyStudentAboutNewAbsence,
  notifyTeacherAboutImportedGroupAbsences,
} from "@/lib/notification-service";
import { prisma } from "@/lib/prisma";
import type {
  DepartmentHeadImportPreviewPayload,
  DepartmentHeadImportPreviewRow,
  DepartmentHeadPreviewFileMeta,
  DepartmentHeadSchedulePreviewRow,
} from "@/lib/department-head-portal";

type WorkbookRow = Record<string, unknown>;

type ParsedReportRow = {
  rowNumber: number;
  fullName: string;
  group: string;
  date: Date | null;
  arrivalTime: string;
  departureTime: string;
};

type ParsedScheduleRow = {
  rowNumber: number;
  group: string;
  subject: string;
  teacherName: string;
  lessonLabel: string;
  classroom: string;
  weekday: string;
  date: Date | null;
  startTime: string;
  endTime: string;
};

type TeacherContext = {
  id: string;
  userId: string;
  email: string;
  fullName: string;
  subjects: Array<{
    id: string;
    name: string;
  }>;
};

type StudentContext = {
  id: string;
  userId: string | null;
  fullName: string;
  groupId: string;
  groupName: string;
  email: string;
  course: number;
  age: number;
  teacher: TeacherContext;
};

type ImportContext = {
  fallbackTeacher: TeacherContext;
  teachersByName: Map<string, TeacherContext>;
  studentsByKey: Map<string, StudentContext>;
  studentsByName: Map<string, StudentContext[]>;
  studentsById: Map<string, StudentContext>;
};

type ResolvedImportRow = DepartmentHeadImportPreviewRow & {
  studentId?: string;
  normalizedGroup: string;
  normalizedFullName: string;
  rawDateIso: string;
};

type SavedImportFiles = {
  reportFile: {
    name: string;
    href: string;
    sizeLabel: string;
  };
  scheduleFile?: {
    name: string;
    href: string;
    sizeLabel: string;
  };
};

const reportAliases = {
  surname: ["фамилия", "surname", "lastname", "last name"],
  name: ["имя", "name", "firstname", "first name"],
  fullName: ["фио", "фио студента", "студент", "student"],
  group: ["группа", "group"],
  date: ["дата", "date"],
  arrivalTime: [
    "фактическое время прихода",
    "время прихода",
    "приход",
    "arrival",
  ],
  departureTime: [
    "фактическое время ухода",
    "время ухода",
    "уход",
    "departure",
  ],
} as const;

const scheduleAliases = {
  group: ["группа", "group"],
  subject: ["предмет", "дисциплина", "subject"],
  teacherName: ["преподаватель", "фио преподавателя", "teacher"],
  lessonLabel: ["пара", "занятие", "урок", "lesson", "номер пары"],
  classroom: ["аудитория", "кабинет", "classroom", "room"],
  weekday: ["день недели", "weekday", "day"],
  date: ["дата", "date"],
  startTime: ["время начала", "начало", "start", "from"],
  endTime: ["время окончания", "конец", "finish", "end", "to"],
} as const;

function normalizeHeader(value: string) {
  return value
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeName(value: string) {
  return value
    .replace(/ё/g, "е")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizeGroup(value: string) {
  return value.replace(/\s+/g, "").toUpperCase();
}

function findValueByAliases(
  row: WorkbookRow,
  aliases: readonly string[],
): unknown {
  const entries = Object.entries(row);

  for (const [key, value] of entries) {
    if (aliases.includes(normalizeHeader(key))) {
      return value;
    }
  }

  return "";
}

function normalizeCellText(value: unknown) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value ?? "").trim();
}

function parseDateValue(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(
      value.getFullYear(),
      value.getMonth(),
      value.getDate(),
      12,
      0,
      0,
      0,
    );
  }

  const rawValue = normalizeCellText(value);

  if (!rawValue) {
    return null;
  }

  const slashMatch = rawValue.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);

  if (slashMatch) {
    const day = Number(slashMatch[1]);
    const month = Number(slashMatch[2]) - 1;
    const year =
      slashMatch[3].length === 2
        ? 2000 + Number(slashMatch[3])
        : Number(slashMatch[3]);
    const parsed = new Date(year, month, day, 12, 0, 0, 0);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(rawValue);
  return Number.isNaN(parsed.getTime())
    ? null
    : new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 12, 0, 0, 0);
}

function parseTimeValue(value: unknown) {
  const rawValue = normalizeCellText(value);

  if (!rawValue) {
    return "";
  }

  const match = rawValue.match(/(\d{1,2}):(\d{2})/);

  if (!match) {
    return rawValue;
  }

  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

function toIsoDateString(value: Date | null) {
  return value ? value.toISOString() : "";
}

function formatRuDate(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Qyzylorda",
  }).format(date);
}

function getWeekdayKey(value: Date | null) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    weekday: "long",
    timeZone: "Asia/Qyzylorda",
  })
    .format(value)
    .replace(/ё/g, "е")
    .toLowerCase();
}

function timeToMinutes(value: string) {
  const match = value.match(/^(\d{1,2}):(\d{2})$/);

  if (!match) {
    return null;
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

function buildLessonLabel(row: {
  arrivalTime: string;
  departureTime: string;
  lessonLabel?: string;
  startTime?: string;
  endTime?: string;
}) {
  if (row.lessonLabel) {
    return row.lessonLabel;
  }

  if (row.startTime && row.endTime) {
    return `${row.startTime} - ${row.endTime}`;
  }

  if (row.arrivalTime && row.departureTime) {
    return `${row.arrivalTime} - ${row.departureTime}`;
  }

  return "Учебное занятие";
}

function normalizeNameKey(fullName: string) {
  // ФИО сопоставляем независимо от порядка слов («Имя Фамилия» = «Фамилия Имя»)
  return normalizeName(fullName)
    .split(" ")
    .filter(Boolean)
    .sort()
    .join(" ");
}

function buildGroupStudentKey(group: string, fullName: string) {
  return `${normalizeGroup(group)}::${normalizeNameKey(fullName)}`;
}

function sanitizeFileName(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

async function readWorksheetRows(file: File) {
  const workbook = XLSX.read(Buffer.from(await file.arrayBuffer()), {
    type: "buffer",
    cellDates: true,
  });
  const firstSheet = workbook.SheetNames[0];

  if (!firstSheet) {
    return [];
  }

  return XLSX.utils.sheet_to_json<WorkbookRow>(workbook.Sheets[firstSheet], {
    defval: "",
    raw: false,
  });
}

async function parseReportFile(file: File) {
  const rows = await readWorksheetRows(file);

  const parsedRows: ParsedReportRow[] = rows.map((row, index) => {
    const surname = normalizeCellText(findValueByAliases(row, reportAliases.surname));
    const name = normalizeCellText(findValueByAliases(row, reportAliases.name));
    const fullNameCell = normalizeCellText(findValueByAliases(row, reportAliases.fullName));
    const fullName = fullNameCell || [surname, name].filter(Boolean).join(" ").trim();

    return {
      rowNumber: index + 2,
      fullName,
      group: normalizeCellText(findValueByAliases(row, reportAliases.group)),
      date: parseDateValue(findValueByAliases(row, reportAliases.date)),
      arrivalTime: parseTimeValue(findValueByAliases(row, reportAliases.arrivalTime)),
      departureTime: parseTimeValue(findValueByAliases(row, reportAliases.departureTime)),
    };
  });

  return {
    file: {
      name: file.name,
      sizeLabel: formatFileSize(file.size),
      rowCount: parsedRows.length,
    } satisfies DepartmentHeadPreviewFileMeta,
    rows: parsedRows,
  };
}

async function parseScheduleFile(file?: File | null) {
  if (!file) {
    return {
      file: undefined,
      rows: [] as ParsedScheduleRow[],
    };
  }

  const rows = await readWorksheetRows(file);

  const parsedRows: ParsedScheduleRow[] = rows.map((row, index) => ({
    rowNumber: index + 2,
    group: normalizeCellText(findValueByAliases(row, scheduleAliases.group)),
    subject: normalizeCellText(findValueByAliases(row, scheduleAliases.subject)),
    teacherName: normalizeCellText(
      findValueByAliases(row, scheduleAliases.teacherName),
    ),
    lessonLabel: normalizeCellText(
      findValueByAliases(row, scheduleAliases.lessonLabel),
    ),
    classroom: normalizeCellText(findValueByAliases(row, scheduleAliases.classroom)),
    weekday: normalizeCellText(findValueByAliases(row, scheduleAliases.weekday)),
    date: parseDateValue(findValueByAliases(row, scheduleAliases.date)),
    startTime: parseTimeValue(findValueByAliases(row, scheduleAliases.startTime)),
    endTime: parseTimeValue(findValueByAliases(row, scheduleAliases.endTime)),
  }));

  return {
    file: {
      name: file.name,
      sizeLabel: formatFileSize(file.size),
      rowCount: parsedRows.length,
    } satisfies DepartmentHeadPreviewFileMeta,
    rows: parsedRows,
  };
}

async function getImportContext(): Promise<ImportContext> {
  const [teachers, students] = await Promise.all([
    prisma.teacherProfile.findMany({
      include: {
        user: {
          select: {
            email: true,
          },
        },
        subjects: {
          orderBy: {
            name: "asc",
          },
        },
      },
      orderBy: {
        fullName: "asc",
      },
    }),
    prisma.studentProfile.findMany({
      include: {
        group: {
          include: {
            teacher: {
              include: {
                user: {
                  select: {
                    email: true,
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
        },
      },
    }),
  ]);

  const nonHeadTeachers = teachers.filter((teacher) => !teacher.isDepartmentHead);
  const fallbackTeacher =
    nonHeadTeachers[0] ??
    teachers[0] ??
    (() => {
      throw new Error("В базе нет ни одного преподавателя для назначения пропусков.");
    })();

  const fallbackTeacherContext: TeacherContext = {
    id: fallbackTeacher.id,
    userId: fallbackTeacher.userId,
    email: fallbackTeacher.user.email,
    fullName: fallbackTeacher.fullName,
    subjects: fallbackTeacher.subjects.map((subject) => ({
      id: subject.id,
      name: subject.name,
    })),
  };

  const teachersByName = new Map<string, TeacherContext>(
    nonHeadTeachers.map((teacher) => [
      normalizeName(teacher.fullName),
      {
        id: teacher.id,
        userId: teacher.userId,
        email: teacher.user.email,
        fullName: teacher.fullName,
        subjects: teacher.subjects.map((subject) => ({
          id: subject.id,
          name: subject.name,
        })),
      },
    ]),
  );

  const studentEntries = students.map((student) => {
    const studentContext: StudentContext = {
      id: student.id,
      userId: student.userId,
      fullName: student.fullName,
      groupId: student.groupId,
      groupName: student.group.name,
      email: student.email,
      course: student.course,
      age: student.age,
      teacher: {
        id: student.group.teacher.id,
        userId: student.group.teacher.userId,
        email: student.group.teacher.user.email,
        fullName: student.group.teacher.fullName,
        subjects: student.group.teacher.subjects.map((subject) => ({
          id: subject.id,
          name: subject.name,
        })),
      },
    };

    return [
      buildGroupStudentKey(student.group.name, student.fullName),
      studentContext,
    ] as const;
  });

  return {
    fallbackTeacher: fallbackTeacherContext,
    teachersByName,
    studentsByKey: new Map(studentEntries),
    studentsByName: studentEntries.reduce((acc, [, student]) => {
      const key = normalizeNameKey(student.fullName);
      const list = acc.get(key) ?? [];
      list.push(student);
      acc.set(key, list);
      return acc;
    }, new Map<string, StudentContext[]>()),
    studentsById: new Map(studentEntries.map(([, student]) => [student.id, student])),
  };
}

function resolveScheduleRow(
  reportRow: ParsedReportRow,
  scheduleRows: ParsedScheduleRow[],
) {
  const groupKey = normalizeGroup(reportRow.group);
  let candidates = scheduleRows.filter(
    (row) => normalizeGroup(row.group) === groupKey,
  );

  if (!candidates.length) {
    return null;
  }

  const exactDateCandidates = candidates.filter(
    (row) =>
      row.date &&
      reportRow.date &&
      row.date.toDateString() === reportRow.date.toDateString(),
  );

  if (exactDateCandidates.length) {
    candidates = exactDateCandidates;
  } else {
    const weekday = getWeekdayKey(reportRow.date);
    const weekdayCandidates = candidates.filter(
      (row) => row.weekday && normalizeName(row.weekday) === weekday,
    );

    if (weekdayCandidates.length) {
      candidates = weekdayCandidates;
    }
  }

  const reportStart = timeToMinutes(reportRow.arrivalTime);
  const reportEnd = timeToMinutes(reportRow.departureTime);

  if (reportStart !== null || reportEnd !== null) {
    const timeCandidates = candidates.filter((row) => {
      const rowStart = timeToMinutes(row.startTime);
      const rowEnd = timeToMinutes(row.endTime);

      if (rowStart === null && rowEnd === null) {
        return false;
      }

      if (reportStart !== null && reportEnd !== null && rowStart !== null && rowEnd !== null) {
        return reportStart <= rowEnd && reportEnd >= rowStart;
      }

      return true;
    });

    if (timeCandidates.length) {
      candidates = timeCandidates;
    }
  }

  return [...candidates].sort((left, right) => {
    const leftTime = timeToMinutes(left.startTime) ?? Number.MAX_SAFE_INTEGER;
    const rightTime = timeToMinutes(right.startTime) ?? Number.MAX_SAFE_INTEGER;
    return leftTime - rightTime || left.rowNumber - right.rowNumber;
  })[0];
}

function resolveImportRows(
  context: ImportContext,
  reportRows: ParsedReportRow[],
  scheduleRows: ParsedScheduleRow[],
) {
  const rows: ResolvedImportRow[] = [];

  for (const reportRow of reportRows) {
    const notes: string[] = [];
    let isInvalid = false;
    let matchedStudent = context.studentsByKey.get(
      buildGroupStudentKey(reportRow.group, reportRow.fullName),
    );
    if (!matchedStudent) {
      // Фолбэк: если по «группа + ФИО» не нашли, ищем по ФИО
      // (когда группа в файле указана иначе, чем в системе)
      const byName = context.studentsByName.get(
        normalizeNameKey(reportRow.fullName),
      );
      if (byName && byName.length === 1) {
        matchedStudent = byName[0];
        notes.push("Студент сопоставлен по ФИО (группа в файле отличается).");
      }
    }
    const scheduleRow = resolveScheduleRow(reportRow, scheduleRows);
    const resolvedTeacher =
      matchedStudent?.teacher ??
      ((scheduleRow?.teacherName
        ? context.teachersByName.get(normalizeName(scheduleRow.teacherName))
        : null) ??
        context.fallbackTeacher);
    const resolvedSubject =
      scheduleRow?.subject ??
      matchedStudent?.teacher.subjects[0]?.name ??
      resolvedTeacher.subjects[0]?.name ??
      "Учебное занятие";
    const resolvedLessonLabel = buildLessonLabel({
      arrivalTime: reportRow.arrivalTime,
      departureTime: reportRow.departureTime,
      lessonLabel: scheduleRow?.lessonLabel,
      startTime: scheduleRow?.startTime,
      endTime: scheduleRow?.endTime,
    });
    const resolvedClassroom = scheduleRow?.classroom || "Не указана";

    if (!reportRow.fullName || !reportRow.group || !reportRow.date) {
      notes.push("В строке не хватает ФИО, группы или даты.");
      isInvalid = true;
    }

    if (!matchedStudent && !isInvalid) {
      notes.push("Студент с таким ФИО и группой не найден в базе.");
    }

    if (!scheduleRow) {
      notes.push("Расписание не найдено, применены резервные предмет и преподаватель.");
    }

    rows.push({
      rowNumber: reportRow.rowNumber,
      fullName: reportRow.fullName,
      group: reportRow.group,
      date: reportRow.date ? formatRuDate(reportRow.date) : "Не указана",
      arrivalTime: reportRow.arrivalTime || "Не указано",
      departureTime: reportRow.departureTime || "Не указано",
      studentState: isInvalid ? "invalid" : matchedStudent ? "matched" : "missing",
      subject: resolvedSubject,
      teacherName: resolvedTeacher.fullName,
      lessonLabel: resolvedLessonLabel,
      classroom: resolvedClassroom,
      notes,
      studentId: matchedStudent?.id,
      normalizedGroup: normalizeGroup(reportRow.group),
      normalizedFullName: normalizeName(reportRow.fullName),
      rawDateIso: toIsoDateString(reportRow.date),
    });
  }

  return rows;
}

function mapSchedulePreviewRows(rows: ParsedScheduleRow[]) {
  return rows.map<DepartmentHeadSchedulePreviewRow>((row) => ({
    rowNumber: row.rowNumber,
    group: row.group,
    subject: row.subject || "Не указано",
    teacherName: row.teacherName || "Не указано",
    lessonLabel: row.lessonLabel || buildLessonLabel({ arrivalTime: "", departureTime: "" }),
    classroom: row.classroom || "Не указано",
    weekday: row.weekday || (row.date ? getWeekdayKey(row.date) : "Не указано"),
    date: row.date ? formatRuDate(row.date) : "Не указана",
    startTime: row.startTime || "Не указано",
    endTime: row.endTime || "Не указано",
  }));
}

export async function buildDepartmentHeadImportPreview(input: {
  reportFile: File;
  scheduleFile?: File | null;
}): Promise<DepartmentHeadImportPreviewPayload> {
  const context = await getImportContext();
  const report = await parseReportFile(input.reportFile);
  const schedule = await parseScheduleFile(input.scheduleFile);
  const resolvedRows = resolveImportRows(context, report.rows, schedule.rows);
  const orderedRows = [...resolvedRows].sort((left, right) => {
    const statusOrder = {
      matched: 0,
      missing: 1,
      invalid: 2,
    } as const;

    return (
      statusOrder[left.studentState] - statusOrder[right.studentState] ||
      left.rowNumber - right.rowNumber
    );
  });
  const readyRows = orderedRows.filter((row) => row.studentState === "matched");

  return {
    reportFile: report.file,
    scheduleFile: schedule.file,
    summary: {
      readyCount: readyRows.length,
      matchedRowsCount: orderedRows.filter((row) => row.studentState === "matched").length,
      missingRowsCount: orderedRows.filter((row) => row.studentState === "missing").length,
      invalidRowsCount: orderedRows.filter((row) => row.studentState === "invalid").length,
      scheduleRowsCount: schedule.rows.length,
    },
    rows: orderedRows.map<DepartmentHeadImportPreviewRow>((row) => ({
      rowNumber: row.rowNumber,
      fullName: row.fullName,
      group: row.group,
      date: row.date,
      arrivalTime: row.arrivalTime,
      departureTime: row.departureTime,
      studentState: row.studentState,
      subject: row.subject,
      teacherName: row.teacherName,
      lessonLabel: row.lessonLabel,
      classroom: row.classroom,
      notes: row.notes,
    })),
    scheduleRows: mapSchedulePreviewRows(schedule.rows),
  };
}

async function saveImportFiles({
  batchId,
  reportFile,
  scheduleFile,
}: {
  batchId: string;
  reportFile: File;
  scheduleFile?: File | null;
}): Promise<SavedImportFiles> {
  const targetDirectory = path.join(process.cwd(), "public", "uploads", "imports", batchId);
  await mkdir(targetDirectory, { recursive: true });

  async function saveSingleFile(file: File, prefix: string) {
    const safeName = sanitizeFileName(file.name) || prefix;
    const fileName = `${prefix}-${Date.now()}-${safeName}`;
    const absolutePath = path.join(targetDirectory, fileName);
    await writeFile(absolutePath, Buffer.from(await file.arrayBuffer()));
    return {
      name: file.name,
      href: `/uploads/imports/${batchId}/${fileName}`,
      sizeLabel: formatFileSize(file.size),
    };
  }

  return {
    reportFile: await saveSingleFile(reportFile, "report"),
    scheduleFile: scheduleFile ? await saveSingleFile(scheduleFile, "schedule") : undefined,
  };
}

async function deleteImportFiles(batchId: string) {
  await rm(path.join(process.cwd(), "public", "uploads", "imports", batchId), {
    recursive: true,
    force: true,
  });
}

async function upsertSubject(
  tx: Prisma.TransactionClient,
  input: {
    name: string;
    teacherId: string;
  },
) {
  return tx.subject.upsert({
    where: {
      name_teacherId: {
        name: input.name,
        teacherId: input.teacherId,
      },
    },
    update: {},
    create: {
      name: input.name,
      teacherId: input.teacherId,
    },
  });
}

export async function commitDepartmentHeadImport(input: {
  departmentHeadId: string;
  reportFile: File;
  scheduleFile?: File | null;
}) {
  const context = await getImportContext();
  const report = await parseReportFile(input.reportFile);
  const schedule = await parseScheduleFile(input.scheduleFile);
  const resolvedRows = resolveImportRows(context, report.rows, schedule.rows);
  const departmentHead = await prisma.teacherProfile.findUnique({
    where: {
      id: input.departmentHeadId,
    },
    select: {
      fullName: true,
    },
  });
  const departmentHeadName =
    departmentHead?.fullName ?? "Заведующая отделением";
  const batchId = randomUUID();
  const savedFiles = await saveImportFiles({
    batchId,
    reportFile: input.reportFile,
    scheduleFile: input.scheduleFile,
  });

  const createdAbsenceIds: string[] = [];
  const studentEmailNotifications = new Map<
    string,
    {
      recipientEmail: string;
      studentName: string;
      groupName: string;
      absences: Array<{
        subject: string;
        dateLabel: string;
        lessonLabel: string;
        teacherName: string;
        classroom: string;
      }>;
    }
  >();
  const teacherGroupNotifications = new Map<
    string,
    {
      userId: string;
      recipientEmail: string;
      teacherName: string;
      groupId: string;
      groupName: string;
      absenceCount: number;
      studentIds: Set<string>;
      studentNames: Set<string>;
    }
  >();

  try {
    await prisma.$transaction(async (tx) => {
      await tx.importBatch.create({
        data: {
          id: batchId,
          departmentHeadId: input.departmentHeadId,
          reportFileName: savedFiles.reportFile.name,
          reportFileHref: savedFiles.reportFile.href,
          reportFileSizeLabel: savedFiles.reportFile.sizeLabel,
          scheduleFileName: savedFiles.scheduleFile?.name,
          scheduleFileHref: savedFiles.scheduleFile?.href,
          scheduleFileSizeLabel: savedFiles.scheduleFile?.sizeLabel,
        },
      });

      const matchedStudentIds = new Set<string>();

      for (const row of resolvedRows) {
        if (row.studentState !== "matched" || !row.studentId) {
          continue;
        }

        const matchedStudent = context.studentsById.get(row.studentId);

        if (!matchedStudent) {
          continue;
        }

        const teacher = matchedStudent.teacher;
        const subject = await upsertSubject(tx, {
          name: row.subject,
          teacherId: teacher.id,
        });

        matchedStudentIds.add(matchedStudent.id);

        const absenceDate = row.rawDateIso ? new Date(row.rawDateIso) : new Date();
        const duplicateAbsence = await tx.absence.findFirst({
          where: {
            studentId: matchedStudent.id,
            subjectId: subject.id,
            date: absenceDate,
            lessonLabel: row.lessonLabel,
          },
        });

        if (duplicateAbsence) {
          continue;
        }

        const createdAbsence = await tx.absence.create({
          data: {
            importBatchId: batchId,
            studentId: matchedStudent.id,
            teacherId: teacher.id,
            subjectId: subject.id,
            date: absenceDate,
            lessonLabel: row.lessonLabel,
            classroom: row.classroom,
          },
        });

        createdAbsenceIds.push(createdAbsence.id);

        if (matchedStudent.userId) {
          const existingStudentEmailNotification = studentEmailNotifications.get(
            matchedStudent.id,
          );

          if (existingStudentEmailNotification) {
            existingStudentEmailNotification.absences.push({
              subject: row.subject,
              dateLabel: formatRuDate(absenceDate),
              lessonLabel: row.lessonLabel,
              teacherName: teacher.fullName,
              classroom: row.classroom,
            });
          } else {
            studentEmailNotifications.set(matchedStudent.id, {
              recipientEmail: matchedStudent.email,
              studentName: matchedStudent.fullName,
              groupName: matchedStudent.groupName,
              absences: [
                {
                  subject: row.subject,
                  dateLabel: formatRuDate(absenceDate),
                  lessonLabel: row.lessonLabel,
                  teacherName: teacher.fullName,
                  classroom: row.classroom,
                },
              ],
            });
          }
        }

        const notificationKey = `${teacher.userId}:${matchedStudent.groupId}`;
        const existingNotification = teacherGroupNotifications.get(notificationKey);

        if (existingNotification) {
          existingNotification.absenceCount += 1;
          existingNotification.studentIds.add(matchedStudent.id);
          existingNotification.studentNames.add(matchedStudent.fullName);
        } else {
          teacherGroupNotifications.set(notificationKey, {
            userId: teacher.userId,
            recipientEmail: teacher.email,
            teacherName: teacher.fullName,
            groupId: matchedStudent.groupId,
            groupName: matchedStudent.groupName,
            absenceCount: 1,
            studentIds: new Set([matchedStudent.id]),
            studentNames: new Set([matchedStudent.fullName]),
          });
        }
      }

      const createdAbsences = await tx.absence.findMany({
        where: {
          importBatchId: batchId,
        },
      });

      await tx.importBatch.update({
        where: {
          id: batchId,
        },
        data: {
          importedAbsencesCount: createdAbsences.length,
          matchedStudentsCount: matchedStudentIds.size,
          unmatchedRowsCount: resolvedRows.filter((row) => row.studentState !== "matched").length,
        },
      });
    });
  } catch (error) {
    await deleteImportFiles(batchId);
    throw error;
  }

  for (const absenceId of createdAbsenceIds) {
    await notifyStudentAboutNewAbsence(absenceId);
  }

  for (const notification of teacherGroupNotifications.values()) {
    await notifyTeacherAboutImportedGroupAbsences({
      userId: notification.userId,
      groupId: notification.groupId,
      groupName: notification.groupName,
      absenceCount: notification.absenceCount,
      studentCount: notification.studentIds.size,
    });
  }

  await Promise.allSettled([
    ...Array.from(studentEmailNotifications.values()).map((notification) =>
      sendStudentImportedAbsencesEmail({
        ...notification,
        departmentHeadName,
      }),
    ),
    ...Array.from(teacherGroupNotifications.values()).map((notification) =>
      sendTeacherImportedGroupAbsencesEmail({
        recipientEmail: notification.recipientEmail,
        teacherName: notification.teacherName,
        departmentHeadName,
        groupName: notification.groupName,
        absenceCount: notification.absenceCount,
        studentNames: [...notification.studentNames].sort((left, right) =>
          left.localeCompare(right, "ru"),
        ),
      }),
    ),
  ]);

  return {
    batchId,
    createdAbsenceIds,
  };
}

export async function loadWorksheetTemplateStyle() {
  const templateHtml = await readFile(
    path.join(process.cwd(), "public", "template", "прог отработка.html"),
    "utf8",
  );
  const styleMatch = templateHtml.match(/<style>[\s\S]*?<\/style>/i);
  return styleMatch?.[0] ?? "";
}
