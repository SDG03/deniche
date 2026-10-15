import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, DM_Sans } from "next/font/google";
import { copy } from "@/lib/copy";
import { DemoBanner } from "@/components/demo-banner";
import { ServiceWorker } from "@/components/service-worker";
import "./globals.css";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-bricolage",
  display: "swap",
});

const sans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: `${copy.brand.name} · activités originales autour de Liège`, template: `%s · ${copy.brand.name}` },
  description: copy.brand.promise,
  applicationName: copy.brand.name,
  appleWebApp: { capable: true, title: copy.brand.name, statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#1F3D2F",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr-BE" className={`${display.variable} ${sans.variable}`}>
      <body className="min-h-dvh">
        <a
          href="#contenu"
          className="sr-only z-[100] rounded-full bg-forest px-4 py-2 text-cream focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
        >
          {copy.nav.skip}
        </a>
        <DemoBanner />
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
