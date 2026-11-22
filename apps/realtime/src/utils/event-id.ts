import { createHash } from "node:crypto";
import { EJSON } from "bson";

/** Stable id for a change event, derived from its resume token. Unique per persisted event. */
export function eventIdFromResumeToken(resumeToken: unknown): string {
  return createHash("sha256").update(EJSON.stringify(resumeToken)).digest("hex");
}
