"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  CheckCheck,
  ChevronDown,
  FileCheck2,
  ShieldCheck,
} from "lucide-react";
import { AttachmentList } from "@/components/student/attachment-list";
import { useDepartmentHeadPortal } from "@/components/department-head/department-head-portal-provider";
import { Button, Card, Text } from "@/components/ui";
import {
  departmentHeadApprovalSortOptions,
  type DepartmentHeadApprovalSortMode,
} from "@/lib/department-head-portal";
import { formatPortalDate, formatPortalDateTime } from "@/lib/student-portal";
import { css } from "styled-system/css";

export function DepartmentHeadApprovalsPage() {
  const {
    pendingApprovals,
    approveManyPendingApprovals,
    approvePendingApproval,
  } = useDepartmentHeadPortal();
  const [studentFilter, setStudentFilter] = useState("all");
  const [teacherFilter, setTeacherFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [sortMode, setSortMode] =
    useState<DepartmentHeadApprovalSortMode>("newest");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [isBulkApproving, setIsBulkApproving] = useState(false);
  const [error, setError] = useState("");

  const studentOptions = useMemo(
    () =>
      [
        ...new Map(
          pendingApprovals.map((item) => [
            item.studentId,
            {
              value: item.studentId,
              label: `${item.studentFullName} (${item.studentGroup})`,
            },
          ]),
        ).values(),
      ].sort((left, right) => left.label.localeCompare(right.label, "ru")),
    [pendingApprovals],
  );

  const teacherOptions = useMemo(
    () =>
      [...new Set(pendingApprovals.map((item) => item.teacherName))]
        .sort((left, right) => left.localeCompare(right, "ru"))
        .map((teacher) => ({
          value: teacher,
          label: teacher,
        })),
    [pendingApprovals],
  );

  const groupOptions = useMemo(
    () =>
      [...new Set(pendingApprovals.map((item) => item.studentGroup))]
        .sort((left, right) => left.localeCompare(right, "ru"))
        .map((group) => ({
          value: group,
          label: group,
        })),
    [pendingApprovals],
  );

  const filteredApprovals = useMemo(() => {
    return [...pendingApprovals]
      .filter((item) => (studentFilter === "all" ? true : item.studentId === studentFilter))
      .filter((item) => (teacherFilter === "all" ? true : item.teacherName === teacherFilter))
      .filter((item) => (groupFilter === "all" ? true : item.studentGroup === groupFilter))
      .sort((left, right) => {
        if (sortMode === "student") {
          return left.studentFullName.localeCompare(right.studentFullName, "ru");
        }

        if (sortMode === "teacher") {
          return left.teacherName.localeCompare(right.teacherName, "ru");
        }

        if (sortMode === "group") {
          return left.studentGroup.localeCompare(right.studentGroup, "ru");
        }

        if (sortMode === "date") {
          return new Date(right.date).getTime() - new Date(left.date).getTime();
        }

        return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
      });
  }, [groupFilter, pendingApprovals, sortMode, studentFilter, teacherFilter]);

  const handleApprove = async (absenceId: string) => {
    setError("");
    setApprovingId(absenceId);

    try {
      await approvePendingApproval(absenceId);
      if (expandedId === absenceId) {
        setExpandedId(null);
      }
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Не удалось подтвердить заявку на отработку.",
      );
    } finally {
      setApprovingId(null);
    }
  };

  const handleApproveAll = async () => {
    if (!filteredApprovals.length) {
      return;
    }

    setError("");
    setIsBulkApproving(true);

    try {
      await approveManyPendingApprovals(
        filteredApprovals.map((approval) => approval.absenceId),
      );
      setExpandedId(null);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Не удалось подтвердить все заявки.",
      );
    } finally {
      setIsBulkApproving(false);
    }
  };

  return (
    <div className={css({ display: "grid", gap: "6" })}>
      <section
        className={css({
          display: "grid",
          gap: "4",
          gridTemplateColumns: {
            base: "1fr",
            xl: "minmax(0, 1.15fr) minmax(320px, 0.85fr)",
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
              Очередь согласования
            </Card.Title>
            <Card.Description>
              Сначала отберите заявки по группе, преподавателю или студенту,
              затем подтверждайте по одной или сразу всю текущую выборку.
            </Card.Description>
          </Card.Header>
          <Card.Body className={css({ gap: "4" })}>
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
                options={studentOptions}
              />
              <FilterSelect
                label="Преподаватель"
                value={teacherFilter}
                onChange={setTeacherFilter}
                options={teacherOptions}
              />
              <FilterSelect
                label="Группа"
                value={groupFilter}
                onChange={setGroupFilter}
                options={groupOptions}
              />
              <FilterSelect
                includeAll={false}
                label="Сортировка"
                value={sortMode}
                onChange={(value) => setSortMode(value as DepartmentHeadApprovalSortMode)}
                options={departmentHeadApprovalSortOptions}
              />
            </div>

            {error ? (
              <div
                className={css({
                  bg: "red.subtle.bg",
                  borderRadius: "l2",
                  color: "red.plain.fg",
                  p: "3.5",
                })}
              >
                <Text>{error}</Text>
              </div>
            ) : null}
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
            <Card.Description>
              Компактный режим рассчитан на большой поток заявок в одной очереди.
            </Card.Description>
          </Card.Header>
          <Card.Body className={css({ gap: "4" })}>
            <SummaryStat label="Всего заявок" value={String(pendingApprovals.length)} />
            <SummaryStat label="В выборке" value={String(filteredApprovals.length)} />
            <SummaryStat
              label="Преподавателей"
              value={String(new Set(filteredApprovals.map((item) => item.teacherName)).size)}
            />
            <SummaryStat
              label="Групп"
              value={String(new Set(filteredApprovals.map((item) => item.studentGroup)).size)}
            />
            <Button
              colorPalette="teal"
              disabled={!filteredApprovals.length || Boolean(approvingId)}
              loading={isBulkApproving}
              onClick={() => {
                void handleApproveAll();
              }}
            >
              <CheckCheck />
              Подтвердить все в выборке
            </Button>
          </Card.Body>
        </Card.Root>
      </section>

      {filteredApprovals.length ? (
        <section className={css({ display: "grid", gap: "3" })}>
          {filteredApprovals.map((approval) => {
            const isExpanded = expandedId === approval.absenceId;

            return (
              <Card.Root key={approval.absenceId} variant="outline">
                <Card.Body className={css({ gap: "4", py: "4.5" })}>
                  <div
                    className={css({
                      alignItems: { base: "start", lg: "center" },
                      display: "flex",
                      flexDirection: { base: "column", lg: "row" },
                      gap: "3",
                      justifyContent: "space-between",
                    })}
                  >
                    <div className={css({ display: "grid", gap: "2", flex: "1", minW: "0" })}>
                      <div
                        className={css({
                          alignItems: "center",
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "2",
                        })}
                      >
                        <Text
                          className={css({
                            fontWeight: "700",
                            textStyle: "lg",
                          })}
                        >
                          {approval.studentFullName}
                        </Text>
                        <StatusPill>Ожидает подтверждения</StatusPill>
                      </div>

                      <Text
                        className={css({
                          color: "fg.muted",
                          lineHeight: "1.5",
                        })}
                      >
                        {approval.subject} • {approval.studentGroup} • {approval.teacherName} •{" "}
                        {formatPortalDate(approval.date)}
                      </Text>

                      <div
                        className={css({
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "2",
                        })}
                      >
                        <MetaPill label="Пара" value={approval.lessonLabel} />
                        <MetaPill
                          label="Заявка"
                          value={
                            approval.requestedAt
                              ? formatPortalDateTime(approval.requestedAt)
                              : "Не указано"
                          }
                        />
                        <MetaPill
                          label="Справка"
                          value={approval.excuseAttachment ? "Приложена" : "Нет файла"}
                        />
                      </div>
                    </div>

                    <div
                      className={css({
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "2",
                        justifyContent: { base: "stretch", lg: "flex-end" },
                        w: { base: "full", lg: "auto" },
                      })}
                    >
                      <Button
                        colorPalette="gray"
                        onClick={() =>
                          setExpandedId(isExpanded ? null : approval.absenceId)
                        }
                        variant="surface"
                      >
                        <ChevronDown
                          className={css({
                            transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                            transitionDuration: "normal",
                            transitionProperty: "transform",
                          })}
                        />
                        {isExpanded ? "Скрыть" : "Подробнее"}
                      </Button>

                      <Button
                        colorPalette="teal"
                        loading={approvingId === approval.absenceId}
                        onClick={() => {
                          void handleApprove(approval.absenceId);
                        }}
                      >
                        <CheckCheck />
                        Подтвердить
                      </Button>
                    </div>
                  </div>

                  {isExpanded ? (
                    <div
                      className={css({
                        borderTop: "1px solid",
                        borderColor: "border",
                        display: "grid",
                        gap: "4",
                        pt: "4",
                      })}
                    >
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
                        <InfoTile label="Студент" value={approval.studentFullName} />
                        <InfoTile label="Группа" value={approval.studentGroup} />
                        <InfoTile label="Преподаватель" value={approval.teacherName} />
                        <InfoTile label="Аудитория" value={approval.classroom} />
                      </div>

                      {approval.excuseAttachment ? (
                        <CompactSection
                          icon={<FileCheck2 className={css({ h: "4.5", w: "4.5" })} />}
                          title="Справка или уважительная причина"
                        >
                          <AttachmentList attachments={[approval.excuseAttachment]} />
                          <Text color="fg.muted">
                            Проверьте документ студента и подтвердите заявку —
                            после этого преподаватель выдаст задание.
                          </Text>
                        </CompactSection>
                      ) : (
                        <Text color="fg.muted">
                          Студент не приложил справку к заявке.
                        </Text>
                      )}
                    </div>
                  ) : null}
                </Card.Body>
              </Card.Root>
            );
          })}
        </section>
      ) : (
        <Card.Root variant="outline">
          <Card.Body className={css({ py: "8" })}>
            <Text color="fg.muted">
              В очереди нет заявок, ожидающих подтверждения. Новые заявки от
              студентов появятся здесь автоматически.
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
    <div className={css({ display: "grid", gap: "2" })}>
      <Text className={css({ fontWeight: "semibold" })}>{label}</Text>
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
      <Text className={css({ color: "fg.muted", textStyle: "xs" })}>{label}</Text>
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

function StatusPill({ children }: { children: ReactNode }) {
  return (
    <div
      className={css({
        alignItems: "center",
        bg: "amber.subtle.bg",
        borderRadius: "full",
        color: "amber.plain.fg",
        display: "inline-flex",
        gap: "2",
        px: "2.5",
        py: "1",
      })}
    >
      <ShieldCheck className={css({ h: "3.5", w: "3.5" })} />
      <Text className={css({ fontSize: "xs", fontWeight: "700" })}>{children}</Text>
    </div>
  );
}

function MetaPill({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      className={css({
        alignItems: "center",
        bg: "gray.subtle.bg",
        borderRadius: "full",
        display: "inline-flex",
        gap: "1.5",
        px: "2.5",
        py: "1.5",
      })}
    >
      <Text className={css({ color: "fg.muted", fontSize: "xs" })}>{label}:</Text>
      <Text className={css({ fontSize: "xs", fontWeight: "semibold" })}>{value}</Text>
    </div>
  );
}

function CompactSection({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className={css({ display: "grid", gap: "3" })}>
      <div
        className={css({
          alignItems: "center",
          color: "fg.default",
          display: "inline-flex",
          gap: "2.5",
        })}
      >
        {icon}
        <Text className={css({ fontWeight: "semibold" })}>{title}</Text>
      </div>
      {children}
    </div>
  );
}
