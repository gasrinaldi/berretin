import { NextResponse } from "next/server";
import { getCachedMaintenanceMode } from "@/lib/maintenance-cache";

// Único consumidor real: proxy.ts (excluido de su propio matcher para no
// generar recursión). getCachedMaintenanceMode() sirve desde el Data
// Cache de Next.js — esto NUNCA pega directo a Supabase por request,
// solo cuando el cache está frío o recién invalidado (ver
// lib/maintenance-cache.ts y setMaintenanceMode()).
// force-dynamic: el propio route handler tiene que ejecutarse en cada
// request (para consultar el estado actual del cache) — sin esto, al no
// leer cookies/headers/searchParams, Next podría tratarlo como estático
// y congelar la respuesta en el valor del build.
export const dynamic = "force-dynamic";

// Respuesta cacheable en el CDN: el fetch de proxy.ts pasa por la URL
// pública, así que casi todas las consultas son HIT y no invocan la función.
// Costo aceptado: el toggle de /admin/sitio puede tardar hasta ~1 min en
// verse (más la memo de 60 s de proxy.ts). Los errores (fail-open) no se
// cachean, para no extender una falla pasajera.
const CACHEABLE = { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" };

export async function GET() {
  try {
    const maintenanceMode = await getCachedMaintenanceMode();
    return NextResponse.json({ maintenanceMode }, { headers: CACHEABLE });
  } catch {
    console.error("[maintenance-status] No se pudo leer el estado, se responde fail-open.");
    return NextResponse.json({ maintenanceMode: false }, { headers: { "Cache-Control": "no-store" } });
  }
}
