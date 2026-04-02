"use client";

import { Badge } from "@/components/ui";
import { statusMeta, type AbsenceStatus } from "@/lib/student-portal";
import { css } from "styled-system/css";

export function StatusBadge({ status }: { status: AbsenceStatus }) {
  const meta = statusMeta[status];
  const Icon = meta.icon;

  return (
    <Badge
      colorPalette={meta.tone}
      variant="solid"
      className={css({
        gap: "2",
        minH: "12",
        px: "4.5",
        textStyle: "sm",
      })}
    >
      <Icon
        aria-hidden="true"
        className={css({
          h: "4.5",
          w: "4.5",
        })}
      />
      {meta.label}
    </Badge>
  );
}
