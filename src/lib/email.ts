import type { ReactNode } from "react";
import { render } from "@react-email/render";
import PortalNotificationEmail from "@/emails/portal-notification-email";
import StudentAbsenceImportEmail from "@/emails/student-absence-import-email";
import TeacherGroupAbsenceEmail from "@/emails/teacher-group-absence-email";
import { resend, resendConfigured } from "@/lib/resend";

const defaultTestRecipient = "nesquikyey@gmail.com";
const mailFrom =
  process.env.RESEND_FROM_EMAIL?.trim() ||
  "BarJoq <onboarding@resend.dev>";

function resolveNotificationRecipient(email?: string | null) {
  const overrideRecipient =
    process.env.MAIL_TEST_RECIPIENT?.trim() || defaultTestRecipient;

  return overrideRecipient || email?.trim() || null;
}

function resolveAppUrl() {
  const explicitAppUrl =
    process.env.APP_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (explicitAppUrl) {
    return explicitAppUrl.replace(/\/+$/, "");
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();

  if (vercelUrl) {
    return `https://${vercelUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`;
  }

  return "http://localhost:3000";
}

function buildAbsoluteUrl(path?: string | null) {
  if (!path) {
    return undefined;
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${resolveAppUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

async function sendEmail(input: {
  to?: string | null;
  subject: string;
  react: ReactNode;
}) {
  const recipient = resolveNotificationRecipient(input.to);

  if (!recipient) {
    return false;
  }

  if (!resend || !resendConfigured) {
    console.warn(
      `[email] skipped send to ${recipient}: RESEND_API_KEY is not configured`,
    );
    return false;
  }

  try {
    const html = await render(input.react);

    await resend.emails.send({
      from: mailFrom,
      to: recipient,
      subject: input.subject,
      html,
    });

    return true;
  } catch (error) {
    console.error("[email] send failed", error);
    return false;
  }
}

export async function sendStudentImportedAbsencesEmail(input: {
  recipientEmail?: string | null;
  studentName: string;
  groupName: string;
  departmentHeadName: string;
  absences: Array<{
    subject: string;
    dateLabel: string;
    lessonLabel: string;
    teacherName: string;
    classroom: string;
  }>;
}) {
  if (!input.absences.length) {
    return false;
  }

  const subject =
    input.absences.length === 1
      ? "BarJoq | Студенту: у вас появились пропуски"
      : `BarJoq | Студенту: у вас появились пропуски (${input.absences.length})`;

  return sendEmail({
    to: input.recipientEmail,
    subject,
    react: StudentAbsenceImportEmail({
      studentName: input.studentName,
      groupName: input.groupName,
      departmentHeadName: input.departmentHeadName,
      absences: input.absences,
    }),
  });
}

export async function sendTeacherImportedGroupAbsencesEmail(input: {
  recipientEmail?: string | null;
  teacherName: string;
  departmentHeadName: string;
  groupName: string;
  absenceCount: number;
  studentNames: string[];
}) {
  if (!input.absenceCount) {
    return false;
  }

  const subject =
    input.absenceCount === 1
      ? `BarJoq | Преподавателю: у студентов группы ${input.groupName} появились пропуски`
      : `BarJoq | Преподавателю: у студентов группы ${input.groupName} появились пропуски (${input.absenceCount})`;

  return sendEmail({
    to: input.recipientEmail,
    subject,
    react: TeacherGroupAbsenceEmail({
      teacherName: input.teacherName,
      departmentHeadName: input.departmentHeadName,
      groupName: input.groupName,
      absenceCount: input.absenceCount,
      studentNames: input.studentNames,
    }),
  });
}

export async function sendPortalNotificationEmail(input: {
  recipientEmail?: string | null;
  recipientName: string;
  recipientRole: "student" | "teacher" | "department_head";
  title: string;
  message: string;
  targetHref?: string | null;
}) {
  const actionHref = buildAbsoluteUrl(input.targetHref);
  const actionLabel =
    input.recipientRole === "student"
      ? "Открыть личный кабинет"
      : input.recipientRole === "department_head"
        ? "Открыть панель зав. отделения"
        : "Открыть кабинет преподавателя";

  return sendEmail({
    to: input.recipientEmail,
    subject: `BarJoq | ${input.title}`,
    react: PortalNotificationEmail({
      recipientName: input.recipientName,
      recipientRole: input.recipientRole,
      title: input.title,
      message: input.message,
      actionHref,
      actionLabel,
    }),
  });
}
