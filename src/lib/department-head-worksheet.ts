import { chromium } from "playwright";
import { prisma } from "@/lib/prisma";
import { loadWorksheetTemplateStyle } from "@/lib/department-head-import";
import type { DepartmentHeadSortMode } from "@/lib/department-head-portal";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatRuDate(value: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Qyzylorda",
  }).format(value);
}

function buildWorksheetPage(input: {
  index: number;
  studentFullName: string;
  groupName: string;
  specialty: string;
  absences: Array<{
    subject: string;
    date: Date;
    grade: number | null;
    teacherName: string;
  }>;
}) {
  const referenceNumber = `${new Date().getFullYear()}-${String(input.index + 1).padStart(3, "0")}`;
  const certificateNumber = `${input.groupName}-${String(input.index + 1).padStart(2, "0")}`;

  return `
    <section class="worksheet-page">
      <p class="worksheet-title">НАПРАВЛЕНИЕ НА ОТРАБОТКУ ПРОПУЩЕННЫХ ЧАСОВ № ${escapeHtml(referenceNumber)}</p>
      <p class="worksheet-meta"><strong>студента группы</strong> ${escapeHtml(input.groupName)}</p>
      <p class="worksheet-meta"><strong>ФИО студента:</strong> ${escapeHtml(input.studentFullName)}</p>
      <p class="worksheet-meta"><strong>Специальность:</strong> ${escapeHtml(input.specialty || "Не указана")}</p>
      <p class="worksheet-meta"><strong>Квалификация:</strong> Не указана</p>
      <p class="worksheet-meta"><strong>Основание:</strong> 037/У Справка № ${escapeHtml(certificateNumber)}</p>

      <table class="worksheet-table">
        <thead>
          <tr>
            <th>№</th>
            <th>Дисциплина</th>
            <th>Дата пропущенных часов</th>
            <th>Оценка</th>
            <th>ФИО преподавателя</th>
            <th>Подпись преподавателя</th>
          </tr>
        </thead>
        <tbody>
          ${input.absences
            .map(
              (absence, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${escapeHtml(absence.subject)}</td>
                  <td>${escapeHtml(formatRuDate(absence.date))}</td>
                  <td>${absence.grade ?? ""}</td>
                  <td>${escapeHtml(absence.teacherName)}</td>
                  <td></td>
                </tr>
              `,
            )
            .join("")}
        </tbody>
      </table>

      <div class="worksheet-signature-block">
        <p>Зав. отделением ______________________________________________</p>
        <p>Подпись заведующего отделением не заполняется автоматически.</p>
      </div>
    </section>
  `;
}

function buildWorksheetHtml(input: {
  styleTag: string;
  pages: string[];
}) {
  return `
    <html>
      <head>
        <meta charset="utf-8" />
        ${input.styleTag}
        <style>
          body {
            margin: 0;
            padding: 0;
            color: #111;
            font-family: "Times New Roman", serif;
          }
          .worksheet-page {
            box-sizing: border-box;
            min-height: 100vh;
            padding: 36px 48px 54px 72px;
            page-break-after: always;
          }
          .worksheet-page:last-child {
            page-break-after: auto;
          }
          .worksheet-title {
            font-size: 16px;
            font-weight: 700;
            margin: 0 0 18px;
          }
          .worksheet-meta {
            font-size: 14px;
            line-height: 1.5;
            margin: 0 0 8px;
          }
          .worksheet-table {
            border-collapse: collapse;
            margin-top: 18px;
            width: 100%;
          }
          .worksheet-table th,
          .worksheet-table td {
            border: 1px solid #111;
            font-size: 13px;
            line-height: 1.35;
            padding: 8px 10px;
            vertical-align: top;
          }
          .worksheet-table th {
            font-weight: 700;
            text-align: center;
          }
          .worksheet-signature-block {
            margin-top: 32px;
            font-size: 13px;
            line-height: 1.6;
          }
        </style>
      </head>
      <body>
        ${input.pages.join("")}
      </body>
    </html>
  `;
}

export async function generateDepartmentHeadWorksheetPdf(input: {
  studentId?: string;
  sortMode?: DepartmentHeadSortMode;
}) {
  const absences = await prisma.absence.findMany({
    where: input.studentId
      ? {
          studentId: input.studentId,
        }
      : undefined,
    include: {
      student: {
        include: {
          group: true,
        },
      },
      subject: true,
      teacher: true,
    },
    orderBy:
      input.sortMode === "date"
        ? {
            date: "desc",
          }
        : {
            updatedAt: "desc",
          },
  });

  if (!absences.length) {
    throw new Error("Нет данных для формирования отработочного листа.");
  }

  const groupedAbsences = new Map<
    string,
    {
      studentFullName: string;
      groupName: string;
      specialty: string;
      absences: Array<{
        subject: string;
        date: Date;
        grade: number | null;
        teacherName: string;
      }>;
    }
  >();

  for (const absence of absences) {
    const existingGroup = groupedAbsences.get(absence.studentId);

    if (!existingGroup) {
      groupedAbsences.set(absence.studentId, {
        studentFullName: absence.student.fullName,
        groupName: absence.student.group.name,
        specialty: absence.student.group.specialty,
        absences: [],
      });
    }

    groupedAbsences.get(absence.studentId)?.absences.push({
      subject: absence.subject.name,
      date: absence.date,
      grade: absence.grade,
      teacherName: absence.teacher.fullName,
    });
  }

  const pages = [...groupedAbsences.values()]
    .sort((left, right) =>
      left.studentFullName.localeCompare(right.studentFullName, "ru"),
    )
    .map((entry, index) =>
      buildWorksheetPage({
        index,
        studentFullName: entry.studentFullName,
        groupName: entry.groupName,
        specialty: entry.specialty,
        absences: entry.absences,
      }),
    );

  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();
    await page.setContent(
      buildWorksheetHtml({
        styleTag: await loadWorksheetTemplateStyle(),
        pages,
      }),
      { waitUntil: "networkidle" },
    );

    return await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "0",
        right: "0",
        bottom: "0",
        left: "0",
      },
    });
  } finally {
    await browser.close();
  }
}
