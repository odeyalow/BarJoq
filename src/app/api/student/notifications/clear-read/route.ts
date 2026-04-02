import { NextRequest, NextResponse } from "next/server";
import { requireStudentRequestSession } from "@/lib/auth";
import { clearReadNotifications } from "@/lib/notification-service";
import { buildStudentPortalPayload } from "@/lib/portal-data";

export async function POST(request: NextRequest) {
  const session = await requireStudentRequestSession(request);

  if (!session?.user.student) {
    return NextResponse.json({ error: "Требуется вход студента." }, { status: 401 });
  }

  await clearReadNotifications(session.user.id);
  return NextResponse.json(await buildStudentPortalPayload(session.user.id));
}
