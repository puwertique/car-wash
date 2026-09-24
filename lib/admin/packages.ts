import { createClient } from "@/lib/supabase/server";

export type AdminPackage = {
  id: string;
  name: string;
  description: string;
  vehicle_category: "car" | "moto";
  vehicle_size: string;
  base_price: number;
  estimated_duration_minutes: number;
  is_active: boolean;
};

export async function listPackagesForManagement(): Promise<AdminPackage[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("packages").select("id, name, description, vehicle_category, vehicle_size, base_price, estimated_duration_minutes, is_active").order("vehicle_category").order("vehicle_size").order("base_price");
  return (data ?? []).map((item) => ({ ...item, base_price: Number(item.base_price) }));
}
