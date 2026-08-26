import { unstable_cache } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { MAINTENANCE_MODE_KEY } from "@/lib/site-settings";

// Tag del Data Cache de Next.js (persistente y compartido entre
// instancias en Vercel — no una variable en memoria del proceso) para
// esta única entrada. setMaintenanceMode() (app/admin/sitio/actions.ts)
// la invalida con revalidateTag() apenas confirma el UPDATE en Supabase.
export const MAINTENANCE_CACHE_TAG = "site-settings:maintenance";

// Sin `revalidate`: sin vencimiento por tiempo, la única forma de que esto
// vuelva a pegarle a Supabase es que alguien invalide el tag. Consumida
// únicamente por app/api/internal/maintenance-status/route.ts — proxy.ts
// nunca llama a esto ni a Supabase directo (ver proxy.ts: Proxy corre
// fuera del árbol de render de Next, no tiene acceso soportado al Data
// Cache, así que consulta ese endpoint en vez de esta función).
export const getCachedMaintenanceMode = unstable_cache(
  async (): Promise<boolean> => {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("site_settings").select("value").eq("key", MAINTENANCE_MODE_KEY).maybeSingle();
    if (error) throw error;
    return data?.value === true;
  },
  ["maintenance-mode"],
  { tags: [MAINTENANCE_CACHE_TAG] }
);
