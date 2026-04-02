"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CalendarClock } from "lucide-react";
import { useRouter } from "next/navigation";
import { Text } from "@/components/ui";
import {
  getStudentAbsenceDeadline,
  type StudentDeadlineTone,
} from "@/lib/absence-deadlines";
import type { AbsenceRecord } from "@/lib/student-portal";
import { css } from "styled-system/css";

const toneStyles: Record<
  StudentDeadlineTone,
  {
    borderColor: string;
    color: string;
    icon: typeof AlertTriangle;
    surface: string;
  }
> = {
  amber: {
    borderColor: "#f2cf63",
    color: "#7a5a00",
    icon: CalendarClock,
    surface: "#fff6cc",
  },
  red: {
    borderColor: "#e7bf3e",
    color: "#6c5100",
    icon: AlertTriangle,
    surface: "#ffefad",
  },
};

export function DeadlineAlert({
  absence,
  compact = false,
}: {
  absence: AbsenceRecord;
  compact?: boolean;
}) {
  const router = useRouter();
  const didRefreshRef = useRef(false);
  const [now, setNow] = useState(() => new Date());
  const deadline = getStudentAbsenceDeadline(absence, now);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1_000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!deadline?.isExpired || absence.status === "expired" || didRefreshRef.current) {
      return;
    }

    didRefreshRef.current = true;
    router.refresh();
  }, [absence.status, deadline?.isExpired, router]);

  if (!deadline) {
    return null;
  }

  const style = toneStyles[deadline.tone];
  const Icon = style.icon;
  const remainingLabel = deadline.isExpired ? "Просрочено" : deadline.remainingLabel;
  const description = deadline.isExpired
    ? "Вам было поставлено Н/Б."
    : deadline.description;
  return (
    <div
      className={css({
        border: "1px solid",
        borderRadius: compact ? "l1" : "l2",
        display: "grid",
        gap: compact ? "1" : "2.5",
        p: compact ? "2" : "3.5",
      })}
      style={{
        backgroundColor: style.surface,
        borderColor: style.borderColor,
        color: style.color,
      }}
    >
      <div
        className={css({
          alignItems: compact ? "center" : { base: "start", md: "center" },
          display: "flex",
          flexDirection: compact ? "row" : { base: "column", md: "row" },
          gap: compact ? "2" : "3",
          justifyContent: "space-between",
        })}
      >
        <div
          className={css({
            alignItems: "center",
            display: "inline-flex",
            gap: "2",
            minW: "0",
          })}
        >
          <Icon
            className={css({
              flexShrink: 0,
              h: compact ? "4" : "5",
              w: compact ? "4" : "5",
            })}
            style={{ color: "inherit" }}
          />
          <Text
            className={css({
              fontWeight: "700",
              lineHeight: "1.3",
              textStyle: compact ? "2xs" : "sm",
            })}
            style={{ color: "inherit" }}
          >
            {compact ? "Лимит времени" : deadline.title}
          </Text>
        </div>

        <Text
          className={css({
            fontFamily: "var(--font-space-grotesk)",
            fontSize: compact ? "sm" : "xl",
            fontWeight: "700",
            lineHeight: "1",
            whiteSpace: "nowrap",
          })}
          style={{ color: "inherit" }}
        >
          {remainingLabel}
        </Text>
      </div>

      {!compact ? (
        <Text
          className={css({
            lineHeight: "1.6",
          })}
          style={{ color: "inherit" }}
        >
          {description}
        </Text>
      ) : null}

      {!compact && !deadline.isExpired ? (
        <Text
          className={css({
            opacity: 0.84,
            textStyle: "sm",
          })}
          style={{ color: "inherit" }}
        >
          {deadline.exactLabel}
        </Text>
      ) : null}
    </div>
  );
}
