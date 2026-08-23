import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

// Cliente con la clave publishable + cookies de sesión: identifica QUIÉN
// está pidiendo algo (para el chequeo de admin), nunca se usa para leer o
// escribir datos privilegiados — eso es trabajo de lib/supabase-admin.ts.
//
// Devuelve null en vez de tirar si faltan las variables de entorno (mismo
// motivo que lib/supabase/browser.ts): esto se llama desde server actions
// que corren en /diccionario/[slug] (voto, reporte, aportes), y esa página
// tiene que seguir funcionando sin Supabase configurado. getCurrentUser()
// y getAdminUser() tratan un cliente null como "sin sesión", no como error.
export async function createSupabaseServerClient(): Promise<SupabaseClient | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return null;

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Se llama desde un Server Component (solo lectura): el refresco
          // de sesión real ocurre en proxy.ts, que sí puede escribir cookies.
        }
      },
    },
  });
}
