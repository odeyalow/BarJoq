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
import type { TeacherPortalPayload } from "@/lib/teacher-portal";

interface TeacherPortalContextValue extends TeacherPortalPayload {
  isHydrated: boolean;
  refreshPortal: () => Promise<void>;
  markNotificationRead: (notificationId: string) => Promise<void>;
  clearReadNotifications: () => Promise<void>;
  markNb: (absenceId: string) => Promise<void>;
  saveAssignment: (
    absenceId: string,
    payload: {
      text: string;
      keepAttachmentIds: string[];
      files: File[];
    },
  ) => Promise<void>;
  deleteAssignment: (absenceId: string) => Promise<void>;
  gradeAbsence: (absenceId: string, grade: number) => Promise<void>;
}

const TeacherPortalContext = createContext<TeacherPortalContextValue | null>(null);

export function TeacherPortalProvider({
  children,
  initialData,
}: {
  children: ReactNode;
  initialData: TeacherPortalPayload;
}) {
  const [portalData, setPortalData] = useState<TeacherPortalPayload>(initialData);
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
      const data = (await response.json()) as TeacherPortalPayload & {
        error?: string;
      };

      if (!response.ok) {
        if (response.status === 401 && typeof window !== "undefined") {
          window.location.href = "/teacher";
        }

        throw new Error(data.error ?? "Не удалось обновить данные преподавателя.");
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
      const data = await fetchPortalData("/api/teacher/portal");
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

  const markNb = async (absenceId: string) => {
    await applyPortalMutation(`/api/teacher/absences/${absenceId}/mark-nb`, {
      method: "POST",
    });
  };

  const markNotificationRead = async (notificationId: string) => {
    await applyPortalMutation(`/api/teacher/notifications/${notificationId}/read`, {
      method: "POST",
    });
  };

  const clearReadNotifications = async () => {
    await applyPortalMutation("/api/teacher/notifications/clear-read", {
      method: "POST",
    });
  };

  const saveAssignment = async (
    absenceId: string,
    payload: {
      text: string;
      keepAttachmentIds: string[];
      files: File[];
    },
  ) => {
    const formData = new FormData();
    formData.set("text", payload.text);

    for (const attachmentId of payload.keepAttachmentIds) {
      formData.append("keepAttachmentIds", attachmentId);
    }

    for (const file of payload.files) {
      formData.append("files", file);
    }

    await applyPortalMutation(`/api/teacher/absences/${absenceId}/assignment`, {
      method: "POST",
      body: formData,
    });
  };

  const deleteAssignment = async (absenceId: string) => {
    await applyPortalMutation(`/api/teacher/absences/${absenceId}/assignment`, {
      method: "DELETE",
    });
  };

  const gradeAbsence = async (absenceId: string, grade: number) => {
    await applyPortalMutation(`/api/teacher/absences/${absenceId}/grade`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ grade }),
    });
  };

  return (
    <TeacherPortalContext.Provider
      value={{
        ...portalData,
        isHydrated: true,
        refreshPortal,
        markNotificationRead,
        clearReadNotifications,
        markNb,
        saveAssignment,
        deleteAssignment,
        gradeAbsence,
      }}
    >
      {children}
    </TeacherPortalContext.Provider>
  );
}

export function useTeacherPortal() {
  const value = useContext(TeacherPortalContext);

  if (!value) {
    throw new Error("useTeacherPortal must be used within TeacherPortalProvider");
  }

  return value;
}
