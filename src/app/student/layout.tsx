import type { ReactNode } from "react";
import { requireStudentSession } from "@/lib/auth";
import { buildStudentPortalPayload } from "@/lib/portal-data";
import { StudentPortalProvider } from "@/components/student/student-portal-provider";
import { StudentShell } from "@/components/student/student-shell";

export const dynamic = "force-dynamic";

export default async function StudentLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requireStudentSession();
  const portalData = await buildStudentPortalPayload(session.user.id);

  return (
    <StudentPortalProvider initialData={portalData}>
      <StudentShell>{children}</StudentShell>
    </StudentPortalProvider>
  );
}
