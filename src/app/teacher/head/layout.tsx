import type { ReactNode } from "react";
import { DepartmentHeadPortalProvider } from "@/components/department-head/department-head-portal-provider";
import { DepartmentHeadShell } from "@/components/department-head/department-head-shell";
import { requireDepartmentHeadSession } from "@/lib/auth";
import { buildDepartmentHeadPortalPayload } from "@/lib/portal-data";

export const dynamic = "force-dynamic";

export default async function DepartmentHeadLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requireDepartmentHeadSession();
  const portalData = await buildDepartmentHeadPortalPayload(session.user.id);

  return (
    <DepartmentHeadPortalProvider initialData={portalData}>
      <DepartmentHeadShell>{children}</DepartmentHeadShell>
    </DepartmentHeadPortalProvider>
  );
}
