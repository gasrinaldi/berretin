import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { MAINTENANCE_MODE_KEY } from "@/lib/site-settings";

// Next.js 16 renombró middleware.ts a proxy.ts (mismo comportamiento).
// Tres usos según la ruta:
// - Cualquier ruta pública (todo lo que no sea /admin/*): si maintenance_mode
//   está activo, se reescribe a /mantenimiento con 503 — nunca a /admin, que
//   tiene que seguir andando siempre para poder desactivarlo desde ahí.
// - /admin/*: refresca la sesión Y redirige a /admin/login si el usuario
//   no es ADMIN_EMAIL — la autorización real se vuelve a verificar en
//   cada página y cada server action, nunca se confía solo en esto (así
//   lo recomienda la propia doc de Proxy de Next.js). /admin/login queda
//   afuera de ese redirect (si no, un visitante sin sesión haría un loop
//   infinito de /admin/login a sí mismo).
// - El resto (home, /diccionario, /cuenta, etc.): SOLO refresca la sesión,
//   sin chequeo de admin. Antes esto solo corría en /cuenta/* porque
//   createSupabaseServerClient() no puede escribir cookies desde una Server
//   Component de solo lectura (ver lib/supabase/server.ts) — ahora el
//   matcher es mucho más amplio (hace falta para el gate de mantenimiento),
//   así que de paso corre en todo el sitio público; no cambia nada para
//   una visita anónima y evita el mismo problema de sesión vencida en
//   cualquier página, no solo /cuenta.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;
  const isAdminPath = pathname === "/admin" || pathname.startsWith("/admin/");

  if (!isAdminPath && (await isMaintenanceModeOn())) {
    const maintenanceUrl = request.nextUrl.clone();
    maintenanceUrl.pathname = "/mantenimiento";
    maintenanceUrl.search = "";
    return NextResponse.rewrite(maintenanceUrl, {
      status: 503,
      headers: { "Retry-After": "1800" },
    });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // Sin configurar todavía: dejamos pasar (a /admin/login o /cuenta, que
    // ya explican que no está disponible) en vez de romper con un 500.
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isAdminPath) {
    return response;
  }

  if (pathname === "/admin/login") {
    return response;
  }

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const isAuthorized = Boolean(user?.email && adminEmail && user.email.toLowerCase() === adminEmail);

  if (!isAuthorized) {
    const loginUrl = new URL("/admin/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

// Fail-open a propósito: una falla acá nunca debe bloquear el sitio (ni
// mucho menos el admin, que ni siquiera pasa por acá). Solo un log breve,
// sin detalles de la falla ni nada del request.
async function isMaintenanceModeOn(): Promise<boolean> {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin.from("site_settings").select("value").eq("key", MAINTENANCE_MODE_KEY).maybeSingle();
    if (error) {
      console.error("[proxy] No se pudo leer maintenance_mode, se deja pasar.");
      return false;
    }
    return data?.value === true;
  } catch {
    console.error("[proxy] Supabase no disponible para chequear maintenance_mode, se deja pasar.");
    return false;
  }
}

export const config = {
  // Corre en todo el sitio salvo: assets de _next, cualquier archivo con
  // extensión (imágenes/audio/fuentes en /public, favicon.ico, robots.txt,
  // sitemap.xml — todos terminan en .algo) y /mantenimiento (evita el loop:
  // si ya estás ahí, no hay nada que reescribir).
  matcher: ["/((?!_next/static|_next/image|mantenimiento|.*\\.[a-zA-Z0-9]+$).*)"],
};
