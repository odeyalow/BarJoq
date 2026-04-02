import { NextRequest, NextResponse } from "next/server";
import { requireDepartmentHeadRequestSession } from "@/lib/auth";
import { generateDepartmentHeadWorksheetPdf } from "@/lib/department-head-worksheet";
import type { DepartmentHeadSortMode } from "@/lib/department-head-portal";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await requireDepartmentHeadRequestSession(request);

  if (!session?.user.teacher) {
    return NextResponse.json(
      { error: "Требуется вход зав. отделения." },
      { status: 401 },
    );
  }

  try {
    const url = new URL(request.url);
    const studentId = url.searchParams.get("studentId") ?? undefined;
    const sortMode = (url.searchParams.get("sortMode") ?? "newest") as DepartmentHeadSortMode;
    const pdf = await generateDepartmentHeadWorksheetPdf({
      studentId: studentId === "all" ? undefined : studentId,
      sortMode,
    });

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="rework-sheet-${new Date()
          .toISOString()
          .slice(0, 10)}.pdf"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Не удалось сформировать отработочный лист.",
      },
      { status: 500 },
    );
  }
}
