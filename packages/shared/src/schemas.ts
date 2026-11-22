import { z } from "zod";
import {
  ADMIN_TEAM_FIELDS,
  BALL_RESULTS,
  MATCH_STATUSES,
  NOTIFIABLE_FIELDS,
  ROLES,
  TEAM_SHORTS,
} from "./constants";

/* ------------------------------- auth ---------------------------------- */

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "Use at least 3 characters")
  .max(30, "Use at most 30 characters")
  .regex(/^[a-zA-Z0-9_]+$/, "Letters, numbers and underscores only")
  .transform((value) => value.toLowerCase());

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(128, "Use at most 128 characters");

export const registerSchema = z
  .object({ username: usernameSchema, password: passwordSchema })
  .strict();

export const loginSchema = registerSchema;

export type RegisterInput = z.input<typeof registerSchema>;
export type LoginInput = z.input<typeof loginSchema>;

/* ------------------------------- teams --------------------------------- */

const teamShortSchema = z.enum(TEAM_SHORTS);

export const notifiableFieldSchema = z.enum(NOTIFIABLE_FIELDS);

export const teamFieldValuesSchema = z.object({
  name: z.string().trim().min(2).max(80),
  captain: z.string().trim().min(2).max(80),
  headCoach: z.string().trim().min(2).max(80),
  homeGround: z.string().trim().min(2).max(120),
  titles: z.number().int().min(0).max(30),
  wins: z.number().int().min(0).max(100),
  losses: z.number().int().min(0).max(100),
  points: z.number().int().min(0).max(200),
});

export const adminTeamUpdateSchema = teamFieldValuesSchema
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to update",
  })
  .refine(
    (value) =>
      Object.keys(value).every((key) =>
        ADMIN_TEAM_FIELDS.includes(key as (typeof ADMIN_TEAM_FIELDS)[number]),
      ),
    { message: "Unsupported team field" },
  );

export type AdminTeamUpdate = z.infer<typeof adminTeamUpdateSchema>;

/* --------------------------- subscriptions ----------------------------- */

export const subscriptionInputSchema = z
  .object({
    teamShort: teamShortSchema,
    fields: z.array(notifiableFieldSchema).max(NOTIFIABLE_FIELDS.length).optional(),
  })
  .strict();

export const subscriptionFieldsSchema = z
  .object({
    fields: z.array(notifiableFieldSchema).max(NOTIFIABLE_FIELDS.length),
  })
  .strict();

export const teamShortParamSchema = teamShortSchema;

/* --------------------------- notifications ----------------------------- */

export const notificationChangeSchema = z.object({
  field: z.enum([...NOTIFIABLE_FIELDS, "name"]),
  label: z.string(),
  oldValue: z.union([z.string(), z.number(), z.null()]),
  newValue: z.union([z.string(), z.number(), z.null()]),
});

export type NotificationChange = z.infer<typeof notificationChangeSchema>;

export const notificationSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  teamShort: z.string(),
  teamName: z.string(),
  type: z.literal("TEAM_UPDATED"),
  title: z.string(),
  message: z.string(),
  changes: z.array(notificationChangeSchema),
  read: z.boolean(),
  createdAt: z.string(),
  readAt: z.string().nullable(),
});

export type NotificationDto = z.infer<typeof notificationSchema>;

export const notificationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().max(200).optional(),
  unreadOnly: z.enum(["true", "false"]).optional(),
});

/* ------------------------------ matches -------------------------------- */

export const teamRefSchema = z.object({
  short: z.enum(TEAM_SHORTS),
  name: z.string(),
});

export const batterSchema = z.object({
  name: z.string(),
  runs: z.number().int().min(0),
  balls: z.number().int().min(0),
  onStrike: z.boolean(),
});

export const bowlerSchema = z.object({
  name: z.string(),
  overs: z.string().regex(/^\d{1,2}\.[0-5]$/, "Overs use cricket notation, e.g. 3.4"),
  runsConceded: z.number().int().min(0),
  wickets: z.number().int().min(0).max(10),
});

export const matchScoreSchema = z.object({
  matchId: z.string().min(1),
  status: z.enum(MATCH_STATUSES),
  venue: z.string(),
  innings: z.union([z.literal(1), z.literal(2)]),
  battingTeam: teamRefSchema,
  bowlingTeam: teamRefSchema,
  score: z.object({
    runs: z.number().int().min(0),
    wickets: z.number().int().min(0).max(10),
    overs: z.string().regex(/^\d{1,2}\.[0-5]$/, "Overs use cricket notation, e.g. 3.4"),
    totalOvers: z.number().int().min(1).max(50),
  }),
  target: z.number().int().min(1).nullable().optional(),
  batters: z.array(batterSchema).max(2),
  bowler: bowlerSchema.nullable(),
  currentOverBalls: z.array(z.enum(BALL_RESULTS)).max(12),
  battersUsed: z.number().int().min(0).max(11),
  updatedAt: z.string(),
  batterNames: z.array(z.string()).nullish(),
  /** Batting orders keyed by team short, so both innings use real player names. */
  squads: z.partialRecord(teamShortSchema, z.array(z.string())).nullish(),
});

export type MatchScore = z.infer<typeof matchScoreSchema>;

/** Toggle for the ball-by-ball match runner. */
export const simulationControlSchema = z
  .object({
    running: z.boolean(),
    intervalMs: z.number().int().min(200).max(10_000).optional(),
  })
  .strict();

export type SimulationControl = z.infer<typeof simulationControlSchema>;

export const scoreUpdateMessageSchema = z.object({
  type: z.literal("MATCH_SCORE_UPDATE"),
  schemaVersion: z.literal(1),
  matchId: z.string(),
  occurredAt: z.string(),
  data: matchScoreSchema,
});

export type ScoreUpdateMessage = z.infer<typeof scoreUpdateMessageSchema>;

/* ----------------------------- realtime -------------------------------- */

export const notificationEventSchema = z.object({
  schemaVersion: z.literal(1),
  notification: notificationSchema,
});

export type NotificationEvent = z.infer<typeof notificationEventSchema>;

export const authUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  role: z.enum(ROLES),
});

export type AuthUser = z.infer<typeof authUserSchema>;
