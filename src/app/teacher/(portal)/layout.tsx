import type { ReactNode } from "react";
import { requireRegularTeacherSession } from "@/lib/auth";
import { buildTeacherPortalPayload } from "@/lib/portal-data";
import { TeacherPortalProvider } from "@/components/teacher/teacher-portal-provider";
import { TeacherShell } from "@/components/teacher/teacher-shell";

export default async function TeacherPortalLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requireRegularTeacherSession();
  const portalData = await buildTeacherPortalPayload(session.user.id);

  return (
    <TeacherPortalProvider initialData={portalData}>
      <TeacherShell>{children}</TeacherShell>
    </TeacherPortalProvider>
  );
}
