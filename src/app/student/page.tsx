"use client";

import { useState } from "react";
import { ListFilter } from "lucide-react";
import { AbsenceCard } from "@/components/student/absence-card";
import { useStudentPortal } from "@/components/student/student-portal-provider";
import { Button, Card, Text } from "@/components/ui";
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

export default function StudentDashboardPage() {
  const { absences, isHydrated } = useStudentPortal();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [subjectFilter, setSubjectFilter] = useState("all");

  const subjectOptions = [...new Set(absences.map((absence) => absence.subject))].sort(
    (left, right) => left.localeCompare(right, "ru"),
  );

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

  return (
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
              Сортируйте карточки по статусу, дате и новизне, чтобы быстро
              находить активные отработки.
            </Card.Description>
          </Card.Header>

          <Card.Body
            className={css({
              gap: "4",
            })}
          >
            <div
              className={css({
                alignItems: "center",
                bg: "teal.subtle.bg",
                borderRadius: "l2",
                color: "teal.plain.fg",
                display: "inline-flex",
                gap: "2.5",
                maxW: "fit-content",
                px: "3.5",
                py: "2",
              })}
            >
              <ListFilter
                aria-hidden="true"
                className={css({
                  h: "4.5",
                  w: "4.5",
                })}
              />
              Живые данные из базы
            </div>
            <Text color="fg.muted">
              Список строится по реальным данным студента и автоматически
              обновляется после заявок, ответов и проверки преподавателем.
            </Text>
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
          } as React.CSSProperties
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
            } as React.CSSProperties
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
      })}`}
      style={
        {
          "--reveal-delay": `${delay}ms`,
        } as React.CSSProperties
      }
    >
      <Card.Body
        className={css({
          gap: "2",
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
