import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const MAINTENANCE_STATUS_PATH = "/api/internal/maintenance-status";

// Next.js 16 renombró middleware.ts a proxy.ts (mismo comportamiento).
// Tres usos según la ruta:
// - Cualquier ruta pública (todo lo que no sea /admin/*): si mantenimiento
//   está activo, se reescribe a /mantenimiento con 503 — nunca para
//   /admin/*, que tiene que seguir andando siempre para poder desactivarlo
//   desde ahí. El estado se consulta vía un endpoint interno cacheado
//   (ver isMaintenanceModeOn más abajo) — proxy.ts NUNCA consulta
//   Supabase directo: corre fuera del árbol de render de Next (antes de
//   que cualquier ruta se renderice, en optimizados casos servido desde
//   el edge/CDN), así que no tiene acceso soportado al Data Cache que sí
//   usa ese endpoint. Fail-open si el endpoint falla.
// - /admin/*: refresca la sesión Y redirige a /admin/login si el usuario
//   no es ADMIN_EMAIL — la autorización real se vuelve a verificar en
//   cada página y cada server action, nunca se confía solo en esto (así
//   lo recomienda la propia doc de Proxy de Next.js). /admin/login queda
//   afuera de ese redirect (si no, un visitante sin sesión haría un loop
//   infinito de /admin/login a sí mismo).
// - /cuenta/*: SOLO refresca la sesión, sin chequeo de admin — porque
//   createSupabaseServerClient() no puede escribir cookies desde una
//   Server Component de solo lectura (ver lib/supabase/server.ts).
// El cliente de auth de Supabase (createServerClient + auth.getUser())
// NUNCA se instancia para el resto del sitio público (home, /diccionario,
// /perfil, /desafio, etc.): el matcher es amplio porque el gate de
// mantenimiento tiene que cubrir todo el sitio, pero eso no implica que
// haga falta auth ahí — se decide aparte, después del gate.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;
  const isAdminPath = pathname === "/admin" || pathname.startsWith("/admin/");

  if (!isAdminPath && (await isMaintenanceModeOn(request))) {
    const maintenanceUrl = request.nextUrl.clone();
    maintenanceUrl.pathname = "/mantenimiento";
    maintenanceUrl.search = "";
    return NextResponse.rewrite(maintenanceUrl, {
      status: 503,
      headers: { "Retry-After": "1800" },
    });
  }

  const needsAuth = isAdminPath || pathname === "/cuenta" || pathname.startsWith("/cuenta/");
  if (!needsAuth) {
    return response;
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
    // /cuenta/*: la sesión ya quedó refrescada arriba (setAll corrió si
    // hacía falta) — no hay chequeo de admin que hacer acá.
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
// mucho menos el admin, que ni siquiera pasa por acá). Timeout corto para
// que un endpoint interno lento no cuelgue el resto del sitio — si no
// responde a tiempo, se deja pasar igual. Solo un log breve, sin
// detalles de la falla ni nada del request.
async function isMaintenanceModeOn(request: NextRequest): Promise<boolean> {
  try {
    const statusUrl = new URL(MAINTENANCE_STATUS_PATH, request.url);
    const res = await fetch(statusUrl, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) {
      console.error("[proxy] Estado de mantenimiento no disponible, se deja pasar.");
      return false;
    }
    const data = (await res.json()) as { maintenanceMode?: boolean };
    return data.maintenanceMode === true;
  } catch {
    console.error("[proxy] No se pudo consultar el estado de mantenimiento, se deja pasar.");
    return false;
  }
}

export const config = {
  // Corre en todo el sitio salvo: assets de _next, cualquier archivo con
  // extensión (imágenes/audio/fuentes en /public, favicon.ico, robots.txt,
  // sitemap.xml — todos terminan en .algo), /mantenimiento (evita el loop:
  // si ya estás ahí, no hay nada que reescribir) y el endpoint interno de
  // estado (evita que se reescriba a sí mismo / se llame en loop).
  matcher: ["/((?!_next/static|_next/image|mantenimiento|api/internal/maintenance-status|.*\\.[a-zA-Z0-9]+$).*)"],
};
