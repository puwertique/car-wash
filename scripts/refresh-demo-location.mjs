import { createClient } from "@supabase/supabase-js";
import ws from "ws";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false }, realtime: { transport: ws } },
);

const lat = 33.6689970147749;
const lng = -7.38742318058161;

await supabase.from("worker_current_locations").upsert({
  worker_id: "7b258750-6a3a-4b4f-8e15-39cb2f68e8a6",
  latitude: lat,
  longitude: lng,
  accuracy_meters: 200,
  location: `SRID=4326;POINT(${lng} ${lat})`,
  updated_at: new Date().toISOString(),
});

console.log("Location refreshed");
process.exit(0);
