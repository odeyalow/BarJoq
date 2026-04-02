import { FileText, Paperclip } from "lucide-react";
import { Text } from "@/components/ui";
import type { Attachment } from "@/lib/student-portal";
import { css } from "styled-system/css";

export function AttachmentList({
  attachments,
  compact = false,
}: {
  attachments: Attachment[];
  compact?: boolean;
}) {
  if (!attachments.length) {
    return null;
  }

  return (
    <div
      className={css({
        display: "grid",
        gap: compact ? "2" : "3",
        gridTemplateColumns: compact
          ? "repeat(auto-fit, minmax(180px, 1fr))"
          : "repeat(auto-fit, minmax(220px, 1fr))",
      })}
    >
      {attachments.map((attachment) => (
        <a
          key={attachment.id}
          href={attachment.href}
          target="_blank"
          rel="noreferrer"
          className={css({
            alignItems: "center",
            bg: "gray.subtle.bg",
            border: "1px solid",
            borderColor: "border",
            borderRadius: "l2",
            color: "fg.default",
            display: "flex",
            gap: "3",
            minH: compact ? "14" : "16",
            px: "3.5",
            py: "3",
            transitionDuration: "normal",
            transitionProperty: "background-color, border-color, transform",
            _hover: {
              bg: "gray.surface.bg",
              borderColor: "gray.7",
              transform: "translateY(-2px)",
            },
          })}
        >
          <div
            className={css({
              alignItems: "center",
              bg: "amber.subtle.bg",
              borderRadius: "l2",
              color: "amber.plain.fg",
              display: "flex",
              flexShrink: 0,
              h: compact ? "9" : "10",
              justifyContent: "center",
              w: compact ? "9" : "10",
            })}
          >
            <FileText
              aria-hidden="true"
              className={css({
                h: "4.5",
                w: "4.5",
              })}
            />
          </div>

          <div
            className={css({
              display: "grid",
              gap: "0.5",
              minW: 0,
            })}
          >
            <Text
              className={css({
                fontWeight: "medium",
                lineClamp: 1,
              })}
            >
              {attachment.name}
            </Text>
            <Text
              className={css({
                alignItems: "center",
                color: "fg.muted",
                display: "inline-flex",
                gap: "1.5",
                textStyle: "xs",
              })}
            >
              <Paperclip
                aria-hidden="true"
                className={css({
                  h: "3",
                  w: "3",
                })}
              />
              {attachment.sizeLabel}
            </Text>
          </div>
        </a>
      ))}
    </div>
  );
}
