import type { Metadata } from "next";
import { Fraunces, Space_Grotesk } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { SITE_URL, OG_URL, SITE_NAME, INDEXING_ALLOWED } from "@/lib/site";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

const siteTitle = `${SITE_NAME} - Diccionario vivo del habla porteña`;
const siteDescription = "Diccionario navegable del lunfardo porteño: significados, expresiones y el habla de la calle argentina.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: siteTitle,
  description: siteDescription,
  // Apagado por defecto (SITE_INDEXING_ENABLED sin activar o deployment
  // que no es producción) — el gate real vive en lib/site.ts. Páginas
  // específicas (la ficha de diccionario, el home con filtros en la URL)
  // pisan este valor con su propio robots cuando corresponde.
  robots: INDEXING_ALLOWED ? { index: true, follow: true } : { index: false, follow: false },
  // Íconos generados desde public/brand/berretin-isologo.png (el PNG
  // oficial, sin redibujar) — favicon.ico ya lo trae por convención de
  // archivo; esto suma los tamaños extra (32/192/512) y el apple-touch
  // sobre negro oficial #0B0D10, que Apple necesita opaco.
  icons: {
    icon: [
      { url: "/brand/berretin-isologo-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/berretin-isologo-192.png", sizes: "192x192", type: "image/png" },
      { url: "/brand/berretin-isologo-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/brand/berretin-isologo-180.png", sizes: "180x180", type: "image/png" }],
  },
  // url/images en absoluto contra OG_URL (no metadataBase/SITE_URL): son
  // temporales mientras berretin.com.ar no esté conectado (ver lib/site.ts).
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    url: OG_URL,
    siteName: SITE_NAME,
    locale: "es_AR",
    type: "website",
    images: [{ url: `${OG_URL}/brand/berretin-og.png`, width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: [`${OG_URL}/brand/berretin-og.png`],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es-AR"
      className={`${spaceGrotesk.variable} ${fraunces.variable}`}
    >
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
