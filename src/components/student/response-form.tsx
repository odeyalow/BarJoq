"use client";

import { useState } from "react";
import { ArrowLeft, FileUp, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { AttachmentList } from "@/components/student/attachment-list";
import { DeadlineAlert } from "@/components/student/deadline-alert";
import { StatusBadge } from "@/components/student/status-badge";
import { useStudentPortal } from "@/components/student/student-portal-provider";
import { Button, Card, Field, Input, Text, Textarea } from "@/components/ui";
import { isStudentAbsenceDeadlineExpired } from "@/lib/absence-deadlines";
import {
  formatPortalDate,
  formatPortalDateTime,
  type Attachment,
} from "@/lib/student-portal";
import { css } from "styled-system/css";

export function ResponseForm({ absenceId }: { absenceId: string }) {
  const router = useRouter();
  const { absences, isHydrated, saveResponse } = useStudentPortal();
  const absence = absences.find((item) => item.id === absenceId);

  const [answerText, setAnswerText] = useState(absence?.response?.text ?? "");
  const [attachments, setAttachments] = useState<Attachment[]>(
    absence?.response?.attachments ?? [],
  );
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  if (!isHydrated) {
    return (
      <Card.Root variant="outline">
        <Card.Body
          className={css({
            gap: "3",
            py: "8",
          })}
        >
          <Text
            className={css({
              fontFamily: "var(--font-space-grotesk)",
              fontSize: "2xl",
              fontWeight: "700",
            })}
          >
            Загрузка формы ответа
          </Text>
          <Text color="fg.muted">
            Синхронизируем задание преподавателя и сохраненный ответ студента.
          </Text>
        </Card.Body>
      </Card.Root>
    );
  }

  if (!absence) {
    return (
      <Card.Root variant="outline">
        <Card.Body
          className={css({
            gap: "4",
            py: "8",
          })}
        >
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
            onClick={() => router.push("/student")}
            variant="surface"
          >
            Вернуться к списку
          </Button>
        </Card.Body>
      </Card.Root>
    );
  }

  const canSubmit =
    absence.status === "assignment_received" || absence.status === "under_review";
  const isDeadlineExpired = isStudentAbsenceDeadlineExpired(absence);

  if (absence.status === "expired") {
    return (
      <div
        className={css({
          display: "grid",
          gap: "5",
        })}
      >
        <Card.Root variant="outline">
          <Card.Body
            className={css({
              gap: "4",
              py: "8",
            })}
          >
            <Text
              className={css({
                fontFamily: "var(--font-space-grotesk)",
                fontSize: "2xl",
                fontWeight: "700",
              })}
            >
              Время на отработку истекло
            </Text>
            <Text color="fg.muted">
              Срок на отправку ответа уже закончился. Вернитесь в карточку
              пропуска, если нужно запросить повторный доступ на отработку.
            </Text>
            <Button
              alignSelf="start"
              colorPalette="gray"
              onClick={() => router.push(`/student/absences/${absence.id}`)}
              variant="surface"
            >
              Вернуться в карточку
            </Button>
          </Card.Body>
        </Card.Root>
      </div>
    );
  }

  if (!canSubmit || !absence.assignment) {
    return (
      <Card.Root variant="outline">
        <Card.Body
          className={css({
            gap: "4",
            py: "8",
          })}
        >
          <Text
            className={css({
              fontFamily: "var(--font-space-grotesk)",
              fontSize: "2xl",
              fontWeight: "700",
            })}
          >
            Для этого статуса редактирование ответа недоступно
          </Text>
          <Button
            alignSelf="start"
            colorPalette="gray"
            onClick={() => router.push(`/student/absences/${absence.id}`)}
            variant="surface"
          >
            Вернуться в карточку
          </Button>
        </Card.Body>
      </Card.Root>
    );
  }

  if (isDeadlineExpired) {
    return (
      <div
        className={css({
          display: "grid",
          gap: "5",
        })}
      >
        <DeadlineAlert absence={absence} />

        <Card.Root variant="outline">
          <Card.Body
            className={css({
              gap: "4",
              py: "8",
            })}
          >
            <Text
              className={css({
                fontFamily: "var(--font-space-grotesk)",
                fontSize: "2xl",
                fontWeight: "700",
              })}
            >
              Срок на отправку ответа истек
            </Text>
            <Text color="fg.muted">
              Отправка и изменение ответа для этого пропуска уже недоступны. При необходимости обратитесь к преподавателю.
            </Text>
            <Button
              alignSelf="start"
              colorPalette="gray"
              onClick={() => router.push(`/student/absences/${absence.id}`)}
              variant="surface"
            >
              Вернуться в карточку
            </Button>
          </Card.Body>
        </Card.Root>
      </div>
    );
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
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
    if (!answerText.trim()) {
      return;
    }

    setIsSaving(true);
    try {
      await saveResponse(absence.id, {
        text: answerText.trim(),
        keepAttachmentIds: selectedFiles.length ? [] : attachments.map((item) => item.id),
        files: selectedFiles,
      });
      router.push(`/student/absences/${absence.id}`);
      router.refresh();
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "Не удалось сохранить ответ.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className={css({
        display: "grid",
        gap: "6",
      })}
    >
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
        <div
          className={css({
            display: "grid",
            gap: "4",
          })}
        >
          <div
            className={css({
              display: "flex",
              justifyContent: "flex-start",
            })}
          >
            <Button
              colorPalette="gray"
              onClick={() => router.push(`/student/absences/${absence.id}`)}
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
            <div
              className={css({
                display: "grid",
                gap: "2",
              })}
            >
              <h2
                className={css({
                  fontFamily: "var(--font-space-grotesk)",
                  fontSize: { base: "2xl", md: "4xl" },
                  fontWeight: "700",
                  lineHeight: "1.05",
                })}
              >
                Ответ по предмету «{absence.subject}»
              </h2>
              <Text color="fg.muted">
                Пропуск от {formatPortalDate(absence.date)}. После сохранения
                статус автоматически перейдет в «На оценивании».
              </Text>
            </div>

            <StatusBadge status={absence.status} />
          </div>

          <DeadlineAlert absence={absence} />
        </div>
      </section>

      <Card.Root
        variant="outline"
        className={`reveal ${css({
          borderColor: "border",
        })}`}
        style={
          {
            "--reveal-delay": "100ms",
          } as React.CSSProperties
        }
      >
        <Card.Header>
          <Card.Title>Текущее задание преподавателя</Card.Title>
          <Card.Description>
            Отправлено {formatPortalDateTime(absence.assignment.sentAt)}
          </Card.Description>
        </Card.Header>

        <Card.Body
          className={css({
            gap: "4",
          })}
        >
          <Text
            className={css({
              lineHeight: "1.75",
              whiteSpace: "pre-line",
            })}
          >
            {absence.assignment.text}
          </Text>
          <AttachmentList attachments={absence.assignment.attachments} />
        </Card.Body>
      </Card.Root>

      <Card.Root
        variant="outline"
        className={`reveal ${css({
          borderColor: "border",
        })}`}
        style={
          {
            "--reveal-delay": "160ms",
          } as React.CSSProperties
        }
      >
        <Card.Header>
          <Card.Title>
            {absence.response ? "Обновить ответ" : "Добавить ответ"}
          </Card.Title>
          <Card.Description>
            Ответ и вложения сохраняются в базе и доступны преподавателю в его
            кабинете.
          </Card.Description>
        </Card.Header>

        <Card.Body
          className={css({
            gap: "5",
          })}
        >
          <Field.Root>
            <Field.Label>Текст ответа</Field.Label>
            <Textarea
              minH="180px"
              placeholder="Опишите, что именно вы выполнили и что прикрепили к ответу."
              value={answerText}
              onChange={(event) => setAnswerText(event.target.value)}
            />
            <Field.HelperText>
              Можно кратко описать выполненную работу, структуру файла и вывод.
            </Field.HelperText>
          </Field.Root>

          <Field.Root>
            <Field.Label>Файлы ответа</Field.Label>
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
                <Text
                  className={css({
                    fontWeight: "semibold",
                  })}
                >
                  Выберите файл или несколько файлов
                </Text>
                <Text
                  className={css({
                    color: "fg.muted",
                    mt: "1",
                  })}
                >
                  Подойдут PDF, DOCX, изображения или текстовые файлы.
                </Text>
              </div>
              <Input
                type="file"
                multiple
                onChange={handleFileChange}
                className={css({
                  display: "none",
                })}
              />
            </label>
          </Field.Root>

          <div
            className={css({
              display: "grid",
              gap: "3",
            })}
          >
            <Text
              className={css({
                fontWeight: "semibold",
              })}
            >
              Текущие вложения
            </Text>
            {attachments.length ? (
              <AttachmentList attachments={attachments} compact />
            ) : (
              <Text color="fg.muted">
                Файлы пока не выбраны. Можно отправить только текстовый ответ.
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
              disabled={isSaving || !answerText.trim()}
              onClick={handleSubmit}
            >
              <Save />
              {absence.response ? "Обновить ответ" : "Отправить на проверку"}
            </Button>
            <Button
              colorPalette="gray"
              onClick={() => router.push(`/student/absences/${absence.id}`)}
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
