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

export async function GET() {
  try {
    const maintenanceMode = await getCachedMaintenanceMode();
    return NextResponse.json({ maintenanceMode });
  } catch {
    console.error("[maintenance-status] No se pudo leer el estado, se responde fail-open.");
    return NextResponse.json({ maintenanceMode: false });
  }
}
