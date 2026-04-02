"use client";

import { BookOpenText, LayoutDashboard, UsersRound } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { ThemeToggle } from "@/components/student/theme-toggle";
import { TeacherAssistantDock } from "@/components/teacher/teacher-assistant-dock";
import { TeacherNotificationsPopover } from "@/components/teacher/teacher-notifications-popover";
import { TeacherProfileDialog } from "@/components/teacher/teacher-profile-dialog";
import { useTeacherPortal } from "@/components/teacher/teacher-portal-provider";
import { Button, Text } from "@/components/ui";
import { css } from "styled-system/css";

const pageCopy = {
  dashboard: {
    title: "Панель преподавателя",
    description:
      "Список всех пропусков студентов по вашим дисциплинам, фильтры по группам и быстрый переход к проверке.",
  },
  absence: {
    title: "Карточка пропуска",
    description:
      "Полная информация по пропуску, материалам, ответу студента и итоговой оценке.",
  },
  assignment: {
    title: "Задание на отработку",
    description:
      "Создание или обновление задания, которое будет отправлено студенту на отработку пропуска.",
  },
  groups: {
    title: "Мои группы",
    description:
      "Список закрепленных групп, количество студентов и быстрый переход к их пропускам.",
  },
  group: {
    title: "Состав группы",
    description:
      "Просмотр студентов группы, количества пропусков и переход к карточкам конкретного студента.",
  },
  student: {
    title: "Пропуски студента",
    description:
      "Все пропуски выбранного студента по вашим предметам с текущими статусами и доступом к проверке.",
  },
};

export function TeacherShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { teacher } = useTeacherPortal();
  const [assistantOpen, setAssistantOpen] = useState(false);

  const pageInfo = pathname.includes("/assignment")
    ? pageCopy.assignment
    : pathname.includes("/groups/") && pathname !== "/teacher/groups"
      ? pageCopy.group
      : pathname.includes("/groups")
        ? pageCopy.groups
        : pathname.includes("/students/")
          ? pageCopy.student
          : pathname.includes("/absences/")
            ? pageCopy.absence
            : pageCopy.dashboard;

  const navItems = [
    { href: "/teacher/dashboard", label: "Пропуски", icon: LayoutDashboard },
    { href: "/teacher/groups", label: "Мои группы", icon: UsersRound },
  ];

  return (
    <div
      className={css({
        minH: "100vh",
        display: { base: "block", xl: "flex" },
      })}
    >
      <div
        className={css({
          flex: "1",
          minW: "0",
          px: { base: "4", md: "6" },
          py: { base: "4", md: "6" },
        })}
      >
        <div
          className={css({
            mx: "auto",
            maxW: "1320px",
          })}
        >
          <header
            className={css({
              backdropFilter: "blur(22px)",
              bg: "gray.surface.bg/78",
              border: "1px solid token(colors.gray.a5)",
              borderRadius: "l3",
              boxShadow: "lg",
              px: { base: "4", md: "6" },
              py: { base: "4", md: "5" },
            })}
          >
            <div
              className={css({
                display: "grid",
                gap: "4",
              })}
            >
              <div
                className={css({
                  alignItems: "center",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "3",
                  justifyContent: "space-between",
                })}
              >
                <button
                  type="button"
                  onClick={() => router.push("/teacher/dashboard")}
                  className={css({
                    alignItems: "center",
                    cursor: "pointer",
                    display: "inline-flex",
                    gap: "3",
                    transitionDuration: "normal",
                    transitionProperty: "transform, opacity",
                    _hover: {
                      opacity: 0.88,
                      transform: "translateY(-1px)",
                    },
                  })}
                >
                  <BookOpenText
                    aria-hidden="true"
                    className={css({
                      color: "red.10",
                      h: "5",
                      w: "5",
                    })}
                  />
                  <span
                    className={css({
                      alignItems: "center",
                      color: "fg.default",
                      display: "inline-flex",
                      fontFamily: "var(--font-space-grotesk)",
                      fontSize: "lg",
                      fontWeight: "700",
                      gap: "2",
                      letterSpacing: "-0.02em",
                    })}
                  >
                    <span
                      className={css({
                        color: "red.10",
                      })}
                    >
                      PolyTech
                    </span>
                    <span
                      className={css({
                        color: "fg.muted",
                      })}
                    >
                      |
                    </span>
                    <span>BarJoq</span>
                  </span>
                </button>

                <div
                  className={css({
                    alignItems: "center",
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "3",
                    justifyContent: "flex-end",
                  })}
                >
                  <div
                    className={css({
                      alignItems: "center",
                      bg: "gray.subtle.bg",
                      borderRadius: "l2",
                      color: "fg.muted",
                      display: "inline-flex",
                      gap: "2.5",
                      h: "12",
                      px: "3.5",
                    })}
                  >
                    <UsersRound
                      aria-hidden="true"
                      className={css({
                        h: "4.5",
                        w: "4.5",
                      })}
                    />
                    <div
                      className={css({
                        display: "grid",
                        gap: "0.5",
                      })}
                    >
                      <Text
                        className={css({
                          color: "fg.default",
                          fontWeight: "semibold",
                          lineHeight: "1",
                        })}
                      >
                        {teacher.groups.join(", ")}
                      </Text>
                      <Text
                        className={css({
                          textStyle: "xs",
                        })}
                      >
                        {teacher.position}
                      </Text>
                    </div>
                  </div>

                  <TeacherNotificationsPopover />
                  <ThemeToggle />
                  <TeacherProfileDialog />
                </div>
              </div>

              <div
                className={css({
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "2",
                })}
              >
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname.startsWith(item.href);

                  return (
                    <Button
                      key={item.href}
                      colorPalette={isActive ? "teal" : "gray"}
                      onClick={() => router.push(item.href)}
                      variant={isActive ? "solid" : "surface"}
                    >
                      <Icon />
                      {item.label}
                    </Button>
                  );
                })}
              </div>

              <div
                className={css({
                  display: "grid",
                  gap: "1.5",
                })}
              >
                <h1
                  className={css({
                    fontFamily: "var(--font-space-grotesk)",
                    fontSize: { base: "2xl", md: "4xl" },
                    fontWeight: "700",
                    letterSpacing: "-0.03em",
                    lineHeight: "1.05",
                  })}
                >
                  {pageInfo.title}
                </h1>
                <Text
                  className={css({
                    color: "fg.muted",
                    maxW: "820px",
                  })}
                >
                  {pageInfo.description}
                </Text>
              </div>
            </div>
          </header>

          <main
            className={css({
              pt: { base: "5", md: "6" },
            })}
          >
            {children}
          </main>
        </div>
      </div>

      <div
        className={css({
          display: { base: "none", xl: "block" },
          flexShrink: "0",
          maxW: assistantOpen ? "30%" : "0",
          minW: assistantOpen ? "30%" : "0",
          overflow: "hidden",
          transitionDuration: "slow",
          transitionProperty: "max-width, min-width",
          width: "30%",
        })}
      >
        <TeacherAssistantDock
          open={assistantOpen}
          onOpenChange={setAssistantOpen}
          layout="desktop"
        />
      </div>

      <div
        className={css({
          display: { base: "block", xl: "none" },
        })}
      >
        <TeacherAssistantDock
          open={assistantOpen}
          onOpenChange={setAssistantOpen}
          layout="mobile"
        />
      </div>
    </div>
  );
}
