import type { Metadata, Viewport } from "next";
import { Inter, Marcellus } from "next/font/google";
import { Providers } from "@/components/layout/providers";
import { siteUrl } from "@/lib/site";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const marcellus = Marcellus({ subsets: ["latin"], weight: "400", variable: "--font-marcellus", display: "swap" });

const description =
  "NeeLine plots historical events on a horizontal number line, from deep antiquity (BCE) to today. Group events into layers, mark periods, and export PNG, TXT or JSON.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "NeeLine: history on a number line", template: "%s · NeeLine" },
  description,
  applicationName: "NeeLine",
  openGraph: {
    type: "website",
    siteName: "NeeLine",
    title: "NeeLine: history on a number line",
    description,
    url: "/",
  },
  twitter: { card: "summary_large_image", title: "NeeLine: history on a number line", description },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
    { media: "(prefers-color-scheme: light)", color: "#faf8f5" },
  ],
};

// Applies the saved theme before first paint so there is no flash.
const themeScript = `try{var t=localStorage.getItem("neeline_theme");document.documentElement.setAttribute("data-theme",t==="light"?"light":"dark")}catch(e){document.documentElement.setAttribute("data-theme","dark")}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" className={`${inter.variable} ${marcellus.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <a
          href="#main"
          className="sr-only-focusable fixed left-4 top-4 z-[100] rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-fg"
        >
          Skip to content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
