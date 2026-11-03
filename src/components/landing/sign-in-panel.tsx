"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { ArrowRight, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signInWithGoogle } from "@/app/actions";

/** Google's own "G" mark, required by Google's sign-in branding rules. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.94l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}

export function SignInPanel({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useRouter();
  const [guestLoading, setGuestLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const continueAsGuest = async () => {
    setGuestLoading(true);
    setError(null);
    const result = await signIn("guest", { redirect: false }).catch(() => null);
    if (result && !result.error) {
      router.push("/dashboard");
      router.refresh();
      return;
    }
    setGuestLoading(false);
    setError(
      result?.code === "rate_limited"
        ? "Too many guest sessions were started from your network. Please wait a few minutes and try again."
        : "Guest sign-in is not available right now. Please try again in a moment.",
    );
  };

  return (
    <div id="get-started" className="glass-strong w-full max-w-md scroll-mt-24 rounded-xl p-6 sm:p-8">
      <h2 className="text-lg font-semibold text-fg">Open your workspace</h2>
      <p className="mt-1 text-sm text-fg-muted">Start mapping a chronology in seconds.</p>
      <div className="mt-6 grid gap-3">
        {googleEnabled && (
          <form action={signInWithGoogle} onSubmit={() => setGoogleLoading(true)}>
            <Button type="submit" size="lg" className="w-full" loading={googleLoading} disabled={guestLoading}>
              {!googleLoading && <GoogleMark />}
              Continue with Google
            </Button>
          </form>
        )}
        <Button variant={googleEnabled ? "secondary" : "primary"} size="lg" icon={UserRound} iconEnd={ArrowRight} loading={guestLoading} disabled={googleLoading} onClick={continueAsGuest}>
          Continue as guest
        </Button>
      </div>
      {error && <p role="alert" className="mt-4 rounded-md bg-danger-soft px-3 py-2 text-sm font-medium text-danger">{error}</p>}
      <p className="mt-4 text-xs text-fg-muted">
        No registration needed. Guest workspaces are deleted after 30 days without use; sign in with Google to keep your
        timelines.
      </p>
    </div>
  );
}
