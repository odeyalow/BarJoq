"use client";

import { useState, type CSSProperties, type ChangeEvent } from "react";
import { ArrowLeft, FileUp, Save, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { AttachmentList } from "@/components/student/attachment-list";
import { TeacherStatusBadge } from "@/components/teacher/teacher-status-badge";
import { useTeacherPortal } from "@/components/teacher/teacher-portal-provider";
import { Button, Card, Field, Input, Text, Textarea } from "@/components/ui";
import { formatPortalDate, type Attachment } from "@/lib/student-portal";
import { css } from "styled-system/css";

export function TeacherAssignmentForm({ absenceId }: { absenceId: string }) {
  const router = useRouter();
  const { absences, isHydrated, saveAssignment } = useTeacherPortal();
  const absence = absences.find((item) => item.id === absenceId);

  const [assignmentText, setAssignmentText] = useState(
    absence?.assignment?.text ?? "",
  );
  const [attachments, setAttachments] = useState<Attachment[]>(
    absence?.assignment?.attachments ?? [],
  );
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  if (!isHydrated) {
    return (
      <Card.Root variant="outline">
        <Card.Body className={css({ gap: "3", py: "8" })}>
          <Text
            className={css({
              fontFamily: "var(--font-space-grotesk)",
              fontSize: "2xl",
              fontWeight: "700",
            })}
          >
            Загрузка задания
          </Text>
          <Text color="fg.muted">
            Подготавливаем данные по пропуску и текущему заданию преподавателя.
          </Text>
        </Card.Body>
      </Card.Root>
    );
  }

  if (!absence) {
    return (
      <Card.Root variant="outline">
        <Card.Body className={css({ gap: "4", py: "8" })}>
          <Text
            className={css({
              fontFamily: "var(--font-space-grotesk)",
              fontSize: "2xl",
              fontWeight: "700",
            })}
          >
            Пропуск не найден
          </Text>
          <Button
            alignSelf="start"
            colorPalette="gray"
            onClick={() => router.push("/teacher/dashboard")}
            variant="surface"
          >
            Вернуться к списку
          </Button>
        </Card.Body>
      </Card.Root>
    );
  }

  const canEditAssignment =
    absence.status === "request_received" ||
    absence.status === "assignment_sent";

  if (!canEditAssignment) {
    return (
      <Card.Root variant="outline">
        <Card.Body className={css({ gap: "4", py: "8" })}>
          <Text
            className={css({
              fontFamily: "var(--font-space-grotesk)",
              fontSize: "2xl",
              fontWeight: "700",
            })}
          >
            Для этого статуса редактирование задания недоступно
          </Text>
          <Button
            alignSelf="start"
            colorPalette="gray"
            onClick={() => router.push(`/teacher/absences/${absence.id}`)}
            variant="surface"
          >
            Вернуться в карточку
          </Button>
        </Card.Body>
      </Card.Root>
    );
  }

  const submitLabel = absence.assignment
    ? "Сохранить изменения"
    : "Отправить задание студенту";

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFiles = Array.from(event.target.files ?? []);

    if (!nextFiles.length) {
      return;
    }

    setSelectedFiles(nextFiles);
    setAttachments(
      nextFiles.map((file) => ({
        id: `upload-${file.name}-${file.lastModified}`,
        name: file.name,
        href: "#",
        sizeLabel: formatFileSize(file.size),
      })),
    );
  };

  const handleSubmit = async () => {
    if (!assignmentText.trim()) {
      return;
    }

    setIsSaving(true);

    try {
      await saveAssignment(absence.id, {
        text: assignmentText.trim(),
        keepAttachmentIds: selectedFiles.length
          ? []
          : attachments.map((item) => item.id),
        files: selectedFiles,
      });
      router.push(`/teacher/absences/${absence.id}`);
      router.refresh();
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Не удалось сохранить задание.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={css({ display: "grid", gap: "6" })}>
      <section
        className={`reveal ${css({
          backdropFilter: "blur(18px)",
          bg: "gray.surface.bg",
          border: "1px solid",
          borderColor: "border",
          borderRadius: "l3",
          boxShadow: "lg",
          p: { base: "5", md: "6" },
        })}`}
      >
        <div className={css({ display: "grid", gap: "4" })}>
          <div className={css({ display: "flex", justifyContent: "flex-start" })}>
            <Button
              colorPalette="gray"
              onClick={() => router.push(`/teacher/absences/${absence.id}`)}
              variant="plain"
            >
              <ArrowLeft />
              Назад к карточке пропуска
            </Button>
          </div>

          <div
            className={css({
              alignItems: { base: "start", lg: "center" },
              display: "flex",
              flexDirection: { base: "column", lg: "row" },
              gap: "4",
              justifyContent: "space-between",
            })}
          >
            <div className={css({ display: "grid", gap: "2" })}>
              <h2
                className={css({
                  fontFamily: "var(--font-space-grotesk)",
                  fontSize: { base: "2xl", md: "4xl" },
                  fontWeight: "700",
                  lineHeight: "1.05",
                })}
              >
                Задание для {absence.studentFullName}
              </h2>
              <Text color="fg.muted">
                Пропуск от {formatPortalDate(absence.date)} по предмету{" "}
                {absence.subject}.
              </Text>
            </div>

            <TeacherStatusBadge status={absence.status} />
          </div>
        </div>
      </section>

      {absence.status === "request_received" ? (
        <Card.Root variant="outline">
          <Card.Body
            className={css({
              alignItems: { base: "start", md: "center" },
              bg: "amber.subtle.bg",
              color: "amber.plain.fg",
              display: "flex",
              flexDirection: { base: "column", md: "row" },
              gap: "3",
              justifyContent: "space-between",
              py: "5",
            })}
          >
            <div className={css({ display: "grid", gap: "1.5", maxW: "760px" })}>
              <div className={css({ alignItems: "center", display: "inline-flex", gap: "2.5" })}>
                <ShieldCheck className={css({ h: "5", w: "5" })} />
                <Text className={css({ fontWeight: "700" })}>
                  Заявка одобрена заведующим отделением
                </Text>
              </div>
              <Text style={{ color: "inherit" }}>
                Справку студента уже проверили. После сохранения задание сразу
                станет доступно студенту для отработки.
              </Text>
            </div>
          </Card.Body>
        </Card.Root>
      ) : null}

      <Card.Root
        variant="outline"
        className={`reveal ${css({ borderColor: "border" })}`}
        style={
          {
            "--reveal-delay": "120ms",
          } as CSSProperties
        }
      >
        <Card.Header>
          <Card.Title>
            {absence.assignment ? "Изменить задание" : "Добавить задание"}
          </Card.Title>
          <Card.Description>
            Напишите текст задания и при необходимости прикрепите файлы. После
            сохранения задание сразу станет доступно студенту в его отработке.
          </Card.Description>
        </Card.Header>

        <Card.Body className={css({ gap: "5" })}>
          <Field.Root>
            <Field.Label>Текст задания</Field.Label>
            <Textarea
              minH="180px"
              placeholder="Опишите, что именно должен выполнить студент для отработки пропуска."
              value={assignmentText}
              onChange={(event) => setAssignmentText(event.target.value)}
            />
            <Field.HelperText>
              Можно указать этапы выполнения, дедлайн и требования к оформлению.
            </Field.HelperText>
          </Field.Root>

          <Field.Root>
            <Field.Label>Файлы задания</Field.Label>
            <label
              className={css({
                alignItems: "center",
                bg: "gray.subtle.bg",
                border: "1px dashed",
                borderColor: "gray.7",
                borderRadius: "l3",
                cursor: "pointer",
                display: "flex",
                gap: "3",
                justifyContent: "center",
                minH: "28",
                p: "5",
                textAlign: "center",
                transitionDuration: "normal",
                transitionProperty: "background-color, border-color",
                _hover: {
                  bg: "gray.surface.bg",
                  borderColor: "teal.8",
                },
              })}
            >
              <FileUp
                aria-hidden="true"
                className={css({
                  h: "5",
                  w: "5",
                })}
              />
              <div>
                <Text className={css({ fontWeight: "semibold" })}>
                  Выберите один или несколько файлов
                </Text>
                <Text className={css({ color: "fg.muted", mt: "1" })}>
                  Подойдут PDF, DOCX, изображения или текстовые файлы.
                </Text>
              </div>
              <Input
                type="file"
                multiple
                onChange={handleFileChange}
                className={css({ display: "none" })}
              />
            </label>
          </Field.Root>

          <div className={css({ display: "grid", gap: "3" })}>
            <Text className={css({ fontWeight: "semibold" })}>
              Текущие вложения
            </Text>
            {attachments.length ? (
              <AttachmentList attachments={attachments} compact />
            ) : (
              <Text color="fg.muted">
                Файлы пока не добавлены. Можно отправить только текст задания.
              </Text>
            )}
          </div>

          <div
            className={css({
              display: "flex",
              flexWrap: "wrap",
              gap: "3",
            })}
          >
            <Button
              colorPalette="teal"
              disabled={isSaving || !assignmentText.trim()}
              onClick={handleSubmit}
            >
              <Save />
              {isSaving ? "Сохраняем..." : submitLabel}
            </Button>
            <Button
              colorPalette="gray"
              onClick={() => router.push(`/teacher/absences/${absence.id}`)}
              variant="surface"
            >
              Отмена
            </Button>
          </div>
        </Card.Body>
      </Card.Root>
    </div>
  );
}

function formatFileSize(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
