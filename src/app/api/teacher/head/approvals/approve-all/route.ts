import { NextRequest, NextResponse } from "next/server";
import { requireDepartmentHeadRequestSession } from "@/lib/auth";
import { approvePendingAbsences } from "@/lib/department-head-approvals";
import { buildDepartmentHeadPortalPayload } from "@/lib/portal-data";

export async function POST(request: NextRequest) {
  const session = await requireDepartmentHeadRequestSession(request);

  if (!session?.user.teacher) {
    return NextResponse.json(
      { error: "Требуется вход зав. отделения." },
      { status: 401 },
    );
  }

  const body = (await request.json().catch(() => null)) as
    | { absenceIds?: string[] }
    | null;
  const absenceIds = Array.isArray(body?.absenceIds) ? body.absenceIds : [];

  try {
    await approvePendingAbsences(absenceIds);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Не удалось подтвердить заявки.",
      },
      { status: 400 },
    );
  }

  return NextResponse.json(await buildDepartmentHeadPortalPayload(session.user.id));
}
