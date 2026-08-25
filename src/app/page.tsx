"use client";

import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function LandingPage() {
  const { status } = useSession();
  const router = useRouter();
  const [guestLoading, setGuestLoading] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);

  async function handleGuestLogin() {
    setGuestLoading(true);
    try {
      const result = await signIn("credentials", { guest: "true", redirect: false });
      if (result?.error) {
        throw new Error(result.error);
      }
      router.push("/dashboard");
    } catch {
      setGuestLoading(false);
      alert("Guest sign-in is unavailable. Check the database configuration.");
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      {/* Hero */}
      <div className="text-center max-w-xl">
        {/* Logo mark */}
        <div className="flex justify-center mb-8">
          <div className="w-20 h-20 rounded-full bg-[#c9a84c]/10 border-2 border-[#c9a84c]/40 flex items-center justify-center">
            <svg
              viewBox="0 0 48 48"
              className="w-10 h-10"
              fill="none"
              stroke="#c9a84c"
              strokeWidth="1.5"
            >
              <circle cx="24" cy="24" r="4" />
              <line x1="4" y1="24" x2="44" y2="24" />
              <line x1="24" y1="4" x2="24" y2="12" />
              <line x1="24" y1="36" x2="24" y2="44" />
              <line x1="8" y1="20" x2="8" y2="28" />
              <line x1="40" y1="20" x2="40" y2="28" />
            </svg>
          </div>
        </div>

        <h1 className="text-5xl md:text-6xl font-bold mb-4 tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          <span className="text-[#f5f0e8]">Nee</span><span className="text-[#c9a84c]">Line</span>
        </h1>

        <p className="text-lg text-[#f5f0e8]/60 mb-3" style={{ fontFamily: "var(--font-body)" }}>
          Visualize History on A Number Line.
        </p>

        {status === "loading" && (
          <div className="text-sm text-[#c9a84c]/50">Loading...</div>
        )}

        {status === "unauthenticated" && (
          <div className="flex flex-col items-center gap-4">
            {/* Google Sign In */}
            <button
              onClick={() => signIn("google")}
              className="inline-flex items-center gap-3 px-6 py-3 rounded-lg bg-[#c9a84c] text-[#0a1628] font-semibold hover:bg-[#d4b65a] transition-colors shadow-lg shadow-[#c9a84c]/20"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Sign in with Google
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 w-48">
              <div className="flex-1 h-px bg-[#c9a84c]/15" />
              <span className="text-xs text-[#f5f0e8]/25" style={{ fontFamily: "var(--font-mono)" }}>
                or
              </span>
              <div className="flex-1 h-px bg-[#c9a84c]/15" />
            </div>

            {/* Guest Login */}
            <button
              onClick={handleGuestLogin}
              disabled={guestLoading}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-[#c9a84c]/30 text-[#c9a84c] font-medium hover:bg-[#c9a84c]/10 transition-colors disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              {guestLoading ? "Signing in..." : "Continue as Guest"}
            </button>
            <p className="text-xs text-[#f5f0e8]/20 max-w-xs">
              No account needed. Your data stays on this device.
            </p>
          </div>
        )}
      </div>

      {/* Subtle bottom decoration */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 text-[#c9a84c]/20">
        <div className="w-1 h-1 rounded-full bg-[#c9a84c]/30" />
        <div className="w-16 h-px bg-[#c9a84c]/20" />
        <div className="w-1.5 h-1.5 rounded-full bg-[#c9a84c]/30" />
        <div className="w-16 h-px bg-[#c9a84c]/20" />
        <div className="w-1 h-1 rounded-full bg-[#c9a84c]/30" />
      </div>
    </main>
  );
}
