import { NextRequest, NextResponse } from "next/server";
import { requireStudentRequestSession } from "@/lib/auth";
import {
  buildWorksheetDownloadFileName,
  generateDepartmentHeadWorksheetPdf,
} from "@/lib/department-head-worksheet";

export const runtime = "nodejs";

function buildContentDisposition(fileName: string) {
  return `attachment; filename="worksheet.pdf"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

export async function GET(request: NextRequest) {
  const session = await requireStudentRequestSession(request);

  if (!session?.user.student) {
    return NextResponse.json(
      { error: "Требуется вход студента." },
      { status: 401 },
    );
  }

  try {
    const url = new URL(request.url);
    const subjectId = url.searchParams.get("subjectId") ?? undefined;
    const pdf = await generateDepartmentHeadWorksheetPdf({
      studentId: session.user.student.id,
      subjectId,
      sortMode: "date",
    });

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Disposition": buildContentDisposition(buildWorksheetDownloadFileName()),
        "Content-Type": "application/pdf",
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
