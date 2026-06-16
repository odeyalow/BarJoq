"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { DepartmentHeadPortalPayload } from "@/lib/department-head-portal";

interface DepartmentHeadPortalContextValue extends DepartmentHeadPortalPayload {
  isHydrated: boolean;
  refreshPortal: () => Promise<void>;
  saveImport: (payload: { reportFile: File; scheduleFile?: File | null }) => Promise<void>;
  approvePendingApproval: (absenceId: string) => Promise<void>;
  approveManyPendingApprovals: (absenceIds: string[]) => Promise<void>;
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
  const isRefreshingRef = useRef(false);

  useEffect(() => {
    setPortalData(initialData);
  }, [initialData]);

  const fetchPortalData = useCallback(
    async (input: RequestInfo, init?: RequestInit) => {
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

      return data;
    },
    [],
  );

  const applyPortalMutation = useCallback(
    async (input: RequestInfo, init?: RequestInit) => {
      const data = await fetchPortalData(input, init);
      setPortalData(data);
    },
    [fetchPortalData],
  );

  const refreshPortal = useCallback(async () => {
    if (isRefreshingRef.current) {
      return;
    }

    isRefreshingRef.current = true;

    try {
      const data = await fetchPortalData("/api/teacher/head/portal");
      setPortalData(data);
    } catch {
      // Keep the current snapshot when background refresh fails.
    } finally {
      isRefreshingRef.current = false;
    }
  }, [fetchPortalData]);

  useEffect(() => {
    const handleRefresh = () => {
      if (document.hidden) {
        return;
      }

      void refreshPortal();
    };

    const intervalId = window.setInterval(handleRefresh, 15000);
    window.addEventListener("focus", handleRefresh);
    document.addEventListener("visibilitychange", handleRefresh);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleRefresh);
      document.removeEventListener("visibilitychange", handleRefresh);
    };
  }, [refreshPortal]);

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

  const approveManyPendingApprovals = async (absenceIds: string[]) => {
    await applyPortalMutation("/api/teacher/head/approvals/approve-all", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ absenceIds }),
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
        refreshPortal,
        saveImport,
        approvePendingApproval,
        approveManyPendingApprovals,
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
