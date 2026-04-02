"use client";

import { CalendarClock, LayoutDashboard } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Text } from "@/components/ui";
import { StudentAssistantDock } from "@/components/student/student-assistant-dock";
import { NotificationsPopover } from "@/components/student/notifications-popover";
import { useStudentPortal } from "@/components/student/student-portal-provider";
import { ProfileDialog } from "@/components/student/profile-dialog";
import { ThemeToggle } from "@/components/student/theme-toggle";
import { css } from "styled-system/css";

const pageCopy: Record<string, { title: string; description: string }> = {
  "/student": {
    title: "Лента пропусков",
    description:
      "Здесь собраны все пропущенные занятия, их текущие статусы и доступ к отработке.",
  },
  detail: {
    title: "Карточка пропуска",
    description:
      "Подробная информация по конкретному пропуску и все действия по отработке.",
  },
  reply: {
    title: "Ответ на отработку",
    description:
      "Отправка или обновление ответа по полученному заданию преподавателя.",
  },
};

export function StudentShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { student } = useStudentPortal();
  const [assistantOpen, setAssistantOpen] = useState(false);

  const pageInfo = pathname.endsWith("/reply")
    ? pageCopy.reply
    : pathname === "/student"
      ? pageCopy["/student"]
      : pageCopy.detail;

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
            maxW: "1280px",
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
                alignItems: "center",
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
                  onClick={() => router.push("/student")}
                  className={css({
                    alignItems: "center",
                    borderRadius: "full",
                    cursor: "pointer",
                    display: "inline-flex",
                    gap: "3",
                    maxW: "fit-content",
                    minH: "11",
                    px: "0",
                    py: "0",
                    transitionDuration: "normal",
                    transitionProperty: "transform, opacity",
                    _hover: {
                      opacity: 0.88,
                      transform: "translateY(-1px)",
                    },
                  })}
                >
                  <LayoutDashboard
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
                      py: "0",
                    })}
                  >
                    <CalendarClock
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
                        {student.group}
                      </Text>
                      <Text
                        className={css({
                          textStyle: "xs",
                        })}
                      >
                        {student.fullName}
                      </Text>
                    </div>
                  </div>

                  <NotificationsPopover />
                  <ThemeToggle />
                  <ProfileDialog />
                </div>
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
                    maxW: "720px",
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
        <StudentAssistantDock
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
        <StudentAssistantDock
          open={assistantOpen}
          onOpenChange={setAssistantOpen}
          layout="mobile"
        />
      </div>
    </div>
  );
}
