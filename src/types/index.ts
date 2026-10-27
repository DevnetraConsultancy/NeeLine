import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      isGuest?: boolean;
    } & DefaultSession["user"];
  }
}

export interface ColorPreset {
  hex: string;
  label: string;
}

// 16 Curated Distinct Historical & Academic Color Presets (No duplicates, high contrast)
export const CANVAS_COLOR_PRESETS: ColorPreset[] = [
  { hex: "#c9a84c", label: "Imperial Gold" },
  { hex: "#38bdf8", label: "Sky Azure" },
  { hex: "#10b981", label: "Emerald Jade" },
  { hex: "#f43f5e", label: "Crimson Rose" },
  { hex: "#a855f7", label: "Royal Amethyst" },
  { hex: "#f97316", label: "Amber Bronze" },
  { hex: "#06b6d4", label: "Persian Cyan" },
  { hex: "#ec4899", label: "Lotus Pink" },
  { hex: "#84cc16", label: "Olive Peridot" },
  { hex: "#eab308", label: "Byzantine Yellow" },
  { hex: "#6366f1", label: "Lapis Indigo" },
  { hex: "#14b8a6", label: "Aegean Teal" },
  { hex: "#d97706", label: "Terracotta Rust" },
  { hex: "#8b5cf6", label: "Violet Iris" },
  { hex: "#0ea5e9", label: "Cobalt Blue" },
  { hex: "#f472b6", label: "Coral Carnelian" },
];

export interface TimelineData {
  id: string;
  name: string;
  description?: string | null;
  bgColor: string;
  spineColor: string;
  tickColor: string;
  textColor: string;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    events: number;
  };
  events?: EventData[];
}

export interface EventData {
  id: string;
  timelineId: string;
  year: number;
  isBce: boolean;
  month: number | null;
  day: number | null;
  title: string;
  description: string | null;
  color: string;
  borderColor?: string;
  layer?: string | null;
  endYear?: number | null;
  endIsBce?: boolean | null;
  endMonth?: number | null;
  endDay?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface LayoutItem {
  event: EventData;
  x: number;
  tier: number;
  labelWidth: number;
  visible: boolean;
}
