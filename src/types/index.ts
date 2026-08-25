import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      isGuest?: boolean;
    } & DefaultSession["user"];
  }
}

export interface TimelineData {
  id: string;
  name: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface LayoutItem {
  event: EventData;
  x: number;
  tier: number;
  labelWidth: number;
  visible: boolean;
}
