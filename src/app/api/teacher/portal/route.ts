import { NextRequest, NextResponse } from "next/server";
import { requireRegularTeacherRequestSession } from "@/lib/auth";
import { buildTeacherPortalPayload } from "@/lib/portal-data";

export async function GET(request: NextRequest) {
  const session = await requireRegularTeacherRequestSession(request);

  if (!session?.user.teacher) {
    return NextResponse.json(
      { error: "Требуется вход преподавателя." },
      { status: 401 },
    );
  }

  return NextResponse.json(await buildTeacherPortalPayload(session.user.id));
}
