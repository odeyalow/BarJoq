import { mkdir, rm, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { AttachmentOwnerType } from "@prisma/client";

const publicDirectory = path.join(process.cwd(), "public");

function sanitizeFileName(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

export function formatFileSize(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function getAttachmentDirectory(absenceId: string, ownerType: AttachmentOwnerType) {
  return path.join(
    publicDirectory,
    "uploads",
    "absences",
    absenceId,
    ownerType.toLowerCase(),
  );
}

export async function saveUploadedFiles({
  absenceId,
  ownerType,
  files,
}: {
  absenceId: string;
  ownerType: AttachmentOwnerType;
  files: File[];
}) {
  const targetDirectory = getAttachmentDirectory(absenceId, ownerType);
  await mkdir(targetDirectory, { recursive: true });

  const createdAt = Date.now();

  return Promise.all(
    files.map(async (file, index) => {
      const safeName = sanitizeFileName(file.name) || `file-${index + 1}`;
      const fileName = `${createdAt}-${index}-${safeName}`;
      const absolutePath = path.join(targetDirectory, fileName);
      const relativeHref = `/uploads/absences/${absenceId}/${ownerType.toLowerCase()}/${fileName}`;

      await writeFile(absolutePath, Buffer.from(await file.arrayBuffer()));

      return {
        name: file.name,
        href: relativeHref,
        sizeLabel: formatFileSize(file.size),
      };
    }),
  );
}

export async function deleteFilesByHref(hrefs: string[]) {
  await Promise.all(
    hrefs.map(async (href) => {
      const relativePath = href.replace(/^\/+/, "");
      const absolutePath = path.join(publicDirectory, relativePath);

      try {
        await unlink(absolutePath);
      } catch {
        return;
      }
    }),
  );
}

export async function clearAttachmentDirectory(
  absenceId: string,
  ownerType: AttachmentOwnerType,
) {
  try {
    await rm(getAttachmentDirectory(absenceId, ownerType), {
      recursive: true,
      force: true,
    });
  } catch {
    return;
  }
}
