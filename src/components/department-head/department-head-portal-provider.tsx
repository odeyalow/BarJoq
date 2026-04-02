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

  const saveImport = async (payload: {
    reportFile: File;
    scheduleFile?: File | null;
  }) => {
    const formData = new FormData();
    formData.set("reportFile", payload.reportFile);

    if (payload.scheduleFile) {
      formData.set("scheduleFile", payload.scheduleFile);
    }

    const response = await fetch("/api/teacher/head/imports/save", {
      method: "POST",
      credentials: "include",
      body: formData,
    });
    const data = (await response.json()) as DepartmentHeadPortalPayload & {
      error?: string;
    };

    if (!response.ok) {
      if (response.status === 401 && typeof window !== "undefined") {
        window.location.href = "/teacher";
      }

      throw new Error(data.error ?? "Не удалось сохранить импорт.");
    }

    setPortalData(data);
  };

  return (
    <DepartmentHeadPortalContext.Provider
      value={{
        ...portalData,
        isHydrated: true,
        saveImport,
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
