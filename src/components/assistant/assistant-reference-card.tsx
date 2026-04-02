"use client";

import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Button, Card, Text } from "@/components/ui";
import { css } from "styled-system/css";

export function AssistantReferenceCard({
  title,
  subtitle,
  meta,
  badge,
  actionLabel,
  onOpen,
}: {
  title: string;
  subtitle?: string;
  meta?: string;
  badge?: ReactNode;
  actionLabel: string;
  onOpen: () => void;
}) {
  return (
    <Card.Root
      variant="outline"
      className={css({
        borderColor: "border",
        boxShadow: "sm",
      })}
    >
      <Card.Body
        className={css({
          gap: "3",
          p: "3.5",
        })}
      >
        <div
          className={css({
            alignItems: { base: "start", sm: "center" },
            display: "flex",
            flexDirection: { base: "column", sm: "row" },
            gap: "2.5",
            justifyContent: "space-between",
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
                lineHeight: "1.4",
              })}
            >
              {title}
            </Text>
            {subtitle ? <Text color="fg.muted">{subtitle}</Text> : null}
            {meta ? (
              <Text
                className={css({
                  color: "fg.muted",
                  textStyle: "xs",
                })}
              >
                {meta}
              </Text>
            ) : null}
          </div>

          {badge}
        </div>

        <Button
          alignSelf="start"
          colorPalette="gray"
          onClick={onOpen}
          size="sm"
          variant="surface"
        >
          {actionLabel}
          <ChevronRight />
        </Button>
      </Card.Body>
    </Card.Root>
  );
}
