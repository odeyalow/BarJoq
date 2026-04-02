export type StudentDeadlineTone = "amber" | "red";

export interface StudentDeadlineInfo {
  deadlineAt: string;
  description: string;
  exactLabel: string;
  isExpired: boolean;
  kind: "assignment" | "request";
  remainingLabel: string;
  title: string;
  tone: StudentDeadlineTone;
}

type DeadlineAwareAbsence = {
  assignment?: {
    sentAt: string;
  };
  createdAt: string;
  date: string;
  requestedAt?: string;
  status:
    | "assignment_received"
    | "completed"
    | "expired"
    | "missed"
    | "nb_marked"
    | "request_sent"
    | "under_review";
  updatedAt: string;
};

const dayMs = 1000 * 60 * 60 * 24;
const hourMs = 1000 * 60 * 60;
const minuteMs = 1000 * 60;
const secondMs = 1000;

export function getStudentAbsenceDeadline(
  absence: DeadlineAwareAbsence,
  now = new Date(),
): StudentDeadlineInfo | null {
  if (absence.status === "missed" || absence.status === "request_sent") {
    const deadlineAt = getEndOfMonthDeadline(new Date(absence.createdAt));
    return buildDeadlineInfo("request", deadlineAt, now);
  }

  if (absence.status === "assignment_received") {
    const sentAt = absence.assignment?.sentAt;

    if (!sentAt) {
      return null;
    }

    const deadlineAt = new Date(new Date(sentAt).getTime() + dayMs * 3);
    return buildDeadlineInfo("assignment", deadlineAt, now);
  }

  return null;
}

export function isStudentAbsenceDeadlineExpired(
  absence: DeadlineAwareAbsence,
  now = new Date(),
) {
  const deadline = getStudentAbsenceDeadline(absence, now);
  return deadline?.isExpired ?? false;
}

function buildDeadlineInfo(
  kind: StudentDeadlineInfo["kind"],
  deadlineAt: Date,
  now: Date,
): StudentDeadlineInfo {
  const remainingMs = deadlineAt.getTime() - now.getTime();
  const isExpired = remainingMs <= 0;

  return {
    kind,
    title:
      kind === "request"
        ? "Срок подачи заявки"
        : "Срок выполнения задания",
    description:
      kind === "request"
        ? "Подать заявку на отработку можно только до конца месяца пропуска."
        : "После получения задания на выполнение отработки дается 3 дня.",
    deadlineAt: deadlineAt.toISOString(),
    exactLabel: isExpired
      ? `Срок истек ${formatRelativeDuration(Math.abs(remainingMs))} назад`
      : `Дедлайн: ${deadlineAt.toLocaleString("ru-RU", {
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          month: "long",
          year: "numeric",
        })}`,
    isExpired,
    remainingLabel: isExpired
      ? `Просрочено на ${formatRelativeDuration(Math.abs(remainingMs))}`
      : `Осталось ${formatRelativeDuration(remainingMs)}`,
    tone: resolveTone(remainingMs),
  };
}

function resolveTone(remainingMs: number): StudentDeadlineTone {
  if (remainingMs <= dayMs * 2) {
    return "red";
  }

  return "amber";
}

function formatRelativeDuration(durationMs: number) {
  if (durationMs < minuteMs) {
    const seconds = Math.max(1, Math.ceil(durationMs / secondMs));
    return `${seconds} ${pluralizeRu(seconds, "секунда", "секунды", "секунд")}`;
  }

  const days = Math.floor(durationMs / dayMs);
  const hours = Math.floor((durationMs % dayMs) / hourMs);
  const minutes = Math.floor((durationMs % hourMs) / minuteMs);

  if (days >= 1) {
    return `${days} ${pluralizeRu(days, "день", "дня", "дней")} ${hours} ${pluralizeRu(
      hours,
      "час",
      "часа",
      "часов",
    )}`;
  }

  if (hours >= 1) {
    return `${hours} ${pluralizeRu(hours, "час", "часа", "часов")} ${minutes} ${pluralizeRu(
      minutes,
      "минута",
      "минуты",
      "минут",
    )}`;
  }

  return `${minutes} ${pluralizeRu(minutes, "минута", "минуты", "минут")}`;
}

function getEndOfMonthDeadline(value: Date) {
  return new Date(
    value.getFullYear(),
    value.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  );
}

function pluralizeRu(
  count: number,
  one: string,
  few: string,
  many: string,
) {
  const value = Math.abs(count) % 100;
  const unit = value % 10;

  if (value > 10 && value < 20) {
    return many;
  }

  if (unit > 1 && unit < 5) {
    return few;
  }

  if (unit === 1) {
    return one;
  }

  return many;
}
