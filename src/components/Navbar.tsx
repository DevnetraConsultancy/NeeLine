"use client";

import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import InfoButton from "@/components/InfoButton";

export default function Navbar() {
  const { data: session } = useSession();

  if (!session?.user) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isGuest = (session.user as any).isGuest;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-12 flex items-center justify-between px-6 bg-[#080e1a]/90 backdrop-blur-sm border-b border-[#c9a84c]/20">
      <a href="/dashboard" className="flex items-center gap-3 group">
        <div className="w-8 h-8 rounded-full bg-[#c9a84c] flex items-center justify-center">
          <svg
            viewBox="0 0 24 24"
            className="w-5 h-5 text-[#0a1628]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="3" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <line x1="12" y1="2" x2="12" y2="5" />
            <line x1="12" y1="19" x2="12" y2="22" />
          </svg>
        </div>
        <span className="font-[var(--font-display)] text-lg text-[#f5f0e8] tracking-wide group-hover:text-[#c9a84c] transition-colors">
          NeeLine
        </span>
      </a>

      <div className="flex items-center gap-3">
        {/* Combined Help & About button */}
        <InfoButton />

        <div className="flex items-center gap-2">
          {session.user.image ? (
            <Image
              src={session.user.image}
              alt=""
              width={32}
              height={32}
              className="rounded-full"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#c9a84c]/20 border border-[#c9a84c]/30 flex items-center justify-center">
              <svg className="w-4 h-4 text-[#c9a84c]/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
          )}
          <span className="text-sm text-[#f5f0e8]/70 hidden sm:block">
            {isGuest ? (
              <span className="flex items-center gap-1.5">
                Guest
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#c9a84c]/10 text-[#c9a84c]/50 border border-[#c9a84c]/15" style={{ fontFamily: "var(--font-mono)" }}>
                  temp
                </span>
              </span>
            ) : (
              session.user.email
            )}
          </span>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="text-xs px-3 py-1.5 rounded border border-[#c9a84c]/30 text-[#c9a84c]/80 hover:bg-[#c9a84c]/10 transition-colors"
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}
