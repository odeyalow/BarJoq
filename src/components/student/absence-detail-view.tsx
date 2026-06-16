"use client";

import {
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  ArrowLeft,
  ClipboardCheck,
  Clock3,
  FilePenLine,
  FileUp,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { AttachmentList } from "@/components/student/attachment-list";
import { DeadlineAlert } from "@/components/student/deadline-alert";
import { StatusBadge } from "@/components/student/status-badge";
import { useStudentPortal } from "@/components/student/student-portal-provider";
import { Button, Card, Text } from "@/components/ui";
import { acceptedExcuseFileInput } from "@/lib/excuse-file";
import {
  formatPortalDate,
  formatPortalDateTime,
  statusMeta,
} from "@/lib/student-portal";
import { css } from "styled-system/css";

const blackActionClass = css({
  bg: "#111111",
  borderColor: "#111111",
  color: "white",
  _hover: {
    bg: "#222222",
    borderColor: "#222222",
  },
  _disabled: {
    bg: "#2f2f2f",
    borderColor: "#2f2f2f",
    color: "rgba(255,255,255,0.72)",
  },
});

export function AbsenceDetailView({ absenceId }: { absenceId: string }) {
  const router = useRouter();
  const {
    absences,
    deleteResponse,
    isHydrated,
    requestAssignment,
    requestReworkAccess,
    student,
    uploadExcuseFile,
  } = useStudentPortal();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploadingExcuse, setIsUploadingExcuse] = useState(false);

  const absence = absences.find((item) => item.id === absenceId);

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
            Загрузка карточки пропуска
          </Text>
          <Text color="fg.muted">
            Подтягиваем актуальные данные по статусу, заданию и ответу.
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
          onClick: () => router.push("/student"),
        }}
        description="Проверьте ссылку или выберите пропуск из списка на главной странице."
        title="Пропуск не найден"
      />
    );
  }

  const showAssignment =
    Boolean(absence.assignment) &&
    absence.status !== "expired" &&
    absence.status !== "nb_marked";
  const showResponse = Boolean(absence.response);
  const excuseAttachment = absence.excuseAttachment;
  const hasReworkRequest = Boolean(absence.reworkAccessRequestedAt);
  const canRequestReworkAccess =
    absence.status === "expired" && Boolean(absence.assignment);

  const handleExcuseUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0];

    if (!nextFile) {
      return;
    }

    setIsUploadingExcuse(true);

    try {
      await uploadExcuseFile(absence.id, nextFile);
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Не удалось загрузить файл уважительной причины.",
      );
    } finally {
      event.target.value = "";
      setIsUploadingExcuse(false);
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
          overflow: "hidden",
          p: { base: "5", md: "6" },
        })}`}
      >
        <div className={css({ display: "grid", gap: "4" })}>
          <div className={css({ display: "flex", justifyContent: "flex-start" })}>
            <Button
              colorPalette="gray"
              onClick={() => router.push("/student")}
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
            <div className={css({ display: "grid", gap: "2" })}>
              <h2
                className={css({
                  fontFamily: "var(--font-space-grotesk)",
                  fontSize: { base: "2xl", md: "4xl" },
                  fontWeight: "700",
                  lineHeight: "1.05",
                })}
              >
                {absence.subject}
              </h2>
              <Text className={css({ color: "fg.muted", maxW: "760px" })}>
                {statusMeta[absence.status].description}
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
              <StatusBadge status={absence.status} />

              {typeof absence.grade === "number" ? (
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
                  <Text className={css({ textStyle: "xs" })}>Балл</Text>
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
            <InfoTile label="Дата пропуска" value={formatPortalDate(absence.date)} />
            <InfoTile
              label="Преподаватель"
              value={`${absence.teacherName}, ${absence.teacherRole}`}
            />
            <InfoTile label="Аудитория" value={absence.classroom} />
            <InfoTile
              label="Последнее обновление"
              value={formatPortalDateTime(absence.updatedAt)}
            />
          </div>

          <DeadlineAlert absence={absence} />
        </div>
      </section>

      {absence.status === "missed" ? (
        <StatePanel
          action={{
            label: "Получить задание",
            onClick: () => {
              void requestAssignment(absence.id).catch((error) => {
                window.alert(
                  error instanceof Error
                    ? error.message
                    : "Не удалось отправить заявку.",
                );
              });
            },
          }}
          actionDisabled={!excuseAttachment}
          actionPlacement="header"
          icon={<ClipboardCheck />}
          title="Пропуск еще не отработан"
        >
          <input
            ref={fileInputRef}
            accept={acceptedExcuseFileInput}
            className={css({ display: "none" })}
            onChange={(event) => {
              void handleExcuseUpload(event);
            }}
            type="file"
          />

          <div className={css({ display: "grid", gap: "4" })}>
            <Text
              className={css({
                color: "fg.muted",
                lineHeight: "1.7",
                maxW: "760px",
              })}
            >
              Для подачи заявки сначала загрузите файл уважительной причины или
              справку. Поддерживаются PDF, DOCX и изображения.
            </Text>

            <Button
              alignSelf="start"
              colorPalette="gray"
              disabled={isUploadingExcuse}
              onClick={() => fileInputRef.current?.click()}
              variant="surface"
            >
              <FileUp />
              {excuseAttachment
                ? "Заменить файл уважительной причины"
                : "Загрузить файл уважительной причины или справки"}
            </Button>

            {excuseAttachment ? (
              <AttachmentList attachments={[excuseAttachment]} />
            ) : (
              <div
                className={css({
                  bg: "amber.subtle.bg",
                  border: "1px solid",
                  borderColor: "amber.7",
                  borderRadius: "l2",
                  color: "amber.plain.fg",
                  p: "3.5",
                })}
              >
                <Text className={css({ fontWeight: "medium" })}>
                  Файл еще не загружен
                </Text>
                <Text className={css({ mt: "1" })}>
                  Пока нет подтверждающего файла, отправить заявку на
                  отработку нельзя.
                </Text>
              </div>
            )}
          </div>
        </StatePanel>
      ) : null}

      {absence.status === "request_sent" ? (
        <StatePanel
          description="Преподаватель уже получил вашу заявку. После проверки справки и подготовки задания статус изменится."
          icon={<Clock3 />}
          title="Заявка на задание отправлена"
        >
          <div
            className={css({
              display: "grid",
              gap: "3",
              gridTemplateColumns: {
                base: "1fr",
                md: "repeat(3, minmax(0, 1fr))",
              },
            })}
          >
            <InfoTile label="Студент" value={student.fullName} />
            <InfoTile label="Группа" value={student.group} />
            <InfoTile
              label="Дата заявки"
              value={formatPortalDateTime(absence.requestedAt ?? absence.updatedAt)}
            />
          </div>
        </StatePanel>
      ) : null}

      {absence.status === "awaiting_head" ? (
        <StatePanel
          accent="amber"
          icon={<Clock3 />}
          title="Справка одобрена — ожидайте задание"
        >
          <Text
            className={css({
              color: "fg.muted",
              fontSize: "sm",
              lineHeight: "1.7",
              maxW: "760px",
            })}
          >
            Заведующий отделением проверил вашу справку и одобрил заявку.
            Ожидайте задание от преподавателя — оно появится в этой карточке.
          </Text>

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
            <InfoTile
              label="Заявка отправлена"
              value={formatPortalDateTime(absence.requestedAt ?? absence.updatedAt)}
            />
            <InfoTile
              label="Одобрено заведующим"
              value={formatPortalDateTime(
                absence.departmentHeadApprovedAt ?? absence.updatedAt,
              )}
            />
          </div>
        </StatePanel>
      ) : null}

      {absence.status === "nb_marked" ? (
        <StatePanel accent="red" icon={<ShieldAlert />} title="Вам поставлено Н/Б">
          <Text
            className={css({
              color: "fg.muted",
              fontSize: "sm",
              lineHeight: "1.7",
              maxW: "760px",
            })}
          >
            Преподаватель закрыл этот пропуск отметкой н/б. Заявка на
            отработку по нему недоступна.
          </Text>

          {absence.markedNbAt ? (
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
              <InfoTile
                label="Н/Б зафиксировано"
                value={formatPortalDateTime(absence.markedNbAt)}
              />
            </div>
          ) : null}
        </StatePanel>
      ) : null}

      {excuseAttachment && absence.status !== "missed" ? (
        <Card.Root variant="outline">
          <Card.Header>
            <Card.Title>Файл уважительной причины</Card.Title>
            <Card.Description>
              Документ или фото, которое было приложено к заявке на отработку.
            </Card.Description>
          </Card.Header>
          <Card.Body>
            <AttachmentList attachments={[excuseAttachment]} />
          </Card.Body>
        </Card.Root>
      ) : null}

      {absence.status === "expired" ? (
        <StatePanel
          action={
            canRequestReworkAccess
              ? {
                  label: hasReworkRequest
                    ? "Запрос уже отправлен"
                    : "Запросить доступ на отработку",
                  onClick: () => {
                    void requestReworkAccess(absence.id).catch(() => undefined);
                  },
                }
              : undefined
          }
          actionClassName={canRequestReworkAccess ? blackActionClass : undefined}
          actionDisabled={canRequestReworkAccess ? hasReworkRequest : false}
          actionPlacement="header"
          accent="red"
          icon={<ShieldAlert />}
          title="Время на отработку истекло"
        >
          <Text
            className={css({
              color: "fg.muted",
              fontSize: "sm",
              lineHeight: "1.7",
              maxW: "760px",
            })}
          >
            {canRequestReworkAccess
              ? "Вы запрашиваете доступ на отработку у вашего зав. отделения. После одобрения больше возможности на отработку у вас не будет."
              : "Срок на получение задания истек до конца месяца. Повторная отработка для этого пропуска недоступна."}
          </Text>

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

            {canRequestReworkAccess && hasReworkRequest ? (
              <InfoTile
                label="Запрос отправлен"
                value={formatPortalDateTime(absence.reworkAccessRequestedAt!)}
              />
            ) : null}
          </div>
        </StatePanel>
      ) : null}

      {absence.status === "completed" && absence.completedAt ? (
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
            <Card.Title>Итог отработки</Card.Title>
            <Card.Description>
              Преподаватель завершил проверку и закрыл пропуск.
            </Card.Description>
          </Card.Header>

          <Card.Body className={css({ gap: "4" })}>
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
              <InfoTile label="Балл" value={`${absence.grade ?? 0} / 100`} />
              <InfoTile
                label="Дата отработки"
                value={formatPortalDateTime(absence.completedAt)}
              />
            </div>
          </Card.Body>
        </Card.Root>
      ) : null}

      {showAssignment ? (
        <Card.Root
          variant="outline"
          className={`reveal ${css({ borderColor: "border" })}`}
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
            </Card.Description>
          </Card.Header>

          <Card.Body className={css({ gap: "4" })}>
            <Text
              className={css({
                lineHeight: "1.75",
                whiteSpace: "pre-line",
              })}
            >
              {absence.assignment!.text}
            </Text>

            <AttachmentList attachments={absence.assignment!.attachments} />

            {absence.status === "assignment_received" ? (
              <Button
                alignSelf="start"
                colorPalette="teal"
                onClick={() => router.push(`/student/absences/${absence.id}/reply`)}
              >
                <FilePenLine />
                Добавить ответ
              </Button>
            ) : null}
          </Card.Body>
        </Card.Root>
      ) : null}

      {showResponse ? (
        <Card.Root
          variant="outline"
          className={`reveal ${css({ borderColor: "border" })}`}
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

          <Card.Body className={css({ gap: "4" })}>
            <Text
              className={css({
                lineHeight: "1.75",
                whiteSpace: "pre-line",
              })}
            >
              {absence.response!.text}
            </Text>

            <AttachmentList attachments={absence.response!.attachments} />

            {absence.status === "under_review" ? (
              <div
                className={css({
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "3",
                })}
              >
                <Button
                  colorPalette="gray"
                  onClick={() => router.push(`/student/absences/${absence.id}/reply`)}
                  variant="surface"
                >
                  <FilePenLine />
                  Изменить
                </Button>
                <Button
                  colorPalette="red"
                  onClick={() => {
                    void deleteResponse(absence.id).catch(() => undefined);
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
      <Text className={css({ color: "fg.muted", textStyle: "xs" })}>{label}</Text>
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
  actionClassName,
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
  actionClassName?: string;
  actionDisabled?: boolean;
  actionPlacement?: "header" | "footer";
  accent?: "red" | "teal" | "amber";
  children?: ReactNode;
}) {
  const accentColor =
    accent === "red" ? "red.plain.fg" : accent === "amber" ? "amber.plain.fg" : "teal.plain.fg";
  const colorPalette = accent === "red" ? "red" : accent === "amber" ? "amber" : "teal";

  return (
    <Card.Root
      variant="outline"
      className={`reveal ${css({ borderColor: "border" })}`}
      style={
        {
          "--reveal-delay": "80ms",
        } as CSSProperties
      }
    >
      <Card.Body className={css({ gap: "5", py: "8" })}>
        <div
          className={css({
            alignItems: { base: "start", md: "center" },
            color: accentColor,
            display: "flex",
            flexDirection: { base: "column", md: "row" },
            gap: "3",
            justifyContent: "space-between",
          })}
        >
          <div className={css({ alignItems: "center", display: "inline-flex", gap: "3" })}>
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
              className={actionClassName}
              colorPalette={colorPalette}
              disabled={actionDisabled}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          ) : null}
        </div>

        {description ? (
          <Text className={css({ color: "fg.muted", maxW: "720px" })}>
            {description}
          </Text>
        ) : null}

        {children}

        {action && actionPlacement === "footer" ? (
          <Button
            alignSelf="start"
            className={actionClassName}
            colorPalette={colorPalette}
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
