"use client";

import { Download } from "lucide-react";
import { useMemo, useState } from "react";
import { TeacherStatusBadge } from "@/components/teacher/teacher-status-badge";
import { useDepartmentHeadPortal } from "@/components/department-head/department-head-portal-provider";
import { Button, Card, Text } from "@/components/ui";
import {
  departmentHeadSortOptions,
  type DepartmentHeadSortMode,
} from "@/lib/department-head-portal";
import { css } from "styled-system/css";

export function DepartmentHeadStudentsPage() {
  const { studentStatuses, students } = useDepartmentHeadPortal();
  const [studentFilter, setStudentFilter] = useState("all");
  const [sortMode, setSortMode] = useState<DepartmentHeadSortMode>("newest");

  const filteredRows = useMemo(() => {
    return [...studentStatuses]
      .filter((row) => (studentFilter === "all" ? true : row.studentId === studentFilter))
      .sort((left, right) => {
        if (sortMode === "student") {
          return left.studentFullName.localeCompare(right.studentFullName, "ru");
        }

        if (sortMode === "date") {
          return new Date(right.date).getTime() - new Date(left.date).getTime();
        }

        return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
      });
  }, [sortMode, studentFilter, studentStatuses]);

  const handleDownloadWorksheet = () => {
    const url = new URL("/api/teacher/head/worksheet", window.location.origin);
    url.searchParams.set("studentId", studentFilter);
    url.searchParams.set("sortMode", sortMode);
    window.open(url.toString(), "_blank", "noopener,noreferrer");
  };

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
            xl: "minmax(0, 1.1fr) minmax(320px, 0.9fr)",
          },
        })}
      >
        <Card.Root variant="outline">
          <Card.Header>
            <Card.Title
              className={css({
                fontFamily: "var(--font-space-grotesk)",
                fontSize: "2xl",
              })}
            >
              Срез по отработкам
            </Card.Title>
            <Card.Description>
              Общий список пропусков студентов с текущими статусами отработки, датами
              и быстрым экспортом в PDF по шаблону.
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
                gap: "4",
                gridTemplateColumns: {
                  base: "1fr",
                  md: "repeat(2, minmax(0, 1fr))",
                },
              })}
            >
              <FilterSelect
                label="Студент"
                value={studentFilter}
                onChange={setStudentFilter}
                options={students.map((student) => ({
                  value: student.id,
                  label: `${student.fullName} (${student.group})`,
                }))}
              />
              <FilterSelect
                label="Сортировка"
                value={sortMode}
                onChange={(value) => setSortMode(value as DepartmentHeadSortMode)}
                includeAll={false}
                options={departmentHeadSortOptions}
              />
            </div>

            <div
              className={css({
                alignItems: "center",
                bg: "gray.subtle.bg",
                borderRadius: "l2",
                display: "flex",
                flexDirection: { base: "column", md: "row" },
                gap: "4",
                justifyContent: "space-between",
                p: "4",
              })}
            >
              <div
                className={css({
                  display: "grid",
                  gap: "1",
                })}
              >
                <Text
                  className={css({
                    fontWeight: "semibold",
                  })}
                >
                  Отработочный лист
                </Text>
                <Text color="fg.muted">
                  Файл PDF строится на основе шаблона из папки `public/template`
                  и включает текущую выборку по студентам.
                </Text>
              </div>

              <Button
                colorPalette="teal"
                disabled={!filteredRows.length}
                onClick={handleDownloadWorksheet}
              >
                <Download />
                Получить отработочный лист
              </Button>
            </div>
          </Card.Body>
        </Card.Root>

        <Card.Root variant="outline">
          <Card.Header>
            <Card.Title
              className={css({
                fontFamily: "var(--font-space-grotesk)",
                fontSize: "2xl",
              })}
            >
              Быстрая сводка
            </Card.Title>
          </Card.Header>
          <Card.Body
            className={css({
              gap: "4",
            })}
          >
            <SummaryStat label="Всего записей" value={String(studentStatuses.length)} />
            <SummaryStat label="В текущей выборке" value={String(filteredRows.length)} />
            <SummaryStat
              label="Оценено"
              value={String(filteredRows.filter((row) => row.status === "graded").length)}
            />
            <SummaryStat
              label="На активной отработке"
              value={String(
                filteredRows.filter(
                  (row) =>
                    row.status !== "graded" &&
                    row.status !== "expired" &&
                    row.status !== "nb_marked",
                ).length,
              )}
            />
          </Card.Body>
        </Card.Root>
      </section>

      {filteredRows.length ? (
        <div
          className={css({
            border: "1px solid",
            borderColor: "border",
            borderRadius: "l3",
            overflow: "auto",
          })}
        >
          <table
            className={css({
              borderCollapse: "collapse",
              minW: "full",
            })}
          >
            <thead>
              <tr>
                {[
                  "Студент",
                  "Группа",
                  "Предмет",
                  "Дата",
                  "Статус",
                  "Преподаватель",
                  "Оценка",
                  "Пара",
                ].map((column) => (
                  <th
                    key={column}
                    className={css({
                      bg: "gray.subtle.bg",
                      borderBottom: "1px solid",
                      borderColor: "border",
                      px: "3.5",
                      py: "3",
                      textAlign: "left",
                      textStyle: "sm",
                      whiteSpace: "nowrap",
                    })}
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, index) => (
                <tr key={row.absenceId}>
                  <td className={tableCellStyle(index, filteredRows.length)}>
                    <div
                      className={css({
                        display: "grid",
                        gap: "0.5",
                      })}
                    >
                      <Text>{row.studentFullName}</Text>
                      <Text color="fg.muted">{row.classroom}</Text>
                    </div>
                  </td>
                  <td className={tableCellStyle(index, filteredRows.length)}>
                    {row.studentGroup}
                  </td>
                  <td className={tableCellStyle(index, filteredRows.length)}>
                    {row.subject}
                  </td>
                  <td className={tableCellStyle(index, filteredRows.length)}>
                    {new Date(row.date).toLocaleDateString("ru-RU")}
                  </td>
                  <td className={tableCellStyle(index, filteredRows.length)}>
                    <TeacherStatusBadge status={row.status} />
                  </td>
                  <td className={tableCellStyle(index, filteredRows.length)}>
                    {row.teacherName}
                  </td>
                  <td className={tableCellStyle(index, filteredRows.length)}>
                    {row.grade ?? "—"}
                  </td>
                  <td className={tableCellStyle(index, filteredRows.length)}>
                    {row.lessonLabel}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Card.Root variant="outline">
          <Card.Body
            className={css({
              py: "8",
            })}
          >
            <Text color="fg.muted">
              По текущим фильтрам данных нет. Измените студента или порядок
              сортировки.
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

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div
      className={css({
        bg: "gray.subtle.bg",
        borderRadius: "l2",
        display: "grid",
        gap: "1.5",
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
          fontFamily: "var(--font-space-grotesk)",
          fontSize: "2xl",
          fontWeight: "700",
          lineHeight: "1",
        })}
      >
        {value}
      </Text>
    </div>
  );
}

function tableCellStyle(index: number, total: number) {
  return css({
    borderBottom: index === total - 1 ? "none" : "1px solid",
    borderColor: "border",
    px: "3.5",
    py: "3",
    verticalAlign: "top",
  });
}
