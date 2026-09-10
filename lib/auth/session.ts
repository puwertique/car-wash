import { createClient } from "@/lib/supabase/server";

export type AppRole = "worker" | "admin" | "owner";

export type SessionProfile = {
  userId: string;
  email: string | null;
  role: AppRole;
};

/**
 * Returns the current authenticated user plus their app role, or null
 * if there is no session. Server Components / Route Handlers only.
 */
export async function getSessionProfile(): Promise<SessionProfile | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return {
    userId: user.id,
    email: user.email ?? null,
    role: (profile?.role as AppRole | undefined) ?? "worker",
  };
}
