import { createClient } from "@supabase/supabase-js";

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data, error } = await s.from("booking_assignments").select("status");

if (error) {
  console.error("error:", error.message);
  process.exit(1);
}

const counts = {};
for (const row of data || []) {
  counts[row.status] = (counts[row.status] || 0) + 1;
}

console.log(JSON.stringify(counts, null, 2));
