import { AttachmentOwnerType, AbsenceStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import {
  getStudentOwnedAbsence,
  syncAbsenceAttachments,
} from "@/lib/absence-service";
import { requireStudentRequestSession } from "@/lib/auth";
import { buildStudentPortalPayload } from "@/lib/portal-data";
import { validateExcuseFile } from "@/lib/excuse-file";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requireStudentRequestSession(request);

  if (!session?.user.student) {
    return NextResponse.json(
      { error: "Требуется вход студента." },
      { status: 401 },
    );
  }

  const { id } = await context.params;
  const absence = await getStudentOwnedAbsence(id, session.user.student.id);

  if (!absence) {
    return NextResponse.json({ error: "Пропуск не найден." }, { status: 404 });
  }

  if (absence.status !== AbsenceStatus.MISSED) {
    return NextResponse.json(
      {
        error:
          "Файл уважительной причины можно загрузить только до подачи заявки на отработку.",
      },
      { status: 400 },
    );
  }

  if (absence.markedNbAt) {
    return NextResponse.json(
      { error: "По этому пропуску уже поставлено н/б, загрузка файла недоступна." },
      { status: 400 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Выберите файл уважительной причины или справки." },
      { status: 400 },
    );
  }

  const validationError = validateExcuseFile(file);

  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  await syncAbsenceAttachments({
    absenceId: absence.id,
    ownerType: AttachmentOwnerType.EXCUSE,
    keepAttachmentIds: [],
    files: [file],
  });

  return NextResponse.json(await buildStudentPortalPayload(session.user.id));
}
