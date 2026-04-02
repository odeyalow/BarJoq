"use client";

import {
  CalendarDays,
  ChevronRight,
  CircleUserRound,
  GraduationCap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { TeacherStatusBadge } from "@/components/teacher/teacher-status-badge";
import { Button, Card, Text } from "@/components/ui";
import { formatCompactDate } from "@/lib/student-portal";
import { teacherStatusMeta, type TeacherAbsenceRecord } from "@/lib/teacher-portal";
import { css } from "styled-system/css";

export function TeacherAbsenceCard({
  absence,
  index,
}: {
  absence: TeacherAbsenceRecord;
  index: number;
}) {
  const router = useRouter();

  return (
    <Card.Root
      variant="outline"
      className={`reveal ${css({
        backdropFilter: "blur(18px)",
        borderColor: "token(colors.gray.a5)",
        boxShadow: "sm",
        overflow: "hidden",
      })}`}
      style={
        {
          "--reveal-delay": `${index * 70}ms`,
        } as React.CSSProperties
      }
    >
      <div
        aria-hidden="true"
        className={css({
          bg: `${teacherStatusMeta[absence.status].tone}.solid.bg`,
          h: "1.5",
          w: "full",
        })}
      />

      <Card.Header
        className={css({
          gap: "4",
        })}
      >
        <div
          className={css({
            alignItems: { base: "start", lg: "center" },
            display: "flex",
            flexDirection: { base: "column", lg: "row" },
            gap: "3",
            justifyContent: "space-between",
          })}
        >
          <div
            className={css({
              display: "grid",
              gap: "1.5",
            })}
          >
            <Card.Title
              className={css({
                fontFamily: "var(--font-space-grotesk)",
                fontSize: "xl",
                lineHeight: "1.1",
              })}
            >
              {absence.studentFullName}
            </Card.Title>
            <Text color="fg.muted">
              {absence.subject} • {formatCompactDate(absence.date)}
            </Text>
          </div>

          <TeacherStatusBadge status={absence.status} />
        </div>
      </Card.Header>

      <Card.Body
        className={css({
          gap: "5",
        })}
      >
        <div
          className={css({
            display: "grid",
            gap: "2.5",
          })}
        >
          <div
            className={css({
              alignItems: "center",
              color: "fg.muted",
              display: "inline-flex",
              gap: "2.5",
            })}
          >
            <GraduationCap
              aria-hidden="true"
              className={css({
                h: "4.5",
                w: "4.5",
              })}
            />
            {absence.studentGroup}, {absence.studentCourse} курс
          </div>

          <div
            className={css({
              alignItems: "center",
              color: "fg.muted",
              display: "inline-flex",
              gap: "2.5",
            })}
          >
            <CircleUserRound
              aria-hidden="true"
              className={css({
                h: "4.5",
                w: "4.5",
              })}
            />
            {absence.studentEmail}
          </div>

          <div
            className={css({
              alignItems: "center",
              color: "fg.muted",
              display: "inline-flex",
              gap: "2.5",
            })}
          >
            <CalendarDays
              aria-hidden="true"
              className={css({
                h: "4.5",
                w: "4.5",
              })}
            />
            {absence.lessonLabel}, аудитория {absence.classroom}
          </div>
        </div>

        <Button
          alignSelf="start"
          colorPalette="gray"
          onClick={() => router.push(`/teacher/absences/${absence.id}`)}
          variant="surface"
        >
          Открыть пропуск
          <ChevronRight />
        </Button>
      </Card.Body>
    </Card.Root>
  );
}
