import { notFound } from "next/navigation";
import { getCurrentUser } from "@backend/auth/session";
import { UsersPage } from "@/_pages/users";

export default async function Page() {
  if ((await getCurrentUser())?.role !== "ADMIN") notFound();
  return <UsersPage />;
}
