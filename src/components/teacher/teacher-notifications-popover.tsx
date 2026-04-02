"use client";

import { useRouter } from "next/navigation";
import { PortalNotificationsPopover } from "@/components/notifications/portal-notifications-popover";
import { useTeacherPortal } from "@/components/teacher/teacher-portal-provider";

export function TeacherNotificationsPopover() {
  const router = useRouter();
  const { notifications, markNotificationRead, clearReadNotifications } =
    useTeacherPortal();

  return (
    <PortalNotificationsPopover
      actionLabel="Подробнее"
      ariaLabel="Открыть уведомления преподавателя"
      description="Заявки студентов, отправленные ответы и новые пропуски по вашим группам."
      notifications={notifications}
      onClearRead={clearReadNotifications}
      onNotificationOpen={async (notification) => {
        await markNotificationRead(notification.id);
        router.push(
          notification.targetHref ??
            `/teacher/absences/${notification.absenceId}`,
        );
      }}
    />
  );
}
