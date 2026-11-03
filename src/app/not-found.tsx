import Link from "next/link";
import { Compass } from "lucide-react";
import { AppHeader } from "@/components/layout/app-header";
import { EmptyState } from "@/components/ui/states";

export default function NotFound() {
  return (
    <div className="min-h-dvh">
      <AppHeader />
      <main id="main" className="mx-auto max-w-xl px-4 py-20">
        <EmptyState
          icon={Compass}
          title="Page not found"
          description="The address may be mistyped, or the page has moved."
          action={<Link href="/" className="inline-flex h-10 items-center rounded-md bg-accent px-4 text-sm font-medium text-accent-fg hover:bg-accent-hover">Go to the home page</Link>}
        />
      </main>
    </div>
  );
}
