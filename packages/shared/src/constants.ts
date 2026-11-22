export const TEAM_SHORTS = [
  "CSK",
  "MI",
  "RCB",
  "KKR",
  "SRH",
  "RR",
  "DC",
  "PBKS",
  "GT",
  "LSG",
] as const;

export type TeamShort = (typeof TEAM_SHORTS)[number];

/** SVG logos used everywhere a team is shown (fallback when a DB record has no logoUrl). */
export const TEAM_LOGOS: Record<TeamShort, string> = {
  CSK: "https://www.footylogos.com/sports-assets/logos/chennai-super-kings/chennai-super-kings-logo-footylogos.svg",
  MI: "https://www.footylogos.com/sports-assets/logos/mumbai-indians/mumbai-indians-logo-footylogos.svg",
  RCB: "https://www.footylogos.com/sports-assets/logos/royal-challengers-bengaluru/royal-challengers-bengaluru-logo-footylogos.svg",
  KKR: "https://www.footylogos.com/sports-assets/logos/kolkata-knight-riders/kolkata-knight-riders-logo-footylogos.svg",
  SRH: "https://www.footylogos.com/sports-assets/logos/sunrisers-hyderabad/sunrisers-hyderabad-logo-footylogos.svg",
  RR: "https://www.footylogos.com/sports-assets/logos/rajasthan-royals/rajasthan-royals-logo-footylogos.svg",
  DC: "https://www.footylogos.com/sports-assets/logos/delhi-capitals/delhi-capitals-logo-footylogos.svg",
  PBKS: "https://www.footylogos.com/sports-assets/logos/punjab-kings/punjab-kings-logo-footylogos.svg",
  GT: "https://www.footylogos.com/sports-assets/logos/gujarat-titans/gujarat-titans-logo-footylogos.svg",
  LSG: "https://www.footylogos.com/sports-assets/logos/lucknow-super-giants/lucknow-super-giants-logo-footylogos.svg",
};

/** Team fields a user can choose to be notified about. Identifiers (name/short) are excluded. */
export const NOTIFIABLE_FIELDS = [
  "captain",
  "headCoach",
  "homeGround",
  "titles",
  "wins",
  "losses",
  "points",
] as const;

export type NotifiableField = (typeof NOTIFIABLE_FIELDS)[number];

export const FIELD_LABELS: Record<NotifiableField, string> = {
  captain: "Captain",
  headCoach: "Head coach",
  homeGround: "Home ground",
  titles: "Titles",
  wins: "Wins",
  losses: "Losses",
  points: "Points",
};

/** Fields the admin API may change. `short` is a stable identifier and cannot be changed. */
export const ADMIN_TEAM_FIELDS = ["name", ...NOTIFIABLE_FIELDS] as const;

export const DEFAULT_SUBSCRIPTION_FIELDS: readonly NotifiableField[] = NOTIFIABLE_FIELDS;

export const ROLES = ["user", "admin"] as const;
export type Role = (typeof ROLES)[number];

export const MATCH_STATUSES = ["LIVE", "COMPLETED"] as const;
export type MatchStatus = (typeof MATCH_STATUSES)[number];

export const BALL_RESULTS = ["•", "1", "2", "3", "4", "6", "W", "wd"] as const;
export type BallResult = (typeof BALL_RESULTS)[number];

export const DEMO_MATCH_ID = "ipl-demo-match-001";
export const SSE_SCHEMA_VERSION = 1;
export const SCORE_SCHEMA_VERSION = 1;
export const SESSION_COOKIE = "ipl_session";
