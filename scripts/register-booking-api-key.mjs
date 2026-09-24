import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import ws from "ws";

const rawKey = process.env.ORDERS_API_KEY;
const source = process.argv[2];
if (!rawKey || !source) {
  console.error("Usage: node --env-file=.env.local scripts/register-booking-api-key.mjs <source>");
  process.exit(1);
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: ws },
});
const keyHash = createHash("sha256").update(rawKey).digest("hex");
const { error } = await supabase.from("api_keys").upsert({ key_hash: keyHash, source, is_active: true, revoked_at: null }, { onConflict: "key_hash" });
if (error) {
  console.error(error.message);
  process.exit(1);
}
console.log(`Registered active booking API key for source: ${source}`);