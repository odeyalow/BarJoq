"use client";

import { usePathname, useRouter } from "next/navigation";
import { AssistantDock } from "@/components/assistant/assistant-dock";
import { AssistantReferenceCard } from "@/components/assistant/assistant-reference-card";
import { TeacherStatusBadge } from "@/components/teacher/teacher-status-badge";
import { useTeacherPortal } from "@/components/teacher/teacher-portal-provider";
import type { TeacherAssistantSnapshot } from "@/lib/assistant";
import { countStudentAbsences } from "@/lib/teacher-portal";
import { formatCompactDate } from "@/lib/student-portal";
import { css } from "styled-system/css";

export function TeacherAssistantDock({
  open,
  onOpenChange,
  layout,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  layout?: "mobile" | "desktop";
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { absences, groups, students, teacher } = useTeacherPortal();

  const snapshot: TeacherAssistantSnapshot = {
    role: "teacher",
    currentPage: pathname,
    teacher: {
      fullName: teacher.fullName,
      groups: teacher.groups,
      subjects: teacher.subjects,
    },
    groups: groups.map((group) => ({
      id: group.id,
      name: group.name,
      course: group.course,
      specialty: group.specialty,
      studentIds: group.studentIds,
    })),
    students: students.map((student) => ({
      id: student.id,
      fullName: student.fullName,
      group: student.group,
      course: student.course,
      email: student.email,
      absenceCount: countStudentAbsences(absences, student.id),
    })),
    absences: absences.map((absence) => ({
      id: absence.id,
      studentId: absence.studentId,
      studentFullName: absence.studentFullName,
      studentGroup: absence.studentGroup,
      subject: absence.subject,
      date: absence.date,
      lessonLabel: absence.lessonLabel,
      status: absence.status,
      classroom: absence.classroom,
      grade: absence.grade,
      markedNbAt: absence.markedNbAt,
      assignmentSentAt: absence.assignment?.editedAt ?? absence.assignment?.sentAt,
      responseSubmittedAt:
        absence.response?.editedAt ?? absence.response?.submittedAt,
      gradedAt: absence.gradedAt,
    })),
  };

  return (
    <AssistantDock
      open={open}
      onOpenChange={onOpenChange}
      layout={layout}
      role="teacher"
      snapshot={snapshot}
      subtitle="AI-помощник преподавателя по заявкам, заданиям, группам и оценкам"
      title="BarJoq AI"
      renderReferences={(message) => {
        const relatedAbsences = absences.filter((absence) =>
          message.relatedAbsenceIds?.includes(absence.id),
        );
        const relatedStudents = students.filter((student) =>
          message.relatedStudentIds?.includes(student.id),
        );
        const relatedGroups = groups.filter((group) =>
          message.relatedGroupIds?.includes(group.id),
        );

        if (
          !relatedAbsences.length &&
          !relatedStudents.length &&
          !relatedGroups.length
        ) {
          return null;
        }

        return (
          <div
            className={css({
              display: "grid",
              gap: "3",
              w: "full",
            })}
          >
            {relatedAbsences.map((absence) => (
              <AssistantReferenceCard
                key={absence.id}
                actionLabel="Открыть пропуск"
                badge={<TeacherStatusBadge status={absence.status} />}
                meta={`${formatCompactDate(absence.date)} • ${absence.lessonLabel}`}
                onOpen={() => router.push(`/teacher/absences/${absence.id}`)}
                subtitle={`${absence.studentGroup} • ${absence.subject}`}
                title={absence.studentFullName}
              />
            ))}

            {relatedStudents.map((student) => (
              <AssistantReferenceCard
                key={student.id}
                actionLabel="Пропуски студента"
                meta={`${student.group} • ${student.course} курс`}
                onOpen={() => router.push(`/teacher/students/${student.id}`)}
                subtitle={`${countStudentAbsences(absences, student.id)} пропусков`}
                title={student.fullName}
              />
            ))}

            {relatedGroups.map((group) => (
              <AssistantReferenceCard
                key={group.id}
                actionLabel="Открыть группу"
                meta={`${group.course} курс`}
                onOpen={() => router.push(`/teacher/groups/${group.id}`)}
                subtitle={group.specialty}
                title={group.name}
              />
            ))}
          </div>
        );
      }}
    />
  );
}
