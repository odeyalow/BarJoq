"use client";

import { BookOpenText, Files, FolderUp, ShieldCheck, UsersRound } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/student/theme-toggle";
import { DepartmentHeadNotificationsPopover } from "@/components/department-head/department-head-notifications-popover";
import { DepartmentHeadProfileDialog } from "@/components/department-head/department-head-profile-dialog";
import { useDepartmentHeadPortal } from "@/components/department-head/department-head-portal-provider";
import { Button, Text } from "@/components/ui";
import { css } from "styled-system/css";

const pageCopy = {
  dashboard: {
    title: "Кабинет зав. отделения",
    description:
      "Загрузка отчетов с пропусками, предпросмотр перед сохранением и история импортов с файлами.",
  },
  approvals: {
    title: "Подтверждение заявок",
    description:
      "Очередь заявок на отработку, которые уже подтверждены преподавателем и ожидают вашего согласования.",
  },
  students: {
    title: "Все данные студентов",
    description:
      "Единый список пропусков и статусов отработки по всем студентам с экспортом отработочного листа в PDF.",
  },
};

export function DepartmentHeadShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { head } = useDepartmentHeadPortal();

  const pageInfo = pathname.startsWith("/teacher/head/approvals")
    ? pageCopy.approvals
    : pathname.startsWith("/teacher/head/students")
      ? pageCopy.students
      : pageCopy.dashboard;

  const navItems = [
    {
      href: "/teacher/head",
      label: "Импорт пропусков",
      icon: FolderUp,
      matches: (value: string) => value === "/teacher/head",
    },
    {
      href: "/teacher/head/approvals",
      label: "Подтверждение заявок",
      icon: ShieldCheck,
      matches: (value: string) => value.startsWith("/teacher/head/approvals"),
    },
    {
      href: "/teacher/head/students",
      label: "Данные студентов",
      icon: Files,
      matches: (value: string) => value.startsWith("/teacher/head/students"),
    },
  ];

  return (
    <div
      className={css({
        minH: "100vh",
        px: { base: "4", md: "6" },
        py: { base: "4", md: "6" },
      })}
    >
      <div
        className={css({
          mx: "auto",
          maxW: "1360px",
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
                onClick={() => router.push("/teacher/head")}
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
                      {head.groupsCount} групп, {head.studentsCount} студентов
                    </Text>
                    <Text
                      className={css({
                        textStyle: "xs",
                      })}
                    >
                      {head.pendingApprovalsCount} заявок на подтверждении
                    </Text>
                  </div>
                </div>

                <DepartmentHeadNotificationsPopover />
                <ThemeToggle />
                <DepartmentHeadProfileDialog />
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
                const isActive = item.matches(pathname);

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
                  maxW: "900px",
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
  );
}
