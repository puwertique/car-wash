// Dev-only utility: creates a demo admin auth user and promotes their
// profile role to 'admin'.
// Run with: node --env-file=.env.local scripts/create-demo-admin.mjs
import { createClient } from "@supabase/supabase-js";
import ws from "ws";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: ws },
});

const email = "demo.admin@example.com";
const password = "DemoAdmin123!";

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

const { error: roleError } = await supabase
  .from("profiles")
  .update({ role: "admin" })
  .eq("id", userData.user.id);

if (roleError) {
  console.error("Failed to promote to admin:", roleError.message);
  process.exit(1);
}

console.log("Demo admin ready.");
console.log("Email:   ", email);
console.log("Password:", password);
