"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { AlertCircle, Download } from "lucide-react";
import { AbsenceCard } from "@/components/student/absence-card";
import { useStudentPortal } from "@/components/student/student-portal-provider";
import { Button, Card, Dialog, Field, Text } from "@/components/ui";
import {
  activeAbsencesCount,
  countByStatus,
  sortOptions,
  statusFilters,
  statusOrder,
  type SortMode,
  type StatusFilter,
} from "@/lib/student-portal";
import { css } from "styled-system/css";

const overviewCardMinHeight = "13.75rem";
const emptyWorksheetMessage =
  "У вас еще нет никаких выполненных отработок по предметам.";

export default function StudentDashboardPage() {
  const { absences, isHydrated } = useStudentPortal();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [isWorksheetDialogOpen, setIsWorksheetDialogOpen] = useState(false);
  const [isWorksheetInfoOpen, setIsWorksheetInfoOpen] = useState(false);
  const [worksheetSubjectId, setWorksheetSubjectId] = useState("");

  const subjectOptions = [...new Set(absences.map((absence) => absence.subject))].sort(
    (left, right) => left.localeCompare(right, "ru"),
  );

  const worksheetSubjectOptions = useMemo(() => {
    const uniqueSubjects = new Map<string, { value: string; label: string }>();

    for (const absence of absences) {
      if (absence.status !== "completed" || absence.grade === undefined) {
        continue;
      }

      if (!uniqueSubjects.has(absence.subjectId)) {
        uniqueSubjects.set(absence.subjectId, {
          value: absence.subjectId,
          label: absence.subject,
        });
      }
    }

    return [...uniqueSubjects.values()].sort((left, right) =>
      left.label.localeCompare(right.label, "ru"),
    );
  }, [absences]);

  const filteredAbsences = [...absences]
    .filter((absence) =>
      statusFilter === "all" ? true : absence.status === statusFilter,
    )
    .filter((absence) =>
      subjectFilter === "all" ? true : absence.subject === subjectFilter,
    )
    .sort((left, right) => {
      if (sortMode === "oldest") {
        return (
          new Date(left.updatedAt).getTime() - new Date(right.updatedAt).getTime()
        );
      }

      if (sortMode === "date") {
        return new Date(right.date).getTime() - new Date(left.date).getTime();
      }

      if (sortMode === "status") {
        return statusOrder[left.status] - statusOrder[right.status];
      }

      if (sortMode === "subject") {
        return left.subject.localeCompare(right.subject, "ru");
      }

      return (
        new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
      );
    });

  const openEmptyWorksheetInfo = () => {
    setIsWorksheetDialogOpen(false);
    setIsWorksheetInfoOpen(true);
  };

  const handleOpenWorksheetDialog = () => {
    if (!worksheetSubjectOptions.length) {
      openEmptyWorksheetInfo();
      return;
    }

    if (
      !worksheetSubjectId ||
      !worksheetSubjectOptions.some((option) => option.value === worksheetSubjectId)
    ) {
      setWorksheetSubjectId(worksheetSubjectOptions[0].value);
    }

    setIsWorksheetDialogOpen(true);
  };

  const handleDownloadWorksheet = () => {
    const subjectId = worksheetSubjectId || worksheetSubjectOptions[0]?.value;

    if (!subjectId) {
      openEmptyWorksheetInfo();
      return;
    }

    const url = new URL("/api/student/worksheet", window.location.origin);
    url.searchParams.set("subjectId", subjectId);
    window.open(url.toString(), "_blank", "noopener,noreferrer");
    setIsWorksheetDialogOpen(false);
  };

  return (
    <>
      <div
        className={css({
          display: "grid",
          gap: "6",
        })}
      >
        <section
          className={css({
            display: "grid",
            gap: "4",
            gridTemplateColumns: {
              base: "1fr",
              lg: "minmax(0, 1.25fr) repeat(3, minmax(0, 0.58fr))",
            },
          })}
        >
          <Card.Root
            variant="outline"
            className={`reveal ${css({
              backdropFilter: "blur(18px)",
              borderColor: "border",
              boxShadow: "sm",
              display: "flex",
              flexDirection: "column",
              h: "full",
              minH: overviewCardMinHeight,
            })}`}
          >
            <Card.Header>
              <Card.Title
                className={css({
                  fontFamily: "var(--font-space-grotesk)",
                  fontSize: "2xl",
                })}
              >
                Панель контроля пропусков
              </Card.Title>
              <Card.Description>
                Личный кабинет для контроля пропусков, дедлайнов на отработку и
                результатов проверки преподавателем.
              </Card.Description>
            </Card.Header>

            <Card.Body
              className={css({
                display: "flex",
                flex: "1",
                justifyContent: "flex-end",
              })}
            >
              <Button colorPalette="teal" onClick={handleOpenWorksheetDialog}>
                <Download />
                Получить отработочный лист
              </Button>
            </Card.Body>
          </Card.Root>

          <StatCard
            delay={80}
            label="Всего пропусков"
            value={String(absences.length)}
            tone="gray"
          />
          <StatCard
            delay={160}
            label="Активные"
            value={String(activeAbsencesCount(absences))}
            tone="amber"
          />
          <StatCard
            delay={240}
            label="Отработаны"
            value={String(countByStatus(absences, "completed"))}
            tone="green"
          />
        </section>

        <section
          className={`reveal ${css({
            backdropFilter: "blur(18px)",
            bg: "gray.surface.bg",
            border: "1px solid",
            borderColor: "border",
            borderRadius: "l3",
            boxShadow: "sm",
            display: "grid",
            gap: "5",
            p: { base: "4", md: "5" },
          })}`}
          style={
            {
              "--reveal-delay": "120ms",
            } as CSSProperties
          }
        >
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
              Фильтр по статусу
            </Text>
            <div
              className={css({
                display: "flex",
                flexWrap: "wrap",
                gap: "2",
              })}
            >
              {statusFilters.map((filter) => (
                <Button
                  key={filter.value}
                  colorPalette={statusFilter === filter.value ? "teal" : "gray"}
                  onClick={() => setStatusFilter(filter.value)}
                  size="sm"
                  variant={statusFilter === filter.value ? "solid" : "surface"}
                >
                  {filter.label}
                </Button>
              ))}
            </div>
          </div>

          <div
            className={css({
              display: "grid",
              gap: "4",
              gridTemplateColumns: {
                base: "1fr",
                md: "repeat(2, minmax(0, 280px))",
              },
            })}
          >
            <div
              className={css({
                display: "grid",
                gap: "2",
                maxW: "280px",
              })}
            >
              <Text
                className={css({
                  fontWeight: "semibold",
                })}
              >
                Предмет
              </Text>
              <select
                value={subjectFilter}
                onChange={(event) => setSubjectFilter(event.target.value)}
                className={css({
                  appearance: "none",
                  bg: "gray.subtle.bg",
                  border: "1px solid",
                  borderColor: "border",
                  borderRadius: "l2",
                  color: "fg.default",
                  h: "11",
                  px: "3.5",
                })}
              >
                <option value="all">Все предметы</option>
                {subjectOptions.map((subject) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
            </div>

            <div
              className={css({
                display: "grid",
                gap: "2",
                maxW: "280px",
              })}
            >
              <Text
                className={css({
                  fontWeight: "semibold",
                })}
              >
                Сортировка
              </Text>
              <select
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value as SortMode)}
                className={css({
                  appearance: "none",
                  bg: "gray.subtle.bg",
                  border: "1px solid",
                  borderColor: "border",
                  borderRadius: "l2",
                  color: "fg.default",
                  h: "11",
                  px: "3.5",
                })}
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {!isHydrated ? (
          <Card.Root
            variant="outline"
            className={css({
              borderColor: "border",
            })}
          >
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
                Загрузка пропусков
              </Text>
              <Text color="fg.muted">
                Обновляем данные студента и подготавливаем список отработок.
              </Text>
            </Card.Body>
          </Card.Root>
        ) : filteredAbsences.length ? (
          <section
            className={css({
              display: "grid",
              gap: "4",
              gridTemplateColumns: {
                base: "1fr",
                lg: "repeat(2, minmax(0, 1fr))",
              },
            })}
          >
            {filteredAbsences.map((absence, index) => (
              <AbsenceCard key={absence.id} absence={absence} index={index} />
            ))}
          </section>
        ) : (
          <Card.Root
            variant="outline"
            className={`reveal ${css({
              borderColor: "border",
            })}`}
            style={
              {
                "--reveal-delay": "180ms",
              } as CSSProperties
            }
          >
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
                Ничего не найдено
              </Text>
              <Text color="fg.muted">
                Попробуйте сменить фильтр или выбрать другой режим сортировки.
              </Text>
            </Card.Body>
          </Card.Root>
        )}
      </div>

      <Dialog.Root
        open={isWorksheetDialogOpen}
        onOpenChange={(details) => setIsWorksheetDialogOpen(details.open)}
      >
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
                maxW: "460px",
              })}
            >
              <Dialog.Header>
                <Dialog.Title>Получить отработочный лист</Dialog.Title>
                <Dialog.Description>
                  Выберите предмет, по которому уже есть оцененная отработка.
                </Dialog.Description>
              </Dialog.Header>

              <Dialog.Body
                className={css({
                  gap: "4",
                })}
              >
                <Field.Root>
                  <Field.Label>Предмет</Field.Label>
                  <select
                    value={worksheetSubjectId || worksheetSubjectOptions[0]?.value || ""}
                    onChange={(event) => setWorksheetSubjectId(event.target.value)}
                    className={css({
                      appearance: "none",
                      bg: "gray.subtle.bg",
                      border: "1px solid",
                      borderColor: "border",
                      borderRadius: "l2",
                      color: "fg.default",
                      h: "11",
                      px: "3.5",
                      width: "full",
                    })}
                  >
                    {worksheetSubjectOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field.Root>
              </Dialog.Body>

              <Dialog.Footer>
                <Dialog.ActionTrigger asChild>
                  <Button colorPalette="gray" variant="surface">
                    Отмена
                  </Button>
                </Dialog.ActionTrigger>
                <Button colorPalette="teal" onClick={handleDownloadWorksheet}>
                  Получить
                </Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root
        open={isWorksheetInfoOpen}
        onOpenChange={(details) => setIsWorksheetInfoOpen(details.open)}
      >
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
                borderColor: "amber.surface.border",
                maxW: "460px",
              })}
            >
              <Dialog.Header>
                <Dialog.Title>Отработочный лист пока недоступен</Dialog.Title>
                <Dialog.Description>
                  Лист можно скачать только после того, как преподаватель проверит
                  хотя бы одну вашу отработку и выставит оценку.
                </Dialog.Description>
              </Dialog.Header>

              <Dialog.Body
                className={css({
                  gap: "4",
                })}
              >
                <div
                  className={css({
                    alignItems: "flex-start",
                    bg: "amber.subtle.bg",
                    border: "1px solid",
                    borderColor: "amber.surface.border",
                    borderRadius: "l2",
                    color: "amber.plain.fg",
                    display: "flex",
                    gap: "3",
                    p: "4",
                  })}
                >
                  <AlertCircle
                    className={css({
                      flexShrink: "0",
                      h: "5",
                      mt: "0.5",
                      w: "5",
                    })}
                  />
                  <Text>{emptyWorksheetMessage}</Text>
                </div>
              </Dialog.Body>

              <Dialog.Footer>
                <Dialog.ActionTrigger asChild>
                  <Button colorPalette="amber" variant="solid">
                    Понятно
                  </Button>
                </Dialog.ActionTrigger>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

function StatCard({
  label,
  value,
  tone,
  delay,
}: {
  label: string;
  value: string;
  tone: "gray" | "amber" | "green";
  delay: number;
}) {
  return (
    <Card.Root
      variant="outline"
      className={`reveal ${css({
        borderColor: "border",
        h: "full",
        minH: overviewCardMinHeight,
      })}`}
      style={
        {
          "--reveal-delay": `${delay}ms`,
        } as CSSProperties
      }
    >
      <Card.Body
        className={css({
          gap: "2",
          h: "full",
          justifyContent: "center",
          py: "6",
        })}
      >
        <Text
          className={css({
            color: "fg.muted",
          })}
        >
          {label}
        </Text>
        <Text
          className={css({
            color: `${tone}.plain.fg`,
            fontFamily: "var(--font-space-grotesk)",
            fontSize: "5xl",
            fontWeight: "700",
            lineHeight: "1",
          })}
        >
          {value}
        </Text>
      </Card.Body>
    </Card.Root>
  );
}
