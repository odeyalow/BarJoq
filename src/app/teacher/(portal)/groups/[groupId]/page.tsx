"use client";

import { ArrowLeft, ChevronRight, CircleCheckBig, CircleX, Mail } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useTeacherPortal } from "@/components/teacher/teacher-portal-provider";
import { Button, Card, Text } from "@/components/ui";
import { countStudentAbsences } from "@/lib/teacher-portal";
import { css } from "styled-system/css";

export default function TeacherGroupDetailPage() {
  const params = useParams<{ groupId: string }>();
  const router = useRouter();
  const { absences, groups, isHydrated, students } = useTeacherPortal();
  const group = groups.find((item) => item.id === params.groupId);

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
            Загрузка группы
          </Text>
          <Text color="fg.muted">Подготавливаем список студентов и пропусков.</Text>
        </Card.Body>
      </Card.Root>
    );
  }

  if (!group) {
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
            Группа не найдена
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

  const groupStudents = students.filter((student) =>
    group.studentIds.includes(student.id),
  );

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
              {group.name}
            </Text>
            <Text color="fg.muted">
              {group.specialty}, {group.course} курс
            </Text>
          </div>
        </Card.Body>
      </Card.Root>

      <section
        className={css({
          display: "grid",
          gap: "4",
        })}
      >
        {groupStudents.map((student, index) => {
          const studentAbsencesCount = countStudentAbsences(absences, student.id);

          return (
            <Card.Root
              key={student.id}
              variant="outline"
              className={`reveal ${css({
                borderColor: "border",
                boxShadow: "sm",
              })}`}
              style={
                {
                  "--reveal-delay": `${index * 60}ms`,
                } as React.CSSProperties
              }
            >
              <Card.Body
                className={css({
                  alignItems: { base: "start", lg: "center" },
                  display: "flex",
                  flexDirection: { base: "column", lg: "row" },
                  gap: "4",
                  justifyContent: "space-between",
                  p: "4.5",
                })}
              >
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
                    {student.fullName}
                  </Text>
                  <div
                    className={css({
                      alignItems: "center",
                      color: "fg.muted",
                      display: "inline-flex",
                      gap: "2",
                    })}
                  >
                    <Mail className={css({ h: "4.5", w: "4.5" })} />
                    {student.email}
                  </div>
                  <Text color="fg.muted">
                    {studentAbsencesCount
                      ? `Имеет ${studentAbsencesCount} пропусков`
                      : "Пропусков нет"}
                  </Text>
                </div>

                <div
                  className={css({
                    alignItems: { base: "stretch", sm: "center" },
                    display: "flex",
                    flexDirection: { base: "column", sm: "row" },
                    gap: "3",
                  })}
                >
                  <div
                    className={css({
                      alignItems: "center",
                      color: studentAbsencesCount ? "amber.plain.fg" : "green.plain.fg",
                      display: "inline-flex",
                      gap: "2",
                    })}
                  >
                    {studentAbsencesCount ? (
                      <CircleX className={css({ h: "4.5", w: "4.5" })} />
                    ) : (
                      <CircleCheckBig className={css({ h: "4.5", w: "4.5" })} />
                    )}
                    {studentAbsencesCount ? "Есть пропуски" : "Без пропусков"}
                  </div>

                  <Button
                    colorPalette="gray"
                    disabled={!studentAbsencesCount}
                    onClick={() => router.push(`/teacher/students/${student.id}`)}
                    variant="surface"
                  >
                    Пропуски студента
                    <ChevronRight />
                  </Button>
                </div>
              </Card.Body>
            </Card.Root>
          );
        })}
      </section>
    </div>
  );
}
