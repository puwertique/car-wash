import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/session";
import { PasswordForm } from "./password-form";

export default async function AccountPasswordPage() {
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  return <PasswordForm />;
}
