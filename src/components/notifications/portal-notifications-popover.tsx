"use client";

import { useState } from "react";
import {
  Bell,
  BellRing,
  CalendarX2,
  CheckCircle2,
  ChevronRight,
  FileClock,
  MessageSquareText,
} from "lucide-react";
import { Button, Popover, Text } from "@/components/ui";
import { formatPortalDateTime, type PortalNotification } from "@/lib/student-portal";
import { css } from "styled-system/css";

const notificationIconMap = {
  calendar: CalendarX2,
  bell: BellRing,
  message: MessageSquareText,
  review: FileClock,
  completed: CheckCircle2,
} as const;

export function PortalNotificationsPopover({
  notifications,
  ariaLabel,
  description,
  actionLabel,
  onNotificationOpen,
  onClearRead,
}: {
  notifications: PortalNotification[];
  ariaLabel: string;
  description: string;
  actionLabel?: string;
  onNotificationOpen: (notification: PortalNotification) => Promise<void>;
  onClearRead: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const unreadCount = notifications.filter((notification) => !notification.isRead).length;
  const hasReadNotifications = notifications.some((notification) => notification.isRead);

  return (
    <Popover.Root
      open={open}
      onOpenChange={(details) => setOpen(details.open)}
      positioning={{
        placement: "bottom-end",
        gutter: 12,
      }}
    >
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          className={css({
            alignItems: "center",
            bg: "gray.subtle.bg",
            border: "1px solid",
            borderColor: "border",
            borderRadius: "l2",
            color: "fg.default",
            cursor: "pointer",
            display: "inline-flex",
            h: "12",
            justifyContent: "center",
            minW: "12",
            position: "relative",
            transitionDuration: "normal",
            transitionProperty: "background-color, border-color, transform",
            _hover: {
              bg: "gray.surface.bg",
              borderColor: "gray.7",
              transform: "translateY(-1px)",
            },
          })}
        >
          <Bell
            aria-hidden="true"
            className={css({
              h: "4.5",
              w: "4.5",
            })}
          />
          {unreadCount ? (
            <span
              className={css({
                alignItems: "center",
                bg: "red.9",
                border: "2px solid",
                borderColor: "gray.surface.bg",
                borderRadius: "full",
                color: "white",
                display: "inline-flex",
                fontSize: "10px",
                fontWeight: "700",
                h: "5",
                justifyContent: "center",
                minW: "5",
                px: "1",
                position: "absolute",
                right: "-1",
                top: "-1",
              })}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </button>
      </Popover.Trigger>

      <Popover.Positioner>
        <Popover.Content
          className={css({
            border: "1px solid",
            borderColor: "border",
            boxShadow: "xl",
            maxW: { base: "calc(100vw - 2rem)", md: "460px" },
            w: { base: "calc(100vw - 2rem)", md: "460px" },
          })}
        >
          <Popover.Arrow />

          <Popover.Header
            className={css({
              alignItems: "start",
              display: "grid",
              gap: "3",
            })}
          >
            <div
              className={css({
                alignItems: "start",
                display: "flex",
                gap: "3",
                justifyContent: "space-between",
              })}
            >
              <div
                className={css({
                  display: "grid",
                  gap: "1",
                })}
              >
                <Popover.Title>Уведомления</Popover.Title>
                <Popover.Description>{description}</Popover.Description>
              </div>

              <Button
                colorPalette="gray"
                disabled={!hasReadNotifications}
                onClick={() => {
                  void onClearRead().catch(() => undefined);
                }}
                size="sm"
                variant="surface"
              >
                Очистить
              </Button>
            </div>
          </Popover.Header>

          <Popover.Body
            className={css({
              px: { base: "4", md: "6" },
            })}
          >
            {notifications.length ? (
              <div
                className={css({
                  display: "grid",
                  gap: "3",
                  maxH: "420px",
                  overflowY: "auto",
                  pb: "2",
                  pr: "1",
                })}
              >
                {notifications.map((notification) => {
                  const Icon = notificationIconMap[notification.icon];

                  const openNotification = async () => {
                    setOpen(false);
                    await onNotificationOpen(notification);
                  };

                  return (
                    <div
                      key={notification.id}
                      className={css({
                        bg: notification.isRead ? "gray.subtle.bg" : "gray.surface.bg",
                        border: "1px solid",
                        borderColor: notification.isRead ? "border" : "teal.7",
                        borderRadius: "l3",
                        boxShadow: notification.isRead ? "sm" : "md",
                        color: "fg.default",
                        display: "grid",
                        gap: "3",
                        p: "3.5",
                        w: "full",
                      })}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          void openNotification();
                        }}
                        className={css({
                          alignItems: "start",
                          color: "fg.default",
                          cursor: "pointer",
                          display: "flex",
                          gap: "3",
                          textAlign: "left",
                          transitionDuration: "normal",
                          transitionProperty: "transform",
                          w: "full",
                          _hover: {
                            transform: "translateY(-1px)",
                          },
                        })}
                      >
                        <div
                          className={css({
                            alignItems: "center",
                            bg: `${notification.tone}.subtle.bg`,
                            borderRadius: "l2",
                            color: `${notification.tone}.plain.fg`,
                            display: "flex",
                            h: "10",
                            justifyContent: "center",
                            minW: "10",
                          })}
                        >
                          <Icon
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
                            flex: "1",
                            gap: "1.5",
                            minW: 0,
                          })}
                        >
                          <div
                            className={css({
                              alignItems: "start",
                              display: "flex",
                              gap: "2",
                              justifyContent: "space-between",
                            })}
                          >
                            <Text
                              className={css({
                                fontWeight: notification.isRead ? "medium" : "semibold",
                                lineHeight: "1.4",
                              })}
                            >
                              {notification.title}
                            </Text>
                            {!notification.isRead ? (
                              <span
                                className={css({
                                  bg: "teal.9",
                                  borderRadius: "full",
                                  flexShrink: 0,
                                  h: "2.5",
                                  mt: "1",
                                  w: "2.5",
                                })}
                              />
                            ) : null}
                          </div>
                          <Text
                            className={css({
                              color: "fg.muted",
                              textStyle: "xs",
                            })}
                          >
                            {formatPortalDateTime(notification.createdAt)}
                          </Text>
                          <Text
                            className={css({
                              color: "fg.muted",
                              lineHeight: "1.55",
                            })}
                          >
                            {notification.message}
                          </Text>
                        </div>

                        <ChevronRight
                          aria-hidden="true"
                          className={css({
                            color: "fg.muted",
                            flexShrink: 0,
                            h: "5",
                            mt: "0.5",
                            w: "5",
                          })}
                        />
                      </button>

                      {actionLabel ? (
                        <div
                          className={css({
                            display: "flex",
                            justifyContent: "end",
                          })}
                        >
                          <Button
                            colorPalette="gray"
                            onClick={() => {
                              void openNotification();
                            }}
                            size="sm"
                            variant="surface"
                          >
                            {actionLabel}
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div
                className={css({
                  borderRadius: "l3",
                  bg: "gray.subtle.bg",
                  p: "4",
                })}
              >
                <Text color="fg.muted">
                  Пока уведомлений нет. Новые события по пропускам и отработкам
                  появятся здесь автоматически.
                </Text>
              </div>
            )}
          </Popover.Body>
        </Popover.Content>
      </Popover.Positioner>
    </Popover.Root>
  );
}
