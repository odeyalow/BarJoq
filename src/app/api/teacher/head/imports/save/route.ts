import { NextRequest, NextResponse } from "next/server";
import { requireDepartmentHeadRequestSession } from "@/lib/auth";
import { commitDepartmentHeadImport } from "@/lib/department-head-import";
import { buildDepartmentHeadPortalPayload } from "@/lib/portal-data";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await requireDepartmentHeadRequestSession(request);

  if (!session?.user.teacher) {
    return NextResponse.json(
      { error: "Требуется вход зав. отделения." },
      { status: 401 },
    );
  }

  try {
    const formData = await request.formData();
    const reportFile = formData.get("reportFile");
    const scheduleFile = formData.get("scheduleFile");

    if (!(reportFile instanceof File) || reportFile.size === 0) {
      return NextResponse.json(
        { error: "Загрузите файл с пропусками." },
        { status: 400 },
      );
    }

    await commitDepartmentHeadImport({
      departmentHeadId: session.user.teacher.id,
      reportFile,
      scheduleFile:
        scheduleFile instanceof File && scheduleFile.size > 0 ? scheduleFile : null,
    });

    return NextResponse.json(await buildDepartmentHeadPortalPayload(session.user.id));
  } catch {
    return NextResponse.json(
      { error: "Не удалось сохранить импорт пропусков." },
      { status: 500 },
    );
  }
}
