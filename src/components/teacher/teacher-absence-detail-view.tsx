"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  ClipboardList,
  Clock3,
  FilePenLine,
  MailPlus,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { AttachmentList } from "@/components/student/attachment-list";
import { TeacherStatusBadge } from "@/components/teacher/teacher-status-badge";
import { useTeacherPortal } from "@/components/teacher/teacher-portal-provider";
import { Button, Card, Dialog, Field, Input, Text } from "@/components/ui";
import { formatPortalDate, formatPortalDateTime } from "@/lib/student-portal";
import { teacherStatusMeta } from "@/lib/teacher-portal";
import { css } from "styled-system/css";

export function TeacherAbsenceDetailView({ absenceId }: { absenceId: string }) {
  const router = useRouter();
  const { absences, gradeAbsence, isHydrated, deleteAssignment, markNb } =
    useTeacherPortal();
  const absence = absences.find((item) => item.id === absenceId);
  const [isGradeDialogOpen, setIsGradeDialogOpen] = useState(false);
  const [gradeValue, setGradeValue] = useState(() =>
    absence?.grade ? String(absence.grade) : "85",
  );

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
            Загрузка карточки пропуска
          </Text>
          <Text color="fg.muted">
            Подтягиваем актуальные данные по заданию, ответу и итоговой
            оценке.
          </Text>
        </Card.Body>
      </Card.Root>
    );
  }

  if (!absence) {
    return (
      <StatePanel
        action={{
          label: "Вернуться к списку",
          onClick: () => router.push("/teacher/dashboard"),
        }}
        description="Проверьте ссылку или откройте пропуск из списка на главной странице преподавателя."
        title="Пропуск не найден"
      />
    );
  }

  const showAssignment = Boolean(absence.assignment);
  const showResponse = Boolean(absence.response);
  const excuseAttachment = absence.excuseAttachment;

  const handleGradeSave = async () => {
    const parsedGrade = Number(gradeValue);

    if (!Number.isFinite(parsedGrade) || parsedGrade < 0 || parsedGrade > 100) {
      return;
    }

    try {
      await gradeAbsence(absence.id, parsedGrade);
      setIsGradeDialogOpen(false);
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Не удалось сохранить оценку.",
      );
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
          overflow: "hidden",
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
              onClick={() => router.push("/teacher/dashboard")}
              variant="plain"
            >
              <ArrowLeft />
              К списку пропусков
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
                {absence.studentFullName}
              </h2>
              <Text
                className={css({
                  color: "fg.muted",
                  maxW: "760px",
                })}
              >
                {absence.subject}. {teacherStatusMeta[absence.status].description}
              </Text>
            </div>

            <div
              className={css({
                alignItems: "stretch",
                display: "flex",
                flexDirection: { base: "column", sm: "row" },
                gap: "3",
              })}
            >
              <TeacherStatusBadge status={absence.status} />

              {absence.grade !== undefined ? (
                <div
                  className={css({
                    alignItems: "flex-start",
                    bg: "green.subtle.bg",
                    borderRadius: "l2",
                    color: "green.plain.fg",
                    display: "flex",
                    flexDirection: "column",
                    h: "12",
                    justifyContent: "center",
                    minW: "28",
                    px: "4.5",
                  })}
                >
                  <Text
                    className={css({
                      textStyle: "xs",
                    })}
                  >
                    Оценка
                  </Text>
                  <Text
                    className={css({
                      fontFamily: "var(--font-space-grotesk)",
                      fontSize: "xl",
                      fontWeight: "700",
                      lineHeight: "1",
                      mt: "0.5",
                    })}
                  >
                    {absence.grade}
                  </Text>
                </div>
              ) : null}
            </div>
          </div>

          <div
            className={css({
              display: "grid",
              gap: "3",
              gridTemplateColumns: {
                base: "1fr",
                md: "repeat(2, minmax(0, 1fr))",
                xl: "repeat(4, minmax(0, 1fr))",
              },
            })}
          >
            <InfoTile label="Студент" value={absence.studentFullName} />
            <InfoTile
              label="Группа"
              value={`${absence.studentGroup}, ${absence.studentCourse} курс`}
            />
            <InfoTile
              label="Дата пропуска"
              value={`${formatPortalDate(absence.date)}, ${absence.lessonLabel}`}
            />
            <InfoTile label="Предмет" value={absence.subject} />
          </div>
        </div>
      </section>

      {absence.status === "missed" ? (
        <StatePanel
          action={{
            label: absence.markedNbAt ? "Н/Б уже отмечено" : "Поставить н/б",
            onClick: () => {
              void markNb(absence.id).catch(() => undefined);
            },
          }}
          actionDisabled={Boolean(absence.markedNbAt)}
          actionPlacement="header"
          icon={<MailPlus />}
          title="Пропуск еще не отработан"
        >
          {absence.markedNbAt ? (
            <InfoTile
              label="Отметка н/б"
              value={`Зафиксировано ${formatPortalDateTime(absence.markedNbAt)}`}
            />
          ) : null}
        </StatePanel>
      ) : null}

      {absence.status === "nb_marked" ? (
        <StatePanel accent="red" icon={<MailPlus />} title="Н/Б уже поставлено">
          {absence.markedNbAt ? (
            <InfoTile
              label="Н/Б зафиксировано"
              value={`Зафиксировано ${formatPortalDateTime(absence.markedNbAt)}`}
            />
          ) : null}
        </StatePanel>
      ) : null}

      {absence.status === "request_received" ? (
        <StatePanel
          action={{
            label: "Добавить задание",
            onClick: () => router.push(`/teacher/absences/${absence.id}/assignment`),
          }}
          actionPlacement="header"
          icon={<ClipboardList />}
          title="Получена заявка на отработку"
        >
          <Text color="fg.muted">
            Студент уже запросил материалы. Можно перейти к созданию задания и
            отправить его на отдельной странице.
          </Text>
        </StatePanel>
      ) : null}

      {excuseAttachment ? (
        <Card.Root variant="outline">
          <Card.Header>
            <Card.Title>Файл уважительной причины</Card.Title>
            <Card.Description>
              Документ, который студент прикрепил перед подачей заявки.
            </Card.Description>
          </Card.Header>
          <Card.Body>
            <AttachmentList attachments={[excuseAttachment]} />
          </Card.Body>
        </Card.Root>
      ) : null}

      {absence.status === "expired" ? (
        <StatePanel accent="red" icon={<Clock3 />} title="Время на отработку истекло">
          <div
            className={css({
              display: "grid",
              gap: "3",
              gridTemplateColumns: {
                base: "1fr",
                md: "repeat(2, minmax(0, 1fr))",
              },
            })}
          >
            {absence.markedNbAt ? (
              <InfoTile
                label="Н/Б зафиксировано"
                value={formatPortalDateTime(absence.markedNbAt)}
              />
            ) : null}
            {absence.reworkAccessRequestedAt ? (
              <InfoTile
                label="Повторный доступ запрошен"
                value={formatPortalDateTime(absence.reworkAccessRequestedAt)}
              />
            ) : null}
          </div>
          <Text color="fg.muted">
            Срок на отработку истек автоматически. Пропуск переведен в н/б и
            больше не доступен для обычной выдачи задания.
          </Text>
        </StatePanel>
      ) : null}

      {absence.status === "graded" && absence.gradedAt ? (
        <Card.Root
          variant="outline"
          className={`reveal ${css({
            borderColor: "green.surface.border",
            bg: "green.surface.bg",
          })}`}
          style={
            {
              "--reveal-delay": "120ms",
            } as CSSProperties
          }
        >
          <Card.Header>
            <Card.Title>Итог проверки</Card.Title>
            <Card.Description>
              Ответ студента уже оценен и закрыт преподавателем.
            </Card.Description>
          </Card.Header>

          <Card.Body
            className={css({
              gap: "4",
            })}
          >
            <div
              className={css({
                display: "grid",
                gap: "3",
                gridTemplateColumns: {
                  base: "1fr",
                  md: "repeat(2, minmax(0, 1fr))",
                },
              })}
            >
              <InfoTile label="Оценка" value={`${absence.grade} / 100`} />
              <InfoTile
                label="Дата выставления"
                value={formatPortalDateTime(absence.gradedAt)}
              />
            </div>
          </Card.Body>
        </Card.Root>
      ) : null}

      {showAssignment ? (
        <Card.Root
          variant="outline"
          className={`reveal ${css({
            borderColor: "border",
          })}`}
          style={
            {
              "--reveal-delay": "160ms",
            } as CSSProperties
          }
        >
          <Card.Header>
            <Card.Title>Задание преподавателя</Card.Title>
            <Card.Description>
              Отправлено {formatPortalDateTime(absence.assignment!.sentAt)}
              {absence.assignment?.editedAt
                ? `, обновлено ${formatPortalDateTime(absence.assignment.editedAt)}`
                : ""}
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
              {absence.assignment!.text}
            </Text>

            <AttachmentList attachments={absence.assignment!.attachments} />

            {absence.status === "assignment_sent" ? (
              <div
                className={css({
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "3",
                })}
              >
                <Button
                  colorPalette="teal"
                  onClick={() =>
                    router.push(`/teacher/absences/${absence.id}/assignment`)
                  }
                >
                  <FilePenLine />
                  Изменить задание
                </Button>
                <Button
                  colorPalette="red"
                  onClick={() => {
                    void deleteAssignment(absence.id).catch(() => undefined);
                  }}
                  variant="surface"
                >
                  <Trash2 />
                  Удалить
                </Button>
              </div>
            ) : null}
          </Card.Body>
        </Card.Root>
      ) : null}

      {showResponse ? (
        <Card.Root
          variant="outline"
          className={`reveal ${css({
            borderColor: "border",
          })}`}
          style={
            {
              "--reveal-delay": "220ms",
            } as CSSProperties
          }
        >
          <Card.Header>
            <Card.Title>Ответ студента</Card.Title>
            <Card.Description>
              Отправлен {formatPortalDateTime(absence.response!.submittedAt)}
              {absence.response?.editedAt
                ? `, обновлен ${formatPortalDateTime(absence.response.editedAt)}`
                : ""}
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
              {absence.response!.text}
            </Text>

            <AttachmentList attachments={absence.response!.attachments} />

            {absence.status === "submitted" ? (
              <Dialog.Root
                open={isGradeDialogOpen}
                onOpenChange={(details) => setIsGradeDialogOpen(details.open)}
              >
                <Dialog.Trigger asChild>
                  <Button alignSelf="start" colorPalette="teal">
                    <BadgeCheck />
                    Оценить
                  </Button>
                </Dialog.Trigger>

                <Dialog.Portal>
                  <Dialog.Backdrop />
                  <Dialog.Positioner
                    className={css({
                      px: { base: "4", md: "0" },
                    })}
                  >
                    <Dialog.Content
                      className={css({
                        border: "1px solid",
                        borderColor: "border",
                        maxW: "420px",
                      })}
                    >
                      <Dialog.Header>
                        <Dialog.Title>Оценить отработку</Dialog.Title>
                        <Dialog.Description>
                          Введите итоговый балл от 0 до 100 и сохраните оценку.
                        </Dialog.Description>
                      </Dialog.Header>

                      <Dialog.Body
                        className={css({
                          gap: "4",
                        })}
                      >
                        <Field.Root>
                          <Field.Label>Балл</Field.Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={gradeValue}
                            onChange={(event) => setGradeValue(event.target.value)}
                          />
                        </Field.Root>
                      </Dialog.Body>

                      <Dialog.Footer>
                        <Dialog.ActionTrigger asChild>
                          <Button colorPalette="gray" variant="surface">
                            Отмена
                          </Button>
                        </Dialog.ActionTrigger>
                        <Button colorPalette="teal" onClick={handleGradeSave}>
                          Сохранить
                        </Button>
                      </Dialog.Footer>
                    </Dialog.Content>
                  </Dialog.Positioner>
                </Dialog.Portal>
              </Dialog.Root>
            ) : null}
          </Card.Body>
        </Card.Root>
      ) : null}
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div
      className={css({
        bg: "gray.subtle.bg",
        borderRadius: "l2",
        p: "3.5",
      })}
    >
      <Text
        className={css({
          color: "fg.muted",
          textStyle: "xs",
        })}
      >
        {label}
      </Text>
      <Text
        className={css({
          mt: "1.5",
          fontWeight: "semibold",
          lineHeight: "1.5",
        })}
      >
        {value}
      </Text>
    </div>
  );
}

function StatePanel({
  title,
  description,
  icon,
  action,
  actionDisabled,
  actionPlacement = "footer",
  accent = "teal",
  children,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  actionDisabled?: boolean;
  actionPlacement?: "header" | "footer";
  accent?: "red" | "teal";
  children?: ReactNode;
}) {
  return (
    <Card.Root
      variant="outline"
      className={`reveal ${css({
        borderColor: "border",
      })}`}
      style={
        {
          "--reveal-delay": "80ms",
        } as CSSProperties
      }
    >
      <Card.Body
        className={css({
          gap: "5",
          py: "8",
        })}
      >
        <div
          className={css({
            alignItems: { base: "start", md: "center" },
            color: accent === "red" ? "red.plain.fg" : "teal.plain.fg",
            display: "flex",
            flexDirection: { base: "column", md: "row" },
            gap: "3",
            justifyContent: "space-between",
          })}
        >
          <div
            className={css({
              alignItems: "center",
              display: "inline-flex",
              gap: "3",
            })}
          >
            {icon}
            <Text
              className={css({
                fontFamily: "var(--font-space-grotesk)",
                fontSize: "2xl",
                fontWeight: "700",
                lineHeight: "1.1",
              })}
            >
              {title}
            </Text>
          </div>

          {action && actionPlacement === "header" ? (
            <Button
              colorPalette={accent === "red" ? "red" : "teal"}
              disabled={actionDisabled}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          ) : null}
        </div>

        {description ? (
          <Text
            className={css({
              color: "fg.muted",
              maxW: "720px",
            })}
          >
            {description}
          </Text>
        ) : null}

        {children}

        {action && actionPlacement === "footer" ? (
          <Button
            alignSelf="start"
            colorPalette={accent === "red" ? "red" : "teal"}
            disabled={actionDisabled}
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        ) : null}
      </Card.Body>
    </Card.Root>
  );
}
