import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Next.js 16 renombró middleware.ts a proxy.ts (mismo comportamiento).
// Dos usos según la ruta:
// - /admin/*: refresca la sesión Y redirige a /admin/login si el usuario
//   no es ADMIN_EMAIL — la autorización real se vuelve a verificar en
//   cada página y cada server action, nunca se confía solo en esto (así
//   lo recomienda la propia doc de Proxy de Next.js).
// - /cuenta/*: SOLO refresca la sesión, sin chequeo de admin. Antes no
//   corría acá: createSupabaseServerClient() no puede escribir cookies
//   desde una Server Component de solo lectura (ver lib/supabase/
//   server.ts), así que si el access token vencía sin pasar antes por
//   este proxy, /cuenta veía la sesión como inválida y mostraba el login
//   de nuevo pese a que el usuario seguía con una sesión válida.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

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

  if (!request.nextUrl.pathname.startsWith("/admin")) {
    // /cuenta/*: la sesión ya quedó refrescada arriba (setAll corrió si
    // hacía falta) — no hay chequeo de admin que hacer acá.
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

export const config = {
  matcher: ["/admin/aportes/:path*", "/admin/desafio/:path*", "/admin/regiones/:path*", "/admin/reportes/:path*", "/cuenta/:path*"],
};
