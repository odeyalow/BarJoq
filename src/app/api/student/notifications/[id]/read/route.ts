import { NextRequest, NextResponse } from "next/server";
import { requireStudentRequestSession } from "@/lib/auth";
import { markNotificationRead } from "@/lib/notification-service";
import { buildStudentPortalPayload } from "@/lib/portal-data";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requireStudentRequestSession(request);

  if (!session?.user.student) {
    return NextResponse.json({ error: "Требуется вход студента." }, { status: 401 });
  }

  const { id } = await context.params;
  await markNotificationRead(id, session.user.id);
  return NextResponse.json(await buildStudentPortalPayload(session.user.id));
}
