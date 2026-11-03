import { ExternalLink, Mail } from "lucide-react";
import { BrandLink } from "@/components/layout/brand";
import { CONTACT_EMAIL, CREDIT_LINE, INSTAGRAM_HANDLE, INSTAGRAM_URL } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-md">
          <BrandLink />
          <p className="mt-3 text-sm text-fg-muted">
            A horizontal number line for history, from deep antiquity to today. Built for historians, researchers,
            teachers and anyone curious about time.
          </p>
        </div>
        <div className="flex flex-col gap-3 text-sm">
          <a href={`mailto:${CONTACT_EMAIL}`} className="inline-flex items-center gap-2 text-fg-muted hover:text-fg">
            <Mail className="size-4" aria-hidden />
            {CONTACT_EMAIL}
          </a>
          <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-fg-muted hover:text-fg">
            <ExternalLink className="size-4" aria-hidden />
            {INSTAGRAM_HANDLE} on Instagram
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4 text-xs text-fg-muted sm:flex-row sm:justify-between sm:px-6">
          <p>&copy; {new Date().getFullYear()} NeeLine</p>
          <p>{CREDIT_LINE}</p>
        </div>
      </div>
    </footer>
  );
}
