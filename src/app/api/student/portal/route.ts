import { NextRequest, NextResponse } from "next/server";
import { requireStudentRequestSession } from "@/lib/auth";
import { buildStudentPortalPayload } from "@/lib/portal-data";

export async function GET(request: NextRequest) {
  const session = await requireStudentRequestSession(request);

  if (!session?.user.student) {
    return NextResponse.json(
      { error: "Требуется вход студента." },
      { status: 401 },
    );
  }

  return NextResponse.json(await buildStudentPortalPayload(session.user.id));
}
