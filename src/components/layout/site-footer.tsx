import { ExternalLink, Mail } from "lucide-react";
import { HelpLink } from "@/components/layout/help";
import { CONTACT_EMAIL, CREDIT_LINE, INSTAGRAM_HANDLE, INSTAGRAM_URL } from "@/lib/site";

const linkClass = "inline-flex items-center gap-1.5 text-fg-muted hover:text-fg";

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 text-xs sm:px-6 md:flex-row md:items-center md:justify-between">
        <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <HelpLink className={linkClass} />
          <a href={`mailto:${CONTACT_EMAIL}`} className={linkClass}>
            <Mail className="size-4" aria-hidden />
            {CONTACT_EMAIL}
          </a>
          <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className={linkClass}>
            <ExternalLink className="size-4" aria-hidden />
            {INSTAGRAM_HANDLE}
            <span className="sr-only">on Instagram (opens in a new tab)</span>
          </a>
        </nav>
        <p className="text-fg-muted">
          &copy; {new Date().getFullYear()} NeeLine · {CREDIT_LINE}
        </p>
      </div>
    </footer>
  );
}
