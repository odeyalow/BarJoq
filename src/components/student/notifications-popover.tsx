"use client";

import { useRouter } from "next/navigation";
import { PortalNotificationsPopover } from "@/components/notifications/portal-notifications-popover";
import { useStudentPortal } from "@/components/student/student-portal-provider";

export function NotificationsPopover() {
  const router = useRouter();
  const { notifications, markNotificationRead, clearReadNotifications } =
    useStudentPortal();

  return (
    <PortalNotificationsPopover
      ariaLabel="Открыть уведомления"
      description="Изменения статусов, ответы преподавателей и новые пропуски."
      notifications={notifications}
      onClearRead={clearReadNotifications}
      onNotificationOpen={async (notification) => {
        await markNotificationRead(notification.id);
        router.push(
          notification.targetHref ??
            `/student/absences/${notification.absenceId}`,
        );
      }}
    />
  );
}
