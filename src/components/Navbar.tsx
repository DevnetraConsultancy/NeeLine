"use client";

import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { LogOut, User as UserIcon, Sun, Moon, ChevronDown } from "lucide-react";
import InfoButton from "@/components/InfoButton";

export default function Navbar() {
  const { data: session } = useSession();
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Initialize theme from storage
  useEffect(() => {
    const saved = localStorage.getItem("neeline_theme") as "dark" | "light" | null;
    if (saved) {
      setTheme(saved);
      document.documentElement.setAttribute("data-theme", saved);
    }
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
  }

  if (!session?.user) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isGuest = (session.user as any).isGuest;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-4 sm:px-8 bg-[#070c16]/85 backdrop-blur-xl border-b border-white/[0.08] shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
      {/* Brand logo & title */}
      <Link href="/dashboard" className="flex items-center gap-3 group">
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#c9a84c] via-[#ebd48a] to-[#a3802c] p-[1.5px] shadow-[0_0_12px_rgba(201,168,76,0.25)] group-hover:shadow-[0_0_20px_rgba(201,168,76,0.4)] transition-all">
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
            className="text-lg font-bold text-[#f5f0e8] tracking-tight group-hover:text-[#c9a84c] transition-colors leading-none"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Nee<span className="text-[#c9a84c]">Line</span>
          </span>
          <span className="text-[9px] font-mono text-[#f5f0e8]/35 tracking-wider uppercase mt-0.5 hidden sm:block">
            Number Line Visualizer
          </span>
        </div>
      </Link>

      {/* Right controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Global Light / Dark Mode Toggle */}
        <button
          onClick={toggleTheme}
          className="w-8 h-8 rounded-xl border border-white/[0.08] bg-white/[0.03] text-[#f5f0e8]/70 hover:text-[#c9a84c] hover:border-[#c9a84c]/30 hover:bg-[#c9a84c]/10 transition-all flex items-center justify-center cursor-pointer"
          title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode (Canvas colors set in Canvas Settings)`}
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4 text-[#ecd58e]" />
          ) : (
            <Moon className="w-4 h-4 text-[#5a9bd5]" />
          )}
        </button>

        {/* Guide button (Question Mark only, hover comment) */}
        <InfoButton />

        {/* User Account Icon with Sign Out Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] hover:border-[#c9a84c]/40 hover:bg-white/[0.06] transition-all cursor-pointer"
            title="User Account & Session"
          >
            {session.user.image ? (
              <Image
                src={session.user.image}
                alt=""
                width={24}
                height={24}
                className="rounded-full ring-1 ring-[#c9a84c]/50"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-[#c9a84c]/15 border border-[#c9a84c]/30 flex items-center justify-center">
                <UserIcon className="w-3.5 h-3.5 text-[#c9a84c]" />
              </div>
            )}
            <div className="text-xs text-[#f5f0e8]/80 font-mono hidden md:flex items-center gap-1.5">
              {isGuest ? (
                <span className="flex items-center gap-1.5">
                  <span className="text-[#f5f0e8]/80">Guest</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#c9a84c]/10 text-[#c9a84c] border border-[#c9a84c]/20">
                    sandbox
                  </span>
                </span>
              ) : (
                <span className="truncate max-w-[120px]">{session.user.name || session.user.email}</span>
              )}
            </div>
            <ChevronDown className="w-3 h-3 text-[#f5f0e8]/40" />
          </button>

          {/* Sign Out Dropdown Menu */}
          {showUserDropdown && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl glass-panel p-2 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150 border border-white/[0.12]">
              <div className="px-3 py-2 border-b border-white/[0.08]">
                <p className="text-xs font-semibold text-[#f5f0e8] truncate">
                  {session.user.name || (isGuest ? "Guest User" : "Account")}
                </p>
                <p className="text-[11px] font-mono text-[#f5f0e8]/45 truncate mt-0.5">
                  {isGuest ? "Ephemeral Guest Sandbox" : session.user.email}
                </p>
              </div>

              <div className="pt-1.5">
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="w-full px-3 py-2 text-left text-xs text-rose-300 hover:text-rose-200 hover:bg-rose-500/10 rounded-xl transition-colors flex items-center gap-2.5 cursor-pointer font-mono"
                  title="Sign out of NeeLine"
                >
                  <LogOut className="w-4 h-4 text-rose-400" />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
