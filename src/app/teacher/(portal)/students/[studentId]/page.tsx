"use client";

import type { ReactNode } from "react";
import { ArrowLeft, Mail, UserSquare2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { TeacherAbsenceCard } from "@/components/teacher/teacher-absence-card";
import { useTeacherPortal } from "@/components/teacher/teacher-portal-provider";
import { Button, Card, Text } from "@/components/ui";
import { css } from "styled-system/css";

export default function TeacherStudentAbsencesPage() {
  const params = useParams<{ studentId: string }>();
  const router = useRouter();
  const { absences, isHydrated, students } = useTeacherPortal();
  const student = students.find((item) => item.id === params.studentId);
  const studentAbsences = absences.filter(
    (absence) => absence.studentId === params.studentId,
  );

  if (!isHydrated) {
    return (
      <Card.Root variant="outline">
        <Card.Body
          className={css({
            gap: "3",
            py: "8",
          })}
        >
          <Text
            className={css({
              fontFamily: "var(--font-space-grotesk)",
              fontSize: "2xl",
              fontWeight: "700",
            })}
          >
            Загрузка студента
          </Text>
          <Text color="fg.muted">
            Подготавливаем все пропуски выбранного студента.
          </Text>
        </Card.Body>
      </Card.Root>
    );
  }

  if (!student) {
    return (
      <Card.Root variant="outline">
        <Card.Body
          className={css({
            gap: "4",
            py: "8",
          })}
        >
          <Text
            className={css({
              fontFamily: "var(--font-space-grotesk)",
              fontSize: "2xl",
              fontWeight: "700",
            })}
          >
            Студент не найден
          </Text>
          <Button
            alignSelf="start"
            colorPalette="gray"
            onClick={() => router.push("/teacher/groups")}
            variant="surface"
          >
            Вернуться к группам
          </Button>
        </Card.Body>
      </Card.Root>
    );
  }

  return (
    <div
      className={css({
        display: "grid",
        gap: "6",
      })}
    >
      <Card.Root variant="outline">
        <Card.Body
          className={css({
            gap: "4",
            p: { base: "5", md: "6" },
          })}
        >
          <Button
            alignSelf="start"
            colorPalette="gray"
            onClick={() => router.push("/teacher/groups")}
            variant="plain"
          >
            <ArrowLeft />
            Назад к группам
          </Button>

          <div
            className={css({
              display: "grid",
              gap: "2",
            })}
          >
            <Text
              className={css({
                fontFamily: "var(--font-space-grotesk)",
                fontSize: { base: "3xl", md: "4xl" },
                fontWeight: "700",
                lineHeight: "1.05",
              })}
            >
              {student.fullName}
            </Text>
            <Text color="fg.muted">
              {student.group}, {student.course} курс
            </Text>
          </div>

          <div
            className={css({
              display: "grid",
              gap: "3",
              gridTemplateColumns: {
                base: "1fr",
                md: "repeat(3, minmax(0, 1fr))",
              },
            })}
          >
            <InfoTile
              icon={<UserSquare2 className={css({ h: "4.5", w: "4.5" })} />}
              label="Возраст"
              value={`${student.age} лет`}
            />
            <InfoTile
              icon={<Mail className={css({ h: "4.5", w: "4.5" })} />}
              label="Email"
              value={student.email}
            />
            <InfoTile
              icon={<UserSquare2 className={css({ h: "4.5", w: "4.5" })} />}
              label="Пропусков"
              value={String(studentAbsences.length)}
            />
          </div>
        </Card.Body>
      </Card.Root>

      {studentAbsences.length ? (
        <section
          className={css({
            display: "grid",
            gap: "4",
            gridTemplateColumns: {
              base: "1fr",
              xl: "repeat(2, minmax(0, 1fr))",
            },
          })}
        >
          {studentAbsences.map((absence, index) => (
            <TeacherAbsenceCard key={absence.id} absence={absence} index={index} />
          ))}
        </section>
      ) : (
        <Card.Root variant="outline">
          <Card.Body
            className={css({
              gap: "3",
              py: "8",
            })}
          >
            <Text
              className={css({
                fontFamily: "var(--font-space-grotesk)",
                fontSize: "2xl",
                fontWeight: "700",
              })}
            >
              У студента нет пропусков
            </Text>
            <Text color="fg.muted">
              По вашим дисциплинам для этого студента пока нет зафиксированных
              пропусков.
            </Text>
          </Card.Body>
        </Card.Root>
      )}
    </div>
  );
}

function InfoTile({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div
      className={css({
        bg: "gray.subtle.bg",
        borderRadius: "l2",
        display: "grid",
        gap: "2",
        p: "3.5",
      })}
    >
      <div
        className={css({
          alignItems: "center",
          color: "fg.muted",
          display: "inline-flex",
          gap: "2",
        })}
      >
        {icon}
        {label}
      </div>
      <Text
        className={css({
          fontWeight: "semibold",
          lineHeight: "1.5",
        })}
      >
        {value}
      </Text>
    </div>
  );
}
