"use client";

import { useParams } from "next/navigation";
import { TeacherAbsenceDetailView } from "@/components/teacher/teacher-absence-detail-view";

export default function TeacherAbsencePage() {
  const params = useParams<{ id: string }>();
  return <TeacherAbsenceDetailView absenceId={params.id} />;
}
