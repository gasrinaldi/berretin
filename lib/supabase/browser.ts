import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

// Cliente con la clave publishable (segura para el navegador): solo se usa
// para login/sesión de comunidad y admin. Nunca lleva la service role.
//
// Devuelve null en vez de tirar si faltan las variables de entorno — nunca
// hay que dejar que @supabase/ssr explote (lanza "Your project's URL and
// API key are required"), porque este helper se llama desde componentes
// cliente que se montan en /palabra/[slug], y esa página tiene que seguir
// funcionando (palabra, definición, pestañas, navegación) aunque todavía
// no esté configurado Supabase. Quien llama es responsable de mostrar la
// función comunitaria puntual como no disponible.
export function createSupabaseBrowserClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return null;

  return createBrowserClient(url, anonKey);
}
