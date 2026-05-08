"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { DepartmentHeadPortalPayload } from "@/lib/department-head-portal";

interface DepartmentHeadPortalContextValue extends DepartmentHeadPortalPayload {
  isHydrated: boolean;
  saveImport: (payload: { reportFile: File; scheduleFile?: File | null }) => Promise<void>;
  approvePendingApproval: (absenceId: string) => Promise<void>;
  markNotificationRead: (notificationId: string) => Promise<void>;
  clearReadNotifications: () => Promise<void>;
}

const DepartmentHeadPortalContext =
  createContext<DepartmentHeadPortalContextValue | null>(null);

export function DepartmentHeadPortalProvider({
  children,
  initialData,
}: {
  children: ReactNode;
  initialData: DepartmentHeadPortalPayload;
}) {
  const [portalData, setPortalData] =
    useState<DepartmentHeadPortalPayload>(initialData);

  useEffect(() => {
    setPortalData(initialData);
  }, [initialData]);

  const applyPortalMutation = async (
    input: RequestInfo,
    init?: RequestInit,
  ) => {
    const response = await fetch(input, {
      credentials: "include",
      ...init,
    });
    const data = (await response.json()) as DepartmentHeadPortalPayload & {
      error?: string;
    };

    if (!response.ok) {
      if (response.status === 401 && typeof window !== "undefined") {
        window.location.href = "/teacher";
      }

      throw new Error(data.error ?? "Не удалось обновить данные зав. отделения.");
    }

    setPortalData(data);
  };

  const saveImport = async (payload: {
    reportFile: File;
    scheduleFile?: File | null;
  }) => {
    const formData = new FormData();
    formData.set("reportFile", payload.reportFile);

    if (payload.scheduleFile) {
      formData.set("scheduleFile", payload.scheduleFile);
    }

    await applyPortalMutation("/api/teacher/head/imports/save", {
      method: "POST",
      body: formData,
    });
  };

  const approvePendingApproval = async (absenceId: string) => {
    await applyPortalMutation(`/api/teacher/head/absences/${absenceId}/approve`, {
      method: "POST",
    });
  };

  const markNotificationRead = async (notificationId: string) => {
    await applyPortalMutation(`/api/teacher/head/notifications/${notificationId}/read`, {
      method: "POST",
    });
  };

  const clearReadNotifications = async () => {
    await applyPortalMutation("/api/teacher/head/notifications/clear-read", {
      method: "POST",
    });
  };

  return (
    <DepartmentHeadPortalContext.Provider
      value={{
        ...portalData,
        isHydrated: true,
        saveImport,
        approvePendingApproval,
        markNotificationRead,
        clearReadNotifications,
      }}
    >
      {children}
    </DepartmentHeadPortalContext.Provider>
  );
}

export function useDepartmentHeadPortal() {
  const value = useContext(DepartmentHeadPortalContext);

  if (!value) {
    throw new Error(
      "useDepartmentHeadPortal must be used within DepartmentHeadPortalProvider",
    );
  }

  return value;
}
