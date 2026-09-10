// Dev-only utility: sets the demo worker AVAILABLE with a GPS fix so
// dispatch can find them for a smoke test.
// Run with: node --env-file=.env.local scripts/seed-demo-location.mjs
import { createClient } from "@supabase/supabase-js";
import ws from "ws";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: ws },
});

const { data: worker, error: workerError } = await supabase
  .from("workers")
  .select("id")
  .eq("phone", "+212600000000")
  .single();

if (workerError || !worker) {
  console.error("Demo worker not found:", workerError?.message);
  process.exit(1);
}

await supabase.from("workers").update({ status: "AVAILABLE" }).eq("id", worker.id);

const lat = 33.5731;
const lng = -7.5898;

const { error: locError } = await supabase.from("worker_current_locations").upsert({
  worker_id: worker.id,
  latitude: lat,
  longitude: lng,
  accuracy_meters: 10,
  location: `SRID=4326;POINT(${lng} ${lat})`,
  updated_at: new Date().toISOString(),
});

if (locError) {
  console.error("Failed to set location:", locError.message);
  process.exit(1);
}

console.log("Demo worker set AVAILABLE with a fresh GPS fix in Casablanca.");
