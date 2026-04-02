"use client";

import { BookOpenText, LogOut, School, UserRound, X } from "lucide-react";
import { Avatar, Button, Dialog, IconButton, Text } from "@/components/ui";
import { useTeacherPortal } from "@/components/teacher/teacher-portal-provider";
import { css } from "styled-system/css";

export function TeacherProfileDialog() {
  const { teacher } = useTeacherPortal();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", {
      credentials: "include",
      method: "POST",
    });
    window.location.assign("/teacher");
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
            <Avatar.Fallback name={teacher.fullName} />
          </Avatar.Root>
          <span
            className={css({
              display: { base: "none", sm: "inline" },
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            })}
          >
            {teacher.fullName}
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
              maxW: "460px",
            })}
          >
            <Dialog.Header>
              <Dialog.Title>Профиль преподавателя</Dialog.Title>
              <Dialog.Description>
                Основная информация по преподавателю, группам и дисциплинам.
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
                  <Avatar.Fallback name={teacher.fullName} />
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
                    {teacher.fullName}
                  </Text>
                  <Text color="fg.muted">
                    {teacher.position}, {teacher.department}
                  </Text>
                  <Text color="fg.muted">{teacher.email}</Text>
                </div>
              </div>

              <div
                className={css({
                  display: "grid",
                  gap: "3",
                })}
              >
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
                      color: "fg.default",
                      display: "inline-flex",
                      gap: "2",
                    })}
                  >
                    <School
                      aria-hidden="true"
                      className={css({
                        h: "4.5",
                        w: "4.5",
                      })}
                    />
                    <Text
                      className={css({
                        fontWeight: "semibold",
                      })}
                    >
                      Группы
                    </Text>
                  </div>
                  <Text color="fg.muted">{teacher.groups.join(", ")}</Text>
                </div>

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
                      color: "fg.default",
                      display: "inline-flex",
                      gap: "2",
                    })}
                  >
                    <BookOpenText
                      aria-hidden="true"
                      className={css({
                        h: "4.5",
                        w: "4.5",
                      })}
                    />
                    <Text
                      className={css({
                        fontWeight: "semibold",
                      })}
                    >
                      Предметы
                    </Text>
                  </div>
                  <Text color="fg.muted">{teacher.subjects.join(", ")}</Text>
                </div>
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
                  Профиль преподавателя и список групп загружаются из базы данных.
                  Здесь можно быстро проверить закрепленные группы и выйти из
                  системы.
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
