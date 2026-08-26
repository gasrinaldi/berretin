import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// Origen de Supabase (Auth API + REST + Storage) que el navegador necesita
// poder llamar directo: el cliente browser solo usa .auth.* (AuthForm,
// WordVote), y las imágenes/audio de Storage se sirven con URLs firmadas
// contra este mismo host. Si la env var no está seteada todavía, cae a un
// wildcard *.supabase.co para no bloquear por accidente.
function supabaseOrigin(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return "https://*.supabase.co";
  try {
    return new URL(url).origin;
  } catch {
    return "https://*.supabase.co";
  }
}

// Sin nonces a propósito: usarlos obliga a renderizado dinámico en TODA la
// app (ver node_modules/next/dist/docs/01-app/02-guides/content-security-
// policy.md, sección "Static vs Dynamic Rendering"), lo que rompería el
// ISR on-demand de /diccionario/[slug] (~15.000 páginas) y dispararía
// costos de Function invocations — justo lo que esta política busca
// evitar. 'unsafe-inline' en script-src es necesario porque el App Router
// inyecta scripts inline (self.__next_f.push) para streaming de RSC que
// no admiten nonce sin forzar ese render dinámico. En producción sobre
// Vercel, Analytics/Speed Insights sirven su script y mandan sus beacons
// por rutas same-origin (/_vercel/...), pero en `next dev` (sin el edge
// de Vercel adelante) caen directo a va.vercel-scripts.com — confirmado
// con la consola del navegador — así que ese host queda permitido en los
// dos entornos.
function buildCsp(): string {
  const supabase = supabaseOrigin();
  const vercelAnalytics = "https://va.vercel-scripts.com";
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' ${vercelAnalytics}${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    // https: amplio a propósito: el avatar de perfil acepta cualquier URL
    // https:// (ver lib/community.ts isValidAvatarUrl), no solo Supabase.
    "img-src 'self' blob: data: https:",
    `media-src 'self' ${supabase}`,
    "font-src 'self'",
    `connect-src 'self' ${supabase} ${vercelAnalytics}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

const nextConfig: NextConfig = {
  // No hay razón para anunciar el framework en cada response de cara al
  // lanzamiento público.
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: buildCsp() },
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Redundante con frame-ancestors 'none' de la CSP, pero lo pide
          // el pedido de hardening explícitamente y cubre navegadores que
          // todavía no soportan frame-ancestors.
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Cámara, micrófono, geolocalización y pagos: sin uso en toda la
          // app (confirmado, no hay getUserMedia/MediaRecorder/geolocation
          // ni Payment Request API en el código actual).
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
