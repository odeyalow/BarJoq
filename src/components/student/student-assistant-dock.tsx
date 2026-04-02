"use client";

import { usePathname, useRouter } from "next/navigation";
import { AssistantDock } from "@/components/assistant/assistant-dock";
import { AssistantReferenceCard } from "@/components/assistant/assistant-reference-card";
import { StatusBadge } from "@/components/student/status-badge";
import { useStudentPortal } from "@/components/student/student-portal-provider";
import type { StudentAssistantSnapshot } from "@/lib/assistant";
import { formatCompactDate } from "@/lib/student-portal";
import { css } from "styled-system/css";

export function StudentAssistantDock({
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
  const { absences, student } = useStudentPortal();

  const snapshot: StudentAssistantSnapshot = {
    role: "student",
    currentPage: pathname,
    student: {
      fullName: student.fullName,
      group: student.group,
      course: student.course,
    },
    absences: absences.map((absence) => ({
      id: absence.id,
      subject: absence.subject,
      date: absence.date,
      lessonLabel: absence.lessonLabel,
      status: absence.status,
      teacherName: absence.teacherName,
      classroom: absence.classroom,
      grade: absence.grade,
      assignmentSentAt: absence.assignment?.sentAt,
      responseSubmittedAt:
        absence.response?.editedAt ?? absence.response?.submittedAt,
      completedAt: absence.completedAt,
    })),
  };

  return (
    <AssistantDock
      open={open}
      onOpenChange={onOpenChange}
      layout={layout}
      role="student"
      snapshot={snapshot}
      subtitle="Студенческий AI-помощник по пропускам, заданиям и оценкам"
      title="BarJoq AI"
      renderReferences={(message) => {
        const relatedAbsences = absences.filter((absence) =>
          message.relatedAbsenceIds?.includes(absence.id),
        );

        if (!relatedAbsences.length) {
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
                badge={<StatusBadge status={absence.status} />}
                meta={`${formatCompactDate(absence.date)} • ${absence.lessonLabel}`}
                onOpen={() => router.push(`/student/absences/${absence.id}`)}
                subtitle={`${absence.teacherName} • ${absence.classroom}`}
                title={absence.subject}
              />
            ))}
          </div>
        );
      }}
    />
  );
}
