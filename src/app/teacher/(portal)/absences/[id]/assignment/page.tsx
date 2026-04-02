"use client";

import { useParams } from "next/navigation";
import { TeacherAssignmentForm } from "@/components/teacher/teacher-assignment-form";

export default function TeacherAssignmentPage() {
  const params = useParams<{ id: string }>();
  return <TeacherAssignmentForm absenceId={params.id} />;
}
