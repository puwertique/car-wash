// Dev-only utility: creates a demo worker auth user + workers row.
// Run with: node --env-file=.env.local scripts/create-demo-user.mjs
import { createClient } from "@supabase/supabase-js";
import ws from "ws";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: ws },
});

const email = "demo.worker@example.com";
const password = "DemoPass123!";

const { data: userData, error: userError } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});

if (userError) {
  console.error("Failed to create auth user:", userError.message);
  process.exit(1);
}

console.log("Created auth user:", userData.user.id);

const { error: workerError } = await supabase.from("workers").insert({
  auth_user_id: userData.user.id,
  first_name: "Demo",
  last_name: "Worker",
  phone: "+212600000000",
  city: "Casablanca",
  status: "OFFLINE",
});

if (workerError) {
  console.error("Failed to create worker row:", workerError.message);
  process.exit(1);
}

console.log("Demo worker ready.");
console.log("Email:   ", email);
console.log("Password:", password);
