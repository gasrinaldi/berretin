import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Next.js 16 renombró middleware.ts a proxy.ts (mismo comportamiento).
// Acá solo se refresca la sesión de Supabase y se redirige a /admin/login
// si hace falta — la autorización real (email == ADMIN_EMAIL) se vuelve a
// verificar en cada página y cada server action, nunca se confía solo en
// esto (así lo recomienda la propia doc de Proxy de Next.js).
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // Sin configurar todavía: dejamos pasar a /admin/login, que ya explica
    // que el panel no está disponible, en vez de romper con un 500.
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

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const isAuthorized = Boolean(user?.email && adminEmail && user.email.toLowerCase() === adminEmail);

  if (!isAuthorized) {
    const loginUrl = new URL("/admin/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/admin/aportes/:path*", "/admin/desafio/:path*"],
};
