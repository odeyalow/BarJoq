"use client";

import { useParams } from "next/navigation";
import { ResponseForm } from "@/components/student/response-form";

export default function AbsenceReplyPage() {
  const params = useParams<{ id: string }>();
  return <ResponseForm absenceId={params.id} />;
}
