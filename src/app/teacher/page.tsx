"use client";

import { useState } from "react";
import { ArrowRight, BookOpenText, ClipboardCheck, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/student/theme-toggle";
import { Button, Card, Field, Input, Text } from "@/components/ui";
import {
  defaultDepartmentHeadAccount,
  defaultTeacherAccount,
} from "@/lib/default-accounts";
import { css } from "styled-system/css";

type TeacherAuthTab = "teacher" | "head";

const featureList = [
  {
    icon: ClipboardCheck,
    title: "Проверка по статусам",
    description:
      "Преподаватель видит заявки, задания, ответы студентов и выставленные оценки в одном интерфейсе.",
  },
  {
    icon: BookOpenText,
    title: "Работа с группами",
    description:
      "У преподавателя есть отдельный раздел с группами, студентами и переходом к их пропускам.",
  },
  {
    icon: ShieldCheck,
    title: "Отдельный кабинет зав. отделения",
    description:
      "Зав. отделения работает через ту же страницу входа, но получает отдельный кабинет для импорта отчетов и PDF-листов.",
  },
];

export default function TeacherAuthPage() {
  const router = useRouter();
  const [authTab, setAuthTab] = useState<TeacherAuthTab>("teacher");
  const [email, setEmail] = useState(defaultTeacherAccount.email);
  const [password, setPassword] = useState(defaultTeacherAccount.password);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTabChange = (tab: TeacherAuthTab) => {
    setAuthTab(tab);
    setError("");

    if (tab === "teacher") {
      setEmail(defaultTeacherAccount.email);
      setPassword(defaultTeacherAccount.password);
      return;
    }

    setEmail(defaultDepartmentHeadAccount.email);
    setPassword(defaultDepartmentHeadAccount.password);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/teacher/login", {
        credentials: "include",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        redirectTo?: string;
      };

      if (!response.ok) {
        setError(data.error ?? "Не удалось выполнить вход.");
        setIsSubmitting(false);
        return;
      }

      window.location.assign(data.redirectTo ?? "/teacher/dashboard");
    } catch {
      setError("Не удалось подключиться к серверу.");
      setIsSubmitting(false);
    }
  };

  return (
    <main
      className={css({
        minH: "100vh",
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
        <div
          className={css({
            display: "flex",
            justifyContent: "space-between",
            mb: "4",
          })}
        >
          <Button colorPalette="gray" onClick={() => router.push("/")} variant="surface">
            Интерфейс студента
          </Button>
          <ThemeToggle />
        </div>

        <div
          className={css({
            display: "grid",
            gap: "6",
            gridTemplateColumns: {
              base: "1fr",
              xl: "minmax(0, 1.15fr) minmax(420px, 0.85fr)",
            },
          })}
        >
          <section
            className={`reveal ${css({
              backdropFilter: "blur(18px)",
              bg: "gray.surface.bg",
              border: "1px solid",
              borderColor: "border",
              borderRadius: "l3",
              boxShadow: "lg",
              display: "grid",
              gap: "8",
              minH: { xl: "720px" },
              overflow: "hidden",
              p: { base: "5", md: "8" },
              position: "relative",
            })}`}
          >
            <div
              aria-hidden="true"
              className={css({
                bg: "linear-gradient(135deg, token(colors.red.a5), transparent 58%)",
                borderRadius: "9999px",
                h: "72",
                pointerEvents: "none",
                position: "absolute",
                right: "-12",
                top: "-20",
                w: "72",
              })}
            />

            <div
              className={css({
                display: "grid",
                gap: "4",
                position: "relative",
                zIndex: "1",
              })}
            >
              <div
                className={css({
                  alignItems: "center",
                  display: "inline-flex",
                  gap: "2.5",
                  maxW: "fit-content",
                })}
              >
                <BookOpenText
                  aria-hidden="true"
                  className={css({
                    color: "red.10",
                    h: "4.5",
                    w: "4.5",
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
              </div>

              <div
                className={css({
                  display: "grid",
                  gap: "3",
                })}
              >
                <h1
                  className={css({
                    fontFamily: "var(--font-space-grotesk)",
                    fontSize: { base: "4xl", md: "6xl" },
                    fontWeight: "700",
                    letterSpacing: "-0.04em",
                    lineHeight: "0.94",
                    maxW: "860px",
                  })}
                >
                  Кабинеты преподавателя и зав. отделения
                </h1>
                <Text
                  className={css({
                    color: "fg.muted",
                    maxW: "660px",
                    textStyle: "lg",
                  })}
                >
                  Одна точка входа для двух ролей: преподаватель работает с
                  отработками и группами, а зав. отделения загружает отчеты,
                  контролирует статусы и формирует PDF-листы.
                </Text>
              </div>
            </div>

            <div
              className={css({
                display: "grid",
                gap: "4",
                gridTemplateColumns: {
                  base: "1fr",
                  md: "repeat(3, minmax(0, 1fr))",
                },
                position: "relative",
                zIndex: "1",
              })}
            >
              {featureList.map((feature, index) => {
                const Icon = feature.icon;

                return (
                  <div
                    key={feature.title}
                    className={`reveal ${css({
                      bg: "gray.subtle.bg",
                      border: "1px solid",
                      borderColor: "border",
                      borderRadius: "l3",
                      display: "grid",
                      gap: "3",
                      p: "4",
                    })}`}
                    style={
                      {
                        "--reveal-delay": `${index * 100 + 80}ms`,
                      } as React.CSSProperties
                    }
                  >
                    <div
                      className={css({
                        alignItems: "center",
                        bg: "amber.subtle.bg",
                        borderRadius: "l2",
                        color: "amber.plain.fg",
                        display: "flex",
                        h: "10",
                        justifyContent: "center",
                        w: "10",
                      })}
                    >
                      <Icon
                        aria-hidden="true"
                        className={css({
                          h: "5",
                          w: "5",
                        })}
                      />
                    </div>
                    <Text
                      className={css({
                        fontWeight: "semibold",
                        textStyle: "lg",
                      })}
                    >
                      {feature.title}
                    </Text>
                    <Text color="fg.muted">{feature.description}</Text>
                  </div>
                );
              })}
            </div>

          </section>

          <Card.Root
            variant="outline"
            className={`reveal ${css({
              backdropFilter: "blur(18px)",
              borderColor: "border",
              boxShadow: "lg",
            })}`}
            style={
              {
                "--reveal-delay": "120ms",
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
                {authTab === "teacher"
                  ? "Вход преподавателя"
                  : "Вход зав. отделения"}
              </Card.Title>
              <Card.Description>
                {authTab === "teacher"
                  ? "После входа откроется преподавательский кабинет с группами, пропусками и страницами оценивания."
                  : "После входа откроется кабинет зав. отделения с импортом отчетов, контролем статусов и выгрузкой PDF."}
              </Card.Description>
            </Card.Header>

            <Card.Body
              className={css({
                gap: "5",
              })}
            >
              <div
                className={css({
                  display: "grid",
                  gap: "2",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                })}
              >
                <Button
                  colorPalette={authTab === "teacher" ? "teal" : "gray"}
                  onClick={() => handleTabChange("teacher")}
                  variant={authTab === "teacher" ? "solid" : "surface"}
                >
                  Преподаватель
                </Button>
                <Button
                  colorPalette={authTab === "head" ? "teal" : "gray"}
                  onClick={() => handleTabChange("head")}
                  variant={authTab === "head" ? "solid" : "surface"}
                >
                  Зав. отделения
                </Button>
              </div>

              <form
                onSubmit={handleSubmit}
                className={css({
                  display: "grid",
                  gap: "4",
                })}
              >
                <Field.Root>
                  <Field.Label>Email</Field.Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="teacher@example.com"
                    required
                  />
                </Field.Root>

                <Field.Root>
                  <Field.Label>Пароль</Field.Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Введите пароль"
                    required
                  />
                </Field.Root>

                <div
                  className={css({
                    bg: "gray.subtle.bg",
                    borderRadius: "l2",
                    p: "3.5",
                  })}
                >
                  <Text
                    className={css({
                      color: "fg.muted",
                    })}
                  >
                    {authTab === "teacher"
                      ? "Табы переключают готовые данные входа для преподавателя и зав. отделения, но сам маршрут авторизации остается общим."
                      : "Зав. отделения использует тот же маршрут входа `/teacher`, но после авторизации попадает в отдельный раздел для импорта и аналитики."}
                  </Text>
                </div>

                {error ? (
                  <div
                    className={css({
                      bg: "red.subtle.bg",
                      borderRadius: "l2",
                      color: "red.plain.fg",
                      p: "3.5",
                    })}
                  >
                    <Text>{error}</Text>
                  </div>
                ) : null}

                <Button type="submit" colorPalette="teal" disabled={isSubmitting}>
                  {isSubmitting ? "Подождите..." : "Войти в систему"}
                  <ArrowRight />
                </Button>
              </form>
            </Card.Body>
          </Card.Root>
        </div>
      </div>
    </main>
  );
}
