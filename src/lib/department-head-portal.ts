import type { TeacherAbsenceStatus } from "@/lib/teacher-portal";

export type DepartmentHeadSortMode = "newest" | "date" | "student";

export interface DepartmentHeadProfile {
  fullName: string;
  position: string;
  department: string;
  email: string;
  regularTeachersCount: number;
  groupsCount: number;
  studentsCount: number;
  importsCount: number;
}

export interface DepartmentHeadImportFileRecord {
  name: string;
  href: string;
  sizeLabel: string;
}

export interface DepartmentHeadImportBatchRecord {
  id: string;
  createdAt: string;
  importedAbsencesCount: number;
  matchedStudentsCount: number;
  unmatchedRowsCount: number;
  groups: string[];
  subjects: string[];
  reportFile: DepartmentHeadImportFileRecord;
  scheduleFile?: DepartmentHeadImportFileRecord;
}

export interface DepartmentHeadStudentOption {
  id: string;
  fullName: string;
  group: string;
}

export interface DepartmentHeadStudentStatusRecord {
  absenceId: string;
  importBatchId?: string;
  studentId: string;
  studentFullName: string;
  studentGroup: string;
  subject: string;
  teacherName: string;
  status: TeacherAbsenceStatus;
  date: string;
  updatedAt: string;
  lessonLabel: string;
  classroom: string;
  grade?: number;
}

export interface DepartmentHeadPortalPayload {
  head: DepartmentHeadProfile;
  imports: DepartmentHeadImportBatchRecord[];
  students: DepartmentHeadStudentOption[];
  studentStatuses: DepartmentHeadStudentStatusRecord[];
}

export interface DepartmentHeadPreviewFileMeta {
  name: string;
  sizeLabel: string;
  rowCount: number;
}

export interface DepartmentHeadImportPreviewRow {
  rowNumber: number;
  fullName: string;
  group: string;
  date: string;
  arrivalTime: string;
  departureTime: string;
  studentState: "matched" | "missing" | "invalid";
  subject: string;
  teacherName: string;
  lessonLabel: string;
  classroom: string;
  notes: string[];
}

export interface DepartmentHeadSchedulePreviewRow {
  rowNumber: number;
  group: string;
  subject: string;
  teacherName: string;
  lessonLabel: string;
  classroom: string;
  weekday: string;
  date: string;
  startTime: string;
  endTime: string;
}

export interface DepartmentHeadImportPreviewPayload {
  reportFile: DepartmentHeadPreviewFileMeta;
  scheduleFile?: DepartmentHeadPreviewFileMeta;
  summary: {
    readyCount: number;
    matchedRowsCount: number;
    missingRowsCount: number;
    invalidRowsCount: number;
    scheduleRowsCount: number;
  };
  rows: DepartmentHeadImportPreviewRow[];
  scheduleRows: DepartmentHeadSchedulePreviewRow[];
}

export const departmentHeadSortOptions: Array<{
  value: DepartmentHeadSortMode;
  label: string;
}> = [
  { value: "newest", label: "Сначала новые" },
  { value: "date", label: "По дате пропуска" },
  { value: "student", label: "По студенту" },
];
