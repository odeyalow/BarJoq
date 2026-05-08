import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileClock,
} from "lucide-react";

export type AbsenceStatus =
  | "missed"
  | "nb_marked"
  | "request_sent"
  | "awaiting_head"
  | "assignment_received"
  | "under_review"
  | "completed"
  | "expired";

export type StatusFilter = "all" | AbsenceStatus;
export type SortMode = "newest" | "oldest" | "date" | "status" | "subject";

export interface Attachment {
  id: string;
  name: string;
  href: string;
  sizeLabel: string;
}

export interface TeacherAssignment {
  text: string;
  attachments: Attachment[];
  sentAt: string;
}

export interface StudentResponse {
  text: string;
  attachments: Attachment[];
  submittedAt: string;
  editedAt?: string;
}

export interface AbsenceRecord {
  id: string;
  createdAt: string;
  date: string;
  lessonLabel: string;
  updatedAt: string;
  markedNbAt?: string;
  requestedAt?: string;
  teacherConfirmedAt?: string;
  departmentHeadApprovedAt?: string;
  reworkAccessRequestedAt?: string;
  subjectId: string;
  subject: string;
  teacherName: string;
  teacherRole: string;
  classroom: string;
  status: AbsenceStatus;
  excuseAttachment?: Attachment;
  grade?: number;
  completedAt?: string;
  assignment?: TeacherAssignment;
  response?: StudentResponse;
}

export interface StudentProfile {
  fullName: string;
  group: string;
  age: number;
  course: number;
  email: string;
}

export interface StatusMeta {
  label: string;
  tone: "red" | "gray" | "amber" | "green" | "teal";
  description: string;
  icon: LucideIcon;
}

export type NotificationTone = "red" | "gray" | "amber" | "green" | "teal";

export type NotificationIcon =
  | "calendar"
  | "bell"
  | "message"
  | "review"
  | "completed";

export interface PortalNotification {
  id: string;
  absenceId: string;
  targetHref?: string;
  title: string;
  message: string;
  createdAt: string;
  tone: NotificationTone;
  icon: NotificationIcon;
  isRead: boolean;
}

export interface StudentPortalPayload {
  student: StudentProfile;
  absences: AbsenceRecord[];
  notifications: PortalNotification[];
}

export type StudentNotification = PortalNotification;

export const emptyStudentProfile: StudentProfile = {
  fullName: "",
  group: "",
  age: 0,
  course: 0,
  email: "",
};

export const statusMeta: Record<AbsenceStatus, StatusMeta> = {
  missed: {
    label: "Не отработан",
    tone: "red",
    description:
      "Нужно запросить задание у преподавателя до конца месяца.",
    icon: AlertCircle,
  },
  nb_marked: {
    label: "Н/Б поставлено",
    tone: "red",
    description:
      "Преподаватель поставил вам н/б. Этот пропуск закрыт без возможности отправить заявку на отработку.",
    icon: AlertCircle,
  },
  request_sent: {
    label: "Заявка отправлена",
    tone: "gray",
    description:
      "Заявка отправлена преподавателю. Задание нужно получить до конца месяца.",
    icon: Clock3,
  },
  awaiting_head: {
    label: "Ожидает подтверждения",
    tone: "gray",
    description:
      "Преподаватель уже подготовил задание, но оно станет доступно только после подтверждения зав. отделения.",
    icon: Clock3,
  },
  assignment_received: {
    label: "Получено задание",
    tone: "amber",
    description: "После получения задания на ответ дается 3 дня.",
    icon: ClipboardList,
  },
  under_review: {
    label: "На оценивании",
    tone: "teal",
    description: "Ответ отправлен и находится на проверке.",
    icon: FileClock,
  },
  completed: {
    label: "Отработан",
    tone: "green",
    description:
      "Преподаватель проверил работу и выставил итоговый балл.",
    icon: CheckCircle2,
  },
  expired: {
    label: "Время на отработку истекло",
    tone: "red",
    description:
      "Срок на отработку истек, пропуск автоматически переведен в н/б.",
    icon: AlertCircle,
  },
};

export const statusOrder: Record<AbsenceStatus, number> = {
  missed: 0,
  nb_marked: 1,
  request_sent: 2,
  awaiting_head: 3,
  assignment_received: 4,
  under_review: 5,
  completed: 6,
  expired: 7,
};

export const statusFilters: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "Все" },
  { value: "missed", label: "Не отработан" },
  { value: "nb_marked", label: "Н/Б поставлено" },
  { value: "request_sent", label: "Заявка" },
  { value: "awaiting_head", label: "Ожидает подтверждения" },
  { value: "assignment_received", label: "Получено задание" },
  { value: "under_review", label: "На оценивании" },
  { value: "completed", label: "Отработан" },
  { value: "expired", label: "Время истекло" },
];

export const sortOptions: Array<{ value: SortMode; label: string }> = [
  { value: "newest", label: "Сначала новые" },
  { value: "oldest", label: "Сначала старые" },
  { value: "date", label: "По дате пропуска" },
  { value: "status", label: "По статусу" },
  { value: "subject", label: "По предмету" },
];

const portalTimeZone = "Asia/Qyzylorda";

const fullDateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  timeZone: portalTimeZone,
  year: "numeric",
});

const fullDateTimeFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  timeZone: portalTimeZone,
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const compactDateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  timeZone: portalTimeZone,
  year: "numeric",
});

export const formatPortalDate = (value: string) =>
  fullDateFormatter.format(new Date(value));

export const formatPortalDateTime = (value: string) =>
  fullDateTimeFormatter.format(new Date(value));

export const formatCompactDate = (value: string) =>
  compactDateFormatter.format(new Date(value));

export const countByStatus = (
  absences: AbsenceRecord[],
  status: AbsenceStatus,
) => absences.filter((absence) => absence.status === status).length;

export const activeAbsencesCount = (absences: AbsenceRecord[]) =>
  absences.filter(
    (absence) =>
      absence.status !== "completed" &&
      absence.status !== "expired" &&
      absence.status !== "nb_marked",
  ).length;
