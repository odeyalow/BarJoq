"use client";

import {
  FileClock,
  FileSpreadsheet,
  Save,
  UploadCloud,
  X,
} from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { useDepartmentHeadPortal } from "@/components/department-head/department-head-portal-provider";
import { Button, Card, Dialog, IconButton, Text } from "@/components/ui";
import type { DepartmentHeadImportPreviewPayload } from "@/lib/department-head-portal";
import { css } from "styled-system/css";

type UploadTarget = "report" | "schedule";

export function DepartmentHeadDashboard() {
  const { imports, saveImport } = useDepartmentHeadPortal();
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [scheduleFile, setScheduleFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<DepartmentHeadImportPreviewPayload | null>(null);
  const [previewError, setPreviewError] = useState("");
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const previewAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!reportFile) {
      setPreview(null);
      setDialogOpen(false);
      return;
    }

    previewAbortRef.current?.abort();
    const controller = new AbortController();
    previewAbortRef.current = controller;

    void (async () => {
      setPreviewError("");
      setIsPreviewing(true);

      try {
        const formData = new FormData();
        formData.set("reportFile", reportFile);

        if (scheduleFile) {
          formData.set("scheduleFile", scheduleFile);
        }

        const response = await fetch("/api/teacher/head/imports/preview", {
          method: "POST",
          credentials: "include",
          body: formData,
          signal: controller.signal,
        });

        const data = (await response.json()) as DepartmentHeadImportPreviewPayload & {
          error?: string;
        };

        if (!response.ok) {
          throw new Error(data.error ?? "Не удалось подготовить предпросмотр.");
        }

        setPreview(data);
        setDialogOpen(true);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setPreview(null);
        setPreviewError(
          error instanceof Error
            ? error.message
            : "Не удалось подготовить предпросмотр.",
        );
      } finally {
        setIsPreviewing(false);
      }
    })();

    return () => {
      controller.abort();
    };
  }, [reportFile, scheduleFile]);

  const latestImport = imports[0];

  const handleSave = async () => {
    if (!reportFile) {
      return;
    }

    setIsSaving(true);
    setPreviewError("");

    try {
      await saveImport({
        reportFile,
        scheduleFile,
      });
      setDialogOpen(false);
      setPreview(null);
      setReportFile(null);
      setScheduleFile(null);
    } catch (error) {
      setPreviewError(
        error instanceof Error ? error.message : "Не удалось сохранить импорт.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className={css({
        display: "grid",
        gap: "6",
      })}
    >
      <section
        className={css({
          display: "grid",
          gap: "4",
          gridTemplateColumns: {
            base: "1fr",
            xl: "minmax(0, 1.35fr) minmax(380px, 0.65fr)",
          },
        })}
      >
        <Card.Root
          variant="outline"
          className={css({
            borderColor: "border",
            boxShadow: "sm",
          })}
        >
          <Card.Header>
            <Card.Title
              className={css({
                fontFamily: "var(--font-space-grotesk)",
                fontSize: "2xl",
              })}
            >
              Загрузка отчетов
            </Card.Title>
            <Card.Description>
              Перетащите Excel-файл с пропусками и, при необходимости, файл
              расписания. После выбора откроется модальное окно с предпросмотром
              перед сохранением в базу.
            </Card.Description>
          </Card.Header>

          <Card.Body
            className={css({
              gap: "4",
            })}
          >
            <div
              className={css({
                display: "grid",
                gap: "4",
                gridTemplateColumns: {
                  base: "1fr",
                  md: "repeat(2, minmax(0, 1fr))",
                },
              })}
            >
              <UploadDropzone
                description="Формат XLSX/XLS/CSV с колонками фамилия, имя, группа, дата и время."
                file={reportFile}
                label="Файл с пропусками"
                loading={isPreviewing}
                onFileSelect={(file) => setReportFile(file)}
                type="report"
              />
              <UploadDropzone
                description="Необязательный файл. Используется для подстановки предмета, преподавателя и аудитории."
                file={scheduleFile}
                loading={isPreviewing}
                label="Файл расписания"
                onFileSelect={(file) => setScheduleFile(file)}
                type="schedule"
              />
            </div>

            <div
              className={css({
                alignItems: "center",
                bg: "gray.subtle.bg",
                borderRadius: "l2",
                display: "flex",
                flexDirection: { base: "column", md: "row" },
                gap: "4",
                justifyContent: "space-between",
                p: "4",
              })}
            >
              <div
                className={css({
                  display: "grid",
                  gap: "1",
                })}
              >
                <Text
                  className={css({
                    fontWeight: "semibold",
                  })}
                >
                  Предпросмотр формируется автоматически
                </Text>
                <Text color="fg.muted">
                  Как только выбран основной файл с пропусками, система читает
                  его структуру и открывает модалку проверки данных.
                </Text>
              </div>

              <Button
                colorPalette="gray"
                disabled={!reportFile || isPreviewing}
                onClick={() => setDialogOpen(true)}
                variant="surface"
              >
                <FileClock />
                {isPreviewing ? "Читаем файл..." : "Открыть предпросмотр"}
              </Button>
            </div>

            {previewError ? (
              <div
                className={css({
                  bg: "red.subtle.bg",
                  borderRadius: "l2",
                  color: "red.plain.fg",
                  p: "3.5",
                })}
              >
                <Text>{previewError}</Text>
              </div>
            ) : null}
          </Card.Body>
        </Card.Root>

        <Card.Root variant="outline">
          <Card.Header>
            <Card.Title
              className={css({
                fontFamily: "var(--font-space-grotesk)",
                fontSize: "2xl",
              })}
            >
              Последний импорт
            </Card.Title>
            <Card.Description>
              Быстрая сводка по последнему сохраненному пакету пропусков.
            </Card.Description>
          </Card.Header>

          <Card.Body
            className={css({
              gap: "4",
            })}
          >
            {latestImport ? (
              <>
                <QuickStat
                  label="Создано пропусков"
                  value={String(latestImport.importedAbsencesCount)}
                />
                <QuickStat
                  label="Затронуто студентов"
                  value={String(latestImport.matchedStudentsCount)}
                />
                <QuickStat
                  label="Проблемных строк"
                  value={String(latestImport.unmatchedRowsCount)}
                />
                <div
                  className={css({
                    bg: "gray.subtle.bg",
                    borderRadius: "l2",
                    display: "grid",
                    gap: "2",
                    p: "3.5",
                  })}
                >
                  <Text
                    className={css({
                      fontWeight: "semibold",
                    })}
                  >
                    Файлы
                  </Text>
                  <ImportFileLink
                    href={latestImport.reportFile.href}
                    label={latestImport.reportFile.name}
                    sizeLabel={latestImport.reportFile.sizeLabel}
                  />
                  {latestImport.scheduleFile ? (
                    <ImportFileLink
                      href={latestImport.scheduleFile.href}
                      label={latestImport.scheduleFile.name}
                      sizeLabel={latestImport.scheduleFile.sizeLabel}
                    />
                  ) : null}
                </div>
              </>
            ) : (
              <EmptyStateText>
                Пока импортов нет. После сохранения отчета здесь появится
                краткая сводка по последнему пакету.
              </EmptyStateText>
            )}
          </Card.Body>
        </Card.Root>
      </section>

      <section
        className={css({
          display: "grid",
          gap: "4",
        })}
      >
        <div
          className={css({
            alignItems: "center",
            display: "flex",
            flexWrap: "wrap",
            gap: "3",
            justifyContent: "space-between",
          })}
        >
          <div>
            <Text
              className={css({
                fontFamily: "var(--font-space-grotesk)",
                fontSize: "2xl",
                fontWeight: "700",
              })}
            >
              История импортов
            </Text>
            <Text color="fg.muted">
              Сохраненные партии пропусков, связанные файлы и сводка по созданным
              карточкам.
            </Text>
          </div>
          <div
            className={css({
              alignItems: "center",
              bg: "teal.subtle.bg",
              borderRadius: "full",
              color: "teal.plain.fg",
              display: "inline-flex",
              gap: "2",
              px: "3.5",
              py: "2",
            })}
          >
            <FileSpreadsheet className={css({ h: "4", w: "4" })} />
            {imports.length} импортов
          </div>
        </div>

        {imports.length ? (
          <div
            className={css({
              display: "grid",
              gap: "4",
              gridTemplateColumns: {
                base: "1fr",
                lg: "repeat(2, minmax(0, 1fr))",
              },
            })}
          >
            {imports.map((item) => (
              <Card.Root key={item.id} variant="outline">
                <Card.Header>
                  <Card.Title
                    className={css({
                      fontSize: "lg",
                    })}
                  >
                    Импорт от {new Date(item.createdAt).toLocaleString("ru-RU")}
                  </Card.Title>
                  <Card.Description>
                    Группы: {item.groups.join(", ") || "не определены"}.
                    Предметы: {item.subjects.join(", ") || "не определены"}.
                  </Card.Description>
                </Card.Header>
                <Card.Body
                  className={css({
                    gap: "4",
                  })}
                >
                  <div
                    className={css({
                      display: "grid",
                      gap: "3",
                      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                    })}
                  >
                    <QuickStat
                      label="Пропуски"
                      value={String(item.importedAbsencesCount)}
                    />
                    <QuickStat
                      label="Студенты"
                      value={String(item.matchedStudentsCount)}
                    />
                    <QuickStat
                      label="Ошибки"
                      value={String(item.unmatchedRowsCount)}
                    />
                  </div>

                  <div
                    className={css({
                      display: "grid",
                      gap: "2.5",
                    })}
                  >
                    <ImportFileLink
                      href={item.reportFile.href}
                      label={item.reportFile.name}
                      sizeLabel={item.reportFile.sizeLabel}
                    />
                    {item.scheduleFile ? (
                      <ImportFileLink
                        href={item.scheduleFile.href}
                        label={item.scheduleFile.name}
                        sizeLabel={item.scheduleFile.sizeLabel}
                      />
                    ) : (
                      <Text color="fg.muted">
                        Файл расписания для этой загрузки не прикреплялся.
                      </Text>
                    )}
                  </div>
                </Card.Body>
              </Card.Root>
            ))}
          </div>
        ) : (
          <Card.Root variant="outline">
            <Card.Body
              className={css({
                py: "8",
              })}
            >
              <EmptyStateText>
                История импортов пока пустая. Первый сохраненный Excel-файл
                появится здесь отдельной карточкой.
              </EmptyStateText>
            </Card.Body>
          </Card.Root>
        )}
      </section>

      <ImportPreviewDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        preview={preview}
        previewError={previewError}
        isPreviewing={isPreviewing}
        isSaving={isSaving}
        onSave={handleSave}
      />
    </div>
  );
}

function UploadDropzone({
  label,
  description,
  file,
  onFileSelect,
  loading,
  type,
}: {
  label: string;
  description: string;
  file: File | null;
  onFileSelect: (file: File | null) => void;
  loading: boolean;
  type: UploadTarget;
}) {
  const inputId = useId();

  return (
    <label
      htmlFor={inputId}
      onDragOver={(event) => {
        event.preventDefault();
      }}
      onDrop={(event) => {
        event.preventDefault();
        const droppedFile = event.dataTransfer.files[0];
        onFileSelect(droppedFile ?? null);
      }}
      className={css({
        bg: "gray.subtle.bg",
        border: "1.5px dashed",
        borderColor: file ? "teal.8" : "border",
        borderRadius: "l3",
        cursor: "pointer",
        display: "grid",
        gap: "3",
        minH: "220px",
        p: "5",
        placeItems: "center",
        textAlign: "center",
        transitionDuration: "normal",
        transitionProperty: "border-color, background-color, transform",
        _hover: {
          borderColor: "teal.8",
          bg: "gray.surface.bg",
          transform: "translateY(-1px)",
        },
      })}
    >
      <input
        id={inputId}
        accept=".xlsx,.xls,.csv"
        hidden
        type="file"
        onChange={(event) => {
          const nextFile = event.target.files?.[0] ?? null;
          onFileSelect(nextFile);
        }}
      />

      <div
        className={css({
          alignItems: "center",
          bg: file ? "teal.subtle.bg" : "gray.surface.bg",
          borderRadius: "full",
          color: file ? "teal.plain.fg" : "fg.default",
          display: "flex",
          h: "14",
          justifyContent: "center",
          w: "14",
        })}
      >
        <UploadCloud className={css({ h: "6", w: "6" })} />
      </div>

      <div
        className={css({
          display: "grid",
          gap: "1.5",
        })}
      >
        <Text
          className={css({
            fontWeight: "semibold",
            textStyle: "lg",
          })}
        >
          {label}
        </Text>
        <Text color="fg.muted">{description}</Text>
      </div>

      <div
        className={css({
          bg: "gray.surface.bg",
          borderRadius: "l2",
          display: "grid",
          gap: "1",
          minW: "full",
          p: "3.5",
        })}
      >
        <Text
          className={css({
            color: file ? "fg.default" : "fg.muted",
            fontWeight: file ? "semibold" : "medium",
          })}
        >
          {file ? file.name : "Файл еще не выбран"}
        </Text>
        <Text color="fg.muted">
          {file
            ? `${Math.max(1, Math.round(file.size / 1024))} KB`
            : type === "report"
              ? "Этот файл обязателен"
              : "Можно загрузить позже или не прикреплять"}
        </Text>
      </div>

      {loading ? <Text color="teal.plain.fg">Читаем структуру файла...</Text> : null}
    </label>
  );
}

function QuickStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      className={css({
        bg: "gray.subtle.bg",
        borderRadius: "l2",
        display: "grid",
        gap: "1.5",
        p: "3.5",
      })}
    >
      <Text
        className={css({
          color: "fg.muted",
          textStyle: "xs",
        })}
      >
        {label}
      </Text>
      <Text
        className={css({
          fontFamily: "var(--font-space-grotesk)",
          fontSize: "2xl",
          fontWeight: "700",
          lineHeight: "1",
        })}
      >
        {value}
      </Text>
    </div>
  );
}

function ImportFileLink({
  href,
  label,
  sizeLabel,
}: {
  href: string;
  label: string;
  sizeLabel: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={css({
        alignItems: "center",
        bg: "gray.subtle.bg",
        borderRadius: "l2",
        color: "fg.default",
        display: "flex",
        gap: "3",
        p: "3",
        textDecoration: "none",
        transitionDuration: "normal",
        transitionProperty: "background-color, transform",
        _hover: {
          bg: "gray.surface.bg",
          transform: "translateY(-1px)",
        },
      })}
    >
      <FileSpreadsheet
        aria-hidden="true"
        className={css({
          color: "teal.10",
          h: "5",
          w: "5",
        })}
      />
      <div
        className={css({
          display: "grid",
          gap: "0.5",
          minW: 0,
        })}
      >
        <Text
          className={css({
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          })}
        >
          {label}
        </Text>
        <Text color="fg.muted">{sizeLabel}</Text>
      </div>
    </a>
  );
}

function EmptyStateText({ children }: { children: ReactNode }) {
  return <Text color="fg.muted">{children}</Text>;
}

function ImportPreviewDialog({
  open,
  onOpenChange,
  preview,
  previewError,
  isPreviewing,
  isSaving,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preview: DepartmentHeadImportPreviewPayload | null;
  previewError: string;
  isPreviewing: boolean;
  isSaving: boolean;
  onSave: () => Promise<void>;
}) {
  const problemRows = useMemo(
    () => preview?.rows.filter((row) => row.studentState !== "matched") ?? [],
    [preview],
  );
  const problemNotes = useMemo(
    () => [...new Set(problemRows.flatMap((row) => row.notes))],
    [problemRows],
  );
  const [view, setView] = useState<"preview" | "problems">("preview");

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(details) => {
        if (!details.open) {
          setView("preview");
        }
        onOpenChange(details.open);
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner
          className={css({
            px: { base: "4", md: "6" },
          })}
        >
          <Dialog.Content
            className={css({
              border: "1px solid",
              borderColor: "border",
              maxW: "1320px",
              w: "full",
            })}
          >
            <Dialog.Header>
              <Dialog.Title>
                {view === "preview" ? "Предпросмотр импорта" : "Проблемные студенты"}
              </Dialog.Title>
              <Dialog.Description>
                {view === "preview"
                  ? "Проверьте данные студентов из отчета перед сохранением."
                  : "Студенты, которых не удалось сопоставить с базой."}
              </Dialog.Description>
            </Dialog.Header>

            <Dialog.CloseTrigger asChild>
              <IconButton
                aria-label="Close dialog"
                colorPalette="gray"
                size="sm"
                variant="plain"
              >
                <X />
              </IconButton>
            </Dialog.CloseTrigger>

            <Dialog.Body
              className={css({
                gap: "5",
                maxH: "76vh",
                overflowY: "auto",
              })}
            >
              {isPreviewing ? (
                <Text color="fg.muted">Подготавливаем структуру файла...</Text>
              ) : preview ? (
                <>
                  <div
                    className={css({
                      display: "grid",
                      gap: "3",
                      gridTemplateColumns: {
                        base: "repeat(2, minmax(0, 1fr))",
                        lg: "repeat(5, minmax(0, 1fr))",
                      },
                    })}
                  >
                    <QuickStat label="Готово к импорту" value={String(preview.summary.readyCount)} />
                    <QuickStat label="Найдено" value={String(preview.summary.matchedRowsCount)} />
                    <QuickStat label="Не найдено" value={String(preview.summary.missingRowsCount)} />
                    <QuickStat label="Ошибки" value={String(preview.summary.invalidRowsCount)} />
                    <QuickStat label="Строки расписания" value={String(preview.summary.scheduleRowsCount)} />
                  </div>

                  {view === "preview" ? (
                    <>
                      {problemRows.length ? (
                        <div
                          className={css({
                            alignItems: { base: "start", md: "center" },
                            bg: "amber.subtle.bg",
                            border: "1px solid",
                            borderColor: "amber.7",
                            borderRadius: "l3",
                            color: "amber.plain.fg",
                            display: "flex",
                            flexDirection: { base: "column", md: "row" },
                            gap: "3",
                            justifyContent: "space-between",
                            p: "4",
                          })}
                        >
                          <div
                            className={css({
                              display: "grid",
                              gap: "1",
                            })}
                          >
                            <Text className={css({ fontWeight: "700" })}>
                              Есть проблемные строки: {problemRows.length}
                            </Text>
                            <Text>
                              Эти студенты не будут импортированы. Подробный список можно открыть отдельно.
                            </Text>
                          </div>

                          <Button
                            colorPalette="gray"
                            variant="surface"
                            onClick={() => setView("problems")}
                          >
                            Подробнее
                          </Button>
                        </div>
                      ) : null}

                      <PreviewTableCard title={
                        'Данные из отчета (' + preview.rows.length + ')'
                      }>
                        <PreviewTable
                          columns={[
                            "Студент",
                            "Группа",
                            "Дата",
                            "Предмет",
                            "Преподаватель",
                          ]}
                          rows={preview.rows.map((row) => [
                            row.fullName,
                            row.group,
                            row.date,
                            row.subject,
                            row.teacherName,
                          ])}
                        />
                      </PreviewTableCard>
                    </>
                  ) : (
                    <PreviewTableCard title={
                      'Проблемные студенты (' + problemRows.length + ')'
                    }>
                      <div
                        className={css({
                          display: "grid",
                          gap: "3",
                        })}
                      >
                        {problemNotes.length ? (
                          <div
                            className={css({
                              bg: "amber.subtle.bg",
                              borderRadius: "l2",
                              color: "amber.plain.fg",
                              display: "grid",
                              gap: "1.5",
                              p: "3",
                            })}
                          >
                            {problemNotes.map((note) => (
                              <Text key={note}>{note}</Text>
                            ))}
                          </div>
                        ) : null}

                        <div
                          className={css({
                            display: "grid",
                            gap: "2",
                          })}
                        >
                          {problemRows.map((row) => (
                            <div
                              key={row.rowNumber}
                              className={css({
                                bg: "red.subtle.bg",
                                borderRadius: "l2",
                                color: "red.plain.fg",
                                display: "grid",
                                gap: "0.5",
                                p: "3",
                              })}
                            >
                              <Text className={css({ fontWeight: "700" })}>
                                {row.fullName || "Без имени"}
                              </Text>
                              <Text>
                                {row.group} - {row.date}
                              </Text>
                            </div>
                          ))}
                        </div>
                      </div>
                    </PreviewTableCard>
                  )}
                </>
              ) : (
                <Text color="fg.muted">Выберите файл с пропусками, чтобы открыть предпросмотр.</Text>
              )}

              {previewError ? (
                <div
                  className={css({
                    bg: "red.subtle.bg",
                    borderRadius: "l2",
                    color: "red.plain.fg",
                    p: "3.5",
                  })}
                >
                  <Text>{previewError}</Text>
                </div>
              ) : null}
            </Dialog.Body>

            <Dialog.Footer>
              {view === "preview" ? (
                <>
                  <Dialog.ActionTrigger asChild>
                    <Button colorPalette="gray" variant="surface">
                      Отменить
                    </Button>
                  </Dialog.ActionTrigger>
                  <Button
                    colorPalette="teal"
                    disabled={!preview || isPreviewing || isSaving}
                    onClick={() => {
                      void onSave();
                    }}
                  >
                    <Save />
                    {isSaving ? "Сохраняем..." : "Сохранить"}
                  </Button>
                </>
              ) : (
                <Button
                  colorPalette="gray"
                  variant="surface"
                  onClick={() => setView("preview")}
                >
                  Назад к предпросмотру
                </Button>
              )}
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function PreviewTableCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={css({
        border: "1px solid",
        borderColor: "border",
        borderRadius: "l3",
        display: "grid",
        gap: "3",
        p: "4",
        w: "full",
      })}
    >
      <div
        className={css({
          display: "grid",
          gap: "1",
        })}
      >
        <Text
          className={css({
            fontWeight: "semibold",
            textStyle: "lg",
          })}
        >
          {title}
        </Text>
        {description ? <Text color="fg.muted">{description}</Text> : null}
      </div>
      {children}
    </div>
  );
}

function PreviewTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: string[][];
}) {
  return (
    <div
      className={css({
        border: "1px solid",
        borderColor: "border",
        borderRadius: "l2",
        overflow: "auto",
        w: "full",
      })}
    >
      <table
        className={css({
          borderCollapse: "collapse",
          minW: "full",
          w: "full",
        })}
      >
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column}
                className={css({
                  bg: "gray.subtle.bg",
                  borderBottom: "1px solid",
                  borderColor: "border",
                  fontWeight: "semibold",
                  px: "3",
                  py: "2.5",
                  textAlign: "left",
                  textStyle: "sm",
                  whiteSpace: "nowrap",
                })}
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={`${rowIndex}-${row[0] ?? "row"}`}>
              {row.map((cell, cellIndex) => (
                <td
                  key={`${rowIndex}-${cellIndex}`}
                  className={css({
                    borderBottom:
                      rowIndex === rows.length - 1 ? "none" : "1px solid",
                    borderColor: "border",
                    px: "3",
                    py: "2.5",
                    textStyle: "sm",
                    whiteSpace: "nowrap",
                  })}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
