import { createClient } from "@supabase/supabase-js";

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data: booking, error } = await s
  .from("bookings")
  .select("id, status")
  .eq("id", "b1a92484-799b-4df2-b969-07e9e43c4337")
  .maybeSingle();

if (error) {
  console.error("error:", error.message);
  process.exit(1);
}

console.log("stuck booking status:", booking?.status || "not found");
