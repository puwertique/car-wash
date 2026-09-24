import { createClient } from "@/lib/supabase/server";

export type CoveredCity = { id: string; is_active: boolean };

export async function listCoveredCities(): Promise<CoveredCity[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("covered_cities").select("id, is_active").order("id");
  return data ?? [];
}
