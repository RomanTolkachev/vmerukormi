import { notFound } from "next/navigation";
import { getCurrentUser } from "@backend/auth/session";
import { AuditPage } from "@/_pages/audit";

export default async function Page() {
  if ((await getCurrentUser())?.role !== "ADMIN") notFound();
  return <AuditPage />;
}
