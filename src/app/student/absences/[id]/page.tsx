"use client";

import { useParams } from "next/navigation";
import { AbsenceDetailView } from "@/components/student/absence-detail-view";

export default function AbsenceDetailPage() {
  const params = useParams<{ id: string }>();
  return <AbsenceDetailView absenceId={params.id} />;
}
