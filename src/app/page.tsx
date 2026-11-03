import Link from "next/link";
import { ArrowRight, Download, Layers, ZoomIn } from "lucide-react";
import { AppHeader } from "@/components/layout/app-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { SignInPanel } from "@/components/landing/sign-in-panel";
import { LandingPreview } from "@/components/landing/preview";
import { isGoogleConfigured } from "@/lib/env";

const FEATURES = [
  {
    icon: ZoomIn,
    title: "From deep time to a single day",
    text: "Zoom smoothly from spans of millions of years down to individual calendar days with the mouse wheel, pinch or keyboard.",
  },
  {
    icon: Layers,
    title: "Layers that keep things readable",
    text: "Events stack into tiers so labels never overlap, collapse to dots when crowded, and can be grouped into coloured layers you show or hide.",
  },
  {
    icon: Download,
    title: "Export for papers and slides",
    text: "Save a 2x PNG of your timeline for presentations and essays, or download your events as tab-separated TXT or JSON.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />
      <main id="main" className="flex-1">
        <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 pb-12 pt-12 sm:px-6 lg:grid-cols-[1fr_auto] lg:pt-20">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-sm font-medium text-fg-muted">
              <span className="size-1.5 rounded-full bg-accent" aria-hidden />
              A historical canvas for research and teaching
            </p>
            <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight text-fg sm:text-5xl lg:text-6xl">
              Visualise history on a <span className="text-accent">number line</span>.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-fg-muted">
              A horizontal time canvas for scholars, researchers and curious minds. Map deep time from ancient antiquity to
              the modern era with precise, consistent spacing.
            </p>
          </div>
          <SignInPanel googleEnabled={isGoogleConfigured()} />
        </section>

        <section className="mx-auto max-w-7xl px-4 sm:px-6" aria-label="Interactive preview">
          <LandingPreview />
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6" aria-labelledby="features-heading">
          <h2 id="features-heading" className="sr-only">Features</h2>
          <ul className="grid gap-4 md:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="glass rounded-xl p-6">
                <span className="flex size-10 items-center justify-center rounded-md bg-accent-soft text-accent">
                  <Icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-4 text-lg font-semibold text-fg">{title}</h3>
                <p className="mt-2 text-sm text-fg-muted">{text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mx-auto max-w-3xl px-4 pb-20 text-center sm:px-6">
          <h2 className="text-3xl font-semibold tracking-tight text-fg">Ready to plot your history?</h2>
          <p className="mt-3 text-fg-muted">Map civilisations, eras and turning points on one stable number line.</p>
          <Link
            href="#get-started"
            className="mt-6 inline-flex h-12 items-center gap-2 rounded-md bg-accent px-6 text-base font-medium text-accent-fg hover:bg-accent-hover"
          >
            Get started
            <ArrowRight className="size-5" aria-hidden />
          </Link>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
