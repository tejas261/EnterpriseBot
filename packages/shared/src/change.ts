import { ADMIN_TEAM_FIELDS, FIELD_LABELS } from "./constants";
import type { NormalizedTeamChange, TeamNotificationDraft } from "./types";

type Doc = Record<string, unknown> | null;

function toChangeValue(value: unknown): string | number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "number") return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function labelFor(field: NormalizedTeamChange["field"]): string {
  if (field === "name") return "Team name";
  return FIELD_LABELS[field];
}

/**
 * Turns one MongoDB team change event into the list of user-visible field changes.
 * For `update` events, only keys present in `updatedFields`/`removedFields` are considered
 * (`updateLookup` may already contain newer values for other fields).
 */
export function extractTeamChanges(params: {
  mode: "update" | "replace";
  oldDoc: Doc;
  newDoc: Record<string, unknown>;
  updatedFields?: Record<string, unknown>;
  removedFields?: string[];
}): NormalizedTeamChange[] {
  const { mode, oldDoc, newDoc } = params;
  const removed = new Set(params.removedFields ?? []);
  const updated = params.updatedFields ?? {};
  const described = new Set([...Object.keys(updated), ...removed]);
  const candidates = mode === "update" && described.size > 0 ? described : new Set<string>(ADMIN_TEAM_FIELDS);

  const changes: NormalizedTeamChange[] = [];
  for (const field of ADMIN_TEAM_FIELDS) {
    if (!candidates.has(field)) continue;
    const oldValue = toChangeValue(oldDoc?.[field]);
    const newValue = removed.has(field) ? null : toChangeValue(newDoc[field]);
    if (oldValue === newValue) continue;
    changes.push({ field, label: labelFor(field), oldValue, newValue });
  }
  return changes;
}

function joinLabels(labels: string[]): string {
  if (labels.length <= 1) return labels[0] ?? "";
  return `${labels.slice(0, -1).join(", ")} and ${labels.at(-1)}`;
}

/**
 * Builds the single grouped notification for one subscriber.
 * Returns null when none of the changed fields are in the user's selected fields.
 */
export function buildTeamNotification(params: {
  changes: NormalizedTeamChange[];
  subscriptionFields: readonly string[];
  teamShort: string;
  teamName: string;
  eventId: string;
  createdAt?: Date;
}): TeamNotificationDraft | null {
  const selected = new Set(params.subscriptionFields);
  const changes = params.changes.filter(
    (change) => change.field !== "name" && selected.has(change.field),
  );
  if (changes.length === 0) return null;

  const labels = changes.map((change) => change.label);
  return {
    teamShort: params.teamShort,
    teamName: params.teamName,
    type: "TEAM_UPDATED",
    title: `${params.teamShort} team updated`,
    message: `${joinLabels(labels)} updated`,
    changes: changes.map((change) => ({
      field: change.field,
      label: change.label,
      oldValue: change.oldValue,
      newValue: change.newValue,
    })),
    sourceEventId: params.eventId,
    read: false,
    createdAt: params.createdAt ?? new Date(),
    readAt: null,
  };
}
