import { NextRequest, NextResponse } from "next/server";
import { requireDepartmentHeadRequestSession } from "@/lib/auth";
import { clearReadNotifications } from "@/lib/notification-service";
import { buildDepartmentHeadPortalPayload } from "@/lib/portal-data";

export async function POST(request: NextRequest) {
  const session = await requireDepartmentHeadRequestSession(request);

  if (!session?.user.teacher) {
    return NextResponse.json(
      { error: "Требуется вход зав. отделения." },
      { status: 401 },
    );
  }

  await clearReadNotifications(session.user.id);
  return NextResponse.json(await buildDepartmentHeadPortalPayload(session.user.id));
}
