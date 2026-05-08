import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  FileCheck2,
  Inbox,
} from "lucide-react";
import type { Attachment, PortalNotification } from "@/lib/student-portal";

export type TeacherAbsenceStatus =
  | "missed"
  | "nb_marked"
  | "request_received"
  | "awaiting_head"
  | "assignment_sent"
  | "submitted"
  | "graded"
  | "expired";

export type TeacherSortMode =
  | "newest"
  | "oldest"
  | "date"
  | "status"
  | "student";
export type TeacherStatusFilter = "all" | TeacherAbsenceStatus;

export interface TeacherProfile {
  fullName: string;
  position: string;
  department: string;
  email: string;
  groups: string[];
  subjects: string[];
}

export interface TeacherStudentRecord {
  id: string;
  fullName: string;
  group: string;
  age: number;
  course: number;
  email: string;
}

export interface TeacherGroupRecord {
  id: string;
  name: string;
  course: number;
  specialty: string;
  studentIds: string[];
}

export interface TeacherAssignmentRecord {
  text: string;
  attachments: Attachment[];
  sentAt: string;
  editedAt?: string;
}

export interface TeacherResponseRecord {
  text: string;
  attachments: Attachment[];
  submittedAt: string;
  editedAt?: string;
}

export interface TeacherAbsenceRecord {
  id: string;
  studentId: string;
  date: string;
  lessonLabel: string;
  updatedAt: string;
  requestedAt?: string;
  teacherConfirmedAt?: string;
  departmentHeadApprovedAt?: string;
  reworkAccessRequestedAt?: string;
  subject: string;
  classroom: string;
  studentFullName: string;
  studentGroup: string;
  studentAge: number;
  studentCourse: number;
  studentEmail: string;
  status: TeacherAbsenceStatus;
  excuseAttachment?: Attachment;
  markedNbAt?: string;
  assignment?: TeacherAssignmentRecord;
  response?: TeacherResponseRecord;
  grade?: number;
  gradedAt?: string;
}

export interface TeacherStatusMeta {
  label: string;
  description: string;
  tone: "red" | "gray" | "amber" | "green" | "teal";
  icon: LucideIcon;
}

export interface TeacherPortalPayload {
  teacher: TeacherProfile;
  groups: TeacherGroupRecord[];
  students: TeacherStudentRecord[];
  absences: TeacherAbsenceRecord[];
  notifications: PortalNotification[];
}

export const emptyTeacherProfile: TeacherProfile = {
  fullName: "",
  position: "",
  department: "",
  email: "",
  groups: [],
  subjects: [],
};

export const teacherStatusMeta: Record<
  TeacherAbsenceStatus,
  TeacherStatusMeta
> = {
  missed: {
    label: "Не отработал",
    description: "Студент еще не отправлял заявку на отработку.",
    tone: "red",
    icon: AlertCircle,
  },
  nb_marked: {
    label: "Н/Б поставлено",
    description: "Пропуск закрыт преподавателем отметкой н/б.",
    tone: "red",
    icon: AlertCircle,
  },
  request_received: {
    label: "Получена заявка",
    description:
      "Студент запросил отработку. До конца месяца можно выдать задание.",
    tone: "gray",
    icon: Inbox,
  },
  awaiting_head: {
    label: "Ожидает подтверждения",
    description:
      "Преподаватель уже подготовил задание, теперь нужно подтверждение зав. отделения.",
    tone: "gray",
    icon: ClipboardList,
  },
  assignment_sent: {
    label: "Задание отправлено",
    description: "Задание выдано. На выполнение у студента есть 3 дня.",
    tone: "amber",
    icon: ClipboardList,
  },
  submitted: {
    label: "Задание отработано",
    description: "Студент отправил ответ, теперь его нужно оценить.",
    tone: "teal",
    icon: FileCheck2,
  },
  graded: {
    label: "Оценено",
    description: "Отработка проверена, итоговый балл выставлен.",
    tone: "green",
    icon: CheckCircle2,
  },
  expired: {
    label: "Время на отработку истекло",
    description: "Срок истек автоматически, пропуск переведен в н/б.",
    tone: "red",
    icon: AlertCircle,
  },
};

export const teacherStatusOrder: Record<TeacherAbsenceStatus, number> = {
  missed: 0,
  nb_marked: 1,
  request_received: 2,
  awaiting_head: 3,
  assignment_sent: 4,
  submitted: 5,
  graded: 6,
  expired: 7,
};

export const teacherStatusFilters: Array<{
  value: TeacherStatusFilter;
  label: string;
}> = [
  { value: "all", label: "Все" },
  { value: "missed", label: "Не отработал" },
  { value: "nb_marked", label: "Н/Б поставлено" },
  { value: "request_received", label: "Получена заявка" },
  { value: "awaiting_head", label: "Ожидает подтверждения" },
  { value: "assignment_sent", label: "Задание отправлено" },
  { value: "submitted", label: "Задание отработано" },
  { value: "graded", label: "Оценено" },
  { value: "expired", label: "Время истекло" },
];

export const teacherSortOptions: Array<{
  value: TeacherSortMode;
  label: string;
}> = [
  { value: "newest", label: "Сначала новые" },
  { value: "oldest", label: "Сначала старые" },
  { value: "date", label: "По дате пропуска" },
  { value: "status", label: "По статусу" },
  { value: "student", label: "По студенту" },
];

export const activeTeacherAbsencesCount = (
  absences: TeacherAbsenceRecord[],
) =>
  absences.filter(
    (absence) =>
      absence.status !== "graded" &&
      absence.status !== "expired" &&
      absence.status !== "nb_marked",
  ).length;

export const countTeacherAbsencesByStatus = (
  absences: TeacherAbsenceRecord[],
  status: TeacherAbsenceStatus,
) => absences.filter((absence) => absence.status === status).length;

export const uniqueTeacherGroups = (absences: TeacherAbsenceRecord[]) =>
  [...new Set(absences.map((absence) => absence.studentGroup))].sort((a, b) =>
    a.localeCompare(b, "ru"),
  );

export const uniqueTeacherSubjects = (absences: TeacherAbsenceRecord[]) =>
  [...new Set(absences.map((absence) => absence.subject))].sort((a, b) =>
    a.localeCompare(b, "ru"),
  );

export const uniqueTeacherStudents = (absences: TeacherAbsenceRecord[]) =>
  [...new Map(absences.map((absence) => [absence.studentId, absence])).values()]
    .map((absence) => ({
      id: absence.studentId,
      fullName: absence.studentFullName,
    }))
    .sort((a, b) => a.fullName.localeCompare(b.fullName, "ru"));

export const countStudentAbsences = (
  absences: TeacherAbsenceRecord[],
  studentId: string,
) => absences.filter((absence) => absence.studentId === studentId).length;

export const countGroupAbsences = (
  absences: TeacherAbsenceRecord[],
  groupName: string,
) => absences.filter((absence) => absence.studentGroup === groupName).length;
