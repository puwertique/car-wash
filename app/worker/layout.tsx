import type { ReactNode } from "react";
import { getSessionProfile } from "@/lib/auth/session";
import { Sidebar } from "@/components/navigation/sidebar";

export default async function WorkerLayout({ children }: { children: ReactNode }) {
  const profile = await getSessionProfile();
  return <div className="flex min-h-full flex-col md:flex-row">{profile && <Sidebar role="worker" />}<div className="min-w-0 flex-1">{children}</div></div>;
}