import { NextRequest, NextResponse } from "next/server";
import { requireTeacherRequestSession } from "@/lib/auth";
import { clearReadNotifications } from "@/lib/notification-service";
import { buildTeacherPortalPayload } from "@/lib/portal-data";

export async function POST(request: NextRequest) {
  const session = await requireTeacherRequestSession(request);

  if (!session?.user.teacher) {
    return NextResponse.json(
      { error: "Требуется вход преподавателя." },
      { status: 401 },
    );
  }

  await clearReadNotifications(session.user.id);
  return NextResponse.json(await buildTeacherPortalPayload(session.user.id));
}
