"use client";

import { useRouter } from "next/navigation";
import { PortalNotificationsPopover } from "@/components/notifications/portal-notifications-popover";
import { useDepartmentHeadPortal } from "@/components/department-head/department-head-portal-provider";

export function DepartmentHeadNotificationsPopover() {
  const router = useRouter();
  const { notifications, markNotificationRead, clearReadNotifications } =
    useDepartmentHeadPortal();

  return (
    <PortalNotificationsPopover
      actionLabel="Подробнее"
      ariaLabel="Открыть уведомления зав. отделения"
      description="Подтверждения заявок, новые импорты и другие события кабинета зав. отделения."
      notifications={notifications}
      onClearRead={clearReadNotifications}
      onNotificationOpen={async (notification) => {
        await markNotificationRead(notification.id);
        router.push(
          notification.targetHref ?? "/teacher/head/approvals",
        );
      }}
    />
  );
}
