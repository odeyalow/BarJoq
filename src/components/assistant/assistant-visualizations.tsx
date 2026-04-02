"use client";

import { Badge, Card, Text } from "@/components/ui";
import type { AssistantVisualization } from "@/lib/assistant";
import { css } from "styled-system/css";

const tonePalette = {
  amber: "amber",
  gray: "gray",
  green: "green",
  red: "red",
  teal: "teal",
} as const;

export function AssistantVisualizations({
  visualizations,
}: {
  visualizations?: AssistantVisualization[];
}) {
  if (!visualizations?.length) {
    return null;
  }

  return (
    <div
      className={css({
        display: "grid",
        gap: "3",
        w: "full",
      })}
    >
      {visualizations.map((visualization, index) => {
        if (visualization.type === "stats") {
          return (
            <Card.Root key={`stats-${index}`} variant="outline">
              <Card.Body
                className={css({
                  gap: "3",
                  p: "3.5",
                })}
              >
                {visualization.title ? (
                  <Text
                    className={css({
                      fontWeight: "semibold",
                    })}
                  >
                    {visualization.title}
                  </Text>
                ) : null}

                <div
                  className={css({
                    display: "grid",
                    gap: "2.5",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  })}
                >
                  {visualization.items.map((item) => (
                    <div
                      key={`${item.label}-${item.value}`}
                      className={css({
                        bg: "gray.subtle.bg",
                        border: "1px solid",
                        borderColor: "border",
                        borderRadius: "l2",
                        display: "grid",
                        gap: "1.5",
                        p: "3",
                      })}
                    >
                      <Text color="fg.muted">{item.label}</Text>
                      <div
                        className={css({
                          alignItems: "center",
                          display: "flex",
                          gap: "2",
                          justifyContent: "space-between",
                        })}
                      >
                        <Text
                          className={css({
                            fontFamily: "var(--font-space-grotesk)",
                            fontSize: "lg",
                            fontWeight: "700",
                            lineHeight: "1.1",
                          })}
                        >
                          {item.value}
                        </Text>
                        {item.tone ? (
                          <Badge colorPalette={tonePalette[item.tone]} variant="surface">
                            {item.tone}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </Card.Body>
            </Card.Root>
          );
        }

        if (visualization.type === "list") {
          return (
            <Card.Root key={`list-${index}`} variant="outline">
              <Card.Body
                className={css({
                  gap: "3",
                  p: "3.5",
                })}
              >
                <Text
                  className={css({
                    fontWeight: "semibold",
                  })}
                >
                  {visualization.title}
                </Text>

                <div
                  className={css({
                    display: "grid",
                    gap: "2.5",
                  })}
                >
                  {visualization.items.map((item, itemIndex) => (
                    <div
                      key={`${item.title}-${itemIndex}`}
                      className={css({
                        bg: "gray.subtle.bg",
                        border: "1px solid",
                        borderColor: "border",
                        borderRadius: "l2",
                        display: "grid",
                        gap: "1",
                        p: "3",
                      })}
                    >
                      <Text
                        className={css({
                          fontWeight: "medium",
                          lineHeight: "1.5",
                        })}
                      >
                        {item.title}
                      </Text>
                      {item.subtitle ? (
                        <Text color="fg.muted">{item.subtitle}</Text>
                      ) : null}
                      {item.meta ? (
                        <Text
                          className={css({
                            color: "fg.muted",
                            textStyle: "xs",
                          })}
                        >
                          {item.meta}
                        </Text>
                      ) : null}
                    </div>
                  ))}
                </div>
              </Card.Body>
            </Card.Root>
          );
        }

        return (
          <Card.Root key={`table-${index}`} variant="outline">
            <Card.Body
              className={css({
                gap: "3",
                p: "3.5",
              })}
            >
              <Text
                className={css({
                  fontWeight: "semibold",
                })}
              >
                {visualization.title}
              </Text>

              <div
                className={css({
                  border: "1px solid",
                  borderColor: "border",
                  borderRadius: "l2",
                  overflow: "hidden",
                })}
              >
                <div
                  className={css({
                    bg: "gray.subtle.bg",
                    display: "grid",
                    gap: "0",
                    gridTemplateColumns: `repeat(${visualization.columns.length}, minmax(0, 1fr))`,
                  })}
                >
                  {visualization.columns.map((column) => (
                    <Text
                      key={column}
                      className={css({
                        borderBottom: "1px solid",
                        borderColor: "border",
                        fontWeight: "semibold",
                        p: "2.5",
                        textStyle: "sm",
                      })}
                    >
                      {column}
                    </Text>
                  ))}

                  {visualization.rows.map((row, rowIndex) =>
                    row.map((cell, cellIndex) => (
                      <Text
                        key={`${rowIndex}-${cellIndex}-${cell}`}
                        className={css({
                          borderBottom:
                            rowIndex === visualization.rows.length - 1 ? "none" : "1px solid",
                          borderColor: "border",
                          p: "2.5",
                          textStyle: "sm",
                        })}
                      >
                        {cell}
                      </Text>
                    )),
                  )}
                </div>
              </div>
            </Card.Body>
          </Card.Root>
        );
      })}
    </div>
  );
}
