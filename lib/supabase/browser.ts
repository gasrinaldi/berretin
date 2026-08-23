import { createBrowserClient } from "@supabase/ssr";

// Cliente con la clave publishable (segura para el navegador): solo se usa
// para el login por magic link del panel de moderación. Nunca lleva la
// service role.
export function createSupabaseBrowserClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}
