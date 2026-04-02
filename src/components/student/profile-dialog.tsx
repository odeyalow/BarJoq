"use client";

import { LogOut, UserRound, X } from "lucide-react";
import { Avatar, Button, Dialog, IconButton, Text } from "@/components/ui";
import { useStudentPortal } from "@/components/student/student-portal-provider";
import { css } from "styled-system/css";

export function ProfileDialog() {
  const { student } = useStudentPortal();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", {
      credentials: "include",
      method: "POST",
    });
    window.location.assign("/");
  };

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button
          colorPalette="gray"
          variant="surface"
          className={css({
            gap: "3",
            h: "12",
            maxW: { base: "12", sm: "none" },
            minW: { base: "12", sm: "auto" },
            px: { base: "0", sm: "4" },
          })}
        >
          <Avatar.Root size="sm">
            <Avatar.Fallback name={student.fullName} />
          </Avatar.Root>
          <span
            className={css({
              display: { base: "none", sm: "inline" },
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            })}
          >
            {student.fullName}
          </span>
        </Button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner
          className={css({
            px: { base: "4", md: "0" },
          })}
        >
          <Dialog.Content
            className={css({
              border: "1px solid",
              borderColor: "border",
              maxW: "420px",
            })}
          >
            <Dialog.Header>
              <Dialog.Title>Профиль студента</Dialog.Title>
              <Dialog.Description>
                Основная информация и быстрый выход из учебной части платформы.
              </Dialog.Description>
            </Dialog.Header>

            <Dialog.CloseTrigger asChild>
              <IconButton
                aria-label="Закрыть модальное окно"
                colorPalette="gray"
                size="sm"
                variant="plain"
              >
                <X />
              </IconButton>
            </Dialog.CloseTrigger>

            <Dialog.Body
              className={css({
                gap: "5",
              })}
            >
              <div
                className={css({
                  alignItems: "center",
                  display: "flex",
                  gap: "4",
                })}
              >
                <Avatar.Root size="lg">
                  <Avatar.Fallback name={student.fullName} />
                </Avatar.Root>

                <div
                  className={css({
                    display: "grid",
                    gap: "1",
                  })}
                >
                  <Text
                    className={css({
                      fontWeight: "semibold",
                      textStyle: "lg",
                    })}
                  >
                    {student.fullName}
                  </Text>
                  <Text color="fg.muted">{student.email}</Text>
                </div>
              </div>

              <div
                className={css({
                  display: "grid",
                  gap: "3",
                  gridTemplateColumns: {
                    base: "1fr",
                    sm: "repeat(3, minmax(0, 1fr))",
                  },
                  width: "full",
                })}
              >
                {[
                  ["Группа", student.group],
                  ["Возраст", `${student.age} лет`],
                  ["Курс", `${student.course} курс`],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className={css({
                      bg: "gray.subtle.bg",
                      borderRadius: "l2",
                      p: "3.5",
                    })}
                  >
                    <Text
                      className={css({
                        color: "fg.muted",
                        textStyle: "xs",
                      })}
                    >
                      {label}
                    </Text>
                    <Text
                      className={css({
                        mt: "1.5",
                        fontWeight: "semibold",
                      })}
                    >
                      {value}
                    </Text>
                  </div>
                ))}
              </div>

              <div
                className={css({
                  alignItems: "center",
                  bg: "teal.subtle.bg",
                  borderRadius: "l2",
                  color: "teal.plain.fg",
                  display: "flex",
                  gap: "3",
                  p: "3.5",
                })}
              >
                <UserRound
                  aria-hidden="true"
                  className={css({
                    h: "4.5",
                    w: "4.5",
                  })}
                />
                <Text>
                  Профиль загружается из базы данных. Здесь отображается текущий
                  аккаунт студента и доступен выход из системы.
                </Text>
              </div>
            </Dialog.Body>

            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button colorPalette="gray" variant="surface">
                  Закрыть
                </Button>
              </Dialog.ActionTrigger>
              <Button
                colorPalette="red"
                onClick={handleLogout}
                variant="solid"
              >
                <LogOut />
                Выйти
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
