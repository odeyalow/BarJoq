"use client";

import type { ReactNode } from "react";
import { ChevronRight, FolderKanban, UsersRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTeacherPortal } from "@/components/teacher/teacher-portal-provider";
import { Button, Card, Text } from "@/components/ui";
import { countGroupAbsences } from "@/lib/teacher-portal";
import { css } from "styled-system/css";

export default function TeacherGroupsPage() {
  const router = useRouter();
  const { absences, groups, isHydrated } = useTeacherPortal();

  if (!isHydrated) {
    return (
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
            Загрузка групп
          </Text>
          <Text color="fg.muted">
            Подготавливаем состав групп и статистику по пропускам.
          </Text>
        </Card.Body>
      </Card.Root>
    );
  }

  return (
    <div
      className={css({
        display: "grid",
        gap: "4",
        gridTemplateColumns: {
          base: "1fr",
          xl: "repeat(2, minmax(0, 1fr))",
        },
      })}
    >
      {groups.map((group, index) => (
        <Card.Root
          key={group.id}
          variant="outline"
          className={`reveal ${css({
            borderColor: "border",
            boxShadow: "sm",
          })}`}
          style={
            {
              "--reveal-delay": `${index * 80}ms`,
            } as React.CSSProperties
          }
        >
          <Card.Header>
            <Card.Title
              className={css({
                fontFamily: "var(--font-space-grotesk)",
                fontSize: "2xl",
              })}
            >
              {group.name}
            </Card.Title>
            <Card.Description>
              {group.specialty}, {group.course} курс
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
                gap: "3",
                gridTemplateColumns: {
                  base: "1fr",
                  sm: "repeat(2, minmax(0, 1fr))",
                },
              })}
            >
              <InfoTile
                icon={<UsersRound className={css({ h: "4.5", w: "4.5" })} />}
                label="Студентов"
                value={String(group.studentIds.length)}
              />
              <InfoTile
                icon={<FolderKanban className={css({ h: "4.5", w: "4.5" })} />}
                label="Пропусков"
                value={String(countGroupAbsences(absences, group.name))}
              />
            </div>

            <Button
              alignSelf="start"
              colorPalette="gray"
              onClick={() => router.push(`/teacher/groups/${group.id}`)}
              variant="surface"
            >
              Открыть группу
              <ChevronRight />
            </Button>
          </Card.Body>
        </Card.Root>
      ))}
    </div>
  );
}

function InfoTile({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div
      className={css({
        bg: "gray.subtle.bg",
        borderRadius: "l2",
        display: "grid",
        gap: "2",
        p: "3.5",
      })}
    >
      <div
        className={css({
          alignItems: "center",
          color: "fg.muted",
          display: "inline-flex",
          gap: "2",
        })}
      >
        {icon}
        {label}
      </div>
      <Text
        className={css({
          fontFamily: "var(--font-space-grotesk)",
          fontSize: "3xl",
          fontWeight: "700",
          lineHeight: "1",
        })}
      >
        {value}
      </Text>
    </div>
  );
}
