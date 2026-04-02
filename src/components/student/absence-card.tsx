"use client";

import type { CSSProperties } from "react";
import { ChevronRight, GraduationCap, UserSquare2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { DeadlineAlert } from "@/components/student/deadline-alert";
import { StatusBadge } from "@/components/student/status-badge";
import { Button, Card, Text } from "@/components/ui";
import {
  formatCompactDate,
  statusMeta,
  type AbsenceRecord,
} from "@/lib/student-portal";
import { css } from "styled-system/css";

export function AbsenceCard({
  absence,
  index,
}: {
  absence: AbsenceRecord;
  index: number;
}) {
  const router = useRouter();

  return (
    <Card.Root
      variant="outline"
      className={`reveal ${css({
        backdropFilter: "blur(18px)",
        borderColor: "token(colors.gray.a5)",
        display: "flex",
        flexDirection: "column",
        h: "full",
        boxShadow: "sm",
        overflow: "hidden",
        position: "relative",
      })}`}
      style={
        {
          "--reveal-delay": `${index * 80}ms`,
        } as CSSProperties
      }
    >
      <div
        aria-hidden="true"
        className={css({
          bg: `${statusMeta[absence.status].tone}.solid.bg`,
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
            alignItems: { base: "start", sm: "center" },
            display: "flex",
            flexDirection: { base: "column", sm: "row" },
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
              {absence.subject}
            </Card.Title>
            <Text color="fg.muted">{formatCompactDate(absence.date)}</Text>
          </div>

          <StatusBadge status={absence.status} />
        </div>
      </Card.Header>

      <Card.Body
        className={css({
          display: "flex",
          flex: "1",
          flexDirection: "column",
          gap: "4",
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
            <UserSquare2
              aria-hidden="true"
              className={css({
                h: "4.5",
                w: "4.5",
              })}
            />
            {absence.teacherName}
          </div>

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
            {statusMeta[absence.status].description}
          </div>
        </div>

        <div
          className={css({
            mt: "auto",
            display: "grid",
            gap: "3",
          })}
        >
          <DeadlineAlert absence={absence} compact />

          <div
            className={css({
              display: "flex",
              justifyContent: "flex-end",
            })}
          >
            <Button
              colorPalette="gray"
              onClick={() => router.push(`/student/absences/${absence.id}`)}
              variant="surface"
            >
              Подробнее
              <ChevronRight />
            </Button>
          </div>
        </div>
      </Card.Body>
    </Card.Root>
  );
}
