const acceptedExcuseExtensions = [
  ".pdf",
  ".docx",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".bmp",
  ".heic",
  ".heif",
] as const;

const acceptedExcuseMimeTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export const acceptedExcuseFileInput = ".pdf,.docx,image/*";
export const excuseFileSizeLimitBytes = 10 * 1024 * 1024;

function getLowercaseExtension(fileName: string) {
  const lastDotIndex = fileName.lastIndexOf(".");

  if (lastDotIndex < 0) {
    return "";
  }

  return fileName.slice(lastDotIndex).toLowerCase();
}

export function validateExcuseFile(file: File) {
  if (!file.size) {
    return "Выберите файл для загрузки.";
  }

  if (file.size > excuseFileSizeLimitBytes) {
    return "Файл слишком большой. Максимальный размер 10 МБ.";
  }

  const extension = getLowercaseExtension(file.name);
  const isAllowedExtension = acceptedExcuseExtensions.includes(
    extension as (typeof acceptedExcuseExtensions)[number],
  );
  const isAllowedMimeType =
    file.type.startsWith("image/") || acceptedExcuseMimeTypes.has(file.type);

  if (!isAllowedExtension && !isAllowedMimeType) {
    return "Поддерживаются только PDF, DOCX и фото.";
  }

  return null;
}
