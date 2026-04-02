"use client";

import { useState, type ReactNode } from "react";
import { School, UsersRound } from "lucide-react";
import { TeacherAbsenceCard } from "@/components/teacher/teacher-absence-card";
import { useTeacherPortal } from "@/components/teacher/teacher-portal-provider";
import { Button, Card, Text } from "@/components/ui";
import {
  activeTeacherAbsencesCount,
  countTeacherAbsencesByStatus,
  teacherSortOptions,
  teacherStatusFilters,
  teacherStatusOrder,
  type TeacherSortMode,
  type TeacherStatusFilter,
} from "@/lib/teacher-portal";
import { css } from "styled-system/css";

export default function TeacherDashboardPage() {
  const { absences, teacher, groups, students, isHydrated } = useTeacherPortal();
  const [statusFilter, setStatusFilter] = useState<TeacherStatusFilter>("all");
  const [sortMode, setSortMode] = useState<TeacherSortMode>("newest");
  const [groupFilter, setGroupFilter] = useState("all");
  const [studentFilter, setStudentFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");

  const groupOptions = groups
    .map((group) => group.name)
    .sort((left, right) => left.localeCompare(right, "ru"));
  const studentOptions = students
    .map((student) => ({
      id: student.id,
      fullName: student.fullName,
    }))
    .sort((left, right) => left.fullName.localeCompare(right.fullName, "ru"));
  const subjectOptions = [...teacher.subjects].sort((left, right) =>
    left.localeCompare(right, "ru"),
  );

  const filteredAbsences = [...absences]
    .filter((absence) =>
      statusFilter === "all" ? true : absence.status === statusFilter,
    )
    .filter((absence) =>
      groupFilter === "all" ? true : absence.studentGroup === groupFilter,
    )
    .filter((absence) =>
      studentFilter === "all" ? true : absence.studentId === studentFilter,
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
        return teacherStatusOrder[left.status] - teacherStatusOrder[right.status];
      }

      if (sortMode === "student") {
        return left.studentFullName.localeCompare(right.studentFullName, "ru");
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
              Панель преподавателя
            </Card.Title>
            <Card.Description>
              Здесь собраны все пропуски студентов по вашим предметам с быстрым
              доступом к заданиям, ответам и оцениванию.
            </Card.Description>
          </Card.Header>

          <Card.Body
            className={css({
              gap: "4",
            })}
          >
            <div
              className={css({
                display: "flex",
                flexWrap: "wrap",
                gap: "3",
              })}
            >
              <InfoPill
                icon={<School className={css({ h: "4.5", w: "4.5" })} />}
                text={`Группы: ${teacher.groups.join(", ")}`}
              />
              <InfoPill
                icon={<UsersRound className={css({ h: "4.5", w: "4.5" })} />}
                text={`Предметы: ${teacher.subjects.join(", ")}`}
              />
            </div>
            <Text color="fg.muted">
              Можно фильтровать список по группам, студентам, предметам и
              статусам, чтобы быстро переходить к нужной отработке.
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
          value={String(activeTeacherAbsencesCount(absences))}
          tone="amber"
        />
        <StatCard
          delay={240}
          label="Оценено"
          value={String(countTeacherAbsencesByStatus(absences, "graded"))}
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
            {teacherStatusFilters.map((filter) => (
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
              md: "repeat(4, minmax(0, 1fr))",
            },
          })}
        >
          <FilterSelect
            label="Группа"
            value={groupFilter}
            onChange={setGroupFilter}
            options={groupOptions.map((group) => ({
              value: group,
              label: group,
            }))}
          />
          <FilterSelect
            label="Студент"
            value={studentFilter}
            onChange={setStudentFilter}
            options={studentOptions.map((student) => ({
              value: student.id,
              label: student.fullName,
            }))}
          />
          <FilterSelect
            label="Предмет"
            value={subjectFilter}
            onChange={setSubjectFilter}
            options={subjectOptions.map((subject) => ({
              value: subject,
              label: subject,
            }))}
          />
          <FilterSelect
            label="Сортировка"
            value={sortMode}
            onChange={(value) => setSortMode(value as TeacherSortMode)}
            includeAll={false}
            options={teacherSortOptions}
          />
        </div>
      </section>

      {!isHydrated ? (
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
              Загрузка списка пропусков
            </Text>
            <Text color="fg.muted">
              Обновляем данные преподавателя и подготавливаем карточки
              студентов.
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
            <TeacherAbsenceCard key={absence.id} absence={absence} index={index} />
          ))}
        </section>
      ) : (
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
              Ничего не найдено
            </Text>
            <Text color="fg.muted">
              Попробуйте изменить фильтры по группе, студенту или предмету.
            </Text>
          </Card.Body>
        </Card.Root>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  includeAll = true,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  includeAll?: boolean;
}) {
  return (
    <div
      className={css({
        display: "grid",
        gap: "2",
      })}
    >
      <Text
        className={css({
          fontWeight: "semibold",
        })}
      >
        {label}
      </Text>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
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
        {includeAll ? <option value="all">Все</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function InfoPill({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div
      className={css({
        alignItems: "center",
        bg: "teal.subtle.bg",
        borderRadius: "l2",
        color: "teal.plain.fg",
        display: "inline-flex",
        gap: "2.5",
        px: "3.5",
        py: "2",
      })}
    >
      {icon}
      {text}
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
