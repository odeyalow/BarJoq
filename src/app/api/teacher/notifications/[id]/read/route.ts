import { NextRequest, NextResponse } from "next/server";
import { requireTeacherRequestSession } from "@/lib/auth";
import { markNotificationRead } from "@/lib/notification-service";
import { buildTeacherPortalPayload } from "@/lib/portal-data";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requireTeacherRequestSession(request);

  if (!session?.user.teacher) {
    return NextResponse.json(
      { error: "Требуется вход преподавателя." },
      { status: 401 },
    );
  }

  const { id } = await context.params;
  await markNotificationRead(id, session.user.id);
  return NextResponse.json(await buildTeacherPortalPayload(session.user.id));
}
