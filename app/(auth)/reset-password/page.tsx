import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ResetForm } from "./reset-form";

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      {user ? <ResetForm /> : (
        <div className="w-full max-w-sm space-y-4 rounded-lg border border-black/10 p-6">
          <h1 className="text-xl font-semibold">Invalid reset link</h1>
          <p className="text-sm text-black/70">This link has expired or has already been used. Request a new password reset link.</p>
          <Link href="/forgot-password" className="block rounded bg-black px-3 py-2 text-center text-sm text-white">Request a new link</Link>
        </div>
      )}
    </main>
  );
}
