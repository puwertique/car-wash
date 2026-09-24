import { createClient } from "@supabase/supabase-js";

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data: rows, error: selectError } = await s
  .from("booking_assignments")
  .select("id, booking_id, created_at")
  .eq("status", "SEARCHING_WORKER");

if (selectError) {
  console.error("Select error:", selectError.message);
  process.exit(1);
}

const all = rows || [];
console.log("total SEARCHING_WORKER rows:", all.length);

const byBooking = new Map();
for (const row of all) {
  if (!byBooking.has(row.booking_id)) byBooking.set(row.booking_id, []);
  byBooking.get(row.booking_id).push(row);
}

const keepIds = new Set();
for (const [bookingId, bookingRows] of byBooking) {
  const sorted = bookingRows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  keepIds.add(sorted[0].id);
}

const deleteIds = all.filter((row) => !keepIds.has(row.id)).map((row) => row.id);
console.log("to delete:", deleteIds.length);

if (deleteIds.length === 0) {
  console.log("nothing to delete");
  process.exit(0);
}

const batchSize = 50;
let deleted = 0;
let errors = 0;

for (let i = 0; i < deleteIds.length; i += batchSize) {
  const batch = deleteIds.slice(i, i + batchSize);
  const { error } = await s.from("booking_assignments").delete().in("id", batch);
  if (error) {
    console.error("Batch error at offset", i, ":", error.message);
    errors++;
    break;
  }
  deleted += batch.length;
}

console.log("deleted:", deleted);
console.log("errors:", errors);

const { data: remaining, error: remainingError } = await s
  .from("booking_assignments")
  .select("id, booking_id, status, created_at")
  .eq("status", "SEARCHING_WORKER");

if (remainingError) {
  console.error("Remaining select error:", remainingError.message);
  process.exit(1);
}

const remainingRows = remaining || [];
console.log("remaining SEARCHING_WORKER rows:", remainingRows.length);
console.log("distinct bookings:", new Set(remainingRows.map((x) => x.booking_id)).size);

const byBookingAfter = {};
for (const row of remainingRows) {
  if (!byBookingAfter[row.booking_id]) byBookingAfter[row.booking_id] = 0;
  byBookingAfter[row.booking_id]++;
}
console.log(JSON.stringify(byBookingAfter, null, 2));
