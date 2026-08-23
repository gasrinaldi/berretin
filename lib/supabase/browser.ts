import { createBrowserClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

// Cliente con la clave publishable (segura para el navegador), cookies de
// sesión vía @supabase/ssr — se usa para LEER la sesión ya establecida
// (por ejemplo, saber si hay alguien logueado en /palabra/[slug]).
//
// Devuelve null en vez de tirar si faltan las variables de entorno: nunca
// hay que dejar que @supabase/ssr explote (lanza "Your project's URL and
// API key are required"), porque este helper se llama desde componentes
// cliente que se montan en /palabra/[slug], y esa página tiene que seguir
// funcionando aunque todavía no esté configurado Supabase.
export function createSupabaseBrowserClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return null;

  return createBrowserClient(url, anonKey);
}

// Cliente liviano (sin cookies, sin sesión propia) usado para los dos
// flujos de /cuenta que mandan un link por mail: confirmación de cuenta
// nueva (signUp) y recuperación de contraseña (resetPasswordForEmail).
//
// @supabase/ssr fuerza flowType "pkce" en createBrowserClient (no se puede
// sobrescribir): el token queda ligado a una cookie "code_verifier" en el
// navegador que pidió el link. En celular, el link del mail casi siempre
// se abre en un contexto distinto (app de Mail, in-app browser de Gmail,
// etc.) que no comparte esa cookie, así que el intercambio falla y el
// usuario queda "colgado" sin poder confirmar o recuperar su cuenta.
//
// Con flujo implícito esos links no dependen de ninguna cookie previa:
// Supabase redirige directo con access_token/refresh_token en el hash de
// la URL, que /auth/callback lee y usa para crear la sesión del lado del
// servidor (ver app/auth/callback/actions.ts). El login normal usa
// signInWithPassword vía createSupabaseBrowserClient() de arriba, que no
// depende de ningún link ni de PKCE.
export function createSupabaseOtpClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return null;

  return createClient(url, anonKey, {
    auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
