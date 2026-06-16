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
import {
  type AbsenceRecord,
  type StudentNotification,
  type StudentPortalPayload,
  type StudentProfile,
} from "@/lib/student-portal";

interface StudentPortalContextValue {
  student: StudentProfile;
  absences: AbsenceRecord[];
  notifications: StudentNotification[];
  isHydrated: boolean;
  refreshPortal: () => Promise<void>;
  markNotificationRead: (notificationId: string) => Promise<void>;
  clearReadNotifications: () => Promise<void>;
  uploadExcuseFile: (absenceId: string, file: File) => Promise<void>;
  requestAssignment: (absenceId: string) => Promise<void>;
  requestReworkAccess: (absenceId: string) => Promise<void>;
  saveResponse: (
    absenceId: string,
    payload: {
      text: string;
      keepAttachmentIds: string[];
      files: File[];
    },
  ) => Promise<void>;
  deleteResponse: (absenceId: string) => Promise<void>;
}

const StudentPortalContext = createContext<StudentPortalContextValue | null>(null);

export function StudentPortalProvider({
  children,
  initialData,
}: {
  children: ReactNode;
  initialData: StudentPortalPayload;
}) {
  const [portalData, setPortalData] = useState<StudentPortalPayload>(initialData);
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
      const data = (await response.json()) as StudentPortalPayload & {
        error?: string;
      };

      if (!response.ok) {
        if (response.status === 401 && typeof window !== "undefined") {
          window.location.href = "/";
        }

        throw new Error(data.error ?? "Не удалось обновить данные студента.");
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
      const data = await fetchPortalData("/api/student/portal");
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

  const requestAssignment = async (absenceId: string) => {
    await applyPortalMutation(`/api/student/absences/${absenceId}/request`, {
      method: "POST",
    });
  };

  const uploadExcuseFile = async (absenceId: string, file: File) => {
    const formData = new FormData();
    formData.set("file", file);

    await applyPortalMutation(`/api/student/absences/${absenceId}/excuse`, {
      method: "POST",
      body: formData,
    });
  };

  const requestReworkAccess = async (absenceId: string) => {
    await applyPortalMutation(`/api/student/absences/${absenceId}/rework-access`, {
      method: "POST",
    });
  };

  const markNotificationRead = async (notificationId: string) => {
    await applyPortalMutation(`/api/student/notifications/${notificationId}/read`, {
      method: "POST",
    });
  };

  const clearReadNotifications = async () => {
    await applyPortalMutation("/api/student/notifications/clear-read", {
      method: "POST",
    });
  };

  const saveResponse = async (
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

    await applyPortalMutation(`/api/student/absences/${absenceId}/response`, {
      method: "POST",
      body: formData,
    });
  };

  const deleteResponse = async (absenceId: string) => {
    await applyPortalMutation(`/api/student/absences/${absenceId}/response`, {
      method: "DELETE",
    });
  };

  return (
    <StudentPortalContext.Provider
      value={{
        student: portalData.student,
        absences: portalData.absences,
        notifications: portalData.notifications,
        isHydrated: true,
        refreshPortal,
        markNotificationRead,
        clearReadNotifications,
        uploadExcuseFile,
        requestAssignment,
        requestReworkAccess,
        saveResponse,
        deleteResponse,
      }}
    >
      {children}
    </StudentPortalContext.Provider>
  );
}

export function useStudentPortal() {
  const value = useContext(StudentPortalContext);

  if (!value) {
    throw new Error("useStudentPortal must be used within StudentPortalProvider");
  }

  return value;
}
