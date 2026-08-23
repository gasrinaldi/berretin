import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// Cliente con la clave publishable + cookies de sesión: identifica QUIÉN
// está pidiendo algo (para el chequeo de admin), nunca se usa para leer o
// escribir datos privilegiados — eso es trabajo de lib/supabase-admin.ts.
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
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
