import { NextRequest, NextResponse } from "next/server";
import { requireDepartmentHeadRequestSession } from "@/lib/auth";
import { buildDepartmentHeadImportPreview } from "@/lib/department-head-import";

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

    return NextResponse.json(
      await buildDepartmentHeadImportPreview({
        reportFile,
        scheduleFile:
          scheduleFile instanceof File && scheduleFile.size > 0 ? scheduleFile : null,
      }),
    );
  } catch {
    return NextResponse.json(
      { error: "Не удалось подготовить предпросмотр файла." },
      { status: 500 },
    );
  }
}
