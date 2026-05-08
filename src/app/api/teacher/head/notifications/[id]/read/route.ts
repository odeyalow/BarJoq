import { NextRequest, NextResponse } from "next/server";
import { requireDepartmentHeadRequestSession } from "@/lib/auth";
import { markNotificationRead } from "@/lib/notification-service";
import { buildDepartmentHeadPortalPayload } from "@/lib/portal-data";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requireDepartmentHeadRequestSession(request);

  if (!session?.user.teacher) {
    return NextResponse.json(
      { error: "Требуется вход зав. отделения." },
      { status: 401 },
    );
  }

  const { id } = await context.params;
  await markNotificationRead(id, session.user.id);
  return NextResponse.json(await buildDepartmentHeadPortalPayload(session.user.id));
}
