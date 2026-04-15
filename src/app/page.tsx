"use client";

import { useState } from "react";
import { ArrowRight, GraduationCap, Layers3, ShieldCheck } from "lucide-react";
import { ThemeToggle } from "@/components/student/theme-toggle";
import { Button, Card, Field, Input, Text } from "@/components/ui";
import { defaultStudentAccount } from "@/lib/default-accounts";
import { css } from "styled-system/css";

type AuthMode = "login" | "register";

const featureList = [
  {
    icon: Layers3,
    title: "Лента статусов",
    description:
      "Студент сразу видит все пропуски, этап отработки и прикрепленные материалы.",
  },
  {
    icon: GraduationCap,
    title: "Отработка по шагам",
    description:
      "От получения задания до проверки преподавателем весь сценарий разведен по понятным этапам.",
  },
  {
    icon: ShieldCheck,
    title: "Реальная БД",
    description:
      "Авторизация, статусы, отработки, уведомления и файлы теперь работают через SQLite-базу данных.",
  },
];

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState(defaultStudentAccount.email);
  const [password, setPassword] = useState(defaultStudentAccount.password);
  const [fullName, setFullName] = useState(defaultStudentAccount.fullName);
  const [group, setGroup] = useState(defaultStudentAccount.group);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const endpoint =
      mode === "login"
        ? "/api/auth/student/login"
        : "/api/auth/student/register";

    try {
      const response = await fetch(endpoint, {
        credentials: "include",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          fullName,
          group,
        }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "Не удалось выполнить авторизацию.");
        setIsSubmitting(false);
        return;
      }

      window.location.assign("/student");
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
            justifyContent: "flex-end",
            mb: "4",
          })}
        >
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
                bg: "linear-gradient(135deg, token(colors.teal.a6), transparent 58%)",
                h: "72",
                pointerEvents: "none",
                position: "absolute",
                right: "-12",
                borderRadius: "9999px",
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
                  borderRadius: "full",
                  display: "inline-flex",
                  gap: "2.5",
                  maxW: "fit-content",
                  px: "0",
                  py: "0",
                })}
              >
                <GraduationCap
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
                  Интеллектуальный ассистент для отработки пропущенных учебных
                  дней
                </h1>
                <Text
                  className={css({
                    color: "fg.muted",
                    maxW: "660px",
                    textStyle: "lg",
                  })}
                >
                  Концепт студентческой части платформы: авторизация, лента
                  пропусков, карточки со статусами, отправка ответов и
                  персональный кабинет с переключением темы.
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
                {mode === "login" ? "Вход студента" : "Регистрация студента"}
              </Card.Title>
              <Card.Description>
                Вход и регистрация работают через SQLite-базу. Регистрация
                доступна только для студентов, которые уже существуют в группе.
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
                  colorPalette={mode === "login" ? "teal" : "gray"}
                  onClick={() => setMode("login")}
                  variant={mode === "login" ? "solid" : "surface"}
                >
                  Вход
                </Button>
                <Button
                  colorPalette={mode === "register" ? "teal" : "gray"}
                  onClick={() => setMode("register")}
                  variant={mode === "register" ? "solid" : "surface"}
                >
                  Регистрация
                </Button>
              </div>

              <form
                onSubmit={handleSubmit}
                className={css({
                  display: "grid",
                  gap: "4",
                })}
              >
                {mode === "register" ? (
                  <>
                    <Field.Root>
                      <Field.Label>ФИО</Field.Label>
                      <Input
                        value={fullName}
                        onChange={(event) => setFullName(event.target.value)}
                        placeholder="Иванов Иван Иванович"
                        required
                      />
                    </Field.Root>

                    <Field.Root>
                      <Field.Label>Группа</Field.Label>
                      <Input
                        value={group}
                        onChange={(event) => setGroup(event.target.value)}
                        placeholder="IS-21-3k"
                        required
                      />
                    </Field.Root>
                  </>
                ) : null}

                <Field.Root>
                  <Field.Label>Email</Field.Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="student@example.com"
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
                    Для теста уже создан студент {defaultStudentAccount.fullName}{" "}
                    из группы {defaultStudentAccount.group}. После входа откроется личный кабинет с
                    реальными данными из БД.
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
                  {isSubmitting
                    ? "Подождите..."
                    : mode === "login"
                      ? "Войти в систему"
                      : "Создать аккаунт"}
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
