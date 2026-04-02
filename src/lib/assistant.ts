export type PortalAssistantRole = "student" | "teacher";

export interface AssistantTransportMessage {
  role: "assistant" | "user";
  content: string;
}

export interface AssistantChatMessage extends AssistantTransportMessage {
  id: string;
  provider?: "hf" | "fallback";
  relatedAbsenceIds?: string[];
  relatedGroupIds?: string[];
  relatedStudentIds?: string[];
  visualizations?: AssistantVisualization[];
}

export interface AssistantStatVisualization {
  type: "stats";
  title?: string;
  items: Array<{
    label: string;
    tone?: "red" | "gray" | "amber" | "green" | "teal";
    value: string;
  }>;
}

export interface AssistantListVisualization {
  type: "list";
  title: string;
  items: Array<{
    meta?: string;
    subtitle?: string;
    title: string;
  }>;
}

export interface AssistantTableVisualization {
  type: "table";
  columns: string[];
  rows: string[][];
  title: string;
}

export type AssistantVisualization =
  | AssistantListVisualization
  | AssistantStatVisualization
  | AssistantTableVisualization;

export interface StudentAssistantSnapshot {
  role: "student";
  currentPage: string;
  student: {
    fullName: string;
    group: string;
    course: number;
  };
  absences: Array<{
    id: string;
    subject: string;
    date: string;
    lessonLabel: string;
    status: string;
    teacherName: string;
    classroom: string;
    grade?: number;
    assignmentSentAt?: string;
    responseSubmittedAt?: string;
    completedAt?: string;
  }>;
  notifications?: Array<{
    id: string;
    absenceId: string;
    title: string;
    message: string;
    createdAt: string;
    isRead: boolean;
  }>;
}

export interface TeacherAssistantSnapshot {
  role: "teacher";
  currentPage: string;
  teacher: {
    fullName: string;
    groups: string[];
    subjects: string[];
  };
  groups: Array<{
    id: string;
    name: string;
    course: number;
    specialty: string;
    studentIds: string[];
  }>;
  students: Array<{
    id: string;
    fullName: string;
    group: string;
    course: number;
    email: string;
    absenceCount: number;
  }>;
  absences: Array<{
    id: string;
    studentId: string;
    studentFullName: string;
    studentGroup: string;
    subject: string;
    date: string;
    lessonLabel: string;
    status: string;
    classroom: string;
    grade?: number;
    markedNbAt?: string;
    assignmentSentAt?: string;
    responseSubmittedAt?: string;
    gradedAt?: string;
  }>;
  notifications?: Array<{
    id: string;
    absenceId: string;
    title: string;
    message: string;
    createdAt: string;
    isRead: boolean;
  }>;
}

export type AssistantSnapshot =
  | StudentAssistantSnapshot
  | TeacherAssistantSnapshot;

export interface AssistantRequestBody {
  role: PortalAssistantRole;
  snapshot: AssistantSnapshot;
  messages: AssistantTransportMessage[];
}

export interface AssistantResponseBody {
  answer: string;
  provider: "hf" | "fallback";
  relatedAbsenceIds: string[];
  relatedGroupIds: string[];
  relatedStudentIds: string[];
  visualizations?: AssistantVisualization[];
}

export const assistantDesktopWidth = 480;

export const assistantQuickPrompts: Record<PortalAssistantRole, string[]> = {
  student: [
    "Какие у меня активные пропуски?",
    "Что у меня уже отработано?",
    "Покажи пропуски по конкретным предметам",
  ],
  teacher: [
    "Какие заявки на отработку ждут меня?",
    "Кого нужно оценить прямо сейчас?",
    "Покажи группы и студентов с пропусками",
  ],
};

export const assistantGreeting: Record<PortalAssistantRole, string> = {
  student:
    "Я могу подсказать по вашим пропускам, статусам, заданиям и оценкам. Если понадобится, покажу связанные карточки прямо в чате.",
  teacher:
    "Я могу подсказать по заявкам, заданиям, ответам студентов, оцениванию и вашим группам. При необходимости покажу связанные карточки и переходы.",
};
