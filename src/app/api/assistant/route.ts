import type {
  AssistantRequestBody,
  AssistantResponseBody,
  AssistantVisualization,
  StudentAssistantSnapshot,
  TeacherAssistantSnapshot,
} from "@/lib/assistant";
import { requireStudentRequestSession, requireTeacherRequestSession } from "@/lib/auth";
import {
  buildStudentPortalPayload,
  buildTeacherPortalPayload,
} from "@/lib/portal-data";
import type { StudentPortalPayload } from "@/lib/student-portal";
import type { TeacherPortalPayload } from "@/lib/teacher-portal";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

const primaryHfModel = "Qwen/Qwen2.5-72B-Instruct";
const compatibilityHfModel = "Qwen/Qwen2.5-7B-Instruct-1M";
const portalTimeZone = "Asia/Qyzylorda";

const fullDateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  timeZone: portalTimeZone,
  year: "numeric",
});

const compactDateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  timeZone: portalTimeZone,
  year: "numeric",
});

const studentStatusLabels = {
  missed: "Не отработан",
  request_sent: "Заявка на задание отправлена",
  assignment_received: "Получено задание",
  under_review: "На оценивании",
  completed: "Отработан",
} as const;

const teacherStatusLabels = {
  missed: "Не отработал",
  request_received: "Получена заявка на отработку",
  assignment_sent: "Задание отправлено",
  submitted: "Задание отработано",
  graded: "Оценено",
} as const;

const studentStatusKeywords = {
  missed: ["не отработ", "неотработ", "долг", "долги", "пропуск", "пропуски"],
  request_sent: ["заявк", "запрос", "ожидаю задание"],
  assignment_received: ["получено задание", "есть задание", "задание", "отработка"],
  under_review: ["на оцен", "на провер", "проверя", "ждет оценку"],
  completed: ["отработал", "отработано", "закрыл", "закрыто", "сдал"],
} as const;

const teacherStatusKeywords = {
  missed: ["не отработ", "н/б", "пропуст", "не был"],
  request_received: ["заявк", "запрос на отработку", "просит задание"],
  assignment_sent: ["задание отправлено", "выдано задание", "отправил задание"],
  submitted: ["на оцен", "проверить", "оценить", "сдали", "отработали", "ответил"],
  graded: ["оценено", "оценил", "с баллом", "с оценкой", "балл"],
} as const;

const assistantStyles = [
  "Стиль ответа: живой и разговорный, но без лишней воды.",
  "Стиль ответа: коротко, уверенно и по делу, как у реального чат-ассистента.",
  "Стиль ответа: естественно и вариативно, не используй один и тот же заход.",
  "Стиль ответа: дружелюбно и прямо, с опорой на конкретные данные кабинета.",
] as const;

const studentGreetingReplies = [
  "Привет. Могу посмотреть ваши пропуски, статусы, задания, ответы и баллы прямо по данным кабинета.",
  "Здравствуйте. Спрашивайте по пропускам, отработкам и оценкам, отвечу по вашим данным.",
  "Привет. Я в контексте вашего студенческого кабинета, могу быстро подсказать по пропускам и отработкам.",
] as const;

const teacherGreetingReplies = [
  "Здравствуйте. Могу помочь по группам, студентам, заявкам на отработку, проверке и оценкам.",
  "Привет. Спрашивайте по вашим группам, пропускам студентов и текущим задачам на проверку.",
  "Здравствуйте. Я работаю по данным кабинета преподавателя: группы, студенты, задания, ответы и оценки.",
] as const;

const thanksReplies = ["Пожалуйста.", "Не за что.", "Обращайтесь.", "Если нужно, могу сразу уточнить это по данным кабинета."] as const;

const studentCapabilityReplies = [
  "Могу подсказать по вашим пропускам, статусам, заданиям, ответам, баллам и связанным уведомлениям.",
  "Я работаю по вашему студенческому кабинету: пропуски, отработки, оценки, преподаватели и предметы.",
  "Отвечаю по вашим пропускам и всему, что связано с их отработкой: задания, ответы, статусы и результаты.",
] as const;

const teacherCapabilityReplies = [
  "Могу помочь по группам, студентам, пропускам, заявкам, выданным заданиям, проверке и оцениванию.",
  "Я работаю по кабинету преподавателя: группы, студенты, отработки, ответы и текущие задачи на проверку.",
  "Отвечаю по вашим учебным данным: группы, студенты, пропуски, задания, проверка и оценки.",
] as const;

const outOfScopeReplies = [
  "Я работаю только в рамках данных учебной платформы: пропуски, отработки, задания, оценки, группы и студенты.",
  "С этим я не помогу, потому что мой контекст ограничен кабинетом платформы и связанными учебными данными.",
  "Я могу отвечать только по данным этой платформы: пропускам, заданиям, статусам, группам и оцениванию.",
] as const;

type StudentAbsence = StudentAssistantSnapshot["absences"][number];
type TeacherAbsence = TeacherAssistantSnapshot["absences"][number];
type TeacherStudent = TeacherAssistantSnapshot["students"][number];
type TeacherGroup = TeacherAssistantSnapshot["groups"][number];

type StudentStatus = keyof typeof studentStatusLabels;
type TeacherStatus = keyof typeof teacherStatusLabels;

interface ReferenceSelection {
  relatedAbsenceIds: string[];
  relatedGroupIds: string[];
  relatedStudentIds: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AssistantRequestBody;
    const messages = sanitizeMessages(body.messages);
    const latestUserMessage = [...messages]
      .reverse()
      .find((message) => message.role === "user")
      ?.content.trim();

    if (!latestUserMessage) {
      return Response.json(
        {
          answer:
            "Напишите вопрос по данным кабинета, и я отвечу по пропускам, заданиям, статусам, оценкам и связанным карточкам.",
          provider: "fallback",
          relatedAbsenceIds: [],
          relatedGroupIds: [],
          relatedStudentIds: [],
        } satisfies AssistantResponseBody,
        { status: 200 },
      );
    }

    const currentPage = body.snapshot?.currentPage ?? "";
    const liveSnapshot = await getLiveSnapshot(request, body.role, currentPage);

    if (!liveSnapshot) {
      return Response.json(
        {
          answer:
            "Сессия не найдена или уже истекла. Войдите в кабинет заново, и я снова смогу отвечать по данным из базы.",
          provider: "fallback",
          relatedAbsenceIds: [],
          relatedGroupIds: [],
          relatedStudentIds: [],
        } satisfies AssistantResponseBody,
        { status: 200 },
      );
    }

    const referenceQuery = buildReferenceQuery(messages);
    const references =
      body.role === "student"
        ? selectStudentReferences(referenceQuery, liveSnapshot as StudentAssistantSnapshot)
        : selectTeacherReferences(referenceQuery, liveSnapshot as TeacherAssistantSnapshot);
    const visualizations =
      body.role === "student"
        ? buildStudentVisualizations(
            referenceQuery,
            liveSnapshot as StudentAssistantSnapshot,
            references,
          )
        : buildTeacherVisualizations(
            referenceQuery,
            liveSnapshot as TeacherAssistantSnapshot,
            references,
          );

    const context =
      body.role === "student"
        ? buildStudentContext({
            latestUserMessage,
            referenceQuery,
            references,
            snapshot: liveSnapshot as StudentAssistantSnapshot,
          })
        : buildTeacherContext({
            latestUserMessage,
            referenceQuery,
            references,
            snapshot: liveSnapshot as TeacherAssistantSnapshot,
          });

    const modelAnswer = await generateWithHuggingFace({
      context,
      messages,
      role: body.role,
    });

    return Response.json(
      {
        answer:
          modelAnswer ??
          (body.role === "student"
            ? buildStudentFallbackAnswer(
                latestUserMessage,
                liveSnapshot as StudentAssistantSnapshot,
                references,
              )
            : buildTeacherFallbackAnswer(
                latestUserMessage,
                liveSnapshot as TeacherAssistantSnapshot,
                references,
              )),
        provider: modelAnswer ? "hf" : "fallback",
        relatedAbsenceIds: references.relatedAbsenceIds,
        relatedGroupIds: references.relatedGroupIds,
        relatedStudentIds: references.relatedStudentIds,
        visualizations,
      } satisfies AssistantResponseBody,
      { status: 200 },
    );
  } catch {
    return Response.json(
      {
        answer:
          "Не удалось обработать запрос. Попробуйте переформулировать его чуть точнее, например по пропускам, заданиям, группам, студентам или оцениванию.",
        provider: "fallback",
        relatedAbsenceIds: [],
        relatedGroupIds: [],
        relatedStudentIds: [],
      } satisfies AssistantResponseBody,
      { status: 200 },
    );
  }
}

async function getLiveSnapshot(
  request: NextRequest,
  role: "student" | "teacher",
  currentPage: string,
) {
  if (role === "student") {
    const session = await requireStudentRequestSession(request);

    if (!session?.user.student) {
      return null;
    }

    const payload = await buildStudentPortalPayload(session.user.id);
    return mapStudentPayloadToSnapshot(payload, currentPage);
  }

  const session = await requireTeacherRequestSession(request);

  if (!session?.user.teacher) {
    return null;
  }

  const payload = await buildTeacherPortalPayload(session.user.id);
  return mapTeacherPayloadToSnapshot(payload, currentPage);
}

function mapStudentPayloadToSnapshot(
  payload: StudentPortalPayload,
  currentPage: string,
): StudentAssistantSnapshot {
  return {
    role: "student",
    currentPage,
    student: {
      fullName: payload.student.fullName,
      group: payload.student.group,
      course: payload.student.course,
    },
    absences: payload.absences.map((absence) => ({
      id: absence.id,
      subject: absence.subject,
      date: absence.date,
      lessonLabel: absence.lessonLabel,
      status: absence.status,
      teacherName: absence.teacherName,
      classroom: absence.classroom,
      grade: absence.grade,
      assignmentSentAt: absence.assignment?.sentAt,
      responseSubmittedAt:
        absence.response?.editedAt ?? absence.response?.submittedAt,
      completedAt: absence.completedAt,
    })),
    notifications: payload.notifications.map((notification) => ({
      id: notification.id,
      absenceId: notification.absenceId,
      title: notification.title,
      message: notification.message,
      createdAt: notification.createdAt,
      isRead: notification.isRead,
    })),
  };
}

function mapTeacherPayloadToSnapshot(
  payload: TeacherPortalPayload,
  currentPage: string,
): TeacherAssistantSnapshot {
  const absenceCountByStudentId = new Map<string, number>();

  for (const absence of payload.absences) {
    absenceCountByStudentId.set(
      absence.studentId,
      (absenceCountByStudentId.get(absence.studentId) ?? 0) + 1,
    );
  }

  return {
    role: "teacher",
    currentPage,
    teacher: {
      fullName: payload.teacher.fullName,
      groups: payload.teacher.groups,
      subjects: payload.teacher.subjects,
    },
    groups: payload.groups.map((group) => ({
      id: group.id,
      name: group.name,
      course: group.course,
      specialty: group.specialty,
      studentIds: group.studentIds,
    })),
    students: payload.students.map((student) => ({
      id: student.id,
      fullName: student.fullName,
      group: student.group,
      course: student.course,
      email: student.email,
      absenceCount: absenceCountByStudentId.get(student.id) ?? 0,
    })),
    absences: payload.absences.map((absence) => ({
      id: absence.id,
      studentId: absence.studentId,
      studentFullName: absence.studentFullName,
      studentGroup: absence.studentGroup,
      subject: absence.subject,
      date: absence.date,
      lessonLabel: absence.lessonLabel,
      status: absence.status,
      classroom: absence.classroom,
      grade: absence.grade,
      markedNbAt: absence.markedNbAt,
      assignmentSentAt: absence.assignment?.editedAt ?? absence.assignment?.sentAt,
      responseSubmittedAt:
        absence.response?.editedAt ?? absence.response?.submittedAt,
      gradedAt: absence.gradedAt,
    })),
    notifications: payload.notifications.map((notification) => ({
      id: notification.id,
      absenceId: notification.absenceId,
      title: notification.title,
      message: notification.message,
      createdAt: notification.createdAt,
      isRead: notification.isRead,
    })),
  };
}

// HUGGING FACE
async function generateWithHuggingFace({
  context,
  messages,
  role,
}: {
  context: string;
  messages: Array<{ content: string; role: "assistant" | "user" }>;
  role: "student" | "teacher";
}) {
  const token = process.env.HF_TOKEN?.trim();

  if (!token) {
    return null;
  }

  const lastAssistantMessage = [...messages]
    .reverse()
    .find((message) => message.role === "assistant")
    ?.content;

  const configuredModel = process.env.HF_CHAT_MODEL?.trim();
  const candidateModels = uniqueStrings(
    configuredModel && configuredModel !== compatibilityHfModel
      ? [configuredModel, primaryHfModel, compatibilityHfModel]
      : [primaryHfModel, configuredModel, compatibilityHfModel],
  );

  for (const model of candidateModels) {
    const answer = await requestModel({
      context,
      extraInstruction: null,
      messages,
      model,
      role,
      token,
    });

    if (!answer) {
      continue;
    }

    if (lastAssistantMessage && isTooSimilar(answer, lastAssistantMessage)) {
      const retried = await requestModel({
        context,
        extraInstruction:
          "Твой новый ответ не должен повторять формулировки предыдущего ответа помощника. Скажи то же по смыслу, но другими словами.",
        messages,
        model,
        role,
        token,
      });

      if (retried) {
        return retried;
      }
    }

    return answer;
  }

  return null;
}

async function requestModel({
  context,
  extraInstruction,
  messages,
  model,
  role,
  token,
}: {
  context: string;
  extraInstruction: string | null;
  messages: Array<{ content: string; role: "assistant" | "user" }>;
  model: string;
  role: "student" | "teacher";
  token: string;
}) {
  try {
    const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 520,
        messages: [
          {
            role: "system",
            content: buildSystemPrompt(role, extraInstruction),
          },
          {
            role: "system",
            content: `Контекст платформы:\n${context}`,
          },
          ...messages.slice(-12),
        ],
        temperature: 0.82,
        top_p: 0.92,
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: string | Array<{ text?: string }>;
        };
      }>;
    };

    const content = data.choices?.[0]?.message?.content;

    if (typeof content === "string") {
      return sanitizeModelAnswer(content);
    }

    if (Array.isArray(content)) {
      return sanitizeModelAnswer(
        content
          .map((part) => part.text ?? "")
          .join("")
          .trim(),
      );
    }

    return null;
  } catch {
    return null;
  }
}

function buildSystemPrompt(
  role: "student" | "teacher",
  extraInstruction: string | null,
) {
  return [
    "Ты встроенный AI-ассистент платформы BarJoq.",
    role === "student"
      ? "Пользователь сейчас находится в студенческом кабинете. Отвечай только по его пропускам, заданиям, ответам, статусам, баллам, уведомлениям и связанным учебным данным."
      : "Пользователь сейчас находится в кабинете преподавателя. Отвечай только по его группам, студентам, пропускам, заявкам, заданиям, проверке, оцениванию и связанным учебным данным.",
    "Используй только сведения из переданного контекста и истории диалога. Ничего не выдумывай.",
    "Отвечай по-русски.",
    "Пиши естественно и вариативно, как живой современный чат-ассистент, а не как FAQ-бот.",
    "Не начинай каждый ответ одинаково. Не повторяй дословно предыдущий ответ помощника.",
    "Если вопрос разговорный, например приветствие, благодарность или вопрос о возможностях, отвечай нормально и по-человечески, но все равно в рамках роли помощника платформы.",
    "Если вопрос выходит за пределы учебного контекста платформы, коротко скажи об ограничении.",
    "Если данных недостаточно, прямо скажи об этом.",
    pickRandom(assistantStyles),
    extraInstruction ?? "",
  ]
    .filter(Boolean)
    .join(" ");
}

// CONTEXT BUILDERS
function buildStudentContext({
  latestUserMessage,
  referenceQuery,
  references,
  snapshot,
}: {
  latestUserMessage: string;
  referenceQuery: string;
  references: ReferenceSelection;
  snapshot: StudentAssistantSnapshot;
}) {
  const absences = sortStudentAbsences(snapshot.absences);
  const relatedAbsences = absences.filter((absence) =>
    references.relatedAbsenceIds.includes(absence.id),
  );

  const activeCount = absences.filter((absence) => absence.status !== "completed").length;
  const completedCount = absences.filter((absence) => absence.status === "completed").length;
  const underReviewCount = absences.filter((absence) => absence.status === "under_review").length;
  const withAssignmentCount = absences.filter((absence) =>
    ["assignment_received", "under_review", "completed"].includes(absence.status),
  ).length;
  const gradedCount = absences.filter((absence) => typeof absence.grade === "number").length;
  const notifications = snapshot.notifications ?? [];
  const unreadNotifications = notifications.filter((notification) => !notification.isRead);

  return [
    `Текущая страница: ${snapshot.currentPage}`,
    `Последний запрос пользователя: ${latestUserMessage}`,
    `Запрос для подбора релевантных данных: ${referenceQuery}`,
    `Студент: ${snapshot.student.fullName}, группа ${snapshot.student.group}, ${snapshot.student.course} курс.`,
    `Сводка: всего пропусков ${absences.length}, активных ${activeCount}, с заданием ${withAssignmentCount}, на оценивании ${underReviewCount}, отработано ${completedCount}, с баллом ${gradedCount}.`,
    `Уведомления: всего ${notifications.length}, непрочитанных ${unreadNotifications.length}.`,
    relatedAbsences.length
      ? `Наиболее релевантные пропуски:\n${relatedAbsences
          .map((absence) => `- ${formatStudentAbsence(absence)}`)
          .join("\n")}`
      : "Наиболее релевантные пропуски: не выделены.",
    unreadNotifications.length
      ? `Последние непрочитанные уведомления:\n${unreadNotifications
          .slice(0, 10)
          .map(
            (notification) =>
              `- ${formatFullDate(notification.createdAt)} | ${notification.title} | ${notification.message}`,
          )
          .join("\n")}`
      : "Последние непрочитанные уведомления: нет.",
    absences.length
      ? `Все пропуски студента:\n${absences
          .slice(0, 40)
          .map((absence) => `- ${formatStudentAbsence(absence)}`)
          .join("\n")}`
      : "Все пропуски студента: пропусков нет.",
  ].join("\n\n");
}

function buildTeacherContext({
  latestUserMessage,
  referenceQuery,
  references,
  snapshot,
}: {
  latestUserMessage: string;
  referenceQuery: string;
  references: ReferenceSelection;
  snapshot: TeacherAssistantSnapshot;
}) {
  const absences = sortTeacherAbsences(snapshot.absences);
  const groups = snapshot.groups.slice().sort((left, right) => left.name.localeCompare(right.name));
  const students = snapshot.students
    .slice()
    .sort((left, right) => left.fullName.localeCompare(right.fullName));

  const relatedAbsences = absences.filter((absence) =>
    references.relatedAbsenceIds.includes(absence.id),
  );
  const relatedGroups = groups.filter((group) => references.relatedGroupIds.includes(group.id));
  const relatedStudents = students.filter((student) =>
    references.relatedStudentIds.includes(student.id),
  );

  const awaitingRequests = absences.filter((absence) => absence.status === "request_received").length;
  const assignmentsSent = absences.filter((absence) => absence.status === "assignment_sent").length;
  const awaitingGrading = absences.filter((absence) => absence.status === "submitted").length;
  const graded = absences.filter((absence) => absence.status === "graded").length;
  const notifications = snapshot.notifications ?? [];
  const unreadNotifications = notifications.filter((notification) => !notification.isRead);

  return [
    `Текущая страница: ${snapshot.currentPage}`,
    `Последний запрос пользователя: ${latestUserMessage}`,
    `Запрос для подбора релевантных данных: ${referenceQuery}`,
    `Преподаватель: ${snapshot.teacher.fullName}.`,
    `Предметы преподавателя: ${snapshot.teacher.subjects.length ? snapshot.teacher.subjects.join(", ") : "не указаны"}.`,
    `Группы преподавателя: ${snapshot.teacher.groups.length ? snapshot.teacher.groups.join(", ") : "не указаны"}.`,
    `Сводка: групп ${groups.length}, студентов ${students.length}, пропусков ${absences.length}, новых заявок ${awaitingRequests}, отправленных заданий ${assignmentsSent}, ждут оценки ${awaitingGrading}, оценено ${graded}.`,
    `Уведомления: всего ${notifications.length}, непрочитанных ${unreadNotifications.length}.`,
    relatedGroups.length
      ? `Наиболее релевантные группы:\n${relatedGroups
          .map((group) => `- ${formatTeacherGroup(group, snapshot.absences)}`)
          .join("\n")}`
      : "Наиболее релевантные группы: не выделены.",
    relatedStudents.length
      ? `Наиболее релевантные студенты:\n${relatedStudents
          .map((student) => `- ${formatTeacherStudent(student)}`)
          .join("\n")}`
      : "Наиболее релевантные студенты: не выделены.",
    relatedAbsences.length
      ? `Наиболее релевантные пропуски:\n${relatedAbsences
          .map((absence) => `- ${formatTeacherAbsence(absence)}`)
          .join("\n")}`
      : "Наиболее релевантные пропуски: не выделены.",
    unreadNotifications.length
      ? `Последние непрочитанные уведомления:\n${unreadNotifications
          .slice(0, 12)
          .map(
            (notification) =>
              `- ${formatFullDate(notification.createdAt)} | ${notification.title} | ${notification.message}`,
          )
          .join("\n")}`
      : "Последние непрочитанные уведомления: нет.",
    groups.length
      ? `Все группы:\n${groups
          .slice(0, 20)
          .map((group) => `- ${formatTeacherGroup(group, snapshot.absences)}`)
          .join("\n")}`
      : "Все группы: нет групп.",
    students.length
      ? `Все студенты:\n${students
          .slice(0, 60)
          .map((student) => `- ${formatTeacherStudent(student)}`)
          .join("\n")}`
      : "Все студенты: нет студентов.",
    absences.length
      ? `Все пропуски:\n${absences
          .slice(0, 80)
          .map((absence) => `- ${formatTeacherAbsence(absence)}`)
          .join("\n")}`
      : "Все пропуски: пропусков нет.",
  ].join("\n\n");
}

// REFERENCE SELECTION
function selectStudentReferences(
  query: string,
  snapshot: StudentAssistantSnapshot,
): ReferenceSelection {
  const normalizedQuery = normalize(query);

  if (!isSocialOrStudentDomainQuery(normalizedQuery, snapshot.absences)) {
    return emptyReferences();
  }

  if (isGreeting(normalizedQuery) || isThanks(normalizedQuery) || isCapabilityQuery(normalizedQuery)) {
    return emptyReferences();
  }

  if (mentionsNotifications(normalizedQuery)) {
    return {
      relatedAbsenceIds: (snapshot.notifications ?? [])
        .filter((notification) => !notification.isRead)
        .slice(0, 4)
        .map((notification) => notification.absenceId)
        .filter(Boolean),
      relatedGroupIds: [],
      relatedStudentIds: [],
    };
  }

  const subjectMatches = uniqueStrings(
    snapshot.absences
      .filter((absence) => matchesEntityQuery(normalizedQuery, absence.subject))
      .map((absence) => absence.subject),
  );
  const teacherMatches = uniqueStrings(
    snapshot.absences
      .filter((absence) => matchesEntityQuery(normalizedQuery, absence.teacherName))
      .map((absence) => absence.teacherName),
  );
  const requestedStatuses = resolveStudentStatuses(normalizedQuery);
  const wantsGrades = mentionsGrades(normalizedQuery);
  const wantsAssignments = mentionsAssignments(normalizedQuery);
  const wantsActive = mentionsActive(normalizedQuery);

  let absences = sortStudentAbsences(snapshot.absences);

  if (subjectMatches.length) {
    absences = absences.filter((absence) => subjectMatches.includes(absence.subject));
  }

  if (teacherMatches.length) {
    absences = absences.filter((absence) => teacherMatches.includes(absence.teacherName));
  }

  if (requestedStatuses.length) {
    absences = absences.filter((absence) =>
      requestedStatuses.includes(absence.status as StudentStatus),
    );
  }

  if (wantsGrades) {
    absences = absences.filter((absence) => typeof absence.grade === "number");
  }

  if (wantsAssignments && !requestedStatuses.length) {
    absences = absences.filter((absence) =>
      ["assignment_received", "under_review", "completed"].includes(absence.status),
    );
  }

  if (wantsActive && !requestedStatuses.length) {
    absences = absences.filter((absence) => absence.status !== "completed");
  }

  if (!absences.length && mentionsStudentWorkDomain(normalizedQuery)) {
    absences = sortStudentAbsences(snapshot.absences);
  }

  return {
    relatedAbsenceIds: absences.slice(0, 4).map((absence) => absence.id),
    relatedGroupIds: [],
    relatedStudentIds: [],
  };
}

function selectTeacherReferences(
  query: string,
  snapshot: TeacherAssistantSnapshot,
): ReferenceSelection {
  const normalizedQuery = normalize(query);

  if (!isSocialOrTeacherDomainQuery(normalizedQuery, snapshot)) {
    return emptyReferences();
  }

  if (isGreeting(normalizedQuery) || isThanks(normalizedQuery) || isCapabilityQuery(normalizedQuery)) {
    return emptyReferences();
  }

  if (mentionsNotifications(normalizedQuery)) {
    const notificationAbsenceIds = (snapshot.notifications ?? [])
      .filter((notification) => !notification.isRead)
      .slice(0, 4)
      .map((notification) => notification.absenceId)
      .filter(Boolean);

    const relatedStudentIds = uniqueStrings(
      snapshot.absences
        .filter((absence) => notificationAbsenceIds.includes(absence.id))
        .map((absence) => absence.studentId)
        .slice(0, 4),
    );

    return {
      relatedAbsenceIds: notificationAbsenceIds,
      relatedGroupIds: [],
      relatedStudentIds,
    };
  }

  const groups = snapshot.groups.slice();
  const students = snapshot.students.slice();
  const absences = sortTeacherAbsences(snapshot.absences);

  const matchedGroups = groups.filter((group) =>
    matchesEntityQuery(normalizedQuery, group.name),
  );
  const matchedStudents = students.filter((student) =>
    matchesEntityQuery(normalizedQuery, student.fullName),
  );
  const requestedStatuses = resolveTeacherStatuses(normalizedQuery);
  const wantsGroups = mentionsGroups(normalizedQuery);
  const wantsStudents = mentionsStudents(normalizedQuery);
  const wantsSubjects = mentionsSubjects(normalizedQuery);
  const wantsTop = mentionsTop(normalizedQuery);
  const wantsWithoutAbsences = mentionsWithoutAbsences(normalizedQuery);
  const wantsGrades = mentionsGrades(normalizedQuery);
  const wantsAssignments = mentionsAssignments(normalizedQuery);
  const wantsNeedsGrading = mentionsNeedsGrading(normalizedQuery);
  const wantsCompletedStudents = mentionsTeacherCompleted(normalizedQuery);
  const wantsRequests = mentionsRequests(normalizedQuery);

  if (wantsSubjects && !wantsGroups && !wantsStudents) {
    return emptyReferences();
  }

  if (wantsGroups && !wantsStudents && !mentionsTeacherActionDomain(normalizedQuery)) {
    const groupsToShow = matchedGroups.length ? matchedGroups : groups;
    return {
      relatedAbsenceIds: [],
      relatedGroupIds: groupsToShow.slice(0, 4).map((group) => group.id),
      relatedStudentIds: [],
    };
  }

  if (wantsWithoutAbsences) {
    const studentsWithoutAbsences = students.filter((student) => {
      const hasAbsence = absences.some((absence) => absence.studentId === student.id);
      const groupMatches =
        !matchedGroups.length ||
        matchedGroups.some((group) => group.name === student.group);
      return groupMatches && !hasAbsence;
    });

    return {
      relatedAbsenceIds: [],
      relatedGroupIds: matchedGroups.slice(0, 4).map((group) => group.id),
      relatedStudentIds: studentsWithoutAbsences.slice(0, 4).map((student) => student.id),
    };
  }

  if (wantsTop && wantsGroups) {
    const topGroups = groups
      .map((group) => ({
        count: absences.filter((absence) => absence.studentGroup === group.name).length,
        group,
      }))
      .filter((entry) => entry.count > 0)
      .sort((left, right) => right.count - left.count || left.group.name.localeCompare(right.group.name))
      .map((entry) => entry.group);

    return {
      relatedAbsenceIds: [],
      relatedGroupIds: topGroups.slice(0, 4).map((group) => group.id),
      relatedStudentIds: [],
    };
  }

  if (wantsTop && wantsStudents) {
    const topStudents = students
      .map((student) => ({
        count: student.absenceCount,
        student,
      }))
      .filter((entry) => {
        if (!matchedGroups.length) {
          return entry.count > 0;
        }

        return entry.count > 0 && matchedGroups.some((group) => group.name === entry.student.group);
      })
      .sort(
        (left, right) =>
          right.count - left.count ||
          left.student.fullName.localeCompare(right.student.fullName),
      )
      .map((entry) => entry.student);

    return {
      relatedAbsenceIds: [],
      relatedGroupIds: matchedGroups.slice(0, 4).map((group) => group.id),
      relatedStudentIds: topStudents.slice(0, 4).map((student) => student.id),
    };
  }

  let filteredAbsences = absences.slice();

  if (matchedGroups.length) {
    const allowedGroups = new Set(matchedGroups.map((group) => group.name));
    filteredAbsences = filteredAbsences.filter((absence) =>
      allowedGroups.has(absence.studentGroup),
    );
  }

  if (matchedStudents.length) {
    const allowedStudents = new Set(matchedStudents.map((student) => student.id));
    filteredAbsences = filteredAbsences.filter((absence) =>
      allowedStudents.has(absence.studentId),
    );
  }

  if (requestedStatuses.length) {
    filteredAbsences = filteredAbsences.filter((absence) =>
      requestedStatuses.includes(absence.status as TeacherStatus),
    );
  }

  if (wantsGrades) {
    filteredAbsences = filteredAbsences.filter((absence) => typeof absence.grade === "number");
  }

  if (wantsRequests && !requestedStatuses.length) {
    filteredAbsences = filteredAbsences.filter(
      (absence) => absence.status === "request_received",
    );
  }

  if (wantsAssignments && !requestedStatuses.length) {
    filteredAbsences = filteredAbsences.filter((absence) =>
      ["assignment_sent", "submitted", "graded"].includes(absence.status),
    );
  }

  if (wantsNeedsGrading && !requestedStatuses.length) {
    filteredAbsences = filteredAbsences.filter((absence) => absence.status === "submitted");
  }

  if (wantsCompletedStudents && !requestedStatuses.length) {
    filteredAbsences = filteredAbsences.filter((absence) =>
      ["submitted", "graded"].includes(absence.status),
    );
  }

  const relatedAbsenceIds = filteredAbsences.slice(0, 4).map((absence) => absence.id);
  const relatedStudentIds = uniqueStrings(
    (wantsStudents || wantsCompletedStudents
      ? filteredAbsences
          .slice(0, 4)
          .map((absence) => absence.studentId)
      : matchedStudents.slice(0, 4).map((student) => student.id)),
  );
  const relatedGroupIds = uniqueStrings(
    [
      ...matchedGroups.slice(0, 4).map((group) => group.id),
      ...groups
        .filter((group) =>
          filteredAbsences.some((absence) => absence.studentGroup === group.name),
        )
        .slice(0, 4)
        .map((group) => group.id),
    ].slice(0, 4),
  );

  if (!relatedAbsenceIds.length && wantsStudents) {
    const studentsToShow = matchedStudents.length
      ? matchedStudents
      : students.filter((student) => {
          if (!matchedGroups.length) {
            return student.absenceCount > 0;
          }

          return (
            student.absenceCount > 0 &&
            matchedGroups.some((group) => group.name === student.group)
          );
        });

    return {
      relatedAbsenceIds: [],
      relatedGroupIds: matchedGroups.slice(0, 4).map((group) => group.id),
      relatedStudentIds: studentsToShow.slice(0, 4).map((student) => student.id),
    };
  }

  return {
    relatedAbsenceIds,
    relatedGroupIds,
    relatedStudentIds,
  };
}

function buildStudentVisualizations(
  query: string,
  snapshot: StudentAssistantSnapshot,
  references: ReferenceSelection,
): AssistantVisualization[] {
  const normalizedQuery = normalize(query);
  const absences = sortStudentAbsences(snapshot.absences);
  const relatedAbsences = absences.filter((absence) =>
    references.relatedAbsenceIds.includes(absence.id),
  );
  const notifications = snapshot.notifications ?? [];
  const unreadNotifications = notifications.filter((notification) => !notification.isRead);
  const gradedAbsences = absences.filter((absence) => typeof absence.grade === "number");
  const averageGrade = gradedAbsences.length
    ? Math.round(
        gradedAbsences.reduce((sum, absence) => sum + (absence.grade ?? 0), 0) /
          gradedAbsences.length,
      )
    : null;

  const visualizations: AssistantVisualization[] = [];

  if (mentionsNotifications(normalizedQuery) && notifications.length) {
    visualizations.push({
      type: "list",
      title: "Уведомления",
      items: notifications.slice(0, 6).map((notification) => ({
        title: notification.title,
        subtitle: notification.message,
        meta: `${formatCompactDate(notification.createdAt)} • ${
          notification.isRead ? "прочитано" : "не прочитано"
        }`,
      })),
    });
  }

  if (
    mentionsStudentWorkDomain(normalizedQuery) ||
    mentionsNotifications(normalizedQuery) ||
    relatedAbsences.length
  ) {
    visualizations.push({
      type: "stats",
      title: "Сводка по вашему кабинету",
      items: [
        {
          label: "Всего пропусков",
          tone: "gray",
          value: String(absences.length),
        },
        {
          label: "Активные",
          tone: "red",
          value: String(absences.filter((absence) => absence.status !== "completed").length),
        },
        {
          label: "На оценивании",
          tone: "teal",
          value: String(absences.filter((absence) => absence.status === "under_review").length),
        },
        {
          label: "Отработано",
          tone: "green",
          value: String(absences.filter((absence) => absence.status === "completed").length),
        },
      ],
    });
  }

  if (mentionsGrades(normalizedQuery) && gradedAbsences.length) {
    visualizations.push({
      type: "table",
      title: "Оцененные отработки",
      columns: ["Дата", "Предмет", "Балл"],
      rows: gradedAbsences.slice(0, 6).map((absence) => [
        formatCompactDate(absence.date),
        absence.subject,
        String(absence.grade ?? 0),
      ]),
    });

    if (averageGrade !== null) {
      visualizations.unshift({
        type: "stats",
        title: "Сводка по баллам",
        items: [
          {
            label: "Оценено",
            tone: "green",
            value: String(gradedAbsences.length),
          },
          {
            label: "Средний балл",
            tone: "teal",
            value: String(averageGrade),
          },
        ],
      });
    }
  }

  if (relatedAbsences.length) {
    visualizations.push({
      type: "list",
      title: "Подходящие пропуски",
      items: relatedAbsences.slice(0, 5).map((absence) => ({
        title: `${absence.subject} • ${formatCompactDate(absence.date)}`,
        subtitle:
          studentStatusLabels[absence.status as StudentStatus] ?? absence.status,
        meta: `${absence.teacherName} • ${absence.lessonLabel} • ${absence.classroom}`,
      })),
    });
  }

  if (
    !relatedAbsences.length &&
    mentionsAssignments(normalizedQuery) &&
    absences.some((absence) =>
      ["assignment_received", "under_review", "completed"].includes(absence.status),
    )
  ) {
    visualizations.push({
      type: "list",
      title: "Пропуски с заданиями",
      items: absences
        .filter((absence) =>
          ["assignment_received", "under_review", "completed"].includes(absence.status),
        )
        .slice(0, 5)
        .map((absence) => ({
          title: `${absence.subject} • ${formatCompactDate(absence.date)}`,
          subtitle:
            studentStatusLabels[absence.status as StudentStatus] ?? absence.status,
          meta: `${absence.teacherName} • ${absence.classroom}`,
        })),
    });
  }

  if (!visualizations.length && unreadNotifications.length) {
    visualizations.push({
      type: "list",
      title: "Последние уведомления",
      items: unreadNotifications.slice(0, 4).map((notification) => ({
        title: notification.title,
        subtitle: notification.message,
        meta: formatCompactDate(notification.createdAt),
      })),
    });
  }

  return visualizations.slice(0, 3);
}

function buildTeacherVisualizations(
  query: string,
  snapshot: TeacherAssistantSnapshot,
  references: ReferenceSelection,
): AssistantVisualization[] {
  const normalizedQuery = normalize(query);
  const absences = sortTeacherAbsences(snapshot.absences);
  const relatedAbsences = absences.filter((absence) =>
    references.relatedAbsenceIds.includes(absence.id),
  );
  const relatedStudents = snapshot.students.filter((student) =>
    references.relatedStudentIds.includes(student.id),
  );
  const relatedGroups = snapshot.groups.filter((group) =>
    references.relatedGroupIds.includes(group.id),
  );
  const notifications = snapshot.notifications ?? [];
  const unreadNotifications = notifications.filter((notification) => !notification.isRead);

  const visualizations: AssistantVisualization[] = [];

  if (mentionsNotifications(normalizedQuery) && notifications.length) {
    visualizations.push({
      type: "list",
      title: "Уведомления",
      items: notifications.slice(0, 6).map((notification) => ({
        title: notification.title,
        subtitle: notification.message,
        meta: `${formatCompactDate(notification.createdAt)} • ${
          notification.isRead ? "прочитано" : "не прочитано"
        }`,
      })),
    });
  }

  if (
    mentionsTeacherWorkDomain(normalizedQuery) ||
    mentionsNotifications(normalizedQuery) ||
    relatedAbsences.length ||
    relatedStudents.length ||
    relatedGroups.length
  ) {
    visualizations.push({
      type: "stats",
      title: "Сводка по кабинету преподавателя",
      items: [
        {
          label: "Группы",
          tone: "gray",
          value: String(snapshot.groups.length),
        },
        {
          label: "Студенты",
          tone: "gray",
          value: String(snapshot.students.length),
        },
        {
          label: "Новые заявки",
          tone: "amber",
          value: String(absences.filter((absence) => absence.status === "request_received").length),
        },
        {
          label: "Ждут оценки",
          tone: "teal",
          value: String(absences.filter((absence) => absence.status === "submitted").length),
        },
      ],
    });
  }

  if (mentionsGroups(normalizedQuery) && !mentionsTeacherActionDomain(normalizedQuery)) {
    const groupsToShow = relatedGroups.length ? relatedGroups : snapshot.groups.slice(0, 6);
    visualizations.push({
      type: "list",
      title: "Группы преподавателя",
      items: groupsToShow.map((group) => ({
        title: group.name,
        subtitle: `${group.course} курс • ${group.specialty}`,
        meta: `Студентов: ${group.studentIds.length} • Пропусков: ${
          absences.filter((absence) => absence.studentGroup === group.name).length
        }`,
      })),
    });
  }

  if (mentionsStudents(normalizedQuery) || relatedStudents.length) {
    const studentsToShow = relatedStudents.length
      ? relatedStudents
      : snapshot.students
          .slice()
          .sort(
            (left, right) =>
              right.absenceCount - left.absenceCount ||
              left.fullName.localeCompare(right.fullName),
          )
          .slice(0, 6);

    visualizations.push({
      type: "table",
      title: "Студенты",
      columns: ["Студент", "Группа", "Пропуски"],
      rows: studentsToShow.map((student) => [
        student.fullName,
        student.group,
        String(student.absenceCount),
      ]),
    });
  }

  if (mentionsSubjects(normalizedQuery) && snapshot.teacher.subjects.length) {
    visualizations.push({
      type: "list",
      title: "Предметы преподавателя",
      items: snapshot.teacher.subjects.slice(0, 6).map((subject) => ({
        title: subject,
        meta: `Пропусков по предмету: ${
          absences.filter((absence) => absence.subject === subject).length
        }`,
      })),
    });
  }

  if (relatedAbsences.length) {
    visualizations.push({
      type: "table",
      title: "Подходящие пропуски",
      columns: ["Студент", "Предмет", "Статус"],
      rows: relatedAbsences.slice(0, 6).map((absence) => [
        absence.studentFullName,
        absence.subject,
        teacherStatusLabels[absence.status as TeacherStatus] ?? absence.status,
      ]),
    });
  }

  if (!visualizations.length && unreadNotifications.length) {
    visualizations.push({
      type: "list",
      title: "Последние уведомления",
      items: unreadNotifications.slice(0, 4).map((notification) => ({
        title: notification.title,
        subtitle: notification.message,
        meta: formatCompactDate(notification.createdAt),
      })),
    });
  }

  return visualizations.slice(0, 3);
}

// FALLBACK ANSWERS
function buildStudentFallbackAnswer(
  query: string,
  snapshot: StudentAssistantSnapshot,
  references: ReferenceSelection,
) {
  const normalizedQuery = normalize(query);

  if (isGreeting(normalizedQuery)) {
    return pickRandom(studentGreetingReplies);
  }

  if (isThanks(normalizedQuery)) {
    return pickRandom(thanksReplies);
  }

  if (isCapabilityQuery(normalizedQuery)) {
    return pickRandom(studentCapabilityReplies);
  }

  if (isClearlyOutOfScope(normalizedQuery, "student", snapshot.absences.length > 0)) {
    return pickRandom(outOfScopeReplies);
  }

  if (mentionsNotifications(normalizedQuery)) {
    const notifications = snapshot.notifications ?? [];
    const unreadNotifications = notifications.filter((notification) => !notification.isRead);

    if (!notifications.length) {
      return "Сейчас у вас нет уведомлений.";
    }

    return [
      `У вас ${notifications.length} ${pluralizeRu(notifications.length, "уведомление", "уведомления", "уведомлений")}, из них непрочитанных ${unreadNotifications.length}.`,
      ...unreadNotifications.slice(0, 3).map(
        (notification) =>
          `${formatCompactDate(notification.createdAt)} — ${notification.title}.`,
      ),
    ].join("\n");
  }

  if (!snapshot.absences.length) {
    return "Сейчас в вашем кабинете нет пропусков, поэтому по отработкам и баллам данных пока нет.";
  }

  const relatedAbsences = sortStudentAbsences(snapshot.absences).filter((absence) =>
    references.relatedAbsenceIds.includes(absence.id),
  );

  if (!relatedAbsences.length) {
    return "По текущим данным я не нашел подходящих записей. Попробуйте уточнить предмет, статус, преподавателя или дату пропуска.";
  }

  if (mentionsGrades(normalizedQuery)) {
    const gradedAbsences = relatedAbsences.filter((absence) => typeof absence.grade === "number");

    if (!gradedAbsences.length) {
      return "По найденным пропускам баллы пока не выставлены.";
    }

    return [
      `Нашел ${gradedAbsences.length} запис${pluralizeRu(gradedAbsences.length, "ь", "и", "ей")} с баллом.`,
      ...gradedAbsences.slice(0, 3).map(
        (absence) =>
          `${formatCompactDate(absence.date)} — ${absence.subject}, балл ${absence.grade}.`,
      ),
    ].join("\n");
  }

  return [
    `Нашел ${relatedAbsences.length} релевантн${pluralizeRu(relatedAbsences.length, "ый пропуск", "ых пропуска", "ых пропусков")}.`,
    ...relatedAbsences.slice(0, 3).map(
      (absence) =>
        `${formatCompactDate(absence.date)} — ${absence.subject}, статус «${studentStatusLabels[absence.status as StudentStatus] ?? absence.status}».`,
    ),
  ].join("\n");
}

function buildTeacherFallbackAnswer(
  query: string,
  snapshot: TeacherAssistantSnapshot,
  references: ReferenceSelection,
) {
  const normalizedQuery = normalize(query);

  if (isGreeting(normalizedQuery)) {
    return pickRandom(teacherGreetingReplies);
  }

  if (isThanks(normalizedQuery)) {
    return pickRandom(thanksReplies);
  }

  if (isCapabilityQuery(normalizedQuery)) {
    return pickRandom(teacherCapabilityReplies);
  }

  if (isClearlyOutOfScope(normalizedQuery, "teacher", snapshot.absences.length > 0)) {
    return pickRandom(outOfScopeReplies);
  }

  if (mentionsNotifications(normalizedQuery)) {
    const notifications = snapshot.notifications ?? [];
    const unreadNotifications = notifications.filter((notification) => !notification.isRead);

    if (!notifications.length) {
      return "Сейчас у вас нет уведомлений.";
    }

    return [
      `У вас ${notifications.length} ${pluralizeRu(notifications.length, "уведомление", "уведомления", "уведомлений")}, из них непрочитанных ${unreadNotifications.length}.`,
      ...unreadNotifications.slice(0, 4).map(
        (notification) =>
          `${formatCompactDate(notification.createdAt)} — ${notification.title}.`,
      ),
    ].join("\n");
  }

  if (mentionsGroups(normalizedQuery) && !mentionsTeacherActionDomain(normalizedQuery)) {
    if (!snapshot.groups.length) {
      return "Сейчас за вами не закреплены группы.";
    }

    return [
      `За вами закреплено ${snapshot.groups.length} ${pluralizeRu(snapshot.groups.length, "группа", "группы", "групп")}.`,
      snapshot.groups.map((group) => group.name).join(", "),
    ].join("\n");
  }

  if (mentionsSubjects(normalizedQuery)) {
    if (!snapshot.teacher.subjects.length) {
      return "По текущим данным предметы за преподавателем не указаны.";
    }

    return `Вы ведете: ${snapshot.teacher.subjects.join(", ")}.`;
  }

  const relatedGroups = snapshot.groups.filter((group) =>
    references.relatedGroupIds.includes(group.id),
  );
  const relatedStudents = snapshot.students.filter((student) =>
    references.relatedStudentIds.includes(student.id),
  );
  const relatedAbsences = sortTeacherAbsences(snapshot.absences).filter((absence) =>
    references.relatedAbsenceIds.includes(absence.id),
  );

  if (relatedStudents.length && !relatedAbsences.length) {
    return [
      `Нашел ${relatedStudents.length} ${pluralizeRu(relatedStudents.length, "студента", "студентов", "студентов")} по вашему запросу.`,
      ...relatedStudents.slice(0, 4).map(
        (student) => `${student.fullName} — ${student.group}, пропусков ${student.absenceCount}.`,
      ),
    ].join("\n");
  }

  if (relatedGroups.length && !relatedAbsences.length) {
    return [
      `Нашел ${relatedGroups.length} ${pluralizeRu(relatedGroups.length, "группу", "группы", "групп")}.`,
      ...relatedGroups.map((group) => `${group.name}.`),
    ].join("\n");
  }

  if (!relatedAbsences.length) {
    if (!snapshot.absences.length) {
      return "Сейчас в кабинете преподавателя нет пропусков, поэтому показывать пока нечего.";
    }

    return "По текущим данным я не нашел подходящих записей. Попробуйте уточнить группу, студента, статус или предмет.";
  }

  return [
    `Нашел ${relatedAbsences.length} релевантн${pluralizeRu(relatedAbsences.length, "ый пропуск", "ых пропуска", "ых пропусков")}.`,
    ...relatedAbsences.slice(0, 3).map(
      (absence) =>
        `${absence.studentFullName} — ${absence.subject}, ${formatCompactDate(absence.date)}, статус «${teacherStatusLabels[absence.status as TeacherStatus] ?? absence.status}».`,
    ),
  ].join("\n");
}

// UTILITIES
function sanitizeMessages(messages: AssistantRequestBody["messages"]) {
  return messages
    .filter(
      (message): message is { content: string; role: "assistant" | "user" } =>
        typeof message.content === "string" &&
        (message.role === "assistant" || message.role === "user"),
    )
    .map((message) => ({
      content: message.content.trim(),
      role: message.role,
    }))
    .filter((message) => message.content.length > 0)
    .slice(-16);
}

function buildReferenceQuery(messages: Array<{ content: string; role: "assistant" | "user" }>) {
  const userMessages = messages
    .filter((message) => message.role === "user")
    .map((message) => message.content.trim())
    .filter(Boolean);

  const latest = userMessages.at(-1) ?? "";
  const previous = userMessages.at(-2) ?? "";

  if (previous && isFollowUpQuestion(latest)) {
    return `${previous}\n${latest}`;
  }

  return latest;
}

function sanitizeModelAnswer(value: string) {
  const text = value
    .replace(/^assistant:\s*/i, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return text || null;
}

function emptyReferences(): ReferenceSelection {
  return {
    relatedAbsenceIds: [],
    relatedGroupIds: [],
    relatedStudentIds: [],
  };
}

function formatStudentAbsence(absence: StudentAbsence) {
  const details = [
    `${formatFullDate(absence.date)}`,
    absence.subject,
    `пара: ${absence.lessonLabel}`,
    `статус: ${studentStatusLabels[absence.status as StudentStatus] ?? absence.status}`,
    `преподаватель: ${absence.teacherName}`,
    `аудитория: ${absence.classroom}`,
  ];

  if (typeof absence.grade === "number") {
    details.push(`балл: ${absence.grade}`);
  }

  if (absence.assignmentSentAt) {
    details.push(`задание отправлено: ${formatFullDate(absence.assignmentSentAt)}`);
  }

  if (absence.responseSubmittedAt) {
    details.push(`ответ отправлен: ${formatFullDate(absence.responseSubmittedAt)}`);
  }

  if (absence.completedAt) {
    details.push(`отработано: ${formatFullDate(absence.completedAt)}`);
  }

  return details.join(" | ");
}

function formatTeacherAbsence(absence: TeacherAbsence) {
  const details = [
    `${formatFullDate(absence.date)}`,
    absence.studentFullName,
    `группа: ${absence.studentGroup}`,
    `предмет: ${absence.subject}`,
    `пара: ${absence.lessonLabel}`,
    `статус: ${teacherStatusLabels[absence.status as TeacherStatus] ?? absence.status}`,
    `аудитория: ${absence.classroom}`,
  ];

  if (typeof absence.grade === "number") {
    details.push(`балл: ${absence.grade}`);
  }

  if (absence.markedNbAt) {
    details.push(`н/б поставлено: ${formatFullDate(absence.markedNbAt)}`);
  }

  if (absence.assignmentSentAt) {
    details.push(`задание отправлено: ${formatFullDate(absence.assignmentSentAt)}`);
  }

  if (absence.responseSubmittedAt) {
    details.push(`ответ студента: ${formatFullDate(absence.responseSubmittedAt)}`);
  }

  if (absence.gradedAt) {
    details.push(`оценено: ${formatFullDate(absence.gradedAt)}`);
  }

  return details.join(" | ");
}

function formatTeacherStudent(student: TeacherStudent) {
  return `${student.fullName} | группа ${student.group} | ${student.course} курс | email: ${student.email} | пропусков: ${student.absenceCount}`;
}

function formatTeacherGroup(group: TeacherGroup, absences: TeacherAssistantSnapshot["absences"]) {
  const groupAbsenceCount = absences.filter((absence) => absence.studentGroup === group.name).length;
  return `${group.name} | ${group.course} курс | ${group.specialty} | студентов: ${group.studentIds.length} | пропусков: ${groupAbsenceCount}`;
}

function formatCompactDate(value: string) {
  return compactDateFormatter.format(new Date(value));
}

function formatFullDate(value: string) {
  return fullDateFormatter.format(new Date(value));
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}\s./:-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value?.trim())).map((value) => value.trim()))];
}

function pickRandom<T>(values: readonly T[]) {
  return values[Math.floor(Math.random() * values.length)] ?? values[0];
}

function matchesEntityQuery(query: string, value: string) {
  const normalizedQuery = normalize(query);
  const normalizedValue = normalize(value);

  if (!normalizedQuery || !normalizedValue) {
    return false;
  }

  if (normalizedQuery.includes(normalizedValue)) {
    return true;
  }

  return normalizedValue
    .split(" ")
    .filter((token) => token.length >= 3)
    .some((token) => normalizedQuery.includes(token));
}

function isGreeting(query: string) {
  return includesAny(query, ["привет", "здравств", "добрый день", "добрый вечер", "салам", "хай"]);
}

function isThanks(query: string) {
  return includesAny(query, ["спасибо", "благодар", "рахмет"]);
}

function isCapabilityQuery(query: string) {
  return includesAny(query, [
    "что умеешь",
    "что ты умеешь",
    "чем можешь помочь",
    "кто ты",
    "что можешь",
    "чем поможешь",
  ]);
}

function isFollowUpQuestion(query: string) {
  const normalizedQuery = normalize(query);

  return (
    normalizedQuery.split(" ").length <= 8 &&
    includesAny(normalizedQuery, [
      "а какие",
      "а какой",
      "а кто",
      "а что",
      "из них",
      "кто именно",
      "какие именно",
      "по кому",
      "по какой",
      "по какому",
    ])
  );
}

function includesAny(query: string, values: readonly string[]) {
  return values.some((value) => query.includes(value));
}

function mentionsStudentWorkDomain(query: string) {
  return includesAny(query, [
    "пропуск",
    "пропуски",
    "отработ",
    "задани",
    "оцен",
    "балл",
    "предмет",
    "преподав",
    "статус",
    "урок",
    "пара",
    "дата",
    "уведом",
  ]);
}

function mentionsTeacherWorkDomain(query: string) {
  return includesAny(query, [
    "пропуск",
    "пропуски",
    "отработ",
    "задани",
    "оцен",
    "балл",
    "групп",
    "студент",
    "ученик",
    "заявк",
    "провер",
    "предмет",
    "н/б",
    "уведом",
  ]);
}

function mentionsTeacherActionDomain(query: string) {
  return includesAny(query, [
    "пропуск",
    "отработ",
    "задани",
    "оцен",
    "балл",
    "заявк",
    "провер",
    "н/б",
  ]);
}

function isSocialOrStudentDomainQuery(query: string, absences: StudentAssistantSnapshot["absences"]) {
  return (
    isGreeting(query) ||
    isThanks(query) ||
    isCapabilityQuery(query) ||
    mentionsStudentWorkDomain(query) ||
    absences.some(
      (absence) =>
        matchesEntityQuery(query, absence.subject) ||
        matchesEntityQuery(query, absence.teacherName) ||
        queryMentionsDate(query, absence.date),
    )
  );
}

function isSocialOrTeacherDomainQuery(
  query: string,
  snapshot: TeacherAssistantSnapshot,
) {
  return (
    isGreeting(query) ||
    isThanks(query) ||
    isCapabilityQuery(query) ||
    mentionsTeacherWorkDomain(query) ||
    snapshot.groups.some((group) => matchesEntityQuery(query, group.name)) ||
    snapshot.students.some((student) => matchesEntityQuery(query, student.fullName)) ||
    snapshot.absences.some(
      (absence) =>
        matchesEntityQuery(query, absence.subject) ||
        matchesEntityQuery(query, absence.studentFullName) ||
        matchesEntityQuery(query, absence.studentGroup) ||
        queryMentionsDate(query, absence.date),
    )
  );
}

function resolveStudentStatuses(query: string) {
  return (Object.entries(studentStatusKeywords) as Array<[StudentStatus, readonly string[]]>)
    .filter(([, keywords]) => includesAny(query, keywords))
    .map(([status]) => status);
}

function resolveTeacherStatuses(query: string) {
  return (Object.entries(teacherStatusKeywords) as Array<[TeacherStatus, readonly string[]]>)
    .filter(([, keywords]) => includesAny(query, keywords))
    .flatMap(([status]) => {
      if (status === "submitted" && includesAny(query, ["отработал", "отработали", "сдали", "закрыли"])) {
        return ["submitted", "graded"] satisfies TeacherStatus[];
      }

      return [status];
    });
}

function mentionsGrades(query: string) {
  return includesAny(query, ["оцен", "балл", "баллы"]);
}

function mentionsAssignments(query: string) {
  return includesAny(query, ["задани", "задания", "ответ", "ответил", "ответы"]);
}

function mentionsNotifications(query: string) {
  return includesAny(query, ["уведом", "сообщен", "оповещен"]);
}

function mentionsRequests(query: string) {
  return includesAny(query, ["заявк", "запрос", "просит задание"]);
}

function mentionsActive(query: string) {
  return includesAny(query, ["активн", "текущ", "не закрыт", "не закрыто", "неотработ"]);
}

function mentionsGroups(query: string) {
  return includesAny(query, ["групп", "группа", "группы"]);
}

function mentionsStudents(query: string) {
  return includesAny(query, ["студент", "студенты", "ученик", "ученики", "кто", "кому", "у кого"]);
}

function mentionsSubjects(query: string) {
  return includesAny(query, ["предмет", "предметы", "дисциплин", "что веду"]);
}

function mentionsTop(query: string) {
  return includesAny(query, ["больше всего", "чаще всего", "максимум", "топ", "самый"]);
}

function mentionsWithoutAbsences(query: string) {
  return includesAny(query, ["без пропуск", "нет пропуск", "у кого нет пропуск"]);
}

function mentionsNeedsGrading(query: string) {
  return includesAny(query, ["оценить", "проверить", "ждут оценки", "на оценивании"]);
}

function mentionsTeacherCompleted(query: string) {
  return includesAny(query, ["отработал", "отработали", "сдали", "закрыли"]);
}

function queryMentionsDate(query: string, date: string) {
  const normalizedQuery = normalize(query);
  const dateValue = new Date(date);
  const dd = String(dateValue.getUTCDate()).padStart(2, "0");
  const mm = String(dateValue.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = String(dateValue.getUTCFullYear());
  const formats = [
    `${dd}.${mm}.${yyyy}`,
    `${dd}.${mm}`,
    normalize(fullDateFormatter.format(dateValue)),
  ];

  return formats.some((value) => normalizedQuery.includes(value));
}

function isClearlyOutOfScope(
  query: string,
  role: "student" | "teacher",
  hasData: boolean,
) {
  const inScope = role === "student" ? mentionsStudentWorkDomain(query) : mentionsTeacherWorkDomain(query);

  if (inScope || isGreeting(query) || isThanks(query) || isCapabilityQuery(query)) {
    return false;
  }

  if (hasData && includesAny(query, ["какие есть", "что у меня", "что сейчас", "покажи"])) {
    return false;
  }

  return includesAny(query, [
    "погод",
    "курс доллара",
    "новост",
    "музык",
    "фильм",
    "игр",
    "программир",
    "рецепт",
    "спорт",
  ]);
}

function sortStudentAbsences(absences: StudentAssistantSnapshot["absences"]) {
  return absences
    .slice()
    .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());
}

function sortTeacherAbsences(absences: TeacherAssistantSnapshot["absences"]) {
  return absences
    .slice()
    .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());
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

function isTooSimilar(next: string, previous: string) {
  const nextTokens = new Set(normalize(next).split(" ").filter((token) => token.length >= 3));
  const previousTokens = new Set(
    normalize(previous).split(" ").filter((token) => token.length >= 3),
  );

  if (!nextTokens.size || !previousTokens.size) {
    return normalize(next) === normalize(previous);
  }

  let shared = 0;
  for (const token of nextTokens) {
    if (previousTokens.has(token)) {
      shared += 1;
    }
  }

  const overlap = shared / Math.max(nextTokens.size, previousTokens.size);
  return overlap >= 0.85;
}
