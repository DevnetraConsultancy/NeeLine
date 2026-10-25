"use client";

import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import {
  LogOut,
  User as UserIcon,
  Sun,
  Moon,
  ChevronDown,
  LogIn,
} from "lucide-react";
import InfoButton from "@/components/InfoButton";
import { loginWithGoogle } from "@/app/actions/auth";

export default function Navbar() {
  const { data: session } = useSession();
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Initialize theme from storage and listen to external changes
  useEffect(() => {
    const saved = localStorage.getItem("neeline_theme") as "dark" | "light" | null;
    if (saved) {
      setTheme(saved);
      document.documentElement.setAttribute("data-theme", saved);
    } else {
      const current = document.documentElement.getAttribute("data-theme") as "dark" | "light" | null;
      if (current) setTheme(current);
    }

    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent<"dark" | "light">;
      if (customEvent.detail) {
        setTheme(customEvent.detail);
      }
    };

    window.addEventListener("neeline_theme_change", handleThemeChange);
    return () => window.removeEventListener("neeline_theme_change", handleThemeChange);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showUserDropdown) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showUserDropdown]);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("neeline_theme", next);
    document.documentElement.setAttribute("data-theme", next);
    window.dispatchEvent(new CustomEvent("neeline_theme_change", { detail: next }));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isGuest = session?.user ? (session.user as any).isGuest : false;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-4 sm:px-8 theme-nav">
      {/* Left: Brand logo & Navigation shortcuts (hidden on homepage) */}
      <div className="flex items-center gap-3 sm:gap-6">
        <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group" title="NeeLine Homepage">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#c9a84c] via-[#ebd48a] to-[#a3802c] p-[1.5px] shadow-[0_0_12px_rgba(201,168,76,0.3)] group-hover:shadow-[0_0_20px_rgba(201,168,76,0.5)] transition-all">
            <div className="w-full h-full rounded-full bg-[#070c16] flex items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                className="w-4 h-4 text-[#c9a84c] group-hover:scale-110 transition-transform"
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
          </div>
          <div className="flex flex-col">
            <span
              className="text-lg font-bold tracking-tight leading-none group-hover:text-[#c9a84c] transition-colors"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Nee<span className="text-[#c9a84c]">Line</span>
            </span>
            <span className="text-[9px] font-mono opacity-50 tracking-wider uppercase mt-0.5 hidden sm:block">
              Number Line Visualizer
            </span>
          </div>
        </Link>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Global Light / Dark Mode Toggle */}
        <button
          onClick={toggleTheme}
          className="w-8 h-8 rounded-xl theme-pill hover:border-[#c9a84c]/60 flex items-center justify-center cursor-pointer transition-all"
          title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode (Canvas colors set in Canvas Settings)`}
          aria-label="Toggle Theme"
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4 text-[#ebd48a]" />
          ) : (
            <Moon className="w-4 h-4 text-[#4361ee]" />
          )}
        </button>

        {/* Guide button (Question Mark only, hover comment) */}
        <InfoButton />

        {/* User Account Icon with Sign Out Dropdown (or Sign In button if unauthenticated) */}
        {session?.user ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full theme-pill hover:border-[#c9a84c]/60 cursor-pointer transition-all"
              title="User Account & Session"
            >
              {session.user.image ? (
                <Image
                  src={session.user.image}
                  alt=""
                  width={24}
                  height={24}
                  className="rounded-full ring-1 ring-[#c9a84c]/60"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-[#c9a84c]/20 border border-[#c9a84c]/40 flex items-center justify-center">
                  <UserIcon className="w-3.5 h-3.5 text-[#c9a84c]" />
                </div>
              )}
              <div className="text-xs font-mono hidden md:flex items-center gap-1.5">
                {isGuest ? (
                  <span className="flex items-center gap-1.5">
                    <span>Guest</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#c9a84c]/15 text-[#c9a84c] border border-[#c9a84c]/40 font-semibold">
                      sandbox
                    </span>
                  </span>
                ) : (
                  <span className="truncate max-w-[120px] font-medium">
                    {session.user.name || session.user.email}
                  </span>
                )}
              </div>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {/* Sign Out Dropdown Menu */}
            {showUserDropdown && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl glass-panel p-2 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150 border border-black/10 dark:border-white/[0.1]">
                <div className="px-3 py-2 border-b border-black/[0.08] dark:border-white/[0.08]">
                  <p className="text-xs font-bold truncate theme-card-title">
                    {session.user.name || (isGuest ? "Guest User" : "Account")}
                  </p>
                  <p className="text-[11px] font-mono theme-text-muted truncate mt-0.5">
                    {isGuest ? "Ephemeral Guest Sandbox" : session.user.email}
                  </p>
                </div>

                <div className="pt-1.5">
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="w-full px-3 py-2 text-left text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-xl transition-colors flex items-center gap-2.5 cursor-pointer font-mono font-medium"
                    title="Sign out of NeeLine"
                  >
                    <LogOut className="w-4 h-4 text-rose-500" />
                    <span>Sign out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <form action={loginWithGoogle}>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl btn-ghost-gold text-xs font-mono cursor-pointer transition-all shadow-sm"
              title="Sign in with Google"
            >
              <LogIn className="w-3.5 h-3.5 text-[#c9a84c]" />
              <span className="font-semibold">Sign In</span>
            </button>
          </form>
        )}
      </div>
    </nav>
  );
}
