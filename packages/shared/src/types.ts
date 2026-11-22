import type { NotifiableField } from "./constants";
import type { NotificationChange } from "./schemas";

export interface NormalizedTeamChange {
  field: NotifiableField | "name";
  label: string;
  oldValue: string | number | null;
  newValue: string | number | null;
}

export interface TeamNotificationDraft {
  teamShort: string;
  teamName: string;
  type: "TEAM_UPDATED";
  title: string;
  message: string;
  changes: NotificationChange[];
  sourceEventId: string;
  read: false;
  createdAt: Date;
  readAt: null;
}

export interface TeamRecord {
  id: string;
  name: string;
  short: string;
  logoUrl?: string;
  captain: string;
  headCoach: string;
  homeGround: string;
  titles: number;
  wins: number;
  losses: number;
  points: number;
  season: string;
}

export interface SubscriptionRecord {
  id: string;
  teamShort: string;
  fields: NotifiableField[];
  createdAt: string;
}

export type SubscriptionDto = SubscriptionRecord;
