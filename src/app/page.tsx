import { AppHeader } from "@/components/layout/app-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { SignInPanel } from "@/components/landing/sign-in-panel";
import { HeroBand } from "@/components/landing/hero-band";
import { isGoogleConfigured } from "@/lib/env";

const CAPABILITIES = [
  {
    title: "Even space, or true scale",
    text: "Read crowded centuries comfortably, then switch to true distance in time and zoom from millennia down to a single day.",
  },
  {
    title: "Layers of history",
    text: "Give each thread of history its own coloured layer, then show, hide or compare them on the same line.",
  },
  {
    title: "Leaves the canvas with you",
    text: "Export a crisp PNG for slides and papers, or your events as JSON and TXT whenever you want the data itself.",
  },
];

export default async function LandingPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const expired = (await searchParams).expired !== undefined;
  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />
      <main id="main" className="flex-1">
        <section className="mx-auto max-w-3xl px-4 pb-8 pt-12 text-center sm:pt-16">
          <h1 className="font-serif text-5xl leading-[1.04] tracking-tight sm:text-6xl lg:text-7xl">
            <span className="text-strata">All of history,</span>
            <br />
            on one line.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-fg-muted sm:text-lg">
            NeeLine is a zoomable number line for time. Plot anything from 3200 BCE to
            this morning, layer it in colour, and export it for your paper or your classroom.
          </p>
          <div className="mt-7">
            <SignInPanel googleEnabled={isGoogleConfigured()} expired={expired} />
          </div>
        </section>

        <HeroBand />

        <section className="mx-auto max-w-6xl px-4 pb-14 pt-10 sm:px-6" aria-label="What NeeLine does">
          <div className="hairline-strata mx-auto mb-8 max-w-xl" aria-hidden />
          <div className="grid gap-8 text-center sm:grid-cols-3 sm:gap-6 sm:text-left">
            {CAPABILITIES.map(({ title, text }) => (
              <div key={title}>
                <svg width="26" height="10" className="mx-auto mb-3 sm:mx-0" aria-hidden>
                  <line x1="0" y1="5" x2="26" y2="5" stroke="var(--strata-origin)" strokeWidth="1.5" />
                  <line x1="13" y1="0" x2="13" y2="10" stroke="var(--strata-origin)" strokeWidth="1.5" />
                </svg>
                <h2 className="text-base font-semibold text-fg">{title}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{text}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
